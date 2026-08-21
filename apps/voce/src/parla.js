/**
 * La scheda: da un testo a una voce.
 *
 * Il giro è corto: si scrive, si sceglie con che voce, si preme. Quello che
 * succede dopo è un lavoro del motore — venti o trenta secondi per una frase di
 * cinque — quindi non si aspetta una risposta: si chiede un lavoro, si riceve un
 * numero, e si va a vedere come va una volta al secondo.
 *
 * **Il testo lungo non è un problema di questa pagina.** Lo taglia il motore,
 * dove finiscono le frasi, e ricuce i pezzi con un respiro in mezzo: qui si
 * mostra solo a che pezzo è arrivato, perché su un testo di dieci righe è
 * l'unica cosa che dice davvero quanto manca.
 */

import { durata, el, escapeHtml, libera, mostraErrore, nascondiErrore, occupa, rnd } from "./dom.js";
import { modelloCorrente, modelloUsabile } from "./scelta-modello.js";
import { aggiornaGalleria } from "./galleria.js";
import { stato } from "./stato.js";
import * as ponte from "./ponte.js";

/** I lavori di questa sessione, il più recente per primo. */
let lavori = [];
let motoreVivo = false;

/** Quanto ci mette a leggere: quattordici caratteri al secondo, misurati. */
const SECONDI_STIMATI = (testo) => testo.trim().length / 14;

export function motoreCollegato(vivo) {
  motoreVivo = vivo;
  accendiBottoni();
}

export function accendiBottoni() {
  el.parla.disabled = !(motoreVivo && modelloUsabile());
}

/* ------------------------------------------------------------- il modulo */

function raccontaTesto() {
  const testo = el.testo.value.trim();
  if (!testo) {
    el.conto.textContent = "";
    return;
  }
  const secondi = SECONDI_STIMATI(testo);
  el.conto.textContent =
    `${testo.length} caratteri, sui ${durata(secondi)} di lettura. ` +
    (secondi > 25 ? "Viene tagliato in pezzi e ricucito: il taglio cade dove finiscono le frasi." : "");
}

/**
 * Il menu delle voci.
 *
 * «Di serie» non è una voce nostra: è il modello che sceglie da sé come suona,
 * e cambia da una frase all'altra. Per una voce che resta la stessa serve un
 * riferimento, ed è quello che dice la riga sotto.
 */
export function disegnaVoci() {
  const salvate = stato.voci;
  const scelta = el.voce.value;

  el.voce.innerHTML = [
    `<option value="">Di serie (la sceglie il modello)</option>`,
    ...salvate.map((v) => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.nome)}</option>`),
  ].join("");
  el.voce.value = salvate.some((v) => v.id === scelta) ? scelta : "";

  raccontaVoce();
}

function raccontaVoce() {
  el.notaVoce.textContent = el.voce.value
    ? "La voce viene copiata dal riferimento a ogni pezzo di testo: il timbro resta lo stesso anche su un discorso lungo."
    : "Senza riferimento il modello si inventa una voce, e la prossima frase può averne un'altra. Vai su «Voci» per dargliene una da copiare.";
}

/* --------------------------------------------------------------- il giro */

export function collegaParla() {
  el.testo.addEventListener("input", raccontaTesto);
  el.voce.addEventListener("change", raccontaVoce);

  el.temperatura.addEventListener("input", () => {
    el.temperaturaVal.textContent = Number(el.temperatura.value).toFixed(2).replace(".", ",");
  });
  el.secondiMassimi.addEventListener("input", () => {
    el.secondiVal.textContent = `${el.secondiMassimi.value} s`;
  });
  el.temperatura.dispatchEvent(new Event("input"));
  el.secondiMassimi.dispatchEvent(new Event("input"));

  el.seme.value = rnd();
  el.dado.onclick = () => (el.seme.value = rnd());

  el.toggleAdv.onclick = () => {
    el.avanzati.hidden = !el.avanzati.hidden;
    el.toggleAdv.classList.toggle("on", !el.avanzati.hidden);
  };

  el.libera.onclick = async () => {
    occupa(el.libera, "libero…");
    try {
      await ponte.liberaMemoria();
    } catch {
      // Il motore non risponde: non è una cosa da raccontare qui, il pallino
      // in alto lo dice già.
    } finally {
      libera(el.libera);
    }
  };

  el.parla.onclick = () => void manda();

  disegnaSessione();
  // Una volta al secondo: fa scorrere i tempi e va a vedere i lavori in corso.
  setInterval(() => void giro(), 1000);
}

async function manda() {
  nascondiErrore();
  const testo = el.testo.value.trim();
  if (!testo) return mostraErrore("Scrivi cosa deve dire.");

  if (el.semeCasuale.checked) el.seme.value = rnd();

  occupa(el.parla, "mando al motore…");
  try {
    const richiesta = {
      testo,
      modello: modelloCorrente().id,
      voce: el.voce.value || null,
      temperatura: Number(el.temperatura.value),
      seme: Number(el.seme.value) || 0,
      secondiMassimi: Number(el.secondiMassimi.value),
    };
    const esito = await ponte.parla(richiesta);

    lavori.unshift({
      numero: esito.id,
      testo,
      voce: el.voce.selectedOptions[0]?.textContent ?? "",
      modello: modelloCorrente().nome,
      stato: "in-attesa",
      fatti: 0,
      totali: esito.pezzi || 1,
      cosa: "in coda",
      inizio: Date.now(),
      risultato: null,
    });
    lavori = lavori.slice(0, 12);
    disegnaSessione();
  } catch (e) {
    mostraErrore(String(e.message || e));
  } finally {
    libera(el.parla, !(motoreVivo && modelloUsabile()));
  }
}

/**
 * Chiede al motore come vanno i lavori che non sono finiti.
 *
 * Quando uno finisce si rilegge la libreria, e non per pignoleria: il file lo
 * scrive Python direttamente sul disco, quindi la suite non sa che è comparso
 * finché non lo si va a guardare — e senza quel giro il lettore qui sotto non
 * avrebbe nessun indirizzo da cui suonare.
 */
async function giro() {
  const vivi = lavori.filter((l) => l.stato === "in-attesa" || l.stato === "in-corso");
  if (!vivi.length) {
    // Un lavoro finito da poco che non ha ancora un indirizzo: la libreria della
    // suite tiene in cache la scansione per un secondo, quindi il file appena
    // scritto può non esserci ancora. Si ripassa finché non compare, e non oltre
    // mezzo minuto — dopo, vuol dire che quel file non c'è davvero.
    const appesi = lavori.some(
      (l) => l.stato === "fatto" && l.risultato && !urlDelRisultato(l.risultato) &&
        Date.now() - l.inizio < 30_000,
    );
    if (appesi) await aggiornaGalleria();
    if (lavori.length) disegnaSessione();
    return;
  }

  let qualcunoHaFinito = false;
  for (const l of vivi) {
    try {
      const risposta = await ponte.lavoro(l.numero);
      l.stato = risposta.stato;
      l.fatti = risposta.fatti;
      l.totali = risposta.totali;
      l.cosa = risposta.cosa;
      l.risultato = risposta.risultato;
      if (risposta.stato === "fatto") qualcunoHaFinito = true;
      if (risposta.stato === "errore") {
        mostraErrore(risposta.errore || "Il motore si è fermato senza dire perché.");
      }
    } catch {
      // Motore spento a metà lavoro: se ne riparla al prossimo giro. Il lavoro
      // resta in elenco, perché il file potrebbe essere stato scritto lo stesso.
    }
  }

  if (qualcunoHaFinito) await aggiornaGalleria();
  disegnaSessione();
}

/* ------------------------------------------------------------ la sessione */

/**
 * Le righe di quello che si è chiesto, aggiornate **una per una**.
 *
 * Non si ridisegna tutto l'elenco come fanno le altre app, e c'è un motivo: qui
 * ogni riga finita contiene un lettore audio. Riscrivere l'HTML del contenitore
 * una volta al secondo — perché il tempo trascorso del lavoro in corso cambia —
 * vorrebbe dire fermare la voce che stai ascoltando ogni volta che il secondo
 * scatta. Quindi ogni riga ha il suo riquadro, e si tocca solo quella che è
 * davvero cambiata.
 */
function disegnaSessione() {
  if (!lavori.length) {
    el.sessione.innerHTML = `<div class="empty">Niente da dire, per ora. Scrivi qui accanto e premi <b>Parla</b>.</div>`;
    return;
  }

  const vuoto = el.sessione.querySelector(".empty");
  if (vuoto) vuoto.remove();

  for (const l of lavori) {
    const chiave = String(l.numero);
    let riquadro = el.sessione.querySelector(`[data-lavoro="${chiave}"]`);
    if (!riquadro) {
      riquadro = document.createElement("div");
      riquadro.dataset.lavoro = chiave;
      // In cima: l'ultimo che hai chiesto è quello che stai guardando.
      el.sessione.prepend(riquadro);
    }

    const html = riga(l);
    if (riquadro.dataset.impronta === html) continue;
    riquadro.dataset.impronta = html;
    riquadro.innerHTML = html;
    collegaRiga(riquadro);
  }
}

function collegaRiga(dove) {
  dove.querySelectorAll("[data-cartella]").forEach((b) => {
    b.onclick = () => ponte.mostraNellaCartella(b.dataset.cartella);
  });
  dove.querySelectorAll("[data-riusa]").forEach((b) => {
    b.onclick = () => {
      el.testo.value = b.dataset.riusa;
      raccontaTesto();
      el.testo.focus();
    };
  });
}

function riga(l) {
  const secondi = Math.floor((Date.now() - l.inizio) / 1000);

  if (l.stato === "fatto" && l.risultato) {
    const url = urlDelRisultato(l.risultato);
    // Senza indirizzo non si disegna un lettore vuoto: si dice che si sta
    // salvando, e al giro dopo — quando la libreria ha visto il file — la riga
    // si rifà da sé con dentro il lettore vero.
    if (!url) {
      return `<div class="track">
        <div class="thumb">&#9835;</div>
        <div class="tmeta">
          <div class="tt" title="${escapeHtml(l.testo)}">${escapeHtml(l.testo)}</div>
          <div class="tsub">salvo…</div>
        </div>
      </div>`;
    }
    return `<div class="detta">
      <div class="thumb">&#9835;</div>
      <div class="tmeta">
        <div class="tt" title="${escapeHtml(l.testo)}">${escapeHtml(l.testo)}</div>
        <div class="tsub">${escapeHtml(l.modello)} &middot; ${escapeHtml(l.voce)} &middot;
          ${l.risultato.secondi} s &middot; fatto in ${durata(l.risultato.impiegati)}</div>
        <audio src="${escapeHtml(url)}" controls preload="metadata"></audio>
        <div class="acts">
          <button data-cartella="${escapeHtml(l.risultato.id)}">cartella</button>
          <button data-riusa="${escapeHtml(l.testo)}">rimettilo nel testo</button>
        </div>
      </div>
    </div>`;
  }

  const quanto = l.totali > 1 ? ` &middot; pezzo ${Math.min(l.fatti + 1, l.totali)} di ${l.totali}` : "";
  const avanzamento = l.totali > 0 ? (l.fatti / l.totali) * 100 : 0;

  return `<div class="track">
    <div class="thumb shimmer"></div>
    <div class="tmeta">
      <div class="tt" title="${escapeHtml(l.testo)}">${escapeHtml(l.testo)}</div>
      <div class="tsub">${escapeHtml(l.cosa)}${quanto} &middot; ${durata(secondi)}</div>
      <div class="bar"><i class="p1" style="width:${avanzamento.toFixed(1)}%"></i></div>
    </div>
  </div>`;
}

/**
 * L'indirizzo con cui la pagina può sentire un file appena scritto.
 *
 * Il motore torna l'id della libreria (`voce/qualcosa.wav`), non un indirizzo:
 * gli indirizzi `daprod://` li fa la suite, ed è lei l'unica che sa dove sta
 * davvero la cartella dei risultati. Quindi si cerca l'elemento fra quelli che
 * la Galleria ha appena riletto.
 */
function urlDelRisultato(risultato) {
  return stato.detti.find((d) => d.id === risultato.id)?.url ?? "";
}
