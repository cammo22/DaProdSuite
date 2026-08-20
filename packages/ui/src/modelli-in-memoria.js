/**
 * I quadratini in alto a destra: cosa sta occupando la memoria adesso.
 *
 * Con 8 GB non è un dettaglio tecnico ma una cosa che serve mentre lavori: il
 * modello del testo e quello delle immagini insieme non ci stanno, e quando la
 * generazione rallenta è quasi sempre perché il motore li sta scambiando. Passi
 * sopra un quadratino e vedi quanti MB si prende, ci clicchi e lo scarichi.
 *
 * **Era in due copie identiche**, una in DaProdFoto e una in DaProdMusica, con
 * scritto in tutte e due che sarebbe diventato un pezzo della suite. È diventato
 * questo quando è arrivato un modello nuovo da mostrare — il traduttore — e
 * aggiungerlo avrebbe voluto dire scrivere la stessa riga due volte, cioè
 * scriverla una volta e dimenticarsene l'altra.
 *
 * **Non conosce il motore**: chi lo usa gli passa come si chiede l'elenco e come
 * si scarica qualcosa, che sono già cose che ogni app ha nel suo ponte.
 */

/**
 * Come si chiamano, in italiano, le cose che il motore nomina in gergo.
 *
 * `MiniMaxMusic3TEModel` è giusto e non serve a niente: chi guarda vuole sapere
 * che quei 5,5 GB sono il modello che legge il testo di una canzone. Quello che
 * non conosciamo si mostra com'è — meglio un nome tecnico che un quadratino
 * senza spiegazione.
 */
const ETICHETTE = {
  MiniMaxMusic3TEModel: { sigla: "T", nome: "Testo canzone", classe: "m-testo" },
  MiniMaxMusic3: { sigla: "M", nome: "Musica", classe: "m-musica" },
  Anima: { sigla: "I", nome: "Immagini", classe: "m-immagini" },
  WanVAE: { sigla: "V", nome: "VAE immagini", classe: "m-vae" },
  MiniMaxMusic3DAV: { sigla: "A", nome: "VAE audio", classe: "m-vae" },
  // Sta nella RAM e non lo carica il motore, quindi fino alla 0.3.3 non compariva
  // qui: in cima all'app c'erano tutti i modelli tranne quello che ti stava
  // facendo aspettare davanti a «traduco…».
  Traduttore: { sigla: "IT", nome: "Traduttore italiano→inglese", classe: "m-lingua" },
};

const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Dove sta, e quanto pesa: la RAM e la VRAM non sono la stessa cosa e non si confondono. */
function quanto(m) {
  if (m.dispositivo === "cpu") return `${m.totaleMb ?? m.vramMb} MB in RAM`;
  return `${m.vramMb} MB in VRAM`;
}

/**
 * Disegna i quadratini dentro `contenitore` e li tiene aggiornati.
 *
 * `elenco()` torna cosa c'è in memoria, `scarica(nome)` ne toglie uno. Torna
 * `{ aggiorna }`, per chi vuole rinfrescarli subito dopo aver fatto qualcosa.
 */
export function collegaModelliInMemoria(contenitore, { elenco, scarica, ogniMs = 3000 }) {
  async function aggiorna() {
    const caricati = (await elenco()) || [];

    const html = caricati
      .map((m) => {
        const info = ETICHETTE[m.nome] || {
          sigla: (m.nome || "?")[0].toUpperCase(),
          nome: m.nome,
          classe: "m-vae",
        };
        const detto =
          m.stato === "carico"
            ? `${info.nome} — lo sto caricando…`
            : `${info.nome} — ${quanto(m)}. Clicca per scaricarlo.`;
        return `<button class="${info.classe}" data-scarica="${escapeHtml(m.nome)}"
          title="${escapeHtml(detto)}">${escapeHtml(info.sigla)}</button>`;
      })
      .join("");

    // Ridisegnare ogni tre secondi un HTML identico spegnerebbe il tooltip
    // proprio mentre lo stai leggendo.
    if (contenitore.dataset.html === html) return;
    contenitore.dataset.html = html;
    contenitore.innerHTML = html;

    for (const b of contenitore.querySelectorAll("[data-scarica]")) {
      b.onclick = async () => {
        await scarica(b.dataset.scarica);
        await aggiorna();
      };
    }
  }

  void aggiorna();
  setInterval(() => void aggiorna(), ogniMs);
  return { aggiorna };
}
