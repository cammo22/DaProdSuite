/**
 * Le due schede che raccontano cosa il Companion tiene: la memoria e i sogni.
 *
 * **Perché stanno in vista e non nascoste in un menu.** Un compagno che
 * "ricorda" senza far vedere cosa ricorda è una promessa che nessuno può
 * verificare. Qui si guarda l'elenco vero — le persone, i luoghi, i legami — e
 * se c'è dentro una cosa sbagliata la si vede, invece di scoprirlo fra un mese
 * da una risposta strana.
 */

import { el, testo } from "./dom.js";
import { apriCartellaRicordi, grafo, sognaOra, statoSogni, storico } from "./ponte.js";

/* ------------------------------------------------------------- memoria --- */

export async function aggiornaMemoria() {
  await Promise.all([disegnaGrafo(), disegnaStorico()]);
}

async function disegnaGrafo() {
  let dati;
  try {
    dati = await grafo();
  } catch (errore) {
    el.grafo.innerHTML = `<div class="err">${testo(errore.message)}</div>`;
    return;
  }

  if (!dati.nodes.length) {
    el.grafo.innerHTML = `
      <p class="hint">Non ha ancora capito niente di te, ed è normale: le entità
      nascono <b>sognando</b>, e il primo sogno arriva stanotte alle 4 — oppure
      quando lo chiedi tu dalla scheda Sogni.</p>`;
    return;
  }

  // I legami si girano dal punto di vista di ogni entità, così sotto "Cammo" si
  // legge cosa fa Cammo e non una tabella di numeri di riga.
  const perId = new Map(dati.nodes.map((n) => [n.id, n]));
  const legami = new Map(dati.nodes.map((n) => [n.id, []]));
  for (const arco of dati.edges) {
    const da = perId.get(arco.source_node_id);
    const a = perId.get(arco.target_node_id);
    if (!da || !a) continue;
    legami.get(da.id).push(`${arco.edge_type} → ${a.label}`);
    legami.get(a.id).push(`${da.label} → ${arco.edge_type}`);
  }

  el.grafo.innerHTML = dati.nodes
    .map((nodo) => {
      const suoi = legami.get(nodo.id) ?? [];
      return `
        <div class="entita">
          <b>${testo(nodo.label)}</b><span class="tipo">${testo(nodo.node_type)}</span>
          ${suoi.length ? `<div class="legami">${suoi.map(testo).join("<br>")}</div>` : ""}
        </div>`;
    })
    .join("");
}

async function disegnaStorico() {
  let dati;
  try {
    dati = await storico();
  } catch (errore) {
    el.storico.innerHTML = `<div class="err">${testo(errore.message)}</div>`;
    return;
  }

  if (!dati.turns.length) {
    el.storico.innerHTML = `<p class="hint">Niente, per ora.</p>`;
    return;
  }

  // Dal più recente: è quello che si va a cercare.
  el.storico.innerHTML = [...dati.turns]
    .reverse()
    .map(
      (turno) => `
        <div class="riga ${turno.event_type === "bot_reply" ? "sua" : ""}">
          <span class="quando">${testo(quando(turno.created_at))}</span>
          ${testo(turno.content)}
        </div>`,
    )
    .join("");
}

/* --------------------------------------------------------------- sogni --- */

export async function aggiornaSogni() {
  let stato;
  try {
    stato = await statoSogni();
  } catch (errore) {
    el.statoSogni.innerHTML = `<div class="err">${testo(errore.message)}</div>`;
    return;
  }

  el.statoSogni.innerHTML = `
    <div class="voce"><span>Ultimo sogno</span><span>${
      stato.last_dream_at ? testo(quando(stato.last_dream_at)) : "mai"
    }</span></div>
    <div class="voce"><span>Il prossimo</span><span>${
      stato.next_scheduled_at ? testo(quando(stato.next_scheduled_at)) : "non programmato"
    }</span></div>`;
}

export function collegaSogni() {
  el.sognaOra.onclick = async () => {
    el.sognaOra.disabled = true;
    const prima = el.sognaOra.textContent;
    el.sognaOra.textContent = "Sto sognando…";
    try {
      const esito = await sognaOra();
      // Il numero conta: zero non è un guasto — vuol dire che non c'era ancora
      // abbastanza da rileggere — e dirlo evita di far premere il tasto tre
      // volte pensando che non funzioni.
      el.statoSogni.insertAdjacentHTML(
        "afterbegin",
        `<div class="voce"><span>Adesso</span><span>${
          esito.consolidated_events
            ? `${esito.consolidated_events} scambi diventati memoria`
            : "non c'era ancora abbastanza da rileggere"
        }</span></div>`,
      );
      await aggiornaMemoria();
    } catch (errore) {
      el.statoSogni.innerHTML = `<div class="err">${testo(errore.message)}</div>`;
    } finally {
      el.sognaOra.disabled = false;
      el.sognaOra.textContent = prima;
      await aggiornaSogni();
    }
  };

  el.apriCartella.onclick = () => void apriCartellaRicordi();
}

/** Una data leggibile: «oggi alle 17:45», non un ISO 8601. */
function quando(valore) {
  const data = new Date(valore.includes("T") ? valore : valore.replace(" ", "T") + "Z");
  if (Number.isNaN(data.getTime())) return valore;

  const oggi = new Date();
  const stessoGiorno = data.toDateString() === oggi.toDateString();
  const ora = data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  if (stessoGiorno) return `oggi alle ${ora}`;
  return `${data.toLocaleDateString("it-IT", { day: "numeric", month: "long" })} alle ${ora}`;
}
