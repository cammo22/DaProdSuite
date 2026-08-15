/**
 * Gli annunci fra un pezzo dell'interfaccia e l'altro.
 *
 * Serve a una cosa sola: rompere i giri. La coda dei lavori deve dire alla
 * galleria che è nata un'immagine, e la galleria deve poter mandare una foto al
 * ritocco — se si importassero a vicenda, uno dei moduli si troverebbe l'altro
 * ancora vuoto al momento di partire.
 *
 * Chi annuncia non sa chi ascolta, e chi ascolta non importa chi annuncia.
 */

const centralino = new EventTarget();

export function annuncia(nome, dettaglio) {
  centralino.dispatchEvent(new CustomEvent(nome, { detail: dettaglio }));
}

export function ascolta(nome, azione) {
  centralino.addEventListener(nome, (ev) => azione(ev.detail));
}
