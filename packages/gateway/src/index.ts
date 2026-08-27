/**
 * @daprod/gateway — accesso remoto alla suite.
 *
 * Espone il gateway HTTP che i telefoni usano per accoppiarsi, chiedere
 * lavori e scaricare i risultati, insieme all'archivio e alle regole.
 */

export { Archivio, cartellaInvii, cartellaRisultati } from "./archivio";
export { elencoAzioni, eseguiAzione, type Esecutore, type EsitoAzione } from "./azioni";
export { paginaConsole } from "./console";
export { Remoto, SCADENZA_INVITO_MS } from "./remoto";
export { Gateway, indirizzoDellaFoto, type GatewayOpzioni, type StatoProvider } from "./server";
export type {
  Attivita,
  AttesaChiacchierata,
  BattutaChiacchierata,
  Chiacchierata,
  Dispositivo,
  DispositivoPubblico,
  FornitoreAi,
  FornitoreChiacchierata,
  FornitoreLibreria,
  FornitoreMacchina,
  FornitorePannello,
  FornitorePreset,
  FornitoreStili,
  IndirizzoPubblico,
  Invio,
  Invito,
  InvitoQr,
  InvitoVivo,
  LavoroDelPiano,
  Notifica,
  PianoLavori,
  Preset,
  RegolaFila,
  Richiesta,
  Risultato,
  Ruolo,
  StatoMacchina,
  StatoPannello,
  StatoRichiesta,
  StatoSuite,
  StileRemoto,
  VoceCommento,
  VoceLibreria,
} from "./types";