/**
 * Il costruttore di stili.
 *
 * Un modulo a campi che assembla la descrizione nello schema a tre blocchi di
 * MiniMax mentre lo compili. Le proposte sono più di duecento: quelle a scelta
 * multipla si sommano, le altre si sostituiscono, e in ogni caso il campo vince
 * — si può sempre scrivere di proprio.
 *
 * "Leggi dalla descrizione" fa il contrario: rimette una descrizione già scritta
 * dentro i campi, per correggerne un pezzo invece di riscriverla.
 */

import { $, el, escapeHtml, mostraScheda } from "./dom.js";
import { FIELDS } from "./dati/campi.js";
import { disegnaPresets, salvaStile, stiliMiei } from "./crea.js";

const valore = (id) => (($("f_" + id) || {}).value || "").trim();

function disegnaCampi() {
  const blocchi = [...new Set(FIELDS.map((f) => f.block))];

  el.builderFields.innerHTML = blocchi
    .map(
      (blocco) => `
    <fieldset><legend>${escapeHtml(blocco)}</legend>
      ${FIELDS.filter((f) => f.block === blocco)
        .map(
          (f) => `
        <div class="bfield">
          <h3>${escapeHtml(f.label)}</h3>
          <div class="desc">${f.desc}${f.multi ? " <i>Puoi sommare più proposte.</i>" : ""}</div>
          <input id="f_${f.id}" placeholder="scrivi di tuo, oppure clicca qui sotto">
          <div class="opts">${f.opts
            .map((o) => `<button class="chip" data-campo="${f.id}" data-valore="${escapeHtml(o)}">${escapeHtml(o)}</button>`)
            .join("")}</div>
        </div>`,
        )
        .join("")}
    </fieldset>`,
    )
    .join("");

  el.builderFields.querySelectorAll("[data-campo]").forEach((chip) => {
    chip.onclick = () => {
      const campo = FIELDS.find((f) => f.id === chip.dataset.campo);
      const input = $("f_" + campo.id);
      const v = chip.dataset.valore;

      if (!campo.multi) {
        // Ricliccare la stessa proposta la toglie: è l'unico modo di svuotare
        // un campo a scelta singola senza cancellare a mano.
        input.value = input.value.trim() === v ? "" : v;
      } else {
        const pezzi = input.value.split(",").map((s) => s.trim()).filter(Boolean);
        const dove = pezzi.indexOf(v);
        if (dove >= 0) pezzi.splice(dove, 1);
        else pezzi.push(v);
        input.value = pezzi.join(", ");
      }
      aggiornaAnteprima();
    };
  });

  el.builderFields.querySelectorAll("input").forEach((i) => i.addEventListener("input", aggiornaAnteprima));
}

/** I campi diventano i tre blocchi dello schema MiniMax. */
export function componiDescrizione() {
  const unisci = (a) => a.filter(Boolean).join(", ");

  const globale = unisci([
    valore("genere"),
    valore("bpm") && `${valore("bpm")} BPM`,
    valore("tonalita"),
    valore("mood"),
    valore("contesto"),
    valore("produzione"),
  ]);

  const voce = valore("voce");
  const vocale =
    voce === "no vocals"
      ? "no lead vocals, fully instrumental"
      : unisci([voce, valore("timbro"), valore("interpretazione"), valore("armonie"), valore("effetti")]);

  const strumenti = unisci([
    valore("primari") && `primary ${valore("primari")}`,
    valore("secondari") && `secondary ${valore("secondari")}`,
  ]);
  const resto = unisci([
    valore("groove"),
    valore("basso"),
    valore("percussioni"),
    valore("texture"),
    valore("spazio"),
  ]);
  const arrangiamento = [strumenti, resto].filter(Boolean).join("; ");

  const fuori = [];
  if (globale) fuori.push(`Global Metadata: ${globale}.`);
  if (vocale) fuori.push(`Vocal Details: ${vocale}.`);
  if (arrangiamento) fuori.push(`Arrangement: ${arrangiamento}.`);
  return fuori.join("\n");
}

function aggiornaAnteprima() {
  const descrizione = componiDescrizione();
  el.b_preview.textContent =
    descrizione || "Compila qualche voce qui a sinistra e la descrizione si scrive da sola.";

  el.builderFields.querySelectorAll("[data-campo]").forEach((chip) => {
    const attuali = ($("f_" + chip.dataset.campo).value || "").split(",").map((s) => s.trim());
    chip.classList.toggle("on", attuali.includes(chip.dataset.valore));
  });
}

/** Il contrario: da una descrizione già scritta ai campi. */
function leggiDallaDescrizione() {
  const testo = el.caption.value;
  const prendi = (chiave) =>
    (testo.match(new RegExp(chiave + ":\\s*([^\\n]*)")) || ["", ""])[1].replace(/\.$/, "").trim();
  const metti = (id, v) => ($("f_" + id).value = v || "");

  const globale = prendi("Global Metadata").split(",").map((s) => s.trim());
  metti("genere", globale[0]);
  metti("bpm", (globale.find((s) => /bpm/i.test(s)) || "").replace(/[^0-9]/g, ""));
  metti("tonalita", globale.find((s) => /(major|minor|dorian|phrygian|mixolydian)/i.test(s)));
  metti("mood", globale[3]);
  metti("contesto", globale[4]);
  metti("produzione", globale.slice(5).join(", "));

  const voce = prendi("Vocal Details").split(",").map((s) => s.trim());
  metti("voce", voce[0]);
  metti("timbro", voce[1]);
  metti("interpretazione", voce[2]);
  metti("armonie", voce[3]);
  metti("effetti", voce.slice(4).join(", "));

  const arrangiamento = prendi("Arrangement");
  metti("primari", (arrangiamento.match(/primary ([^,;]*)/i) || ["", ""])[1].trim());
  metti("secondari", (arrangiamento.match(/secondary ([^,;]*)/i) || ["", ""])[1].trim());
  const coda = (arrangiamento.split(";")[1] || "").split(",").map((s) => s.trim());
  metti("groove", coda[0]);
  metti("basso", coda[1]);
  metti("percussioni", coda[2]);
  metti("texture", coda[3]);
  metti("spazio", coda.slice(4).join(", "));

  aggiornaAnteprima();
}

export function collegaCostruttore() {
  disegnaCampi();
  aggiornaAnteprima();

  el.b_use.onclick = () => {
    const descrizione = componiDescrizione();
    if (!descrizione) return;
    el.caption.value = descrizione;
    mostraScheda("crea");
  };

  el.b_copy.onclick = async () => {
    const descrizione = componiDescrizione();
    if (!descrizione) return;
    try {
      await navigator.clipboard.writeText(descrizione);
      el.b_copy.textContent = "copiato!";
    } catch {
      el.caption.value = descrizione;
      el.b_copy.textContent = "messo in Crea";
    }
    setTimeout(() => (el.b_copy.textContent = "copia il testo"), 1800);
  };

  el.b_save.onclick = () => {
    const descrizione = componiDescrizione();
    if (!descrizione) {
      el.b_preview.textContent = "Prima compila qualche voce.";
      return;
    }
    const nome = (el.b_name.value || "").trim() || `Stile ${Object.keys(stiliMiei()).length + 1}`;
    salvaStile(nome.slice(0, 40), descrizione);
    el.caption.value = descrizione;
    mostraScheda("crea");
  };

  el.b_clear.onclick = () => {
    FIELDS.forEach((f) => ($("f_" + f.id).value = ""));
    aggiornaAnteprima();
  };

  el.b_load.onclick = leggiDallaDescrizione;

  // Uno stile salvato dal costruttore deve comparire subito fra i preset.
  disegnaPresets();
}
