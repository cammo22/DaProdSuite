/**
 * La copertina di un video: **si fa qui, appena il video è finito.**
 *
 * **Il difetto, ripetuto tre volte:** «i video continua a non funzionare la
 * thumbnail — facciamo che a fine video il software la crea» (26 agosto 2026).
 *
 * Fino alla 0.7.7 il fotogramma lo cavava FFmpeg, dal lato della suite, la
 * prima volta che qualcuno apriva la galleria. Con due difetti che insieme
 * fanno un buco:
 *
 * - **FFmpeg non c'è per forza.** Non è imbarcato — è GPL, la suite è MIT — e
 *   su un computer senza, i video restavano rettangoli neri per sempre. Nessun
 *   messaggio, nessuna spiegazione: neri.
 * - **Si faceva tardi.** Anche dove FFmpeg c'era, l'anteprima nasceva quando
 *   qualcuno la chiedeva, cioè mentre stava guardando lo schermo nero.
 *
 * Qui invece il fotogramma lo prende **il programma che ha appena fatto il
 * video**, con gli strumenti che ha già in mano: un `<video>` fermo al secondo
 * giusto, disegnato su un `<canvas>`. Nessun programma esterno, e la copertina
 * esiste prima che qualcuno apra la galleria — sul computer e sul telefono
 * insieme, perché finisce in un `.cover.jpg` accanto al file, che è la
 * convenzione che tutta la suite già legge.
 *
 * ## Il secondo da cui si prende
 *
 * Non lo zero. Quasi tutte le clip generate cominciano da un nero o da una
 * dissolvenza, e il fotogramma zero è esattamente il rettangolo nero che
 * stiamo cercando di togliere. Un secondo dentro c'è già qualcosa da vedere; se
 * la clip è più corta, si ripiega a metà.
 *
 * ## Perché passa da un blob e non dall'indirizzo del motore
 *
 * Il video vive sul motore, che è un'altra origine. Disegnare su un canvas una
 * cosa che viene da un'altra origine **sporca il canvas**, e da un canvas
 * sporco non si può più tirare fuori l'immagine: il browser lo vieta. Scaricare
 * i byte e farne un blob lo rende roba nostra, e il disegno si può leggere.
 *
 * Se qualcosa non va — il video non si apre, il disegno non riesce, il disco
 * dice di no — **non succede niente**: il video c'è comunque, e la copertina
 * era un di più. Non si fa fallire una generazione riuscita per una figura.
 */

import * as ponte from "./ponte.js";

/** Da che secondo si prova a prendere il fotogramma. */
const SECONDO_BUONO = 1;

/** Quanto si aspetta un video che non si decide ad aprirsi. */
const ATTESA_MS = 15000;

/** Quanto è larga la copertina: il doppio del riquadro più grande che disegnamo. */
const LARGA = 640;

/**
 * Fa la copertina di un video e la mette accanto al file.
 *
 * Torna vero se ce l'ha fatta. Non lancia mai: chi la chiama ha appena
 * consegnato un video, e non deve accorgersi di questa.
 */
export async function faiLaCopertina(id, indirizzo) {
  try {
    const dataUrl = await fotogramma(indirizzo);
    if (!dataUrl) return false;
    return (await ponte.salvaCopertina(id, dataUrl)) === true;
  } catch {
    return false;
  }
}

/** Un fotogramma del video, come data URL JPEG. Null se non si è potuto. */
async function fotogramma(indirizzo) {
  let blobUrl = null;
  try {
    const risposta = await fetch(indirizzo);
    if (!risposta.ok) return null;
    blobUrl = URL.createObjectURL(await risposta.blob());
    return await disegna(blobUrl);
  } catch {
    return null;
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}

function disegna(blobUrl) {
  return new Promise((risolvi) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let chiuso = false;
    const finisci = (esito) => {
      if (chiuso) return;
      chiuso = true;
      clearTimeout(scadenza);
      video.removeAttribute("src");
      video.load();
      risolvi(esito);
    };

    const scadenza = setTimeout(() => finisci(null), ATTESA_MS);

    video.addEventListener("error", () => finisci(null));

    video.addEventListener("loadeddata", () => {
      // Una clip più corta del secondo scelto quel fotogramma non ce l'ha: si
      // va a metà, che in un video di mezzo secondo è comunque dopo il nero.
      const durata = Number.isFinite(video.duration) ? video.duration : 0;
      const dove = durata > SECONDO_BUONO + 0.2 ? SECONDO_BUONO : Math.max(0, durata / 2);
      try {
        video.currentTime = dove;
      } catch {
        finisci(null);
      }
    });

    video.addEventListener("seeked", () => {
      try {
        const largo = video.videoWidth || LARGA;
        const alto = video.videoHeight || Math.round((LARGA * 9) / 16);
        const scala = Math.min(1, LARGA / largo);
        const tela = document.createElement("canvas");
        tela.width = Math.max(1, Math.round(largo * scala));
        tela.height = Math.max(1, Math.round(alto * scala));
        const pennello = tela.getContext("2d");
        if (!pennello) return finisci(null);
        pennello.drawImage(video, 0, 0, tela.width, tela.height);
        finisci(tela.toDataURL("image/jpeg", 0.82));
      } catch {
        finisci(null);
      }
    });

    video.src = blobUrl;
  });
}
