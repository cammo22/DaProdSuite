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
  GpuState,
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
const spiaRuntime = document.getElementById("spia-runtime") as HTMLElement;
const spiaGpu = document.getElementById("spia-gpu") as HTMLElement;

/** Pezzi delle schede, per poterli aggiornare senza ridisegnare tutto. */
const schede = new Map<
  AppId,
  {
    scheda: HTMLElement;
    etichetta: HTMLElement;
    azione: HTMLButtonElement;
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

    const azione = document.createElement("button");
    azione.className = "bottone";
    azione.addEventListener("click", () => void premuto(app.id));

    fondo.append(etichetta, azione);
    scheda.append(arte, testa, barra, fondo);
    griglia.append(scheda);

    schede.set(app.id, { scheda, etichetta, azione, barra, riempimento });
  }
}

/** Cosa fa il bottone dipende dallo stato in cui si trova l'app. */
const azioniPerStato: Record<
  AppState["status"],
  { testo: (s: AppState) => string; attivo: boolean; classe: string }
> = {
  "non-inclusa": { testo: () => "In arrivo", attivo: false, classe: "" },
  "da-installare": { testo: (s) => (s.missingGb > 0 ? `Installa · ${numero(s.missingGb, 1)} GB` : "Installa"), attivo: true, classe: "" },
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

    // Un'app non ancora dentro la suite si riconosce anche dalla copertina:
    // spenta, come tutto il resto della scheda.
    elementi.scheda.classList.toggle("in-arrivo", stato.status === "non-inclusa");

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

/* ------------------------------------------------------------------- spie */

function aggiornaSpiaRuntime(stato: RuntimeState): void {
  aggiornaPannelloAmbiente(stato);
  spiaRuntime.className = "spia";

  if (stato.installing) {
    spiaRuntime.textContent = `Ambiente: installazione ${stato.installing.step}/${stato.installing.total}`;
    return;
  }
  if (!stato.ready) {
    spiaRuntime.textContent = "Ambiente: da installare";
    return;
  }
  if (stato.cudaAvailable === false) {
    // Senza CUDA i motori girerebbero su CPU: tecnicamente funziona, ma così
    // lento da essere inutilizzabile. Meglio dirlo forte.
    spiaRuntime.textContent = `Ambiente: torch ${stato.torchVersion} — GPU non rilevata`;
    spiaRuntime.classList.add("guasto");
    return;
  }
  spiaRuntime.textContent = `Ambiente: Python ${stato.pythonVersion} · torch ${stato.torchVersion}`;
}

/* --------------------------------------------------- pannello dell'ambiente */

const pannello = document.getElementById("pannello-ambiente") as HTMLElement;
const ambTitolo = document.getElementById("ambiente-titolo") as HTMLElement;
const ambDettaglio = document.getElementById("ambiente-dettaglio") as HTMLElement;
const ambAzione = document.getElementById("ambiente-azione") as HTMLButtonElement;
const ambBarra = document.getElementById("ambiente-barra") as HTMLElement;
const ambRiempimento = document.getElementById("ambiente-riempimento") as HTMLElement;
const ambLog = document.getElementById("ambiente-log") as HTMLElement;

ambAzione.addEventListener("click", () => {
  ambAzione.disabled = true;
  void api.runtime.install();
});

function aggiornaPannelloAmbiente(stato: RuntimeState): void {
  // Ambiente a posto: il pannello sparisce e non ruba spazio alle app.
  if (stato.ready && !stato.installing) {
    pannello.hidden = true;
    return;
  }
  pannello.hidden = false;

  const inCorso = Boolean(stato.installing);
  ambAzione.disabled = inCorso;
  ambBarra.hidden = !inCorso;
  ambLog.hidden = !stato.log?.length;

  if (stato.log?.length) {
    ambLog.textContent = stato.log.join("\n");
    ambLog.scrollTop = ambLog.scrollHeight;
  }

  if (stato.installing) {
    const { step, total, label } = stato.installing;
    ambTitolo.textContent = `Installazione in corso — passo ${step} di ${total}`;
    ambDettaglio.textContent = label;
    ambAzione.textContent = "Attendi…";
    ambRiempimento.style.width = `${(step / total) * 100}%`;
    return;
  }

  if (stato.error) {
    ambTitolo.textContent = "L'installazione si è fermata";
    ambDettaglio.textContent = stato.error;
    ambAzione.textContent = "Riprova";
    return;
  }

  ambTitolo.textContent = "Manca l'ambiente Python";
  ambDettaglio.textContent =
    "La suite installa una volta sola Python 3.12 e PyTorch con CUDA, condivisi da tutte le app. Circa 4 GB, qualche minuto.";
  ambAzione.textContent = "Installa l'ambiente";
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
  gbComuni = (await api.runtime.state()).ready ? 0 : GB_COMUNI;

  guidaApp.innerHTML = "";
  for (const stato of scelta) {
    const app = api.catalog.find((a) => a.id === stato.id);
    if (!app) continue;

    const voce = document.createElement("li");
    voce.innerHTML = `
      <label>
        <input type="checkbox" value="${app.id}" checked>
        <span class="guida-nome">${app.name}</span>
        <span class="guida-gb">${etichettaCosto(stato)}</span>
      </label>
      <p class="guida-riga">${app.tagline}</p>`;

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

/* ------------------------------------------------------------------- avvio */

for (const bottone of document.querySelectorAll<HTMLButtonElement>("[data-apri]")) {
  bottone.addEventListener("click", () => {
    const kind = bottone.dataset.apri as "output" | "logs" | "models";
    void api.suite.revealPath(kind);
  });
}

api.apps.onChanged(aggiornaSchede);
api.update.onChanged(aggiornaBarraAggiornamenti);
api.runtime.onChanged(aggiornaSpiaRuntime);
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
    aggiornaSpiaRuntime(await api.runtime.state());
    aggiornaSpiaGpu(await api.gpu.state());
    selettoreVelocita.value = (await api.impostazioni.leggi()).velocita;

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
    aggiornaSpiaRuntime(await api.runtime.state())
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

const PANNELLI = ["risultati", "modelli", "log"] as const;
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
        <button class="bottone secondario" data-cartella>nella cartella</button>
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
