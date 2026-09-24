/**
 * Il giudice: un parere in piu' per chi comanda, davanti alla fila.
 *
 * ⚠ Nuovo nella 1.4.0: vedi CONCETTI.md § 18.7. Il giudice e' Jev-Omni, un
 * modello che non scrive: davanti a una situazione, una domanda e qualche
 * risposta possibile, dice **quanto e' probabile ognuna**. E' proprio il
 * mestiere di chi guarda la fila — «questa la prendo, la butto, o la metto in
 * vetrina?» — fatto da uno che non si stanca alla trentesima riga.
 *
 * ⚠ **Consiglia, non decide.** Il tasto «prendi» resta a chi comanda: il parere
 * si scrive sulla figurina e si vede accanto, e basta. Un modello che butta
 * via da solo le cose della gente e' un modello che prima o poi butta la cosa
 * sbagliata, e nessuno se ne accorge.
 *
 * Qui ci sono solo le due funzioni pure: **che domanda fare** e **dove scrivere
 * la risposta**. Chi fa la domanda davvero lo sa chi ospita (il gateway, e
 * dietro lo shell che accende il motore): il gioco non sa niente di modelli.
 */

import { NienteDaFare } from "./banco";
import type { Deposito } from "./deposito";
import type { Collezionabile, Giudizio } from "./tipi";

/**
 * Le risposte possibili, sempre le stesse quattro.
 *
 * Non i dodici gradi: un parere su dodici caselle vicine e' rumore — fra
 * Arcane e Heroic nessuno, modello o persona, sa dire la differenza guardando
 * una riga. Quattro scatole si leggono al volo, e la prima e' quella che conta
 * di piu': **lo slop**, la frase fatta che sembra bella e non dice niente.
 */
export const VERDETTI = [
  { id: "slop", detto: "Da buttare: frasi fatte, slop, niente di suo" },
  { id: "normale", detto: "Normale: si prende, ma non stupisce" },
  { id: "buona", detto: "Buona: ha un'idea precisa, vale un bonus" },
  { id: "vetrina", detto: "Da vetrina: rara, si ricorda, la vorrebbero tutti" },
] as const;

export type Verdetto = (typeof VERDETTI)[number]["id"];

export interface DomandaAlGiudice {
  stato: string;
  domanda: string;
  opzioni: string[];
  /** Il file da guardare insieme al testo, se la figurina ne ha uno: un id della libreria. */
  libreria?: string;
  tipo?: "immagine" | "audio";
}

/** La domanda per una figurina. Il testo e' in inglese come il prompt: il modello legge meglio cosi'. */
export function domandaPer(c: Collezionabile): DomandaAlGiudice {
  const righe = [
    "You are the curator of a collectible-card arcade. Players combine slot-machine pieces into generative prompts.",
    c.tavolo ? `Table: ${c.tavolo === "musica" ? "music (the prompt becomes a song)" : "images (the prompt becomes a picture)"}.` : "",
    c.era && c.era !== "sempre" ? `Era: the ${c.era}s.` : "",
    `Title: ${c.titolo}`,
    c.prompt ? `Prompt: ${c.prompt}` : "",
  ].filter(Boolean);
  // Il primo frutto gia' tenuto, se c'e': si giudica anche quello che ne e' uscito.
  const allegato = (c.allegati ?? []).find((a) => /^(image|audio)\//.test(a.mime));
  const d: DomandaAlGiudice = {
    stato: righe.join("\n"),
    domanda: "How should this card be ranked? Clichéd, generic wording counts as slop.",
    opzioni: VERDETTI.map((v) => v.detto),
  };
  if (allegato) {
    d.libreria = allegato.id;
    d.tipo = allegato.mime.startsWith("audio/") ? "audio" : "immagine";
  }
  return d;
}

/**
 * La risposta del modello diventa un giudizio sulla figurina.
 *
 * Le probabilita' arrivano per testo della risposta (e' cosi' che il servizio
 * le restituisce): qui si riportano agli id, e quello che non si riconosce si
 * butta invece di finire scritto a caso.
 */
export function segnaGiudizio(
  deposito: Deposito,
  id: string,
  probabilita: Record<string, number>,
  adesso = Date.now(),
): Giudizio {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
  const perId: Record<string, number> = {};
  for (const v of VERDETTI) {
    const p = Number(probabilita[v.detto] ?? probabilita[v.id] ?? 0);
    perId[v.id] = Number.isFinite(p) && p > 0 ? p : 0;
  }
  const somma = Object.values(perId).reduce((a, b) => a + b, 0);
  if (somma <= 0) throw new NienteDaFare("Il giudice non ha detto niente di leggibile.");
  for (const k of Object.keys(perId)) perId[k] = Math.round((perId[k]! / somma) * 1000) / 1000;
  const meglio = (Object.entries(perId).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "normale") as Verdetto;
  const g: Giudizio = { quando: adesso, probabilita: perId, meglio };
  c.giudizio = g;
  deposito.salva();
  return g;
}
