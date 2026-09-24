/**
 * La scheda 3D: dalla foto al modellino, con TRELLIS.2.
 *
 * ⚠ **Nuova nella 1.4.0.** Chiesto il 24 settembre 2026: «gli dai un'immagine e
 * il modello più efficiente possibile fa il modello con una bella texture, che
 * poi possiamo usare da aggiungere ai contenuti e ai giochi». Il perché di
 * TRELLIS.2 sta in `packages/ui/src/trellis.js`, col grafo.
 *
 * Il giro è quello del ritocco: si apre una foto (dal disco o fra le ultime
 * fatte), si sceglie quanto fine, si preme. Il motore stacca il soggetto dallo
 * sfondo, fa la forma in tre stadi, i colori nel quarto, e cuoce tutto su una
 * texture. Esce un **GLB**, il formato che three.js apre così com'è — lo stesso
 * dei modellini della Claw Machine — e lo si guarda qui, girandolo col dito.
 *
 * ⚠ **Il GLB non entra in galleria**, per ora: la libreria della suite conosce
 * immagini, brani e video, e un quarto tipo tocca il telefono, la console e la
 * sala giochi insieme. Quello che entra in galleria è **la texture**, salvata
 * come immagine accanto al modello: è la faccia del modellino. I modellini fatti
 * restano elencati qui sotto, e ognuno si scarica o si riapre.
 */

import { escapeHtml, rnd, occupa, libera, mostraScheda } from "./dom.js";
import { stato } from "./stato.js";
import { ascolta } from "./bus.js";
import { aggiungiLavoro, seguiLavoro } from "./coda.js";
import { faiSpazio } from "./memoria.js";
import * as ponte from "./ponte.js";
import { QUALITA, TAPPE_MODELLINO, TRELLIS2, avanzamentoModellino, grafoModellino } from "/comune/trellis.js";
import { collegaScaricamento } from "/comune/scaricamento.js";

const $ = (id) => document.getElementById(id);
const RICORDO = "daprod.foto.modellini";
const MOTORE = "http://127.0.0.1:8188";

let foto = null;
let qualita = "gioco";
let pronto = false;
let barra = null;
let visore = null;

/** I modellini fatti, dal più nuovo. Stanno nel browser: sono indirizzi di file. */
function modellini() {
  try {
    return JSON.parse(localStorage.getItem(RICORDO) || "[]");
  } catch {
    return [];
  }
}

function ricorda(voce) {
  const tutti = [voce, ...modellini().filter((m) => m.file !== voce.file)].slice(0, 24);
  localStorage.setItem(RICORDO, JSON.stringify(tutti));
}

const indirizzo = (m) =>
  `${MOTORE}/view?filename=${encodeURIComponent(m.file)}&subfolder=${encodeURIComponent(m.cartella || "")}&type=output`;

/* ------------------------------------------------------------------ visore */

/**
 * Il visore si accende la prima volta che serve: three.js sono settecento KB,
 * e chi apre DaProdFoto per fare una foto non deve caricarli.
 */
async function accendiVisore() {
  if (visore) return visore;
  const THREE = await import("/comune/vendor/three/three.module.js");
  const { OrbitControls } = await import("/comune/vendor/three/OrbitControls.js");
  const { GLTFLoader } = await import("/comune/vendor/three/GLTFLoader.js");
  const { RoomEnvironment } = await import("/comune/vendor/three/RoomEnvironment.js");

  const tela = $("tredTela");
  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, 0.4, 2.6);
  const comandi = new OrbitControls(camera, tela);
  comandi.enableDamping = true;
  comandi.autoRotate = true;
  comandi.autoRotateSpeed = 1.2;

  // Il piedistallo: un disco verde DaProd sotto al modellino, come in vetrina.
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.66, 0.05, 64),
    new THREE.MeshStandardMaterial({ color: 0x06140f, metalness: 0.6, roughness: 0.35, emissive: 0x00ff41, emissiveIntensity: 0.08 }),
  );
  base.position.y = -0.56;
  scena.add(base);

  const caricatore = new GLTFLoader();
  let attuale = null;

  function misura() {
    const w = tela.clientWidth || 400;
    const h = tela.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(misura).observe(tela);
  misura();

  renderer.setAnimationLoop(() => {
    comandi.update();
    renderer.render(scena, camera);
  });

  visore = {
    async mostra(url) {
      const gltf = await caricatore.loadAsync(url);
      if (attuale) scena.remove(attuale);
      attuale = gltf.scene;
      // Tutti alla stessa misura, appoggiati sul piedistallo: TRELLIS.2 li fa
      // in un cubo da -0,5 a 0,5, ma non è detto che ci stiano dritti.
      const scatola = new THREE.Box3().setFromObject(attuale);
      const lato = Math.max(...scatola.getSize(new THREE.Vector3()).toArray()) || 1;
      attuale.scale.setScalar(1 / lato);
      const dopo = new THREE.Box3().setFromObject(attuale);
      const centro = dopo.getCenter(new THREE.Vector3());
      attuale.position.sub(new THREE.Vector3(centro.x, dopo.min.y + 0.53, centro.z));
      scena.add(attuale);
    },
  };
  return visore;
}

/* ------------------------------------------------------------------- foto */

async function apriFoto(url) {
  const blob = await (await fetch(url)).blob();
  foto = blob;
  $("tredAnteprima").src = URL.createObjectURL(blob);
  $("tredAnteprima").hidden = false;
  $("tredVuota").hidden = true;
  accendiBottone();
}

function disegnaRecenti() {
  const ultime = (stato.immagini || []).slice(0, 8);
  $("tredRecenti").innerHTML = ultime
    .map((i) => `<img src="${escapeHtml(i.url)}" alt="" loading="lazy" data-apri="${escapeHtml(i.url)}" title="${escapeHtml(i.meta?.testo ?? i.nome)}">`)
    .join("");
}

function disegnaModellini() {
  const tutti = modellini();
  $("tredElenco").innerHTML = tutti.length
    ? tutti
        .map(
          (m, i) => `<div class="tred-voce">
            <button class="mini" data-guarda="${i}">guarda</button>
            <span>${escapeHtml(m.nome)}</span>
            <a class="mini" href="${escapeHtml(indirizzo(m))}" download="${escapeHtml(m.file)}">scarica .glb</a>
          </div>`,
        )
        .join("")
    : `<div class="hint">Qui compaiono i modellini che fai. Ognuno è un file .glb:
        lo apri in Blender, lo stampi in 3D, o lo metti in un gioco.</div>`;
}

function accendiBottone() {
  $("tredVai").disabled = !(pronto && foto);
}

/* --------------------------------------------------------------- il lavoro */

/**
 * La barra sotto il bottone (1.4.5): tappa, tempo, e una riga con tutte le
 * tappe, quella di adesso in evidenza. Si aggiorna da `seguiLavoro` (i messaggi
 * del motore) e ogni secondo per il tempo.
 */
function seguiIlModellino(id) {
  const scatola = $("tredAvanza");
  const inizio = Date.now();
  let tappa = 0;
  // La barra va solo avanti: dentro una tappa, il nodo dopo il campionatore
  // riparte da zero passi, e tornare indietro direbbe una bugia.
  let massimo = 0;
  scatola.hidden = false;
  const tempo = () => {
    const s = Math.floor((Date.now() - inizio) / 1000);
    $("tredTempo").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const disegna = (a) => {
    tappa = a.tappa;
    massimo = Math.max(massimo, a.quanto);
    $("tredFase").textContent = a.nome;
    $("tredBarra").style.width = `${(massimo * 100).toFixed(1)}%`;
    $("tredTappe").innerHTML = TAPPE_MODELLINO.map((t, i) =>
      i < a.tappa ? `<s>${escapeHtml(t.nome)}</s>` : i === a.tappa ? `<b>${escapeHtml(t.nome)}</b>` : escapeHtml(t.nome),
    ).join(" · ");
  };
  disegna(avanzamentoModellino(null, 0, 0));
  tempo();
  const orologio = setInterval(tempo, 1000);
  const smetti = seguiLavoro(id, (l) => {
    if (l.finito) return;
    if (l.stato !== "in-corso") {
      $("tredFase").textContent = "in coda, aspetto il motore";
      return;
    }
    disegna(avanzamentoModellino(l.nodo, l.avanzamento, tappa));
  });
  return (bene) => {
    clearInterval(orologio);
    smetti();
    if (bene) {
      $("tredBarra").style.width = "100%";
      $("tredFase").textContent = "fatto";
      setTimeout(() => (scatola.hidden = true), 2500);
    } else {
      scatola.hidden = true;
    }
  };
}

/** Aspetta che il motore abbia finito questo lavoro, e dice dov'è il GLB. */
async function aspettaIlModellino(id) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 2500));
    const storia = await (await fetch(`${MOTORE}/history/${id}`)).json().catch(() => ({}));
    const voce = storia[id];
    if (!voce) continue;
    if (voce.status?.status_str === "error") throw new Error("Il motore si è fermato a metà: guarda il log della suite.");
    for (const uscita of Object.values(voce.outputs || {})) {
      const glb = (uscita["3d"] || [])[0];
      if (glb) return glb;
    }
    if (voce.status?.completed) throw new Error("Il motore ha finito ma non ha scritto nessun modellino.");
  }
}

async function vai() {
  if (!foto) return;
  const bottone = $("tredVai");
  $("tredErrore").hidden = true;
  occupa(bottone, "preparo…");
  let chiudiBarra = null;
  try {
    const nome = await ponte.carica(foto, "modellino.png");
    const m = { id: "trellis2", nome: "TRELLIS.2", serveScheda: true, catalogo: TRELLIS2.catalogo };
    await faiSpazio(m, (detto) => occupa(bottone, detto));
    const grafo = grafoModellino({
      immagine: nome,
      seed: rnd(),
      qualita,
      sfondo: $("tredSfondo").checked,
      prefisso: "modellini/daprod",
    });
    occupa(bottone, "il motore lavora…");
    const id = await ponte.invia(grafo);
    aggiungiLavoro(id, `modellino 3D (${QUALITA[qualita].nome.toLowerCase()})`, { modello: "TRELLIS.2", tred: true }, grafo);
    chiudiBarra = seguiIlModellino(id);
    const glb = await aspettaIlModellino(id);
    chiudiBarra(true);
    chiudiBarra = null;
    const voce = {
      file: glb.filename,
      cartella: glb.subfolder,
      nome: `${new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })} · ${QUALITA[qualita].nome}`,
    };
    ricorda(voce);
    disegnaModellini();
    await (await accendiVisore()).mostra(indirizzo(voce));
  } catch (e) {
    $("tredErrore").hidden = false;
    $("tredErrore").textContent = String(e.message || e);
  } finally {
    if (chiudiBarra) chiudiBarra(false);
    libera(bottone);
    accendiBottone();
  }
}

/* ------------------------------------------------------------ collegamenti */

export function collegaTred() {
  const scelte = $("tredQualita");
  scelte.innerHTML = Object.entries(QUALITA)
    .map(([k, q]) => `<button type="button" class="chip${k === qualita ? " on" : ""}" data-q="${k}">${escapeHtml(q.nome)}</button>`)
    .join("");
  scelte.onclick = (ev) => {
    const b = ev.target.closest("[data-q]");
    if (!b) return;
    qualita = b.dataset.q;
    scelte.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b));
    const q = QUALITA[qualita];
    $("tredRigaQualita").textContent = `${q.facce.toLocaleString("it-IT")} facce, texture ${q.texture}×${q.texture}.`;
  };
  scelte.querySelector(".chip.on")?.click();

  $("tredApri").onclick = () => $("tredFile").click();
  $("tredFile").onchange = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      await apriFoto(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  $("tredRecenti").onclick = (ev) => {
    const img = ev.target.closest("[data-apri]");
    if (img) void apriFoto(img.dataset.apri);
  };
  $("tredElenco").onclick = async (ev) => {
    const b = ev.target.closest("[data-guarda]");
    if (!b) return;
    const m = modellini()[Number(b.dataset.guarda)];
    if (m) await (await accendiVisore()).mostra(indirizzo(m)).catch(() => {
      $("tredErrore").hidden = false;
      $("tredErrore").textContent = "Questo modellino non si apre più: il file è stato spostato o cancellato.";
    });
  };
  $("tredVai").onclick = () => void vai();

  // «Fanne un modellino» dalla galleria e dalla lente.
  ascolta("modellino", (url) => {
    mostraScheda("tred");
    void apriFoto(url);
  });
  ascolta("immagini-aggiornate", disegnaRecenti);

  barra = collegaScaricamento($("tredAvviso"), {
    stato: ponte.statoModelli,
    scarica: ponte.scaricaModelli,
    annulla: ponte.annullaScaricamento,
    onAvanzamento: ponte.suAvanzamentoModelli,
    io: ponte.io,
    onCambio: (ok) => {
      pronto = ok;
      accendiBottone();
    },
  });

  disegnaRecenti();
  disegnaModellini();
}

/** Quando si apre la scheda: si controlla se i pesi ci sono, e si accende il visore. */
export async function aperturaTred() {
  pronto = await barra.controlla({ ids: TRELLIS2.catalogo, nome: "TRELLIS.2 (il 3D)" });
  accendiBottone();
  const primo = modellini()[0];
  if (primo) (await accendiVisore()).mostra(indirizzo(primo)).catch(() => {});
}
