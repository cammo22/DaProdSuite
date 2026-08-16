/**
 * Il secondo modo di sognare: Anima.
 *
 * DaProdDream nasce per il tempo reale — SD-Turbo, dieci fotogrammi al secondo,
 * la webcam che si trasforma mentre ti muovi. Ma il sogno libero non ha una
 * webcam davanti: parte dal rumore e ci mette dentro il tuo prompt. Lì il tempo
 * reale non è il punto, e SD-Turbo, che è piccolo e distillato, si vede che è
 * piccolo.
 *
 * Anima è il modello che fa le immagini in DaPFoto e le copertine in DaPMusica:
 * 5,6 GB già sul disco, dieci passi, molto più bella. Non fa dieci fotogrammi al
 * secondo e non ci prova: **si scrive e si rigenera**, un'immagine per volta,
 * mentre continui a cambiare le parole.
 *
 * **Perché sta in un file a parte.** Anima non gira sul motore di Dream: gira su
 * ComfyUI, lo stesso di Foto e Musica, che la suite accende su richiesta
 * (`daprodSuite.motoreInPiu`). Tutto quello che c'è qui dentro riguarda la
 * suite, non il motore del tempo reale: chi apre DaProdDream da solo non ha
 * `window.daprodSuite` e questo file si accorge che non c'è e non fa niente,
 * esattamente come `modelli-suite.js`.
 *
 * **La VRAM è una sola.** Passare ad Anima ferma il sogno in corso e toglie
 * SD-Turbo dalla memoria: con 8 GB non ci stanno tutti e due, e un ComfyUI che
 * trova la scheda già piena non dà un'immagine brutta — non parte proprio.
 * Tornando a SD-Turbo il modello si ricarica da sé.
 */

(() => {
  const suite = window.daprodSuite;
  if (!suite?.motoreInPiu) return;

  const pagina = document.getElementById("pagina-sogno");
  const pannello = pagina?.querySelector(".panel.right");
  const viewer = document.getElementById("viewer-sogno");
  const img = document.getElementById("img-sogno");
  if (!pagina || !pannello || !viewer || !img) return;

  /** Gli id di `manifest/models.json`: gli stessi tre di Foto e Musica. */
  const MIEI = ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"];

  const PESI = {
    dit: "anima-turbo-v1.0.safetensors",
    txt: "qwen_3_06b_base.safetensors",
    vae: "qwen_image_vae.safetensors",
  };

  const NEGATIVO =
    "worst quality, low quality, blurry, jpeg artifacts, watermark, signature, text, letters";

  const S = {
    acceso: false,
    motore: "",
    lavoro: null,
    daRifare: false,
    attesa: null,
    ultimoTesto: "",
    seme: 0,
  };

  const gb = (byte) => `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;

  /* ------------------------------------------------------------ interfaccia */

  const riga = document.createElement("div");
  riga.className = "anima-scelta";
  riga.innerHTML = `
    <h2>Con che cosa sogni</h2>
    <div class="anima-modelli">
      <button type="button" class="anima-modello on" data-modello="turbo">
        <b>SD-Turbo</b><span>in tempo reale, si trasforma da solo</span>
      </button>
      <button type="button" class="anima-modello" data-modello="anima">
        <b>Anima</b><span>più bella, un'immagine per volta mentre scrivi</span>
      </button>
    </div>
    <div class="anima-pannello hidden">
      <div class="field">
        <label>Formato</label>
        <select id="anima-formato">
          <option value="1024x1024">Quadrato 1024</option>
          <option value="1344x768">Orizzontale 1344×768</option>
          <option value="768x1344">Verticale 768×1344</option>
        </select>
      </div>
      <div class="field">
        <label>Passi <b id="anima-passi-val">10</b></label>
        <input type="range" id="anima-passi" min="4" max="30" step="1" value="10">
        <div class="hint"><span>svelta</span><span>curata</span></div>
      </div>
      <div class="anima-tasti">
        <button type="button" id="anima-rigenera" class="primary">Rigenera</button>
        <button type="button" id="anima-dado" class="ghost" title="Cambia il seme">🎲 Altro caso</button>
      </div>
      <div class="hint" id="anima-tradotto"></div>
    </div>
    <div class="anima-mancanti hidden"></div>`;
  pannello.insertBefore(riga, pannello.firstChild);

  const stato = document.createElement("div");
  stato.className = "anima-stato hidden";
  viewer.appendChild(stato);

  const pannelloAnima = riga.querySelector(".anima-pannello");
  const mancanti = riga.querySelector(".anima-mancanti");
  const tradotto = riga.querySelector("#anima-tradotto");
  const passi = riga.querySelector("#anima-passi");
  const formato = riga.querySelector("#anima-formato");

  function dico(testo, guasto = false) {
    stato.classList.remove("hidden");
    stato.classList.toggle("guasto", guasto);
    stato.textContent = testo;
  }

  const zitto = () => stato.classList.add("hidden");

  /* --------------------------------------------------------------- accendi */

  async function scegli(quale) {
    if ((quale === "anima") === S.acceso) return;
    riga.querySelectorAll(".anima-modello").forEach((b) => {
      b.classList.toggle("on", b.dataset.modello === quale);
    });

    if (quale === "turbo") {
      await tornaAlTurbo();
      return;
    }

    S.acceso = true;
    pagina.classList.add("anima");
    pannelloAnima.classList.remove("hidden");

    try {
      if (!(await modelliPronti())) return;

      dico("Accendo il motore delle immagini… la prima volta ci vuole un minuto.");
      S.motore = await suite.motoreInPiu("comfy");

      // La VRAM è una sola: il tempo reale si ferma e SD-Turbo esce dalla
      // memoria, altrimenti ComfyUI trova la scheda piena e non parte.
      await fetch("/api/ferma", { method: "POST", headers: json(), body: "{}" }).catch(() => {});
      await fetch("/api/modello/scarica", { method: "POST", headers: json(), body: "{}" }).catch(
        () => {},
      );

      dico("Pronto. Scrivi cosa vuoi vedere: l'immagine si rifà da sola.");
      if (testoPrompt()) void genera();
    } catch (e) {
      dico(String(e?.message || e), true);
    }
  }

  async function tornaAlTurbo() {
    S.acceso = false;
    S.lavoro = null;
    pagina.classList.remove("anima");
    pannelloAnima.classList.add("hidden");
    mancanti.classList.add("hidden");
    img.classList.remove("anima-on");
    zitto();

    // **Prima si libera la scheda, poi si ricarica.** ComfyUI resta acceso — lo
    // spegne la suite quando chiudi l'app — ma Anima gli resta in VRAM anche a
    // lavoro finito: senza questo, SD-Turbo troverebbe quattro GB occupati da un
    // motore che in questo momento non sta facendo niente.
    if (S.motore) {
      await fetch(`${S.motore}/free`, {
        method: "POST",
        headers: json(),
        body: JSON.stringify({ unload_models: true, free_memory: true }),
      }).catch(() => {});
    }

    // Il modello del tempo reale torna in memoria: chi ripreme "Comincia a
    // sognare" non deve aspettare il caricamento con lo schermo fermo.
    await fetch("/api/modello/carica", { method: "POST", headers: json(), body: "{}" }).catch(
      () => {},
    );
  }

  /** Vero se i tre file di Anima sono sul disco; se no, offre di scaricarli. */
  async function modelliPronti() {
    let s;
    try {
      s = await suite.modelli.stato(MIEI);
    } catch {
      return true; // la suite non risponde: si prova comunque, sarà il motore a dirlo
    }
    if (s.pronto) {
      mancanti.classList.add("hidden");
      return true;
    }

    zitto();
    mancanti.classList.remove("hidden");
    mancanti.innerHTML = `
      <div><b>Anima non è ancora sul disco.</b> ${s.mancanti.map((m) => m.label).join(", ")}.</div>
      <div class="hint">Sono ${gb(s.bytesMancanti)}, gli stessi che usano DaPFoto e DaPMusica.</div>
      <button type="button" id="anima-scarica" class="primary">Scarica ${gb(s.bytesMancanti)}</button>`;
    mancanti.querySelector("#anima-scarica").onclick = (ev) => {
      ev.target.disabled = true;
      void suite.modelli.scarica(MIEI);
    };
    return false;
  }

  // Solo mentre si sta davvero scaricando qualcosa per noi: l'avanzamento
  // arriva a ogni cambiamento, anche a scaricamento fermo, e senza questo
  // controllo "finito" tornava vero in continuazione — rifacendo da capo la
  // scelta del modello, e con lei un'immagine nuova ogni pochi secondi.
  suite.modelli.onAvanzamento((a) => {
    if (!S.acceso || mancanti.classList.contains("hidden")) return;
    if (a.attivo) {
      const quota = a.total > 0 ? ((a.done / a.total) * 100).toFixed(0) : "…";
      mancanti.classList.remove("hidden");
      mancanti.innerHTML = `<div><b>${a.label}</b></div>
        <div class="hint">${gb(a.done)} di ${gb(a.total)} — ${quota}%</div>`;
      return;
    }
    if (a.errore) {
      mancanti.innerHTML = `<div class="anima-guasto">${a.errore}</div>`;
      return;
    }
    // Finito: se adesso c'è tutto si riprende da dove ci si era fermati.
    void scegliDiNuovo();
  });

  async function scegliDiNuovo() {
    if (!(await modelliPronti())) return;
    S.acceso = false;
    await scegli("anima");
  }

  /* ---------------------------------------------------------------- genera */

  const json = () => ({ "Content-Type": "application/json" });

  const testoPrompt = () => (document.getElementById("prompt-sogno")?.value || "").trim();
  const testoNegativo = () => (document.getElementById("negative-sogno")?.value || "").trim();

  /**
   * L'italiano tradotto in inglese.
   *
   * Anima è addestrata su didascalie inglesi: una descrizione in italiano non dà
   * errore, dà un'immagine che non c'entra niente. **Il traduttore è già qui**:
   * è quello di DaProdDream, che il tempo reale usa da sempre, e il prompt ce lo
   * ha già mandato l'interfaccia mentre scrivevi. Qui si legge soltanto come
   * l'ha tradotto — niente secondo traduttore da tenere allineato.
   *
   * Se non è pronto si manda l'originale e lo si scrive: generare peggio è
   * meglio che non generare.
   */
  async function inInglese(testo) {
    try {
      const st = await (await fetch("/api/stato", { cache: "no-store" })).json();
      const fuori = st?.traduzione?.testo;
      if (st?.traduzione?.attiva && fuori && fuori !== testo) {
        tradotto.textContent = `Mandato al modello: ${fuori}`;
        return fuori;
      }
      tradotto.textContent = "";
      return testo;
    } catch {
      tradotto.textContent = "Mandato così com'era: il traduttore non ha risposto.";
      return testo;
    }
  }

  function grafo(prompt, negativo, larghezza, altezza, seme, quantiPassi) {
    return {
      "1": { class_type: "UNETLoader", inputs: { unet_name: PESI.dit, weight_dtype: "default" } },
      "2": { class_type: "CLIPLoader", inputs: { clip_name: PESI.txt, type: "stable_diffusion" } },
      "3": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: prompt } },
      "4": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: negativo || NEGATIVO } },
      "5": {
        class_type: "EmptySD3LatentImage",
        inputs: { width: larghezza, height: altezza, batch_size: 1 },
      },
      "6": {
        class_type: "KSampler",
        inputs: {
          model: ["1", 0], positive: ["3", 0], negative: ["4", 0], latent_image: ["5", 0],
          seed: seme, steps: quantiPassi, cfg: 1,
          sampler_name: "euler", scheduler: "simple", denoise: 1,
        },
      },
      "7": { class_type: "VAELoader", inputs: { vae_name: PESI.vae } },
      "8": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
      // Senza sottocartella, di proposito. ComfyUI rifiuta di salvare fuori
      // dalla cartella dei risultati, e il controllo che fa risolve i percorsi
      // fino in fondo: una sottocartella nata sotto un percorso reindirizzato
      // — succede quando il motore viene avviato da dentro un contenitore —
      // gli risulta "fuori" e non salva niente. La cartella dei risultati
      // invece la crea la suite all'installazione ed è sempre quella giusta.
      "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "sogno-anima" } },
    };
  }

  async function genera() {
    const testo = testoPrompt();
    if (!testo) {
      dico("Scrivi cosa vuoi sognare.");
      return;
    }
    if (!S.motore) return;

    // **Un lavoro alla volta, e senza interromperlo.** Chi scrive veloce
    // farebbe una coda di immagini che non guarderà mai; ma fermare quella in
    // corso con `/interrupt` e mandarne subito un'altra è peggio, perché il
    // segnale di stop arriva quando la nuova è già in coda e ammazza quella —
    // si vedeva come "il motore ha finito ma non ha reso nessuna immagine".
    // Qui si lascia finire e si segna che ne serve un'altra dopo.
    if (S.lavoro) {
      S.daRifare = true;
      dico("Finisco questa, poi rifaccio con quello che hai scritto.");
      return;
    }

    dico("Sogno…");
    const inglese = await inInglese(testo);
    const [larghezza, altezza] = formato.value.split("x").map(Number);
    if (!S.seme) S.seme = Math.floor(Math.random() * 2 ** 31);

    let id;
    try {
      const r = await fetch(`${S.motore}/prompt`, {
        method: "POST",
        headers: json(),
        body: JSON.stringify({
          prompt: grafo(inglese, testoNegativo(), larghezza, altezza, S.seme, +passi.value),
        }),
      });
      const esito = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(esito.node_errors ?? esito.error ?? esito));
      id = esito.prompt_id;
    } catch (e) {
      dico(`Il motore non ha accettato il sogno: ${e?.message || e}`, true);
      return;
    }

    S.lavoro = id;
    await aspetta(id);
  }

  /**
   * Aspetta che il motore finisca, guardando la sua storia.
   *
   * Non dal WebSocket: qui basta sapere *quando è pronta*, e una richiesta ogni
   * mezzo secondo per una decina di secondi costa meno di una connessione da
   * tenere viva e riattaccare a ogni caduta.
   */
  async function aspetta(id) {
    for (let i = 0; i < 600; i++) {
      await new Promise((ok) => setTimeout(ok, 500));
      let uscite;
      try {
        const storia = await (await fetch(`${S.motore}/history/${id}`, { cache: "no-store" })).json();
        uscite = storia[id]?.outputs;
      } catch {
        continue;
      }
      if (!uscite) continue;

      const file = Object.values(uscite).flatMap((u) => u.images || [])[0];
      if (file) {
        const q = new URLSearchParams({
          filename: file.filename,
          subfolder: file.subfolder || "",
          type: file.type || "output",
          t: String(Date.now()),
        });
        img.src = `${S.motore}/view?${q}`;
        img.classList.add("anima-on");
        zitto();
      } else {
        dico("Il motore ha finito ma non ha reso nessuna immagine: guarda il log.", true);
      }
      finito();
      return;
    }
    dico("Il motore ci sta mettendo troppo: guarda il log.", true);
    finito();
  }

  /** Chiude il lavoro e, se nel frattempo hai riscritto, ne comincia un altro. */
  function finito() {
    S.lavoro = null;
    if (!S.daRifare) return;
    S.daRifare = false;
    if (S.acceso) void genera();
  }

  /* ------------------------------------------------------------- ascoltini */

  riga.querySelectorAll(".anima-modello").forEach((b) => {
    b.onclick = () => void scegli(b.dataset.modello);
  });

  riga.querySelector("#anima-rigenera").onclick = () => void genera();
  riga.querySelector("#anima-dado").onclick = () => {
    S.seme = Math.floor(Math.random() * 2 ** 31);
    void genera();
  };
  passi.oninput = () => {
    riga.querySelector("#anima-passi-val").textContent = passi.value;
  };
  formato.onchange = () => void genera();

  // **Si scrive e si rigenera.** Non a ogni tasto: si aspetta che la mano si
  // fermi, altrimenti una frase di dieci parole diventerebbe dieci immagini.
  document.getElementById("prompt-sogno")?.addEventListener("input", () => {
    if (!S.acceso) return;
    const testo = testoPrompt();
    if (testo === S.ultimoTesto) return;
    S.ultimoTesto = testo;
    clearTimeout(S.attesa);
    S.attesa = setTimeout(() => void genera(), 1200);
  });
})();
