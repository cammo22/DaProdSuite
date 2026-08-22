/**
 * Gli elementi della pagina e i pochi aiuti che servono a tutti.
 *
 * Come in DaProdFoto e DaProdMusica: gli id si raccolgono una volta sola in
 * `el`, perché un nome sbagliato si scopra all'avvio e non quando l'utente
 * clicca proprio quel bottone.
 */

export const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  // in alto
  "dot", "statusTxt", "mods",
  // il modello, che sta sopra tutto perché decide tutto quello che c'è sotto
  "modello", "rigaModello", "avvisoModello",
  // cosa vuoi vedere
  "proposte", "prompt", "estetica", "genera", "errore",
  // da dove parte / i riferimenti
  "titoloIngressi", "ingressi",
  // la resa
  "durata", "durataVal", "notaDurata", "quante", "misura", "formati", "risoluzioni",
  "voceModi", "rigaModi", "modiPassi",
  "toggleAdv", "avanzati", "passi", "passiVal", "notaPassi",
  "seed", "dado", "seedCasuale", "negativo", "notaNegativo",
  // cosa sta succedendo
  "sessione", "stop", "svuota",
  // la storia: il soggetto, la sua resa (che non e' quella di Crea), i
  // riferimenti, chi scrive, e l'elenco delle inquadrature
  "navStoria", "storiaSoggetto", "storiaMinuti", "storiaSecondi", "storiaConto", "storiaAuto",
  "storiaModello", "storiaRigaModello", "storiaAvvisoModello",
  "storiaVoceModi", "storiaModi", "storiaRigaModi",
  "storiaFormati", "storiaRisoluzioni", "storiaMisura",
  "storiaRifAggiungi", "storiaRifFile", "storiaRifElenco", "storiaRifRiga",
  "storiaLlm", "storiaScrivi", "storiaPensiero", "storiaStato",
  "storiaElenco", "storiaFatte", "storiaBarra", "storiaAvanti",
  "storiaGenera", "storiaFerma", "storiaCuci", "storiaAzzera", "storiaFilm", "storiaFilmVideo",
  // la galleria, e il video a schermo intero
  "navGal", "galleria", "conteggio", "aggiorna",
  "lente", "lenteVideo", "lenteInfo", "lenteChiudi",
]) {
  el[chiave] = $(chiave);
}

/**
 * Le schede: Crea e Galleria.
 *
 * Le stesse due righe di DaProdFoto. `suApertura` serve a chi deve rileggere
 * qualcosa quando la sua scheda torna in vista: la galleria si ricarica quando
 * la si apre, non ogni secondo mentre si guarda altro.
 */
const allApertura = new Map();
export const suApertura = (scheda, azione) => allApertura.set(scheda, azione);

export function mostraScheda(nome) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.id === `scheda-${nome}`));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.scheda === nome));
  allApertura.get(nome)?.();
  window.scrollTo({ top: 0 });
}

export const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const rnd = () => Math.floor(Math.random() * 2 ** 31);

/** `92.4` diventa `1:32`. */
export const minuti = (s) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

/** `95` diventa `1:35`, ma sotto il minuto resta in secondi: è più leggibile. */
export const durata = (s) => (s < 60 ? `${Math.round(s)}s` : minuti(s));

/**
 * Il tasto si spegne e racconta cosa sta facendo.
 *
 * Fra il clic su «Genera» e il lavoro che parte davvero possono passare
 * parecchi secondi — svuotare la scheda video, caricare tre riferimenti da 20 MB
 * — e un tasto che in quei secondi non dice niente sembra un tasto rotto. Chi
 * ripreme non recupera un clic perso: mette in coda una seconda clip da dieci
 * minuti.
 */
export function occupa(bottone, testo) {
  bottone.disabled = true;
  bottone.dataset.prima = bottone.dataset.prima || bottone.textContent;
  bottone.textContent = testo;
}

/** Lo rimette com'era. `spento` per i casi in cui non deve tornare premibile. */
export function libera(bottone, spento = false) {
  bottone.disabled = spento;
  if (bottone.dataset.prima) bottone.textContent = bottone.dataset.prima;
}

export function mostraErrore(testo) {
  el.errore.style.display = "block";
  el.errore.textContent = testo;
}

export function nascondiErrore() {
  el.errore.style.display = "none";
}

/**
 * Scrive nel punto in cui sta il cursore, invece che in fondo.
 *
 * Serve alle etichette dei riferimenti (`<Picture 1>`): uno scrive la frase, si
 * ferma dove va il riferimento e clicca l'etichetta. Attaccarla in fondo
 * vorrebbe dire riscrivere la frase ogni volta.
 */
export function inserisciAlCursore(campo, testo) {
  const da = campo.selectionStart ?? campo.value.length;
  const a = campo.selectionEnd ?? campo.value.length;
  campo.value = campo.value.slice(0, da) + testo + campo.value.slice(a);
  const dopo = da + testo.length;
  campo.focus();
  campo.setSelectionRange(dopo, dopo);
  campo.dispatchEvent(new Event("input"));
}
