/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * La scaletta si scrive **prima** di parlare col motore, come la galleria di
 * DaProdFoto: leggere una canzone e vedere come verrebbe divisa è la cosa che
 * qui funziona anche a motore spento, ed è anche quella che si guarda di più.
 */

import { el } from "./dom.js";
import { collegaCrea } from "./crea.js";
import { messaggioDalMotore } from "./coda.js";
// I quadratini di cosa occupa la memoria: uguali in tutte le app, quindi
// stanno in `packages/ui` e la suite li serve sotto `/comune/`.
import { collegaModelliInMemoria } from "/comune/modelli-in-memoria.js";
import { collega, modelliInVram, scaricaDallaVram } from "./ponte.js";

await collegaCrea();

collegaModelliInMemoria(el.mods, {
  elenco: modelliInVram,
  scarica: scaricaDallaVram,
});

await collega(
  (connesso) => {
    el.dot.classList.toggle("on", connesso);
    el.statusTxt.textContent = connesso ? "pronto" : "motore offline";
  },
  messaggioDalMotore,
);
