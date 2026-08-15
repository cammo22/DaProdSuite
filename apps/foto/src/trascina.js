/**
 * Trascinare un file dentro la finestra.
 *
 * Vale per tutta la pagina, non per un riquadro: chi trascina un'immagine da
 * Esplora risorse la lascia cadere dove capita, e chiedergli di centrare un
 * bersaglio è un modo di far fallire un gesto che dovrebbe essere ovvio.
 *
 * **Il `preventDefault` non è un dettaglio.** Senza, Chromium apre il file
 * lasciato cadere *al posto* della pagina: l'app sparisce e resta un'immagine a
 * schermo intero, senza modo di tornare indietro. È il motivo per cui gli
 * ascoltatori stanno su `window` e non sulla singola scheda.
 */

/** Quanti "dragenter" siamo dentro: uno solo non basta, i figli ne generano altri. */
let dentro = 0;

/**
 * @param {(file: File) => void | Promise<void>} quandoArriva
 * @param {(file: File) => boolean} accetta  quali file valgono per questa app
 */
export function collegaTrascinamento(quandoArriva, accetta = () => true) {
  const velo = document.createElement("div");
  velo.className = "velo-trascina";
  velo.innerHTML = "<span>Lascia qui il file</span>";
  velo.hidden = true;
  document.body.append(velo);

  const mostra = (acceso) => {
    velo.hidden = !acceso;
  };

  window.addEventListener("dragenter", (ev) => {
    if (!contieneFile(ev)) return;
    ev.preventDefault();
    dentro++;
    mostra(true);
  });

  window.addEventListener("dragover", (ev) => {
    if (!contieneFile(ev)) return;
    // Va ripetuto a ogni movimento: dirlo una volta all'ingresso non basta,
    // il browser richiede il consenso di continuo mentre il cursore si muove.
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  });

  window.addEventListener("dragleave", (ev) => {
    if (!contieneFile(ev)) return;
    dentro = Math.max(0, dentro - 1);
    if (dentro === 0) mostra(false);
  });

  window.addEventListener("drop", (ev) => {
    if (!contieneFile(ev)) return;
    ev.preventDefault();
    dentro = 0;
    mostra(false);

    const file = [...(ev.dataTransfer.files ?? [])].find(accetta);
    if (file) void quandoArriva(file);
  });
}

/** Vero se si sta trascinando un file e non del testo selezionato. */
function contieneFile(ev) {
  return [...(ev.dataTransfer?.types ?? [])].includes("Files");
}

export const eImmagine = (file) => file.type.startsWith("image/");
export const eAudio = (file) => file.type.startsWith("audio/");
