/**
 * Le poche cose che due schede devono vedere insieme.
 *
 * Un oggetto e non un modulo di funzioni, come in DaProdFoto: qui dentro sta
 * roba letta da una parte e usata da un'altra — l'elenco di quello che si è
 * fatto dire lo aggiorna la Galleria, e la Sessione ci pesca l'indirizzo con cui
 * far sentire un file appena uscito.
 *
 * Sta in un modulo suo per non far dipendere la scheda «Parla» dalla
 * «Galleria» e viceversa: due moduli che si importano a vicenda funzionano
 * finché non si sposta un import, e poi smettono in un modo che non si capisce.
 */

export const stato = {
  /** Quello che ha detto DaProdVoce, come lo conosce la libreria della suite. */
  detti: [],
  /** Le voci di riferimento salvate, come le conosce il motore. */
  voci: [],
  /** Tutti gli audio della libreria della suite: da lì escono gli indirizzi. */
  audio: [],
};
