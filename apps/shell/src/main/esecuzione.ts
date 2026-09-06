/**
 * La fila che parte davvero.
 *
 * **Il difetto che questo file esiste per curare, detto da chi l'ha visto:**
 * «quando accetto un lavoro non funziona». Ed era vero. Fino alla 0.6.0
 * accettare una richiesta cambiava una parola in un elenco — da «in attesa» a
 * «accettata» — e poi non succedeva niente: chi stava al PC doveva aprire
 * l'app, ricopiare quello che era stato chiesto e premere Genera. Da fuori
 * sembrava un programma rotto, e a ragione: «accettata» prometteva una cosa che
 * nessuno faceva.
 *
 * Adesso accettare vuol dire: **apri la scheda giusta, dalle il lavoro, e
 * riconosci il file che ne esce.**
 *
 * ## Tre scelte, e il perché di ognuna
 *
 * **1. Genera la scheda, non lo shell.** Sarebbe stato più diretto costruire il
 * grafo qui e mandarlo al motore. Sarebbe stata la **seconda** strada per fare
 * la stessa cosa, e la prima a divergere: il giorno che DaProdFoto impara un
 * modello nuovo, questa non lo saprebbe. Qui si riempie il modulo della scheda
 * e si preme il suo tasto — lo stesso codice, gli stessi controlli, gli stessi
 * messaggi d'errore.
 *
 * **2. Una per volta.** Non è prudenza: su otto GB di scheda video ci sta un
 * modello alla volta, e due generazioni insieme non sono più veloci, sono due
 * generazioni che falliscono. La fila è seria: la prossima parte quando la
 * precedente ha prodotto il suo file.
 *
 * **3. Il file si riconosce dalla libreria.** La scheda non ci dice quale file
 * ha prodotto, e non deve: dovrebbe saperlo ognuna, in un modo suo. Invece la
 * libreria è già l'elenco di tutto quello che esce, con l'ora. Poiché si lavora
 * **una per volta**, il primo elemento nuovo di quell'app dopo che abbiamo
 * chiesto è quello. È anche il motivo per cui la regola 2 non è negoziabile: se
 * girassero due lavori insieme, questa attribuzione sarebbe una moneta lanciata.
 *
 * ⚠ **Il caso che resta aperto, e va detto**: se mentre la fila lavora anche tu
 * generi qualcosa a mano nella stessa scheda, il primo file che esce potrebbe
 * essere il tuo e finire attaccato alla richiesta di un altro. Non si perde
 * niente — il file resta tuo e resta in libreria — ma chi aspettava riceve la
 * cosa sbagliata. Si chiuderà quando le schede sapranno dire «questo l'ho fatto
 * per quella richiesta»; per adesso è scritto qui.
 */

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { AppId, ElementoLibreria, RichiestaDaFuori } from "@daprod/ipc";
import { CHANNELS } from "@daprod/ipc";
import { appManager } from "./app-manager";
import { libreria } from "./libreria";
import { createLogger } from "./logging";
import { REMOTO_DIR } from "./paths";
import { turno, type Corsia } from "./turno";

const log = createLogger("fila");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/**
 * ⚠ **Gli id delle immagini diventano indirizzi che la scheda sa aprire.**
 * Nuovo nella 1.0.2.
 *
 * Una foto da modificare arriva dal telefono come **id** — il nome con cui il
 * gateway l'ha scritta su disco, vedi «POST /sorgente». La scheda DaProdFoto
 * quell'id non lo puo' usare: gira in una finestra, e una finestra legge
 * indirizzi, non percorsi.
 *
 * Qui l'id diventa un «daprod://file/…», che e' lo schema con cui tutte le
 * schede leggono i file del disco. Da li' in poi, per DaProdFoto, e'
 * un'immagine come un'altra: non deve sapere niente ne' della fila ne' del
 * telefono.
 *
 * ## Perche' il nome si ricontrolla, se e' gia' stato controllato
 *
 * Lo e' stato, quando la richiesta e' entrata — vedi il caso «immagine» in
 * packages/azioni/src/verifica.ts. Si ricontrolla qui perche' **questo e' il
 * punto in cui un nome diventa un percorso**, e un controllo che sta lontano
 * dal punto in cui serve e' un controllo che prima o poi qualcuno aggira
 * aprendo una strada nuova. Costa una riga.
 */
function daIdAIndirizzi(opzioni: Record<string, string>): Record<string, string> {
  const fuori: Record<string, string> = { ...opzioni };
  for (const campo of ["immagine", "maschera"]) {
    const id = (fuori[campo] ?? "").trim();
    if (!id) continue;
    if (!/^[A-Za-z0-9._-]{1,200}$/.test(id) || id.includes("..")) {
      /*
       * Non si esegue e non si indovina: si toglie. Chi ritocca senza maschera
       * lavora su tutta la foto, che e' il caso normale e non un ripiego;
       * senza foto, la scheda dira' che manca.
       */
      delete fuori[campo];
      annota("ho buttato un id di immagine che non mi piace: " + id);
      continue;
    }
    fuori[campo] = "daprod://file/" + encodeURIComponent(join(REMOTO_DIR, "invii", id));
  }
  return fuori;
}


/** Quanto si aspetta un file, prima di dire che quel lavoro non è arrivato. */
const ATTESA_FILE_MS = 45 * 60_000;

/**
 * Quanto si aspetta che un file smetta di crescere.
 *
 * Cinque minuti sono più del tempo che ci mette qualunque motore a scrivere su
 * disco quello che ha già in memoria — anche mezz'ora di video. Oltre, si
 * consegna comunque: meglio un file forse a metà che nessun file.
 */
const ATTESA_FILE_FERMO_MS = 5 * 60_000;

/** Quanto si aspetta che la finestra della scheda sia pronta a ricevere. */
const ATTESA_FINESTRA_MS = 90_000;

/** Le app che sanno eseguire un lavoro chiesto da fuori. */
const SANNO_FARLO: readonly AppId[] = ["foto", "cinema", "musica", "voce"];

/** Cosa serve sapere di una richiesta per eseguirla. */
export interface DaEseguire {
  id: string;
  app: string;
  azione: string;
  testo: string;
  opzioni: Record<string, string>;
  da: string;
  /**
   * L'id del dispositivo che l'ha chiesta.
   *
   * Non e' un doppione di `da`, che e' il nome da scrivere accanto al lavoro:
   * questo e' il padrone, e finisce accanto al file. E' quello che permette
   * alla galleria di mostrare a ognuno le sue cose - vedi `libreria.intitola`.
   */
  daId: string;
  /**
   * In che corsia sta.
   *
   * Chi sta al computer passa davanti a chi arriva da fuori: è la risposta a
   * «devo poter usare comunque il computer mentre queste persone sono
   * collegate». Non scavalca un lavoro **già partito** — quello si finisce —
   * ma non si mette nemmeno dietro a tre telefoni per generare una cosa sua.
   */
  corsia?: Corsia;
  /** Il numero del lavoro, per parlarne: «il 47». Lo dà il gateway. */
  numero?: number;
}

/** Chi ci dice com'è andata, e dove mettere il risultato. */
export interface Cablaggio {
  /** La cartella dove copiare i file pronti da scaricare. */
  cartellaRisultati: string;
  /** Segna la richiesta come in lavorazione. */
  inLavoro(id: string): void;
  /** Segna la richiesta pronta, col file. */
  consegna(id: string, file: { nome: string; percorso: string; tipo: string; bytes: number }): void;
  /** Segna la richiesta scartata, col motivo. */
  fallita(id: string, motivo: string): void;
}

let cablaggio: Cablaggio | null = null;
export const collegaEsecuzione = (c: Cablaggio): void => {
  cablaggio = c;
};

/* --------------------------------------------------------------- la fila */

const fila: DaEseguire[] = [];
let inCorso: DaEseguire | null = null;
/** Da quando gira quello in corso: serve al cronometro di chi guarda. */
let inCorsoDa = 0;
/**
 * L'id del lavoro che qualcuno ha chiesto di fermare.
 *
 * Non lo si ferma **davvero** a metà — il motore sta scrivendo, e strappargli
 * il file di mano lascerebbe mezzo video sul disco. Si dice al motore di
 * interrompere, e da qui si smette di aspettare il suo file: la richiesta
 * risulta annullata, e la fila va avanti.
 */
let daFermare = "";

/**
 * Le schede aperte **dalla fila**, non da chi sta al computer.
 *
 * È la differenza che decide se a lavoro finito si chiudono: una scheda che ha
 * aperto l'utente resta aperta — ci sta lavorando — una che ha aperto la fila
 * per eseguire la richiesta di un telefono ha finito il suo mestiere.
 */
const aperteDaNoi = new Set<AppId>();

/** Cosa sta facendo la fila adesso: lo mostra DaProdConnessione. */
export const filaInCorso = ():
  | { id: string; app: string; testo: string; numero?: number; da: number }
  | null =>
  inCorso
    ? { id: inCorso.id, app: inCorso.app, testo: inCorso.testo, numero: inCorso.numero, da: inCorsoDa }
    : null;

export const filaInAttesa = (): number => fila.length;

/**
 * Tutta la fila, in ordine di partenza: quello che sta girando e chi aspetta.
 *
 * Serve al riepilogo — sul telefono e sul pannello del PC — perché «tre in
 * attesa» non dice niente a chi vuole sapere **se la sua** è la prossima.
 */
export const filaCompleta = (): {
  id: string;
  app: string;
  testo: string;
  da: string;
  daId: string;
  corsia: Corsia;
  posto: number;
  numero?: number;
}[] => [
  ...(inCorso
    ? [
        {
          id: inCorso.id,
          app: inCorso.app,
          testo: inCorso.testo,
          da: inCorso.da,
          daId: inCorso.daId,
          corsia: inCorso.corsia ?? ("in-fila" as Corsia),
          posto: 0,
          numero: inCorso.numero,
        },
      ]
    : []),
  ...fila.map((r, i) => ({
    id: r.id,
    app: r.app,
    testo: r.testo,
    da: r.da,
    daId: r.daId,
    corsia: r.corsia ?? ("in-fila" as Corsia),
    posto: i + 1,
    numero: r.numero,
  })),
];

/**
 * Toglie dalla fila un lavoro non ancora partito.
 *
 * Quello che sta girando non si tocca: interromperlo a metà vuol dire buttare
 * via il tempo di scheda video già speso, e chi lo ha chiesto lo scoprirebbe
 * senza nemmeno un file. Torna vero se c'era ed è stato tolto.
 */
export function togliDallaFila(id: string): boolean {
  const dove = fila.findIndex((r) => r.id === id);
  if (dove < 0) return false;
  fila.splice(dove, 1);
  annota(`tolto dalla fila: ${id}`);
  return true;
}

/**
 * Ferma la generazione in corso. Torna il motivo se non si può.
 *
 * **Cosa vuol dire «fermare», qui.** Non si strappa niente di mano al motore:
 * gli si dice di interrompere (ComfyUI ha una rotta apposta) e si smette di
 * aspettare il suo file. Il lavoro risulta annullato, la fila va avanti, e se
 * il motore lascia sul disco mezzo file quello resta in libreria come qualunque
 * altra cosa — non è granché, ma è meglio che una fila bloccata su un lavoro
 * che nessuno vuole più.
 *
 * Chiesto il 26 agosto 2026: «mettiamo la possibilità da pc di annullare una
 * generazione».
 */
export async function fermaQuelloInCorso(): Promise<string | null> {
  const adesso = inCorso;
  if (!adesso) return "Non sta girando niente.";
  daFermare = adesso.id;
  annota(`fermo ${adesso.id} (${adesso.app}): chiesto da chi sta al computer`);

  /**
   * Il motore si ferma da sé, se sa come.
   *
   * ComfyUI espone `/interrupt` (ferma quello che sta calcolando) e
   * `/queue { clear: true }` (butta quello che ha in attesa). Le due insieme
   * sono l'unica cosa che libera la scheda video adesso invece che fra un
   * quarto d'ora. Se non risponde, pazienza: il lavoro risulta annullato
   * comunque e la fila non resta ferma.
   */
  await Promise.all([
    fetch("http://127.0.0.1:8188/interrupt", { method: "POST", signal: AbortSignal.timeout(4000) })
      .catch(() => {}),
    fetch("http://127.0.0.1:8188/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
      signal: AbortSignal.timeout(4000),
    }).catch(() => {}),
  ]);
  return null;
}

/** Questa app sa eseguire da sola quello che le viene chiesto? */
export const sannoFarlo = (app: string): boolean => SANNO_FARLO.includes(app as AppId);

/**
 * Mette una richiesta accettata in fila, e fa girare la fila.
 *
 * Torna subito: chi ha premuto «accetta» non deve restare ad aspettare un
 * quarto d'ora con il pulsante premuto.
 */
export function accoda(richiesta: DaEseguire): void {
  if (!sannoFarlo(richiesta.app)) {
    cablaggio?.fallita(
      richiesta.id,
      `DaProd${maiuscola(richiesta.app)} non sa ancora eseguire da sola: aprila e falla a mano.`,
    );
    return;
  }
  if (fila.some((r) => r.id === richiesta.id) || inCorso?.id === richiesta.id) return;
  fila.push(richiesta);
  annota(`in fila: ${richiesta.id} (${richiesta.app}) — ${richiesta.testo.slice(0, 60)}`);
  void giraLaFila();
}

async function giraLaFila(): Promise<void> {
  if (inCorso) return;
  const prossima = fila.shift();
  if (!prossima) return;

  inCorso = prossima;
  inCorsoDa = Date.now();
  /**
   * **Prima il turno, poi il lavoro.**
   *
   * Qui dentro si aspetta che la macchina sia libera: che non stia rispondendo
   * il modello che scrive, e che chi sta al computer non abbia messo in pausa.
   * Fino alla 0.7.5 questa attesa non c'era e le due cose partivano insieme —
   * su otto GB di scheda video vuol dire che ne falliva una.
   *
   * Il biglietto si rilascia nel `finally` di `colTurno`, sempre: anche se la
   * generazione fallisce, anche se la scheda non risponde.
   */
  let biglietto = null as Awaited<ReturnType<typeof turno.prendi>> | null;
  try {
    biglietto = await turno.prendi({
      mestiere: "generazione",
      corsia: prossima.corsia ?? "in-fila",
      che: `${maiuscola(prossima.app)}: ${prossima.testo.slice(0, 50)}`,
      chi: prossima.da,
    });
    await esegui(prossima);
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err);
    annota(`fallita ${prossima.id}: ${motivo}`);
    cablaggio?.fallita(prossima.id, motivo);
  } finally {
    turno.rilascia(biglietto);
    inCorso = null;
    inCorsoDa = 0;
    if (daFermare === prossima.id) daFermare = "";
    // La prossima parte adesso, non fra un giro di orologio.
    if (fila.length) void giraLaFila();
    else await chiudiQuelloCheAbbiamoAperto();
  }
}

/**
 * A fila vuota, le schede aperte da noi si chiudono. **E questa è la VRAM.**
 *
 * Chiesto il 23 agosto 2026, e detto «importantissimo»: «quando i programmi
 * terminano un lavoro devono anche chiudersi così da liberare la vram». Ha
 * ragione, ed è più di una comodità: chiudere una scheda spegne il suo motore
 * (`appManager.close`), e finché il motore è acceso i pesi restano nella scheda
 * video. Su otto GB vuol dire che la generazione dopo — o il modello che scrive
 * — non trova posto.
 *
 * **Solo quelle aperte dalla fila**, e **solo a fila vuota**: se chi sta al PC
 * ha aperto DaProdFoto per lavorarci, chiudergliela in faccia perché è arrivata
 * una richiesta da un telefono sarebbe peggio del problema. E se ci sono altre
 * richieste in coda per la stessa scheda, chiuderla e riaprirla vorrebbe dire
 * ricaricare i pesi due volte.
 */
async function chiudiQuelloCheAbbiamoAperto(): Promise<void> {
  if (!aperteDaNoi.size) return;
  const quali = [...aperteDaNoi];
  aperteDaNoi.clear();
  for (const app of quali) {
    try {
      annota(`chiudo ${app}: la fila ha finito, la scheda video torna libera`);
      await appManager.close(app);
    } catch (err) {
      // Una scheda che non si chiude non è un lavoro fallito: il file è già
      // consegnato. Si scrive e si va avanti.
      annota(`non sono riuscito a chiudere ${app}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/* ------------------------------------------------------------ un lavoro */

async function esegui(richiesta: DaEseguire): Promise<void> {
  const app = richiesta.app as AppId;
  cablaggio?.inLavoro(richiesta.id);

  // Da qui in poi conta il tempo: il file buono è quello che compare **dopo**.
  const da = Date.now();

  /**
   * ⚠ **Prima di aprire la scheda, si guarda se il motore c'e'.**
   *
   * Se non c'e', fallire adesso con una frase e' molto meglio che aprire una
   * scheda che non potra' mandare niente e restare ad aspettare un file per
   * tre quarti d'ora. Vedi `ilMotoreRisponde`.
   */
  if (VOGLIONO_IL_MOTORE.has(app) && !(await ilMotoreRisponde())) {
    throw new Error(
      "Il motore delle immagini non risponde. Apri la suite sul computer e " +
        "guarda la scheda: se dice che manca qualcosa, c'e' il tasto per rimetterlo a posto.",
    );
  }

  const finestra = await apriEAspetta(app);
  if (!finestra) throw new Error(`Non riesco ad aprire DaProd${maiuscola(app)}.`);

  /**
   * **Se e' una copertina, il titolo entra nel prompt qui.**
   *
   * Chiesto il 6 settembre 2026: «fai che in automatico, quando viene mandata
   * la richiesta a Flux, di aggiungere sempre una bella scritta a tema con il
   * nome della canzone». Sul computer lo fa DaProdMusica quando genera la
   * copertina insieme al brano; questa strada e' l'altra — «rifai la copertina»
   * dalla galleria — e passa da DaProdFoto, che di canzoni non sa niente.
   *
   * Si scrive **qui** e non nella scheda per la stessa ragione per cui il
   * grafo lo costruisce la scheda: DaProdFoto deve restare una scheda che fa
   * immagini, non una che sa cos'e' un album.
   */
  const perCopertina = (richiesta.opzioni["perCopertinaDi"] ?? "").trim();
  const testoDaMandare = perCopertina
    ? promptDiCopertina(richiesta.testo, richiesta.opzioni["titoloBrano"] ?? "")
    : richiesta.testo;

  const carico: RichiestaDaFuori = {
    id: richiesta.id,
    azione: richiesta.azione,
    testo: testoDaMandare,
    opzioni: daIdAIndirizzi(richiesta.opzioni),
    da: richiesta.da,
  };

  const partita = attendiRisposta(richiesta.id);
  finestra.webContents.send(CHANNELS.appRichiestaDaFuori, carico);
  const errore = await partita;
  if (errore) throw new Error(errore);

  /**
   * ⚠ **Quanti file aspettare, e non «uno».**
   *
   * Chiesto il 5 settembre 2026: «se mando due canzoni contemporaneamente non
   * funziona, ne fa solo una».
   *
   * Ed era vero, e la causa non stava nella scheda: DaProdMusica il ciclo lo
   * faceva — `quante` finisce nel campo «batch» e la scheda genera due brani
   * uno dopo l'altro. Il difetto stava **qui**: si aspettava *il* file, al
   * singolare. Appena usciva il primo, questo lavoro risultava finito, la fila
   * passava al prossimo e — quando la fila si svuota — la suite **chiude le
   * schede che ha aperto per liberare la scheda video**. Cioe' ammazzava la
   * seconda canzone mentre la stava generando.
   *
   * Quindi il difetto era una consegna incompleta che diventava una
   * generazione uccisa, ed e' il motivo per cui si vedeva come «ne fa solo
   * una» invece che come «me ne consegna una sola».
   */
  const quanti = quantiNeAspetto(richiesta);
  annota(`partita ${richiesta.id} su ${app}, aspetto ${quanti} file`);
  const usciti = await aspettaIFile(app, da, richiesta.id, quanti);
  if (daFermare === richiesta.id) {
    daFermare = "";
    throw new Error("Fermato da chi sta al computer.");
  }
  if (!usciti.length) throw new Error("Il lavoro è partito ma non ne è uscito niente.");
  const uscito = usciti[0]!;

  /**
   * Il file prende il nome di quello che era stato chiesto, e il suo padrone.
   *
   * Prima usciva `daprod_00042_.png`, e quel numero era tutto quello che si
   * leggeva in galleria e nella cartella. Adesso si chiama come il prompt, e
   * accanto c'è scritto chi l'ha chiesto: è quello che rende possibile mostrare
   * a ognuno le sue cose.
   *
   * Se il nome non si riesce a cambiare — il file è aperto da qualcun altro, il
   * disco dice di no — il lavoro non fallisce per questo: si consegna quello
   * che c'è. Un nome brutto è meglio di un lavoro perso.
   */
  /**
   * Un respiro prima di rinominare, e serve.
   *
   * La scheda scrive i suoi parametri **accanto** al file — modello, seed,
   * passi — un attimo dopo aver finito di generare. Rinominare in quel momento
   * vuol dire che quella scrittura arriva su un nome che non esiste piu' e si
   * perde in silenzio: il file resta, i parametri no. Due secondi bastano, e
   * `intitola` tiene quello che trova invece di sovrascriverlo.
   */
  await pausa(2000);

  /**
   * Come si chiama la cosa che è appena uscita.
   *
   * Di regola: **quello che è stato chiesto**, cioè il campo principale
   * dell'azione — il prompt di un'immagine, la scena di un video.
   *
   * Per un brano no, e dalla 0.8.0 c'è il campo giusto: il campo principale di
   * `genera.brano` sono **i generi** («neapolitan neomelodic pop, melodic
   * trap»), che come nome di una canzone non dice niente a nessuno. Se chi ha
   * chiesto le ha dato un nome, si chiama così.
   */
  const comeSiChiama = (richiesta.opzioni["titolo"] ?? "").trim() || richiesta.testo;

  let battezzato = uscito;
  try {
    battezzato =
      (await libreria.intitola(uscito.id, {
        titolo: comeSiChiama,
        chi: richiesta.daId,
        chiNome: richiesta.da,
        /**
         * **Cosa era stato chiesto, campo per campo.** Dalla 0.9.1.
         *
         * Chiesto il 5 settembre 2026: «mettiamo insieme al contenuto il prompt
         * usato, cosi' quando pubblichiamo sappiamo come e' stato fatto il
         * contenuto». Le opzioni della richiesta ci sono gia' — sono quelle con
         * cui la scheda ha generato — e finora si perdevano appena il lavoro
         * finiva.
         *
         * Ci va anche `testo`, che e' il campo principale: per un'immagine e'
         * il prompt, per un brano sono i generi.
         */
        extra: {
          richiesta: richiesta.id,
          azione: richiesta.azione,
          ...richiesta.opzioni,
          prompt: richiesta.opzioni["prompt"] ?? richiesta.testo,
        },
      })) ?? uscito;
  } catch (err) {
    // **Un nome non e' un lavoro.** Qui dentro si consegna quello che il motore
    // ha prodotto: se dargli un nome non riesce si scrive perche' e si va
    // avanti con quello che c'e'. Prima questa riga poteva far risultare
    // fallita una generazione riuscita, ed e' successo davvero.
    annota(`non sono riuscito a rinominare ${uscito.id}: ${err instanceof Error ? err.message : String(err)}`);
  }

  /**
   * **Una copertina non e' un risultato: e' la faccia di un brano.**
   *
   * Non si consegna e non si mostra come immagine — chi ha premuto «rifai la
   * copertina» non voleva una foto in galleria, voleva che quel brano avesse
   * un'altra faccia. Si attacca al brano e l'immagine si butta: lasciarla
   * vorrebbe dire una copia in galleria per ogni tentativo.
   */
  if (perCopertina) {
    const fatta = await attaccaLaCopertina(perCopertina, battezzato);
    // Si consegna comunque il file: chi ha chiesto vede il lavoro «pronto» e,
    // se l'aggancio non e' riuscito, ha almeno l'immagine in mano.
    cablaggio?.consegna(richiesta.id, await portaNeiRisultati(battezzato));
    if (fatta) {
      // Attaccata: la copia in galleria non serve piu' e sarebbe una foto in
      // piu' per ogni tentativo. Il `.cover.jpg` accanto al brano resta.
      try { libreria.elimina(battezzato.id); } catch { /* resta in galleria: pazienza */ }
      annota(`copertina rifatta per ${perCopertina}`);
    } else {
      annota(`la copertina di ${perCopertina} non si e' attaccata: resta in galleria`);
    }
    return;
  }

  const copiato = await portaNeiRisultati(battezzato);
  cablaggio?.consegna(richiesta.id, copiato);
  annota(`pronta ${richiesta.id}: ${copiato.nome}`);

  /**
   * **Gli altri file dello stesso lavoro.**
   *
   * Il primo e' «il risultato» — quello che si scarica dalla notifica — e gli
   * altri prendono nome e padrone come lui, cosi' in galleria compaiono tutti e
   * quattro con il titolo giusto invece che come `daprod_00042_.png`.
   */
  for (let i = 1; i < usciti.length; i++) {
    const altro = usciti[i]!;
    try {
      await libreria.intitola(altro.id, {
        titolo: comeSiChiama,
        chi: richiesta.daId,
        chiNome: richiesta.da,
        extra: {
          richiesta: richiesta.id,
          azione: richiesta.azione,
          ...richiesta.opzioni,
          prompt: richiesta.opzioni["prompt"] ?? richiesta.testo,
        },
      });
    } catch (err) {
      annota(`il numero ${i + 1} di ${richiesta.id} resta senza nome: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (usciti.length > 1) annota(`e con lei altre ${usciti.length - 1} in galleria`);
}

/**
 * Quanti file deve produrre questo lavoro.
 *
 * `quante` esiste per le immagini da sempre e per i brani dalla 0.9.1. Il tetto
 * a quattro e' quello del catalogo: qui non ci si fida di quello che arriva da
 * fuori, si rilegge.
 */
function quantiNeAspetto(richiesta: DaEseguire): number {
  const detto = Number(richiesta.opzioni["quante"]);
  if (!Number.isFinite(detto)) return 1;
  return Math.max(1, Math.min(4, Math.round(detto)));
}

/**
 * Il prompt di una copertina, con il titolo scritto sopra.
 *
 * Le virgolette non sono decorazione: sono il modo in cui FLUX capisce dove
 * finisce la descrizione e comincia il testo da disegnare. Senza, il titolo si
 * scioglie nella scena e il modello disegna qualcosa *a proposito* di quelle
 * parole invece delle parole.
 *
 * ⚠ Fino alla 0.9.2 i prompt di copertina finivano con `no text`, e non era una
 * svista: era giusto per Anima e per SD, che a scrivere fanno scarabocchi.
 * FLUX.2 Klein — di serie per le copertine dalla 0.9.1 — le lettere le sa fare.
 */
function promptDiCopertina(idea: string, titolo: string): string {
  const pulito = titolo.replace(/["\u00ab\u00bb\u201c\u201d]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  const pezzi = ["album cover artwork", idea.trim(), "square composition"];
  if (pulito) {
    pezzi.push(`with the title text "${pulito}" written across the artwork in a lettering style that matches the mood`);
  }
  return pezzi.filter(Boolean).join(", ");
}

/**
 * Attacca un'immagine appena generata come copertina di un brano.
 *
 * Passa da `impostaCopertina`, che e' la stessa strada di DaProdMusica: scrive
 * il `.cover.jpg` accanto al brano e, se FFmpeg c'e', la cuce anche dentro
 * l'mp3. Un posto solo per una cosa sola.
 */
async function attaccaLaCopertina(idBrano: string, immagine: ElementoLibreria): Promise<boolean> {
  try {
    const dati = await readFile(immagine.percorso);
    const tipo = extname(immagine.percorso).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    return libreria.impostaCopertina(idBrano, `data:${tipo};base64,${dati.toString("base64")}`);
  } catch (err) {
    annota(`non sono riuscito ad attaccare la copertina: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Apre la scheda e aspetta che la sua pagina sia viva.
 *
 * `appManager.open` torna quando la finestra esiste, non quando la pagina ha
 * finito di caricarsi — e una `send` a una pagina che non ha ancora agganciato
 * i suoi ascoltatori si perde nel nulla, in silenzio. Questa è la differenza
 * fra «la prima richiesta dopo l'avvio non parte mai» e «parte».
 */
async function apriEAspetta(app: AppId): Promise<Electron.BrowserWindow | null> {
  // Chi c'era prima di noi resta: si segna solo quello che apriamo noi, ed è
  // quello che a fila finita si richiude per liberare la scheda video.
  const giaAperta = appManager.laFinestra(app) !== null;
  await appManager.open(app);
  if (!giaAperta) aperteDaNoi.add(app);

  const scaduta = Date.now() + ATTESA_FINESTRA_MS;
  for (;;) {
    const finestra = appManager.laFinestra(app);
    if (finestra && !finestra.isDestroyed() && !finestra.webContents.isLoading()) {
      // Un respiro perché i moduli della pagina finiscano di agganciarsi: il
      // caricamento è finito, ma `avvio.js` gira subito dopo.
      await pausa(600);
      return finestra;
    }
    if (Date.now() > scaduta) return null;
    await pausa(250);
  }
}

/** La risposta della scheda: stringa vuota se è partita, il motivo se no. */
const inAttesaDiRisposta = new Map<string, (errore: string) => void>();

export function rispostaDallaScheda(id: string, errore?: string): void {
  inAttesaDiRisposta.get(id)?.(errore ?? "");
}

function attendiRisposta(id: string): Promise<string> {
  return new Promise((risolvi) => {
    const scadenza = setTimeout(() => {
      inAttesaDiRisposta.delete(id);
      risolvi("La scheda non ha risposto: forse è una versione che non sa ancora ricevere lavori.");
    }, 60_000);
    inAttesaDiRisposta.set(id, (errore) => {
      clearTimeout(scadenza);
      inAttesaDiRisposta.delete(id);
      risolvi(errore);
    });
  });
}

/**
 * Il primo file nuovo di quell'app dopo il momento `da`, **finito di scrivere**.
 *
 * Si guarda la libreria e basta: è già l'elenco di tutto quello che esce, e
 * poiché si lavora una richiesta per volta il primo elemento nuovo è quello
 * giusto. Vedi il commento in cima al file per il caso che resta aperto.
 *
 * **Perché non basta che il file esista**, detto da chi l'ha visto: «a volte i
 * video non li manda correttamente». Ed era vero, e questo è il motivo. Un file
 * compare nella cartella **appena il motore comincia a scriverlo**: per
 * un'immagine da un mega la differenza fra «c'è» e «è finito» è un istante e
 * non si nota mai, per un video da cento è mezzo minuto. In quel mezzo minuto
 * la fila copiava un file a metà e lo dichiarava pronto — e chi aspettava
 * scaricava un video che non si apre.
 *
 * Adesso si aspetta che **smetta di crescere**: due letture di fila con la
 * stessa dimensione, e non zero. Costa qualche secondo in più e toglie di mezzo
 * una consegna sbagliata su tre.
 */
/**
 * ⚠ **Il motore c'e'?** Nuovo nella 0.9.8.
 *
 * Chiesto il 6 settembre 2026: «fai attenzione che non mi genera piu', le cose
 * vanno in coda ma non genera».
 *
 * Non era la fila. Guardando i registri: il lavoro **partiva**, la scheda si
 * apriva, e poi non usciva niente — e nel registro del motore non c'era
 * nessuna richiesta arrivata. ComfyUI non era acceso: si era chiuso con un
 * `ConnectionResetError` e non era piu' tornato su.
 *
 * Quello che rendeva la cosa incomprensibile non era il motore spento — quello
 * capita — era il **silenzio**. La scheda, non riuscendo a mandare il grafo,
 * scriveva l'errore **sulla propria pagina**, che nessuno stava guardando; e la
 * fila restava li' ad aspettare un file per **quarantacinque minuti**. Da
 * fuori: «va in coda e non genera», senza una riga da nessuna parte.
 *
 * Adesso, prima di dare un lavoro a una scheda, si bussa al motore. Se non
 * risponde il lavoro fallisce **subito**, con scritto perche' — e chi ha
 * chiesto lo legge sul telefono invece di aspettare tre quarti d'ora.
 *
 * Le schede che il motore non lo usano (il modello che scrive) non passano di
 * qui: si guarda solo per quelle che generano.
 */
async function ilMotoreRisponde(): Promise<boolean> {
  try {
    const risposta = await fetch("http://127.0.0.1:8188/system_stats", {
      signal: AbortSignal.timeout(4000),
    });
    return risposta.ok;
  } catch {
    return false;
  }
}

/** Le schede che per lavorare hanno bisogno del motore acceso. */
const VOGLIONO_IL_MOTORE = new Set<string>(["foto", "musica", "cinema", "voce", "dream"]);

async function aspettaIFile(
  app: AppId,
  da: number,
  id: string,
  quanti: number,
): Promise<ElementoLibreria[]> {
  const scaduta = da + ATTESA_FILE_MS;
  const presi: ElementoLibreria[] = [];
  const visti = new Set<string>();
  /**
   * Quanto si aspetta un compagno dopo che il primo e' arrivato.
   *
   * ⚠ Serve un tetto a parte, e piu' corto di quello grande: se la scheda ne
   * genera due e il secondo fallisce, senza questo si starebbe fermi
   * quarantacinque minuti prima di consegnare il primo — cioe' si perderebbe
   * anche quello che era riuscito. Dieci minuti bastano a una canzone e a
   * un'immagine; oltre, si consegna quello che c'e'.
   */
  const ATTESA_COMPAGNO_MS = 10 * 60_000;
  let ultimoArrivo = Date.now();
  /** Quando si e' guardato l'ultima volta se il motore c'e' ancora. */
  let ultimoControllo = Date.now();

  while (Date.now() < scaduta) {
    await pausa(3000);
    // Qualcuno ha detto basta: si smette di aspettare, e il lavoro risulta
    // annullato invece che fallito. Sono due cose diverse e chi guarda lo vede.
    if (daFermare === id) return presi;

    const nuovi = libreria
      .cerca({ app })
      .filter((e) => e.creato > da && !visti.has(e.id))
      .sort((a, b) => a.creato - b.creato);

    for (const candidato of nuovi) {
      const fermo = await aspettaCheSiaFermo(candidato.percorso);
      // Ha smesso di esistere mentre lo guardavamo — capita con i file
      // temporanei di certi motori: si riparte dal giro dopo.
      if (!fermo) continue;
      visti.add(candidato.id);
      presi.push(libreria.trova(candidato.id) ?? candidato);
      ultimoArrivo = Date.now();
      if (presi.length >= quanti) return presi;
    }

    /**
     * ⚠ **Se il motore se ne va mentre aspettiamo, si smette di aspettare.**
     *
     * Un motore che muore a meta' generazione non produce piu' niente, e
     * restare li' fino allo scadere dei quarantacinque minuti vuol dire una
     * fila ferma per tre quarti d'ora senza una parola. Si guarda ogni mezzo
     * minuto — non a ogni giro, che sarebbe una chiamata ogni tre secondi per
     * niente.
     */
    if (!presi.length && Date.now() - da > 45_000 && Date.now() - ultimoControllo > 30_000) {
      ultimoControllo = Date.now();
      if (!(await ilMotoreRisponde())) {
        annota(`${id}: il motore non risponde piu', smetto di aspettare`);
        throw new Error("Il motore si e' fermato mentre generava. Riprova, e se ricapita riavvia la suite.");
      }
    }

    if (presi.length && Date.now() - ultimoArrivo > ATTESA_COMPAGNO_MS) {
      annota(`ne aspettavo ${quanti}, ne sono arrivati ${presi.length}: consegno questi`);
      return presi;
    }
  }
  return presi;
}

/**
 * Aspetta che un file smetta di crescere.
 *
 * Non c'è un modo pulito di chiedere a Windows «questo lo sta ancora scrivendo
 * qualcuno?» che valga per tutti i motori: si guarda la dimensione, che è la
 * cosa che cambia mentre scrivono. Due letture uguali a un secondo e mezzo di
 * distanza, e non zero, vogliono dire finito.
 */
async function aspettaCheSiaFermo(percorso: string): Promise<boolean> {
  let prima = -1;
  const scaduta = Date.now() + ATTESA_FILE_FERMO_MS;
  while (Date.now() < scaduta) {
    let adesso: number;
    try {
      adesso = statSync(percorso).size;
    } catch {
      return false;
    }
    if (adesso > 0 && adesso === prima) return true;
    prima = adesso;
    await pausa(1500);
  }
  // Scaduto il tempo si consegna lo stesso: un file che cresce da cinque minuti
  // è un motore che scrive piano, non un file rotto.
  return true;
}

/**
 * Copia il file nella cartella dei risultati da scaricare.
 *
 * Una copia e non il file vero: quella cartella è l'unica che il gateway serve
 * a chi arriva da fuori, e il resto della libreria non deve poterci finire
 * dentro per sbaglio con un nome ben scelto.
 */
async function portaNeiRisultati(
  elemento: ElementoLibreria,
): Promise<{ nome: string; percorso: string; tipo: string; bytes: number }> {
  const dove = cablaggio?.cartellaRisultati;
  if (!dove) throw new Error("Non so dove mettere il risultato.");
  await mkdir(dove, { recursive: true });

  /**
   * Il nome della copia: **leggibile davanti, unico in fondo.**
   *
   * Deve essere unico dentro quella cartella — due richieste con lo stesso
   * prompt sono due file diversi — e non deve contenere percorsi, perché quello
   * che arriva dalla libreria è un id con le barre dentro. Ma deve anche
   * arrivare così com'è sul telefono di chi scarica: `daprod_00042_.png` non
   * dice niente, `un faro sulla scogliera-lq3f8.png` sì.
   */
  const coda = extname(elemento.percorso) || ".bin";
  const senzaCoda = basename(elemento.percorso, coda).replace(/[/\\]/g, "-");
  const nome = `${senzaCoda.slice(0, 70)}-${Date.now().toString(36)}${coda}`;
  await copyFile(elemento.percorso, join(dove, nome));

  return {
    nome,
    percorso: nome,
    bytes: elemento.bytes,
    tipo: mimeDi(coda, elemento.tipo),
  };
}

function mimeDi(coda: string, tipo: string): string {
  const noti: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
  };
  if (noti[coda.toLowerCase()]) return noti[coda.toLowerCase()]!;
  if (tipo === "immagine") return "image/*";
  if (tipo === "video") return "video/*";
  if (tipo === "audio") return "audio/*";
  return "application/octet-stream";
}

const pausa = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const maiuscola = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
