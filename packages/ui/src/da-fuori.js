/**
 * Un lavoro chiesto da fuori, eseguito dalla scheda che lo sa fare.
 *
 * **Il difetto che questo file cura**, detto da chi l'ha visto: «quando accetto
 * un lavoro non funziona». Ed era vero. Accettare cambiava una parola in un
 * elenco — da «in attesa» a «accettata» — e poi non succedeva niente: chi stava
 * al PC doveva aprire la scheda, ricopiare quello che era stato chiesto e
 * premere Genera. Da fuori sembrava un programma rotto, e a ragione.
 *
 * **La scelta che rende tutto corto.** Qui non si genera niente: si **riempie
 * il modulo della scheda e si preme il suo tasto**. Sarebbe stato più diretto
 * costruire il grafo e mandarlo al motore, e sarebbe stata la seconda strada
 * per fare la stessa cosa — la prima a divergere, il giorno che la scheda
 * impara un modello nuovo. Così invece è lo stesso codice, gli stessi
 * controlli, gli stessi errori: se la generazione funziona quando premi tu,
 * funziona anche quando preme il telefono.
 *
 * Ogni scheda ci mette dieci righe: quali caselle riempire, e quale tasto
 * premere. Il resto — la fila, l'apertura della finestra, il riconoscimento del
 * file che esce — lo fa lo shell (`apps/shell/src/main/esecuzione.ts`).
 */

const suite = window.daprodSuite;

/**
 * Aggancia la scheda ai lavori che arrivano da fuori.
 *
 * `riempi(richiesta)` deve mettere quello che è stato chiesto nelle caselle e
 * far partire la generazione. Se non si può — il modello non è scaricato, non
 * c'è la scheda video — sollevi un errore con dentro **il motivo scritto per
 * una persona**: quel testo arriva fino al telefono di chi aveva chiesto.
 */
export function collegaLavoriDaFuori(riempi) {
  if (!suite?.onRichiestaDaFuori) return;

  suite.onRichiestaDaFuori(async (richiesta) => {
    try {
      await riempi(richiesta);
      await suite.richiestaPartita(richiesta.id);
    } catch (e) {
      // Il motivo torna indietro invece di restare in una console che nessuno
      // guarda: chi ha chiesto legge perché non si è fatto.
      await suite.richiestaPartita(richiesta.id, String(e?.message || e));
    }
  });
}

/**
 * Preme un tasto, ma solo se è premibile.
 *
 * Un tasto «Genera» spento vuol dire qualcosa di preciso — il modello non c'è,
 * il motore non risponde — e cliccarlo lo stesso non produce niente **e non
 * dice niente**: la richiesta resterebbe in lavorazione fino a scadere. Meglio
 * fermarsi subito con il motivo.
 */
export function premi(bottone, perche) {
  if (!bottone) throw new Error("Questa scheda non sa ancora eseguire da sola.");
  if (bottone.disabled) throw new Error(perche || "La scheda non è pronta a generare adesso.");
  bottone.click();
}

/** Un numero che sta fra due estremi, o il valore di prima se non è un numero. */
export function numero(valore, minimo, massimo, difetto) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return difetto;
  return Math.max(minimo, Math.min(massimo, Math.round(n)));
}

/**
 * Sceglie una voce in un menu a tendina, se quella voce c'è.
 *
 * **Perché serve.** Dalla 0.7.2 chi chiede da fuori può dire con che modello
 * vuole che si faccia: «fammi un'immagine con FLUX.2 Klein 9B». L'elenco delle
 * scelte sta in `packages/azioni`, e gli id sono gli stessi che la scheda ha
 * nel suo menu — quindi qui basta metterci quello che è arrivato.
 *
 * Un id che il menu non conosce si ignora invece di far fallire il lavoro: fra
 * generare con il modello scelto adesso e non generare, la prima è meglio.
 * Vuoto vuol dire proprio «quello che c'è adesso», ed è il caso normale.
 */
export function scegliInMenu(menu, id) {
  if (!menu || !id) return false;
  const esiste = [...menu.options].some((o) => o.value === id);
  if (!esiste) return false;
  if (menu.value === id) return true;
  menu.value = id;
  menu.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/**
 * Aspetta che un tasto torni premibile, al massimo `ms`.
 *
 * Cambiare modello non è istantaneo: la scheda va a chiedere alla suite se
 * quei pesi sono sul disco, e finché non lo sa tiene Genera spento. Senza
 * questa attesa, un lavoro che sceglie il modello fallirebbe **sempre** con
 * «la scheda non è pronta», e la ragione sarebbe che non le abbiamo dato il
 * tempo di guardare.
 *
 * Se allo scadere è ancora spento non si solleva niente: sarà `premi` a dire
 * perché, con le sue parole, che arrivano fino a chi ha chiesto.
 */
export async function aspettaPremibile(bottone, ms = 10000) {
  if (!bottone) return;
  const fine = Date.now() + ms;
  while (bottone.disabled && Date.now() < fine) {
    await new Promise((r) => setTimeout(r, 200));
  }
}

/** Scrive in una casella **e lo dice**: certe pagine reagiscono solo all'evento. */
export function scrivi(campo, testo) {
  if (!campo) return;
  campo.value = testo;
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.dispatchEvent(new Event("change", { bubbles: true }));
}
