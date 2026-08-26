/**
 * Gli avvisi di Windows, per chi sta al computer.
 *
 * **Il difetto che questo file cura, detto il 26 agosto 2026:** «mettiamo le
 * notifiche anche su pc che non le sento».
 *
 * Fino alla 0.7.6 l'avviso di un lavoro finito arrivava solo sul telefono di
 * chi l'aveva chiesto. Chi ospita la macchina — che è quello che aspetta di
 * più, perché è seduto lì mentre la scheda video lavora — non riceveva niente:
 * doveva tenere una finestra aperta e guardarla.
 *
 * ## Poche, e solo quando conta
 *
 * Un programma che avvisa a ogni cosa smette di essere ascoltato, e allora
 * tanto vale non avvisare. Qui se ne mandano due sole:
 *
 * - **un lavoro è pronto** — la cosa per cui si stava aspettando;
 * - **è arrivata una richiesta da decidere**, e solo se non parte da sola.
 *
 * Niente per un lavoro che parte, niente per uno che entra in fila, niente per
 * un telefono che si collega: sono cose che si vedono guardando, e chi guarda
 * non ha bisogno che glielo si dica.
 *
 * ## Perché non fallisce mai
 *
 * Windows può avere le notifiche spente per questa app, la suite può non essere
 * ancora pronta, il sistema può non supportarle. Nessuno di questi casi è un
 * guasto: si prova, e se non si può si va avanti. Un avviso che non arriva non
 * deve poter rompere la consegna di un file.
 */

import { Notification, app } from "electron";
import { ICONA_SUITE } from "./paths";

/**
 * Quanto deve passare fra due avvisi uguali.
 *
 * Serve a un caso vero: la coda che consegna quattro immagini di fila in venti
 * secondi. Quattro riquadri che si accavallano nell'angolo dello schermo non
 * sono quattro informazioni, sono un fastidio — e il quarto copre il primo.
 */
const NON_RIPETERE_MS = 3000;

const ultimoAvviso = new Map<string, number>();

/**
 * Fa comparire un avviso di Windows. Torna vero se è partito.
 *
 * `chiave` serve a non ripetersi: due avvisi con la stessa chiave a pochi
 * secondi di distanza diventano uno solo. Senza, si usa il titolo.
 */
export function avvisaSulComputer(titolo: string, corpo: string, chiave?: string): boolean {
  try {
    if (!app.isReady()) return false;
    if (!Notification.isSupported()) return false;

    const quale = chiave ?? titolo;
    const adesso = Date.now();
    const prima = ultimoAvviso.get(quale) ?? 0;
    if (adesso - prima < NON_RIPETERE_MS) return false;
    ultimoAvviso.set(quale, adesso);

    new Notification({
      title: titolo,
      body: corpo,
      // L'icona della suite: senza, Windows mette quella di Electron, e un
      // avviso che sembra di un altro programma è un avviso che si ignora.
      icon: ICONA_SUITE,
      silent: false,
    }).show();
    return true;
  } catch {
    // Notifiche spente, sistema che non le regge, app non ancora pronta: non è
    // un guasto, e non deve poter rompere quello che le stava intorno.
    return false;
  }
}
