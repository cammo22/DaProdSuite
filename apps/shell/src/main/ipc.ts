/**
 * Registrazione dei canali IPC.
 *
 * Tutto ciò che il renderer può chiedere passa da qui. I nomi dei canali stanno
 * in @daprod/ipc e sono gli stessi usati dal preload, così non possono divergere.
 */

import { BrowserWindow, ipcMain, shell } from "electron";
import { app } from "electron";
import {
  APP_LIST,
  CHANNELS,
  type AppId,
  type CosaResettare,
  type FiltroLibreria,
  type Intenzione,
  type Velocita,
  type VoceModello,
} from "@daprod/ipc";
import { impostaVelocita, impostazioni, segnaGuidaFatta } from "./impostazioni";
import { caricaModello, chiediAllLlm, liberaMemoriaLlm, scaricaModello, statoLlm } from "./llm";
import { appManager } from "./app-manager";
import { annulla, installaApp, installaModelli, installaTutte, scaricamenti } from "./scaricamenti";
import { libreria } from "./libreria";
import { disinstallaApp, elimina, reset, statoSpazio } from "./spazio";
import { gpu } from "./gpu";
import { runtime } from "./runtime";
import { updater } from "./updater";
import { isModelPresent, manifest, statoModelli } from "./models";
import { elencoLog, leggiLog } from "./log-lettura";
import { avviaInPiu } from "./servizi";
import { LOGS_DIR, MODELS_DIR, OUTPUT_DIR } from "./paths";

export function registerIpc(getHub: () => BrowserWindow | null): void {
  /* ---------------------------------------------------------------- suite */

  ipcMain.handle(CHANNELS.suiteVersion, () => app.getVersion());

  ipcMain.handle(CHANNELS.suiteRevealPath, async (_e, kind: "output" | "logs" | "models") => {
    const target = { output: OUTPUT_DIR, logs: LOGS_DIR, models: MODELS_DIR }[kind];
    await shell.openPath(target);
  });

  ipcMain.handle(CHANNELS.suiteAvvioPronto, () => appManager.prontoAlPrimoAvvio);

  /* ------------------------------------------------------------------ app */

  ipcMain.handle(CHANNELS.appsList, () => appManager.list());
  ipcMain.handle(CHANNELS.appsOpen, (_e, id: AppId) => appManager.open(id));
  ipcMain.handle(CHANNELS.appsClose, (_e, id: AppId) => appManager.close(id));
  // Non si aspetta: un'installazione dura minuti e a volte ore, e tenere aperta
  // una chiamata IPC per tutto quel tempo vorrebbe dire che l'hub non può più
  // chiedere niente. L'avanzamento arriva da `apps:changed` come ogni altro
  // cambio di stato.
  ipcMain.handle(CHANNELS.appsInstall, (_e, id: AppId) => {
    void installaApp(id);
  });

  ipcMain.handle(CHANNELS.appsAnnullaInstallazione, (_e, id: AppId) => annulla(id));

  // Non si aspetta nemmeno questa: sono ore di scaricamento, e l'hub racconta
  // tutto dalle schede.
  ipcMain.handle(CHANNELS.appsInstallaTutte, (_e, ids: AppId[]) => {
    void installaTutte(Array.isArray(ids) ? ids : []);
  });

  /* --------------------------------------------------------- impostazioni */

  ipcMain.handle(CHANNELS.impostazioniLeggi, () => impostazioni());
  ipcMain.handle(CHANNELS.impostazioniVelocita, (_e, scelta: Velocita) =>
    impostaVelocita(scelta === "spinta" ? "spinta" : "normale"),
  );
  ipcMain.handle(CHANNELS.impostazioniGuida, () => segnaGuidaFatta());

  /* -------------------------------------------------------------- runtime */

  ipcMain.handle(CHANNELS.runtimeState, () => runtime.getState());
  ipcMain.handle(CHANNELS.runtimeInstall, async () => {
    await runtime.install();
    // Le schede dicono "da installare" finché manca l'ambiente: ora va rivisto.
    await appManager.refreshAll();
  });

  /* ------------------------------------------------------------------ gpu */

  ipcMain.handle(CHANNELS.gpuState, () => gpu.getState());

  /* --------------------------------------------------------- aggiornamenti */

  ipcMain.handle(CHANNELS.updateState, () => updater.getState());
  ipcMain.handle(CHANNELS.updateCheck, () => updater.check());
  ipcMain.handle(CHANNELS.updateDownload, () => updater.download());
  ipcMain.handle(CHANNELS.updateInstall, async () => {
    // I motori Python tengono file aperti e VRAM occupata: vanno spenti prima
    // che l'installer provi a sovrascrivere la cartella del programma.
    await appManager.closeAll();
    updater.installAndRestart();
  });

  /* --------------------------------------------------------------- spazio */

  ipcMain.handle(CHANNELS.spazioStato, () => statoSpazio());

  ipcMain.handle(CHANNELS.spazioDisinstalla, async (_e, id: AppId) => {
    await appManager.close(id);
    const liberati = disinstallaApp(id);
    await appManager.refreshAll();
    return liberati;
  });

  ipcMain.handle(CHANNELS.spazioElimina, async (_e, id: string) => {
    const liberati = elimina(id);
    // Cancellare un modello puo' rendere inutilizzabile un'app, e cancellare un
    // risultato cambia la libreria: entrambe vanno rilette subito.
    await appManager.refreshAll();
    libreria.segnalaNovita();
    return liberati;
  });

  ipcMain.handle(CHANNELS.spazioReset, async (_e, cosa: CosaResettare) => {
    // Prima si spengono i motori: hanno file aperti dentro le cartelle che
    // stiamo per cancellare, e su Windows un file in uso non si cancella.
    await appManager.closeAll();
    const liberati = reset(cosa);
    await appManager.refreshAll();
    libreria.segnalaNovita();
    return liberati;
  });

  /* -------------------------------------------------------------- modelli */

  // Chiesti da dentro un'app aperta: è così che DaProdFoto offre FLUX.2 Klein
  // senza costringere a tornare nell'hub e reinstallare la scheda.
  ipcMain.handle(CHANNELS.modelliStato, (_e, ids: string[]) =>
    statoModelli(Array.isArray(ids) ? ids : []),
  );

  ipcMain.handle(CHANNELS.modelliScarica, (_e, id: AppId, ids: string[]) => {
    // Come `apps:install`: non si aspetta, sono GB. L'avanzamento arriva sul suo
    // canale, e la chiamata torna subito perché la finestra resti viva.
    void installaModelli(id, Array.isArray(ids) ? ids : []);
  });

  ipcMain.handle(CHANNELS.modelliAnnulla, (_e, id: AppId) => annulla(id));

  /* ------------------------------------------------------------------ llm */

  // Uno per tutta la suite: ogni app gli chiede la cosa che sa chiedere.
  ipcMain.handle(CHANNELS.llmStato, () => statoLlm());
  ipcMain.handle(CHANNELS.llmCarica, (_e, id: string, contesto: number) =>
    caricaModello(String(id), Number(contesto) || 65_536),
  );
  ipcMain.handle(CHANNELS.llmScarica, (_e, id: string) => scaricaModello(String(id)));
  ipcMain.handle(CHANNELS.llmLibera, () => liberaMemoriaLlm());
  ipcMain.handle(
    CHANNELS.llmChiedi,
    (
      _e,
      domanda: {
        sistema?: string;
        utente?: string;
        schema?: Record<string, unknown>;
        nomeSchema?: string;
      },
    ) =>
      chiediAllLlm({
        sistema: String(domanda?.sistema ?? ""),
        utente: String(domanda?.utente ?? ""),
        schema: domanda?.schema,
        nomeSchema: domanda?.nomeSchema,
      }),
  );

  /* ------------------------------------------------------------- libreria */

  ipcMain.handle(CHANNELS.libreriaElenco, (_e, filtro?: FiltroLibreria) =>
    libreria.cerca(filtro ?? {}),
  );

  ipcMain.handle(CHANNELS.libreriaMostra, (_e, id: string) => {
    const elemento = libreria.trova(id);
    if (!elemento) return false;
    shell.showItemInFolder(elemento.percorso);
    return true;
  });

  ipcMain.handle(CHANNELS.libreriaRinomina, (_e, id: string, nome: string) =>
    libreria.rinomina(id, String(nome ?? "")),
  );

  ipcMain.handle(CHANNELS.libreriaCopertina, (_e, id: string, dataUrl: string | null) =>
    libreria.impostaCopertina(id, typeof dataUrl === "string" && dataUrl ? dataUrl : null),
  );

  ipcMain.handle(CHANNELS.libreriaMeta, (_e, id: string, meta: Record<string, unknown>) =>
    libreria.scriviMeta(id, meta && typeof meta === "object" ? meta : {}),
  );

  ipcMain.handle(CHANNELS.libreriaElimina, (_e, id: string) => libreria.elimina(id));

  ipcMain.handle(
    CHANNELS.appInvia,
    (_e, destinazione: AppId, elementoId: string, intenzione: Intenzione) =>
      appManager.consegna(destinazione, elementoId, intenzione),
  );

  // Un motore che l'app usa solo a volte: lo accende quando lo chiede la sua
  // finestra, non quando si apre la scheda.
  ipcMain.handle(CHANNELS.appMotoreInPiu, (_e, id: AppId, nome: string) =>
    avviaInPiu(id, nome),
  );

  /**
   * Il catalogo dei modelli come lo guarda l'hub.
   *
   * La domanda non e' "com'e' fatto il manifesto" ma "ce l'ho, quanto pesa, a
   * quali schede serve": per questo `usatoDa` si ricava dal catalogo delle app
   * invece di stare scritto due volte, e `extra` distingue i pesi che nessuna
   * scheda pretende per partire.
   */
  ipcMain.handle(CHANNELS.modelliCatalogo, (): VoceModello[] => {
    const voci = manifest().models;
    return Object.entries(voci).map(([id, entry]) => {
      const usatoDa = APP_LIST.filter(
        (a) => a.models.includes(id) || (a.extraModels ?? []).includes(id),
      ).map((a) => a.id);
      return {
        id,
        label: entry.label,
        // LM Studio se li tiene lui: chiedere al disco non avrebbe senso.
        presente: entry.kind === "lmstudio" ? true : isModelPresent(id),
        bytes: entry.bytes,
        usatoDa,
        extra: !APP_LIST.some((a) => a.models.includes(id)),
        esterno: entry.kind === "lmstudio",
      };
    });
  });

  ipcMain.handle(CHANNELS.logElenco, () => elencoLog());
  ipcMain.handle(CHANNELS.logLeggi, (_e, nome: string, righe?: number) =>
    leggiLog(nome, righe ?? 300),
  );

  ipcMain.handle(CHANNELS.appChiudi, (_e, id: AppId) => appManager.close(id));

  /* ------------------------------------------------- notifiche al renderer */

  const send = (channel: string, payload: unknown) => {
    const hub = getHub();
    if (hub && !hub.isDestroyed()) hub.webContents.send(channel, payload);
  };

  appManager.on("changed", (states) => send(CHANNELS.appsChanged, states));
  runtime.on("changed", (state) => send(CHANNELS.runtimeChanged, state));
  gpu.on("changed", (state) => send(CHANNELS.gpuChanged, state));
  updater.on("changed", (state) => send(CHANNELS.updateChanged, state));

  const aTutte = (channel: string, payload: unknown) => {
    for (const finestra of BrowserWindow.getAllWindows()) {
      if (!finestra.isDestroyed()) finestra.webContents.send(channel, payload);
    }
  };

  // La libreria interessa tutte le finestre, non solo l'hub: se DaProdMusica
  // finisce un brano, il Visualizer aperto accanto deve vederlo comparire senza
  // che l'utente lo ricarichi.
  libreria.on("cambiata", (elementi) => aTutte(CHANNELS.libreriaCambiata, elementi));

  // Anche l'avanzamento di un modello va a tutte: i pesi sono condivisi, quindi
  // se Foto sta scaricando qualcosa che serve anche a Musica, Musica lo vede.
  scaricamenti.on("avanzamento", (stato) => aTutte(CHANNELS.modelliAvanzamento, stato));
}
