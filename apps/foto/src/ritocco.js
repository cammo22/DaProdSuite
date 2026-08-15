/**
 * La scheda Ritocco: si dipinge la zona da rifare e si dice cosa deve diventare.
 *
 * Due tele sovrapposte. Sotto l'immagine, sopra la maschera, delle stesse
 * identiche dimensioni in pixel: se non lo fossero, il motore rifarebbe una zona
 * spostata rispetto a quella dipinta, ed è il tipo di errore che si vede solo a
 * generazione finita.
 *
 * L'immagine di partenza viene ridisegnata su misura prima ancora di mostrarla —
 * lati multipli di 16 e lato lungo entro 1536 — per due motivi: il VAE lavora a
 * blocchi di 8 e ritaglierebbe da solo lasciando la maschera disallineata, e una
 * foto da telefono a piena risoluzione non entra in 8 GB di VRAM.
 */

import { el, mostraErrore, nascondiErrore, rnd, legaValore, mostraScheda } from "./dom.js";
import { ascolta } from "./bus.js";
import { componiPrompt, grafoRitocco } from "./grafi.js";
import { aggiungiLavoro } from "./coda.js";
import * as ponte from "./ponte.js";

const LATO_MASSIMO = 1536;
const PASSO = 16;

let sotto = null;
let sopra = null;
let pennello = 60;
let disegnando = false;

/** Le misure che il motore accetta senza ritagliare niente per conto suo. */
function misure(larghezza, altezza) {
  const scala = Math.min(1, LATO_MASSIMO / Math.max(larghezza, altezza));
  const arrotonda = (v) => Math.max(PASSO, Math.round((v * scala) / PASSO) * PASSO);
  return [arrotonda(larghezza), arrotonda(altezza)];
}

export async function apriImmagine(sorgente) {
  const risposta = await fetch(sorgente);
  const immagine = await createImageBitmap(await risposta.blob());
  const [larghezza, altezza] = misure(immagine.width, immagine.height);

  sotto = document.createElement("canvas");
  sotto.className = "sotto";
  sotto.width = larghezza;
  sotto.height = altezza;
  sotto.getContext("2d").drawImage(immagine, 0, 0, larghezza, altezza);
  immagine.close();

  sopra = document.createElement("canvas");
  sopra.className = "sopra";
  sopra.width = larghezza;
  sopra.height = altezza;

  const tela = document.createElement("div");
  tela.className = "tela";
  tela.append(sotto, sopra);

  el.areaTela.replaceChildren(tela);
  el.comandiPennello.style.display = "flex";
  nascondiErrore("erroreRitocco");

  collegaPennello();
  mostraScheda("ritocco");
}

/* ------------------------------------------------------------- il pennello */

function puntoTela(ev) {
  const misura = sopra.getBoundingClientRect();
  // La tela è mostrata rimpicciolita ma dipinge alla sua risoluzione vera: senza
  // questo rapporto il pennello cadrebbe lontano dal cursore.
  return {
    x: ((ev.clientX - misura.left) / misura.width) * sopra.width,
    y: ((ev.clientY - misura.top) / misura.height) * sopra.height,
    raggio: (pennello / 2) * (sopra.width / misura.width),
  };
}

function pennellata(ev) {
  const { x, y, raggio } = puntoTela(ev);
  const contesto = sopra.getContext("2d");
  contesto.fillStyle = "#ff0000";
  contesto.beginPath();
  contesto.arc(x, y, raggio, 0, Math.PI * 2);
  contesto.fill();
}

function collegaPennello() {
  sopra.onpointerdown = (ev) => {
    disegnando = true;
    sopra.setPointerCapture(ev.pointerId);
    pennellata(ev);
  };
  sopra.onpointermove = (ev) => {
    if (disegnando) pennellata(ev);
  };
  const smetti = () => (disegnando = false);
  sopra.onpointerup = smetti;
  sopra.onpointercancel = smetti;
}

function pulisci() {
  if (!sopra) return;
  sopra.getContext("2d").clearRect(0, 0, sopra.width, sopra.height);
}

/** Vero se qualcosa è stato dipinto: senza maschera non c'è niente da rifare. */
function mascherata() {
  if (!sopra) return false;
  const dati = sopra.getContext("2d").getImageData(0, 0, sopra.width, sopra.height).data;
  for (let i = 3; i < dati.length; i += 4) {
    if (dati[i] > 0) return true;
  }
  return false;
}

/**
 * La maschera come la vuole il motore: fondo nero, zona dipinta rossa.
 *
 * `LoadImageMask` legge il canale rosso, e la trasparenza in mezzo lascerebbe
 * spazio a interpretazioni diverse a seconda di come viene letto il PNG. Un
 * fondo nero pieno toglie il dubbio: 0 dove non si tocca, 255 dove si rifà.
 */
function mascheraPiena() {
  const piena = document.createElement("canvas");
  piena.width = sopra.width;
  piena.height = sopra.height;
  const contesto = piena.getContext("2d");
  contesto.fillStyle = "#000000";
  contesto.fillRect(0, 0, piena.width, piena.height);
  contesto.drawImage(sopra, 0, 0);
  return piena;
}

const inBlob = (tela) => new Promise((risolvi) => tela.toBlob(risolvi, "image/png"));

/* ------------------------------------------------------------ collegamenti */

export function collegaRitocco() {
  legaValore("pennello", "pennelloVal", (v) => `${v} px`);
  legaValore("denoise", "denoiseVal", (v) => Number(v).toFixed(2));
  el.pennello.addEventListener("input", () => (pennello = parseInt(el.pennello.value)));

  el.scegliFile.onclick = () => el.sceltaFile.click();
  el.sceltaFile.onchange = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    const indirizzo = URL.createObjectURL(file);
    try {
      await apriImmagine(indirizzo);
    } finally {
      URL.revokeObjectURL(indirizzo);
    }
  };

  el.pulisciMaschera.onclick = pulisci;

  // Dalla galleria: "ritocca" porta l'immagine qui dentro.
  ascolta("ritocca", (url) => void apriImmagine(url));

  el.rigenera.onclick = async () => {
    nascondiErrore("erroreRitocco");

    if (!sotto) return mostraErrore("Prima apri un'immagine.", "erroreRitocco");
    if (!mascherata()) {
      return mostraErrore("Dipingi la zona da rifare, poi riprova.", "erroreRitocco");
    }
    const testo = el.promptRitocco.value.trim();
    if (!testo) return mostraErrore("Scrivi cosa deve diventare quella zona.", "erroreRitocco");

    try {
      const base = await ponte.carica(await inBlob(sotto), "base.png");
      const maschera = await ponte.carica(await inBlob(mascheraPiena()), "maschera.png");

      const denoise = parseFloat(el.denoise.value);
      const parametri = {
        prompt: componiPrompt(testo, el.estetica.value),
        negativo: el.negativo.value.trim(),
        seed: rnd(),
        passi: parseInt(el.passi.value),
        cfg: parseFloat(el.cfg.value),
        denoise,
        immagine: base,
        maschera,
      };

      const id = await ponte.invia(grafoRitocco(parametri));
      aggiungiLavoro(id, `ritocco: ${testo}`, {
        testo,
        prompt: parametri.prompt,
        ritocco: true,
        denoise,
        passi: parametri.passi,
        cfg: parametri.cfg,
        seed: parametri.seed,
      });
    } catch (e) {
      mostraErrore(String(e.message || e), "erroreRitocco");
    }
  };
}
