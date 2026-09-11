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
export {
  rispondi,
  type Chi,
  type Contorno,
  type Risposta,
  type VoceLibreria,
} from "./rotte";
export {
  apriPacchetto,
  azzeraPortafoglio,
  butta,
  classifica,
  compra,
  creaPacchetto,
  fuoriDaiPacchetti,
  gradoDiFigurina,
  manda,
  mandaDallaLibreria,
  MAX_ALLEGATI,
  MAX_PROVE,
  mazzo,
  NienteDaFare,
  pezzoPerId,
  mettiInVetrina,
  PACCHETTI_DI_PAVIMENTO,
  pacchettoDi,
  prendi,
  prezzoConsigliato,
  prezzoDaPacchetto,
  prezzoNelloShop,
  regala,
  TAGLI,
  TAGLI_BONUS,
  serie,
  serieChiuse,
  valoreDiBase,
  statoMagazzino,
  tira,
  togliDallaVetrina,
  vetrina,
  VOLTE_LA_VETRINA,
  type Acquisto,
  type AperturaPacchetto,
  type EsitoInvio,
  type Figurina,
  type RigaClassifica,
} from "./banco";
/**
 * La macchinetta: la seconda slot, quella fatta con le immagini dei pacchetti.
 * Vedi `macchinetta.ts`, e CONCETTI.md § 11-bis.
 */
export {
  CASELLE,
  facciaDi,
  FILE,
  gira as giraLaMacchinetta,
  mazzoMacchinetta,
  MINIMO_PER_ACCENDERSI,
  PER_FILA,
  perche as percheSpenta,
  PUNTATE,
  quantoPagaIlPieno,
  quantoPagaUnaFila,
  QUANTO_ESCE,
  type EsitoMacchinetta,
  type FilaVinta,
  type SimboloMacchinetta,
} from "./macchinetta";
/**
 * L'inventario: quello che c'e' da avere, con i buchi. Vedi `inventario.ts`, e
 * CONCETTI.md § 13-bis.
 */
export {
  inventario,
  type CasellaInventario,
  type Inventario,
  type Obiettivo,
  type PacchettoInventario,
} from "./inventario";
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
  livelloDi,
  valoreDaPrendere,
  valoreDeiPezzi,
  versoIlProssimo,
  lire,
  meglioDi,
  montaPrompt,
  pescaPesata,
  pescaPezzo,
  pesoEra,
  prezzoDiPartenza,
  scalino,
  sottoIlTetto,
  tettoDelValore,
  TETTO_EURO,
  TETTO_FIGURINE,
  TETTO_LIRE,
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
  Pacchetto,
  Pezzo,
  PezzoInGioco,
  Rullo,
  Scalino,
  StatoCollezionabile,
  Tavolo,
  TipoCollezionabile,
  Vincita,
} from "./tipi";
