/**
 * Quello che più moduli devono poter guardare.
 *
 * Un oggetto solo, riempito dalla libreria e letto da chi disegna: la sessione
 * mostra i brani recenti, il lettore ci prende la coda d'ascolto, il dettaglio
 * sa qual è quello scelto. Tenerlo qui invece che passarlo di modulo in modulo
 * evita che due elenchi mostrino due verità diverse.
 */

export const stato = {
  /** I brani in libreria, dal più recente. */
  brani: [],
  /** L'id del brano aperto nel dettaglio, se ce n'è uno. */
  selezionato: null,
  /** Le immagini della scheda Immagini. */
  immagini: [],
};
