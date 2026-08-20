/**
 * Il selettore del modello che scrive, dentro l'app.
 *
 * È lo stesso che sta nell'hub, ridotto a una riga: quale modello usare, se in
 * questo momento occupa memoria, e i tre contesti. Sta anche qui perché è qui
 * che lo si usa — chi sta scrivendo una canzone non deve tornare nell'hub per
 * accorgersi che il modello è spento, o per spegnerlo prima di generare.
 *
 * **Questa è la copia unica, e la scadenza è arrivata.** Fino al 19 agosto 2026
 * questo file esisteva due volte, identico, in DaProdMusica e in DaProdFoto, con
 * scritto in cima che alla terza copia si sarebbe dovuto fare qualcosa. La terza
 * è DaProdCompanion, quindi eccolo qui: `packages/ui`, servito a tutte le app
 * sotto `/comune/` dalla stessa origine della pagina che lo usa (vedi
 * `file-scheme.ts`), così un `import` normale basta e nessuna CSP si mette di
 * mezzo.
 *
 * **Non dipende da nessuna app**: parla solo con `window.daprodSuite`, che ogni
 * finestra riceve. Chi lo usa gli passa un contenitore e, se vuole, cosa fare
 * quando lo stato cambia.
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

/** Quello che hai scelto tu nel menu, se l'hai fatto. */
const ricordato = () => localStorage.getItem(CHIAVE_MODELLO) || "";

/**
 * Quello che il menu sta **mostrando adesso**.
 *
 * Non e' la stessa cosa del ricordo qui sopra: chi non ha mai toccato il menu
 * non ha niente da ricordare, e il menu in quel caso mostra il modello che hai
 * caricato tu in LM Studio. Prima di questa riga, in quel caso, le app
 * chiedevano una risposta **senza dire a chi**, e la suite ripiegava sul
 * consigliato: LM Studio si caricava Bonsai 27B — un 27B, minuti — mentre il
 * menu in cima all'app ne mostrava un altro.
 */
let mostrato = "";

/** A chi va chiesta la risposta: quello che si vede, non quello che si ricorda. */
export const modelloScelto = () => mostrato || ricordato();

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

    // Se non hai ancora scelto niente, il menu si apre su quello che **hai
    // caricato tu** in LM Studio, non sul primo della lista: se l'hai acceso,
    // è quello che vuoi usare. Ed è lo stesso a cui la suite manderà la
    // domanda, così il menu non dice una cosa e la suite ne fa un'altra.
    const caricati = (stato.caricati ?? []).filter((m) => stato.modelli.includes(m));
    const scelto = stato.modelli.includes(ricordato())
      ? ricordato()
      : caricati[0] || stato.modelli[0] || "";
    const caricato = (stato.caricati ?? []).includes(scelto);
    // Da qui in poi le app sanno a chi stanno chiedendo, anche se il menu non
    // l'ha mai toccato nessuno.
    mostrato = scelto;

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
