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
    <p class="spiega">Scrivi cosa vuoi vedere e il computer lo disegna. Sa scrivere le parole
      <b>dentro</b> l&#39;immagine, e ogni cosa fatta si ritocca a parole. Si paga in lire, che
      vanno nella Banca DaProd; quello che chi comanda scarta ti torna indietro.</p>

    <div class="studio-foglio">
      <textarea id="studio-testo" rows="3" maxlength="800"
        placeholder="una vespa rossa davanti a un bar di Napoli, sera, insegne al neon, pioggia sul selciato"></textarea>
      <div class="studio-riga">
        <button class="link" id="studio-dado">&#127922; Tira il dado</button>
        <span class="studio-conta" id="studio-conta">0 / 800</span>
      </div>

      <label for="studio-scritta">La scritta nell&#39;immagine <small>facoltativa: Qwen la scrive giusta</small></label>
      <input id="studio-scritta" maxlength="60" placeholder="BAR DAPROD">

      <label>Che forma</label>
      <div class="studio-scelte" id="studio-forme"></div>

      <label>Come</label>
      <div class="studio-scelte" id="studio-modi"></div>

      <button class="btn grosso" id="studio-vai">Crea</button>
      <p class="studio-nota" id="studio-nota"></p>
    </div>

    <div class="home-titolo"><h2>Il tuo quaderno</h2><button class="link" id="studio-aggiorna">aggiorna</button></div>
    <div class="studio-quaderno" id="studio-quaderno"></div>
  </section>
`;
