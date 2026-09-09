/**
 * @daprod/giochi — la sala giochi della suite.
 *
 * Un pacchetto solo, e dentro ci sta tutto: le regole, i dati, il deposito, il
 * banco. Fuori di qui, il giorno che si unisce alla suite, restano poche righe
 * in tre file — vedi `CONCETTI.md` § 12.
 *
 * Chi lo usa:
 *
 * - lo **shell**, che possiede il disco: costruisce il `Deposito` sulla
 *   cartella dati e passa il banco al gateway;
 * - il **gateway**, che serve la pagina e risponde alle chiamate;
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
  CAMBIO_EURO,
  euro,
  fra,
  GRADI,
  grado,
  impronta,
  IMPOSTAZIONI_DI_PARTENZA,
  inGioco,
  lire,
  montaPrompt,
  pescaPesata,
  pescaPezzo,
  prezzoDiPartenza,
  QUANTO_ESCE,
  raritaDiPrezzo,
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
export type {
  Combinazione,
  Conto,
  DatiGiochi,
  Formazione,
  Giro,
  GradoRarita,
  Impostazioni,
  Pezzo,
  PezzoInGioco,
  Rarita,
  Rullo,
  StatoCombinazione,
  Tavolo,
  Vincita,
} from "./tipi";
