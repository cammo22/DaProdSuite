/**
 * Il selettore del modello che scrive, dentro l'app.
 *
 * È lo stesso che sta nell'hub, ridotto a una riga: quale modello usare, se in
 * questo momento occupa memoria, e i tre contesti. Sta anche qui perché è qui
 * che lo si usa — chi sta scrivendo una canzone non deve tornare nell'hub per
 * accorgersi che il modello è spento, o per spegnerlo prima di generare.
 *
 * **Questa è la seconda copia**, identica a quella di DaProdMusica: il file non
 * dipende da niente dell'app che lo ospita, ma due copie prima o poi divergono.
 * Alla 0.3.1 nasce `packages/ui` e le due si fondono lì — è la stessa scadenza
 * dei due fogli di stile gemelli. Finché sono due si controllano; alla terza no.
 */

const suite = window.daprodSuite;

/** I tre contesti chiesti da Cammo. 64K è quello consigliato, e parte selezionato. */
const CONTESTI = [
  { etichetta: "64K", valore: 65_536 },
  { etichetta: "128K", valore: 131_072 },
  { etichetta: "256K", valore: 262_144 },
];

const CHIAVE_MODELLO = "daprod.llm.modello";
const CHIAVE_CONTESTO = "daprod.llm.contesto";

export const modelloScelto = () => localStorage.getItem(CHIAVE_MODELLO) || "";
const contestoScelto = () => Number(localStorage.getItem(CHIAVE_CONTESTO)) || 65_536;

/**
 * Disegna il selettore dentro `contenitore` e lo tiene aggiornato.
 *
 * `onCambia` viene chiamata quando cambia qualcosa che all'app interessa: serve
 * a chi deve accendere o spegnere i propri bottoni di conseguenza.
 */
export function collegaSelettoreLlm(contenitore, onCambia) {
  let ultimo = "";

  async function disegna() {
    const stato = await suite.llm.stato().catch(() => null);

    if (!stato?.acceso) {
      const messaggio = stato?.motivo ?? "LM Studio non risponde.";
      if (ultimo !== messaggio) {
        ultimo = messaggio;
        contenitore.innerHTML = `<div class="llm-spento">${messaggio}</div>`;
        onCambia?.(false);
      }
      return;
    }

    const scelto = stato.modelli.includes(modelloScelto()) ? modelloScelto() : stato.modelli[0] || "";
    const caricato = (stato.caricati ?? []).includes(scelto);

    // Si ridisegna solo quando cambia davvero: ogni ridisegno chiuderebbe il
    // menu proprio mentre lo stai aprendo.
    const firma = `${stato.modelli.join()}|${scelto}|${caricato}|${contestoScelto()}`;
    if (firma === ultimo) return;
    ultimo = firma;

    contenitore.innerHTML = `
      <select class="llm-modello">
        ${stato.modelli
          .map((m) => `<option value="${m}"${m === scelto ? " selected" : ""}>${m}</option>`)
          .join("")}
      </select>
      <span class="llm-pallino ${caricato ? "acceso" : ""}"></span>
      <span class="llm-detto">${caricato ? "in memoria" : "spento"}</span>
      <span class="llm-contesti">
        ${CONTESTI.map(
          (c) =>
            `<button type="button" class="mini${c.valore === contestoScelto() ? " on" : ""}" data-ctx="${c.valore}">${c.etichetta}</button>`,
        ).join("")}
      </span>
      <button type="button" class="mini llm-azione">${caricato ? "scarica" : "carica"}</button>`;

    contenitore.querySelector(".llm-modello").onchange = (ev) => {
      localStorage.setItem(CHIAVE_MODELLO, ev.target.value);
      ultimo = "";
      void disegna();
    };

    for (const b of contenitore.querySelectorAll("[data-ctx]")) {
      b.onclick = () => {
        localStorage.setItem(CHIAVE_CONTESTO, b.dataset.ctx);
        ultimo = "";
        void disegna();
      };
    }

    const azione = contenitore.querySelector(".llm-azione");
    azione.onclick = async () => {
      azione.disabled = true;
      azione.textContent = caricato ? "scarico…" : "carico…";
      // Caricare con un contesto diverso vuol dire ricaricare: LM Studio non lo
      // cambia a modello acceso, ed è il motivo per cui scegliendo 64K restava
      // a 128K.
      if (caricato) await suite.llm.scarica(scelto);
      else await suite.llm.carica(scelto, contestoScelto());
      ultimo = "";
      await disegna();
    };

    onCambia?.(true);
  }

  void disegna();
  // Il modello si carica e si scarica anche da LM Studio e dall'hub: qui si
  // guarda ogni tanto invece di credere all'ultima cosa vista.
  setInterval(() => void disegna(), 8000);
}
