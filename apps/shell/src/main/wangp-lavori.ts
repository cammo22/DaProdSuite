/**
 * Cosa diventa un lavoro chiesto da fuori quando lo esegue WanGP.
 *
 * La fila della suite (`esecuzione.ts`) ragiona per azioni — «fai un'immagine»,
 * «fai un brano» — e per campi: forma, risoluzione, generi, testo. WanGP
 * ragiona per **impostazioni** di un modello. Questo file è il traduttore, e
 * l'unico posto in cui si sa che «Veloce» vuol dire il profilo Viggle Turbo di
 * Qwen o che «tonalità» è il `keyscale` di ACE-Step.
 *
 * ⚠ **Il modello lo sceglie la suite, non chi chiede.** Un ospite non manda mai
 * un `model_type`: manda «Fine» o «Veloce», e qui diventa Qwen-Image 2.1. Le
 * impostazioni sono quelle che WanGP documenta (`docs/SETTINGS.md` nella sua
 * cartella), non un parere di un agente.
 */

import { closeSync, openSync, readSync } from "node:fs";
import { join } from "node:path";

/** Il modello delle immagini: Qwen-Image 2.1, 7 miliardi di parametri. */
export const MODELLO_IMMAGINI = "qwen_image_21_7B";
/** Il modello della musica: ACE-Step 1.5 XL Turbo (quello senza il modello di linguaggio). */
export const MODELLO_MUSICA = "ace_step_v1_5_xl";

/**
 * Le misure vere, come nella scheda Foto (`apps/foto/src/formato.js`): tutte
 * multiple di 16, e 1080 diventa 1088.
 */
const MISURE: Record<string, Record<string, [number, number]>> = {
  "16:9": { "480": [848, 480], "720": [1280, 720], "1080": [1920, 1088] },
  "9:16": { "480": [480, 848], "720": [720, 1280], "1080": [1088, 1920] },
  "4:3": { "480": [640, 480], "720": [960, 720], "1080": [1440, 1088] },
  "1:1": { "480": [480, 480], "720": [720, 720], "1080": [1088, 1088] },
};

/**
 * Il profilo «Veloce» di Qwen-Image 2.1: la LoRA Viggle Turbo v0.2.1, 6 passi.
 *
 * È il profilo che WanGP stesso dà come consigliato (`profiles/qwen21/Viggle
 * Turbo v0.2.1 6 Steps.json`). La LoRA si scarica da sola la prima volta (1,3
 * GB): WanGP la cerca per indirizzo.
 */
const VELOCE = {
  activated_loras: [
    "https://huggingface.co/DeepBeepMeep/Qwen_image_2/resolve/main/loras/Qwen-Image-2.1-viggle-turbo-v0.2.1-6step-lora-r256.safetensors",
  ],
  loras_multipliers: "1",
  num_inference_steps: 6,
  sample_solver: "viggle_v02",
  guidance_scale: 1,
  negative_prompt: "",
};

/** Il profilo «Fine»: il modello di serie, 40 passi, come dice la sua guida. */
const FINE = { num_inference_steps: 40, guidance_scale: 4 };

/** Cosa serve a tradurre un lavoro: quello che la fila sa di una richiesta. */
export interface DaTradurre {
  azione: string;
  testo: string;
  opzioni: Record<string, string>;
}

export interface Tradotto {
  settings: Record<string, unknown>;
  /** Quanti file ne escono. */
  quanti: number;
}

/** Un numero tenuto fra un minimo e un massimo; se non è un numero, il predefinito. */
function numero(v: string | undefined, min: number, max: number, predefinito: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : predefinito;
}

/**
 * L'id di una foto mandata dal telefono → il suo percorso vero su disco.
 *
 * `cartellaInvii` la passa chi chiama (la fila la conosce): tenerla fuori da
 * questo file lo rende una funzione pura, che si prova senza Electron.
 */
function percorsoInvio(cartellaInvii: string, id: string | undefined): string | null {
  const pulito = (id ?? "").trim();
  // Si ricontrolla qui, dove un nome diventa un percorso (vedi `daIdAIndirizzi`).
  if (!/^[A-Za-z0-9._-]{1,200}$/.test(pulito) || pulito.includes("..")) return null;
  return join(cartellaInvii, pulito);
}

/**
 * Larghezza e altezza di una foto PNG o JPEG, leggendo solo l'inizio del file.
 *
 * Serve alla modifica: l'immagine che esce deve avere **la forma della foto**,
 * non un quadrato. Non si carica una libreria per questo: le due intestazioni
 * sono corte e note. Torna null se non le riconosce (si userà il quadrato).
 */
export function misureDellaFoto(percorso: string): [number, number] | null {
  let fd = -1;
  try {
    fd = openSync(percorso, "r");
    const b = Buffer.alloc(65536);
    const n = readSync(fd, b, 0, b.length, 0);
    // PNG: 8 byte di firma, poi il blocco IHDR con larghezza e altezza.
    if (n > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    // JPEG: si scorrono i blocchi finche' si trova un SOF (0xC0..0xCF, meno 0xC4/0xC8/0xCC).
    if (n > 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < n) {
        if (b[i] !== 0xff) return null;
        const tipo = b[i + 1]!;
        if (tipo >= 0xc0 && tipo <= 0xcf && tipo !== 0xc4 && tipo !== 0xc8 && tipo !== 0xcc) {
          return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd >= 0) closeSync(fd);
  }
}

/** La misura di un'immagine di questa forma, col lato lungo a `lungo` e i lati multipli di 32. */
export function misuraConLaForma(w: number, h: number, lungo: number): [number, number] {
  const scala = lungo / Math.max(w, h);
  const a32 = (n: number): number => Math.max(64, Math.round((n * scala) / 32) * 32);
  return [a32(w), a32(h)];
}

/**
 * Le impostazioni di un'immagine da un testo, o da una foto.
 *
 * `testo` è quello da mandare (per una copertina ha già il titolo dentro).
 */
export function impostazioniImmagine(r: DaTradurre, testo: string, cartellaInvii: string): Tradotto {
  const veloce = r.opzioni["modello"] === "qwen21-turbo";
  const quanti = numero(r.opzioni["quante"], 1, 4, 1);
  const profilo = veloce ? VELOCE : FINE;
  const base: Record<string, unknown> = {
    model_type: MODELLO_IMMAGINI,
    prompt: testo,
    batch_size: 1,
    ...(quanti > 1 ? { repeat_generation: quanti } : {}),
    custom_settings: { qwen21_kv_cache: "Disabled", rgba: "Disabled" },
    ...profilo,
  };

  if (r.azione === "modifica.immagine") {
    const foto = percorsoInvio(cartellaInvii, r.opzioni["immagine"]);
    if (!foto) throw new Error("Non trovo la foto da modificare: rimandala.");
    const maschera = percorsoInvio(cartellaInvii, r.opzioni["maschera"]);
    // La misura: quella della foto stessa (lato lungo 1088, o quanto dice la risoluzione).
    const lungo = Number(r.opzioni["risoluzione"]) >= 1080 || !r.opzioni["risoluzione"] ? 1088 : Math.max(480, Number(r.opzioni["risoluzione"]));
    const dim = misureDellaFoto(foto);
    const [w, h] = dim ? misuraConLaForma(dim[0], dim[1], lungo) : [1088, 1088];
    if (maschera) {
      // Zona dipinta: si rifà solo quella (Qwen 2.1, «Masked Denoising»).
      return {
        quanti,
        settings: { ...base, resolution: `${w}x${h}`, image_mode: 2, model_mode: 0, video_prompt_type: "VAG", image_guide: foto, image_mask: maschera },
      };
    }
    // Senza zona: la foto è il soggetto principale, e si cambia come dice il testo.
    return { quanti, settings: { ...base, resolution: `${w}x${h}`, image_mode: 1, video_prompt_type: "KI", image_refs: [foto] } };
  }

  const [w, h] = MISURE[r.opzioni["forma"] ?? "1:1"]?.[r.opzioni["risoluzione"] ?? "1080"] ?? [1088, 1088];
  return { quanti, settings: { ...base, resolution: `${w}x${h}`, image_mode: 1 } };
}

/**
 * Le impostazioni di un brano.
 *
 * - `descrizione` (i generi) → la «caption» di ACE-Step, `alt_prompt`;
 * - `testo` → le parole, `prompt`; senza parole o con la voce spenta è
 *   `[Instrumental]`, come vuole ACE-Step;
 * - bpm, tonalità, tempo e lingua sono le sue caselle vere (`custom_settings`).
 */
export function impostazioniBrano(r: DaTradurre): Tradotto {
  const quanti = numero(r.opzioni["quante"], 1, 4, 1);
  const voce = r.opzioni["voce"] !== "no";
  const parole = (r.opzioni["testo"] ?? "").trim();
  const custom: Record<string, unknown> = {};

  const bpm = Number(r.opzioni["bpm"]);
  if (Number.isFinite(bpm) && bpm >= 30 && bpm <= 300) custom["bpm"] = Math.round(bpm);
  const tonalita = (r.opzioni["tonalita"] ?? "").trim();
  if (tonalita && tonalita !== "caso") custom["keyscale"] = tonalita;
  const tempo = Number(r.opzioni["tempo"]);
  if ([2, 3, 4, 6].includes(tempo)) custom["timesignature"] = tempo;
  const lingua = (r.opzioni["lingua"] ?? "").trim();
  if (lingua && voce && parole) custom["language"] = lingua;

  return {
    quanti,
    settings: {
      model_type: MODELLO_MUSICA,
      prompt: voce && parole ? parole : "[Instrumental]",
      alt_prompt: (r.testo || r.opzioni["descrizione"] || "").trim(),
      duration_seconds: numero(r.opzioni["secondi"], 15, 240, 120),
      ...(quanti > 1 ? { repeat_generation: quanti } : {}),
      ...(Object.keys(custom).length ? { custom_settings: custom } : {}),
    },
  };
}

/** L'azione → le impostazioni di WanGP. Solleva se WanGP non la sa fare. */
export function traduci(r: DaTradurre, testo: string, cartellaInvii = ""): Tradotto {
  if (r.azione === "genera.immagine" || r.azione === "modifica.immagine") return impostazioniImmagine(r, testo, cartellaInvii);
  if (r.azione === "genera.brano") return impostazioniBrano({ ...r, testo });
  throw new Error(`WanGP non sa ancora fare "${r.azione}" da fuori: usa l'interfaccia intera.`);
}
