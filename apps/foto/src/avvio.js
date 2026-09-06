/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * La galleria si legge prima di parlare col motore, perché è l'unica cosa che
 * funziona anche a motore spento — le immagini di ieri si guardano comunque.
 */

import {
  aspettaPremibile,
  collegaLavoriDaFuori,
  numero,
  premi,
  scegliInMenu,
  scrivi,
} from "/comune/da-fuori.js";
import { el, mostraErrore, mostraScheda, suApertura } from "./dom.js";
import { ascolta } from "./bus.js";
import { collegaComandiCoda, messaggioDalMotore, riallinea } from "./coda.js";
import { collegaCrea } from "./crea.js";
import { collegaBonsaiFoto } from "./bonsai.js";
import { collegaRitocco } from "./ritocco.js";
import { collegaScelta } from "./scelta-modello.js";
import { aggiornaGalleria, collegaGalleria } from "./galleria.js";
// I quadratini di cosa occupa la memoria: uguali in tutte le app, quindi
// stanno in `packages/ui` e la suite li serve sotto `/comune/`.
import { collegaModelliInMemoria } from "/comune/modelli-in-memoria.js";
import { collegaLente } from "./lente.js";
import { collegaTrascinamento, eImmagine } from "./trascina.js";
import { collegaTraduzione } from "./lingua.js";
import { apriImmagine, disegnaLaMaschera } from "./ritocco.js";
import { scegliMisura } from "./formato.js";
import { collega, modelliInVram, scaricaDallaVram } from "./ponte.js";

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("galleria", () => void aggiornaGalleria());

collegaLente();
collegaCrea();
collegaBonsaiFoto();
collegaRitocco();
collegaTraduzione();
// Per ultimo fra questi: la scelta del modello sposta i cursori sul suo punto
// di lavoro e decide se serve la traduzione, quindi vuole trovare già collegate
// le etichette dei cursori e la casella della lingua.
// Adesso è asincrona: prima di disegnare il menu chiede alla suite se questo
// computer ha una scheda video, perché FLUX.2 Klein senza non si può offrire.
// Non si aspetta — il resto della pagina non dipende dalla risposta.
void collegaScelta();
collegaGalleria();
collegaComandiCoda();
collegaModelliInMemoria(el.mods, {
  elenco: modelliInVram,
  scarica: scaricaDallaVram,
});

// Un'immagine trascinata dentro finisce nel ritocco, da qualunque scheda: è
// l'unica cosa che in Foto si può fare con un'immagine che arriva da fuori.
collegaTrascinamento(async (file) => {
  const indirizzo = URL.createObjectURL(file);
  try {
    await apriImmagine(indirizzo);
  } catch (e) {
    mostraErrore(`Non sono riuscito ad aprire "${file.name}": ${e.message || e}`);
  } finally {
    URL.revokeObjectURL(indirizzo);
  }
}, eImmagine);

// Un errore del motore arriva dalla coda, che non sa in quale scheda sei.
ascolta("errore", (testo) => mostraErrore(testo));

await aggiornaGalleria();

await collega(
  (connesso) => {
    el.dot.classList.toggle("on", connesso);
    el.statusTxt.textContent = connesso ? "pronto" : "motore offline";
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
  /**
   * ⚠ **Modificare una foto e' un'altra scheda.** Dalla 1.0.2.
   *
   * Chiesto il 6 settembre 2026: «l'utente clicca su produzione foto e puo'
   * scegliere tra generazione da testo e modifica da foto, carica la foto e la
   * modifica».
   *
   * Vale la stessa regola di tutto il resto di questa funzione — **si preme lo
   * stesso tasto che premeresti tu** — solo che il tasto sta nella scheda
   * Ritocco. La foto arriva come indirizzo «daprod://file/…», che lo shell ha
   * fatto dall'id caricato dal telefono (vedi `daIdAIndirizzi` in
   * esecuzione.ts): da qui in giu' e' un'immagine come quelle che si aprono
   * trascinandole dentro.
   *
   * La maschera puo' non esserci, ed e' il caso normale: senza, il ritocco
   * lavora su tutta la foto. Vedi «Niente dipinto non e' piu' un errore» in
   * ritocco.js.
   */
  if (richiesta.azione === "modifica.immagine") {
    mostraScheda("ritocco");
    await apriImmagine(richiesta.opzioni.immagine);
    await disegnaLaMaschera(richiesta.opzioni.maschera);
    scrivi(el.promptRitocco, richiesta.testo);
    /*
     * «Quanto la cambio» va da 1 a 10 perche' un numero da 0 a 1 con la
     * virgola, su un telefono, non lo capisce nessuno. Il motore vuole l'altro.
     */
    if (richiesta.opzioni.forza) {
      scrivi(el.denoise, String(numero(richiesta.opzioni.forza, 1, 10, 6) / 10));
    }
    if (scegliInMenu(el.modello, richiesta.opzioni.modello)) await aspettaPremibile(el.rigenera);
    premi(
      el.rigenera,
      "Il modello di DaProdFoto non e' pronto: apri la scheda sul computer e guarda cosa manca.",
    );
    return;
  }

  mostraScheda("crea");
  scrivi(el.prompt, richiesta.testo);
  /**
   * ⚠ **La misura arriva da chi chiede.** Dalla 1.0.5.
   *
   * Chiesto il 6 settembre 2026: «nella produzione immagini non si puo'
   * scegliere la risoluzione». Prima partiva quella rimasta selezionata qui
   * sulla scheda: una scelta di un'altra persona, di un altro momento.
   *
   * Non e' `scrivi` come gli altri campi perche' non e' una casella: sono due
   * file di pulsanti, e chi le comanda e' `formato.js`. Se non arriva niente
   * resta quello che c'e', che e' il comportamento di prima.
   */
  scegliMisura(richiesta.opzioni.forma, richiesta.opzioni.risoluzione);
  if (richiesta.opzioni.negativo) scrivi(el.negativo, richiesta.opzioni.negativo);
  scrivi(el.quante, String(numero(richiesta.opzioni.quante, 1, 4, 1)));
  // Il modello si può scegliere da fuori dalla 0.7.2. Cambiarlo fa ripartire il
  // controllo dei pesi sul disco, che tiene Genera spento finché non risponde:
  // per questo si aspetta invece di premere subito.
  if (scegliInMenu(el.modello, richiesta.opzioni.modello)) await aspettaPremibile(el.genera);
  premi(
    el.genera,
    "Il modello di DaProdFoto non è pronto: apri la scheda sul computer e guarda cosa manca.",
  );
});
