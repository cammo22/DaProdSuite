/**
 * I modelli di DaProdDream, visti dalla suite.
 *
 * L'app sa già dire cosa ha **in memoria** — barra di stato, VRAM, modello
 * caricato — ma non sapeva dire cosa ha **su disco**: se SD-Turbo manca, il
 * motore prova a caricarlo, fallisce e resta lì. Le altre app della suite hanno
 * tutte lo stesso riquadro (Foto per FLUX, Musica per la qualità del suono), e
 * adesso ce l'ha anche questa.
 *
 * Sta in un file a parte e non dentro `app.js` di proposito: è roba della suite,
 * non del motore, e chi apre DaProdDream fuori dalla suite non ha
 * `window.daprodSuite` — in quel caso questo file non fa niente e sparisce.
 */

(() => {
  const suite = window.daprodSuite;
  if (!suite?.modelli) return;

  /** Gli id di `manifest/models.json` che servono a questa app. */
  const MIEI = ["sd-turbo", "taesd"];

  const riquadro = document.createElement("div");
  riquadro.className = "modelli-suite";
  riquadro.hidden = true;
  document.body.appendChild(riquadro);

  const gb = (byte) => `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;

  async function controlla() {
    let stato;
    try {
      stato = await suite.modelli.stato(MIEI);
    } catch {
      return; // la suite non risponde: non è compito di questo riquadro dirlo
    }

    if (stato.pronto) {
      riquadro.hidden = true;
      return;
    }

    riquadro.hidden = false;
    riquadro.innerHTML = `
      <div><b>Mancano i modelli di DaProdDream.</b>
        ${stato.mancanti.map((m) => m.label).join(", ")}.</div>
      <div class="ms-riga">Senza, la trasformazione non parte: sono ${gb(stato.bytesMancanti)}.</div>
      <button type="button" id="msScarica">Scarica ${gb(stato.bytesMancanti)}</button>`;

    riquadro.querySelector("#msScarica").onclick = () => {
      riquadro.querySelector("#msScarica").disabled = true;
      void suite.modelli.scarica(MIEI);
    };
  }

  suite.modelli.onAvanzamento((avanzamento) => {
    if (avanzamento.attivo) {
      riquadro.hidden = false;
      const quota = avanzamento.total > 0 ? (avanzamento.done / avanzamento.total) * 100 : 0;
      riquadro.innerHTML = `
        <div><b>${avanzamento.label}</b></div>
        <div class="ms-barra"><i style="width:${quota.toFixed(1)}%"></i></div>
        <div class="ms-riga">${gb(avanzamento.done)} di ${gb(avanzamento.total)}</div>`;
      return;
    }
    if (avanzamento.errore) {
      riquadro.innerHTML = `<div class="ms-guasto">${avanzamento.errore}</div>`;
      return;
    }
    // Finito: si rilegge cosa c'è davvero, e se ora c'è tutto il riquadro va via.
    void controlla();
  });

  void controlla();
})();
