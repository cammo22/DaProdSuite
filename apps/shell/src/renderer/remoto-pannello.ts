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
const reteBox = document.getElementById("telefono-rete-box") as HTMLElement;
const internetBox = document.getElementById("telefono-internet-box") as HTMLElement;
const internetStato = document.getElementById("telefono-internet-stato") as HTMLElement;
const bottoneInternet = document.getElementById("telefono-internet") as HTMLButtonElement;
const muroBox = document.getElementById("telefono-muro-box") as HTMLElement;
const muroStato = document.getElementById("telefono-muro-stato") as HTMLElement;
const bottoneMuro = document.getElementById("telefono-muro") as HTMLButtonElement;
const sceltaRete = document.getElementById("telefono-rete") as HTMLSelectElement;
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
      if (stato?.acceso) {
        // Spegnendo si nasconde anche l'invito: un codice per un gateway spento
        // non porta da nessuna parte, e lasciarlo lì è solo un modo di far
        // sbagliare chi lo sta copiando.
        stato = await api.remoto.spegni();
        nascondiInvito();
        disegna();
        return;
      }

      stato = await api.remoto.accendi();
      disegna();

      // E subito un invito, se non c'è ancora nessuno collegato.
      //
      // Prima «Accendi» accendeva e basta: comparivano un indirizzo e tre
      // bottoni, e il QR — che è la ragione per cui questo pannello esiste —
      // voleva un secondo click che nessuno diceva di fare. Chi lo ha provato
      // il 21 agosto ha visto una scheda che sembrava rotta.
      if (stato.dispositivi.length === 0) await invitaGiusto();
    } catch (e) {
      riassunto.textContent = `Non riesco: ${(e as Error).message}`;
    } finally {
      interruttore.disabled = false;
    }
  })();
});

// Cambiare indirizzo butta gli inviti in corso: un QR è la fotografia di un
// indirizzo, e quello vecchio non porterebbe più da nessuna parte.
sceltaRete.addEventListener("change", () => {
  void (async () => {
    stato = await api.remoto.scegliRete(sceltaRete.value);
    nascondiInvito();
    disegna();
    if (stato.acceso) await invitaGiusto();
  })();
});

/**
 * Sblocca la porta nel firewall di Windows.
 *
 * Il riquadro dell'amministratore lo mostra Windows, non noi: una volta sola.
 * Dire di no è una risposta legittima, e viene raccontata invece di sparire.
 */
bottoneMuro.addEventListener("click", () => {
  void (async () => {
    bottoneMuro.disabled = true;
    bottoneMuro.textContent = "Chiedo a Windows…";
    try {
      const errore = await api.remoto.apriLaPorta();
      if (errore) muroStato.textContent = errore;
      stato = await api.remoto.stato();
      disegna();
    } finally {
      bottoneMuro.disabled = false;
      bottoneMuro.textContent = "Sblocca la porta";
    }
  })();
});

/**
 * La strada da Internet.
 *
 * Accenderla e spegnerla butta gli inviti in corso, per la stessa ragione per
 * cui li butta cambiare rete: l'indirizzo dentro il QR cambia, e quello vecchio
 * continuerebbe a funzionare in casa e a non funzionare fuori — cioè il modo
 * più sicuro di far sbagliare chi lo inquadra. Quindi si rifà l'invito subito,
 * così chi stava per collegarsi ne trova uno buono invece di un buco.
 */
bottoneInternet.addEventListener("click", () => {
  void (async () => {
    bottoneInternet.disabled = true;
    try {
      const acceso = stato?.internet.fase === "acceso";
      stato = acceso ? await api.remoto.spegniInternet() : await api.remoto.accendiInternet();
      nascondiInvito();
      disegna();
      if (stato.acceso) await invitaGiusto();
    } catch (e) {
      riassunto.textContent = `Non riesco: ${(e as Error).message}`;
    } finally {
      bottoneInternet.disabled = false;
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

/**
 * Un invito del ruolo che ha senso adesso.
 *
 * Il primo dispositivo dev'essere il padrone — è quello che poi decide sulle
 * richieste. Dal secondo in poi si invita un ospite, perché chiedere un secondo
 * padrone fallirebbe: ce n'è uno solo, ed è una regola del gateway.
 */
function invitaGiusto(): Promise<void> {
  const cePadrone = (stato?.dispositivi ?? []).some((d) => d.ruolo === "admin");
  return invita(cePadrone ? "ospite" : "admin");
}

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
  disegnaReti(acceso);
  disegnaInternet(acceso);
  disegnaMuro(acceso);

  riassunto.textContent = acceso
    ? `In ascolto · ${contati(stato?.dispositivi.length ?? 0, "dispositivo", "dispositivi")} · ${
        stato?.attesa ?? 0
      } in attesa`
    : "Spento. Accendi per usare la suite dal telefono o da un altro computer.";

  disegnaDispositivi();
  disegnaRichieste();
}

/**
 * Com'è messa la strada da Internet, raccontata mentre succede.
 *
 * Le fasi sono quattro e sono attese diverse: scaricare quaranta MB di
 * `cloudflared` la prima volta, alzare il tunnel, esserci, o non esserci
 * riuscito. Scriverle tutte «sto lavorando» vorrebbe dire un pannello fermo per
 * un minuto e mezzo senza dire su cosa.
 */
function disegnaInternet(acceso: boolean): void {
  internetBox.hidden = !acceso;
  if (!acceso) return;

  const fuori = stato?.internet ?? { fase: "spento" as const, indirizzo: "" };
  internetBox.classList.toggle("acceso", fuori.fase === "acceso");
  internetBox.classList.toggle("guasto", fuori.fase === "guasto");

  const inCorso = fuori.fase === "scarico" || fuori.fase === "accendo";
  bottoneInternet.disabled = inCorso;
  bottoneInternet.textContent = fuori.fase === "acceso" ? "Spegni" : "Accendi";

  switch (fuori.fase) {
    case "acceso":
      internetStato.textContent = `Acceso: ${fuori.indirizzo} — funziona anche fuori casa, in HTTPS.`;
      break;
    case "scarico":
      internetStato.textContent = `Scarico cloudflared, una volta sola${
        fuori.quota ? ` — ${Math.round(fuori.quota * 100)}%` : ""
      }…`;
      break;
    case "accendo":
      internetStato.textContent = "Alzo il tunnel: Cloudflare deve darmi un indirizzo…";
      break;
    case "guasto":
      internetStato.textContent = fuori.motivo ?? "Non è riuscito. Riprova.";
      break;
    default:
      internetStato.textContent = "Spento: si arriva solo dalla wifi di casa.";
  }
}

/**
 * L'avviso del firewall, che compare solo quando serve davvero.
 *
 * Non si mostra se il gateway è spento (non c'è ancora niente da bloccare), se
 * la porta è già aperta, o se non si è riusciti a guardare: avvisare di un
 * problema che potrebbe non esserci è peggio che tacere. E non si mostra
 * nemmeno con il tunnel acceso, perché in quel caso la porta **non serve**: la
 * connessione la fa il PC verso l'esterno, e il firewall non c'entra.
 */
function disegnaMuro(acceso: boolean): void {
  const muro = stato?.firewall;
  const conTunnel = stato?.internet.fase === "acceso";
  muroBox.hidden = !acceso || conTunnel || !muro || muro.incerto || muro.aperta;
}

function contati(n: number, uno: string, molti: string): string {
  return `${n} ${n === 1 ? uno : molti}`;
}

/**
 * Il menu degli indirizzi.
 *
 * Compare solo se ce n'è più d'uno: su un computer con una scheda sola sarebbe
 * una domanda senza risposte, e una scelta in più da capire per niente.
 */
function disegnaReti(acceso: boolean): void {
  const elenco = stato?.reti ?? [];
  reteBox.hidden = !acceso || elenco.length < 2;
  if (reteBox.hidden) return;

  sceltaRete.innerHTML = "";
  for (const rete of elenco) {
    const voce = document.createElement("option");
    voce.value = rete.ip;
    voce.textContent = `${rete.ip} — ${rete.che}`;
    voce.selected = rete.ip === stato?.rete;
    sceltaRete.append(voce);
  }
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
