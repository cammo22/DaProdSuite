/**
 * Lo Studio della sala: Qwen-Image 2.1 in mano a chi gioca.
 *
 * ⚠ Nuovo nella 1.4.5. Chiesto da Cammo il 24 settembre 2026: «con i nuovi
 * modelli Qwen, molto capaci nelle immagini, reinventiamo la parte di genera
 * completamente».
 *
 * Fino alla 1.4.4 «Genera» voleva dire una cosa sola: la slot, che monta un
 * prompt coi rulli e lo manda in fila. L'immagine la vedeva solo chi comanda,
 * dopo, se decideva di provarla. Chi giocava non vedeva mai cosa sarebbe
 * uscito dalla sua combinazione.
 *
 * Qwen-Image 2.1 sa tre cose che FLUX non sapeva, e lo Studio e' fatto intorno
 * a quelle:
 *
 * 1. **Scrive le parole dentro l'immagine**, giuste: un'insegna, un titolo, una
 *    copertina. Per questo c'e' una casella apposta, «la scritta», e il prompt
 *    gliela chiede tra virgolette.
 * 2. **Modifica a parole**: «fallo di notte», «mettigli un cappello». Ogni cosa
 *    fatta nello Studio si ritocca da li'.
 * 3. **In cinque passi** con la LoRA turbo: «veloce» costa poco e arriva in
 *    fretta; «fine» e' il modello di serie a quaranta passi.
 *
 * Si paga in lire, e le lire vanno nella Banca DaProd come tutte le spese
 * (`deposito.muovi`): lo Studio non e' gratis perche' la scheda video non lo e',
 * e perche' cosi' un'immagine fatta vale qualcosa. Una cosa che chi comanda
 * rifiuta si rimborsa.
 *
 * Qui dentro solo le regole: i costi, le forme, come si scrive il prompt.
 * Chi genera davvero e' chi ospita (`Contorno.genera`, `Contorno.ritocca`).
 */

import type { Caso } from "./regole";
import { PEZZI_IMMAGINI } from "./rulli";

/**
 * Quanto costa, in lire.
 *
 * ⚠ **Dalla 1.4.9 una cosa sola: fine, 40 passi, mille lire.** Chiesto il 25
 * settembre 2026: «gli utenti possono pagare per generare l'immagine, ma non
 * deve partire automaticamente: un admin deve dare l'ok, e si fa solo fine 40
 * passi e costa 1000 lire». Il «veloce» era Qwen col turbo, cioe' una LoRA, e
 * le LoRA sono uscite dalle cose che si chiedono da fuori. Il ritocco costa
 * uguale: e' lo stesso lavoro, parte da una foto invece che dal niente.
 */
export const COSTI_STUDIO = {
  /** Qwen-Image 2.1 di serie, 40 passi. */
  fine: 1000,
  /** Un ritocco a parole, anche su una foto caricata dal telefono. */
  ritocco: 1000,
} as const;

/** Una foto dal telefono, come data URL: al massimo cosi' (la pagina la rimpicciolisce prima). */
export const FOTO_MAX = 12_000_000;

/** Le forme che la suite sa fare (le stesse di «genera.immagine»). */
export const FORME_STUDIO = ["1:1", "4:3", "16:9", "9:16"] as const;
export type FormaStudio = (typeof FORME_STUDIO)[number];

/** Quanto si puo' scrivere. */
export const TESTO_MIN = 3;
export const TESTO_MAX = 800;
export const SCRITTA_MAX = 60;
/** Quanti lavori si tengono nel quaderno di una persona. */
export const LAVORI_TENUTI = 24;

export function formaDi(x: unknown): FormaStudio {
  return (FORME_STUDIO as readonly string[]).includes(String(x)) ? (String(x) as FormaStudio) : "1:1";
}

/**
 * Il prompt che arriva al modello.
 *
 * La scritta va **tra virgolette e detta esplicitamente**: e' come Qwen la
 * vuole per scriverla lettera per lettera. Le virgolette dentro la scritta si
 * tolgono, se no chiuderebbero la frase a meta'.
 */
export function promptStudio(testo: string, scritta?: string): string {
  const t = String(testo || "").trim().slice(0, TESTO_MAX);
  const s = String(scritta || "")
    .replace(/["“”«»]/g, "")
    .trim()
    .slice(0, SCRITTA_MAX);
  if (!s) return t;
  return t + '. The image contains the text "' + s + '", written clearly and spelled exactly.';
}

/** Un lavoro dello Studio, come sta scritto sul conto. */
export interface LavoroStudio {
  /** La targa della richiesta nella suite. */
  richiesta: string;
  quando: number;
  che: "crea" | "ritocco";
  testo: string;
  scritta?: string;
  forma: FormaStudio;
  /** Fino alla 1.4.8 c'era il turbo: le voci vecchie lo dicono ancora. */
  veloce?: boolean;
  costo: number;
  /** Per un ritocco: la foto era del telefono (1.4.9). */
  dalTelefono?: boolean;
  /** Per un ritocco: da quale cosa della libreria si e' partiti. */
  da?: string;
  /** Rifiutato da chi comanda e gia' rimborsato. */
  rimborsato?: boolean;
}

/**
 * Il dado dello Studio: una descrizione fatta coi pezzi dei rulli delle
 * immagini, quelli veri della slot. Chi, che fa, dove, che luce, come, da dove:
 * sei rulli su dodici, perche' con tutti e dodici la frase diventa un elenco e
 * il modello non sa piu' cosa conta. I pezzi sono gia' scritti senza frasi
 * fatte (vedi CONCETTI.md sul no-slop): il dado non inventa niente.
 */
export const RULLI_DEL_DADO = ["soggetto", "azione", "posto", "luce", "stile", "inquadratura"] as const;

export function dadoStudio(caso: Caso): { testo: string; nomi: string[] } {
  const scelti = RULLI_DEL_DADO.map((rullo) => {
    const pezzi = PEZZI_IMMAGINI.filter((p) => p.rullo === rullo);
    return pezzi.length ? pezzi[Math.floor(caso() * pezzi.length) % pezzi.length] : undefined;
  }).filter((p): p is (typeof PEZZI_IMMAGINI)[number] => Boolean(p));
  return { testo: scelti.map((p) => p.testo).join(", "), nomi: scelti.map((p) => p.nome) };
}
