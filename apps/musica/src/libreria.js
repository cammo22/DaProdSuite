/**
 * La scheda Libreria: l'elenco dei brani e il dettaglio di quello scelto.
 *
 * I brani non stanno nella memoria del browser: sono file veri in
 * `output/musica`, letti dalla libreria condivisa della suite. Per questo
 * sopravvivono a tutto — svuotare la cache, reinstallare la suite, aprire la
 * cartella e spostarli a mano — e per questo li vedono anche le altre app.
 */

import { $, el, escapeHtml, fmtTime, mostraErrore, mostraScheda } from "./dom.js";
import { annuncia, ascolta } from "./bus.js";
import { stato } from "./stato.js";
import { collegaRighe, rigaBrano } from "./righe.js";
import { impostaCoda, riproduciId } from "./lettore.js";
import { grafoImmagine, promptCopertina } from "./grafi.js";
import { ESTETICHE } from "./dati/estetiche.js";
import { aggiungiLavoro, scordaDisegno, disegnaSessione } from "./coda.js";
import { applicaMeta, nuovaResa } from "./crea.js";
import * as ponte from "./ponte.js";

export async function aggiornaLibreria() {
  stato.brani = await ponte.brani();

  el.navLib.textContent = stato.brani.length;
  el.libCount.textContent = stato.brani.length ? `(${stato.brani.length})` : "";
  if (stato.selezionato && !stato.brani.some((b) => b.id === stato.selezionato)) {
    stato.selezionato = null;
  }

  // La coda d'ascolto è la libreria: finito un brano parte il successivo.
  impostaCoda(stato.brani);

  disegnaElenco();
  disegnaDettaglio();
  scordaDisegno();
  disegnaSessione();
}

function disegnaElenco() {
  el.libList.innerHTML = stato.brani.length
    ? stato.brani.map(rigaBrano).join("")
    : `<div class="empty">Ancora nessun brano.</div>`;

  collegaRighe(el.libList);
  el.libList.querySelectorAll("[data-brano]").forEach((riga) => {
    riga.onclick = () => {
      stato.selezionato = riga.dataset.brano;
      disegnaElenco();
      disegnaDettaglio();
    };
  });
}

function disegnaDettaglio() {
  const brano = stato.brani.find((b) => b.id === stato.selezionato);
  if (!brano) {
    el.detail.innerHTML = `<h2>Dettagli</h2>
      <div class="empty">Scegli un brano per vederne testo, impostazioni e copertina.</div>`;
    return;
  }

  const meta = brano.meta || {};
  const voci = [
    ["Durata max", meta.duration ? meta.duration + " s" : "—"],
    ["Generato in", meta.secs ? fmtTime(meta.secs) + (meta.cached ? " (cache)" : "") : "—"],
    ["Seed struttura", meta.seed_text ?? "—"],
    ["Seed resa", meta.seed_audio ?? "—"],
    ["Passi / CFG", meta.steps ? `${meta.steps} / ${meta.cfg}` : "—"],
    ["File", `${escapeHtml(brano.id.split("/").pop())} &middot; ${(brano.bytes / 1048576).toFixed(1)} MB`],
    ["Data", new Date(meta.ts || brano.creato).toLocaleString("it-IT")],
  ];

  el.detail.innerHTML = `
    <h2>Dettagli</h2>
    ${brano.copertina
      ? `<img class="art" id="coverImg" src="${escapeHtml(brano.copertina)}" title="clicca per cambiare copertina" alt="">`
      : `<div class="art" id="coverImg" title="clicca per mettere una copertina"></div>`}
    <div class="field">
      <label>Nome del brano</label>
      <div class="inline">
        <input id="renameBox" value="${escapeHtml(brano.nome)}">
        <button class="mini" id="renameBtn">rinomina</button>
      </div>
    </div>
    <button class="btn wide" id="playBtn">&#9654; Ascolta</button>
    <dl class="kv">${voci.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    <label>Copertina automatica dal titolo e dal testo</label>
    <div class="inline" style="margin-bottom:8px">
      <select id="coverStyle"><option value="">nessuno</option>${Object.keys(ESTETICHE).map((k) => `<option>${escapeHtml(k)}</option>`).join("")}</select>
      <button class="mini" id="coverReroll" title="ricostruisci">&#8635;</button>
    </div>
    <textarea id="coverPrompt" rows="3">${escapeHtml(promptCopertina(brano.nome, meta.lyrics, "Illustrazione"))}</textarea>
    <div class="acts" style="margin-bottom:12px"><button id="coverGen">genera copertina</button></div>
    ${meta.caption ? `<label>Stile usato</label><div class="box">${escapeHtml(meta.caption)}</div>` : ""}
    ${meta.lyrics && String(meta.lyrics).trim()
      ? `<label style="margin-top:12px">Testo</label><div class="box">${escapeHtml(meta.lyrics)}</div>`
      : ""}
    <div class="acts">
      <button id="revealBtn">mostra nella cartella</button>
      <button id="visualBtn">apri nel Visualizer</button>
      ${brano.copertina ? `<button id="coverDel">togli copertina</button>` : ""}
      ${meta.caption ? `<button id="reuseBtn">riusa i parametri</button><button id="regenBtn">nuova resa</button>` : ""}
      <button class="del" id="delBtn">elimina</button>
    </div>`;

  collegaDettaglio(brano, meta);
}

function collegaDettaglio(brano, meta) {
  $("playBtn").onclick = () => riproduciId(brano.id);

  $("coverImg").onclick = () => {
    el.coverPicker.onchange = copertinaDaFile;
    el.coverPicker.click();
  };

  const ricostruisci = () =>
    ($("coverPrompt").value = promptCopertina(brano.nome, meta.lyrics, $("coverStyle").value));
  $("coverReroll").onclick = ricostruisci;
  $("coverStyle").onchange = ricostruisci;

  $("coverGen").onclick = async () => {
    try {
      const id = await ponte.invia(grafoImmagine($("coverPrompt").value, Math.floor(Math.random() * 2 ** 31)));
      aggiungiLavoro(id, { titolo: brano.nome }, { specie: "copertina", bersaglio: brano.id });
    } catch (e) {
      mostraErrore(String(e.message || e));
    }
  };

  $("renameBtn").onclick = async () => {
    const nome = $("renameBox").value.trim();
    if (!nome) return;
    const rinominato = await ponte.rinomina(brano.id, nome);
    if (rinominato) stato.selezionato = rinominato.id;
    await aggiornaLibreria();
  };

  $("revealBtn").onclick = () => ponte.mostraNellaCartella(brano.id);

  // Il senso della suite in un bottone: il brano se ne va nell'app che lo sa
  // far vedere, senza passare da un salvataggio e un trascinamento.
  $("visualBtn").onclick = () => ponte.mandaA("visualizer", brano.id, "riproduci");

  if ($("coverDel")) {
    $("coverDel").onclick = async () => {
      await ponte.impostaCopertina(brano.id, null);
      await aggiornaLibreria();
    };
  }

  if ($("reuseBtn")) {
    $("reuseBtn").onclick = () => {
      applicaMeta(meta);
      mostraScheda("crea");
    };
  }

  if ($("regenBtn")) {
    $("regenBtn").onclick = () => {
      applicaMeta(meta);
      mostraScheda("crea");
      nuovaResa();
    };
  }

  $("delBtn").onclick = async () => {
    if (!confirm(`Eliminare definitivamente "${brano.nome}"?`)) return;
    await ponte.eliminaElemento(brano.id);
    stato.selezionato = null;
    await aggiornaLibreria();
  };
}

/** Una copertina scelta da un file dell'utente: ritagliata quadrata e salvata. */
function copertinaDaFile(ev) {
  const file = ev.target.files[0];
  ev.target.value = "";
  if (!file || !stato.selezionato) return;

  const indirizzo = URL.createObjectURL(file);
  const id = stato.selezionato;
  void (async () => {
    try {
      await ponte.impostaCopertina(id, await ponte.ritagliaQuadrata(indirizzo));
      await aggiornaLibreria();
    } catch (e) {
      mostraErrore(`Non sono riuscito a usare quell'immagine: ${e.message || e}`);
    } finally {
      URL.revokeObjectURL(indirizzo);
    }
  })();
}

export function collegaLibreria() {
  el.refreshLib.onclick = () => aggiornaLibreria();

  ascolta("libreria-cambiata", () => void aggiornaLibreria());
  ascolta("ascolto-cambiato", () => {
    disegnaElenco();
    scordaDisegno();
    disegnaSessione();
  });

  // Il pulsante "dettagli" di una riga, ovunque si trovi, porta qui.
  ascolta("mostra-dettaglio", (id) => {
    stato.selezionato = id;
    mostraScheda("libreria");
    disegnaElenco();
    disegnaDettaglio();
  });

  // Qualunque app produca o cancelli qualcosa, l'elenco si aggiorna da solo.
  ponte.suLibreriaCambiata(() => void aggiornaLibreria());

  // Un'immagine mandata qui da un'altra app diventa la copertina del brano
  // aperto: è la strada che DaProdFoto userà per vestire un brano.
  ponte.suConsegna(async (consegna) => {
    if (consegna.intenzione === "usaComeCopertina" && stato.selezionato) {
      await ponte.impostaCopertina(stato.selezionato, await ponte.ritagliaQuadrata(consegna.elemento.url));
      await aggiornaLibreria();
      return;
    }
    mostraScheda("libreria");
    annuncia("mostra-dettaglio", consegna.elemento.id);
  });
}
