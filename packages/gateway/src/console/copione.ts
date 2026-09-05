/**
 * Il copione della console, messo insieme.
 *
 * **Sei pezzi, un IIFE solo.** I file sono divisi per mestiere ma il codice
 * gira in un ambito solo: le funzioni si chiamano fra loro senza import e senza
 * oggetti globali, come in un file unico — che è quello che era fino alla
 * 0.7.5, quando stava per superare le tremila righe.
 *
 * L'ordine conta poco (in JavaScript le dichiarazioni di funzione salgono in
 * cima), tranne per l'ultimo: `COPIONE_AVVIO` **deve** venire per ultimo,
 * perché non dichiara e basta — aggancia i tasti e, se il token c'è già, entra.
 * Agganciare un tasto a una funzione che non è ancora stata dichiarata
 * funzionerebbe lo stesso; entrare prima che le altre siano definite no.
 */

import { COPIONE_BASE } from "./copione-base";
import { COPIONE_PRODUZIONE } from "./copione-produzione";
import { COPIONE_LAVORI } from "./copione-lavori";
import { COPIONE_GALLERIA } from "./copione-galleria";
import { COPIONE_STILI } from "./copione-stili";
import { COPIONE_DAPROD } from "./copione-daprod";
import { COPIONE_RETE } from "./copione-rete";
import { COPIONE_IMPOSTAZIONI } from "./copione-impostazioni";
import { COPIONE_AVVIO } from "./copione-avvio";

export const COPIONE = [
  COPIONE_BASE,
  COPIONE_PRODUZIONE,
  COPIONE_LAVORI,
  COPIONE_GALLERIA,
  COPIONE_STILI,
  COPIONE_DAPROD,
  COPIONE_IMPOSTAZIONI,
  COPIONE_RETE,
  COPIONE_AVVIO,
].join("\n");
