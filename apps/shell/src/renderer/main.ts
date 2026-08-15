/**
 * Hub della suite.
 *
 * Disegna una scheda per app e la tiene aggiornata. Nessuna logica vera qui
 * dentro: lo stato arriva dallo shell tramite `window.daprod` e questo file si
 * limita a renderlo leggibile.
 */

import type { AppId, AppState, GpuState, RuntimeState, UpdateState } from "@daprod/ipc";

const api = window.daprod;

const griglia = document.getElementById("griglia") as HTMLElement;
const statoAgg = document.getElementById("stato-agg") as HTMLElement;
const btnAgg = document.getElementById("btn-agg") as HTMLButtonElement;
const spiaRuntime = document.getElementById("spia-runtime") as HTMLElement;
const spiaGpu = document.getElementById("spia-gpu") as HTMLElement;

/** Bottoni delle schede, per poterli aggiornare senza ridisegnare tutto. */
const schede = new Map<AppId, { etichetta: HTMLElement; azione: HTMLButtonElement }>();

/* ------------------------------------------------------------------- schede */

function costruisciGriglia(): void {
  for (const app of api.catalog) {
    const scheda = document.createElement("article");
    scheda.className = "scheda";
    scheda.style.setProperty("--accento", app.accent);

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

    const fondo = document.createElement("div");
    fondo.className = "scheda-fondo";

    const etichetta = document.createElement("span");
    etichetta.className = "etichetta";

    const azione = document.createElement("button");
    azione.className = "bottone";
    azione.addEventListener("click", () => void premuto(app.id));

    fondo.append(etichetta, azione);
    scheda.append(testa, fondo);
    griglia.append(scheda);

    schede.set(app.id, { etichetta, azione });
  }
}

/** Cosa fa il bottone dipende dallo stato in cui si trova l'app. */
const azioniPerStato: Record<
  AppState["status"],
  { testo: (s: AppState) => string; attivo: boolean; classe: string }
> = {
  "non-inclusa": { testo: () => "In arrivo", attivo: false, classe: "" },
  "da-installare": { testo: (s) => (s.missingGb > 0 ? `Installa · ${s.missingGb} GB` : "Installa"), attivo: true, classe: "" },
  "in-preparazione": { testo: () => "Preparazione…", attivo: false, classe: "attesa" },
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

function aggiornaSchede(stati: AppState[]): void {
  for (const stato of stati) {
    const elementi = schede.get(stato.id);
    if (!elementi) continue;

    const regola = azioniPerStato[stato.status];
    elementi.azione.textContent = regola.testo(stato);
    elementi.azione.disabled = !regola.attivo;

    elementi.etichetta.textContent = stato.error ?? descrizioneStato[stato.status];
    elementi.etichetta.className = `etichetta ${regola.classe}`;
    elementi.etichetta.title = stato.error ?? "";
  }
}

async function premuto(id: AppId): Promise<void> {
  const stati = await api.apps.list();
  const stato = stati.find((s) => s.id === id);
  if (!stato) return;

  if (stato.status === "attiva") await api.apps.close(id);
  else if (stato.status === "pronta") await api.apps.open(id);
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

void (async () => {
  (document.getElementById("versione") as HTMLElement).textContent =
    `versione ${await api.suite.version()}`;
  aggiornaSchede(await api.apps.list());
  aggiornaBarraAggiornamenti(await api.update.state());
  aggiornaSpiaRuntime(await api.runtime.state());
  aggiornaSpiaGpu(await api.gpu.state());
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

function gb(bytes: number): string {
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`
}

async function disegnaSpazio(): Promise<void> {
  const stato = await api.spazio.stato()

  riassunto.textContent =
    `La suite occupa ${gb(stato.occupato)}. Liberi sul disco: ${gb(stato.libero)}.`

  barraSpazio.replaceChildren(
    ...stato.voci.map((voce) => {
      const fetta = document.createElement('span')
      fetta.style.width = `${(voce.bytes / Math.max(stato.occupato, 1)) * 100}%`
      fetta.style.background = COLORI[voce.categoria] ?? '#8d97a9'
      fetta.title = `${voce.etichetta} · ${gb(voce.bytes)}`
      return fetta
    }),
  )

  vociSpazio.replaceChildren(
    ...stato.voci.map((voce) => {
      const riga = document.createElement('li')
      riga.className = 'voce'

      const punto = document.createElement('span')
      punto.className = 'voce__punto'
      punto.style.background = COLORI[voce.categoria] ?? '#8d97a9'

      const nome = document.createElement('span')
      nome.className = 'voce__nome'
      nome.textContent = voce.etichetta
      nome.title = voce.conseguenza

      const peso = document.createElement('span')
      peso.className = 'voce__peso'
      peso.textContent = gb(voce.bytes)

      riga.append(punto, nome, peso)

      if (voce.cancellabile) {
        const elimina = document.createElement('button')
        elimina.className = 'voce__elimina'
        elimina.textContent = 'Elimina'
        elimina.addEventListener('click', async () => {
          // La conseguenza è scritta nel messaggio: cancellare un modello da
          // 13 GB non deve poter succedere per un clic distratto.
          if (!confirm(`Elimino "${voce.etichetta}" (${gb(voce.bytes)})?\n\n${voce.conseguenza}`))
            return
          elimina.disabled = true
          await api.spazio.elimina(voce.id)
          await disegnaSpazio()
        })
        riga.append(elimina)
      }

      return riga
    }),
  )
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
