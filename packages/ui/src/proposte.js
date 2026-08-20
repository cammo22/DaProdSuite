/**
 * Le proposte da cliccare: quelle di partenza e le tue.
 *
 * Sono le pastiglie sopra la casella «Cosa vuoi vedere». Fino alla 0.3.2 erano
 * un elenco scritto nel codice: dieci frasi, sempre quelle, e la tua — quella
 * che funziona davvero col tuo modello — la riscrivevi a mano ogni volta.
 *
 * Adesso l'elenco è tuo:
 * - **`+`** ne aggiunge una,
 * - **tasto destro** su una pastiglia la modifica o la cancella,
 * - ognuna ha un **titolo corto** (quello che si legge) e dentro il **prompt
 *   intero** (quello che finisce nella casella). Il titolo è facoltativo: senza,
 *   si legge l'inizio del prompt, com'era prima.
 *
 * **Sta in `packages/ui` perché non è di un'app sola.** DaProdFoto ha le sue
 * proposte, DaProdMusica ne ha altre nella scheda Immagini, e domani ne avranno
 * anche le altre: la meccanica è la stessa, cambia solo l'elenco di partenza e
 * dove finisce il testo. Servito a ogni finestra sotto `/comune/`, come il
 * selettore del modello.
 *
 * **Non tocca il disco e non conosce la suite**: le proposte stanno nel
 * `localStorage` della pagina, sotto la chiave che gli passa l'app.
 */

/* --------------------------------------------------------------- lo stile */

/**
 * Quel poco che i fogli delle app non hanno già.
 *
 * Le pastiglie, i campi e i pulsanti li vestono le app — `.chip`, `.mini`,
 * `.btn` sono uguali dappertutto e devono restare uguali. Qui c'è solo quello
 * che prima non esisteva: il menu del tasto destro e la finestrella. I colori
 * arrivano dalle variabili del tema, così in Foto è ambra e in Musica viola
 * senza una riga di differenza.
 */
const STILE = `
.proposte-menu{position:fixed; z-index:120; min-width:170px; padding:5px;
  background:var(--panel2,#161922); border:1px solid var(--line2,#2e3340);
  border-radius:11px; box-shadow:0 14px 38px rgba(0,0,0,.55)}
.proposte-menu .titolo{padding:6px 10px 8px; font-size:11.5px; color:var(--dim,#868c9e);
  border-bottom:1px solid var(--line,#22262f); margin-bottom:5px;
  max-width:230px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.proposte-menu button{display:block; width:100%; text-align:left; background:none; border:0;
  color:var(--txt,#eceef4); font:inherit; font-size:13px; padding:7px 10px;
  border-radius:8px; cursor:pointer}
.proposte-menu button:hover{background:rgba(255,255,255,.07)}
.proposte-menu button.togli{color:#f0a9a9}
.proposte-menu button.togli:hover{color:#fff; background:rgba(248,113,113,.18)}

.proposte-scheda{padding:0; width:min(560px,92vw); color:var(--txt,#eceef4);
  background:var(--panel,#111319); border:1px solid var(--line2,#2e3340);
  border-radius:var(--radius,16px); box-shadow:0 24px 70px rgba(0,0,0,.6)}
.proposte-scheda::backdrop{background:rgba(6,7,11,.7)}
.proposte-scheda form{margin:0; padding:18px}
.proposte-scheda h3{margin:0 0 4px; font-size:16px}
.proposte-scheda .sotto{font-size:12px; color:var(--dim,#868c9e); margin-bottom:14px}
.proposte-scheda .campo{margin-bottom:12px}
.proposte-scheda .fondo{display:flex; gap:9px; justify-content:flex-end; margin-top:16px}
`;

function mettiStile() {
  if (document.getElementById("daprod-proposte-stile")) return;
  const foglio = document.createElement("style");
  foglio.id = "daprod-proposte-stile";
  foglio.textContent = STILE;
  document.head.appendChild(foglio);
}

/* ------------------------------------------------------------ il magazzino */

/** Quello che si legge sulla pastiglia quando un titolo non gliel'hai dato. */
const accorcia = (testo, quanto = 42) =>
  testo.length > quanto ? `${testo.slice(0, quanto - 2).trimEnd()}…` : testo;

/**
 * Le proposte di questa app: le tue se le hai toccate, altrimenti quelle di
 * partenza.
 *
 * Finché non cambi niente non si scrive niente: così, se in una versione nuova
 * le proposte di partenza migliorano, chi non le ha mai toccate se le ritrova.
 * Al primo cambiamento l'elenco diventa tuo per intero.
 */
function leggi(chiave, difetto) {
  try {
    const salvate = JSON.parse(localStorage.getItem(chiave) || "null");
    if (Array.isArray(salvate)) {
      return salvate
        .map((p) => ({ titolo: String(p?.titolo || ""), prompt: String(p?.prompt || "") }))
        .filter((p) => p.prompt);
    }
  } catch {
    // Roba illeggibile in memoria: si riparte da quelle di partenza invece di
    // lasciare l'app senza proposte.
  }
  return difetto.map((p) => ({ ...p }));
}

const scrivi = (chiave, elenco) => localStorage.setItem(chiave, JSON.stringify(elenco));

/* ------------------------------------------------------- il menu del destro */

let menuAperto = null;

function chiudiMenu() {
  menuAperto?.remove();
  menuAperto = null;
}

/**
 * Il menu che compare col tasto destro: modifica, elimina.
 *
 * Si apre dove hai cliccato e si richiude a qualunque altro clic, con Esc o se
 * la pagina scorre — un menu che resta lì mentre il contenuto sotto si sposta è
 * un menu che agisce sulla cosa sbagliata.
 */
function apriMenu(evento, proposta, voci) {
  chiudiMenu();

  const menu = document.createElement("div");
  menu.className = "proposte-menu";

  const titolo = document.createElement("div");
  titolo.className = "titolo";
  titolo.textContent = proposta.titolo || accorcia(proposta.prompt, 30);
  menu.appendChild(titolo);

  for (const voce of voci) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = voce.classe || "";
    b.textContent = voce.etichetta;
    b.onclick = () => {
      chiudiMenu();
      voce.azione();
    };
    menu.appendChild(b);
  }

  document.body.appendChild(menu);

  // Messo a schermo prima di misurarlo: senza le misure vere, un menu aperto
  // in fondo alla finestra finisce mezzo fuori.
  const misura = menu.getBoundingClientRect();
  const x = Math.min(evento.clientX, window.innerWidth - misura.width - 8);
  const y = Math.min(evento.clientY, window.innerHeight - misura.height - 8);
  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;

  menuAperto = menu;
}

addEventListener("pointerdown", (ev) => {
  if (menuAperto && !menuAperto.contains(ev.target)) chiudiMenu();
});
addEventListener("keydown", (ev) => ev.key === "Escape" && chiudiMenu());
addEventListener("scroll", chiudiMenu, true);
addEventListener("resize", chiudiMenu);

/* --------------------------------------------------------- la finestrella */

/**
 * Chiede titolo e prompt. Torna la proposta, o `null` se hai annullato.
 *
 * È un `<dialog>` vero e non un riquadro finto: non si può cliccare quello che
 * c'è sotto e il fuoco resta dentro — due cose che a mano si scrivono male.
 *
 * **Chi la chiude la toglie di mezzo da sé**, invece di aspettare l'evento
 * `close` del `<dialog>`: su Chromium quell'evento non è arrivato, e la
 * finestrella restava attaccata alla pagina — invisibile, una copia per ogni
 * volta che l'avevi aperta, e chi aspettava la risposta non l'ha mai avuta.
 */
function chiediProposta(partenza, intestazione) {
  mettiStile();

  const scheda = document.createElement("dialog");
  scheda.className = "proposte-scheda";
  scheda.innerHTML = `
    <form>
      <h3></h3>
      <div class="sotto">Il titolo è quello che si legge sulla pastiglia: due o tre parole.
        Il prompt è quello che finisce nella casella quando la clicchi.</div>
      <div class="campo">
        <label for="propTitolo">Titolo (facoltativo)</label>
        <input id="propTitolo" type="text" maxlength="40" placeholder="Es. Vicolo sotto la pioggia">
      </div>
      <div class="campo">
        <label for="propPrompt">Prompt</label>
        <textarea id="propPrompt" rows="4" placeholder="Es. un vicolo di città sotto la pioggia, insegne accese"></textarea>
      </div>
      <div class="fondo">
        <button type="button" class="mini" value="no">Annulla</button>
        <button type="submit" class="btn">Salva</button>
      </div>
    </form>`;

  scheda.querySelector("h3").textContent = intestazione;
  const campoTitolo = scheda.querySelector("#propTitolo");
  const campoPrompt = scheda.querySelector("#propPrompt");
  campoTitolo.value = partenza.titolo || "";
  campoPrompt.value = partenza.prompt || "";

  document.body.appendChild(scheda);

  return new Promise((risolvi) => {
    let finita = false;

    /** Chiude, toglie e risponde. Una volta sola, da qualunque strada si arrivi. */
    const finisci = (esito) => {
      if (finita) return;
      finita = true;
      try {
        scheda.close();
      } catch {
        // Già chiusa: non cambia niente, quello che conta è toglierla di mezzo.
      }
      scheda.remove();
      risolvi(esito);
    };

    scheda.querySelector("form").onsubmit = (ev) => {
      ev.preventDefault();
      const prompt = campoPrompt.value.trim();
      if (!prompt) {
        // Una proposta senza prompt non è una proposta: si resta qui invece di
        // salvare una pastiglia che non fa niente.
        campoPrompt.focus();
        return;
      }
      finisci({ titolo: campoTitolo.value.trim(), prompt });
    };

    scheda.querySelector('[value="no"]').onclick = () => finisci(null);

    // Esc: `cancel` è l'evento suo, ma non ci si appoggia da soli — vale lo
    // stesso discorso di `close` qui sopra.
    scheda.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      finisci(null);
    });
    scheda.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        finisci(null);
      }
      // Ctrl+Invio salva anche dalla casella grande, dove Invio va a capo.
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) scheda.querySelector("form").requestSubmit();
    });

    scheda.showModal();
    (partenza.prompt && !partenza.titolo ? campoTitolo : campoPrompt).focus();
  });
}

/* ------------------------------------------------------------- il collegamento */

/**
 * Disegna le proposte dentro `contenitore` e le tiene aggiornate.
 *
 * - `chiave`: dove ricordarle (una per app, e per elenco).
 * - `difetto`: le proposte di partenza, `[{ titolo, prompt }]`.
 * - `applica(prompt)`: cosa fare quando ne clicchi una. Di solito: scriverla
 *   nella casella.
 * - `testoCorrente()`: cosa c'è scritto adesso nella casella. Serve al `+`, che
 *   parte da lì invece che da vuoto: quasi sempre la proposta che vuoi salvare è
 *   quella che hai appena finito di scrivere.
 *
 * Torna `{ ridisegna }`, per chi deve rinfrescarle da fuori.
 */
export function collegaProposte(contenitore, { chiave, difetto = [], applica, testoCorrente }) {
  mettiStile();

  let elenco = leggi(chiave, difetto);

  const salva = (nuovo) => {
    elenco = nuovo;
    scrivi(chiave, elenco);
    disegna();
  };

  async function modifica(indice) {
    const esito = await chiediProposta(elenco[indice], "Modifica la proposta");
    if (!esito) return;
    const copia = elenco.slice();
    copia[indice] = esito;
    salva(copia);
  }

  function elimina(indice) {
    const p = elenco[indice];
    if (!confirm(`Eliminare "${p.titolo || accorcia(p.prompt, 40)}"?`)) return;
    salva(elenco.filter((_, i) => i !== indice));
  }

  async function aggiungi() {
    const esito = await chiediProposta(
      { titolo: "", prompt: testoCorrente?.() || "" },
      "Nuova proposta",
    );
    if (!esito) return;
    salva([...elenco, esito]);
  }

  function disegna() {
    contenitore.innerHTML = "";

    elenco.forEach((p, indice) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = p.titolo || accorcia(p.prompt);
      // Il prompt intero si legge passandoci sopra: il titolo dice di cosa si
      // tratta, il resto non deve sparire.
      chip.title = `${p.prompt}\n\n(tasto destro: modifica o elimina)`;
      chip.onclick = () => applica(p.prompt);
      chip.oncontextmenu = (ev) => {
        ev.preventDefault();
        apriMenu(ev, p, [
          { etichetta: "Modifica", azione: () => void modifica(indice) },
          { etichetta: "Elimina", classe: "togli", azione: () => elimina(indice) },
        ]);
      };
      contenitore.appendChild(chip);
    });

    const piu = document.createElement("button");
    piu.type = "button";
    piu.className = "chip add";
    piu.textContent = "+";
    piu.title = "Aggiungi una proposta tua";
    piu.onclick = () => void aggiungi();
    contenitore.appendChild(piu);

    // Cancellate tutte, la strada per tornare indietro deve restare in vista:
    // altrimenti l'unico modo sarebbe svuotare la memoria del browser.
    if (!elenco.length) {
      const torna = document.createElement("button");
      torna.type = "button";
      torna.className = "chip";
      torna.textContent = "riporta quelle di partenza";
      torna.onclick = () => {
        localStorage.removeItem(chiave);
        elenco = leggi(chiave, difetto);
        disegna();
      };
      contenitore.appendChild(torna);
    }
  }

  disegna();
  return { ridisegna: disegna };
}
