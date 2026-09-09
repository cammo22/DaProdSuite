/**
 * @daprod/giochi — la sala giochi della suite.
 *
 * Un pacchetto solo, e dentro ci sta tutto: le regole, i dati, il deposito, il
 * banco, le rotte e la pagina. Fuori di qui, il giorno che si unisce alla
 * suite, restano poche righe in tre file — vedi `CONCETTI.md` § 14.
 *
 * Chi lo usa:
 *
 * - lo **shell**, che possiede il disco: costruisce il `Deposito` sulla
 *   cartella dati e passa il banco al gateway;
 * - il **gateway**, che serve `paginaGiochi()` e gira le chiamate a
 *   `rispondi()`;
 * - le **prove**, che qui dentro trovano funzioni pure e un dado in mano.
 *
 * Quello che **non** esce da qui e' il mazzo: i pezzi non si mandano alla
 * pagina. La pagina chiede «giro» e riceve **cosa e' uscito**, non da cosa si
 * sarebbe potuto pescare (CONCETTI.md § 3).
 */

export { Deposito } from "./deposito";
export { paginaGiochi } from "./pagina";
export { rispondi, type Chi, type Contorno, type Risposta } from "./rotte";
export {
  apriPacchetto,
  butta,
  classifica,
  manda,
  mandaDallaLibreria,
  mazzo,
  NienteDaFare,
  pezzoPerId,
  prendi,
  serie,
  serieChiuse,
  statoMagazzino,
  tira,
  type AperturaPacchetto,
  type Figurina,
  type RigaClassifica,
} from "./banco";
export {
  altezza,
  CAMBIO_EURO,
  EPOCHE,
  euro,
  fra,
  GRADI,
  gradoDiPrezzo,
  impronta,
  IMPOSTAZIONI_DI_PARTENZA,
  inGioco,
  lire,
  meglioDi,
  montaPrompt,
  pescaPesata,
  pescaPezzo,
  pesoEra,
  prezzoDiPartenza,
  scalino,
  valore,
  valuta,
  type Caso,
} from "./regole";
export {
  chiocciola,
  PEZZI_IMMAGINI,
  PEZZI_MUSICA_CORTI,
  RULLI,
  RULLI_IMMAGINI,
  RULLI_MUSICA,
  rulliDi,
} from "./rulli";
export { GENERI, type Genere } from "./dati/generi";
export { GRADI_ID } from "./tipi";
export type {
  Collezionabile,
  Conto,
  DallaLibreria,
  DatiGiochi,
  Epoca,
  Era,
  Formazione,
  Giro,
  Grado,
  Impostazioni,
  Pezzo,
  PezzoInGioco,
  Rullo,
  Scalino,
  StatoCollezionabile,
  Tavolo,
  TipoCollezionabile,
  Vincita,
} from "./tipi";
