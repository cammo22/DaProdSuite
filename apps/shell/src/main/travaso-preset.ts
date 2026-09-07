/**
 * Il travaso: i vecchi preset diventano prompt, e `preset.json` sparisce.
 *
 * ## Perché questo file esiste
 *
 * Fino alla 1.2.2 i prompt messi da parte stavano in **due magazzini che si
 * chiamavano allo stesso modo**, e nessuno dei due vedeva l'altro:
 *
 * | Dove salvavi | Dove finiva | Dove si vedeva |
 * |---|---|---|
 * | «salvalo fra i tuoi prompt», in Produzione | `preset.json` | l'elenco «I tuoi prompt» in Produzione |
 * | «salvalo come prompt», dalla galleria | `persone/<chi>/stili.json` | scheda Stili, pastiglia «Prompt» |
 *
 * Il 7 settembre 2026: «i prompt continuano a non vederli, nonostante io ne
 * abbia parecchi sul telefono». Non si erano persi: erano nell'altro cassetto.
 * Guardato sul disco quel giorno, `preset.json` era **vuoto** e in `stili.json`
 * del telefono c'erano i due prompt del robot con la chitarra.
 *
 * ## Quale dei due è sopravvissuto, e perché gli stili
 *
 * Gli stili sanno già fare tutto quello che sapevano fare i preset — un nome,
 * il testo principale, tutti i campi del modulo — **più** tre cose che i preset
 * non avrebbero mai avuto senza riscriverli: stanno nella cartella della
 * persona (quindi ti seguono da un dispositivo all'altro dello stesso
 * profilo), si possono mettere in vetrina, e hanno già una schermata sua dove
 * si guardano e si modificano. `preset.json` era un file solo per tutti, senza
 * padrone e senza vetrina: rifare lì dentro le tre cose sarebbe stato scrivere
 * due volte quello che c'è già.
 *
 * Quindi: **un prompt è uno stile con `genere: "prompt"`**, e basta.
 *
 * ## Cosa fa questo travaso
 *
 * Gira una volta all'avvio. Se `preset.json` c'è ancora, ogni preset dentro
 * diventa un prompt negli stili di chi l'aveva salvato, con la sua data
 * originale. Poi il file viene **rinominato**, non cancellato: se qualcosa
 * andasse storto, i dati di Cammo sono ancora lì da guardare.
 *
 * Il giorno che non esisterà più un computer con un `preset.json` sopra, questo
 * file si butta. Non prima: cancellarlo adesso vorrebbe dire che chi aggiorna
 * dalla 1.2.2 perde quello che aveva salvato.
 */

import { existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { STILE_PER_APP, type TipoStile } from "@daprod/azioni";
import { DATA_ROOT } from "./paths";
import { PADRONE_DI_CASA } from "./libreria";
import { salvaStile } from "./stili";

/** Il vecchio magazzino, quello che sta per sparire. */
const VECCHIO = join(DATA_ROOT, "preset.json");

/** Com'era fatto un preset: la stessa forma che aveva `Preset` nel gateway. */
interface VecchioPreset {
  id?: string;
  app?: string;
  nome?: string;
  testo?: string;
  campi?: Record<string, string>;
  chi?: string;
  quando?: number;
}

/**
 * Di che tipo è il prompt che nasce da un preset.
 *
 * ⚠ **La tabella sta in `@daprod/azioni`, non qui.** È la stessa domanda che si
 * fanno il telefono, la console e l'agente — «la scheda foto vuole gli stili
 * immagine» — e questo file è l'ultimo posto in cui doveva nascerne una quarta
 * copia. Una scheda che non sta in tabella (`voce`, per dire) non ha un tipo
 * suo: i suoi prompt diventano musica, che è dove finiscono le parole da
 * leggere.
 */
function tipoDelPreset(app: string | undefined): TipoStile {
  return STILE_PER_APP[app ?? ""] ?? "musica";
}

/**
 * Travasa e chiude bottega. Torna quanti ne ha spostati.
 *
 * Non alza mai un errore: un travaso che fallisce non deve impedire alla suite
 * di aprirsi. Al massimo il file resta lì e ci riprova al riavvio dopo.
 */
export function travasaIPresetNegliStili(): number {
  if (!existsSync(VECCHIO)) return 0;

  let dentro: VecchioPreset[] = [];
  try {
    const letto = JSON.parse(readFileSync(VECCHIO, "utf8")) as { preset?: unknown };
    if (Array.isArray(letto.preset)) dentro = letto.preset as VecchioPreset[];
  } catch {
    // Illeggibile: si lascia dov'è e non si tocca niente. Rinominarlo adesso
    // vorrebbe dire nascondere l'unica copia di qualcosa che forse si recupera
    // a mano.
    return 0;
  }

  let spostati = 0;
  for (const p of dentro) {
    if (!p.nome?.trim() || !p.testo?.trim()) continue;
    /**
     * Chi non ha padrone va al computer.
     *
     * Un preset senza `chi` è uno di quelli che «c'erano già»: nati prima che
     * si tenesse conto di chi salvava. Gli stili invece stanno sempre nella
     * cartella di qualcuno, e la cartella giusta per una cosa di tutti è
     * quella di chi ospita la macchina.
     */
    const chi = p.chi?.trim() || PADRONE_DI_CASA;
    const fatto = salvaStile(chi, {
      nome: p.nome,
      testo: p.testo,
      tipo: tipoDelPreset(p.app),
      genere: "prompt",
      campi: p.campi,
      da: "mio",
      quando: p.quando,
    });
    if (fatto) spostati++;
  }

  try {
    // Rinominato, non cancellato: è roba di Cammo, e il travaso l'ha letta una
    // volta sola. Se il nome nuovo è già occupato, si lascia stare — vuol dire
    // che un travaso è già passato di qui.
    const daParte = `${VECCHIO}.travasato`;
    if (!existsSync(daParte)) renameSync(VECCHIO, daParte);
  } catch {
    // Non si è potuto spostare: al riavvio dopo ci riprova. I prompt sono già
    // negli stili, e `salvaStile` non fa doppioni con lo stesso nome.
  }

  return spostati;
}
