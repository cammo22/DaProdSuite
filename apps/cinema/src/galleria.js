/**
 * La scheda Galleria: i video fatti qui.
 *
 * È la gemella di quella di DaProdFoto, e vale la stessa frase: non è un album
 * del programma, è **la cartella dei risultati della suite** vista da questa
 * app. Gli stessi file li vedono anche le altre.
 *
 * **Perché serviva anche qui.** Sotto la sessione ci sono gli ultimi video, sei,
 * e finivano lì: quello di ieri l'altro esisteva solo dentro Esplora risorse. Su
 * una scheda dove una clip sono minuti di scheda video, perdere di vista quello
 * che si è già fatto è il modo più veloce per rifarlo.
 *
 * **Il tasto che conta è «riferimento».** Un video generato qui è esattamente
 * quello che MiniMax H3 vuole in pasto — un movimento di camera da copiare, una
 * voce, un ambiente — e prima bisognava salvarlo, cercarlo sul disco e
 * ricaricarlo dal riquadro. Adesso torna dentro con un clic.
 */

import { el, escapeHtml, mostraErrore, mostraScheda } from "./dom.js";
import { aggiungiRiferimento } from "./riferimenti.js";
import * as ponte from "./ponte.js";

let video = [];

/** Come si racconta un video in una riga: modello, misura, durata, quando. */
export function descrivi(v) {
  const meta = v.meta || {};
  return [
    meta.modello,
    meta.misura,
    meta.secondi ? `${Number(meta.secondi).toFixed(1)} s` : null,
    new Date(v.creato).toLocaleString("it-IT"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function aggiornaGalleria() {
  video = await ponte.video();

  el.navGal.textContent = video.length;
  el.conteggio.textContent = video.length ? `(${video.length})` : "";

  el.galleria.innerHTML = video.length
    ? video.map(scheda).join("")
    : `<div class="empty">Ancora nessun video. Vai su <b>Crea</b> e fallo.</div>`;

  collega();
}

function scheda(v) {
  const meta = v.meta || {};
  // `preload="metadata"`: con venti video in griglia, caricarli interi
  // all'apertura della scheda vorrebbe dire centinaia di MB letti dal disco per
  // vedere venti riquadri. Così ne arriva solo il primo fotogramma.
  return `<div class="card">
    <video class="art" src="${escapeHtml(v.url)}" preload="metadata" muted playsinline
      data-lente="${escapeHtml(v.id)}"></video>
    <div class="nm">${escapeHtml(String(meta.prompt || v.nome))}</div>
    <div class="sub">${escapeHtml(descrivi(v))}</div>
    <div class="acts">
      <button data-riferimento="${escapeHtml(v.id)}" title="usalo come riferimento in Crea">riferimento</button>
      <button data-salva="${escapeHtml(v.id)}">salva</button>
      <button data-mostra="${escapeHtml(v.id)}">cartella</button>
      <button class="del" data-elimina="${escapeHtml(v.id)}">elimina</button>
    </div>
  </div>`;
}

const trova = (id) => video.find((v) => v.id === id);

/** Due secondi di risposta sul tasto stesso: in galleria non c'è una riga per gli avvisi. */
function dilloSulTasto(bottone, testo) {
  const prima = bottone.textContent;
  bottone.textContent = testo;
  setTimeout(() => (bottone.textContent = prima), 2200);
}

function collega() {
  el.galleria.querySelectorAll("[data-lente]").forEach((v) => {
    v.onclick = () => {
      const trovato = trova(v.dataset.lente);
      if (trovato) mostraLente(trovato);
    };
  });

  el.galleria.querySelectorAll("[data-riferimento]").forEach((b) => {
    b.onclick = () => void portaInCrea(b);
  });

  /**
   * «cartella» apre Esplora risorse sul video. Se il file non c'è più lo dice il
   * tasto: qui non c'è una riga per gli errori, e non ne serve una.
   */
  el.galleria.querySelectorAll("[data-mostra]").forEach((b) => {
    b.onclick = async () => {
      if (await ponte.mostraNellaCartella(b.dataset.mostra)) return;
      dilloSulTasto(b, "non c'è più");
    };
  });

  /**
   * «salva» ne porta fuori una copia.
   *
   * I risultati stanno in `%LOCALAPPDATA%`, che è il posto giusto per la suite e
   * quello sbagliato per chi il video lo vuole mandare a qualcuno. Qui si sceglie
   * cartella e nome con la finestra di Windows, e l'originale resta dov'è.
   */
  el.galleria.querySelectorAll("[data-salva]").forEach((b) => {
    b.onclick = async () => {
      const prima = b.textContent;
      b.disabled = true;
      b.textContent = "salvo…";
      try {
        const dove = await ponte.salvaCopia(b.dataset.salva);
        b.textContent = prima;
        if (dove) dilloSulTasto(b, "salvato");
      } catch (e) {
        b.textContent = prima;
        dilloSulTasto(b, "non riesco");
        console.error(e);
      } finally {
        b.disabled = false;
      }
    };
  });

  el.galleria.querySelectorAll("[data-elimina]").forEach((b) => {
    b.onclick = async () => {
      const v = trova(b.dataset.elimina);
      if (!confirm(`Eliminare definitivamente "${v?.nome ?? "questo video"}"?`)) return;
      await ponte.eliminaElemento(b.dataset.elimina);
      await aggiornaGalleria();
    };
  });
}

/* ------------------------------------------------- da qui dentro a «Crea» */

/**
 * Il video torna dentro come riferimento di MiniMax H3.
 *
 * I riquadri di `riferimenti.js` tengono dei `File` del browser, non dei
 * percorsi: è quello che serve per l'anteprima e per il caricamento nel motore.
 * Quindi il file si rilegge davvero — `fetch` su `daprod://`, che la CSP di
 * questa pagina permette — e diventa un `File` come se l'avessi scelto dal disco.
 * Un video da 20 MB sono un paio di secondi, e il tasto lo dice.
 */
async function portaInCrea(bottone) {
  const v = trova(bottone.dataset.riferimento);
  if (!v) return;

  const prima = bottone.textContent;
  bottone.disabled = true;
  bottone.textContent = "carico…";
  try {
    const problema = await usaComeRiferimento(v);
    bottone.textContent = prima;
    mostraScheda("crea");
    if (problema) mostraErrore(problema);
  } catch (e) {
    bottone.textContent = prima;
    dilloSulTasto(bottone, "non riesco");
    console.error(e);
  } finally {
    bottone.disabled = false;
  }
}

/**
 * Un elemento della libreria messo fra i riferimenti.
 *
 * Vale per quello che c'è qui in galleria e per quello che **arriva da
 * un'altra app**: una voce fatta in DaProdVoce e mandata qui è la stessa cosa
 * di un video preso da questa scheda — un file che entra fra i riferimenti.
 *
 * Torna una frase se non poteva entrare, o niente se è entrato.
 */
export async function usaComeRiferimento(elemento) {
  const risposta = await fetch(elemento.url);
  if (!risposta.ok) throw new Error(`il file non si legge (${risposta.status})`);
  const blob = await risposta.blob();
  const file = new File([blob], nomeVero(elemento), { type: blob.type || tipoDa(elemento) });
  return aggiungiRiferimento(file);
}

/**
 * Il nome del file, non il titolo.
 *
 * `elemento.nome` è il titolo scritto nei metadati, e un titolo non ha
 * l'estensione: `LoadVideo` e `LoadAudio` guardano proprio quella per sapere che
 * cosa stanno aprendo. Il nome vero sta in fondo al percorso.
 */
function nomeVero(elemento) {
  return String(elemento.percorso || elemento.id).split(/[\\/]/).pop() || elemento.nome;
}

/**
 * Che tipo è, quando il blob non lo dice.
 *
 * `daprod://` risponde con il tipo giusto quasi sempre, ma «quasi» non basta:
 * senza tipo, `riferimenti.js` non saprebbe in quale dei tre gruppi mettere il
 * file e lo scarterebbe in silenzio.
 */
function tipoDa(elemento) {
  if (elemento.tipo === "audio") return "audio/wav";
  if (elemento.tipo === "immagine") return "image/png";
  return "video/mp4";
}

/* ------------------------------------------------------------- la lente */

/**
 * Il video a schermo intero.
 *
 * Non si chiude cliccando ovunque, come fa quella di DaProdFoto: qui sotto c'è
 * un lettore, e ogni clic su play, pausa o barra di scorrimento chiuderebbe
 * quello che stai guardando. Si chiude con la X o con Esc.
 */
function mostraLente(v) {
  el.lenteVideo.src = v.url;
  el.lenteInfo.textContent = `${v.meta?.prompt ?? v.nome} — ${descrivi(v)}`;
  el.lente.hidden = false;
  void el.lenteVideo.play().catch(() => {});
}

function chiudiLente() {
  el.lente.hidden = true;
  el.lenteVideo.pause();
  // Svuotare la sorgente: senza, il video resta caricato e continua a occupare
  // memoria per qualcosa che non è più sullo schermo.
  el.lenteVideo.removeAttribute("src");
  el.lenteVideo.load();
}

export function collegaGalleria() {
  el.aggiorna.onclick = () => void aggiornaGalleria();
  el.lenteChiudi.onclick = chiudiLente;
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !el.lente.hidden) chiudiLente();
  });

  ponte.suLibreriaCambiata(() => void aggiornaGalleria());

  /**
   * Quello che un'altra app manda qui.
   *
   * Non si apre soltanto la galleria: **il file entra fra i riferimenti**, che è
   * quello che si voleva fare mandandolo. Una voce fatta in DaProdVoce diventa
   * `<Audio 1>` di MiniMax H3 senza passare da «salva, cerca, ricarica».
   */
  ponte.suConsegna(async (consegna) => {
    mostraScheda("crea");
    try {
      const problema = await usaComeRiferimento(consegna.elemento);
      if (problema) mostraErrore(problema);
    } catch (e) {
      mostraErrore(`Non sono riuscito a prendere "${consegna.elemento.nome}": ${e.message || e}`);
    }
  });
}
