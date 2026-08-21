/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta. La scheda si costruisce **prima** di parlare col motore, come
 * in DaProdFoto: scegliere il modello, guardare quanto pesa e far partire lo
 * scaricamento sono cose che funzionano anche a motore spento, e sono le prime
 * che uno fa la prima volta che apre questa scheda.
 */

import { el } from "./dom.js";
import { collegaCrea } from "./crea.js";
import { caricaUltimi, messaggioDalMotore, riallinea, scordaDisegno } from "./coda.js";
// I quadratini di cosa occupa la memoria: uguali in tutte le app, quindi stanno
// in `packages/ui` e la suite li serve sotto `/comune/`.
import { collegaModelliInMemoria } from "/comune/modelli-in-memoria.js";
import { collega, modelliInVram, scaricaDallaVram, suLibreriaCambiata } from "./ponte.js";

await collegaCrea();

// I video di ieri, sotto la sessione: riaprire la scheda e vedere il vuoto dava
// l'impressione che quello che si era fatto fosse andato perso.
void caricaUltimi();
suLibreriaCambiata(() => void caricaUltimi());

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
    if (connesso) {
      scordaDisegno();
      void riallinea();
    }
  },
  messaggioDalMotore,
);
