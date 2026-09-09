/**
 * Quello che vale per la finestra di **ogni** app, e che nessuna deve rifarsi.
 *
 * Per ora una cosa sola, ed è quella che è costata più tempo di tutte: **far
 * uscire allo scoperto gli errori dell'interfaccia**. Una pagina che si rompe
 * lo scrive nella console del suo renderer, che senza DevTools aperti non
 * guarda nessuno: da fuori si vede solo un bottone che non fa niente, e si
 * finisce a indovinare. Da qui in poi finiscono in `logs/<app>-pagina.log`
 * insieme al file e alla riga.
 *
 * È anche il primo pezzo del "terminale dentro ogni app" della roadmap: le
 * righe adesso esistono e sono raccolte, resta da mostrarle.
 *
 * Dalla 1.2.4 c'è una seconda cosa, ed è dello stesso genere: **far vedere una
 * finestra per davvero**, anche quando la posizione che si ricordava sta su uno
 * schermo che adesso è spento. Sta qui sotto, sotto il suo titolo.
 */

import { BrowserWindow, screen } from "electron";
import { createLogger, type ServiceLogger } from "./logging";

const LIVELLI = ["debug", "info", "avviso", "ERRORE"] as const;

const aperti = new Map<string, ServiceLogger>();

/**
 * Manda nel log quello che la pagina scrive in console, errori compresi.
 *
 * Si aggancia una volta per finestra; il file resta aperto per tutta la
 * sessione della suite, perché un'app aperta e chiusa tre volte è comunque la
 * stessa storia da leggere.
 */
export function registraConsole(finestra: BrowserWindow, app: string): void {
  const logger = aperti.get(app) ?? createLogger(`${app}-pagina`);
  aperti.set(app, logger);

  finestra.webContents.on("console-message", (_evento, livello, messaggio, riga, sorgente) => {
    // Il rumore di ogni giorno non serve: interessano avvisi ed errori, cioè
    // le due cose che vogliono dire "qualcosa non sta funzionando".
    if (livello < 2) return;
    const dove = sorgente ? ` (${sorgente.split("/").pop()}:${riga})` : "";
    logger.write(`[${LIVELLI[livello] ?? livello}] ${messaggio}${dove}\n`, livello >= 3);
  });

  // Una pagina che non carica proprio non arriva nemmeno a scrivere in console.
  finestra.webContents.on("did-fail-load", (_e, codice, descrizione, url) => {
    logger.write(`[ERRORE] pagina non caricata (${codice} ${descrizione}): ${url}\n`, true);
  });

  finestra.webContents.on("render-process-gone", (_e, dettagli) => {
    logger.write(`[ERRORE] la pagina è morta: ${dettagli.reason}\n`, true);
  });
}

/* ------------------------------------------ le finestre che tornano a casa */

/** Un rettangolo sullo schermo: quello che Electron chiama «bounds». */
export interface Rettangolo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * **Una finestra su uno schermo spento è una finestra persa.**
 *
 * Chiesto il 9 settembre 2026, ed era successo davvero:
 *
 * > «Se apro l'app e apro DaProdConnessione dice aperto ma la finestra è
 * > irraggiungibile, non la riesco ad aprire. Credo di aver lasciato la
 * > finestra su uno schermo secondario che ora ho spento: la vedo nella
 * > taskbar ma non la posso portare in primo piano.»
 *
 * Ed era esattamente quello. Ogni scheda si ricorda dov'era — `readBounds` in
 * `app-state.ts` — e quelle coordinate, il giorno che stacchi il secondo
 * schermo, cadono in una parte di mondo che non esiste più. Windows la tiene
 * viva e te la mostra nella barra, ma non c'è nessun pixel dove disegnarla:
 * `focus()` funziona e non si vede niente. La suite diceva il vero — «è
 * aperta» — e non serviva a niente.
 *
 * Il commento di `readBounds` prometteva già di non produrre «una finestra
 * fuori da ogni schermo». Il controllo non c'era mai stato: è il genere di
 * bugia che si scopre il giorno che stacchi un monitor.
 *
 * **Perché non si resetta tutto a ogni avvio.** Era la richiesta letterale, ed
 * era la strada corta: due righe e il guaio sparisce. Ma butta via una cosa che
 * serve — chi lavora con due schermi accesi si mette DaProdMusica di là e il
 * visualizer di qua, e ritrovarseli ammucchiati al centro a ogni avvio è una
 * seccatura al giorno per un guaio che capita una volta l'anno. Qui la
 * posizione si tiene **finché è raggiungibile**, e si butta solo quando non lo
 * è: al riavvio, e anche a suite accesa quando la finestra c'è già.
 *
 * Per il caso che questo non copre — la finestra si vede, ma sta in un angolo
 * scomodo — c'è la voce nel menu dell'area di notifica, che le rimette tutte
 * al centro comunque stiano.
 */

/**
 * Questo rettangolo si vede su almeno uno degli schermi accesi adesso?
 *
 * Basta che se ne veda **un pezzo**, non tutto: una finestra a metà fra due
 * schermi, o un po' oltre il bordo, è una finestra che si prende col mouse e si
 * rimette a posto. Il guaio è quando non c'è niente da afferrare.
 *
 * Il pezzo però dev'essere grosso abbastanza da poterci mettere il dito sopra:
 * sessanta pixel per venti, più o meno un angolo della barra del titolo. Venti
 * pixel che spuntano da un bordo sono, in pratica, una finestra persa.
 */
export function siVedeDaQualcheParte(rettangolo: Rettangolo): boolean {
  const LARGO = 60;
  const ALTO = 20;
  try {
    return screen.getAllDisplays().some((schermo) => {
      const s = schermo.workArea;
      const largo =
        Math.min(rettangolo.x + rettangolo.width, s.x + s.width) - Math.max(rettangolo.x, s.x);
      const alto =
        Math.min(rettangolo.y + rettangolo.height, s.y + s.height) - Math.max(rettangolo.y, s.y);
      return largo >= LARGO && alto >= ALTO;
    });
  } catch {
    // `screen` risponde solo a suite pronta. Se qualcuno chiede prima si dice di
    // sì: meglio una finestra dov'era che una finestra spostata per un dubbio
    // nostro.
    return true;
  }
}

/**
 * Lo schermo **davanti a chi sta guardando**: quello dove sta il puntatore.
 *
 * Non il primo della lista e non il principale: chi sta cercando una finestra la
 * sta cercando davanti a sé, e il mouse è la cosa che dice meglio dove sia
 * «davanti a sé» in questo momento.
 */
function schermoDavanti(): Rettangolo | null {
  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  } catch {
    return null;
  }
}

/**
 * Mette una finestra in mezzo allo schermo che si sta guardando.
 *
 * La dimensione si accorcia se non ci sta: una finestra da 1400 su uno schermo
 * da 1366 tornerebbe fuori dal bordo il momento dopo.
 *
 * ⚠ **Da ingrandita, `setBounds` non sposta niente.** Windows tiene la finestra
 * incollata al suo schermo finché è massimizzata: va rimpicciolita, spostata, e
 * poi ingrandita di nuovo — che è dove finisce, cioè sullo schermo nuovo.
 */
function mettiAlCentro(finestra: BrowserWindow): boolean {
  const casa = schermoDavanti();
  if (!casa) return false;

  const dove = finestra.getBounds();
  const width = Math.min(dove.width, casa.width);
  const height = Math.min(dove.height, casa.height);
  const eraIngrandita = finestra.isMaximized();

  if (finestra.isMinimized()) finestra.restore();
  if (eraIngrandita) finestra.unmaximize();
  finestra.setBounds({
    x: Math.round(casa.x + (casa.width - width) / 2),
    y: Math.round(casa.y + (casa.height - height) / 2),
    width,
    height,
  });
  if (eraIngrandita) finestra.maximize();
  return true;
}

/** Rimette una finestra dove si vede, **se** dov'è non si vede più. */
export function riportaSottoGliOcchi(finestra: BrowserWindow): boolean {
  if (finestra.isDestroyed()) return false;
  // A schermo intero sta già su uno schermo vero: Windows non la lascia su un
  // monitor che non c'è.
  if (finestra.isFullScreen()) return false;
  if (siVedeDaQualcheParte(finestra.getBounds())) return false;
  return mettiAlCentro(finestra);
}

/**
 * **Mostrare una finestra per davvero**: quello che fanno tutte e nove le
 * schede quando le riapri e ci sono già.
 *
 * ⚠ Era scritto nove volte, uguale, in nove file — e nessuna delle nove copie
 * sapeva della finestra finita fuori schermo. È il difetto di sempre: una cosa
 * fatta in nove posti impara le cose in un posto solo. Adesso la riga sta qui,
 * e il giorno che deve imparare qualcos'altro lo impara per tutte.
 *
 * L'ordine conta: prima si riporta dove si vede, poi si tira su da minimizzata,
 * poi si mostra, e il fuoco per ultimo — dare il fuoco a una finestra ancora
 * nascosta, su Windows, non fa niente.
 */
export function mostraDavvero(finestra: BrowserWindow): void {
  if (finestra.isDestroyed()) return;
  riportaSottoGliOcchi(finestra);
  if (finestra.isMinimized()) finestra.restore();
  if (!finestra.isVisible()) finestra.show();
  finestra.focus();
}

/**
 * Rimette **tutte** le finestre al centro, comunque stiano.
 *
 * È la via d'uscita a mano, per il caso che il controllo automatico non copre:
 * la finestra sta su uno schermo acceso ma in un angolo dove non la prendi. La
 * chiama la voce del menu nell'area di notifica, che è l'unico posto che si
 * raggiunge sempre — anche quando la finestra che cerchi è proprio quella che
 * non riesci a toccare.
 *
 * Qui si sposta **tutto**, non solo quello che non si vede: chi preme quella
 * voce lo sta chiedendo apposta.
 */
export function riportaTutteACasa(): number {
  let quante = 0;
  for (const finestra of BrowserWindow.getAllWindows()) {
    if (finestra.isDestroyed() || finestra.isFullScreen()) continue;
    try {
      if (mettiAlCentro(finestra)) {
        if (!finestra.isVisible()) finestra.show();
        quante++;
      }
    } catch {
      // Una finestra che non si lascia spostare non deve fermare le altre.
    }
  }
  return quante;
}
