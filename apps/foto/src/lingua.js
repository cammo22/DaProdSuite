/**
 * Scrivere in italiano a un modello che capisce solo l'inglese.
 *
 * **Non a tutti serve.** Anima è addestrata su didascalie inglesi: una
 * descrizione in italiano non dà errore, dà un'immagine che non c'entra niente —
 * il difetto che si vedeva come "genera quello che vuole". FLUX.2 invece legge
 * il prompt con un Qwen3, che l'italiano lo capisce, e tradurre prima è solo un
 * passaggio in più che può andare storto. Lo dice il modello, con `traduce`.
 *
 * **Chi traduce non è un LLM e non è LM Studio.** È un modello che sa fare una
 * cosa sola — Marian `opus-mt-it-en`, 74 milioni di parametri, 330 MB — e gira
 * dentro al motore, sul computer, senza chiedere niente a nessuno. Lo si vede
 * fra i quadratini in alto a destra, come tutti gli altri, e lo si può scaricare
 * dalla memoria cliccandoci sopra.
 *
 * **Perché c'è una barra.** La traduzione dura un secondo, ma la *prima* della
 * sessione ne dura anche quindici: prima di tradurre il motore deve svegliare le
 * sue librerie e leggere 330 MB dal disco.
 * Prima si vedeva solo «Traduco…», fermo, e non c'era modo di distinguere «sta
 * caricando» da «si è piantato» — e ogni tanto si era piantato davvero. Adesso
 * si vede a che punto è, e se il motore non risponde entro due minuti si manda
 * l'originale invece di restare lì.
 *
 * L'interruttore è **uno**, in cima accanto al modello, e vale per Crea e per
 * Ritocco: erano due caselle da tenere allineate a mano, ed è esattamente il
 * genere di cosa che prima o poi si disallinea.
 */

import { el, escapeHtml } from "./dom.js";
import { statoTraduttore, traduci } from "./ponte.js";

const CHIAVE = "daprod.foto.traduci";

/** Acceso finché non lo spegni: chi scrive in inglese lo spegne una volta sola. */
export const traduzioneAttiva = () => localStorage.getItem(CHIAVE) !== "no";

export function collegaTraduzione() {
  el.traduci.checked = traduzioneAttiva();
  el.traduci.addEventListener("change", () => {
    localStorage.setItem(CHIAVE, el.traduci.checked ? "si" : "no");
    el.tradotto.hidden = true;
  });
}

/**
 * Mostra o nasconde l'interruttore a seconda del modello scelto.
 *
 * Nascosto e non spento: la scelta dell'utente resta quella che era, e torna
 * com'era se rimette un modello che l'inglese lo pretende.
 */
export function traduzionePerModello(modello) {
  el.rigaTraduci.hidden = !modello.traduce;
  if (!modello.traduce) el.tradotto.hidden = true;
}

/* --------------------------------------------------------------- la barra */

/** Una riga di testo nel riquadro, senza barra. */
function dillo(testo, guasto = false) {
  el.tradotto.hidden = false;
  el.tradotto.textContent = testo;
  el.tradotto.classList.toggle("guasto", guasto);
}

/**
 * Il riquadro con la barra: cosa sta facendo, e quanto manca.
 *
 * `quota` a `null` vuol dire che non si sa quanto manca — leggere 330 MB dal
 * disco non ha una percentuale — e la barra lo dice muovendosi avanti e
 * indietro invece di inventarsi un numero.
 */
function disegnaAvanzamento(detto, quota, secondi) {
  el.tradotto.hidden = false;
  el.tradotto.classList.remove("guasto");
  el.tradotto.innerHTML = `
    <div class="detto">${escapeHtml(detto)}${
      secondi >= 3 ? ` <b>${secondi.toFixed(0)} s</b>` : ""
    }</div>
    <div class="bar"><i class="p1${quota === null ? " scorre" : ""}"${
      quota === null ? "" : ` style="width:${(quota * 100).toFixed(1)}%"`
    }></i></div>`;
}

const COSA_STA_FACENDO = {
  carico: "Preparo il traduttore — la prima volta ci mette qualche secondo",
  traduco: "Traduco in inglese",
  fermo: "Aspetto il traduttore",
};

/**
 * Guarda il motore mentre lavora e disegna la barra. Torna come si spegne.
 *
 * Quattro volte al secondo: la traduzione di una frase dura un secondo o due, e
 * con un colpo d'occhio ogni mezzo secondo la barra si muoverebbe a scatti.
 */
function seguiTraduzione() {
  const inizio = performance.now();
  let finito = false;
  disegnaAvanzamento(COSA_STA_FACENDO.fermo, null, 0);

  const timer = setInterval(async () => {
    const stato = await statoTraduttore();
    // La risposta può arrivare **dopo** che la traduzione è finita: senza questa
    // riga l'ultimo colpo d'occhio riscriveva il riquadro sopra il risultato, e
    // restava lì "aspetto il traduttore" con la barra che correva a vuoto.
    if (finito) return;
    const secondi = (performance.now() - inizio) / 1000;
    if (!stato) {
      // Il motore non risponde nemmeno a questa: si continua a dire che stiamo
      // aspettando, e il tempo massimo della richiesta farà il resto.
      disegnaAvanzamento(COSA_STA_FACENDO.fermo, null, secondi);
      return;
    }
    const detto = COSA_STA_FACENDO[stato.fase] ?? COSA_STA_FACENDO.fermo;
    disegnaAvanzamento(detto, stato.fase === "traduco" ? (stato.quota ?? 0) : null, secondi);
  }, 250);

  return () => {
    finito = true;
    clearInterval(timer);
  };
}

/**
 * Il testo da mandare al modello, tradotto se serve.
 *
 * Racconta sempre cosa è stato mandato davvero: se la traduzione sbaglia una
 * parola, lo si vede subito invece di dare la colpa al modello.
 */
export async function inInglese(testo, modello) {
  if (!modello.traduce || !traduzioneAttiva()) {
    el.tradotto.hidden = true;
    return testo;
  }

  const smettiDiSeguire = seguiTraduzione();
  let esito;
  try {
    esito = await traduci(testo);
  } finally {
    smettiDiSeguire();
  }

  if (esito.tradotta && esito.tradotto !== testo) {
    dillo(`Mandato al modello: ${esito.tradotto}`);
  } else if (esito.tradotta) {
    el.tradotto.hidden = true;
  } else {
    dillo(`Mandato così com'era — ${esito.motivo ?? "traduttore non disponibile"}`, true);
  }

  return esito.tradotto || testo;
}
