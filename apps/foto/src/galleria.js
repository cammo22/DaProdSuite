/**
 * La scheda Galleria: le immagini fatte qui.
 *
 * Non è un album del programma, è la cartella dei risultati della suite vista da
 * questa app: le stesse immagini le vedono anche le altre.
 *
 * **C'era un tasto "a Musica" e non c'è più.** Mandava l'immagine a DaPMusica
 * come copertina, ma DaPMusica la sa usare solo se in Libreria c'è già un brano
 * scelto: senza, l'immagine partiva e non succedeva niente: un tasto che
 * risponde "mandata" e non fa nulla è peggio di un tasto che non c'è. Il giro
 * torna quando DaPMusica saprà chiedere *su quale brano* metterla.
 */

import { el, escapeHtml, mostraScheda } from "./dom.js";
import { annuncia, ascolta } from "./bus.js";
import { mostraLente } from "./lente.js";
import { stato } from "./stato.js";
import { disegnaSessione, scordaDisegno } from "./coda.js";
import * as ponte from "./ponte.js";

let immagini = [];

/** Come si racconta un'immagine in una riga: modello, estetica, quando. */
export function descrivi(immagine) {
  const meta = immagine.meta || {};
  return [
    meta.modello,
    meta.ritocco ? "ritocco" : meta.estetica,
    new Date(immagine.creato).toLocaleString("it-IT"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function aggiornaGalleria() {
  immagini = await ponte.immagini();
  stato.immagini = immagini;

  el.navGal.textContent = immagini.length;
  el.conteggio.textContent = immagini.length ? `(${immagini.length})` : "";

  el.galleria.innerHTML = immagini.length
    ? immagini.map(scheda).join("")
    : `<div class="empty">Ancora nessuna immagine. Vai su <b>Crea</b> e falla.</div>`;

  collega();

  // La sessione mostra le stesse immagini: se non lo si dice, la striscia sotto
  // i lavori resta a quelle di prima finché non cambia qualcos'altro.
  scordaDisegno();
  disegnaSessione();

  // Adesso `stato.immagini` è aggiornato: chi mostra le ultime — la striscia del
  // Ritocco — può ridisegnarsi con quelle vere.
  annuncia("immagini-aggiornate");
}

function scheda(immagine) {
  const meta = immagine.meta || {};

  return `<div class="card">
    <img class="art" src="${escapeHtml(immagine.url)}" alt="" loading="lazy" data-lente="${escapeHtml(immagine.id)}">
    <div class="nm">${escapeHtml(meta.testo || immagine.nome)}</div>
    <div class="sub">${escapeHtml(descrivi(immagine))}</div>
    <div class="acts">
      <button data-ritocca="${escapeHtml(immagine.id)}">ritocca</button>
      <button data-salva="${escapeHtml(immagine.id)}">salva</button>
      <button data-mostra="${escapeHtml(immagine.id)}">cartella</button>
      <button class="del" data-elimina="${escapeHtml(immagine.id)}">elimina</button>
    </div>
  </div>`;
}

function trova(id) {
  return immagini.find((i) => i.id === id);
}

/** Due secondi di risposta sul tasto stesso: qui non c'è una riga per gli avvisi. */
function dilloSulTasto(bottone, testo) {
  const prima = bottone.textContent;
  bottone.textContent = testo;
  setTimeout(() => (bottone.textContent = prima), 2200);
}

function collega() {
  el.galleria.querySelectorAll("[data-lente]").forEach((img) => {
    img.onclick = () => {
      const immagine = trova(img.dataset.lente);
      if (immagine) mostraLente(immagine.url, `${immagine.meta?.testo ?? immagine.nome} — ${descrivi(immagine)}`);
    };
  });

  el.galleria.querySelectorAll("[data-ritocca]").forEach((b) => {
    b.onclick = () => {
      const immagine = trova(b.dataset.ritocca);
      if (immagine) annuncia("ritocca", immagine.url);
    };
  });

  /**
   * «cartella» apre Esplora risorse sull'immagine.
   *
   * Il tasto si chiamava "nella cartella" e non apriva niente. Erano due cose
   * insieme: il nome, che prometteva di *portarti* nella cartella, e sotto una
   * chiamata di Electron che su Windows 11 ogni tanto non apre nessuna finestra
   * e non lo dice a nessuno (vedi `rivela.ts` nello shell, che adesso lancia
   * Esplora come farebbe Windows). Se il file non c'è più, lo dice il tasto:
   * qui non c'è una riga per gli errori, e non ne serve una.
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
   * I risultati stanno in `%LOCALAPPDATA%`, che è il posto giusto per la suite
   * e quello sbagliato per chi l'immagine la vuole mandare a qualcuno. Qui si
   * sceglie cartella e nome con la finestra di Windows, e l'originale resta
   * dov'è: la galleria continua a mostrarlo.
   */
  el.galleria.querySelectorAll("[data-salva]").forEach((b) => {
    b.onclick = async () => {
      const prima = b.textContent;
      b.disabled = true;
      b.textContent = "salvo…";
      try {
        const dove = await ponte.salvaCopia(b.dataset.salva);
        b.textContent = prima;
        if (dove) dilloSulTasto(b, "salvata");
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
      const immagine = trova(b.dataset.elimina);
      if (!confirm(`Eliminare definitivamente "${immagine?.nome ?? "questa immagine"}"?`)) return;
      await ponte.eliminaElemento(b.dataset.elimina);
      await aggiornaGalleria();
    };
  });
}

export function collegaGalleria() {
  el.aggiorna.onclick = () => aggiornaGalleria();

  ascolta("galleria-cambiata", () => void aggiornaGalleria());
  ponte.suLibreriaCambiata(() => void aggiornaGalleria());

  // Un'immagine mandata qui da un'altra app finisce dritta nel ritocco: è quello
  // che si vuole fare quando si passa una foto a un programma che la modifica.
  ponte.suConsegna((consegna) => {
    if (consegna.elemento.tipo !== "immagine") {
      mostraScheda("galleria");
      return;
    }
    annuncia("ritocca", consegna.elemento.url);
  });
}
