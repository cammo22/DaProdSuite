/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta. La scheda si costruisce **prima** di parlare col motore, come
 * in DaProdFoto: scegliere il modello, guardare quanto pesa e far partire lo
 * scaricamento sono cose che funzionano anche a motore spento, e sono le prime
 * che uno fa la prima volta che apre questa scheda.
 */

import {
  aspettaPremibile,
  collegaLavoriDaFuori,
  numero,
  premi,
  scegliInMenu,
  scrivi,
} from "/comune/da-fuori.js";
import { el, mostraScheda, suApertura } from "./dom.js";
import { collegaCrea, lungoDaFuori } from "./crea.js";
import { aggiornaGalleria, collegaGalleria } from "./galleria.js";
import { collegaStoria } from "./storia.js";
import { caricaUltimi, messaggioDalMotore, riallinea } from "./coda.js";
// I quadratini di cosa occupa la memoria: uguali in tutte le app, quindi stanno
// in `packages/ui` e la suite li serve sotto `/comune/`.
import { collegaModelliInMemoria } from "/comune/modelli-in-memoria.js";
import { collega, modelliInVram, scaricaDallaVram, suLibreriaCambiata } from "./ponte.js";

// Le tre schede: Crea, Storia e Galleria. La galleria si rilegge quando la si
// apre — non ogni secondo mentre si guarda altro.
document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("galleria", () => void aggiornaGalleria());

await collegaCrea();
collegaGalleria();
// La storia ha la sua resa — modello, forma, misura, qualità — e se la monta
// da sé: da questa versione non prende più in prestito quella della scheda
// Crea. Si aspetta perché il conto delle inquadrature vuole sapere con quale
// modello si gira, e quello arriva dal disco.
await collegaStoria();

// I video di ieri, sotto la sessione: riaprire la scheda e vedere il vuoto dava
// l'impressione che quello che si era fatto fosse andato perso.
void caricaUltimi();
suLibreriaCambiata(() => void caricaUltimi());

// Il conteggio accanto a «Galleria» dev'essere giusto **prima** che qualcuno ci
// entri: è metà del motivo per cui esiste quel numero.
void aggiornaGalleria();

collegaModelliInMemoria(el.mods, {
  elenco: modelliInVram,
  scarica: scaricaDallaVram,
});

await collega(
  (connesso) => {
    el.dot.classList.toggle("on", connesso);
    el.statusTxt.textContent = connesso ? "pronto" : "motore offline";
    // Il WebSocket che si riapre è il momento in cui si perdono i messaggi di
    // fine lavoro: appena torna, si va a vedere nella cronologia del motore
    // cosa è successo mentre non stavamo ascoltando.
    if (connesso) void riallinea();
  },
  messaggioDalMotore,
);

/**
 * I lavori chiesti da fuori: dal telefono, dalla console, da un agente.
 *
 * Poche righe, e sono tutte «metti questo lì»: la generazione è quella di
 * sempre, perché si preme lo stesso tasto che premeresti tu. Il perché di
 * questa scelta — invece di costruire il grafo qui — sta in
 * `packages/ui/src/da-fuori.js`.
 */
collegaLavoriDaFuori(async (richiesta) => {
  // La clip la fa la scheda Crea, con le impostazioni che ci sono: chi chiede
  // da un telefono dice cosa vuole vedere e quanto deve durare, il resto lo ha
  // già deciso chi ha preparato la scheda.
  mostraScheda("crea");
  scrivi(el.prompt, richiesta.testo);

  /**
   * **Una storia non e' una clip piu' lunga.** Sono due azioni, ed e' voluto.
   *
   * Chiesto il 5 settembre 2026: «in produzione video deve esserci la modalita'
   * normale come prima, oppure un tasto che ti fa entrare in modalita' storia
   * dove si puo' creare il video da 30 secondi o 1 minuto o 2 minuti — ma solo
   * in modalita' storia». Una clip e' **una** generazione e dura minuti; una
   * storia sono da quattro a sedici generazioni incatenate e dura mezz'ora.
   *
   * Il modello, in una storia, non si sceglie: LTX 2.5 e' l'unico che sa
   * ripartire da un fotogramma, e senza quello la catena non esiste.
   */
  if (richiesta.opzioni.azione === "genera.storia") {
    const quanto = numero(richiesta.opzioni.secondi, 30, 120, 30);
    scrivi(el.durata, "20");
    if (scegliInMenu(el.modello, "ltx25")) await aspettaPremibile(el.genera);
    await lungoDaFuori(quanto);
    return;
  }

  if (richiesta.opzioni.secondi) {
    scrivi(el.durata, String(numero(richiesta.opzioni.secondi, 2, 20, 5)));
  }
  if (scegliInMenu(el.modello, richiesta.opzioni.modello)) await aspettaPremibile(el.genera);
  premi(el.genera, "DaProdCinema non è pronta a generare: manca il modello, o la scheda video.");
});
