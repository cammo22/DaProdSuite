/**
 * Icona nell'area di notifica.
 *
 * Serve perché l'hub e le app sono finestre indipendenti: puoi chiudere l'hub e
 * continuare a lavorare nel Visualizer. Senza un punto di rientro, però, l'hub
 * chiuso sarebbe irrecuperabile fino al riavvio della suite.
 */

import { Menu, Tray, app, nativeImage } from "electron";
import { join } from "node:path";
import { APPS, type AppId } from "@daprod/ipc";

let tray: Tray | null = null;

export interface AzioniTray {
  mostraHub: () => void;
  apriApp: (id: AppId) => void;
  /** Id delle app apribili adesso. */
  appDisponibili: () => AppId[];
  esci: () => void;
}

export function creaTray(azioni: AzioniTray): void {
  if (tray) return;

  const icona = nativeImage
    .createFromPath(
      app.isPackaged
        ? join(process.resourcesPath, "icon.png")
        : join(app.getAppPath(), "build", "icon.png"),
    )
    // 16px è la dimensione dell'area di notifica su Windows: senza ridimensionare,
    // l'icona da 512 viene scalata male.
    .resize({ width: 16, height: 16 });

  tray = new Tray(icona);
  tray.setToolTip("DaProd Suite");
  tray.on("click", azioni.mostraHub);

  const ridisegna = () => {
    const disponibili = azioni.appDisponibili();

    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Apri l'hub", click: azioni.mostraHub },
        { type: "separator" },
        ...(disponibili.length > 0
          ? disponibili.map((id) => ({
              label: APPS[id].name,
              click: () => azioni.apriApp(id),
            }))
          : [{ label: "Nessuna app ancora installata", enabled: false }]),
        { type: "separator" },
        { label: "Esci dalla suite", click: azioni.esci },
      ]),
    );
  };

  ridisegna();
  // Il menu si ricostruisce a ogni apertura: le app disponibili cambiano mentre
  // la suite gira, man mano che si installano.
  tray.on("right-click", ridisegna);
}

export function distruggiTray(): void {
  tray?.destroy();
  tray = null;
}
