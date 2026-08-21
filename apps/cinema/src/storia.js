/**
 * La scheda Storia: mezz'ora di video, un'inquadratura per volta.
 *
 * **Cosa non è.** Non è un modello che genera mezz'ora di seguito: quello, al 21
 * agosto 2026, non esiste su una scheda da 8 GB — vedi `docs/ROADMAP.md`, che
 * spiega perché incatenare le clip deriva dopo poche giunture. Un film però non
 * è mai stato una ripresa sola: sono cento inquadrature con gli stacchi in
 * mezzo. Cento inquadrature sono cento clip, ed è esattamente quello che
 * DaProdCinema già sa fare.
 *
 * Quello che mancava sono tre cose, e sono queste:
 *
 * 1. **chi le scrive** — il modello di LM Studio spezza il soggetto in N scene,
 *    ognuna con il suo prompt in inglese e il suo movimento di camera;
 * 2. **chi le mette in fila** — una per volta, non tutte insieme: così una
 *    storia interrotta riprende da dove era invece di ricominciare;
 * 3. **chi le cuce** — `/daprod/cuci` nel motore, che è dove sta ffmpeg.
 *
 * **Una per volta, e il perché conta.** Mandare cento grafi al motore in un
 * colpo sembra più veloce ed è più fragile: la coda di ComfyUI non sopravvive a
 * un riavvio, e un errore a metà lascia novanta lavori orfani che continuano a
 * occupare la scheda. Con una per volta lo stato vero è l'elenco qui sotto, che
 * sta nel `localStorage`: si chiude l'app, si riapre, si riprende.
 *
 * ⚠ **Il tempo va detto prima.** Dai video generati il 21 agosto passano fra i
 * due e i cinque minuti per clip. Mezz'ora di film sono novanta-centoventi
 * inquadrature, cioè **una notte di lavoro**. La riga sotto ai cursori lo scrive
 * in ore prima che tu prema, non dopo.
 */

import { durata, el, escapeHtml } from "./dom.js";
import { NEGATIVO, grafoClip, secondiVeri } from "./grafi.js";
import { modelloCorrente, modelloUsabile, modoCorrente } from "./scelta-modello.js";
import { misuraScelta } from "./formato.js";
import * as ponte from "./ponte.js";
// Il selettore del modello che scrive è di tutte le app: sta in `packages/ui` e
// la suite lo serve sotto `/comune/`, dalla stessa origine della pagina.
import { collegaSelettoreLlm, modelloScelto } from "/comune/selettore-llm.js";
// La lista che si aggiorna senza rifarsi da capo. Qui serve più che altrove:
// ogni riga ha una casella di testo, e ridisegnare tutto mentre stai correggendo
// la scena 34 vorrebbe dire perdere il cursore ogni volta che una clip finisce.
import { disegnaLista } from "/comune/lista-viva.js";

const suite = window.daprodSuite;
const RICORDO = "daprod.cinema.storia";

/**
 * Le istruzioni al modello che scrive.
 *
 * Scritte come quelle di Bonsai in DaProdMusica, e per la stessa ragione: un
 * modello locale da pochi miliardi di parametri va **guidato**, non pregato. Le
 * due cose che sbaglia sempre, se non gliele si vieta, sono scrivere i prompt in
 * italiano — e i modelli video capiscono l'inglese — e raccontare la trama
 * invece di descrivere quello che si vede.
 */
const SISTEMA = `Sei uno storyboard artist. Spezzi un soggetto in inquadrature per un modello di generazione video.

REGOLA PIÙ IMPORTANTE — LA LINGUA:
- Ogni prompt va scritto in INGLESE. Nessuna parola italiana dentro i prompt.
- Il titolo della scena invece in italiano, corto: serve solo a riconoscerla in un elenco.

COSA DEVE ESSERCI IN OGNI PROMPT:
- Quello che si VEDE, non quello che succede nella trama. Un modello video non sa
  cosa sia "il protagonista capisce di aver sbagliato": sa cos'è "a man stops
  walking, looks down, rain on his shoulders".
- SEMPRE il movimento di camera, con le parole che questi modelli conoscono:
  "static wide shot", "slow push in", "handheld follow", "low angle tracking shot",
  "slow pan left", "close up".
- La luce e l'ora del giorno: "golden hour", "overcast morning", "neon night".
- Se c'è un personaggio ricorrente, RIDESCRIVILO IDENTICO in ogni scena in cui
  compare, con le stesse parole: stessa età, stessi vestiti, stessi capelli. È
  l'unico modo che il modello ha di ritrovarlo, perché ogni inquadratura la
  genera da zero senza ricordarsi delle altre.
- Una inquadratura sola per scena. Niente "poi", niente "dopo di che": se serve
  un secondo momento, è la scena successiva.

COSA NON DEVE ESSERCI:
- Dialoghi, sottotitoli, scritte sullo schermo.
- Numeri di scena o didascalie dentro il prompt.`;

/** La forma della risposta, imposta al modello e non chiesta per favore. */
const SCHEMA = {
  type: "object",
  properties: {
    scene: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titolo: { type: "string" },
          prompt: { type: "string" },
        },
        required: ["titolo", "prompt"],
      },
    },
  },
  required: ["scene"],
};

/** Lo stato della storia, che è anche quello che si salva sul disco del browser. */
let storia = leggi();
/** Vero mentre il giro di generazione sta andando: lo spegne «Ferma». */
let inCorso = false;

function vuota() {
  return { soggetto: "", minuti: 5, secondiScena: 8, scene: [], film: null };
}

function leggi() {
  try {
    const forse = JSON.parse(localStorage.getItem(RICORDO) || "null");
    return forse && Array.isArray(forse.scene) ? { ...vuota(), ...forse } : vuota();
  } catch {
    return vuota();
  }
}

function salva() {
  try {
    localStorage.setItem(RICORDO, JSON.stringify(storia));
  } catch {
    // Storage pieno o negato: la storia resta in memoria per questa sessione,
    // che è meglio che perdere il giro in corso per un errore di salvataggio.
  }
}

/* -------------------------------------------------------------- i due conti */

/** Quante inquadrature servono per i minuti chiesti, con la durata scelta. */
function quanteScene() {
  const veri = secondiVeri(storia.secondiScena, modelloCorrente());
  return Math.max(1, Math.round((storia.minuti * 60) / veri));
}

/**
 * Quanto ci vuole, detto in ore.
 *
 * Non è una stima del motore: è **il tempo vero delle scene già fatte**, se ce
 * ne sono, e tre minuti a testa finché non ce n'è nemmeno una. Una stima
 * inventata su un lavoro che dura una notte è peggio di nessuna stima.
 */
function quantoCiVuole(scene) {
  const misurate = storia.scene.filter((s) => s.secondi > 0);
  const media = misurate.length
    ? misurate.reduce((t, s) => t + s.secondi, 0) / misurate.length
    : 180;
  return { media, totale: media * scene, vera: misurate.length > 0 };
}

function raccontaConto() {
  const scene = quanteScene();
  const { media, totale, vera } = quantoCiVuole(scene);
  const secondi = secondiVeri(storia.secondiScena, modelloCorrente());
  const quanto = totale < 3600
    ? `${Math.round(totale / 60)} minuti`
    : `${(totale / 3600).toFixed(1).replace(".", ",")} ore`;

  el.storiaConto.innerHTML =
    `<b>${scene} inquadrature</b> da ${secondi.toFixed(1).replace(".", ",")} s. ` +
    `Circa <b>${escapeHtml(quanto)}</b> di generazione — ` +
    (vera
      ? `sui tempi delle scene già fatte, ${durata(Math.round(media))} l'una.`
      : `a tre minuti a scena, finché non ce n'è una vera da misurare.`);
}

/* ------------------------------------------------------------------ l'elenco */

function disegnaScene() {
  const fatte = storia.scene.filter((s) => s.file).length;

  const voci = storia.scene.map((s, i) => ({
    chiave: `scena:${i}`,
    html: riga(s, i),
    // Solo lo stato cambia mentre si genera: il testo della scena è dell'utente,
    // e non si tocca nemmeno per riscriverlo uguale.
    aggiorna: (nodo) => aggiornaRiga(nodo, s, i),
  }));
  if (!voci.length) {
    voci.push({
      chiave: "vuoto",
      html: `<div class="empty">Nessuna scena. Scrivi il soggetto qui sopra e premi <b>Scrivi le scene</b>.</div>`,
    });
  }

  if (disegnaLista(el.storiaElenco, voci)) collegaRighe();

  el.storiaFatte.textContent = storia.scene.length ? `${fatte} di ${storia.scene.length}` : "";
  el.navStoria.textContent = storia.scene.length;
  el.storiaGenera.disabled = inCorso || !storia.scene.length || !modelloUsabile();
  el.storiaFerma.disabled = !inCorso;
  // Si cuce solo quando ci sono tutte: un film con tre buchi in mezzo non è una
  // bozza da guardare, sono minuti di ricodifica buttati.
  el.storiaCuci.disabled = inCorso || !storia.scene.length || fatte !== storia.scene.length;

  el.storiaFilm.hidden = !storia.film;
  if (storia.film) el.storiaFilmVideo.src = ponte.vista(pezziDelPercorso(storia.film));
}

function collegaRighe() {
  for (const casella of el.storiaElenco.querySelectorAll("[data-scena]")) {
    casella.oninput = () => {
      storia.scene[Number(casella.dataset.scena)].prompt = casella.value;
      salva();
    };
  }
  for (const b of el.storiaElenco.querySelectorAll("[data-rifai]")) {
    b.onclick = () => {
      const s = storia.scene[Number(b.dataset.rifai)];
      s.file = null;
      s.errore = null;
      s.secondi = 0;
      storia.film = null;
      salva();
      disegnaScene();
    };
  }
}

/** Lo stato della scena e il tasto «rifai»: quello che cambia da sé. */
function aggiornaRiga(nodo, s, i) {
  const testa = nodo.querySelector(".testa");
  if (testa) testa.innerHTML = `<b>${escapeHtml(s.titolo || `Scena ${i + 1}`)}</b> ${stato(s)}`;

  const lato = nodo.querySelector(".lato");
  const gia = Boolean(lato && lato.querySelector("[data-rifai]"));
  if (lato && Boolean(s.file) !== gia) {
    lato.innerHTML = s.file ? `<button class="mini" data-rifai="${i}">rifai</button>` : "";
    collegaRighe();
  }
}

function stato(s) {
  if (s.file) return `<span class="fatta">fatta${s.secondi ? ` &middot; ${durata(s.secondi)}` : ""}</span>`;
  if (s.errore) return `<span class="rotta" title="${escapeHtml(s.errore)}">non riuscita</span>`;
  return `<span class="attesa">in attesa</span>`;
}

function riga(s, i) {
  return `<div class="scena">
    <div class="numero">${i + 1}</div>
    <div class="corpo">
      <div class="testa"><b>${escapeHtml(s.titolo || `Scena ${i + 1}`)}</b> ${stato(s)}</div>
      <textarea rows="2" data-scena="${i}">${escapeHtml(s.prompt)}</textarea>
    </div>
    <div class="lato">${s.file ? `<button class="mini" data-rifai="${i}">rifai</button>` : ""}</div>
  </div>`;
}

/**
 * Il percorso che torna dal motore, spezzato come lo vuole `/view`.
 *
 * ComfyUI chiede la cartella e il nome separati, e quello che gira dentro la
 * storia è un percorso solo — perché è così che va anche a `/daprod/cuci`.
 */
function pezziDelPercorso(percorso) {
  const taglio = percorso.lastIndexOf("/");
  return {
    subfolder: taglio < 0 ? "" : percorso.slice(0, taglio),
    filename: percorso.slice(taglio + 1),
    type: "output",
  };
}

/* -------------------------------------------------- il modello che scrive */

async function scriviScene() {
  const soggetto = el.storiaSoggetto.value.trim();
  if (!soggetto) return dilloQui("Scrivi in qualche riga cosa deve raccontare.");

  const llm = await suite.llm.stato();
  if (!llm.acceso) return dilloQui(llm.motivo || "LM Studio non risponde.");

  const scene = quanteScene();
  el.storiaScrivi.disabled = true;
  dilloQui(`Sto scrivendo ${scene} inquadrature…`);

  try {
    const esito = await suite.llm.chiedi({
      modello: modelloScelto(),
      sistema: SISTEMA,
      utente:
        `Spezza questo soggetto in ESATTAMENTE ${scene} inquadrature, in ordine.\n\n` +
        `Soggetto:\n${soggetto}\n\n` +
        `Ogni inquadratura dura circa ${Math.round(secondiVeri(storia.secondiScena, modelloCorrente()))} secondi: ` +
        `una cosa sola per scena, niente scene che raccontano mezza storia.`,
      schema: SCHEMA,
      nomeSchema: "storyboard",
    });
    if (!esito.ok) return dilloQui(esito.motivo || "Il modello non ha risposto.");

    const dati = leggiJson(esito.testo);
    const arrivate = (dati?.scene ?? []).filter((s) => s && String(s.prompt || "").trim());
    if (!arrivate.length) return dilloQui("Il modello non ha scritto nessuna scena.");

    storia.soggetto = soggetto;
    storia.scene = arrivate.map((s) => ({
      titolo: String(s.titolo || "").trim(),
      prompt: String(s.prompt).trim(),
      file: null,
      errore: null,
      secondi: 0,
    }));
    storia.film = null;
    salva();
    disegnaScene();
    raccontaConto();
    dilloQui(
      arrivate.length === scene
        ? `${arrivate.length} inquadrature. Rileggile, cambia quello che vuoi, poi premi Genera.`
        : `Ne ha scritte ${arrivate.length} invece di ${scene}. Va bene lo stesso: la storia dura quello che dura.`,
    );
  } catch (e) {
    dilloQui(String(e.message || e));
  } finally {
    el.storiaScrivi.disabled = false;
  }
}

/**
 * Il JSON del modello, anche quando ci mette qualcosa attorno.
 *
 * Con lo schema imposto la risposta è pulita quasi sempre; il «quasi» sono i
 * modelli piccoli, che ogni tanto ci infilano davanti una riga di cortesia.
 */
function leggiJson(testo) {
  try {
    return JSON.parse(testo);
  } catch {
    const da = testo.indexOf("{");
    const a = testo.lastIndexOf("}");
    if (da < 0 || a <= da) return null;
    try {
      return JSON.parse(testo.slice(da, a + 1));
    } catch {
      return null;
    }
  }
}

function dilloQui(testo) {
  el.storiaStato.textContent = testo;
}

/* ------------------------------------------------------------- il giro lungo */

/**
 * Genera le scene che mancano, una per volta.
 *
 * Aspettare ogni clip prima di mandare la prossima non è più lento: la scheda ne
 * fa una alla volta comunque. È solo più recuperabile.
 */
async function generaStoria() {
  if (inCorso) return;
  inCorso = true;
  disegnaScene();

  const m = modelloCorrente();
  const misura = misuraScelta();

  try {
    for (let i = 0; i < storia.scene.length; i++) {
      if (!inCorso) break;
      const s = storia.scene[i];
      if (s.file) continue;

      dilloQui(`Scena ${i + 1} di ${storia.scene.length}…`);
      s.errore = null;
      const partito = Date.now();

      try {
        const id = await ponte.invia(
          grafoClip(m, {
            prompt: s.prompt,
            larghezza: misura.larghezza,
            altezza: misura.altezza,
            misura: misura.etichetta,
            secondi: storia.secondiScena,
            passi: Number(el.passi.value),
            negativo: NEGATIVO,
            seed: Math.floor(Math.random() * 2 ** 31),
            lora: modoCorrente().lora,
          }),
        );
        s.file = await aspetta(id, i);
        s.secondi = Math.round((Date.now() - partito) / 1000);
        storia.film = null;
      } catch (e) {
        s.errore = String(e.message || e);
      }

      salva();
      disegnaScene();
      raccontaConto();
    }

    const mancano = storia.scene.filter((s) => !s.file).length;
    dilloQui(
      !inCorso
        ? "Fermata. Quello che è fatto resta: ripremi Genera e riprende da lì."
        : mancano
          ? `Finito, ma ${mancano} scene non sono riuscite. Ripremi Genera e riprova solo quelle.`
          : "Tutte fatte. Adesso si può cucire.",
    );
  } finally {
    inCorso = false;
    disegnaScene();
  }
}

/**
 * Aspetta che una clip esca, e restituisce il file.
 *
 * Il motore parla anche via WebSocket, ma qui non serve: una storia è un giro
 * lungo e lento, e chiedere la cronologia ogni due secondi costa meno che tenere
 * due strade diverse per sapere la stessa cosa. Il pannello Sessione intanto fa
 * vedere l'avanzamento vero, perché per il motore è un lavoro come gli altri.
 */
async function aspetta(id, indice) {
  for (;;) {
    if (!inCorso) throw new Error("fermata");
    await new Promise((r) => setTimeout(r, 2000));

    const uscite = await ponte.risultati(id);
    const prodotti = Object.values(uscite).flatMap((o) => o.images ?? o.video ?? []);
    if (prodotti.length) {
      const f = prodotti[0];
      return f.subfolder ? `${f.subfolder}/${f.filename}` : f.filename;
    }

    // Non è più in coda e non ha prodotto niente: è morto. Senza questo controllo
    // una scena fallita terrebbe ferma la storia per sempre.
    const vivi = await ponte.lavoriVivi();
    if (!vivi.has(id)) throw new Error(`la scena ${indice + 1} non ha prodotto niente`);
  }
}

/* ------------------------------------------------------------------- cucire */

async function cuci() {
  el.storiaCuci.disabled = true;
  dilloQui("Cucio le scene in un film solo…");
  try {
    const esito = await ponte.cuci(
      storia.scene.map((s) => s.file),
      `video/daprodcinema/storia_${Date.now()}.mp4`,
    );
    if (!esito.ok) return dilloQui(esito.motivo || "La cucitura non è riuscita.");

    storia.film = esito.file;
    salva();
    dilloQui("Fatto. Il film sta accanto alle clip, e lo vede anche la Galleria.");
  } catch (e) {
    dilloQui(String(e.message || e));
  } finally {
    disegnaScene();
  }
}

/* -------------------------------------------------------------- l'aggancio */

export function collegaStoria() {
  collegaSelettoreLlm(el.storiaLlm);

  el.storiaSoggetto.value = storia.soggetto;
  el.storiaMinuti.value = storia.minuti;
  el.storiaSecondi.value = storia.secondiScena;

  el.storiaSoggetto.oninput = () => {
    storia.soggetto = el.storiaSoggetto.value;
    salva();
  };

  const rileggiConti = () => {
    storia.minuti = Math.max(1, Math.min(120, Number(el.storiaMinuti.value) || 1));
    storia.secondiScena = Math.max(2, Math.min(20, Number(el.storiaSecondi.value) || 8));
    salva();
    raccontaConto();
  };
  el.storiaMinuti.oninput = rileggiConti;
  el.storiaSecondi.oninput = rileggiConti;

  el.storiaScrivi.onclick = () => void scriviScene();
  el.storiaGenera.onclick = () => void generaStoria();
  el.storiaFerma.onclick = () => {
    inCorso = false;
    dilloQui("Mi fermo dopo la scena in corso…");
  };
  el.storiaCuci.onclick = () => void cuci();
  el.storiaAzzera.onclick = () => {
    if (!confirm("Buttare via questa storia? Le clip già generate restano nella Galleria.")) return;
    storia = vuota();
    salva();
    el.storiaSoggetto.value = "";
    el.storiaMinuti.value = storia.minuti;
    el.storiaSecondi.value = storia.secondiScena;
    disegnaScene();
    raccontaConto();
    dilloQui("");
  };

  disegnaScene();
  raccontaConto();
}

/**
 * Il conto va rifatto anche cambiando modello.
 *
 * La griglia dei fotogrammi è diversa fra LTX e H3 — `8n+1` contro `17k+5` — e
 * «8 secondi» sono due numeri di inquadrature diversi.
 */
export const storiaRileggiConti = () => raccontaConto();
