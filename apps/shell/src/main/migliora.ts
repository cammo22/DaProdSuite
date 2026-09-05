/**
 * Il modello che riscrive una richiesta prima di generarla.
 *
 * **Chiesto il 22 agosto 2026**, guardando la fila delle richieste arrivate dal
 * telefono: «dall'app connessione, nelle richieste, dovrei trovarmi un menu che
 * mi fa accettare la richiesta, mi fa accettare la richiesta e usa bonsai 64k,
 * mi fa modificare a mano la richiesta; una volta modificata a mano posso
 * decidere di mandarla con o senza AI».
 *
 * Il mestiere è lo stesso che DaProdFoto e DaProdMusica fanno già nelle loro
 * finestre con il tasto **Allarga**: da due parole a una descrizione che il
 * modello di immagini capisce. Qui però la richiesta arriva da un'altra
 * persona, e chi preme il tasto non è chi l'ha scritta — quindi la regola in
 * più è una sola e va rispettata alla lettera: **si allarga l'idea, non la si
 * sostituisce.** Chi ha chiesto un faro nella tempesta deve ricevere un faro
 * nella tempesta.
 *
 * ## Perché non è automatico
 *
 * Perché il modello che scrive e il modello che genera vivono sulla stessa
 * scheda da 8 GB. Quattro GB e mezzo occupati per riscrivere una frase sono
 * quattro GB e mezzo in meno per la generazione: farlo a ogni richiesta
 * vorrebbe dire pagare quel prezzo anche quando la descrizione era già buona.
 * Si accende quando qualcuno preme, e LM Studio lo lascia andare appena ha
 * finito di rispondere (`liberaDopoLaRisposta` in llm.ts).
 *
 * ## I 64K
 *
 * Bonsai arriva a 262K di contesto, ma il contesto si paga in memoria. 64K sono
 * dieci volte quello che serve a riscrivere un prompt e lasciano posto perché
 * il modello stia tutto in GPU — vedi `CONTESTO_CONSIGLIATO` in llm.ts, dove
 * quel numero è motivato per esteso. Se Bonsai non c'è si parla con quello che
 * LM Studio ha: meglio una riscrittura fatta da un modello qualunque che un
 * tasto che non fa niente.
 */

import {
  contestoScelto,
  eIlConsigliato,
  caricaModello,
  chiediAllLlm,
  puoiCaricare,
  statoLlm,
} from "./llm";

/**
 * Le istruzioni, una per scheda.
 *
 * Sono scritte come si scrive a un modello locale piccolo: dettagliate, con
 * dentro anche quello che **non** deve fare. Il divieto di cambiare il soggetto
 * è il più importante di tutti: è l'unica cosa che rende onesto premere questo
 * tasto sulla richiesta di un altro.
 */
const MESTIERI: Record<string, string> = {
  foto: `Sei un direttore della fotografia che scrive prompt per un modello di immagini.

LA LINGUA:
- Scrivi SEMPRE in inglese, anche se ti parlano in italiano.

COM'È FATTA UNA BUONA DESCRIZIONE:
- Un paragrafo solo, da 30 a 60 parole, senza elenchi e senza titoli.
- Si comincia dal soggetto e da cosa sta facendo, poi il posto.
- Poi la luce (da dove viene, di che colore, che ora del giorno).
- Poi l'inquadratura (close-up, wide shot, from above) e l'obiettivo.
- Poi i materiali e le superfici: bagnato, arrugginito, di velluto, di vetro.

VIETATO:
- Scritte, lettere, numeri, marchi o loghi dentro l'immagine.
- Parole vuote come "beautiful", "amazing", "masterpiece", "4k", "8k".
- Cambiare il soggetto che ti viene dato: lo allarghi, non lo sostituisci.`,

  cinema: `Sei un regista che scrive la descrizione di una singola inquadratura per un modello video.

LA LINGUA:
- Scrivi SEMPRE in inglese.

COM'È FATTA UNA BUONA DESCRIZIONE:
- Un paragrafo solo, da 30 a 60 parole.
- Un'azione sola, che possa succedere in pochi secondi.
- Di' cosa fa il soggetto, poi come si muove la camera (pan, dolly in, static).
- Poi la luce e l'ora del giorno, poi i materiali.

VIETATO:
- Più scene, stacchi, "then" e "after that": è UNA inquadratura.
- Scritte o loghi dentro l'immagine.
- Cambiare il soggetto che ti viene dato.`,

  musica: `Sei un produttore musicale. Ti danno l'idea di una canzone e ne scrivi DUE cose: com'è fatta, e cosa dice.

LA DESCRIZIONE (campo "testo"):
- Una riga sola, da 10 a 25 parole, fatta di virgole.
- Genere, strumenti veri, andatura (lento, medio, veloce), atmosfera.
- Se ti danno una lingua per il canto, tienila.

IL TESTO DA CANTARE (campo "parole"):
- In ITALIANO CORRENTE, a meno che l'idea non sia scritta in un'altra lingua: allora in quella.
- NIENTE DIALETTO: né napoletano, né romano, né siciliano, nemmeno nel ritornello.
  Il genere può essere napoletano, la lingua no. Si scrive "amore mio, non te ne
  andare", mai "ammore mio, nun te ne jì".
- Con i tag fra parentesi quadre a dire dove va cosa: [Verse], [Chorus], [Bridge].
- Due strofe e un ritornello che torna. Corto: si canta, non si legge.
- Righe brevi, parole che si possono cantare, niente frasi da manuale.

VIETATO:
- Nomi di artisti o di canzoni esistenti.
- Parole vuote come "capolavoro", "bellissimo", "epico".
- Cambiare il genere o l'argomento che ti vengono dati: li precisi, non li sostituisci.`,

  voce: `Sei un editor che prepara un testo perché venga letto ad alta voce da una voce sintetica.

COSA FAI:
- Tieni ESATTAMENTE il senso e la lingua di quello che ti danno.
- Sciogli le abbreviazioni e i numeri: "3" diventa "tre", "ecc." diventa "eccetera".
- Metti la punteggiatura che serve a respirare, e spezza le frasi troppo lunghe.

VIETATO:
- Aggiungere frasi che non c'erano.
- Cambiare lingua.
- Commentare quello che stai facendo: rispondi solo con il testo da leggere.`,
};

/** La forma della risposta, imposta a LM Studio: così arriva sempre, e intera. */
const SCHEMA = {
  type: "object",
  properties: {
    testo: {
      type: "string",
      description: "la richiesta riscritta, e nient'altro",
    },
  },
  required: ["testo"],
};

/**
 * Per un brano si chiedono **due** cose.
 *
 * Chiesto il 23 agosto 2026: «da telefono, quando fai un brano, l'AI dovrebbe
 * scrivere anche il testo». Ha ragione: una canzone senza parole è uno
 * strumentale, e chi chiede «una canzone sul mare» dal telefono non ha nessuna
 * voglia di scriversi tre strofe a mano su una tastiera piccola.
 *
 * Restano due campi separati e non un testo solo perché sono due caselle
 * diverse in DaProdMusica, e finiscono in due posti diversi del grafo: la
 * descrizione decide come suona, le parole decidono cosa canta.
 */
const SCHEMA_BRANO = {
  type: "object",
  properties: {
    testo: {
      type: "string",
      description: "come deve suonare: una riga di generi, strumenti e atmosfera",
    },
    parole: {
      type: "string",
      description: "il testo da cantare, con i tag [Verse] [Chorus] [Bridge]",
    },
  },
  required: ["testo", "parole"],
};

/** Null se si può chiedere, il motivo scritto per una persona se no. */
export async function aiDisponibile(): Promise<string | null> {
  const stato = await statoLlm();
  if (!stato.acceso) {
    return stato.motivo ?? "LM Studio non risponde: aprilo e accendi il server locale.";
  }
  if (!stato.modelli.length) {
    return "LM Studio è acceso ma non ha nessun modello installato.";
  }
  return null;
}

/**
 * Sceglie il modello, e se serve lo carica con i 64K.
 *
 * Se il consigliato è installato ma spento lo si accende **al contesto scelto**
 * (64K di suo), che è il punto di tutta la faccenda: lasciarlo caricare a LM
 * Studio vorrebbe dire prendersi il contesto predefinito, che su Spark X2.5 è
 * un milione di token e non ci starebbe in scheda insieme a niente.
 *
 * Il nome con cui è installato può essere uno dei tanti (la nostra raccolta, il
 * repository di chi l'ha fatto, la comunità di LM Studio): si cerca per tutti,
 * e si usa quello che si trova. Vedi `ALTRI_NOMI` in llm.ts.
 */
async function conChiParlo(): Promise<string | undefined> {
  const stato = await statoLlm();
  const quale = stato.disponibili?.find((m) => eIlConsigliato(m.id));
  if (!quale) return stato.modelli[0];
  if (!quale.caricato && puoiCaricare()) {
    // Se il caricamento non riesce non è la fine: LM Studio lo carica da sé
    // alla prima domanda, solo con il contesto che decide lui.
    await caricaModello(quale.id, contestoScelto());
  }
  return quale.id;
}

/**
 * Riscrive una richiesta per la scheda che la eseguirà.
 *
 * Solleva con il motivo scritto per una persona: quel testo arriva fino al
 * pannello di chi ha premuto il tasto, e «502» non è una spiegazione.
 */
export async function migliora(opzioni: {
  testo: string;
  app: string;
}): Promise<{ testo: string; parole?: string }> {
  const motivo = await aiDisponibile();
  if (motivo) throw new Error(motivo);

  const brano = opzioni.app === "musica";
  const mestiere = MESTIERI[opzioni.app] ?? MESTIERI.foto!;
  const esito = await chiediAllLlm({
    modello: await conChiParlo(),
    /**
     * **Lo lasciamo pensare**, ed è costato una prova per capirlo.
     *
     * Il tasto «Allarga» delle schede spegne il ragionamento: riscrivere una
     * frase è un lavoro corto. Provato sul PC vero il 22 agosto 2026, con
     * Bonsai, spegnerlo non funziona: il modello **ragiona lo stesso** —
     * `enable_thinking: false` lo ignora — e i 900 token del budget corto
     * finiscono dentro al pensiero. La risposta esce vuota, e chi ha premuto
     * legge «il modello ha risposto in un modo che non riesco a leggere».
     *
     * Acceso, pensa e poi risponde: mezzo minuto invece di dieci secondi, e la
     * risposta arriva. Vedi `preparaDomanda` in llm.ts, dove la stessa cosa era
     * già scritta per le canzoni.
     */
    pensa: true,
    sistema: mestiere,
    utente: brano
      ? `Da questa idea scrivi come deve suonare la canzone e cosa deve cantare. ` +
        `Resta dentro l'idea, non cambiarla:\n\n"${opzioni.testo}"`
      : `Riscrivi questa richiesta restando dentro l'idea di chi l'ha scritta. ` +
        `Non cambiare il soggetto:\n\n"${opzioni.testo}"`,
    schema: brano ? SCHEMA_BRANO : SCHEMA,
    nomeSchema: brano ? "canzone" : "richiesta",
  });

  if (!esito.ok) throw new Error(esito.motivo || "Il modello non ha risposto.");

  const dati = leggiRisposta(esito.testo);
  if (!dati.testo) throw new Error("Il modello ha risposto in un modo che non riesco a leggere.");
  return dati;
}

/**
 * Il testo dentro la risposta del modello.
 *
 * Un modello che ragiona a volte infila il JSON dentro altro testo: si cerca la
 * prima graffa e l'ultima invece di arrendersi al primo `JSON.parse`. È lo
 * stesso accorgimento di `bonsai.js` nelle schede, e serve davvero.
 */
function leggiRisposta(risposta: string): { testo: string; parole?: string } {
  const vuota = { testo: "" };
  const prova = (dentro: string): { testo: string; parole?: string } => {
    try {
      const dati = JSON.parse(dentro) as { testo?: unknown; parole?: unknown };
      if (typeof dati.testo !== "string" || !dati.testo.trim()) return vuota;
      const fuori: { testo: string; parole?: string } = { testo: dati.testo.trim() };
      if (typeof dati.parole === "string" && dati.parole.trim()) fuori.parole = dati.parole.trim();
      return fuori;
    } catch {
      return vuota;
    }
  };

  const diretto = prova(risposta);
  if (diretto.testo) return diretto;

  /**
   * Le graffe si provano **dall'ultima**, non dalla prima.
   *
   * Se la risposta arriva dentro al ragionamento c'e' dentro di tutto — righe
   * di ragionamento con le graffe, esempi, ripensamenti — e prendere dalla
   * prima graffa all'ultima da' quasi sempre una cosa che non e' JSON. Quello
   * buono e' l'ultimo blocco chiuso: e' la conclusione.
   */
  const aperture: number[] = [];
  for (let i = 0; i < risposta.length; i++) {
    if (risposta[i] === "{") aperture.push(i);
  }
  for (let i = aperture.length - 1; i >= 0; i--) {
    const inizio = aperture[i]!;
    const fine = risposta.indexOf("}", inizio);
    if (fine < 0) continue;
    // Un oggetto puo' contenerne altri: si prova prima quello chiuso piu'
    // avanti, poi si stringe.
    for (const chiusura of [risposta.lastIndexOf("}"), fine]) {
      if (chiusura <= inizio) continue;
      const dentro = prova(risposta.slice(inizio, chiusura + 1));
      if (dentro.testo) return dentro;
    }
  }
  return vuota;
}
