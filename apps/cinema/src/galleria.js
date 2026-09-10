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
 * ⚠ **Qui c'era il tasto «riferimento»**, che rimandava un video generato dentro
 * a «Crea»: un movimento di camera da copiare, un ambiente, una voce. Era la
 * cosa che sapeva fare MiniMax H3, ed è uscito insieme al modello l'11 settembre
 * 2026. Senza H3 un video non è più qualcosa che si possa dare in pasto — LTX
 * prende due **immagini**, il primo e l'ultimo fotogramma — e un tasto che
 * risponde sempre «non ci sta» è peggio di un tasto che manca.
 *
 * Resta la strada da **un'altra app**: un'immagine fatta in DaProdFoto e mandata
 * qui diventa il primo fotogramma senza passare da «salva, cerca, ricarica».
 * Vedi `usaComeFotogramma`.
 */

import { el, escapeHtml, mostraErrore, mostraScheda } from "./dom.js";
import { aggiungiFotogramma } from "./riferimenti.js";
import { faiLaCopertina } from "./copertina.js";
import * as ponte from "./ponte.js";

let video = [];

/**
 * I video a cui abbiamo gia' provato a fare la copertina, in questa sessione.
 *
 * Serve a non entrare in un giro senza fine: salvare una copertina avvisa la
 * libreria, la libreria riavvisa la galleria, e la galleria ricomincerebbe da
 * capo. Con un video a cui la copertina non si puo' fare — un file rovinato, un
 * codec che il browser non conosce — sarebbe un ciclo infinito.
 */
const provate = new Set();

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
  void riprendiLeCopertine();
}

/**
 * I video vecchi si prendono la loro copertina adesso.
 *
 * **Perche' serve una ripresa e non basta farla a fine generazione.** Da
 * `copertina.js` la copertina nasce insieme al video, ma quello vale da qui in
 * avanti: chi apre questa scheda ha una cartella piena di clip fatte prima —
 * quando la copertina non si faceva, o si faceva e si perdeva per la rinomina —
 * e quelle resterebbero rettangoli neri per sempre.
 *
 * Una per volta, e con calma: aprire venti video insieme per prendergli un
 * fotogramma vorrebbe dire venti decodifiche in parallelo mentre la scheda
 * video sta generando. Una alla volta non si sente.
 */
async function riprendiLeCopertine() {
  for (const v of video) {
    if (v.copertina || provate.has(v.id)) continue;
    provate.add(v.id);
    // `await`: e' apposta in fila. Ognuna scarica il video e lo decodifica, e
    // farlo per venti insieme e' l'unico modo di far tossire la scheda.
    if (await faiLaCopertina(v.id, v.url)) return;
  }
}

/**
 * Il riquadro di un video, **con dentro qualcosa da guardare.**
 *
 * ⚠ Il difetto piu' vecchio della scheda, detto quattro volte: «l'immagine di
 * anteprima dei video non funziona». Qui era scritto cosi':
 *
 *     <video class="art" src="..." preload="metadata" muted playsinline>
 *
 * e `preload="metadata"` fa esattamente quello che dice: legge **i dati** del
 * video — quanto dura, quanto e' grande — e non decodifica un fotogramma. Un
 * `<video>` che non ha decodificato niente e non ha un `poster` disegna un
 * rettangolo nero. Venti riquadri neri in griglia.
 *
 * La copertina invece c'e' quasi sempre: la fa `copertina.js` appena il video
 * e' finito, e vive in un `.cover.jpg` accanto al file — la libreria la
 * consegna gia' pronta in `v.copertina`. Bastava usarla.
 *
 * Quindi adesso: **se la copertina c'e' si mostra un'immagine** (che e' anche
 * piu' leggera di venti `<video>` da caricare); se non c'e', resta il `<video>`
 * di prima con `preload="auto"`, che il fotogramma se lo decodifica — e nel
 * frattempo `riprendiLeCopertine` gliene fa una vera per la prossima volta.
 */
function scheda(v) {
  const meta = v.meta || {};
  const dentro = v.copertina
    ? `<img class="art" src="${escapeHtml(v.copertina)}" alt="" loading="lazy"
      data-lente="${escapeHtml(v.id)}">`
    : `<video class="art" src="${escapeHtml(v.url)}" preload="auto" muted playsinline
      data-lente="${escapeHtml(v.id)}"></video>`;
  return `<div class="card">
    ${dentro}
    <div class="nm">${escapeHtml(String(meta.prompt || v.nome))}</div>
    <div class="sub">${escapeHtml(descrivi(v))}</div>
    <div class="acts">
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
 * Un elemento della libreria messo fra i fotogrammi di partenza.
 *
 * Serve a quello che **arriva da un'altra app**: un'immagine fatta in DaProdFoto
 * e mandata qui diventa il primo fotogramma del prossimo video.
 *
 * I riquadri di `riferimenti.js` tengono dei `File` del browser, non dei
 * percorsi: è quello che serve per l'anteprima e per il caricamento nel motore.
 * Quindi il file si rilegge davvero — `fetch` su `daprod://`, che la CSP di
 * questa pagina permette — e diventa un `File` come se l'avessi scelto dal disco.
 *
 * Torna una frase se non poteva entrare, o niente se è entrato.
 */
export async function usaComeFotogramma(elemento) {
  const risposta = await fetch(elemento.url);
  if (!risposta.ok) throw new Error(`il file non si legge (${risposta.status})`);
  const blob = await risposta.blob();
  const file = new File([blob], nomeVero(elemento), { type: blob.type || tipoDa(elemento) });
  return aggiungiFotogramma(file);
}

/**
 * Il nome del file, non il titolo.
 *
 * `elemento.nome` è il titolo scritto nei metadati, e un titolo non ha
 * l'estensione: `LoadImage` guarda proprio quella per sapere cosa sta aprendo. Il
 * nome vero sta in fondo al percorso.
 */
function nomeVero(elemento) {
  return String(elemento.percorso || elemento.id).split(/[\\/]/).pop() || elemento.nome;
}

/**
 * Che tipo è, quando il blob non lo dice.
 *
 * `daprod://` risponde con il tipo giusto quasi sempre, ma «quasi» non basta:
 * senza tipo, `riferimenti.js` non saprebbe se è un'immagine e la scarterebbe.
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
   * Non si apre soltanto la galleria: **il file entra fra i fotogrammi**, che è
   * quello che si voleva fare mandandolo. Un'immagine fatta in DaProdFoto diventa
   * il primo fotogramma senza passare da «salva, cerca, ricarica».
   */
  ponte.suConsegna(async (consegna) => {
    mostraScheda("crea");
    try {
      const problema = await usaComeFotogramma(consegna.elemento);
      if (problema) mostraErrore(problema);
    } catch (e) {
      mostraErrore(`Non sono riuscito a prendere "${consegna.elemento.nome}": ${e.message || e}`);
    }
  });
}
