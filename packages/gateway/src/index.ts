/**
 * @daprod/gateway — accesso remoto alla suite.
 *
 * Espone il gateway HTTP che i telefoni usano per accoppiarsi, chiedere
 * lavori e scaricare i risultati, insieme all'archivio e alle regole.
 */

export { Archivio, cartellaRisultati } from "./archivio";
export { elencoAzioni, eseguiAzione, type Esecutore, type EsitoAzione } from "./azioni";
export { paginaConsole } from "./console";
export { Remoto, SCADENZA_INVITO_MS } from "./remoto";
export { Gateway, type GatewayOpzioni, type StatoProvider } from "./server";
export type {
  Attivita,
  Dispositivo,
  DispositivoPubblico,
  FornitoreLibreria,
  FornitorePannello,
  IndirizzoPubblico,
  Invito,
  InvitoQr,
  InvitoVivo,
  Notifica,
  Richiesta,
  Risultato,
  Ruolo,
  StatoPannello,
  StatoRichiesta,
  StatoSuite,
  VoceLibreria,
} from "./types";