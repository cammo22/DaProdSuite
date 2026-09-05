/**
 * Dieci minuti col modello, e il modello può usare la suite.
 *
 * **Cosa è stato chiesto, il 26 agosto 2026, testualmente:**
 *
 * > «puoi fare richiesta al pc di parlare per 10 minuti con un modello, quel
 * > modello mentre parli ha la possibilità di usare la suite: esempio se io gli
 * > scrivo *vorrei fare una foto di una macchina*, il modello potrà creare
 * > tutto un piano e lo invia all'utente; se l'utente lo accetta il modello fa
 * > partire la richiesta e nel frattempo viene scaricato dalla memoria.»
 *
 * ## Cosa è cambiato nella 0.7.7, provandola
 *
 * Tre cose, tutte e tre viste usandola contro modelli veri:
 *
 * **1. «Chiedo al computer» non chiedeva.** Se la macchina stava generando, la
 * chiacchierata aspettava un minuto in silenzio e poi diceva di riprovare.
 * Adesso **si mette in fila davvero**: chi ha premuto vede il suo posto, lo
 * vede scendere, e se cambia idea esce dalla coda. Chiesto così: «ti mette in
 * coda e ti fa vedere in che posizione sei e volendo puoi anche abbandonare la
 * coda».
 *
 * **2. Il piano arrivava mezzo vuoto.** Per un brano il modello riempiva la
 * descrizione e nient'altro: niente testo da cantare, niente stile, niente
 * lingua, niente durata — e un brano senza parole è uno strumentale, che non è
 * quello che aveva chiesto chi ha scritto «una canzone d'amore a Napoli».
 * Adesso lo schema ha **un campo per ogni cosa che serve**, e le istruzioni
 * dicono quali sono obbligatorie per quale mestiere.
 *
 * **3. I modelli piccoli non sapevano cosa stavano facendo.** Detto bene: «il
 * fatto che non scrive bene il prompt è perché questi modelli locali sono
 * piccoli, magari diamogli un preset a tutti i modelli che spiegano cosa
 * possono e come fare». Le istruzioni adesso sono un **manuale**: cosa sa fare
 * la macchina, come si scrive un prompt per ognuna delle quattro cose, e cosa
 * non fare — con gli esempi accanto, che a un 4B servono più di qualunque
 * spiegazione.
 *
 * ## Le tre regole che reggono tutto su 8 GB
 *
 * **1. È a tempo.** Il modello resta caricato per la durata della sessione e
 * poi se ne va: quei quattro GB sono gli stessi che servono a generare.
 *
 * **2. Tiene il turno.** Per tutta la sessione la macchina è sua (vedi
 * `turno.ts`), quindi non c'è modo che una generazione parta a metà frase.
 *
 * **3. Accettare il piano la chiude.** Nell'istante in cui i lavori partono, il
 * modello non serve più e i suoi GB servono a loro.
 */

import { randomBytes } from "node:crypto";
import { AZIONI, LINGUE_CANTO, SEZIONI } from "@daprod/azioni";
import type {
  BattutaChiacchierata,
  Chiacchierata,
  LavoroDelPiano,
  PianoLavori,
} from "@daprod/gateway";
import { chiediAllLlm, caricaModello, contestoScelto, liberaMemoriaLlm, statoLlm } from "./llm";
import { turno, type Biglietto } from "./turno";
import { stiliDi } from "./stili";
import { createLogger } from "./logging";

const log = createLogger("chiacchierata");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Quanto dura una sessione. Dieci minuti, come è stato chiesto. */
const DURATA_MS = 10 * 60_000;

/**
 * Quanto si sta in fila prima di arrendersi.
 *
 * Mezz'ora. **Non è la stessa cosa dell'attesa muta di prima**: qui chi ha
 * premuto vede il suo posto e può uscire quando vuole, quindi il tempo lungo
 * non è una presa in giro — è la possibilità di mettersi in coda dietro a un
 * video e andarsene a fare altro.
 */
const ATTESA_IN_FILA_MS = 30 * 60_000;

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
 * modelli caricati, cioè nove GB su una scheda da otto.
 */
let viva: Sessione | null = null;

/**
 * Chi ha chiesto di parlare e sta aspettando il suo turno.
 *
 * **È la parte che mancava.** Prima l'attesa era un `await` dentro la chiamata
 * HTTP: chi aveva premuto restava con la richiesta aperta, non vedeva niente e
 * dopo un minuto si sentiva dire di riprovare. Adesso l'attesa vive qui, la
 * chiamata torna subito con un posto in fila, e chi guarda vede il numero
 * scendere.
 */
interface InAttesa {
  dispositivoId: string;
  chiNome: string;
  modello: string;
  chiesta: number;
  /** Il biglietto del turno, per poterlo mollare uscendo dalla coda. */
  bigliettoId: string;
  /** Compilato se l'attesa è finita male: lo si legge una volta e si butta. */
  errore?: string;
  /** Vero mentre si sta caricando il modello: il turno è già nostro. */
  sicarica?: boolean;
}

let inAttesa: InAttesa | null = null;

/** I modelli installati, per il menu di chi deve scegliere con chi parlare. */
export async function modelliPerChiacchierare(): Promise<{ id: string; caricato: boolean }[]> {
  const stato = await statoLlm();
  if (!stato.acceso) return [];
  return stato.disponibili.map((m) => ({ id: m.id, caricato: m.caricato }));
}

/** Com'è messa l'attesa di questo dispositivo, se ne ha una. */
export function attesaDi(dispositivoId: string): {
  posto: number;
  quanti: number;
  sicarica: boolean;
  errore?: string;
} | null {
  if (!inAttesa || inAttesa.dispositivoId !== dispositivoId) return null;
  const stato = turno.stato();
  const posto = stato.fila.findIndex((b) => b.id === inAttesa!.bigliettoId);
  return {
    // Zero vuol dire «tocca a te adesso»: o si sta caricando il modello, o il
    // turno è appena arrivato e la sessione sta per esserci.
    posto: posto < 0 ? 0 : posto + 1,
    quanti: stato.fila.length,
    sicarica: inAttesa.sicarica === true,
    errore: inAttesa.errore,
  };
}

/** La sessione di questo dispositivo, se ce n'è una viva. */
export function miaChiacchierata(dispositivoId: string): Chiacchierata | null {
  scadutaVia();
  if (!viva || viva.dispositivoId !== dispositivoId) return null;
  return nuda(viva);
}

/**
 * Chiede di parlare. **Torna subito**, con la sessione o con il posto in fila.
 *
 * L'ordine conta. **Prima il turno, poi il modello**: caricare quattro GB e poi
 * scoprire che la macchina stava generando vorrebbe dire averla appena rovinata
 * a chi ci stava lavorando.
 */
export async function cominciaChiacchierata(opzioni: {
  dispositivoId: string;
  chiNome: string;
  modello: string;
}): Promise<
  | { sessione: Chiacchierata }
  | { attesa: { posto: number; quanti: number; sicarica: boolean } }
  | { errore: string }
> {
  scadutaVia();

  if (viva) {
    return viva.dispositivoId === opzioni.dispositivoId
      ? { sessione: nuda(viva) }
      : {
          errore:
            `${viva.chiNome || "Qualcuno"} sta già parlando con un modello su questo computer. ` +
            "Aspetta che finisca: la scheda video ne regge uno solo.",
        };
  }

  // Già in fila: si risponde con il posto invece di prenotarne un secondo.
  const gia = attesaDi(opzioni.dispositivoId);
  if (gia) return { attesa: { posto: gia.posto, quanti: gia.quanti, sicarica: gia.sicarica } };

  if (inAttesa) {
    return {
      errore: `${inAttesa.chiNome} sta già aspettando il computer per parlare. Riprova fra poco.`,
    };
  }

  const stato = await statoLlm();
  if (!stato.acceso) {
    return { errore: stato.motivo ?? "Su questo computer LM Studio non risponde." };
  }
  const scelto = stato.modelli.includes(opzioni.modello) ? opzioni.modello : stato.modelli[0];
  if (!scelto) return { errore: "In LM Studio non c'è nessun modello installato." };

  /**
   * **Si prenota, e si torna subito.**
   *
   * L'attesa gira in sottofondo: chi ha premuto riceve il suo posto in fila e
   * lo vede scendere, invece di restare con una richiesta HTTP aperta a
   * guardare una rotella.
   */
  const prenotazione: InAttesa = {
    dispositivoId: opzioni.dispositivoId,
    chiNome: opzioni.chiNome,
    modello: scelto,
    chiesta: Date.now(),
    bigliettoId: "",
  };
  inAttesa = prenotazione;
  annota(`in fila per parlare: ${opzioni.chiNome} con ${scelto}`);

  void aspettaIlTurno(prenotazione);

  // Un respiro perché il biglietto entri in fila: senza, la prima risposta
  // direbbe «posto 0» quando invece ce ne sono tre davanti.
  await new Promise((r) => setTimeout(r, 60));
  const adesso = attesaDi(opzioni.dispositivoId);
  /**
   * `viva` può essere cambiata **mentre aspettavamo quei sessanta millisecondi**:
   * se la macchina era libera, `aspettaIlTurno` ha già fatto tutto. TypeScript
   * non può saperlo — vede il controllo di sopra e la crede ancora nulla — e la
   * riga qui sotto è il modo di dirglielo senza inventarsi una variabile.
   */
  const partitaSubito = viva as Sessione | null;
  if (partitaSubito && partitaSubito.dispositivoId === opzioni.dispositivoId) {
    return { sessione: nuda(partitaSubito) };
  }
  return {
    attesa: adesso
      ? { posto: adesso.posto, quanti: adesso.quanti, sicarica: adesso.sicarica }
      : { posto: 0, quanti: 0, sicarica: true },
  };
}

/**
 * L'attesa vera, in sottofondo.
 *
 * Se chi aspettava se ne va, `esciDallaFila` annulla il biglietto e questa
 * funzione se ne accorge dal fatto che `inAttesa` non è più la sua.
 */
async function aspettaIlTurno(prenotazione: InAttesa): Promise<void> {
  let biglietto: Biglietto;
  try {
    const chiesto = turno.prendi({
      mestiere: "chiacchierata",
      che: `${prenotazione.chiNome} parla con ${prenotazione.modello}`,
      chi: prenotazione.chiNome,
      attesaMassimaMs: ATTESA_IN_FILA_MS,
      // Chi chiama sa già l'id prima che il turno arrivi: serve a mostrare il
      // posto in fila, e a poterlo annullare uscendo.
      dimmiIlBiglietto: (id) => {
        prenotazione.bigliettoId = id;
      },
    });
    biglietto = await chiesto;
  } catch (err) {
    if (inAttesa !== prenotazione) return;
    prenotazione.errore = turno.eSospesa()
      ? "Chi sta al computer lo sta usando adesso: la chiacchierata non può cominciare."
      : "Ho aspettato il mio turno abbastanza. Riprova quando il computer si libera.";
    annota(`niente turno per ${prenotazione.chiNome}: ${err instanceof Error ? err.message : err}`);
    return;
  }

  // Se nel frattempo se n'è andato, il turno si molla subito: tenerlo vorrebbe
  // dire bloccare la macchina per uno che non c'è più.
  if (inAttesa !== prenotazione) {
    turno.rilascia(biglietto);
    return;
  }

  prenotazione.sicarica = true;
  const errore = await caricaModello(prenotazione.modello, contestoScelto());
  if (inAttesa !== prenotazione) {
    turno.rilascia(biglietto);
    return;
  }
  if (errore) {
    prenotazione.errore = errore;
    turno.rilascia(biglietto);
    return;
  }

  const id = `ch-${randomBytes(6).toString("hex")}`;
  const sessione: Sessione = {
    id,
    dispositivoId: prenotazione.dispositivoId,
    chiNome: prenotazione.chiNome,
    modello: prenotazione.modello,
    scade: Date.now() + DURATA_MS,
    battute: [],
    biglietto,
    sveglia: setTimeout(() => chiudiDavvero(id, "sono passati i dieci minuti"), DURATA_MS),
  };
  sessione.sveglia.unref?.();
  viva = sessione;
  inAttesa = null;
  annota(`comincia ${id}: ${prenotazione.chiNome} con ${prenotazione.modello}`);
}

/**
 * Esce dalla coda. **È un diritto, non un permesso.**
 *
 * Chi si è messo in fila e ha cambiato idea sta liberando la macchina, non
 * occupandola: non deve chiedere niente a nessuno.
 */
export function esciDallaFila(dispositivoId: string): boolean {
  if (!inAttesa || inAttesa.dispositivoId !== dispositivoId) return false;
  const chi = inAttesa;
  inAttesa = null;
  if (chi.bigliettoId) turno.annulla(chi.bigliettoId, "uscito dalla coda");
  annota(`${chi.chiNome} è uscito dalla coda per parlare`);
  return true;
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
    sistema: istruzioni(sessione.dispositivoId),
    utente: conversazione(sessione.battute),
    schema: SCHEMA_RISPOSTA,
    nomeSchema: "risposta_daprod",
    // Il ragionamento costa tempo e qui la domanda è semplice: capire cosa
    // vuole la persona e riempire dei campi.
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

  const letto = leggiRisposta(esito.testo, sessione.dispositivoId);
  sessione.battute.push({ chi: "modello", testo: letto.risposta, quando: Date.now() });
  sessione.piano = letto.piano;

  // Ogni battuta allunga la sessione, ma non oltre i dieci minuti da adesso.
  rimandaLaFine(sessione);
  return { sessione: nuda(sessione) };
}

/**
 * **Adesso fammi il piano.** Nuova nella 0.9.1.
 *
 * ⚠ Il difetto che cura, detto il 5 settembre 2026: «siccome i modelli
 * falliscono a creare il piano, crea proprio un tasto che se premuto gli fa
 * fare un piano — quindi io ci chatto, quando sono soddisfatto clicco crea
 * piano e il modello crea il piano».
 *
 * Aveva ragione, e la causa è precisa. Fino a qui, a ogni battuta il modello
 * doveva fare **due cose insieme**: capire se stavi chiacchierando o chiedendo,
 * e nel secondo caso riempire otto campi. Un modello da quattro miliardi che
 * deve decidere *se* rispondere a una domanda o compilare un modulo sbaglia
 * quella decisione spesso — e quando sbaglia lascia il piano vuoto senza dirlo.
 *
 * Con un tasto la decisione la prende la persona: da quel momento il modello ha
 * **un lavoro solo**, e su un lavoro solo va molto meglio. Le istruzioni qui
 * sotto lo dicono in una riga sola e senza alternative: il piano non può essere
 * vuoto.
 *
 * Il modello non fa una battuta nuova: la conversazione resta com'è, e quello
 * che cambia è il piano. Se sbaglia lo si dice, e si può ripremere.
 */
export async function faiIlPiano(opzioni: {
  id: string;
  dispositivoId: string;
}): Promise<{ sessione: Chiacchierata } | { errore: string }> {
  scadutaVia();
  const sessione = tua(opzioni.id, opzioni.dispositivoId);
  if (!sessione) {
    return { errore: "Questa chiacchierata è finita. Cominciane un'altra, se ti serve." };
  }
  if (!sessione.battute.some((b) => b.chi === "io")) {
    return { errore: "Digli prima cosa vuoi: dal niente non esce un piano." };
  }

  const esito = await chiediAllLlm({
    modello: sessione.modello,
    sistema: [
      istruzioni(sessione.dispositivoId),
      "",
      "## ADESSO",
      "La persona ha premuto «crea il piano». Non stai più decidendo se serve un",
      "piano: serve. Leggi tutta la conversazione qui sotto e trasformala in lavori.",
      "Il piano NON può essere vuoto: mettici almeno un lavoro.",
      "In `risposta` scrivi una riga sola che dice cosa hai messo nel piano.",
    ].join("\n"),
    utente: conversazione(sessione.battute),
    schema: SCHEMA_RISPOSTA,
    nomeSchema: "risposta_daprod",
    pensa: false,
    turnoGiaPreso: true,
    timeoutMs: 3 * 60_000,
  });

  if (!esito.ok) {
    return { errore: esito.motivo ?? "Il modello non ha risposto." };
  }

  const letto = leggiRisposta(esito.testo, sessione.dispositivoId);
  if (!letto.piano || !letto.piano.lavori.length) {
    return {
      errore:
        "Il modello non è riuscito a farne un piano. Digli in una riga cosa vuoi " +
        "— «fammi una foto di …» — e ripremi.",
    };
  }

  sessione.battute.push({ chi: "modello", testo: letto.risposta, quando: Date.now() });
  sessione.piano = letto.piano;
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
 *
 * `modelli` è la novità della 0.7.7: «quando parlo con llm devo poter scegliere
 * poi che modello usare una volta che il piano è pronto». Il modello che
 * *genera* non è quello che *scrive*, e la scelta ha senso farla guardando il
 * piano — non prima, quando ancora non si sa cosa si farà.
 */
export async function accettaIlPiano(opzioni: {
  id: string;
  dispositivoId: string;
  quali: number[];
  modelli?: Record<string, string>;
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
    const campi = { ...lavoro.campi };
    // Il modello di generazione scelto adesso vince su quello che aveva messo
    // il modello che scrive: chi guarda il piano ne sa di più.
    const voluto = opzioni.modelli?.[lavoro.azione];
    if (voluto) campi["modello"] = voluto;

    const errore = cablaggio.chiedi({
      dispositivoId: sessione.dispositivoId,
      azione: lavoro.azione,
      app: lavoro.app,
      testo: campi["prompt"] ?? campi["descrizione"] ?? campi["testo"] ?? lavoro.che,
      campi,
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
  esciDallaFila(dispositivoId);
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
    // finita lo stesso e il turno torna libero.
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
    chiNome: s.chiNome,
    modello: s.modello,
    scade: s.scade,
    battute: s.battute,
    piano: s.piano,
  };
}

/* ------------------------------------------------------- cosa gli si dice */

/**
 * Il manuale del modello.
 *
 * **Perché è lungo, e perché deve esserlo.** Detto il 26 agosto 2026: «il fatto
 * che non scrive bene il prompt è perché questi modelli locali sono piccoli,
 * magari diamogli un preset a tutti i modelli che spiegano cosa possono e come
 * fare». Un 27B capisce «scrivi un buon prompt»; un 4B no — a un 4B servono
 * **le regole scritte e un esempio accanto**, e l'esempio conta più della
 * regola.
 *
 * Quindi qui dentro c'è, per ognuna delle quattro cose che la macchina sa fare:
 * quali campi riempire, cosa ci va dentro, e un esempio vero. Più le tre cose
 * che i modelli sbagliano sempre, dette in negativo.
 *
 * Gli stili sono quelli **di chi sta parlando**: se ha fatto i suoi, il modello
 * deve poterli usare.
 */
function istruzioni(dispositivoId: string): string {
  const stili = stiliDi(dispositivoId).slice(0, 30);
  const lingue = LINGUE_CANTO.map((l) => `${l.id} (${l.nome})`).join(", ");

  return [
    "Sei l'assistente della suite DaProd, che gira sul computer di casa di chi ti scrive.",
    "Rispondi sempre in italiano, con frasi corte e senza formule di cortesia.",
    "",
    "## Cosa sa fare questo computer",
    "",
    "Quattro cose, e nessun'altra. Per ognuna c'è scritto cosa devi riempire.",
    "",
    "### genera.immagine — una foto",
    "- `prompt`: la descrizione, IN INGLESE, concreta: soggetto, luce, inquadratura,",
    "  materiali. Da 15 a 40 parole. Niente frasi come «bellissima» o «capolavoro».",
    "- `quante`: da 1 a 4. Se non te lo chiedono, 1.",
    'Esempio: "a red vintage car on a mountain road at sunset, warm side light,',
    ' low angle shot, shallow depth of field, film grain"',
    "",
    "### genera.video — una clip, col suono",
    "- `prompt`: la scena IN INGLESE: soggetto, cosa fa, come si muove la camera.",
    "- `durata`: secondi, fra 2 e 10. Se non te lo chiedono, 5.",
    'Esempio: "a boat entering the harbour at dawn, camera follows it from the right,',
    ' calm water, golden light"',
    "",
    "### genera.brano — una canzone",
    "Questa ha CINQUE campi e vanno riempiti TUTTI, non solo il primo:",
    "- `titolo`: come si chiama la canzone. Tre o quattro parole, in italiano,",
    "  senza virgolette. È il nome che avrà il file.",
    "- `descrizione`: SOLO GENERI, tre o quattro, in inglese, separati da virgola.",
    "  NIENTE strumenti, NIENTE atmosfera, NIENTE BPM, NIENTE tonalità: scriverli",
    "  restringe il modello musicale e fa uscire sempre la stessa cosa.",
    "- `testo`: le parole da cantare. Segna le sezioni fra",
    `  parentesi quadre: ${SEZIONI.join(" ")}. Ogni sezione su una riga sua, poi il`,
    "  testo sotto. Scrivi almeno una strofa e un ritornello.",
    `- \`lingua\`: ${lingue}. Se non te la dicono: it.`,
    "- `durata`: secondi, fra 30 e 220. Una canzone normale è 120.",
    "",
    /**
     * ⚠ **La regola della lingua, e perché è scritta in maiuscolo.**
     *
     * Detto il 27 agosto 2026: «spesso gli LLM scrivono in napoletano,
     * facciamoli scrivere in italiano». Ed era colpa di questo file: l'esempio
     * di `testo` qui sotto finiva con *«Ammore mio, nun te ne jì»*, che è
     * napoletano. Un modello piccolo copia l'esempio molto più di quanto segua
     * una regola — è la ragione per cui gli esempi ci sono — e quello gli stava
     * dicendo, senza dirlo, che le canzoni di questa suite si scrivono in
     * dialetto.
     *
     * Non era del tutto un caso: gli stili di partenza sono neomelodici
     * napoletani, e «neapolitan neomelodic pop» nella descrizione tira nella
     * stessa direzione. Ma il **genere** è napoletano, la **lingua** no: sono
     * due cose diverse, e questa è la riga che le separa.
     */
    "REGOLA DELLA LINGUA — vale sopra a tutto il resto:",
    "- Il `testo` va scritto in ITALIANO CORRENTE, parole del vocabolario.",
    "- NIENTE dialetto: né napoletano, né romano, né siciliano. Nemmeno una",
    "  parola, nemmeno nel ritornello. Il genere può essere napoletano, la lingua no.",
    "- NIENTE parole spagnole, inglesi o inventate dentro un testo italiano.",
    "- L'unico caso in cui si cambia lingua è se te la chiedono: se chiedono una",
    "  canzone in inglese, `lingua: en` e il testo tutto in inglese.",
    "",
    'Esempio di `titolo`: "Le luci del porto"',
    'Esempio di `descrizione`: "neapolitan neomelodic pop, melodic trap, autotune ballad"',
    "Esempio di `testo`:",
    "[Verse]",
    "Le luci del porto si accendono piano",
    "e resto a guardarti da lontano",
    "[Chorus]",
    "Amore mio, non te ne andare",
    "resta un momento a respirare",
    "",
    "### genera.voce — un testo letto ad alta voce",
    "- `testo`: quello che deve dire, nella lingua di chi te lo chiede.",
    "",
    ...(stili.length
      ? [
          "",
          "## Gli stili musicali di questa persona",
          "Se uno di questi va bene, usa le sue parole ESATTE come `descrizione`.",
          ...stili.map((s) => `- ${s.nome}: ${s.testo}`),
        ]
      : []),
    "",
    "## Regole",
    "1. Se chiacchiera o fa una domanda, rispondi e lascia il piano vuoto.",
    "2. Se chiede una cosa da generare, riempi il piano.",
    "3. Metti SOLO le azioni dell'elenco, scritte identiche.",
    "4. Se chiede due cose insieme — una foto E un video — metti due lavori.",
    "5. NON dire mai che hai già fatto partire qualcosa: tu proponi, decide la persona.",
    "6. NON scrivere il prompt dentro `risposta`: `risposta` è quello che dici alla",
    "   persona, una riga. Il prompt va nei campi del piano.",
    "7. Per un brano NON lasciare `testo` vuoto, a meno che non ti chiedano uno",
    "   strumentale: senza parole non canta.",
    "8. Per un brano dai sempre un `titolo`: due o tre parole prese dal ritornello.",
    "9. Le canzoni si scrivono in ITALIANO, mai in dialetto. Vedi la regola della",
    "   lingua qui sopra: vale anche quando il genere è napoletano.",
  ].join("\n");
}

/**
 * La forma della risposta.
 *
 * **Un campo per ogni cosa, e nessuna mappa libera.** Fino alla 0.7.6 il
 * modello riceveva un solo `prompt` e i campi veri li riempiva questo file: per
 * un'immagine bastava, per un brano no — la descrizione finiva al posto giusto
 * e testo, stile, lingua e durata restavano vuoti. Chiedere a un modello
 * piccolo di riempire una mappa di chiavi che non conosce è il modo più sicuro
 * di ricevere chiavi inventate; chiedergli **campi con un nome e una
 * spiegazione** è quello che sa fare.
 */
const SCHEMA_RISPOSTA = {
  type: "object",
  properties: {
    risposta: {
      type: "string",
      description: "Cosa dici alla persona, in italiano. Una o due righe, non il prompt.",
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
            description:
              "Cosa si otterrà, in italiano e in poche parole: «una foto di una macchina rossa».",
          },
          prompt: {
            type: "string",
            description:
              "Per immagine e video: la descrizione in inglese. Per il brano: i tre o quattro " +
              "generi in inglese. Per la voce: il testo da leggere.",
          },
          titolo: {
            type: "string",
            description:
              "SOLO per genera.brano: come si chiama la canzone, in italiano, tre o quattro " +
              "parole. È il nome che avrà il file.",
          },
          testo: {
            type: "string",
            description:
              "SOLO per genera.brano: le parole da cantare, IN ITALIANO e senza dialetto, " +
              "con le sezioni fra parentesi quadre. Vuoto solo se chiedono uno strumentale.",
          },
          lingua: {
            type: "string",
            enum: LINGUE_CANTO.map((l) => l.id),
            description: "SOLO per genera.brano: in che lingua canta.",
          },
          durata: {
            type: "number",
            description:
              "Secondi. Video: 2-10. Brano: 30-220. Zero o assente vuol dire: decidi tu.",
          },
          quante: {
            type: "number",
            description: "SOLO per genera.immagine: quante immagini, da 1 a 4.",
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
function leggiRisposta(
  testo: string,
  dispositivoId: string,
): { risposta: string; piano?: PianoLavori } {
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
    .map((g) => unLavoro(g, dispositivoId))
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
function unLavoro(grezzo: unknown, dispositivoId: string): LavoroDelPiano | null {
  if (typeof grezzo !== "object" || grezzo === null) return null;
  const dati = grezzo as Record<string, unknown>;

  const azione = SANNO_GENERARE.find((a) => a.id === dati["azione"]);
  if (!azione?.app) return null;

  const prompt = typeof dati["prompt"] === "string" ? dati["prompt"].trim() : "";
  if (!prompt) return null;

  const che =
    typeof dati["che"] === "string" && dati["che"].trim()
      ? dati["che"].trim().slice(0, 120)
      : azione.titolo.toLowerCase();

  /**
   * **I nomi dei campi li mette questo file, non il modello.**
   *
   * Ogni azione ha il suo campo principale con un nome suo — `prompt` per
   * un'immagine, `descrizione` per un brano, `testo` per la voce — e chiederli a
   * memoria a un modello piccolo vuol dire riceverli sbagliati. Il catalogo sa
   * già qual è il principale: si legge da lì.
   */
  const principale = azione.campi.find((c) => c.principale) ?? azione.campi[0];
  if (!principale) return null;

  const campi: Record<string, string> = { [principale.nome]: prompt.slice(0, 2000) };

  // ---------------------------------------------------------- il brano
  if (azione.id === "genera.brano") {
    const parole = typeof dati["testo"] === "string" ? dati["testo"].trim() : "";
    if (parole) campi["testo"] = parole.slice(0, 4000);

    const lingua = typeof dati["lingua"] === "string" ? dati["lingua"].trim() : "";
    if (LINGUE_CANTO.some((l) => l.id === lingua)) campi["lingua"] = lingua;

    // Come si chiama, se un nome gliel'ha dato. Vuoto lo ricava la scheda dal
    // testo, che è quello che ha sempre fatto.
    const nome = typeof dati["titolo"] === "string" ? dati["titolo"].trim() : "";
    if (nome) campi["titolo"] = nome.slice(0, 80);

    /**
     * Se ha scelto uno stile della persona, glielo si riconosce.
     *
     * Il modello può aver copiato le parole di uno stile invece di scriverne di
     * nuove — è quello che gli abbiamo chiesto di fare. Riconoscerlo serve a
     * far comparire il nome nel piano («Neomelodico trap») invece di tre parole
     * inglesi che a chi legge non dicono niente.
     */
    const suo = stiliDi(dispositivoId).find(
      (x) => x.testo.toLowerCase() === prompt.toLowerCase(),
    );
    if (suo) campi["stile"] = suo.nome;
  }

  // ------------------------------------------------------- quante immagini
  if (azione.id === "genera.immagine") {
    const quante = Number(dati["quante"]);
    if (Number.isFinite(quante) && quante >= 1) {
      campi["quante"] = String(Math.min(4, Math.round(quante)));
    }
  }

  // ------------------------------------------------------------ la durata
  const durata = Number(dati["durata"]);
  const campoDurata = azione.campi.find((c) => c.nome === "secondi");
  if (campoDurata && Number.isFinite(durata) && durata > 0) {
    const min = campoDurata.min ?? 1;
    const max = campoDurata.max ?? 60;
    campi["secondi"] = String(Math.max(min, Math.min(max, Math.round(durata))));
  }

  return { azione: azione.id, app: azione.app, che, campi };
}
