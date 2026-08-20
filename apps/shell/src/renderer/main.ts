/**
 * Hub della suite.
 *
 * Disegna una scheda per app e la tiene aggiornata. Nessuna logica vera qui
 * dentro: lo stato arriva dallo shell tramite `window.daprod` e questo file si
 * limita a renderlo leggibile.
 */

import type {
  AppId,
  AppState,
  EsitoControllo,
  GpuState,
  ModelloInVram,
  ProfiloMemoria,
  RapportoAmbiente,
  RuntimeState,
  TipoElemento,
  UpdateState,
  Velocita,
  VoceSpazio,
} from "@daprod/ipc";

const api = window.daprod;

const griglia = document.getElementById("griglia") as HTMLElement;
const statoAgg = document.getElementById("stato-agg") as HTMLElement;
const btnAgg = document.getElementById("btn-agg") as HTMLButtonElement;
const spiaGpu = document.getElementById("spia-gpu") as HTMLElement;

/** Pezzi delle schede, per poterli aggiornare senza ridisegnare tutto. */
const schede = new Map<
  AppId,
  {
    scheda: HTMLElement;
    etichetta: HTMLElement;
    azione: HTMLButtonElement;
    /** Il tasto che compare solo quando la suite sa **cosa fare** per rimediare. */
    rimedio: HTMLButtonElement;
    barra: HTMLElement;
    riempimento: HTMLElement;
  }
>();

/* ------------------------------------------------------------------- schede */

function costruisciGriglia(): void {
  for (const app of api.catalog) {
    const scheda = document.createElement("article");
    scheda.className = "scheda";
    scheda.style.setProperty("--accento", app.accent);

    // La copertina, generata con Anima dentro la suite
    // (`scripts/genera-copertine.cjs`). Se un giorno manca il file, resta il
    // riquadro col colore dell'app: la scheda non si rompe.
    const arte = document.createElement("div");
    arte.className = "scheda-arte";
    const illustrazione = document.createElement("img");
    illustrazione.src = `media/${app.id}.webp`;
    illustrazione.alt = "";
    illustrazione.addEventListener("error", () => illustrazione.remove());
    arte.append(illustrazione);
    montaAnteprima(arte, app.id);

    const testa = document.createElement("div");
    testa.className = "scheda-testa";

    const pallino = document.createElement("span");
    pallino.className = "pallino";

    const testi = document.createElement("div");
    const titolo = document.createElement("h2");
    titolo.textContent = app.name;
    const sottotitolo = document.createElement("p");
    sottotitolo.textContent = app.tagline;
    testi.append(titolo, sottotitolo);

    testa.append(pallino, testi);

    // Compare solo durante uno scaricamento: una barra sempre lì, ferma a zero,
    // sarebbe rumore su cinque schede su sette.
    const barra = document.createElement("div");
    barra.className = "barra barra-scheda";
    barra.hidden = true;
    const riempimento = document.createElement("span");
    barra.append(riempimento);

    const fondo = document.createElement("div");
    fondo.className = "scheda-fondo";

    const etichetta = document.createElement("span");
    etichetta.className = "etichetta";

    // Il tasto del rimedio, accanto a "Riprova". Sta nascosto quasi sempre: si
    // accende solo quando un motore è morto per un motivo che la suite sa
    // riconoscere — oggi uno solo, l'ambiente Python rimasto a metà.
    const rimedio = document.createElement("button");
    rimedio.className = "bottone secondario rimedio";
    rimedio.hidden = true;
    rimedio.addEventListener("click", () => void riparaDaScheda(rimedio));

    const tasti = document.createElement("div");
    tasti.className = "scheda-tasti";

    const azione = document.createElement("button");
    azione.className = "bottone";
    azione.addEventListener("click", () => void premuto(app.id));

    tasti.append(rimedio, azione);
    fondo.append(etichetta, tasti);
    scheda.append(arte, testa, barra, fondo);
    griglia.append(scheda);

    schede.set(app.id, { scheda, etichetta, azione, rimedio, barra, riempimento });
  }
}

/**
 * L'anteprima che si muove, al passaggio del mouse.
 *
 * **Come funziona.** La copertina ferma resta sempre lì sotto; se accanto c'è
 * anche un `media/<app>.webm`, passandoci sopra parte quello, in silenzio e in
 * ciclo. Se il file non c'è — ed è il caso di oggi per tutte e sette — non
 * succede niente di brutto: il `<video>` fallisce il caricamento e si toglie da
 * solo, restando la copertina.
 *
 * **Perché i video non ci sono ancora.** Vanno generati con le app stesse, che
 * è il punto di averli: DaProdDream per la sua, il Visualizer per la sua. Il
 * meccanismo però è questo, e sta qui perché il giorno che i file arrivano
 * basta metterli nella cartella. Vedi `scripts/genera-anteprime.cjs`.
 *
 * `preload="none"`: sette video caricati all'apertura dell'hub sarebbero
 * decine di MB letti per qualcosa che forse nessuno guarderà. Si caricano al
 * primo passaggio del mouse e restano.
 */
function montaAnteprima(arte: HTMLElement, id: AppId): void {
  const video = document.createElement("video");
  video.className = "scheda-video";
  video.src = `media/${id}.webm`;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  // Un file che non c'è non deve lasciare un rettangolo nero sopra la
  // copertina: si toglie, e la scheda torna com'era.
  video.addEventListener("error", () => video.remove());
  arte.append(video);

  arte.parentElement?.addEventListener("mouseenter", () => {
    if (!video.isConnected) return;
    void video.play().catch(() => video.remove());
  });
  arte.parentElement?.addEventListener("mouseleave", () => {
    if (!video.isConnected) return;
    video.pause();
    // Torna all'inizio: la prossima volta ricomincia da capo invece di
    // riprendere da metà, che su una clip di tre secondi si vede.
    video.currentTime = 0;
  });
}

/** Cosa fa il bottone dipende dallo stato in cui si trova l'app. */
const azioniPerStato: Record<
  AppState["status"],
  { testo: (s: AppState) => string; attivo: boolean; classe: string }
> = {
  "non-inclusa": { testo: () => "In arrivo", attivo: false, classe: "" },
  // «Prepara» e non «Installa» quando non c'è niente da scaricare: succede a chi
  // ha già i modelli e deve solo rimettere a posto le librerie del motore, e
  // «Installa · 0 GB» su una scheda che si usa da giorni sembra un difetto.
  "da-installare": {
    testo: (s) => (s.missingGb > 0 ? `Installa · ${numero(s.missingGb, 1)} GB` : "Prepara"),
    attivo: true,
    classe: "",
  },
  // Attivo perché il bottone dice "Annulla": uno scaricamento da 6 GB su una
  // linea di casa dura mezz'ora, e chi lo ha fatto partire deve poter cambiare idea.
  "in-preparazione": { testo: () => "Annulla", attivo: true, classe: "attesa" },
  pronta: { testo: () => "Apri", attivo: true, classe: "pronta" },
  "in-avvio": { testo: () => "Avvio…", attivo: false, classe: "attesa" },
  attiva: { testo: () => "Chiudi", attivo: true, classe: "pronta" },
  "in-errore": { testo: () => "Riprova", attivo: true, classe: "guasto" },
};

const descrizioneStato: Record<AppState["status"], string> = {
  "non-inclusa": "Non ancora nella suite",
  "da-installare": "Da installare",
  "in-preparazione": "Scaricamento in corso",
  pronta: "Pronta",
  "in-avvio": "In avvio",
  attiva: "In esecuzione",
  "in-errore": "Errore",
};

/** L'ultimo stato conosciuto, per chi deve fare i conti senza richiederlo. */
let ultimiStati: AppState[] = [];

/**
 * Vero quando torch **non** vede nessuna scheda video utilizzabile.
 *
 * Su una macchina così la suite parte lo stesso — provata il 18 agosto 2026 —
 * ma tre schede su sette non hanno senso e due sono da armarsi di pazienza.
 * Lo sa la barra dell'ambiente in cima; da lì arriva qui, e le schede si
 * rileggono da sole.
 */
let senzaScheda = false;

/** Cosa dire su una scheda quando manca la scheda video. */
const SENZA_SCHEDA: Record<string, { etichetta: string; bottone?: string }> = {
  obbligatoria: {
    etichetta: "Serve una scheda video NVIDIA: su questo computer non partirebbe.",
    bottone: "Serve una NVIDIA",
  },
  "molto-meglio": {
    etichetta: "Senza scheda video funziona, ma va lentissima: ore invece di minuti.",
  },
};

function aggiornaSchede(stati: AppState[]): void {
  ultimiStati = stati;
  for (const stato of stati) {
    const elementi = schede.get(stato.id);
    if (!elementi) continue;

    const regola = azioniPerStato[stato.status];
    elementi.azione.textContent = regola.testo(stato);
    elementi.azione.disabled = !regola.attivo;

    elementi.etichetta.textContent =
      stato.error ?? raccontaAvanzamento(stato) ?? descrizioneStato[stato.status];
    elementi.etichetta.className = `etichetta ${regola.classe}`;
    elementi.etichetta.title = stato.error ?? "";

    // Niente scheda video: si dice qui, **prima** che parta uno scaricamento da
    // otto GB per un'app che su questo computer non si aprirebbe comunque.
    // Vale solo per le app installabili: a una già in errore o in mezzo a un
    // lavoro serve il suo messaggio, non questo.
    const richiesta = api.catalog.find((a) => a.id === stato.id)?.schedaVideo;
    const avviso = senzaScheda && richiesta ? SENZA_SCHEDA[richiesta] : undefined;
    const daInstallare = stato.status === "da-installare" || stato.status === "pronta";
    if (avviso && daInstallare) {
      elementi.etichetta.textContent = avviso.etichetta;
      elementi.etichetta.className = "etichetta attesa";
      if (avviso.bottone) {
        elementi.azione.textContent = avviso.bottone;
        elementi.azione.disabled = true;
      }
    }

    // Un'app non ancora dentro la suite si riconosce anche dalla copertina:
    // spenta, come tutto il resto della scheda.
    elementi.scheda.classList.toggle("in-arrivo", stato.status === "non-inclusa");

    // La via d'uscita, quando c'è. Il testo lo decide lo shell: è lui che sa
    // *perché* il motore è morto, e la scheda non deve indovinarlo.
    elementi.rimedio.hidden = !stato.rimedio;
    if (stato.rimedio) {
      elementi.rimedio.textContent = stato.rimedio.testo;
      elementi.rimedio.title = stato.rimedio.perche;
    }

    disegnaBarra(elementi, stato);
  }
}

/**
 * Cosa sta scaricando e a che punto è, in una riga.
 *
 * I byte si mostrano come GB perché è l'unità in cui l'utente pensa allo spazio
 * che gli resta sul disco: "3,20 / 5,83 GB" si capisce, "3435973836" no.
 */
function raccontaAvanzamento(stato: AppState): string | null {
  const avanzamento = stato.progress;
  if (!avanzamento) return null;
  if (avanzamento.total <= 0) return `${avanzamento.label}…`;
  return `${avanzamento.label} · ${gb(avanzamento.done)} / ${gb(avanzamento.total)}`;
}

function disegnaBarra(
  elementi: { barra: HTMLElement; riempimento: HTMLElement },
  stato: AppState,
): void {
  const avanzamento = stato.progress;
  elementi.barra.hidden = !avanzamento;
  if (!avanzamento) return;

  // Ambiente Python e librerie del motore non sanno dire quanto peseranno: lì la
  // barra scorre da sola invece di restare ferma a zero facendo sembrare tutto bloccato.
  const indeterminata = avanzamento.total <= 0;
  elementi.barra.classList.toggle("scorre", indeterminata);
  elementi.riempimento.style.width = indeterminata
    ? ""
    : `${Math.min(100, (avanzamento.done / avanzamento.total) * 100).toFixed(1)}%`;
}

/**
 * «Ripara l'ambiente», premuto da una scheda invece che dalla barra in cima.
 *
 * È lo stesso identico lavoro (`runtime.ripara`), e finisce nello stesso posto:
 * la barra dell'ambiente si apre da sola e mostra le righe mentre lavora. Qui si
 * disattiva solo il tasto, perché premerlo due volte non serve a niente e
 * l'installazione dura minuti.
 */
async function riparaDaScheda(tasto: HTMLButtonElement): Promise<void> {
  tasto.disabled = true;
  const prima = tasto.textContent;
  tasto.textContent = "Riparo…";
  try {
    await api.runtime.ripara();
  } finally {
    tasto.disabled = false;
    tasto.textContent = prima;
  }
}

async function premuto(id: AppId): Promise<void> {
  const stati = await api.apps.list();
  const stato = stati.find((s) => s.id === id);
  if (!stato) return;

  if (stato.status === "attiva") await api.apps.close(id);
  else if (stato.status === "pronta") await api.apps.open(id);
  else if (stato.status === "in-preparazione") await api.apps.annullaInstallazione(id);
  else await api.apps.install(id);
}

/* ----------------------------------------------------------- aggiornamenti */

function aggiornaBarraAggiornamenti(stato: UpdateState): void {
  statoAgg.className = "stato-agg";
  btnAgg.hidden = true;

  switch (stato.status) {
    case "in-controllo":
      statoAgg.textContent = "Controllo aggiornamenti…";
      break;

    case "disponibile":
      statoAgg.textContent = `Disponibile la versione ${stato.availableVersion}`;
      statoAgg.classList.add("novita");
      mostraBottone("Scarica", () => api.update.download());
      break;

    case "in-scaricamento":
      statoAgg.textContent = `Scaricamento… ${stato.percent ?? 0}%`;
      statoAgg.classList.add("novita");
      break;

    case "pronto-da-installare":
      statoAgg.textContent = `Versione ${stato.availableVersion} pronta`;
      statoAgg.classList.add("novita");
      mostraBottone("Riavvia e installa", () => api.update.installAndRestart());
      break;

    case "aggiornato":
      statoAgg.textContent = "Sei alla versione più recente";
      mostraBottone("Controlla", () => api.update.check());
      break;

    case "in-errore":
      statoAgg.textContent = `Aggiornamenti non raggiungibili: ${stato.error ?? ""}`;
      statoAgg.classList.add("guasto");
      mostraBottone("Riprova", () => api.update.check());
      break;

    case "inattivo":
      statoAgg.textContent = stato.notes ?? "";
      mostraBottone("Controlla aggiornamenti", () => api.update.check());
      break;
  }
}

function mostraBottone(testo: string, azione: () => Promise<void> | void): void {
  btnAgg.hidden = false;
  btnAgg.textContent = testo;
  btnAgg.onclick = () => void azione();
}

/* --------------------------------------------------------- barra ambiente */
/**
 * L'ambiente Python in una riga, sempre in cima.
 *
 * Cinque app su sette non partono senza; quando si rompe, è l'unica cosa che
 * conta sapere. Prima si vedeva in due posti: una spia nel piede della pagina,
 * che diceva solo com'era andata, e «Ripara» in fondo al pannello Spazio —
 * cioè nella schermata che si apre per liberare il disco, l'ultimo posto in cui
 * uno guarda quando un'app non si apre. Adesso è qui, con tre tasti:
 * **Controlla** (guarda e basta), **Ripara** (rimette a posto), **Dettagli**
 * (il rapporto, e le righe di quello che sta succedendo).
 */

const ambSpia = document.getElementById("ambiente-spia") as HTMLElement;
const ambDetto = document.getElementById("ambiente-detto") as HTMLElement;
const btnInstalla = document.getElementById("ambiente-installa") as HTMLButtonElement;
const btnControlla = document.getElementById("ambiente-controlla") as HTMLButtonElement;
const btnRipara = document.getElementById("ambiente-ripara") as HTMLButtonElement;
const btnDettagli = document.getElementById("ambiente-dettagli") as HTMLButtonElement;
const ambFondo = document.getElementById("ambiente-fondo") as HTMLElement;
const ambBarra = document.getElementById("ambiente-barra") as HTMLElement;
const ambRiempimento = document.getElementById("ambiente-riempimento") as HTMLElement;
const ambRapporto = document.getElementById("ambiente-rapporto") as HTMLElement;
const ambLog = document.getElementById("ambiente-log") as HTMLElement;

/** Aperto a mano: un lavoro in corso lo apre da sé, ma non lo richiude. */
let dettagliAperti = false;

/** Vero mentre un tasto sta lavorando: nel frattempo gli altri non si toccano. */
let ambienteOccupato = false;

function aggiornaAmbiente(stato: RuntimeState): void {
  const inCorso = Boolean(stato.installing);

  // Le schede dipendono da questo: finché non si sa se c'è una scheda video,
  // non si può dire a nessuno che la sua app non partirà. Si ridisegnano solo
  // quando la risposta **cambia**, non a ogni riga di log dell'installazione.
  const primaSenzaScheda = senzaScheda;
  senzaScheda = stato.ready && stato.cudaAvailable === false;
  if (senzaScheda !== primaSenzaScheda) aggiornaSchede(ultimiStati);

  // Un'installazione o una riparazione si guardano mentre succedono: il fondo
  // si apre da sé, e resta aperto se è stato l'utente ad aprirlo.
  if (inCorso) dettagliAperti = true;
  ambBarra.hidden = !inCorso;

  if (stato.log?.length) {
    ambLog.textContent = stato.log.join("\n");
    ambLog.hidden = false;
    ambLog.scrollTop = ambLog.scrollHeight;
  }

  btnInstalla.hidden = stato.ready || inCorso;
  btnInstalla.disabled = inCorso;
  // Riparare o controllare un ambiente che non c'è non vuol dire niente.
  btnRipara.disabled = ambienteOccupato || inCorso || !stato.ready;
  btnControlla.disabled = ambienteOccupato || inCorso || !stato.ready;

  if (stato.installing) {
    const { step, total, label } = stato.installing;
    dipingi("attesa", `${label} — passo ${step} di ${total}`);
    ambRiempimento.style.width = `${(step / total) * 100}%`;
  } else if (stato.error) {
    dipingi("guasto", `L'ambiente si è fermato: ${stato.error}`);
  } else if (!stato.ready) {
    dipingi(
      "guasto",
      "Manca l'ambiente Python: cinque app su sette non partono senza. Circa 4 GB, una volta sola.",
    );
  } else if (stato.cudaAvailable === false) {
    // Senza scheda video i motori girano sulla CPU: tecnicamente funziona, ma
    // di un altro ordine di grandezza. Detto in italiano e con le conseguenze,
    // perché "torch non vede CUDA" non dice niente a chi apre la suite: quello
    // che serve sapere è **quali schede** non si apriranno e **quanto** vanno
    // piano le altre.
    dipingi(
      "attesa",
      "Nessuna scheda video utilizzabile: tutto gira sulla CPU. Musica e Foto " +
        "funzionano ma ci mettono ore; Dream, IoDigitale e Cinema non partono.",
    );
  } else {
    const scheda = stato.gpuName ? ` · ${stato.gpuName}` : "";
    dipingi("ok", `Ambiente: Python ${stato.pythonVersion} · torch ${stato.torchVersion}${scheda}`);
  }

  mostraFondo();
}

function dipingi(come: "ok" | "attesa" | "guasto", testo: string): void {
  ambSpia.className = `ambiente-spia ${come}`;
  ambDetto.textContent = testo;
  ambDetto.className = `ambiente-detto ${come}`;
}

/** Il fondo si mostra solo se ha qualcosa dentro: barra, rapporto o log. */
function mostraFondo(): void {
  const qualcosa = !ambBarra.hidden || !ambRapporto.hidden || !ambLog.hidden;
  ambFondo.hidden = !(dettagliAperti && qualcosa);
  btnDettagli.hidden = !qualcosa;
  btnDettagli.setAttribute("aria-expanded", String(!ambFondo.hidden));
}

btnDettagli.addEventListener("click", () => {
  dettagliAperti = !dettagliAperti;
  mostraFondo();
});

btnInstalla.addEventListener("click", () => {
  btnInstalla.disabled = true;
  dettagliAperti = true;
  void api.runtime.install();
});

/**
 * Controlla: guarda l'ambiente e non tocca niente.
 *
 * Dura qualche decina di secondi perché apre torch e le librerie condivise per
 * davvero — l'unico modo di accorgersi dei file rimasti a metà fra due
 * versioni, cioè il guasto in cui tutti i numeri di versione sono giusti.
 */
btnControlla.addEventListener("click", () => {
  void occupato(btnControlla, "Controllo…", async () => {
    disegnaRapporto(await api.runtime.controlla());
    aggiornaSchede(await api.apps.list());
  });
});

btnRipara.addEventListener("click", () => {
  if (
    !confirm(
      "Reinstallo i pacchetti Python della suite.\n\nModelli, motori, risultati e " +
        "impostazioni non si toccano. Ci vogliono alcuni minuti.\n\nProcedo?",
    )
  )
    return;

  void occupato(btnRipara, "Riparo…", async () => {
    await api.runtime.ripara();
    aggiornaSchede(await api.apps.list());
    alert("Ambiente riparato. Riprova ad aprire l'app.");
  });
});

/** Un tasto che lavora: si spegne, e spegne gli altri finché non ha finito. */
async function occupato(
  tasto: HTMLButtonElement,
  intanto: string,
  lavoro: () => Promise<void>,
): Promise<void> {
  const prima = tasto.textContent;
  ambienteOccupato = true;
  dettagliAperti = true;
  tasto.textContent = intanto;
  tasto.disabled = true;
  btnControlla.disabled = true;
  btnRipara.disabled = true;
  try {
    await lavoro();
  } catch (errore) {
    alert("Non ci sono riuscito: " + String(errore));
  } finally {
    tasto.textContent = prima;
    ambienteOccupato = false;
    // Rimette a posto anche i tasti: quali siano attivi dipende dallo stato.
    aggiornaAmbiente(await api.runtime.state());
  }
}

const SEGNI: Record<EsitoControllo, string> = { ok: "✓", attenzione: "!", guasto: "×" };

/** Il rapporto: una riga per controllo, e in cima cosa vuol dire tutto insieme. */
function disegnaRapporto(rapporto: RapportoAmbiente): void {
  ambRapporto.textContent = "";

  const ora = new Date(rapporto.quando).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const riassunti: Record<EsitoControllo, string> = {
    ok: `Controllato alle ${ora}: è tutto a posto.`,
    attenzione: `Controllato alle ${ora}: funziona, ma c'è qualcosa da sapere.`,
    guasto:
      `Controllato alle ${ora}: c'è qualcosa che non va. «Ripara» reinstalla i ` +
      "pacchetti senza toccare modelli, motori e risultati.",
  };

  const testa = document.createElement("li");
  testa.className = `voce-controllo testa ${rapporto.esito}`;
  testa.textContent = riassunti[rapporto.esito];
  ambRapporto.append(testa);

  for (const voce of rapporto.voci) {
    const riga = document.createElement("li");
    riga.className = `voce-controllo ${voce.esito}`;

    const segno = document.createElement("span");
    segno.className = "voce-segno";
    segno.textContent = SEGNI[voce.esito];

    const testo = document.createElement("div");
    const titolo = document.createElement("b");
    titolo.textContent = voce.titolo;
    const dettaglio = document.createElement("p");
    dettaglio.textContent = voce.dettaglio;
    testo.append(titolo, dettaglio);

    riga.append(segno, testo);
    ambRapporto.append(riga);
  }

  ambRapporto.hidden = false;
  dettagliAperti = true;
  mostraFondo();
}

function aggiornaSpiaGpu(stato: GpuState): void {
  const nome = stato.holder
    ? api.catalog.find((a) => a.id === stato.holder)?.name ?? stato.holder
    : null;

  if (stato.usedMb !== undefined && stato.totalMb !== undefined) {
    const uso = `${(stato.usedMb / 1024).toFixed(1)}/${(stato.totalMb / 1024).toFixed(1)} GB`;
    spiaGpu.textContent = nome ? `GPU: ${uso} — in uso da ${nome}` : `GPU: ${uso}`;
  } else {
    spiaGpu.textContent = nome ? `GPU: in uso da ${nome}` : "GPU: non rilevata";
  }
}

/* ------------------------------------------------------ procedura guidata */

/**
 * La prima volta: quali app vuoi, e quanto costano.
 *
 * Esiste perché la suite appena installata è un elenco di schede tutte da
 * installare, e nessuno sa da dove cominciare né quanti GB gli costerà. Qui si
 * sceglie una volta e poi si va a fare altro: l'hub racconta il resto da sé.
 *
 * Compare **solo se c'è davvero qualcosa da installare** — chi ha già la suite
 * a posto non deve vedersi spiegare una cosa che ha già fatto — e una volta
 * sola, in qualunque modo la si chiuda.
 */
const guida = document.getElementById("guida") as HTMLElement;
const guidaApp = document.getElementById("guida-app") as HTMLElement;
const guidaConto = document.getElementById("guida-conto") as HTMLElement;

/** Quanto costa una volta sola: ambiente Python e motore, condivisi da tutte. */
const GB_COMUNI = 5;

/** Zero quando ambiente e motore ci sono già: allora non li si fa pagare. */
let gbComuni = GB_COMUNI;

async function forseMostraGuida(stati: AppState[]): Promise<void> {
  // `#guida` nell'indirizzo la riapre sempre: serve a provarla senza svuotare
  // mezzo disco, ed è anche il modo di rivederla per chi l'aveva saltata.
  const forzata = location.hash === "#guida";
  const impostazioni = await api.impostazioni.leggi();
  if (impostazioni.guidaFatta && !forzata) return;

  const daInstallare = stati.filter((s) => s.status === "da-installare");
  // Forzata a suite già installata non ha niente da proporre: si mostrano
  // comunque le app che ci sono, perché sennò sarebbe una finestra vuota.
  const scelta = daInstallare.length
    ? daInstallare
    : forzata
      ? stati.filter((s) => s.status !== "non-inclusa")
      : [];
  if (scelta.length === 0) return;

  // L'ambiente Python pesa quanto pesa solo se non c'è: quando c'è già, la
  // stessa schermata deve dire numeri diversi.
  const ambiente = await api.runtime.state();
  gbComuni = ambiente.ready ? 0 : GB_COMUNI;

  // Se l'ambiente c'è già e non vede nessuna scheda video, la procedura guidata
  // non deve proporre di scaricare otto GB per DaProdDream: si mostra la voce,
  // spenta, con scritto perché. A ambiente ancora da installare non si sa
  // ancora niente dell'hardware, e chiedere di indovinare sarebbe peggio che
  // tacere.
  const senzaSchedaQui = ambiente.ready && ambiente.cudaAvailable === false;

  guidaApp.innerHTML = "";
  for (const stato of scelta) {
    const app = api.catalog.find((a) => a.id === stato.id);
    if (!app) continue;

    const impossibile = senzaSchedaQui && app.schedaVideo === "obbligatoria";

    const voce = document.createElement("li");
    voce.innerHTML = `
      <label>
        <input type="checkbox" value="${app.id}" ${impossibile ? "disabled" : "checked"}>
        <span class="guida-nome">${app.name}</span>
        <span class="guida-gb">${impossibile ? "serve una NVIDIA" : etichettaCosto(stato)}</span>
      </label>
      <p class="guida-riga">${
        impossibile
          ? `${app.tagline} — su questo computer non può funzionare: fa video in tempo reale, e senza scheda video non c'è tempo reale.`
          : app.tagline
      }</p>`;
    if (impossibile) voce.classList.add("guida-spenta");

    // Il colore si mette da qui e non con uno `style=` nell'HTML: la CSP
    // dell'hub non ammette stili scritti nel marcatura, e il pallino colorato
    // restava invisibile senza che nessuno dicesse perché.
    voce.querySelector<HTMLElement>(".guida-nome")!.style.setProperty("--accento", app.accent);
    voce.querySelector("input")!.addEventListener("change", aggiornaConto);
    guidaApp.appendChild(voce);
  }

  aggiornaConto();
  guida.hidden = false;
}

function scelte(): AppId[] {
  return [...guidaApp.querySelectorAll<HTMLInputElement>("input:checked")].map(
    (c) => c.value as AppId,
  );
}

/** Quanto costa questa scheda, detto come lo direbbe una persona. */
function etichettaCosto(stato: AppState): string {
  if (stato.missingGb > 0) return `${numero(stato.missingGb, 1)} GB`;
  return stato.status === "pronta" ? "già installata" : "leggera";
}

/**
 * Il conto, che deve essere quello vero.
 *
 * I 5 GB di Python e motore si contano **solo se mancano davvero**: dirli a chi
 * ce li ha già sarebbe chiedergli di scaricare due volte la stessa cosa.
 */
function aggiornaConto(): void {
  const stati = ultimiStati.filter((s) => scelte().includes(s.id));
  const modelli = stati.reduce((somma, s) => somma + s.missingGb, 0);
  const bottone = document.getElementById("guida-vai") as HTMLButtonElement;
  bottone.disabled = stati.length === 0;

  if (stati.length === 0) {
    guidaConto.textContent =
      "Non hai scelto niente: puoi installare quello che vuoi dalle schede, quando vuoi.";
    return;
  }

  const pezzi: string[] = [];
  if (modelli > 0) pezzi.push(`${numero(modelli, 1)} GB di modelli`);
  if (gbComuni > 0) {
    pezzi.push(`circa ${gbComuni} GB fra Python e motore, una volta sola per tutte`);
  }

  guidaConto.textContent = pezzi.length
    ? `In tutto: circa ${numero(modelli + gbComuni, 1)} GB — ${pezzi.join(", più ")}.`
    : "Non manca niente: queste app sono già pronte, puoi aprirle e basta.";
}

function chiudiGuida(): void {
  guida.hidden = true;
  void api.impostazioni.guidaFatta();
}

(document.getElementById("guida-salta") as HTMLButtonElement).addEventListener("click", chiudiGuida);

(document.getElementById("guida-vai") as HTMLButtonElement).addEventListener("click", () => {
  const ids = scelte();
  chiudiGuida();
  // Una dopo l'altra: lo decide lo shell, qui si passa solo l'ordine scelto.
  void api.apps.installaTutte(ids);
});

/* -------------------------------------------------------------- il modello */

/**
 * Il pannello di Bonsai: chi c'è, chi occupa memoria, e i tre contesti.
 *
 * Sta nell'hub e non dentro un'app perché il modello è di tutte — e soprattutto
 * perché **quando occupa memoria la occupa per tutte**: un 27B caricato sono
 * quattro GB che mancano al modello di immagini mentre generi. Da qui lo si
 * spegne in un secondo senza aprire LM Studio.
 */
const sezioneLlm = document.getElementById("llm") as HTMLElement;
const llmStato = document.getElementById("llm-stato") as HTMLElement;
const llmElenco = document.getElementById("llm-elenco") as HTMLElement;

/** Il contesto con cui caricare, scelto dai tre pulsanti. 64K è il consigliato. */
let contestoScelto = 65_536;

for (const bottone of document.querySelectorAll<HTMLButtonElement>("[data-contesto]")) {
  bottone.addEventListener("click", () => {
    contestoScelto = Number(bottone.dataset.contesto);
    for (const altro of document.querySelectorAll("[data-contesto]")) altro.classList.remove("on");
    bottone.classList.add("on");
  });
}

async function aggiornaLlm(): Promise<void> {
  const stato = await api.llm.stato();

  if (!stato.acceso) {
    llmStato.textContent = stato.motivo ?? "LM Studio non risponde.";
    llmElenco.innerHTML = "";
    return;
  }

  const caricati = stato.disponibili.filter((m) => m.caricato);
  llmStato.textContent = caricati.length
    ? `In memoria adesso: ${caricati.map((m) => m.id).join(", ")}`
    : "Nessun modello in memoria: la scheda è libera.";

  llmElenco.innerHTML = "";
  for (const modello of stato.disponibili) {
    const voce = document.createElement("li");
    voce.className = modello.caricato ? "acceso" : "";
    voce.innerHTML = `
      <span class="llm-nome">${modello.id}</span>
      <span class="llm-dati">${modello.caricato ? "in memoria" : "spento"} · fino a ${Math.round(
        modello.contestoMax / 1024,
      )}K</span>
      <button class="bottone ${modello.caricato ? "secondario" : ""}">${
        modello.caricato ? "Scarica" : "Carica"
      }</button>`;

    const bottone = voce.querySelector("button") as HTMLButtonElement;
    bottone.addEventListener("click", async () => {
      bottone.disabled = true;
      bottone.textContent = modello.caricato ? "scarico…" : "carico…";
      const errore = modello.caricato
        ? await api.llm.scarica(modello.id)
        : await api.llm.carica(modello.id, contestoScelto);
      if (errore) llmStato.textContent = errore;
      await aggiornaLlm();
    });

    llmElenco.appendChild(voce);
  }
}

// Il bottone in fondo non nasconde niente: porta lì e rilegge. Nasconderlo era
// il modo per non farlo trovare — e infatti non si trovava.
(document.getElementById("btn-llm") as HTMLButtonElement).addEventListener("click", () => {
  sezioneLlm.scrollIntoView({ behavior: "smooth", block: "center" });
  void aggiornaLlm();
});

/**
 * Riletto da solo, ogni dieci secondi.
 *
 * Chi carica o scarica un modello lo fa **anche da LM Studio**, e un pannello
 * che dice "in memoria" quando la memoria è libera è peggio di un pannello che
 * non c'è. Dieci secondi sono abbastanza per non accorgersi del ritardo e
 * abbastanza radi da non pesare.
 */
void aggiornaLlm();
setInterval(() => void aggiornaLlm(), 10_000);

/* --------------------------------------------------------------- velocità */

/**
 * Quanto spingere i motori.
 *
 * È un interruttore e non una scelta nostra perché non c'è una risposta giusta
 * misurata: "spinta" riaccende i CUDA graph sulla parte lenta della musica — i
 * tre quarti del tempo di un brano — ma su 8 GB può anche andare peggio o non
 * entrarci. Si prova, si guardano i minuti, si tiene quella che vince.
 */
const selettoreVelocita = document.getElementById("velocita") as HTMLSelectElement;

selettoreVelocita.addEventListener("change", () => {
  const scelta = selettoreVelocita.value as Velocita;
  void api.impostazioni.velocita(scelta).then(() => {
    // I flag si passano alla riga di comando: un motore già acceso non li
    // rilegge, e dirlo subito evita di misurare la stessa cosa due volte.
    selettoreVelocita.title =
      scelta === "spinta"
        ? "Vale dalla prossima apertura di un'app. Se un brano muore o va più lento, rimetti normale."
        : "Vale dalla prossima apertura di un'app.";
  });
});

/**
 * Quanta memoria video lasciar prendere ai motori.
 *
 * L'altra manopola, accanto alla velocità, e risponde a una domanda diversa:
 * non *quanto in fretta* ma *quanto spazio*. Su una scheda da 8 GB è quella che
 * decide se una cosa entra o non entra, ed è la prima da toccare quando una
 * generazione muore per memoria esaurita.
 */
const selettoreProfilo = document.getElementById("profilo") as HTMLSelectElement;

const SPIEGA_PROFILO: Record<ProfiloMemoria, string> = {
  leggero:
    "Il motore tiene da parte un giro e mezzo di GB: va più piano, ma ci sta " +
    "dentro anche con LM Studio acceso o altro aperto. Vale dalla prossima apertura di un'app.",
  bilanciato: "Come abbiamo generato finora. Vale dalla prossima apertura di un'app.",
  qualita:
    "Il motore si tiene tutto quello che può: la seconda immagine non ricarica " +
    "niente, ma è il primo profilo a finire lo spazio. Vale dalla prossima apertura di un'app.",
};

selettoreProfilo.addEventListener("change", () => {
  const scelta = selettoreProfilo.value as ProfiloMemoria;
  void api.impostazioni.profilo(scelta).then(() => {
    selettoreProfilo.title = SPIEGA_PROFILO[scelta];
  });
});

/* ------------------------------------------------------------------- avvio */

for (const bottone of document.querySelectorAll<HTMLButtonElement>("[data-apri]")) {
  bottone.addEventListener("click", () => {
    const kind = bottone.dataset.apri as "output" | "logs" | "models";
    void api.suite.revealPath(kind);
  });
}

api.apps.onChanged(aggiornaSchede);
api.update.onChanged(aggiornaBarraAggiornamenti);
api.runtime.onChanged(aggiornaAmbiente);
api.gpu.onChanged(aggiornaSpiaGpu);

costruisciGriglia();

/**
 * Lo splash: copre l'hub finché questo giro di richieste non è finito.
 *
 * Prima si vedeva un istante "Ambiente: —" e una griglia vuota, poi tutto
 * cambiava sotto gli occhi appena le risposte arrivavano. Coprendo con
 * un'immagine invece di mostrare l'assenza, quell'istante sparisce: quando lo
 * splash si toglie, l'hub è già quello vero.
 */
const splash = document.getElementById("splash") as HTMLElement;
const splashStato = document.getElementById("splash-stato") as HTMLElement;

function dilloAlloSplash(testo: string): void {
  splashStato.textContent = testo;
}

void (async () => {
  try {
    dilloAlloSplash("Controllo la versione…");
    (document.getElementById("versione") as HTMLElement).textContent =
      `versione ${await api.suite.version()}`;

    // La finestra è già in ascolto mentre l'ambiente Python viene sondato:
    // senza aspettare qui, `apps.list()` prenderebbe i valori di partenza e li
    // correggerebbe un istante dopo, sotto gli occhi.
    dilloAlloSplash("Verifico l'ambiente e i modelli…");
    await api.suite.avvioPronto();

    dilloAlloSplash("Guardo cosa c'è già installato…");
    aggiornaSchede(await api.apps.list());

    dilloAlloSplash("Cerco aggiornamenti…");
    aggiornaBarraAggiornamenti(await api.update.state());

    dilloAlloSplash("Controllo l'ambiente…");
    aggiornaAmbiente(await api.runtime.state());
    aggiornaSpiaGpu(await api.gpu.state());
    const scelte = await api.impostazioni.leggi();
    selettoreVelocita.value = scelte.velocita;
    selettoreProfilo.value = scelte.profilo;
    selettoreProfilo.title = SPIEGA_PROFILO[scelte.profilo];

    // Per ultima, quando le schede hanno già detto cosa manca: la guida quei
    // numeri li mostra, e senza sarebbe una domanda senza prezzi.
    dilloAlloSplash("Quasi pronta…");
    await forseMostraGuida(ultimiStati);
  } finally {
    // In un `finally`: anche se una richiesta va storta, l'hub non deve
    // restare nascosto per sempre dietro la schermata di caricamento.
    splash.classList.add("chiuso");
  }
})();

/* ------------------------------------------------------------------ spazio */

const sezioneSpazio = document.getElementById('spazio') as HTMLElement
const riassunto = document.getElementById('spazio-riassunto') as HTMLElement
const barraSpazio = document.getElementById('barra-spazio') as HTMLElement
const vociSpazio = document.getElementById('spazio-voci') as HTMLElement

/** Un colore per categoria, così barra ed elenco si leggono insieme. */
const COLORI: Record<string, string> = {
  modelli: '#7c5cff',
  risultati: '#5cff9d',
  ambiente: '#3ddbff',
  motori: '#ffa63d',
  cache: '#8d97a9',
  log: '#5d6779',
}

/** Con la virgola, non col punto: l'interfaccia è in italiano anche nei numeri. */
function numero(valore: number, decimali: number): string {
  return valore.toLocaleString('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  })
}

function gb(bytes: number): string {
  return bytes >= 1024 ** 3
    ? `${numero(bytes / 1024 ** 3, 2)} GB`
    : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`
}

async function disegnaSpazio(): Promise<void> {
  riassunto.textContent = 'Conto…'
  const stato = await api.spazio.stato()

  riassunto.textContent =
    `La suite occupa ${gb(stato.occupato)}. Liberi sul disco: ${gb(stato.libero)}.`

  const tutte = [...stato.app.filter((a) => a.installata), ...stato.sistema]
  barraSpazio.replaceChildren(
    ...tutte.map((v) => {
      const fetta = document.createElement('span')
      const bytes = v.bytes
      fetta.style.width = `${(bytes / Math.max(stato.occupato, 1)) * 100}%`
      fetta.style.background =
        'accent' in v
          ? (v as { accent: string }).accent
          : (COLORI[(v as VoceSpazio).categoria] ?? '#8d97a9')
      fetta.title = `${'nome' in v ? v.nome : v.etichetta} · ${gb(bytes)}`
      return fetta
    }),
  )

  const righe: HTMLElement[] = []

  // Le schede per prime: e' cosi' che si ragiona. Una scheda e' un'esperienza
  // con i suoi modelli, non una cartella.
  for (const app of stato.app) {
    if (!app.installata) continue

    const riga = riga3(app.accent, app.nome, gb(app.bytes))
    const nota = riga.querySelector('.voce__nome') as HTMLElement
    if (app.condivisi > 0) {
      nota.title = `${gb(app.condivisi)} sono modelli usati anche da un'altra scheda: quelli restano.`
      nota.textContent = `${app.nome} · ${gb(app.condivisi)} condivisi`
    }

    const togli = document.createElement('button')
    togli.className = 'voce__elimina'
    togli.textContent = 'Disinstalla'
    togli.addEventListener('click', async () => {
      const recuperabile = app.bytes - app.condivisi
      if (
        !confirm(
          `Disinstallo ${app.nome}?

Liberi ${gb(recuperabile)}.` +
            (app.condivisi > 0
              ? `
${gb(app.condivisi)} restano: servono anche a un'altra scheda.`
              : '') +
            `

I tuoi risultati non si toccano.`,
        )
      )
        return
      togli.disabled = true
      await api.spazio.disinstalla(app.id)
      await disegnaSpazio()
      aggiornaSchede(await api.apps.list())
    })
    riga.append(togli)
    righe.push(riga)
  }

  // Poi i modelli sopra 1 GB, per chi vuole guardare piu' a fondo.
  for (const voce of stato.grandi) {
    righe.push(rigaCancellabile(voce))
  }
  for (const voce of stato.sistema) {
    righe.push(voce.cancellabile ? rigaCancellabile(voce) : riga3(COLORI[voce.categoria]!, voce.etichetta, gb(voce.bytes)))
  }

  vociSpazio.replaceChildren(...righe)
}

/** Riga base: pallino colorato, nome, peso. */
function riga3(colore: string, nome: string, peso: string): HTMLElement {
  const riga = document.createElement('li')
  riga.className = 'voce'

  const punto = document.createElement('span')
  punto.className = 'voce__punto'
  punto.style.background = colore

  const testo = document.createElement('span')
  testo.className = 'voce__nome'
  testo.textContent = nome

  const dim = document.createElement('span')
  dim.className = 'voce__peso'
  dim.textContent = peso

  riga.append(punto, testo, dim)
  return riga
}

function rigaCancellabile(voce: VoceSpazio): HTMLElement {
  const riga = riga3(COLORI[voce.categoria] ?? '#8d97a9', voce.etichetta, gb(voce.bytes))
  ;(riga.querySelector('.voce__nome') as HTMLElement).title = voce.conseguenza

  const elimina = document.createElement('button')
  elimina.className = 'voce__elimina'
  elimina.textContent = 'Elimina'
  elimina.addEventListener('click', async () => {
    if (!confirm(`Elimino "${voce.etichetta}" (${gb(voce.bytes)})?

${voce.conseguenza}`)) return
    elimina.disabled = true
    await api.spazio.elimina(voce.id)
    await disegnaSpazio()
  })
  riga.append(elimina)
  return riga
}

const AVVISI_RESET: Record<string, string> = {
  impostazioni: 'Le impostazioni tornano ai valori predefiniti. Modelli e risultati restano.',
  modelli: 'Tutti i modelli vengono cancellati e andranno riscaricati. I risultati restano.',
  tutto: 'Ambiente Python, motori, modelli e impostazioni: tutto cancellato.\n\nI tuoi risultati NON si toccano.',
}

for (const bottone of document.querySelectorAll<HTMLButtonElement>('[data-reset]')) {
  bottone.addEventListener('click', async () => {
    const cosa = bottone.dataset.reset as 'impostazioni' | 'modelli' | 'tutto'
    if (!confirm(`${AVVISI_RESET[cosa]}\n\nProcedo?`)) return
    bottone.disabled = true
    const liberati = await api.spazio.reset(cosa)
    bottone.disabled = false
    await disegnaSpazio()
    aggiornaSchede(await api.apps.list())
    aggiornaAmbiente(await api.runtime.state())
    if (liberati > 0) alert(`Liberati ${gb(liberati)}.`)
  })
}

const btnSpazio = document.getElementById('btn-spazio') as HTMLButtonElement
btnSpazio.addEventListener('click', () => {
  sezioneSpazio.hidden = !sezioneSpazio.hidden
  if (!sezioneSpazio.hidden) {
    void disegnaSpazio()
    sezioneSpazio.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

/* =========================================================== i tre pannelli */
/**
 * Testo dell'utente dentro l'HTML.
 *
 * Nell'hub non serviva finora — disegnava solo nomi presi dal catalogo — ma qui
 * arrivano nomi di file che l'utente ha scelto lui.
 */
function escapeHtml(testo: string): string {
  return testo.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/**
 * Risultati, Modelli e Log.
 *
 * Erano tre pulsanti che chiamavano `shell.openPath`: si apriva una finestra di
 * Esplora risorse **dietro** la suite, e da davanti sembrava che il pulsante
 * non facesse niente. Adesso sono tre pannelli dentro l'hub, e la cartella si
 * apre solo se la chiedi.
 *
 * Uno alla volta: aprirne uno chiude gli altri. Sono lunghi, e tre aperti
 * insieme vorrebbero dire scorrere per trovarne uno.
 */

const PANNELLI = ["risultati", "modelli", "log", "memoria"] as const;
type NomePannello = (typeof PANNELLI)[number];

function sezione(nome: NomePannello): HTMLElement {
  return document.getElementById(nome) as HTMLElement;
}

function mostraPannello(nome: NomePannello): void {
  const apriva = sezione(nome).hidden;
  for (const altro of PANNELLI) sezione(altro).hidden = true;
  sezioneSpazio.hidden = true;

  if (!apriva) return;
  sezione(nome).hidden = false;
  sezione(nome).scrollIntoView({ behavior: "smooth", block: "nearest" });

  if (nome === "risultati") void disegnaRisultati();
  if (nome === "modelli") void disegnaModelli();
  if (nome === "log") void apriLog();
  if (nome === "memoria") void disegnaMemoria();
}

for (const bottone of document.querySelectorAll<HTMLButtonElement>("[data-pannello]")) {
  bottone.addEventListener("click", () => mostraPannello(bottone.dataset.pannello as NomePannello));
}

/* --------------------------------------------------------------- risultati */

const risGriglia = document.getElementById("risultati-griglia") as HTMLElement;
const risRiassunto = document.getElementById("risultati-riassunto") as HTMLElement;
const risApp = document.getElementById("risultati-app") as HTMLSelectElement;
const risTipo = document.getElementById("risultati-tipo") as HTMLSelectElement;

risApp.innerHTML =
  `<option value="">tutte le app</option>` +
  api.catalog.map((a) => `<option value="${a.id}">${a.name}</option>`).join("");

/** Quando non c'è una copertina: la lettera del tipo su un fondo colorato. */
const SEGNO: Record<string, string> = { audio: "♪", immagine: "▣", video: "▶" };

function quando(ms: number): string {
  return new Date(ms).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function disegnaRisultati(): Promise<void> {
  const filtro: { app?: AppId; tipo?: TipoElemento } = {};
  if (risApp.value) filtro.app = risApp.value as AppId;
  if (risTipo.value) filtro.tipo = risTipo.value as TipoElemento;

  const elementi = await api.risultati.elenco(filtro);
  const peso = elementi.reduce((somma, e) => somma + e.bytes, 0);
  risRiassunto.textContent = elementi.length
    ? `${elementi.length} risultati · ${gb(peso)}`
    : "Ancora niente qui dentro.";

  risGriglia.innerHTML = "";
  for (const elemento of elementi) {
    const nomeApp = api.catalog.find((a) => a.id === elemento.app);

    const scheda = document.createElement("article");
    scheda.className = "risultato";
    scheda.innerHTML = `
      <div class="risultato-arte"><span>${SEGNO[elemento.tipo] ?? "•"}</span></div>
      <div class="risultato-nome" title="${escapeHtml(elemento.nome)}">${escapeHtml(elemento.nome)}</div>
      <div class="risultato-dati">${escapeHtml(nomeApp?.name ?? elemento.app)} · ${quando(
        elemento.creato,
      )} · ${gb(elemento.bytes)}</div>
      <div class="risultato-tasti">
        <button class="bottone secondario" data-salva>salva</button>
        <button class="bottone secondario" data-cartella>cartella</button>
        <button class="bottone secondario pericolo" data-elimina>elimina</button>
      </div>`;

    // L'anteprima c'è quando c'è: un'immagine è la sua anteprima, un brano ha
    // la copertina se gliel'hanno messa, un video per ora no.
    const arte = scheda.querySelector(".risultato-arte") as HTMLElement;
    const anteprima = elemento.tipo === "immagine" ? elemento.url : elemento.copertina;
    if (anteprima) {
      const img = document.createElement("img");
      img.src = anteprima;
      img.alt = "";
      img.loading = "lazy";
      arte.appendChild(img);
    }
    // La CSP dell'hub non ammette gli stili scritti nell'HTML, ma da qui sì.
    if (nomeApp) arte.style.setProperty("--tinta", nomeApp.accent);

    (scheda.querySelector("[data-cartella]") as HTMLButtonElement).addEventListener("click", () => {
      void api.risultati.mostraNellaCartella(elemento.id);
    });

    // Portarne fuori una copia: i risultati stanno in %LOCALAPPDATA%, che va
    // bene alla suite e non a chi il file lo vuole mandare a qualcuno.
    const salva = scheda.querySelector("[data-salva]") as HTMLButtonElement;
    salva.addEventListener("click", async () => {
      salva.disabled = true;
      const prima = salva.textContent;
      salva.textContent = "salvo…";
      try {
        const dove = await api.risultati.salva(elemento.id);
        salva.textContent = dove ? "salvato" : prima;
        if (dove) setTimeout(() => (salva.textContent = prima), 2200);
      } catch {
        salva.textContent = "non riesco";
        setTimeout(() => (salva.textContent = prima), 2200);
      } finally {
        salva.disabled = false;
      }
    });
    (scheda.querySelector("[data-elimina]") as HTMLButtonElement).addEventListener(
      "click",
      async () => {
        if (!confirm(`Eliminare definitivamente "${elemento.nome}"?`)) return;
        await api.risultati.elimina(elemento.id);
        await disegnaRisultati();
      },
    );

    risGriglia.appendChild(scheda);
  }
}

risApp.addEventListener("change", () => void disegnaRisultati());
risTipo.addEventListener("change", () => void disegnaRisultati());
(document.getElementById("risultati-cartella") as HTMLButtonElement).addEventListener("click", () => {
  void api.suite.revealPath("output");
});

// Qualunque app produca o cancelli qualcosa, il pannello aperto lo vede.
api.risultati.onCambiata(() => {
  if (!sezione("risultati").hidden) void disegnaRisultati();
});

/* ----------------------------------------------------------------- modelli */

const modVoci = document.getElementById("modelli-voci") as HTMLElement;
const modRiassunto = document.getElementById("modelli-riassunto") as HTMLElement;
const modAvanzamento = document.getElementById("modelli-avanzamento") as HTMLElement;

let filtroModelli: "tutti" | "presenti" | "mancanti" = "tutti";

for (const bottone of document.querySelectorAll<HTMLButtonElement>("[data-modelli-filtro]")) {
  bottone.addEventListener("click", () => {
    filtroModelli = bottone.dataset.modelliFiltro as typeof filtroModelli;
    for (const altro of document.querySelectorAll("[data-modelli-filtro]")) {
      altro.classList.remove("on");
    }
    bottone.classList.add("on");
    void disegnaModelli();
  });
}

async function disegnaModelli(): Promise<void> {
  const voci = await api.modelli.catalogo();

  const sulDisco = voci.filter((v) => v.presente && !v.esterno);
  const mancano = voci.filter((v) => !v.presente);
  modRiassunto.textContent =
    `${sulDisco.length} sul disco · ${gb(sulDisco.reduce((s, v) => s + v.bytes, 0))}` +
    (mancano.length
      ? ` · ne mancano ${mancano.length} (${gb(mancano.reduce((s, v) => s + v.bytes, 0))})`
      : " · non manca niente");

  const mostrati = voci.filter((v) =>
    filtroModelli === "presenti" ? v.presente : filtroModelli === "mancanti" ? !v.presente : true,
  );

  modVoci.innerHTML = "";
  for (const voce of mostrati) {
    const schede = voce.usatoDa
      .map((id) => api.catalog.find((a) => a.id === id)?.name ?? id)
      .join(", ");

    const riga = document.createElement("li");
    riga.className = voce.presente ? "modello" : "modello manca";
    riga.innerHTML = `
      <div class="modello-testo">
        <b>${escapeHtml(voce.label)}</b>
        <span class="modello-dati">${
          voce.esterno
            ? "lo tiene LM Studio"
            : `${gb(voce.bytes)} · ${voce.presente ? "sul disco" : "da scaricare"}${
                voce.extra ? " · extra" : ""
              }`
        }</span>
        <span class="modello-usato">${schede ? `serve a ${escapeHtml(schede)}` : "non è di nessuna scheda"}</span>
      </div>`;

    // Si scarica a nome della prima scheda che lo usa: e' il suo motore che va
    // riavviato se il modello si porta dietro un nodo custom nuovo.
    const perChi = voce.usatoDa[0];
    if (!voce.presente && !voce.esterno && perChi) {
      const bottone = document.createElement("button");
      bottone.className = "bottone";
      bottone.textContent = `Scarica ${gb(voce.bytes)}`;
      bottone.addEventListener("click", () => {
        bottone.disabled = true;
        void api.modelli.scarica(perChi, [voce.id]);
      });
      riga.appendChild(bottone);
    }

    modVoci.appendChild(riga);
  }
}

api.modelli.onAvanzamento((stato) => {
  if (sezione("modelli").hidden) return;

  if (!stato.attivo) {
    modAvanzamento.hidden = false;
    modAvanzamento.textContent = stato.errore
      ? stato.errore
      : stato.annullato
        ? "Annullato. Quello che era già arrivato resta sul disco."
        : "Finito.";
    void disegnaModelli();
    return;
  }

  modAvanzamento.hidden = false;
  modAvanzamento.textContent =
    stato.total > 0
      ? `${stato.label} · ${gb(stato.done)} / ${gb(stato.total)}`
      : `${stato.label}…`;
});

(document.getElementById("modelli-cartella") as HTMLButtonElement).addEventListener("click", () => {
  void api.suite.revealPath("models");
});

/* --------------------------------------------------------------------- log */

const logQuale = document.getElementById("log-quale") as HTMLSelectElement;
const logRighe = document.getElementById("log-righe") as HTMLElement;
const logRiassunto = document.getElementById("log-riassunto") as HTMLElement;
const logSegui = document.getElementById("log-segui") as HTMLInputElement;

let orologioLog: number | null = null;

async function apriLog(): Promise<void> {
  const voci = await api.log.elenco();

  if (!voci.length) {
    logRiassunto.textContent = "Nessun log ancora: si scrivono quando parte un motore.";
    logQuale.innerHTML = "";
    logRighe.textContent = "";
    return;
  }

  // Si ridisegna l'elenco solo se è cambiato: rifarlo ogni due secondi
  // chiuderebbe il menu in faccia a chi lo sta aprendo.
  const nomi = voci.map((v) => v.nome).join("|");
  if (logQuale.dataset.nomi !== nomi) {
    const scelto = logQuale.value;
    logQuale.dataset.nomi = nomi;
    logQuale.innerHTML = voci.map((v) => `<option value="${v.nome}">${v.nome}</option>`).join("");
    if (voci.some((v) => v.nome === scelto)) logQuale.value = scelto;
  }

  const voce = voci.find((v) => v.nome === logQuale.value) ?? voci[0];
  if (!voce) return;
  logRiassunto.textContent = `${gb(voce.bytes)} · ultima riga ${quando(voce.quando)}`;

  const testo = await api.log.leggi(logQuale.value || voce.nome, 300);
  const inFondo =
    logRighe.scrollTop + logRighe.clientHeight >= logRighe.scrollHeight - 40;
  logRighe.textContent = testo || "(vuoto)";
  if (logSegui.checked || inFondo) logRighe.scrollTop = logRighe.scrollHeight;

  // Finché il pannello è aperto si rilegge da solo: un motore che sta partendo
  // scrive proprio mentre lo guardi, ed è quello il momento in cui serve.
  if (orologioLog === null) {
    orologioLog = window.setInterval(() => {
      if (sezione("log").hidden) {
        window.clearInterval(orologioLog as number);
        orologioLog = null;
        return;
      }
      void apriLog();
    }, 2000);
  }
}

logQuale.addEventListener("change", () => void apriLog());
(document.getElementById("log-cartella") as HTMLButtonElement).addEventListener("click", () => {
  void api.suite.revealPath("logs");
});

/* ------------------------------------------------------------ memoria video */

/**
 * Chi occupa la memoria video adesso, e come liberarla.
 *
 * **Perché serve un pannello e non basta la spia in fondo.** La spia dice
 * quanti GB sono occupati; questo dice **da cosa**, ed è l'unica forma utile
 * della domanda: con 8 GB, quando una generazione muore per memoria esaurita,
 * la manovra è togliere quel modello lì — non tutti, non spegnere il motore, e
 * soprattutto non riavviare la suite.
 *
 * Nasce come una fila di quadratini colorati nella barra di DaProdMusica.
 * Diventa un pannello della suite perché la GPU è una sola: un modello lasciato
 * in memoria da DaProdFoto è memoria che manca a Musica.
 */

const memVoci = document.getElementById("memoria-voci") as HTMLElement;
const memRiassunto = document.getElementById("memoria-riassunto") as HTMLElement;
const memNota = document.getElementById("memoria-nota") as HTMLElement;
const memAggiorna = document.getElementById("memoria-aggiorna") as HTMLButtonElement;
const memSvuota = document.getElementById("memoria-svuota") as HTMLButtonElement;

/**
 * I nomi interni del motore, detti in italiano.
 *
 * `MiniMaxMusic3TEModel` è giusto e non serve a niente: chi guarda vuole sapere
 * che quei 5,5 GB sono il modello che legge il testo di una canzone. Un nome
 * che non conosciamo si mostra com'è — meglio un nome tecnico che una riga che
 * sparisce.
 */
const NOMI_VRAM: Record<string, string> = {
  MiniMaxMusic3TEModel: "Il testo delle canzoni",
  MiniMaxMusic3: "La musica",
  MiniMaxMusic3DAV: "L'audio finale (VAE)",
  Anima: "Le immagini (Anima)",
  WanVAE: "Le immagini, ultimo passo (VAE)",
  Flux2: "Le immagini (FLUX.2 Klein)",
  Traduttore: "L'italiano tradotto in inglese",
};

/** Quanto si prende, e dove: la RAM e la memoria video non sono la stessa cosa. */
function quantoOccupa(modello: ModelloInVram): string {
  if (modello.dispositivo === "cpu") return `${modello.totaleMb ?? modello.vramMb} MB nella RAM`;
  return `${numero(modello.vramMb / 1024, 2)} GB`;
}

async function disegnaMemoria(): Promise<void> {
  const modelli = await api.vram.elenco();

  // Il traduttore di DaProdFoto sta nella RAM: conta come qualcosa che occupa
  // memoria e che si può togliere, ma non va sommato ai GB della scheda video —
  // scriverli insieme direbbe una cosa falsa sullo spazio che resta sulla GPU.
  const inScheda = modelli.filter((m) => m.dispositivo !== "cpu");
  const totale = inScheda.reduce((somma, m) => somma + m.vramMb, 0);
  memSvuota.disabled = inScheda.length === 0;

  if (modelli.length === 0) {
    memVoci.innerHTML = "";
    memRiassunto.textContent = "Niente in memoria video.";
    memNota.textContent =
      "La memoria si riempie quando un'app genera qualcosa, e quello che ci " +
      "finisce dentro ci resta finché serve — così la seconda immagine non " +
      "ricarica niente. Qui compare mentre un motore è acceso.";
    return;
  }

  const nellaRam = modelli.length - inScheda.length;
  memRiassunto.textContent =
    (inScheda.length
      ? `${inScheda.length} in memoria video · ${numero(totale / 1024, 2)} GB`
      : "Niente in memoria video") + (nellaRam ? ` · ${nellaRam} nella RAM` : "");
  memNota.textContent =
    "Togliere un modello non spegne il motore: la prossima generazione " +
    "ricarica quello che le serve. È la manovra da fare quando una cosa non " +
    "ci sta, invece di riavviare tutto.";

  memVoci.innerHTML = "";
  for (const modello of modelli) {
    const voce = document.createElement("li");
    voce.className = "voce voce-memoria";

    const testi = document.createElement("div");
    const nome = document.createElement("b");
    nome.textContent = NOMI_VRAM[modello.nome] ?? modello.nome;
    const sotto = document.createElement("span");
    sotto.className = "voce-sotto";
    // Il nome interno resta scritto: è quello che si trova nei log del motore,
    // e chi ci va a guardare deve poterlo ricollegare a questa riga.
    sotto.textContent =
      `${quantoOccupa(modello)} · ${modello.nome}` +
      (modello.dispositivo ? ` · ${modello.dispositivo}` : "") +
      (modello.stato === "carico" ? " · lo sto caricando" : "");
    testi.append(nome, document.createElement("br"), sotto);

    const togli = document.createElement("button");
    togli.className = "bottone secondario";
    togli.textContent = "Togli dalla memoria";
    togli.addEventListener("click", () => {
      void (async () => {
        togli.disabled = true;
        togli.textContent = "Tolgo…";
        await api.vram.scarica(modello.nome);
        await disegnaMemoria();
      })();
    });

    voce.append(testi, togli);
    memVoci.append(voce);
  }
}

memAggiorna.addEventListener("click", () => void disegnaMemoria());

memSvuota.addEventListener("click", () => {
  void (async () => {
    memSvuota.disabled = true;
    await api.vram.svuota();
    await disegnaMemoria();
  })();
});
