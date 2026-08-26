/**
 * La scheda Storia: mezz'ora di video, un'inquadratura per volta.
 *
 * **Cosa non è.** Non è un modello che genera mezz'ora di seguito: quello, al 22
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
 *
 * ---
 *
 * **Cosa è cambiato nella 0.6.0, e perché.** La scheda funzionava e si vedeva
 * pochissimo. Quattro cose, tutte trovate usandola davvero:
 *
 * - **la barra non c'era.** Una clip sono minuti, e per tutti quei minuti
 *   l'elenco diceva «in attesa». Il tempo compariva solo a scena finita. Adesso
 *   ogni inquadratura ha la sua barra e il suo passo — «genero il movimento»,
 *   «rendo il suono» — presi dal WebSocket del motore, gli stessi che vede il
 *   pannello Sessione;
 * - **il video non si vedeva.** Finiva sul disco e per guardarlo bisognava
 *   andare in Galleria. Adesso la clip compare nella sua riga appena esce;
 * - **il film aspettava un bottone.** Chi lascia lavorare il PC tutta la notte
 *   non è lì alle quattro per premere «cuci». Adesso si cuce da solo quando
 *   l'ultima scena è pronta, e il bottone resta per rifarlo;
 * - **modello e misura erano quelli della scheda Crea.** In Crea si prova, e
 *   provare vuol dire 480p. Adesso la Storia ha la sua resa — vedi
 *   `storia-resa.js`.
 */

import { durata, el, escapeHtml } from "./dom.js";
import { FASI, NEGATIVO, grafoClip, secondiVeri } from "./grafi.js";
import { faiSpazio } from "./memoria.js";
import { osservaLavoro } from "./coda.js";
import {
  collegaResaStoria,
  misuraStoria,
  modelloStoria,
  modoStoria,
  resaProntaStoria,
} from "./storia-resa.js";
import {
  collegaRiferimentiStoria,
  contaRiferimenti,
  riferimentiPerIlGrafo,
  riferimentiPerIlModello,
} from "./storia-riferimenti.js";
import * as ponte from "./ponte.js";
import { faiLaCopertina } from "./copertina.js";
// Il selettore del modello che scrive è di tutte le app: sta in `packages/ui` e
// la suite lo serve sotto `/comune/`, dalla stessa origine della pagina.
import { collegaSelettoreLlm, modelloScelto } from "/comune/selettore-llm.js";
// La finestrella coi token in diretta, anche lei comune: un modello che ragiona
// per due minuti dietro a un tasto spento è indistinguibile da uno piantato.
import { chiediMostrando } from "/comune/pensiero-llm.js";
// La lista che si aggiorna senza rifarsi da capo. Qui serve più che altrove:
// ogni riga ha una casella di testo e — da adesso — un lettore video, e
// ridisegnare tutto mentre stai correggendo la scena 34 vorrebbe dire perdere
// il cursore e far ripartire da capo il video che stavi guardando.
import { disegnaLista } from "/comune/lista-viva.js";

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

/** Quello che si aggiunge alle istruzioni quando ci sono immagini allegate. */
const SISTEMA_CON_IMMAGINI = `

TI HANNO DATO DELLE IMMAGINI DI RIFERIMENTO:
- Guardale. Sono il personaggio, il posto o la luce che questa storia deve avere.
- Nei prompt DESCRIVI QUELLO CHE VEDI in quelle immagini, con parole inglesi
  precise: età e corporatura, colore e taglio dei capelli, vestiti, materiali,
  ora del giorno, tipo di luce. Il modello video le immagini non le vede: legge
  solo le tue parole, quindi tutto quello che non scrivi va perduto.
- Ripeti la stessa descrizione in ogni scena in cui quel personaggio o quel
  posto compare, con le stesse identiche parole.`;

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

/**
 * L'avanzamento delle scene, che **non** si salva.
 *
 * È vivo solo mentre il motore lavora: la barra, il passo, l'orologio di questa
 * clip. Salvarlo vorrebbe dire riaprire l'app e vedere una barra a metà di un
 * lavoro che non esiste più.
 */
const vivi = new Map();
/** Il battito che fa scorrere barre e orologi mentre si genera. */
let battito = null;

function vuota() {
  return {
    soggetto: "",
    minuti: 5,
    secondiScena: 8,
    /** Cuci il film da solo quando l'ultima scena è pronta. */
    auto: true,
    scene: [],
    film: null,
  };
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

const vivo = (i) => {
  if (!vivi.has(i)) vivi.set(i, { avanzamento: 0, passo: "", inizio: null });
  return vivi.get(i);
};

/* -------------------------------------------------------------- i due conti */

/** Quante inquadrature servono per i minuti chiesti, con la durata scelta. */
function quanteScene() {
  const veri = secondiVeri(storia.secondiScena, modelloStoria());
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

/** «2,4 ore», «35 minuti». Le ore sotto le tre si scrivono col decimale. */
function inOre(secondi) {
  return secondi < 3600
    ? `${Math.round(secondi / 60)} minuti`
    : `${(secondi / 3600).toFixed(1).replace(".", ",")} ore`;
}

function raccontaConto() {
  const scene = quanteScene();
  const { media, totale, vera } = quantoCiVuole(scene);
  const secondi = secondiVeri(storia.secondiScena, modelloStoria());
  const misura = misuraStoria();

  el.storiaConto.innerHTML =
    `<b>${scene} inquadrature</b> da ${secondi.toFixed(1).replace(".", ",")} s, ` +
    `${misura.larghezza}x${misura.altezza}. ` +
    `Circa <b>${escapeHtml(inOre(totale))}</b> di generazione — ` +
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
    // e non si tocca nemmeno per riscriverlo uguale. Il video, una volta messo,
    // resta lo stesso nodo: rifarlo lo farebbe ripartire da capo.
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
  el.storiaGenera.disabled = inCorso || !storia.scene.length || !resaProntaStoria();
  el.storiaFerma.disabled = !inCorso;
  // Si cuce solo quando ci sono tutte: un film con tre buchi in mezzo non è una
  // bozza da guardare, sono minuti di ricodifica buttati.
  el.storiaCuci.disabled = inCorso || !storia.scene.length || fatte !== storia.scene.length;
  el.storiaCuci.textContent = storia.film ? "ricuci il film" : "cuci il film";

  disegnaAvanzamentoTotale(fatte);

  // Il film si carica una volta sola: riscrivere `src` con lo stesso valore
  // fa ripartire il lettore da capo, e mezz'ora di film che riparte da sola
  // ogni mezzo secondo non si guarda.
  el.storiaFilm.hidden = !storia.film;
  if (storia.film && el.storiaFilmVideo.dataset.per !== storia.film) {
    el.storiaFilmVideo.dataset.per = storia.film;
    el.storiaFilmVideo.src = ponte.vista(pezziDelPercorso(storia.film));
  }
}

/**
 * La barra sopra l'elenco: a che punto è **il film**, non la clip.
 *
 * Le due cose sono diverse e servono tutte e due: la clip dice se il motore si
 * è piantato adesso, il film dice se andare a dormire. Il conto tiene dentro
 * anche la frazione della scena in corso, se no la barra salterebbe di un
 * novantesimo ogni cinque minuti e per tutto il resto starebbe ferma.
 */
function disegnaAvanzamentoTotale(fatte) {
  const totali = storia.scene.length;
  if (!totali) {
    el.storiaBarra.hidden = true;
    el.storiaAvanti.textContent = "";
    return;
  }

  const corrente = storia.scene.findIndex((s) => !s.file);
  const frazione = corrente >= 0 && inCorso ? vivo(corrente).avanzamento : 0;
  const quota = Math.min(1, (fatte + frazione) / totali);

  el.storiaBarra.hidden = false;
  el.storiaBarra.firstElementChild.style.width = `${(quota * 100).toFixed(1)}%`;

  if (!inCorso) {
    el.storiaAvanti.textContent = fatte === totali && totali
      ? "Tutte fatte."
      : `${fatte} di ${totali} inquadrature pronte.`;
    return;
  }

  const { media } = quantoCiVuole(totali);
  const restano = Math.max(0, (totali - fatte - frazione) * media);
  el.storiaAvanti.textContent =
    `Scena ${Math.min(corrente + 1, totali)} di ${totali} · ${Math.round(quota * 100)}%` +
    (restano > 60 ? ` · ancora ~${inOre(restano)}` : "");
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
      const i = Number(b.dataset.rifai);
      const s = storia.scene[i];
      s.file = null;
      s.errore = null;
      s.secondi = 0;
      vivi.delete(i);
      storia.film = null;
      salva();
      disegnaScene();
    };
  }
}

/**
 * Lo stato della scena, il tasto «rifai», la barra e il video: quello che
 * cambia da sé.
 *
 * Il nodo resta lo stesso, sempre. Il video in particolare si crea **una volta
 * sola**, quando il file compare: rifarlo a ogni giro vorrebbe dire un lettore
 * che riparte da capo ogni secondo, che è il difetto che il pannello Sessione
 * aveva già avuto e che è costato la 0.4.4.
 */
function aggiornaRiga(nodo, s, i) {
  const v = vivo(i);

  const testa = nodo.querySelector(".testa");
  if (testa) testa.innerHTML = `<b>${escapeHtml(s.titolo || `Scena ${i + 1}`)}</b> ${stato(s, i)}`;

  const barra = nodo.querySelector(".scena-barra");
  const passo = nodo.querySelector(".scena-passo");
  const lavora = inCorso && !s.file && v.inizio !== null;
  if (barra) {
    barra.hidden = !lavora;
    barra.firstElementChild.style.width = `${(v.avanzamento * 100).toFixed(1)}%`;
  }
  if (passo) {
    passo.hidden = !lavora;
    if (lavora) {
      const passati = Math.floor((Date.now() - v.inizio) / 1000);
      const restano = v.avanzamento > 0.05 ? Math.round(passati / v.avanzamento - passati) : null;
      passo.textContent =
        `${v.passo || "avvio"} · ${durata(passati)}` +
        (restano !== null ? ` · ~${durata(restano)} alla fine` : "");
    }
  }

  const lato = nodo.querySelector(".lato");
  const gia = Boolean(lato && lato.querySelector("[data-rifai]"));
  if (lato && Boolean(s.file) !== gia) {
    lato.innerHTML = s.file ? `<button class="mini" data-rifai="${i}">rifai</button>` : "";
    collegaRighe();
  }

  // Il video appena c'è, e mai due volte.
  const posto = nodo.querySelector(".scena-video");
  if (posto && s.file && posto.dataset.per !== s.file) {
    posto.dataset.per = s.file;
    posto.hidden = false;
    posto.innerHTML = `<video src="${escapeHtml(ponte.vista(pezziDelPercorso(s.file)))}"
      controls preload="metadata" playsinline></video>`;
  }
}

function stato(s, i) {
  if (s.file) return `<span class="fatta">fatta${s.secondi ? ` &middot; ${durata(s.secondi)}` : ""}</span>`;
  if (s.errore) return `<span class="rotta" title="${escapeHtml(s.errore)}">non riuscita</span>`;
  if (inCorso && vivo(i).inizio !== null) return `<span class="lavora">in lavorazione</span>`;
  return `<span class="attesa">in attesa</span>`;
}

function riga(s, i) {
  return `<div class="scena">
    <div class="numero">${i + 1}</div>
    <div class="corpo">
      <div class="testa"><b>${escapeHtml(s.titolo || `Scena ${i + 1}`)}</b> ${stato(s, i)}</div>
      <textarea rows="2" data-scena="${i}">${escapeHtml(s.prompt)}</textarea>
      <div class="scena-barra" hidden><i></i></div>
      <div class="scena-passo" hidden></div>
      <div class="scena-video" hidden></div>
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

  const llm = await suiteLlmStato();
  if (!llm.acceso) return dilloQui(llm.motivo || "LM Studio non risponde.");

  const scene = quanteScene();
  el.storiaScrivi.disabled = true;
  dilloQui(`Sto scrivendo ${scene} inquadrature…`);

  try {
    // Le immagini e gli audio allegati vanno **al modello**, non solo al grafo:
    // è la differenza fra uno storyboard che descrive la faccia che gli hai
    // mostrato e uno che se la inventa. Se il modello caricato non sa vedere,
    // LM Studio risponde di no e il motivo arriva scritto qui sotto.
    const allegati = await riferimentiPerIlModello();
    const immagini = allegati.filter((a) => a.genere === "immagine").length;

    const esito = await chiediMostrando(
      el.storiaPensiero,
      {
        modello: modelloScelto(),
        sistema: SISTEMA + (immagini ? SISTEMA_CON_IMMAGINI : ""),
        utente:
          `Spezza questo soggetto in ESATTAMENTE ${scene} inquadrature, in ordine.\n\n` +
          `Soggetto:\n${soggetto}\n\n` +
          (immagini
            ? `Ti allego ${immagini} immagini di riferimento: sono il personaggio, il posto o la luce di questa storia.\n\n`
            : "") +
          `Ogni inquadratura dura circa ${Math.round(secondiVeri(storia.secondiScena, modelloStoria()))} secondi: ` +
          `una cosa sola per scena, niente scene che raccontano mezza storia.`,
        schema: SCHEMA,
        nomeSchema: "storyboard",
        allegati,
      },
      { titolo: `Sto scrivendo ${scene} inquadrature` },
    );
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
    vivi.clear();
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

const suiteLlmStato = () => window.daprodSuite.llm.stato();

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
  avviaBattito();
  disegnaScene();

  const m = modelloStoria();
  const misura = misuraStoria();
  const modo = modoStoria();
  const rif = riferimentiPerIlGrafo(m);

  // La scheda si sgombra una volta, all'inizio: dentro il giro il motore ha
  // sempre qualcosa in mano e `faiSpazio` non toccherebbe niente comunque.
  await faiSpazio((testo) => dilloQui(testo));

  try {
    for (let i = 0; i < storia.scene.length; i++) {
      if (!inCorso) break;
      const s = storia.scene[i];
      if (s.file) continue;

      dilloQui(`Scena ${i + 1} di ${storia.scene.length}…`);
      s.errore = null;
      const v = vivo(i);
      v.avanzamento = 0;
      v.passo = "in coda";
      v.inizio = Date.now();
      const partito = Date.now();
      disegnaScene();

      try {
        const id = await ponte.invia(
          grafoClip(m, {
            prompt: s.prompt,
            larghezza: misura.larghezza,
            altezza: misura.altezza,
            misura: misura.etichetta,
            secondi: storia.secondiScena,
            passi: modo.passi.valore,
            negativo: NEGATIVO,
            seed: Math.floor(Math.random() * 2 ** 31),
            lora: modo.lora,
            // Solo H3 ha questi ingressi: con LTX `riferimentiPerIlGrafo`
            // risponde vuoto e il grafo non li collega nemmeno.
            immagini: rif.immagini,
            audio: rif.audio,
          }),
        );
        s.file = await aspetta(id, i);
        s.secondi = Math.round((Date.now() - partito) / 1000);
        storia.film = null;
        // I parametri restano accanto alla clip, come per i video della scheda
        // Crea: «com'è che l'avevo fatta?» è una domanda senza risposta il
        // giorno dopo, e su novanta clip è la domanda che ci si fa davvero.
        void scriviMetaClip(s, i, m, misura);
      } catch (e) {
        s.errore = String(e.message || e);
      }

      v.inizio = null;
      salva();
      disegnaScene();
      raccontaConto();
    }

    const mancano = storia.scene.filter((s) => !s.file).length;

    if (!inCorso) {
      dilloQui("Fermata. Quello che è fatto resta: ripremi Genera e riprende da lì.");
    } else if (mancano) {
      dilloQui(`Finito, ma ${mancano} scene non sono riuscite. Ripremi Genera e riprova solo quelle.`);
    } else if (storia.auto && storia.scene.length) {
      // **Il film si cuce da solo.** Chi lascia lavorare il PC tutta la notte
      // non è lì alle quattro del mattino per premere un bottone, e trovarsi
      // novanta clip sparse invece del film era il modo più sicuro di rendere
      // inutile una notte di scheda video.
      inCorso = false;
      disegnaScene();
      await cuci();
      return;
    } else {
      dilloQui("Tutte fatte. Adesso si può cucire.");
    }
  } finally {
    inCorso = false;
    fermaBattito();
    disegnaScene();
  }
}

/** I dati della clip nella libreria della suite, se la suite la conosce. */
async function scriviMetaClip(s, i, m, misura) {
  try {
    const pezzi = pezziDelPercorso(s.file);
    await ponte.scriviMeta(ponte.idLibreria(pezzi), {
      prompt: s.prompt,
      modello: m.nome,
      misura: misura.etichetta,
      secondi: secondiVeri(storia.secondiScena, m),
      secs: s.secondi,
      storia: storia.soggetto.slice(0, 120),
      scena: i + 1,
      ts: Date.now(),
    });
    // E la copertina, come per le clip di Crea: un video senza fotogramma è un
    // rettangolo nero, in galleria e sul telefono. Vedi `copertina.js`.
    void faiLaCopertina(ponte.idLibreria(pezzi), ponte.vista(pezzi));
  } catch {
    // La clip c'è comunque: i metadati sono un di più, non il risultato.
  }
}

/**
 * Aspetta che una clip esca, e restituisce il file.
 *
 * Due strade insieme, e servono tutte e due. Il **WebSocket** racconta a che
 * punto è — è l'unico che lo sappia, ed è quello che riempie la barra della
 * scena. La **cronologia**, chiesta ogni due secondi, dice se il file c'è: è
 * lenta ma non si perde niente, e se il socket si riapre a metà (succede) il
 * lavoro non resta appeso per sempre.
 */
async function aspetta(id, indice) {
  const v = vivo(indice);
  const smetti = osservaLavoro(id, (msg) => {
    const d = msg.data || {};
    switch (msg.type) {
      case "execution_start":
        v.inizio = v.inizio || Date.now();
        v.passo = "avvio";
        break;
      case "executing": {
        const fase = FASI[String(d.node)];
        if (!fase) break;
        v.passo = fase.label;
        // Mai indietro: i nodi non finiscono nell'ordine in cui li abbiamo
        // numerati, e una barra che torna indietro sembra un errore.
        v.avanzamento = Math.max(v.avanzamento, fase.da);
        break;
      }
      case "progress": {
        if (!d.max) break;
        const fase = FASI[String(d.node)] ?? FASI["6"];
        v.passo = fase.label;
        v.avanzamento = Math.max(
          v.avanzamento,
          fase.da + (fase.a - fase.da) * (d.value / d.max),
        );
        break;
      }
      case "execution_error":
        v.passo = d.exception_message || "il motore si è fermato";
        break;
      default:
        break;
    }
  });

  try {
    for (;;) {
      if (!inCorso) throw new Error("fermata");
      await new Promise((r) => setTimeout(r, 2000));

      const uscite = await ponte.risultati(id);
      const prodotti = Object.values(uscite).flatMap((o) => o.images ?? o.video ?? []);
      if (prodotti.length) {
        const f = prodotti[0];
        v.avanzamento = 1;
        return f.subfolder ? `${f.subfolder}/${f.filename}` : f.filename;
      }

      // Non è più in coda e non ha prodotto niente: è morto. Senza questo controllo
      // una scena fallita terrebbe ferma la storia per sempre.
      const ancoraInCoda = await ponte.lavoriVivi();
      if (!ancoraInCoda.has(id)) throw new Error(`la scena ${indice + 1} non ha prodotto niente`);
    }
  } finally {
    smetti();
  }
}

/**
 * Il battito che fa scorrere barre e orologi.
 *
 * Mezzo secondo, e solo mentre si genera: i messaggi del motore arrivano a
 * decine al secondo, e ridisegnare a ognuno farebbe scattare una pagina che ha
 * novanta caselle di testo dentro.
 */
function avviaBattito() {
  fermaBattito();
  // Si ridisegna a tempo e non a ogni messaggio del motore: i messaggi arrivano
  // a decine al secondo, e il tempo deve scorrere anche quando il motore tace —
  // se la riga «2:14» sta ferma, sembra di nuovo che sia tutto piantato.
  battito = setInterval(disegnaScene, 500);
}

function fermaBattito() {
  if (battito) clearInterval(battito);
  battito = null;
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
    dilloQui("Fatto. Il film è qui sotto, e lo trovi anche nella Galleria.");
  } catch (e) {
    dilloQui(String(e.message || e));
  } finally {
    disegnaScene();
  }
}

/* -------------------------------------------------------------- l'aggancio */

export async function collegaStoria() {
  collegaSelettoreLlm(el.storiaLlm);

  // La resa della Storia è sua: modello, forma, risoluzione e qualità. Quando
  // cambia, il conto delle inquadrature e delle ore cambia con lei.
  await collegaResaStoria(() => {
    raccontaConto();
    disegnaScene();
  });

  collegaRiferimentiStoria(
    el.storiaRifElenco,
    el.storiaRifAggiungi,
    el.storiaRifFile,
    () => raccontaRiferimenti(),
    dilloQui,
  );
  raccontaRiferimenti();

  el.storiaSoggetto.value = storia.soggetto;
  el.storiaMinuti.value = storia.minuti;
  el.storiaSecondi.value = storia.secondiScena;
  el.storiaAuto.checked = storia.auto !== false;

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

  el.storiaAuto.onchange = () => {
    storia.auto = el.storiaAuto.checked;
    salva();
  };

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
    vivi.clear();
    salva();
    el.storiaSoggetto.value = "";
    el.storiaMinuti.value = storia.minuti;
    el.storiaSecondi.value = storia.secondiScena;
    el.storiaAuto.checked = true;
    delete el.storiaFilmVideo.dataset.per;
    el.storiaFilmVideo.removeAttribute("src");
    disegnaScene();
    raccontaConto();
    dilloQui("");
  };

  disegnaScene();
  raccontaConto();
}

/** La riga che dice a cosa servono i riferimenti **con il modello scelto adesso**. */
function raccontaRiferimenti() {
  const { immagini, audio } = contaRiferimenti();
  const m = modelloStoria();
  if (!immagini && !audio) {
    el.storiaRifRiga.textContent =
      "Chi scrive le scene li guarda, se il modello di LM Studio sa vedere. " +
      "Con MiniMax H3 finiscono anche dentro ogni inquadratura.";
    return;
  }
  const quanti = [
    immagini ? `${immagini} ${immagini === 1 ? "immagine" : "immagini"}` : null,
    audio ? `${audio} audio` : null,
  ]
    .filter(Boolean)
    .join(" e ");

  el.storiaRifRiga.textContent =
    m.ingressi === "riferimenti"
      ? `${quanti}: li guarda chi scrive le scene, e H3 li usa dentro ogni inquadratura.`
      : `${quanti}: li guarda chi scrive le scene. Nel video non entrano — LTX 2.5 non ha ingressi per i riferimenti, ce li ha MiniMax H3.`;
}

/**
 * Il conto va rifatto anche cambiando modello nella scheda Crea?
 *
 * **No, e da questa versione è giusto così.** La Storia ha la sua resa: quello
 * che si sceglie in Crea non la tocca più. La funzione resta esportata perché
 * `crea.js` la chiama, e chiamarla non fa danno — rilegge i conti suoi.
 */
export const storiaRileggiConti = () => raccontaConto();
