/**
 * Lo Studio (1.4.5): la prima scheda della stanza Genera.
 *
 * Chiesto da Cammo il 24 settembre 2026: «con i nuovi modelli Qwen, molto
 * capaci nelle immagini, reinventiamo la parte di genera completamente». Il
 * perche' di come e' fatto sta in `../studio.ts`; i dati li mette
 * `studio-copione.ts`. Stesse regole degli altri pezzi della pagina: una
 * stringa sola, niente apici inversi e niente barre rovesciate dentro.
 */
export const MARKUP_STUDIO = `
  <!-- ============================================================= studio -->
  <section class="pagina" id="p-studio">
    <div class="studio-testa">
      <h2>Lo Studio</h2>
      <span class="studio-marca">Qwen-Image 2.1</span>
    </div>
    <p class="spiega">Scrivi cosa vuoi vedere e il computer lo disegna, o parti da una tua foto e
      di&#39; cosa cambiare. Sa scrivere le parole <b>dentro</b> l&#39;immagine. Si paga in lire, che
      vanno nella Banca DaProd; quello che chi comanda scarta ti torna indietro.</p>

    <!-- 1.4.9: due linguette invece del «come» (veloce o fine): si fa solo fine,
         e la seconda strada e' una foto tua, dal telefono. -->
    <div class="studio-strade" id="studio-strade">
      <button type="button" data-strada-studio="crea" class="scelto">&#10022; Crea</button>
      <button type="button" data-strada-studio="modifica">&#9998; Modifica una tua foto</button>
    </div>

    <div class="studio-foglio">
      <div class="studio-foto" id="studio-foto" hidden>
        <img id="studio-foto-vista" alt="" hidden>
        <button type="button" class="btn piano" id="studio-foto-scegli">&#128247; Scegli una foto dal telefono</button>
        <input type="file" id="studio-foto-file" accept="image/*" hidden>
      </div>
      <textarea id="studio-testo" rows="3" maxlength="800"
        placeholder="una vespa rossa davanti a un bar di Napoli, sera, insegne al neon, pioggia sul selciato"></textarea>
      <div class="studio-riga">
        <button class="link" id="studio-dado">&#127922; Tira il dado</button>
        <span class="studio-conta" id="studio-conta">0 / 800</span>
      </div>

      <div id="studio-solo-crea">
        <label for="studio-scritta">La scritta nell&#39;immagine <small>facoltativa: Qwen la scrive giusta</small></label>
        <input id="studio-scritta" maxlength="60" placeholder="BAR DAPROD">

        <label>Che forma</label>
        <div class="studio-scelte" id="studio-forme"></div>
      </div>

      <button class="btn grosso" id="studio-vai">Crea</button>
      <p class="studio-nota" id="studio-nota"></p>
    </div>

    <div class="home-titolo"><h2>Il tuo quaderno</h2><button class="link" id="studio-aggiorna">aggiorna</button></div>
    <div class="studio-quaderno" id="studio-quaderno"></div>
  </section>
`;
