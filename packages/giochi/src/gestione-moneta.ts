/**
 * La moneta DaProd vista da chi comanda (1.7.8): quante ce ne sono, chi le ha,
 * da dove vengono, e i gesti per coniarle, bruciarle e cambiare le regole.
 *
 * Stesse regole di `gestione.ts`: **ogni gesto resta nel registro** della Banca
 * con chi l'ha fatto e perche', e il perche' si scrive sempre — una moneta che
 * compare o sparisce senza una parola si legge come un guasto.
 *
 * ⚠ **Coniare non e' un regalo di lire**: una moneta e' un trofeo, e chi comanda
 * ne conia poche e per un motivo (un premio, una correzione). Non conta nel
 * trofeo di chi la riceve (`moneteTot` resta quello che ha guadagnato giocando).
 */

import { NienteDaFare } from "./banco";
import type { Deposito } from "./deposito";
import { REGOLE_MONETA, restaInSettimana, serieMoneta, type RegoleMoneta } from "./moneta";
import type { Conto } from "./tipi";

/** Il massimo che si conia o si brucia con un gesto solo: una rete contro il dito rimasto premuto. */
export const MONETE_GESTO_MAX = 1000;

export interface TitolareMoneta {
  chi: string;
  monete: number;
  /** Quante ne ha guadagnate giocando, da sempre. */
  guadagnate: number;
  /** Quante ne ha guadagnate nella settimana di adesso, e il tetto. */
  settimana: number;
}

export interface MonetaInBanca {
  /** Quante ce ne sono in giro (la somma dei portafogli). */
  circolanti: number;
  /** Nate e bruciate da sempre: la differenza e' quello che c'e' in giro (meno le correzioni). */
  coniate: number;
  bruciate: number;
  /** La quotazione di adesso, in lire per moneta. */
  quota: number;
  /** Da dove sono arrivate, per motivo. */
  origini: Record<string, number>;
  titolari: TitolareMoneta[];
  regole: RegoleMoneta;
  regolePartenza: RegoleMoneta;
}

function contoEsistente(deposito: Deposito, chi: string): Conto {
  const c = deposito.conti().find((x) => x.chi === chi);
  if (!c) throw new NienteDaFare("Questa persona non ha un conto.");
  return c;
}

function perche(detto: unknown): string {
  const s = String(detto ?? "").trim().slice(0, 120);
  if (!s) throw new NienteDaFare("Scrivi il perche': una moneta che compare o sparisce senza una parola sembra un guasto.");
  return s;
}

/**
 * La moneta di una persona, per la sua pagina: quante ne ha, la quotazione e
 * la sua linea (24 ore, 7 giorni, un mese), il libro, e **come se ne
 * guadagnano** — le regole di adesso, dette in numeri.
 */
export function monetaDi(deposito: Deposito, chi: string, adesso: number = Date.now()) {
  deposito.segnaQuotaMoneta(adesso);
  const conto = deposito.conto(chi);
  const s = deposito.statoMoneta();
  const r = deposito.regoleMoneta();
  const ora = deposito.quotaMoneta(adesso);
  // La linea arriva fino ad adesso: un punto all'ora non basta a disegnare niente
  // nella prima ora di vita, e una linea che non parte sembra un guasto.
  const finoAdesso = (p: { t: number; v: number }[]) => (p.length && p[p.length - 1]!.t < adesso ? [...p, { t: adesso, v: ora }] : p);
  const serie24 = finoAdesso(serieMoneta(s, "24h", adesso));
  const prima = serie24.length ? serie24[0]!.v : ora;
  return {
    monete: Math.max(0, Math.floor(conto.monete ?? 0)),
    guadagnate: conto.moneteTot ?? 0,
    quota: ora,
    /** Quanto e' cambiata la quotazione in 24 ore, in percentuale. */
    variazione24h: prima > 0 ? ((ora - prima) / prima) * 100 : 0,
    circolanti: deposito.moneteInGiro(),
    coniate: s.coniate,
    bruciate: s.bruciate,
    serie: {
      "24h": serie24,
      "7g": finoAdesso(serieMoneta(s, "7g", adesso)),
      "1m": finoAdesso(serieMoneta(s, "1m", adesso)),
    },
    libro: (conto.libroMonete ?? []).slice(0, 40),
    ultima: conto.ultimaMoneta ?? null,
    settimana: {
      resta: restaInSettimana(conto.moneteSettimana, adesso, r),
      tetto: r.tettoSettimana,
    },
    /** Come se ne guadagnano: le regole di adesso, per scriverle in chiaro. */
    come: {
      moneteFine: r.moneteFine,
      sogliaEuro: r.sogliaEuro,
      euroPerMoneta: r.euroPerMoneta,
      moneteIncassoMax: r.moneteIncassoMax,
      moneteEthernal: r.moneteEthernal,
      livelloOgni: r.livelloOgni,
      moneteLivello: r.moneteLivello,
      moneteSettimana: r.moneteSettimana,
      moneteMese: r.moneteMese,
      tettoSettimana: r.tettoSettimana,
    },
  };
}

/** Il quadro della moneta per chi comanda. */
export function monetaInBanca(deposito: Deposito, adesso: number = Date.now()): MonetaInBanca {
  deposito.segnaQuotaMoneta(adesso);
  const s = deposito.statoMoneta();
  const r = deposito.regoleMoneta();
  return {
    circolanti: deposito.moneteInGiro(),
    coniate: s.coniate,
    bruciate: s.bruciate,
    quota: deposito.quotaMoneta(adesso),
    origini: { ...s.origini },
    titolari: deposito
      .conti()
      .filter((c) => (c.monete ?? 0) > 0 || (c.moneteTot ?? 0) > 0)
      .map((c) => ({
        chi: c.chi,
        monete: Math.max(0, Math.floor(c.monete ?? 0)),
        guadagnate: c.moneteTot ?? 0,
        settimana: c.moneteSettimana ? c.moneteSettimana.n : 0,
      }))
      .sort((a, b) => b.monete - a.monete),
    regole: r,
    regolePartenza: { ...REGOLE_MONETA },
  };
}

/** Chi comanda conia monete a qualcuno. */
export function coniaMonete(deposito: Deposito, admin: string, chi: string, quante: number, detto: unknown) {
  const c = contoEsistente(deposito, chi);
  const n = Math.floor(Number(quante));
  if (!Number.isFinite(n) || n < 1 || n > MONETE_GESTO_MAX) throw new NienteDaFare("Quante? Da 1 a " + MONETE_GESTO_MAX + ".");
  const motivo = perche(detto);
  const mosse = deposito.muoviMonete(chi, n, "Banca DaProd: " + motivo, "banca-admin", false);
  deposito.segnaNelRegistro({ quando: Date.now(), da: admin, chi, cosa: "monete coniate +" + mosse + " · " + motivo });
  return { monete: c.monete ?? 0, mosse };
}

/** Chi comanda brucia monete a qualcuno (se ne tolgono quante ce n'e'). */
export function bruciaMonete(deposito: Deposito, admin: string, chi: string, quante: number, detto: unknown) {
  const c = contoEsistente(deposito, chi);
  const n = Math.floor(Number(quante));
  if (!Number.isFinite(n) || n < 1 || n > MONETE_GESTO_MAX) throw new NienteDaFare("Quante? Da 1 a " + MONETE_GESTO_MAX + ".");
  const motivo = perche(detto);
  const mosse = deposito.muoviMonete(chi, -n, "Banca DaProd: " + motivo, "banca-admin", false);
  deposito.segnaNelRegistro({ quando: Date.now(), da: admin, chi, cosa: "monete bruciate · " + motivo + " (" + Math.abs(mosse) + ")" });
  return { monete: c.monete ?? 0, mosse };
}

/** Le regole della moneta, cambiate da chi comanda: ogni numero cambiato va nel registro. */
export function cambiaRegoleMoneta(deposito: Deposito, admin: string, cambi: Partial<RegoleMoneta>) {
  const prima = deposito.regoleMoneta();
  const dopo = deposito.cambiaRegoleMoneta(cambi);
  const diversi = (Object.keys(dopo) as (keyof RegoleMoneta)[]).filter((k) => dopo[k] !== prima[k]);
  if (diversi.length) {
    deposito.segnaNelRegistro({
      quando: Date.now(),
      da: admin,
      cosa: "regole della moneta: " + diversi.map((k) => k + " " + prima[k] + " → " + dopo[k]).join(", "),
    });
  }
  return dopo;
}
