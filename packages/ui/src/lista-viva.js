/**
 * Una lista che si aggiorna senza rifarsi da capo.
 *
 * Serve a tutti i pannelli "Sessione" della suite — Cinema, Musica, Foto — che
 * si ridisegnano una volta al secondo per far scorrere i tempi e le barre di
 * avanzamento. Finché il disegno passava da un `innerHTML` su tutto il
 * pannello, quel secondo buttava via e rifaceva **anche** i risultati già
 * finiti: un video che stava suonando spariva e tornava da zero — dare "play"
 * mentre qualcosa genera era impossibile — e le copertine ricaricavano di
 * continuo.
 *
 * Qui ogni voce ha una **chiave** (l'id del lavoro, l'id del brano) e un nodo
 * suo. A ogni giro si confronta chiave per chiave:
 *
 * - la voce c'è già ed è identica → il nodo non si tocca, e il video continua;
 * - la voce c'è e sa aggiornarsi da sé → si chiama `aggiorna(nodo)`, che cambia
 *   il testo e la larghezza della barra lasciando in piedi il resto (così anche
 *   l'animazione della miniatura non riparte a ogni secondo);
 * - la voce è nuova o cambiata davvero → solo quel nodo si rifà;
 * - la voce non c'è più → via quel nodo, e basta.
 *
 * Spostare un nodo con `insertBefore` non lo distrugge: un video che cambia
 * posizione perché ne è arrivato uno più recente continua a suonare.
 */

/**
 * Ridisegna i figli di `radice` a partire dalle voci.
 *
 * Ogni voce è `{ chiave, html, aggiorna }`:
 * - `chiave`: identifica la voce fra un giro e l'altro;
 * - `html`: il riquadro, usato quando il nodo va creato;
 * - `aggiorna` (facoltativo): `(nodo) => void`, per cambiare in casa quello che
 *   cambia spesso invece di rifare il nodo.
 *
 * Torna `true` se qualcosa è stato creato o tolto: è il momento in cui chi
 * chiama deve riattaccare i suoi `onclick`.
 */
export function disegnaLista(radice, voci) {
  const vecchi = new Map();
  let cambiata = false;
  for (const nodo of Array.from(radice.children)) {
    const chiave = nodo.dataset.chiave;
    if (chiave !== undefined && !vecchi.has(chiave)) {
      vecchi.set(chiave, nodo);
    } else {
      // Roba disegnata prima che questa lista fosse viva, o un doppione.
      nodo.remove();
      cambiata = true;
    }
  }

  let precedente = null;

  for (const voce of voci) {
    const chiave = String(voce.chiave);
    let nodo = vecchi.get(chiave);

    if (nodo) {
      vecchi.delete(chiave);
      if (voce.aggiorna) {
        voce.aggiorna(nodo);
      } else if (nodo._htmlDisegnato !== voce.html) {
        const rifatto = creaNodo(chiave, voce.html);
        radice.replaceChild(rifatto, nodo);
        nodo = rifatto;
        cambiata = true;
      }
    } else {
      nodo = creaNodo(chiave, voce.html);
      cambiata = true;
    }

    // Al posto giusto, e solo se non ci è già: rimettere a posto un nodo che
    // sta già dove deve stare è lavoro sprecato.
    const atteso = precedente ? precedente.nextSibling : radice.firstChild;
    if (nodo !== atteso) radice.insertBefore(nodo, atteso);
    precedente = nodo;
  }

  for (const rimasto of vecchi.values()) {
    rimasto.remove();
    cambiata = true;
  }

  return cambiata;
}

function creaNodo(chiave, html) {
  const involucro = document.createElement("div");
  involucro.innerHTML = html;
  const nodo = involucro.firstElementChild ?? document.createElement("div");
  nodo.dataset.chiave = chiave;
  // Il confronto del prossimo giro: tenerlo sul nodo e non in un attributo
  // evita di riversare tutto il riquadro dentro il DOM.
  nodo._htmlDisegnato = html;
  return nodo;
}
