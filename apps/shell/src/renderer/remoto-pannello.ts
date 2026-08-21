/**
 * Il pannello «Da fuori» dell'hub.
 *
 * È il posto da cui si apre e si chiude l'accesso remoto. Mostra tre cose, in
 * quest'ordine, che è l'ordine delle domande di chi ci arriva:
 *
 * 1. **dove ci si collega** — l'indirizzo da scrivere nel browser di un altro
 *    computer, che è la risposta a «e adesso?»;
 * 2. **come ci si autorizza** — il QR da inquadrare col telefono e il codice a
 *    otto cifre da battere sul portatile;
 * 3. **chi c'è e cosa chiede** — i dispositivi accoppiati e la fila delle
 *    richieste, con il sì e il no.
 *
 * Tutto passa da `window.daprod.remoto`: nessuna rete qui dentro.
 */

import type { RichiestaRemota, StatoAccesso } from "@daprod/ipc";

const api = window.daprod;

const interruttore = document.getElementById("telefono-interruttore") as HTMLButtonElement;
const indirizzoBox = document.getElementById("telefono-indirizzo-box") as HTMLElement;
const indirizzoConsole = document.getElementById("telefono-console") as HTMLElement;
const bottoneCopia = document.getElementById("telefono-copia") as HTMLButtonElement;
const invitoBox = document.getElementById("telefono-invito-box") as HTMLElement;
const qr = document.getElementById("telefono-qr") as HTMLImageElement;
const codiceValore = document.getElementById("telefono-codice-valore") as HTMLElement;
const codiceScade = document.getElementById("telefono-codice-scade") as HTMLElement;
const riassunto = document.getElementById("telefono-riassunto") as HTMLElement;
const elencoDispositivi = document.getElementById("telefono-dispositivi") as HTMLElement;
const elencoRichieste = document.getElementById("telefono-richieste") as HTMLElement;

let stato: StatoAccesso | null = null;
/** Quando scade l'invito mostrato adesso, per il conto alla rovescia. */
let scadenza = 0;
let orologio: number | null = null;

/* ------------------------------------------------------------ interruttore */

interruttore.addEventListener("click", () => {
  void (async () => {
    interruttore.disabled = true;
    try {
      // Spegnendo si nasconde anche l'invito: un codice per un gateway spento
      // non porta da nessuna parte, e lasciarlo lì è solo un modo di far
      // sbagliare chi lo sta copiando.
      stato = stato?.acceso ? await api.remoto.spegni() : await api.remoto.accendi();
      if (!stato.acceso) nascondiInvito();
      disegna();
    } catch (e) {
      riassunto.textContent = `Non riesco: ${(e as Error).message}`;
    } finally {
      interruttore.disabled = false;
    }
  })();
});

document.getElementById("telefono-invito-admin")!.addEventListener("click", () => void invita("admin"));
document.getElementById("telefono-invito-ospite")!.addEventListener("click", () => void invita("ospite"));

bottoneCopia.addEventListener("click", () => {
  const testo = stato?.console ?? "";
  if (!testo) return;
  void navigator.clipboard.writeText(testo).then(
    () => avvisoCopia("Copiato"),
    () => {
      // Se gli appunti sono negati, resta la strada di sempre: si seleziona
      // l'indirizzo e lo copia lui. Meglio di un tasto che non fa niente.
      const selezione = window.getSelection();
      const intervallo = document.createRange();
      intervallo.selectNodeContents(indirizzoConsole);
      selezione?.removeAllRanges();
      selezione?.addRange(intervallo);
      avvisoCopia("Premi Ctrl+C");
    },
  );
});

function avvisoCopia(testo: string): void {
  bottoneCopia.textContent = testo;
  setTimeout(() => (bottoneCopia.textContent = "Copia"), 1800);
}

/* ---------------------------------------------------------------- l'invito */

async function invita(ruolo: "admin" | "ospite"): Promise<void> {
  try {
    // Il main accende il gateway da sé se era spento: un invito senza indirizzo
    // dentro sarebbe un QR che non porta da nessuna parte.
    const invito = await api.remoto.nuovoInvito(ruolo);
    invitoBox.hidden = false;
    qr.src = invito.qr;
    codiceValore.textContent = invito.codice;
    scadenza = invito.scade;
    contaAllaRovescia();
    await rinfresca();
  } catch (e) {
    // Il caso vero: c'è già un padrone accoppiato e se ne chiede un altro.
    riassunto.textContent = `Non riesco a creare l'invito: ${(e as Error).message}`;
  }
}

function nascondiInvito(): void {
  invitoBox.hidden = true;
  scadenza = 0;
  if (orologio !== null) {
    window.clearInterval(orologio);
    orologio = null;
  }
}

/**
 * Il conto alla rovescia dell'invito.
 *
 * Un invito vive cinque minuti. Senza questo, chi torna al pannello mezz'ora
 * dopo vede un codice che sembra buono e non funziona più: meglio vederlo
 * scadere sotto gli occhi.
 */
function contaAllaRovescia(): void {
  if (orologio !== null) window.clearInterval(orologio);
  const battito = () => {
    const restano = Math.round((scadenza - Date.now()) / 1000);
    if (restano <= 0) {
      codiceScade.textContent = "Scaduto: chiedine un altro.";
      codiceValore.textContent = "— — — —";
      nascondiInvito();
      return;
    }
    const minuti = Math.floor(restano / 60);
    const secondi = String(restano % 60).padStart(2, "0");
    codiceScade.textContent = `Vale ancora ${minuti}:${secondi}.`;
  };
  battito();
  orologio = window.setInterval(battito, 1000);
}

/* --------------------------------------------------------------- i disegni */

/** La forma leggibile di uno stato, per le etichette. */
function nomeStato(s: RichiestaRemota["stato"]): string {
  const mappa: Record<RichiestaRemota["stato"], string> = {
    "in-attesa": "in attesa",
    accettata: "accettata",
    "in-lavoro": "in lavorazione",
    pronta: "pronta",
    scartata: "scartata",
    scaduta: "scaduta",
  };
  return mappa[s] ?? s;
}

function classeStato(s: RichiestaRemota["stato"]): string {
  if (s === "pronta") return "pronta";
  if (s === "in-attesa" || s === "accettata" || s === "in-lavoro") return "attesa";
  return "brutto";
}

function disegna(): void {
  const acceso = stato?.acceso ?? false;
  interruttore.textContent = acceso ? "Spegni" : "Accendi";
  interruttore.classList.toggle("secondario", acceso);
  indirizzoBox.hidden = !acceso;
  indirizzoConsole.textContent = stato?.console ?? "";

  riassunto.textContent = acceso
    ? `In ascolto · ${contati(stato?.dispositivi.length ?? 0, "dispositivo", "dispositivi")} · ${
        stato?.attesa ?? 0
      } in attesa`
    : "Spento. Accendi per usare la suite dal telefono o da un altro computer.";

  disegnaDispositivi();
  disegnaRichieste();
}

function contati(n: number, uno: string, molti: string): string {
  return `${n} ${n === 1 ? uno : molti}`;
}

function disegnaDispositivi(): void {
  elencoDispositivi.innerHTML = "";
  const lista = stato?.dispositivi ?? [];
  if (lista.length === 0) {
    elencoDispositivi.append(vuoto("Nessun dispositivo collegato."));
    return;
  }
  for (const d of lista) {
    const voce = document.createElement("li");
    voce.className = "voce-riga";

    const titolo = document.createElement("span");
    titolo.className = "voce-titolo";
    const nome = document.createElement("b");
    nome.textContent = d.nome;
    const ruolo = document.createElement("span");
    ruolo.className = "voce-stato";
    ruolo.textContent = d.ruolo === "admin" ? "padrone" : "ospite";
    titolo.append(nome, ruolo);

    const quando = document.createElement("span");
    quando.className = "voce-dettaglio";
    quando.textContent = `visto ${quantoFa(d.ultimoAccesso)}`;

    const azioni = document.createElement("div");
    azioni.className = "voce-azioni";
    const revoca = document.createElement("button");
    revoca.className = "bottone secondario pericolo";
    revoca.textContent = "Togli l'accesso";
    revoca.addEventListener("click", () => {
      void api.remoto.revoca(d.id).then(() => rinfresca());
    });
    azioni.append(revoca);

    voce.append(titolo, quando, azioni);
    elencoDispositivi.append(voce);
  }
}

function disegnaRichieste(): void {
  elencoRichieste.innerHTML = "";
  const lista = stato?.richieste ?? [];
  if (lista.length === 0) {
    elencoRichieste.append(vuoto("Ancora nessuna richiesta da fuori."));
    return;
  }
  for (const r of lista.slice(0, 40)) {
    const voce = document.createElement("li");
    voce.className = "voce-riga";

    const titolo = document.createElement("span");
    titolo.className = "voce-titolo";
    const che = document.createElement("b");
    che.textContent = `${r.tipo} · ${r.app} — da ${r.daNome}`;
    const pallino = document.createElement("span");
    pallino.className = `voce-stato ${classeStato(r.stato)}`;
    pallino.textContent = nomeStato(r.stato);
    titolo.append(che, pallino);

    const testo = document.createElement("span");
    testo.className = "voce-dettaglio";
    testo.textContent = r.testo;

    const quando = document.createElement("span");
    quando.className = "voce-dettaglio";
    quando.textContent = [
      dataOra(r.quando),
      r.opzioni ? riassuntoOpzioni(r.opzioni) : "",
      r.motivoScarto ? `scartata: ${r.motivoScarto}` : "",
      r.risultato ? `${r.risultato.nome} · ${pesa(r.risultato.bytes)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    voce.append(titolo, testo, quando);

    if (r.stato === "in-attesa" || r.stato === "accettata") {
      const azioni = document.createElement("div");
      azioni.className = "voce-azioni";
      if (r.stato === "in-attesa") {
        azioni.append(tasto("Accetta", "bottone", () => decidi(r.id, "accettata")));
      }
      azioni.append(
        tasto("La sto facendo", "bottone secondario", () => decidi(r.id, "in-lavoro")),
        tasto("Scarta", "bottone secondario pericolo", () => {
          const motivo = window.prompt("Perché la scarti? (facoltativo)");
          void decidi(r.id, "scartata", motivo ?? undefined);
        }),
      );
      voce.append(azioni);
    }

    elencoRichieste.append(voce);
  }
}

function tasto(testo: string, classe: string, azione: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = classe;
  b.textContent = testo;
  b.addEventListener("click", azione);
  return b;
}

function vuoto(testo: string): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "vuoto";
  li.textContent = testo;
  return li;
}

async function decidi(
  id: string,
  statoScelto: "accettata" | "in-lavoro" | "scartata",
  motivo?: string,
): Promise<void> {
  const esito = await api.remoto.decidi(id, statoScelto, motivo);
  if (!esito.ok) riassunto.textContent = esito.errore ?? "Non sono riuscito a decidere.";
  await rinfresca();
}

async function rinfresca(): Promise<void> {
  stato = await api.remoto.stato();
  disegna();
}

// Ogni volta che il main dice «è cambiato qualcosa», si ridisegna. È così che
// una richiesta arrivata dal telefono compare senza toccare niente.
api.remoto.onChanged((nuovo) => {
  stato = nuovo;
  disegna();
});

/** Esposto a main.ts: aggancia il pannello quando si apre. */
export function pannelloTelefono(): void {
  void rinfresca();
}

/* ---------------------------------------------------------- piccoli aiuti */

function dataOra(ms: number): string {
  return new Date(ms).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function quantoFa(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "adesso";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h fa`;
  return `${Math.floor(diff / 86_400_000)} giorni fa`;
}

function pesa(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(b / 1024)} KB`;
}

/** Le opzioni di una richiesta in una riga sola, senza l'id dell'azione. */
function riassuntoOpzioni(opzioni: Record<string, string>): string {
  return Object.entries(opzioni)
    .filter(([chiave]) => chiave !== "azione")
    .map(([chiave, valore]) => `${chiave}: ${valore}`)
    .join(", ");
}
