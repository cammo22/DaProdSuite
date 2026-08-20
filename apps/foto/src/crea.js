/** La scheda Crea: dal testo all'immagine. */

import { el, escapeHtml, legaValore, libera, mostraErrore, nascondiErrore, occupa, rnd } from "./dom.js";
import { ESTETICHE, NEGATIVO, PROPOSTE } from "./dati/estetiche.js";
import { componiPrompt, grafoImmagine, paroleEstetica } from "./grafi.js";
import { collegaFormato, misuraScelta } from "./formato.js";
import { modelloCorrente, modelloUsabile } from "./scelta-modello.js";
import { faiSpazio } from "./memoria.js";
import { aggiungiLavoro } from "./coda.js";
import { inInglese } from "./lingua.js";
import * as ponte from "./ponte.js";
// Le pastiglie con le proposte sono di tutte le app, non di questa: stanno in
// `packages/ui` e la suite le serve sotto `/comune/`, dalla stessa origine
// della pagina. Qui si dice solo cosa proporre e dove finisce quello che clicchi.
import { collegaProposte } from "/comune/proposte.js";

function leggiModulo() {
  const { larghezza, altezza } = misuraScelta();
  return {
    testo: el.prompt.value.trim(),
    estetica: el.estetica.value,
    larghezza,
    altezza,
    step: parseInt(el.step.value),
    cfg: parseFloat(el.cfg.value),
    negativo: el.negativo.value.trim() || NEGATIVO,
    seed: parseInt(el.seed.value) || 0,
  };
}

/**
 * L'estetica si scrive nella casella, non dietro le quinte.
 *
 * Prima il menu attaccava le sue parole in fondo al prompt senza dirlo: ogni
 * immagine partiva con le stesse dieci parole incollate, e le foto si
 * somigliavano tutte senza che si capisse perché. Adesso il menu **scrive** — le
 * vedi, le correggi, le cancelli — e di suo non c'è niente: si parte da vuoto,
 * che è la scelta che dà più varietà al modello.
 */
function collegaEstetica() {
  el.estetica.innerHTML = [
    `<option value="">nessuna</option>`,
    ...Object.keys(ESTETICHE).map((k) => `<option>${escapeHtml(k)}</option>`),
  ].join("");
  el.estetica.value = "";

  let ultima = "";
  el.estetica.onchange = () => {
    const parole = paroleEstetica(el.estetica.value);
    const testo = el.prompt.value;

    // Si toglie quella di prima invece di accumularle: cambiare tre volte idea
    // non deve lasciare tre estetiche in fila dentro la stessa descrizione.
    const pulito = ultima ? testo.replace(ultima, "").replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim() : testo.trim();
    el.prompt.value = [pulito, parole].filter(Boolean).join(", ");
    ultima = parole;
  };
}

export function collegaCrea() {
  legaValore("step", "stepVal");
  legaValore("cfg", "cfgVal", (v) => Number(v).toFixed(1));

  collegaEstetica();
  collegaFormato();
  el.negativo.value = NEGATIVO;
  el.seed.value = rnd();

  collegaProposte(el.proposte, {
    chiave: "daprod.foto.proposte",
    difetto: PROPOSTE,
    applica: (prompt) => (el.prompt.value = prompt),
    // Il "+" parte da quello che hai appena scritto: la proposta che vale la
    // pena salvare è quasi sempre quella con cui hai appena fatto una foto buona.
    testoCorrente: () => el.prompt.value.trim(),
  });

  el.dado.onclick = () => (el.seed.value = rnd());

  el.toggleAdv.onclick = () => {
    el.avanzati.hidden = !el.avanzati.hidden;
    el.toggleAdv.classList.toggle("on", !el.avanzati.hidden);
  };

  el.genera.onclick = async () => {
    nascondiErrore();
    const p = leggiModulo();
    if (!p.testo) return mostraErrore("Scrivi cosa vuoi vedere.");

    const m = modelloCorrente();

    /**
     * Da qui in poi il tasto è spento e racconta cosa sta facendo.
     *
     * Prima non diceva niente, e la prima traduzione della sessione carica il
     * suo modello nel motore: dieci secondi in cui premere **Genera** sembrava
     * non fare niente — da cui «a volte devo ripremere». E chi ripremeva non
     * rimediava a un clic perso: ne metteva in coda una seconda.
     *
     * Il `try` comincia **prima** della traduzione, non dopo: era l'altro modo
     * in cui il tasto poteva sembrare morto, perché un errore lì dentro usciva
     * dalla funzione senza scrivere niente da nessuna parte.
     */
    occupa(el.genera, "preparo…");
    try {
      // Una volta sola, prima del ciclo: otto immagini della stessa descrizione
      // non sono otto traduzioni diverse, e devono partire dallo stesso inglese.
      const inglese = await inInglese(p.testo, m);

      // **Adesso, non prima.** Fra l'aver scritto la descrizione con Bonsai e
      // il generare passano pochi secondi, e in quei secondi il modello che
      // scrive occupa ancora la scheda video. Si libera qui, appena prima di
      // mandare il lavoro: vedi `memoria.js` per cosa se ne va e cosa resta.
      await faiSpazio(m, (detto) => occupa(el.genera, detto));

      occupa(el.genera, "carico il modello…");
      const quante = Math.max(1, Math.min(8, parseInt(el.quante.value) || 1));
      for (let i = 0; i < quante; i++) {
        // Dalla seconda in poi il seed cambia comunque: otto copie della stessa
        // immagine non sono otto immagini.
        if (el.seedCasuale.checked || i > 0) el.seed.value = rnd();
        const parametri = { ...leggiModulo(), prompt: componiPrompt(inglese) };

        const id = await ponte.invia(grafoImmagine(m, parametri));
        aggiungiLavoro(id, p.testo, {
          modello: m.nome,
          testo: p.testo,
          estetica: p.estetica,
          prompt: parametri.prompt,
          formato: misuraScelta().etichetta,
          step: parametri.step,
          cfg: parametri.cfg,
          seed: parametri.seed,
        });
      }
    } catch (e) {
      mostraErrore(String(e.message || e));
    } finally {
      // Non `disabled = false` e basta: mentre lavorava, il controllo dei
      // modelli può aver deciso che con quello scelto non si genera più.
      libera(el.genera, !modelloUsabile());
    }
  };
}
