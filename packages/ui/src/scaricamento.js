/**
 * La barra di quello che sta arrivando: un modello che si scarica, visto da
 * dentro l'app che lo ha chiesto.
 *
 * **Perché è un pezzo comune.** Fino alla 0.4.0 la barra vera ce l'aveva
 * DaProdFoto e basta. Le altre dicevano «Scarico… l'avanzamento è nell'hub»:
 * cioè ti chiedevano di chiudere quello che stavi facendo, tornare all'hub e
 * guardare lì se i dodici GB stavano arrivando o se si era piantato tutto. Chi
 * scarica un modello lo scarica **da dentro** l'app, e lì deve poterlo vedere.
 *
 * Fa tre cose e nient'altro:
 *
 * 1. dice cosa manca e quanto pesa, con il tasto per prenderlo,
 * 2. mentre arriva mostra la barra, i GB, la velocità e quanto manca,
 * 3. quando finisce **rilegge cosa c'è davvero sul disco** invece di credere al
 *    messaggio: dopo un «annulla» il modello manca ancora, ed è giusto che il
 *    riquadro torni a dirlo.
 *
 * **Non conosce la suite**: chi lo usa gli passa le quattro funzioni del proprio
 * ponte (`stato`, `scarica`, `annulla`, `onAvanzamento`), che ogni app ha già.
 *
 * **Non conosce nemmeno il proprio foglio di stile**: se lo porta dietro, con i
 * colori presi dalle variabili del tema. Così in Musica è viola e in Foto ambra
 * senza una riga di differenza, e funziona anche nelle pagine che il tema
 * comune non ce l'hanno (DaProdDream).
 */

const STILE = `
.dl{display:flex; flex-direction:column; gap:9px}
.dl .dl-testa{display:flex; align-items:baseline; gap:10px; justify-content:space-between}
.dl .dl-titolo{font-size:13px}
.dl .dl-quanto{font-size:11.5px; color:var(--dim,#868c9e); white-space:nowrap}
.dl .dl-barra{position:relative; height:7px; border-radius:99px; overflow:hidden;
  background:var(--bg2,#080a0f); border:1px solid var(--line,#22262f)}
.dl .dl-barra i{position:absolute; top:0; bottom:0; left:0; display:block; border-radius:99px;
  background:linear-gradient(90deg,#7c3aed,var(--accent,#a78bfa)); transition:width .35s ease-out}
.dl .dl-barra.dl-ignoto i{width:35%; animation:dl-scorre 1.5s ease-in-out infinite; opacity:.55}
@keyframes dl-scorre{0%{left:-35%}100%{left:100%}}
.dl .dl-riga{font-size:12px; color:var(--dim,#868c9e)}
.dl .dl-fondo{display:flex; align-items:center; gap:10px; justify-content:space-between}
.dl .dl-guasto{color:#f0a9a9; font-size:12.5px}
.dl button{font:inherit; font-size:12px; padding:5px 10px; border-radius:9px; cursor:pointer;
  color:var(--txt,#eceef4); background:var(--panel2,#161922); border:1px solid var(--line2,#2e3340)}
.dl button:hover{border-color:var(--accent,#a78bfa)}
.dl button:disabled{opacity:.5; cursor:default}
.dl button.dl-prendi{padding:8px 14px; font-size:13px; font-weight:600}
`;

let stileMesso = false;

function mettiStile() {
  if (stileMesso) return;
  stileMesso = true;
  const foglio = document.createElement("style");
  foglio.textContent = STILE;
  document.head.appendChild(foglio);
}

const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const gb = (byte) => `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;

/** «11,4 MB/s», e sotto il mega si scende ai KB invece di scrivere 0,0. */
function velocita(bytesAlSecondo) {
  if (!(bytesAlSecondo > 0)) return "";
  const mb = bytesAlSecondo / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB/s`;
  return `${Math.round(bytesAlSecondo / 1024)} KB/s`;
}

/**
 * Quanto manca, detto come lo direbbe una persona.
 *
 * Sopra l'ora si scrive «più di un'ora» e non «1 h 47 min»: su una linea che
 * ballonzola quel numero è finto, e uno ci fa dei piani sopra.
 */
function mancano(secondi) {
  if (!(secondi > 0) || !Number.isFinite(secondi)) return "";
  if (secondi < 90) return "meno di un minuto";
  const minuti = Math.round(secondi / 60);
  if (minuti < 60) return `~${minuti} min`;
  return "più di un'ora";
}

/**
 * Collega il riquadro dentro `contenitore`.
 *
 * `contenitore` è un elemento vuoto dell'app (di solito un `div` nascosto): lo
 * riempie e lo mostra o lo nasconde da sé.
 *
 * Torna `{ controlla, mostraAvanzamento }`:
 *
 * - `controlla({ ids, nome, spiega })` chiede alla suite cosa manca di quei
 *   modelli e disegna di conseguenza. Torna `true` se non manca niente, che è
 *   quello che serve a chi deve accendere o spegnere il tasto «Genera».
 * - `mostraAvanzamento` dice se in questo momento c'è uno scaricamento in corso.
 *
 * `onCambio(pronto)` viene chiamata ogni volta che la risposta cambia — a
 * scaricamento finito, per esempio — così l'app riaccende i suoi bottoni senza
 * doverlo chiedere.
 */
export function collegaScaricamento(contenitore, { stato, scarica, annulla, onAvanzamento, onCambio, io }) {
  mettiStile();

  /** L'ultima domanda fatta: serve per rileggere da soli a fine scaricamento. */
  let ultima = { ids: [], nome: "Il modello", spiega: "" };
  let mancante = null;
  /** Vero mentre la suite sta scaricando: da qui o da un'altra finestra. */
  let inCorso = false;
  /** Vero se a scaricare è **questa** scheda: solo allora «Annulla» ferma qualcosa. */
  let nostro = true;
  /** I campioni per la velocità: `[quando, byte fatti]`, ultimi dieci secondi. */
  let campioni = [];

  function svuota() {
    contenitore.hidden = true;
    contenitore.innerHTML = "";
  }

  function prendi() {
    campioni = [];
    inCorso = true;
    disegnaAvanzamento({ done: 0, total: mancante?.bytesMancanti ?? 0, label: "Comincio" });
    void scarica(ultima.ids);
  }

  /* ------------------------------------------------------------ i disegni */

  function disegnaMancante() {
    if (!mancante || mancante.pronto) return svuota();

    const pesi = mancante.mancanti.map((m) => m.label);
    const nodi = mancante.nodiMancanti ?? [];

    contenitore.hidden = false;
    contenitore.innerHTML = `
      <div class="dl">
        <div class="dl-titolo"><b>${escapeHtml(ultima.nome)} non è ancora sul disco.</b>
          ${ultima.spiega ? escapeHtml(ultima.spiega) : ""}</div>
        ${pesi.length ? `<div class="dl-riga">${gb(mancante.bytesMancanti)} da scaricare: ${escapeHtml(pesi.join(", "))}.</div>` : ""}
        ${
          nodi.length
            ? `<div class="dl-riga">Il motore deve anche prendere ${escapeHtml(nodi.join(", "))}:
                 quando arriva riparte da solo, e ci vogliono pochi secondi.</div>`
            : ""
        }
        <div><button class="dl-prendi">Scarica ${gb(mancante.bytesMancanti)}</button></div>
      </div>`;
    contenitore.querySelector(".dl-prendi").onclick = prendi;
  }

  function disegnaAvanzamento(avanza) {
    const totale = avanza.total > 0 ? avanza.total : 0;
    const quota = totale ? Math.min(1, avanza.done / totale) : null;

    // La velocità si misura sugli ultimi dieci secondi e non dall'inizio: una
    // ripresa a metà file darebbe una media che non è mai stata vera.
    const ora = Date.now();
    campioni.push([ora, avanza.done]);
    campioni = campioni.filter(([t]) => ora - t <= 10000);
    const [primoT, primoDone] = campioni[0];
    const secondi = (ora - primoT) / 1000;
    const alSecondo = secondi >= 1 ? (avanza.done - primoDone) / secondi : 0;
    const resta = alSecondo > 0 && totale ? (totale - avanza.done) / alSecondo : 0;

    const misure = [
      totale ? `${gb(avanza.done)} di ${gb(totale)}` : gb(avanza.done),
      velocita(alSecondo),
      mancano(resta),
    ].filter(Boolean);

    contenitore.hidden = false;
    contenitore.innerHTML = `
      <div class="dl">
        <div class="dl-testa">
          <span class="dl-titolo">${escapeHtml(avanza.label || "Scarico…")}</span>
          <span class="dl-quanto">${escapeHtml(misure.join(" · "))}</span>
        </div>
        <div class="dl-barra${quota === null ? " dl-ignoto" : ""}">
          <i style="width:${quota === null ? 35 : (quota * 100).toFixed(1)}%"></i>
        </div>
        <div class="dl-fondo">
          <span class="dl-riga">${quota === null ? "Sto contando quanto pesa…" : `${Math.round(quota * 100)}%`}
            — puoi continuare a usare l'app mentre arriva.</span>
          ${nostro ? `<button class="dl-annulla">Annulla</button>` : ""}
        </div>
      </div>`;
    // «Annulla» compare solo se lo scaricamento è nostro: fermare quello di
    // un'altra scheda da qui non si può, e un tasto che non fa niente è peggio
    // di un tasto che non c'è.
    const fermalo = contenitore.querySelector(".dl-annulla");
    if (fermalo) {
      fermalo.onclick = (ev) => {
        ev.currentTarget.disabled = true;
        void annulla();
      };
    }
  }

  function disegnaGuasto(errore) {
    contenitore.hidden = false;
    contenitore.innerHTML = `
      <div class="dl">
        <div class="dl-guasto">${escapeHtml(errore)}</div>
        <div class="dl-riga">Quello che era già arrivato resta sul disco: riprovando
          riprende da lì, non da capo.</div>
        <div><button class="dl-prendi">Riprova</button></div>
      </div>`;
    contenitore.querySelector(".dl-prendi").onclick = prendi;
  }

  /* ------------------------------------------------------------ la domanda */

  async function controlla(domanda = {}) {
    ultima = { ...ultima, ...domanda };

    let risposta;
    try {
      risposta = await stato(ultima.ids);
    } catch {
      // La suite non ha risposto: meglio lasciar provare che bloccare tutto per
      // un dubbio nostro. Se il modello davvero non c'è, lo dirà il motore.
      mancante = null;
      svuota();
      return true;
    }

    mancante = risposta;
    if (!inCorso) disegnaMancante();
    onCambio?.(risposta.pronto);
    return risposta.pronto;
  }

  onAvanzamento((avanza) => {
    // Uno scaricamento in corso lo si mostra anche se l'ha chiesto un'altra
    // finestra: sono gli stessi GB sulla stessa linea, e sapere che stanno
    // arrivando è esattamente quello che manca a chi guarda un tasto spento.
    if (avanza.attivo) {
      if (mancante && mancante.pronto) return;
      inCorso = true;
      nostro = !io || !avanza.app || avanza.app === io;
      disegnaAvanzamento(avanza);
      return;
    }

    if (!inCorso) return;
    inCorso = false;
    campioni = [];

    if (avanza.errore) return disegnaGuasto(avanza.errore);
    void controlla();
  });

  return { controlla, inCorso: () => inCorso };
}
