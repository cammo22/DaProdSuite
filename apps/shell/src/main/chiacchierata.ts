/**
 * Dieci minuti col modello, e il modello può usare la suite.
 *
 * **Cosa è stato chiesto, il 26 agosto 2026, testualmente:**
 *
 * > «puoi fare richiesta al pc di parlare per 10 minuti con un modello, quel
 * > modello mentre parli ha la possibilità di usare la suite: esempio se io gli
 * > scrivo *vorrei fare una foto di una macchina*, il modello potrà creare
 * > tutto un piano e lo invia all'utente; se l'utente lo accetta il modello fa
 * > partire la richiesta e nel frattempo viene scaricato dalla memoria — così
 * > da fare anche un video e una foto insieme, lo puoi scegliere in chat.»
 *
 * Sono cinque frasi e ognuna è un vincolo tecnico. Vale la pena leggerle come
 * tali, perché è da lì che viene la forma di questo file.
 *
 * ## «per 10 minuti»
 *
 * Non è una comodità: è **l'unica ragione per cui la cosa sta in piedi su otto
 * GB**. Un modello che scrive occupa quattro GB e mezzo, cioè più della metà
 * della scheda video, cioè esattamente quello che serve a generare
 * un'immagine. Tenerlo caricato «per ogni evenienza» vorrebbe dire una suite in
 * cui non si genera più niente. Dieci minuti sono una conversazione, hanno una
 * fine, e quella fine libera la memoria.
 *
 * ## «fa richiesta al pc»
 *
 * Non «apre una chat»: **chiede il turno**. Per tutta la sessione la macchina è
 * sua (vedi `turno.ts`), quindi non c'è modo che una generazione parta a metà
 * frase e le porti via i pesi da sotto — che è precisamente il guasto che il
 * turno esiste per impedire. E se in quel momento il computer sta generando,
 * la chiacchierata **aspetta**, e lo dice.
 *
 * ## «potrà creare tutto un piano e lo invia all'utente»
 *
 * Il modello non fa partire niente. Propone, e la proposta si legge prima di
 * dire di sì. Un modello che accende la scheda video da solo mentre chiacchiera
 * è esattamente il genere di sorpresa che questo programma non deve fare — e
 * sarebbe anche il modo più rapido di riempire la fila di roba che nessuno ha
 * chiesto.
 *
 * ## «nel frattempo viene scaricato dalla memoria»
 *
 * Accettare il piano **chiude la sessione**. È il gesto centrale del file:
 * nell'istante in cui i lavori partono, il modello non serve più a niente e i
 * suoi quattro GB servono a tutto. Non è un effetto collaterale, è il punto.
 *
 * ## «anche un video e una foto insieme»
 *
 * Un piano ha **più lavori**, e si accettano a scelta: chi ne vuole due su tre
 * spunta due su tre. Vanno in fila come qualunque altra richiesta — stessi
 * tetti, stessa corsia, stesso ordine — perché una richiesta nata da una
 * chiacchierata non ha nessun diritto in più di una scritta a mano.
 *
 * ## Perché il modello risponde con uno schema
 *
 * Perché deve **riempire dei campi**, non raccontare. Chiedergli testo libero e
 * poi interpretarlo vorrebbe dire indovinare, e indovinare male vuol dire
 * mandare in coda la frase «certo, ecco il tuo piano!» come descrizione di
 * un'immagine. Con lo schema JSON il modello *non può* rispondere in un altro
 * modo — è la stessa scelta che regge DaProdMusica e la Storia di DaProdCinema.
 */

import { randomBytes } from "node:crypto";
import { AZIONI } from "@daprod/azioni";
import type {
  BattutaChiacchierata,
  Chiacchierata,
  LavoroDelPiano,
  PianoLavori,
} from "@daprod/gateway";
import { chiediAllLlm, caricaModello, liberaMemoriaLlm, statoLlm, CONTESTO_CONSIGLIATO } from "./llm";
import { turno, type Biglietto } from "./turno";
import { createLogger } from "./logging";

const log = createLogger("chiacchierata");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Quanto dura una sessione. Dieci minuti, come è stato chiesto. */
const DURATA_MS = 10 * 60_000;

/**
 * Quanto si aspetta il turno prima di dire «adesso non si può».
 *
 * Poco, e apposta. Chi ha appena premuto «parla con un modello» sta guardando
 * lo schermo: un minuto di attesa muta è già troppo, e mezz'ora sarebbe una
 * presa in giro. Meglio dire subito «il computer sta generando, riprova fra
 * poco» — che è una frase onesta e azionabile.
 */
const ATTESA_TURNO_MS = 60_000;

/** Quante battute si tengono da parte come contesto della conversazione. */
const BATTUTE_RICORDATE = 12;

/** Le quattro cose che il modello può proporre di far fare. */
const SANNO_GENERARE = AZIONI.filter((a) => a.coda && a.app);

/** Cosa serve a questo modulo per far partire davvero i lavori accettati. */
export interface CablaggioChiacchierata {
  /**
   * Mette in fila un lavoro per conto di chi sta chiacchierando.
   *
   * Passa dalle stesse regole di una richiesta scritta a mano — tetti compresi
   * — e torna il motivo se non è potuta entrare.
   */
  chiedi(opzioni: {
    dispositivoId: string;
    azione: string;
    app: string;
    testo: string;
    campi: Record<string, string>;
  }): string | null;
}

let cablaggio: CablaggioChiacchierata | null = null;
export const collegaChiacchierata = (c: CablaggioChiacchierata): void => {
  cablaggio = c;
};

/* ------------------------------------------------------------ la sessione */

interface Sessione extends Chiacchierata {
  biglietto: Biglietto;
  sveglia: NodeJS.Timeout;
}

/**
 * Una sola sessione per volta su tutta la macchina.
 *
 * Non è una limitazione da software povero: due chiacchierate insieme sono due
 * modelli caricati, cioè nove GB su una scheda da otto. Chi arriva secondo
 * legge che c'è già qualcuno che sta parlando, e con chi.
 */
let viva: Sessione | null = null;

/** I modelli installati, per il menu di chi deve scegliere con chi parlare. */
export async function modelliPerChiacchierare(): Promise<{ id: string; caricato: boolean }[]> {
  const stato = await statoLlm();
  if (!stato.acceso) return [];
  return stato.disponibili.map((m) => ({ id: m.id, caricato: m.caricato }));
}

/** La sessione di questo dispositivo, se ce n'è una viva. */
export function miaChiacchierata(dispositivoId: string): Chiacchierata | null {
  scadutaVia();
  if (!viva || viva.dispositivoId !== dispositivoId) return null;
  return nuda(viva);
}

/**
 * Comincia una sessione: prende il turno e carica il modello.
 *
 * L'ordine conta. **Prima il turno, poi il modello**: caricare quattro GB e poi
 * scoprire che la macchina sta generando vorrebbe dire averla appena rovinata a
 * chi ci stava lavorando.
 */
export async function cominciaChiacchierata(opzioni: {
  dispositivoId: string;
  chiNome: string;
  modello: string;
}): Promise<{ sessione: Chiacchierata } | { errore: string }> {
  scadutaVia();

  if (viva) {
    return viva.dispositivoId === opzioni.dispositivoId
      ? { sessione: nuda(viva) }
      : {
          errore:
            "C'è già qualcuno che sta parlando con un modello su questo computer. " +
            "Aspetta che finisca: la scheda video ne regge uno solo.",
        };
  }

  const stato = await statoLlm();
  if (!stato.acceso) {
    return { errore: stato.motivo ?? "Su questo computer LM Studio non risponde." };
  }
  const scelto = stato.modelli.includes(opzioni.modello) ? opzioni.modello : stato.modelli[0];
  if (!scelto) return { errore: "In LM Studio non c'è nessun modello installato." };

  let biglietto: Biglietto;
  try {
    biglietto = await turno.prendi({
      mestiere: "chiacchierata",
      che: `${opzioni.chiNome} parla con ${scelto}`,
      chi: opzioni.chiNome,
      attesaMassimaMs: ATTESA_TURNO_MS,
    });
  } catch {
    return {
      errore: turno.eSospesa()
        ? "Chi sta al computer lo sta usando adesso: la chiacchierata non può cominciare."
        : "Il computer sta generando. Riprova appena ha finito.",
    };
  }

  const errore = await caricaModello(scelto, CONTESTO_CONSIGLIATO);
  if (errore) {
    turno.rilascia(biglietto);
    return { errore };
  }

  const id = `ch-${randomBytes(6).toString("hex")}`;
  const sessione: Sessione = {
    id,
    dispositivoId: opzioni.dispositivoId,
    modello: scelto,
    scade: Date.now() + DURATA_MS,
    battute: [],
    biglietto,
    sveglia: setTimeout(() => chiudiDavvero(id, "sono passati i dieci minuti"), DURATA_MS),
  };
  sessione.sveglia.unref?.();
  viva = sessione;
  annota(`comincia ${id}: ${opzioni.chiNome} con ${scelto}`);
  return { sessione: nuda(sessione) };
}

/**
 * Una battuta, e la risposta.
 *
 * Il turno **ce l'ha già la sessione**: `turnoGiaPreso` non è un'ottimizzazione,
 * è la differenza fra un modello che resta caricato per dieci minuti e uno che
 * viene scaricato e ricaricato — quattro GB per volta — fra una frase e l'altra.
 */
export async function battuta(opzioni: {
  id: string;
  dispositivoId: string;
  testo: string;
}): Promise<{ sessione: Chiacchierata } | { errore: string }> {
  scadutaVia();
  const sessione = tua(opzioni.id, opzioni.dispositivoId);
  if (!sessione) {
    return { errore: "Questa chiacchierata è finita. Cominciane un'altra, se ti serve." };
  }

  sessione.battute.push({ chi: "io", testo: opzioni.testo, quando: Date.now() });

  const esito = await chiediAllLlm({
    modello: sessione.modello,
    sistema: ISTRUZIONI,
    utente: conversazione(sessione.battute),
    schema: SCHEMA_RISPOSTA,
    nomeSchema: "risposta_daprod",
    // Il ragionamento costa tempo e qui la domanda è semplice: capire cosa
    // vuole la persona e, se è una cosa da generare, riempire tre campi.
    pensa: false,
    turnoGiaPreso: true,
    timeoutMs: 3 * 60_000,
  });

  if (!esito.ok) {
    sessione.battute.push({
      chi: "modello",
      testo: `Non sono riuscito a rispondere: ${esito.motivo ?? "il modello non ha detto niente."}`,
      quando: Date.now(),
    });
    return { sessione: nuda(sessione) };
  }

  const letto = leggiRisposta(esito.testo);
  sessione.battute.push({ chi: "modello", testo: letto.risposta, quando: Date.now() });
  sessione.piano = letto.piano;

  // Ogni battuta allunga la sessione, ma non oltre i dieci minuti da adesso:
  // una conversazione viva non deve morire a metà frase, e una dimenticata
  // aperta non deve tenere la scheda video per sempre.
  rimandaLaFine(sessione);
  return { sessione: nuda(sessione) };
}

/**
 * Accetta il piano: i lavori vanno in fila, e il modello se ne va.
 *
 * **Le due cose insieme, in quest'ordine.** Prima si accodano i lavori — se
 * qualcosa non entra, chi ha premuto lo legge — e poi si chiude la sessione,
 * che è il momento in cui i quattro GB tornano liberi giusto in tempo perché la
 * prima generazione li usi.
 */
export async function accettaIlPiano(opzioni: {
  id: string;
  dispositivoId: string;
  quali: number[];
}): Promise<{ quanti: number } | { errore: string }> {
  scadutaVia();
  const sessione = tua(opzioni.id, opzioni.dispositivoId);
  if (!sessione) return { errore: "Questa chiacchierata è finita." };
  if (!sessione.piano) return { errore: "Non c'è nessun piano da accettare." };
  if (!cablaggio) return { errore: "Questa suite non sa mettere niente in fila." };

  const scelti = opzioni.quali.length
    ? sessione.piano.lavori.filter((_, i) => opzioni.quali.includes(i))
    : sessione.piano.lavori;
  if (!scelti.length) return { errore: "Non hai scelto nessun lavoro." };

  const rifiutati: string[] = [];
  let quanti = 0;
  for (const lavoro of scelti) {
    const errore = cablaggio.chiedi({
      dispositivoId: sessione.dispositivoId,
      azione: lavoro.azione,
      app: lavoro.app,
      testo: lavoro.campi["prompt"] ?? lavoro.campi["descrizione"] ?? lavoro.campi["testo"] ?? lavoro.che,
      campi: lavoro.campi,
    });
    if (errore) rifiutati.push(`${lavoro.che}: ${errore}`);
    else quanti += 1;
  }

  annota(`piano accettato in ${sessione.id}: ${quanti} lavori in fila`);
  // **Qui il modello se ne va.** Nell'istante in cui i lavori partono, i suoi
  // quattro GB servono a loro.
  chiudiDavvero(sessione.id, "il piano è partito");

  if (!quanti) {
    return { errore: rifiutati[0] ?? "Nessuno di quei lavori è potuto entrare in fila." };
  }
  return { quanti };
}

/** Chiude la sessione di chi lo chiede. Chiudere quella di un altro non si può. */
export function chiudiChiacchierata(id: string, dispositivoId: string): void {
  if (!tua(id, dispositivoId)) return;
  chiudiDavvero(id, "chiusa da chi stava parlando");
}

/**
 * Chiude davvero: libera la memoria e molla il turno.
 *
 * **Il turno si molla in ogni caso**, anche se scaricare il modello va storto:
 * un turno non rilasciato è una fila ferma, e una fila ferma è un programma che
 * ha smesso di funzionare senza dirlo a nessuno.
 */
function chiudiDavvero(id: string, perche: string): void {
  if (viva?.id !== id) return;
  const sessione = viva;
  viva = null;
  clearTimeout(sessione.sveglia);
  annota(`finita ${id}: ${perche}`);

  void liberaMemoriaLlm().catch(() => {
    // LM Studio chiuso a metà: la memoria resta occupata, ma la sessione è
    // finita lo stesso e il turno torna libero. Il modello lo scaricherà
    // `faiSpazio` un attimo prima della prossima generazione.
  });
  turno.rilascia(sessione.biglietto);
}

/** Se è scaduta mentre nessuno guardava, la si chiude adesso. */
function scadutaVia(): void {
  if (viva && viva.scade <= Date.now()) chiudiDavvero(viva.id, "scaduta");
}

function tua(id: string, dispositivoId: string): Sessione | null {
  if (!viva || viva.id !== id || viva.dispositivoId !== dispositivoId) return null;
  return viva;
}

function rimandaLaFine(sessione: Sessione): void {
  clearTimeout(sessione.sveglia);
  sessione.scade = Date.now() + DURATA_MS;
  sessione.sveglia = setTimeout(
    () => chiudiDavvero(sessione.id, "sono passati i dieci minuti"),
    DURATA_MS,
  );
  sessione.sveglia.unref?.();
}

/** La sessione senza le cose che non devono uscire da qui. */
function nuda(s: Sessione): Chiacchierata {
  return {
    id: s.id,
    dispositivoId: s.dispositivoId,
    modello: s.modello,
    scade: s.scade,
    battute: s.battute,
    piano: s.piano,
  };
}

/* ------------------------------------------------------- cosa gli si dice */

/**
 * Le istruzioni al modello.
 *
 * Scritte per essere lette da un modello piccolo: frasi corte, regole
 * numerate, e gli esempi di cosa **non** fare accanto a quelli di cosa fare. Un
 * 27B capirebbe anche un paragrafo elegante; un 7B no, e su questa macchina
 * girano tutti e due.
 */
const ISTRUZIONI = [
  "Sei l'assistente della suite DaProd, che gira sul computer di casa di chi ti scrive.",
  "Rispondi sempre in italiano, con frasi corte e senza formule di cortesia.",
  "",
  "Il computer sa fare quattro cose, e nessun'altra:",
  ...SANNO_GENERARE.map((a) => `- ${a.id} (${a.app}): ${a.titolo}. ${a.descrizione}`),
  "",
  "Regole:",
  "1. Se la persona chiacchiera o fa una domanda, rispondi e lascia il piano vuoto.",
  "2. Se chiede una cosa da generare, riempi il piano con uno o più lavori.",
  "3. Nel piano metti SOLO le azioni dell'elenco qui sopra, scritte identiche.",
  "4. Il `prompt` di ogni lavoro lo scrivi TU, per bene e per intero: la persona",
  "   dice «una foto di una macchina», tu scrivi la descrizione completa che",
  "   serve al modello che disegna. Concreta: soggetto, luce, inquadratura.",
  "5. Se ti chiede due cose insieme — una foto E un video — metti due lavori.",
  "6. Non dire mai che hai già fatto partire qualcosa: tu proponi, decide la persona.",
  "7. Nella risposta scritta spiega in una riga cosa hai messo nel piano.",
].join("\n");

/**
 * La forma della risposta.
 *
 * `prompt` è una stringa sola e non un oggetto di campi liberi: chiedere a un
 * modello piccolo di riempire una mappa di chiavi che non conosce è il modo più
 * sicuro di ricevere chiavi inventate. Qui gli si chiede quello che sa fare —
 * scrivere una descrizione — e i campi veri li riempie questo file.
 */
const SCHEMA_RISPOSTA = {
  type: "object",
  properties: {
    risposta: {
      type: "string",
      description: "Cosa dici alla persona, in italiano, due o tre righe al massimo.",
    },
    piano: {
      type: "array",
      description: "I lavori da proporre. Vuoto se non c'è niente da generare.",
      items: {
        type: "object",
        properties: {
          azione: {
            type: "string",
            enum: SANNO_GENERARE.map((a) => a.id),
            description: "Quale delle quattro azioni.",
          },
          che: {
            type: "string",
            description: "Cosa si otterrà, in italiano e in poche parole: «una foto di una macchina rossa».",
          },
          prompt: {
            type: "string",
            description: "La descrizione completa da dare al modello che genera.",
          },
          durata: {
            type: "number",
            description: "Secondi, solo per video e brani. Zero vuol dire: decidi tu.",
          },
        },
        required: ["azione", "che", "prompt"],
      },
    },
  },
  required: ["risposta"],
} as const;

/** La conversazione, ridotta a quello che serve al modello per rispondere. */
function conversazione(battute: BattutaChiacchierata[]): string {
  const ultime = battute.slice(-BATTUTE_RICORDATE);
  return ultime
    .map((b) => (b.chi === "io" ? `Persona: ${b.testo}` : `Tu: ${b.testo}`))
    .concat("Tu:")
    .join("\n");
}

/* --------------------------------------------------- leggere la risposta */

interface RispostaGrezza {
  risposta?: unknown;
  piano?: unknown;
}

/**
 * Dalla risposta del modello a un piano che si può eseguire.
 *
 * **Non ci si fida di niente.** Lo schema JSON rende molto probabile che la
 * forma sia giusta, non certo: un modello piccolo che va in difficoltà scrive
 * ancora testo libero, o un'azione che non esiste, o una durata di duemila
 * secondi. Tutto quello che non si riconosce si butta, e quello che resta è
 * eseguibile per costruzione.
 */
function leggiRisposta(testo: string): { risposta: string; piano?: PianoLavori } {
  let dentro: RispostaGrezza;
  try {
    dentro = JSON.parse(testo) as RispostaGrezza;
  } catch {
    // Niente JSON: il modello ha risposto a parole. È una risposta, e va bene
    // così — semplicemente non contiene un piano.
    return { risposta: testo.trim() || "…" };
  }

  const risposta =
    typeof dentro.risposta === "string" && dentro.risposta.trim()
      ? dentro.risposta.trim()
      : "Ecco.";

  const grezzi = Array.isArray(dentro.piano) ? dentro.piano : [];
  const lavori = grezzi
    .map(unLavoro)
    .filter((l): l is LavoroDelPiano => l !== null)
    // Tre lavori sono già venti minuti di scheda video: oltre, un modello che
    // si è entusiasmato riempirebbe la fila per mezza giornata.
    .slice(0, 3);

  if (!lavori.length) return { risposta };

  return {
    risposta,
    piano: {
      id: `pi-${randomBytes(4).toString("hex")}`,
      riassunto:
        lavori.length === 1
          ? `Ti propongo di fare ${lavori[0]!.che}.`
          : `Ti propongo ${lavori.length} cose: ${lavori.map((l) => l.che).join(", ")}.`,
      lavori,
    },
  };
}

/** Un lavoro del piano, se è uno che si può davvero fare. */
function unLavoro(grezzo: unknown): LavoroDelPiano | null {
  if (typeof grezzo !== "object" || grezzo === null) return null;
  const dati = grezzo as Record<string, unknown>;

  const azione = SANNO_GENERARE.find((a) => a.id === dati["azione"]);
  if (!azione?.app) return null;

  const prompt = typeof dati["prompt"] === "string" ? dati["prompt"].trim() : "";
  if (!prompt) return null;

  const che =
    typeof dati["che"] === "string" && dati["che"].trim()
      ? dati["che"].trim().slice(0, 120)
      : `${azione.titolo.toLowerCase()}`;

  /**
   * **I campi veri li riempie questo file, non il modello.**
   *
   * Ogni azione ha il suo campo principale con un nome suo — `prompt` per
   * un'immagine, `descrizione` per un brano, `testo` per la voce — e chiederli
   * a memoria a un modello piccolo vuol dire riceverli sbagliati. Il catalogo
   * sa già qual è il campo principale: si legge da lì.
   */
  const principale = azione.campi.find((c) => c.principale) ?? azione.campi[0];
  if (!principale) return null;

  const campi: Record<string, string> = { [principale.nome]: prompt.slice(0, 2000) };

  const durata = Number(dati["durata"]);
  const campoDurata = azione.campi.find((c) => c.nome === "secondi");
  if (campoDurata && Number.isFinite(durata) && durata > 0) {
    const min = campoDurata.min ?? 1;
    const max = campoDurata.max ?? 60;
    campi["secondi"] = String(Math.max(min, Math.min(max, Math.round(durata))));
  }

  return { azione: azione.id, app: azione.app, che, campi };
}
