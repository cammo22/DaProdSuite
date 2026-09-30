/**
 * Le prove della moneta DaProd (1.7.8, `moneta.ts`).
 *
 * ⚠ Nuove nella 1.7.8 (Fase 1 del Big Update). Il tempo e il caso si passano da
 * fuori, come nelle altre: una moneta che dipende dalla settimana si prova
 * fissando la settimana.
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-moneta.mjs
 */

import {
  bruciaMonete,
  cambiaRegoleMoneta,
  coniaMonete,
  Deposito,
  euroDaLire,
  incassaGioco,
  lireDaEuro,
  monetaDi,
  monetaInBanca,
  monetaInRiga,
  moneteDeiLivelli,
  monetePerIncasso,
  monetePerLire,
  MONETE_GESTO_MAX,
  quotaMoneta,
  regoleMoneta,
  REGOLE_MONETA,
  restaInSettimana,
  ricarica,
  riscuotiLivelli,
  rispondi,
  segnaOra,
  serieMoneta,
  monetaNuova,
  decidiControllo,
} from "../dist/index.js";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

const ORA = 3_600_000;
const GIORNO = 24 * ORA;
// Un martedi' di settembre: un'ora fissa e basta.
const ADESSO = Date.UTC(2026, 8, 22, 10, 0, 0);

function lancia(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
}

/* ------------------------------------------------------------- le regole */

prova("le regole di partenza sono quelle scritte, e un file storto non le rompe", () => {
  uguale(regoleMoneta(), REGOLE_MONETA);
  const r = regoleMoneta({ moneteFine: 3, tettoSettimana: "50", prezzoBase: 0, euroPerMoneta: -4, moneteMese: "niente" });
  uguale(r.moneteFine, 3);
  uguale(r.tettoSettimana, 50, "una stringa che e' un numero passa");
  uguale(r.prezzoBase, 1, "il prezzo non puo' essere zero: si dividerebbe per niente");
  uguale(r.euroPerMoneta, REGOLE_MONETA.euroPerMoneta, "un numero negativo non vale");
  uguale(r.moneteMese, REGOLE_MONETA.moneteMese, "una parola non e' un numero");
  uguale(regoleMoneta(null), REGOLE_MONETA);
});

/* ------------------------------------------------------ quanto si guadagna */

prova("un incasso da' monete solo se e' grosso, o se la partita e' finita", () => {
  uguale(monetePerIncasso(0, false), 0, "niente guadagno");
  uguale(monetePerIncasso(19.99, false), 0, "sotto la soglia");
  uguale(monetePerIncasso(20, false), 1, "sulla soglia: una");
  uguale(monetePerIncasso(44, false), 1, "una in piu' ogni 25 euro sopra la soglia");
  uguale(monetePerIncasso(45, false), 2);
  uguale(monetePerIncasso(1e9, false), 10, "il tetto di un solo incasso");
  uguale(monetePerIncasso(0, true), 1, "finire vale anche senza guadagno");
  uguale(monetePerIncasso(45, true), 3, "finire e guadagnare si sommano");
});

prova("un livello ogni cinque da' monete, e solo quelli presi", () => {
  uguale(moneteDeiLivelli(1, 4), 0);
  uguale(moneteDeiLivelli(1, 5), 1);
  uguale(moneteDeiLivelli(4, 11), 2, "il 5 e il 10");
  uguale(moneteDeiLivelli(5, 5), 0, "non c'e' niente da prendere");
  uguale(moneteDeiLivelli(1, 30), 6);
});

/* ---------------------------------------------------------- la quotazione */

prova("la quotazione sta fra la base e il triplo, e si muove nel verso giusto", () => {
  const vuota = quotaMoneta(0, 0);
  const tanteMonete = quotaMoneta(1_000_000, 0);
  const piena = quotaMoneta(0, 100);
  vero(vuota > tanteMonete, "tante monete in giro la fanno scendere: " + vuota + " contro " + tanteMonete);
  vero(piena > vuota, "tanta gente la fa salire");
  vero(tanteMonete >= REGOLE_MONETA.prezzoBase, "mai sotto la base");
  vero(quotaMoneta(0, 1e9) <= REGOLE_MONETA.prezzoBase * 3, "mai sopra il triplo");
  uguale(quotaMoneta(0, 0), REGOLE_MONETA.prezzoBase * 2, "senza monete e senza gente: il doppio della base");
  vero(Number.isInteger(quotaMoneta(123, 4)), "e' un numero intero di lire");
});

prova("un prezzo in lire diventa un prezzo in monete, e non e' mai zero", () => {
  uguale(monetePerLire(0, 1000), 0, "gratis resta gratis");
  uguale(monetePerLire(1, 1000), 1, "anche una lira costa una moneta");
  uguale(monetePerLire(5000, 1000), 5);
  uguale(monetePerLire(5001, 1000), 6, "si arrotonda per eccesso");
});

/* ---------------------------------------------------------- il deposito */

prova("ogni moneta passa da un posto solo, e lascia il suo libro", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    uguale(d.monete("pino"), 0, "si nasce senza");
    uguale(d.muoviMonete("pino", 5, "un premio", "banca-admin", false, ADESSO), 5);
    uguale(d.monete("pino"), 5);
    const s = d.statoMoneta();
    uguale(s.coniate, 5);
    uguale(s.origini["banca-admin"], 5, "da dove e' arrivata");
    uguale(d.conto("pino").moneteTot ?? 0, 0, "coniata da chi comanda: non conta nel trofeo");
    uguale(d.muoviMonete("pino", -2, "una spesa", "spesa", false, ADESSO), -2);
    uguale(s.bruciate, 2);
    uguale(d.muoviMonete("pino", -99, "troppa", "spesa", false, ADESSO), -3, "si tolgono quante ce n'e'");
    uguale(d.monete("pino"), 0, "mai sotto zero");
    uguale(d.muoviMonete("pino", -1, "niente", "spesa", false, ADESSO), 0, "non si brucia il niente");
    uguale(d.conto("pino").libroMonete.length, 3, "il libro ha i tre movimenti veri");
    uguale(d.conto("pino").libroMonete[0].perche, "una spesa" === "x" ? "" : "troppa", "il piu' recente per primo");
  }),
);

prova("guadagnare giocando conta nel trofeo e nel tetto della settimana", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaRegoleMoneta({ tettoSettimana: 3 });
    uguale(d.guadagnaMonete("pino", 2, "una vincita", "incasso", ADESSO), 2);
    uguale(d.conto("pino").moneteTot, 2);
    uguale(d.guadagnaMonete("pino", 5, "un'altra", "incasso", ADESSO + ORA), 1, "ne entra una sola: il tetto e' tre");
    uguale(d.guadagnaMonete("pino", 1, "ancora", "incasso", ADESSO + 2 * ORA), 0, "tetto pieno: niente, ne' errori");
    uguale(d.monete("pino"), 3);
    uguale(restaInSettimana(d.conto("pino").moneteSettimana, ADESSO + 2 * ORA, d.regoleMoneta()), 0);
    uguale(d.guadagnaMonete("pino", 2, "la settimana dopo", "incasso", ADESSO + 8 * GIORNO), 2, "la settimana dopo si riparte");
    uguale(d.conto("pino").ultimaMoneta.quanto, 2, "l'ultima si ricorda, per dirla a chi la vince");
    uguale(d.monete("tizio"), 0, "il tetto e' di ognuno");
  }),
);

prova("il libro tiene cento movimenti e non uno di piu'", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    for (let i = 0; i < 130; i++) d.muoviMonete("pino", 1, "m" + i, "altro", false, ADESSO + i * 1000);
    uguale(d.conto("pino").libroMonete.length, 100);
    uguale(d.conto("pino").libroMonete[0].perche, "m129");
  }),
);

prova("la moneta sopravvive al riavvio, e un file di prima si apre senza", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muoviMonete("pino", 7, "premio", "banca-admin", false, ADESSO);
    d.scriviOra();
    const di_nuovo = new Deposito(file);
    uguale(di_nuovo.monete("pino"), 7);
    uguale(di_nuovo.statoMoneta().coniate, 7);
    uguale(di_nuovo.statoMoneta().ore.length, 1, "la quotazione dell'ora");
  }),
);

prova("uno stato letto da un file storto si rimette in riga", () => {
  uguale(monetaInRiga(null), monetaNuova());
  uguale(monetaInRiga("ciao"), monetaNuova());
  const s = monetaInRiga({ coniate: -4, bruciate: "x", origini: { a: 3, b: "no" }, ore: [{ t: 1, prezzo: 2, circolanti: 3 }, { t: "x" }, null] });
  uguale(s.coniate, 0);
  uguale(s.bruciate, 0);
  uguale(s.origini, { a: 3 });
  uguale(s.ore.length, 1, "le ore rotte si buttano");
});

/* ---------------------------------------------------------- il grafico */

prova("una quotazione all'ora, e i tre periodi la tagliano", () => {
  const s = monetaNuova();
  for (let h = 0; h < 24 * 40; h++) segnaOra(s, ADESSO - (24 * 40 - 1 - h) * ORA, 1000 + h, 10);
  uguale(s.ore.length, 24 * 30, "si tengono trenta giorni");
  segnaOra(s, ADESSO + 10 * 60_000, 5555, 11);
  uguale(s.ore[s.ore.length - 1].prezzo, 5555, "nella stessa ora l'ultimo vince");
  uguale(s.ore.length, 24 * 30);
  vero(serieMoneta(s, "24h", ADESSO).length <= 26, "24 ore sono circa 24 punti");
  vero(serieMoneta(s, "7g", ADESSO).length <= 7 * 24 + 2);
  vero(serieMoneta(s, "1m", ADESSO).length === 24 * 30, "il mese li ha tutti");
  vero(serieMoneta(s, "tutto", ADESSO).length === 24 * 30);
});

/* ----------------------------------------------------------- dai giochi */

prova("una partita finita a Claw da' una moneta, e lo dice", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 10_000;
    ricarica(d, "pino", "claw", 1936, ADESSO);
    const r = incassaGioco(d, "pino", "claw", 3000, { fine: true }, ADESSO + 20 * 60_000);
    uguale(r.monete, 1);
    uguale(d.monete("pino"), 1);
    uguale(d.conto("pino").libroMonete[0].perche, "partita finita a Claw Machine");
    uguale(d.statoMoneta().origini.fine, 1);
  }),
);

prova("un incasso grosso a Dozer da' una moneta; uno piccolo no", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 100_000;
    ricarica(d, "pino", "dozer", 1000, ADESSO);
    const piccolo = incassaGioco(d, "pino", "dozer", 4000, {}, ADESSO);
    uguale(piccolo.monete, 0, "pochi euro di guadagno non sono un jackpot");
    ricarica(d, "pino", "dozer", 1000, ADESSO);
    const grosso = incassaGioco(d, "pino", "dozer", 50_000, {}, ADESSO);
    uguale(grosso.monete, 1, "quasi ventitre euro di guadagno: una");
    uguale(d.monete("pino"), 1);
    uguale(d.statoMoneta().origini.incasso, 1);
  }),
);

prova("l'incasso che pareggia non da' monete, anche se e' grande", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 10_000_000;
    ricarica(d, "pino", "dozer", lireDaEuro(100), ADESSO);
    const r = incassaGioco(d, "pino", "dozer", lireDaEuro(100), {}, ADESSO);
    uguale(r.monete, 0, "messo cento euro e ripreso meno: niente guadagno, niente moneta");
  }),
);

prova("un incasso fermo in controllo da' le monete solo quando un admin lo paga", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 10_000;
    ricarica(d, "pino", "dozer", 1000, ADESSO);
    // Un incasso assurdo rispetto al messo (il Dozer conta uno a uno): resta fermo.
    const r = incassaGioco(d, "pino", "dozer", 100_000_000, {}, ADESSO + 60_000);
    vero(r.inControllo, "doveva finire in controllo");
    uguale(d.monete("pino"), 0, "fermo: niente monete");
    const id = d.conto("pino").inControllo[0].id;
    decidiControllo(d, "admin", "pino", id, "paga");
    vero(d.monete("pino") >= 1, "pagato: le monete arrivano");
  }),
);

prova("un livello di cinque da' una moneta, toccandolo", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = d.conto("pino");
    c.esperienza = 1e9; // un livello altissimo
    const r = riscuotiLivelli(d, "pino");
    vero(r.monete >= 1, "tanti traguardi: " + r.monete);
    uguale(d.monete("pino"), r.monete);
    // Riscuotere di nuovo non da' niente.
    const errore = lancia(() => riscuotiLivelli(d, "pino"));
    vero(errore && /Niente da prendere/.test(errore.message), "il secondo giro non paga ancora");
    uguale(d.monete("pino"), r.monete);
  }),
);

prova("il jackpot del mese e il primo della settimana danno monete", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const b = d.statoBanca();
    b.cassetti.mese.chiave = "2000-01";
    b.cassetti.mese.lire = 1000;
    b.cassetti.mese.attivita = { pino: 10 };
    b.cassetti.settimana.chiave = "2000-W01";
    b.cassetti.settimana.lire = 1000;
    b.cassetti.settimana.attivita = { pino: 10, gigi: 5 };
    d.apriLaBanca(ADESSO, dado(0));
    // 5 del mese + 1 della settimana (al primo, che e' pino).
    uguale(d.monete("pino"), 6, "cinque per il mese, una per la settimana");
    uguale(d.monete("gigi"), 0, "il secondo della settimana non ne ha");
  }),
);

/* ------------------------------------------------------- chi comanda */

prova("chi comanda conia e brucia, ma deve dire perche'", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino");
    let e = lancia(() => coniaMonete(d, "admin", "pino", 3, ""));
    vero(e && /perche/.test(e.message), "senza motivo no");
    e = lancia(() => coniaMonete(d, "admin", "sconosciuto", 3, "x"));
    vero(e && /non ha un conto/.test(e.message), "a chi non c'e' no");
    e = lancia(() => coniaMonete(d, "admin", "pino", MONETE_GESTO_MAX + 1, "x"));
    vero(e, "troppe in un colpo no");
    e = lancia(() => coniaMonete(d, "admin", "pino", 0, "x"));
    vero(e, "zero no");
    const r = coniaMonete(d, "admin", "pino", 4, "un premio");
    uguale(r.monete, 4);
    uguale(d.conto("pino").moneteTot ?? 0, 0, "coniate da chi comanda non contano nel trofeo");
    const b = bruciaMonete(d, "admin", "pino", 10, "una correzione");
    uguale(b.monete, 0, "si tolgono quante ce n'e'");
    uguale(b.mosse, -4);
    vero(d.registro().some((x) => /monete coniate \+4 · un premio/.test(x.cosa)), "il registro lo sa");
    vero(d.registro().some((x) => /monete bruciate/.test(x.cosa)));
  }),
);

prova("cambiare le regole lascia scritto cosa e' cambiato", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const dopo = cambiaRegoleMoneta(d, "admin", { tettoSettimana: 40, moneteFine: 2, nonEsiste: 9 });
    uguale(dopo.tettoSettimana, 40);
    uguale(dopo.moneteFine, 2);
    vero(d.registro().some((x) => /tettoSettimana 25 → 40/.test(x.cosa)), "il registro dice il prima e il dopo");
    cambiaRegoleMoneta(d, "admin", { tettoSettimana: 40 });
    uguale(d.registro().length, 1, "nessun cambio, nessuna riga");
  }),
);

prova("il quadro per chi comanda dice quante ce ne sono, e chi le ha", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muoviMonete("pino", 5, "p", "banca-admin", false, ADESSO);
    d.guadagnaMonete("gigi", 2, "g", "incasso", ADESSO);
    const m = monetaInBanca(d, ADESSO);
    uguale(m.circolanti, 7);
    uguale(m.coniate, 7);
    uguale(m.titolari.map((t) => [t.chi, t.monete]), [["pino", 5], ["gigi", 2]], "in ordine di quante ne hanno");
    uguale(m.origini, { "banca-admin": 5, incasso: 2 });
    uguale(m.titolari[1].guadagnate, 2);
    vero(m.quota >= REGOLE_MONETA.prezzoBase);
  }),
);

prova("la pagina di chi gioca ha il libro, la linea e le regole in chiaro", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.guadagnaMonete("pino", 2, "una vincita", "incasso", ADESSO);
    const m = monetaDi(d, "pino", ADESSO);
    uguale(m.monete, 2);
    uguale(m.guadagnate, 2);
    uguale(m.libro.length, 1);
    vero(m.serie["24h"].length >= 1 && m.serie["7g"].length >= 1 && m.serie["1m"].length >= 1, "le tre linee");
    uguale(m.come.sogliaEuro, 20);
    uguale(m.settimana.tetto, 25);
    uguale(m.settimana.resta, 23);
    vero(Number.isFinite(m.variazione24h), "la variazione e' un numero");
  }),
);

/* ------------------------------------------------------------- le rotte */

const contorno = { nomeDi: (id) => "Nome di " + id };
const io = (admin) => ({ id: admin ? "capo" : "pino", nome: admin ? "Capo" : "Pino", admin });

prova("dalle rotte: chi gioca guarda la sua moneta, e non tocca quella degli altri", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino");
    const mia = rispondi(d, io(false), contorno, "GET", "/moneta", {});
    uguale(mia.codice, 200);
    uguale(mia.dati.monete, 0);
    for (const [metodo, percorso] of [
      ["GET", "/moneta/admin"],
      ["POST", "/moneta/conia"],
      ["POST", "/moneta/brucia"],
      ["POST", "/moneta/regole"],
    ]) {
      const r = rispondi(d, io(false), contorno, metodo, percorso, { chi: "pino", quante: 100, perche: "io" });
      uguale(r.codice, 403, metodo + " " + percorso + " a chi non comanda");
    }
    uguale(d.monete("pino"), 0, "e non e' cambiato niente");
  }),
);

prova("dalle rotte: chi comanda conia, guarda e cambia le regole", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino");
    const c = rispondi(d, io(true), contorno, "POST", "/moneta/conia", { chi: "pino", quante: 3, perche: "per la prova" });
    uguale(c.codice, 200);
    uguale(c.dati.monete, 3);
    const senza = rispondi(d, io(true), contorno, "POST", "/moneta/conia", { chi: "pino", quante: 3 });
        vero(senza.codice >= 400, "senza motivo non passa: " + senza.codice);
    const a = rispondi(d, io(true), contorno, "GET", "/moneta/admin", {});
    uguale(a.codice, 200);
    uguale(a.dati.titolari[0].nome, "Nome di pino", "con i nomi veri");
    vero(a.dati.registro.length >= 1, "e il registro");
    const r = rispondi(d, io(true), contorno, "POST", "/moneta/regole", { tettoSettimana: 99 });
    uguale(r.dati.regole.tettoSettimana, 99);
    const b = rispondi(d, io(true), contorno, "POST", "/moneta/brucia", { chi: "pino", quante: 1, perche: "x" });
    uguale(b.dati.monete, 2);
  }),
);

prova("/io dice quante monete hai", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muoviMonete("pino", 4, "p", "altro", false, ADESSO);
    const r = rispondi(d, io(false), contorno, "GET", "/io", {});
    uguale(r.dati.monete, 4);
  }),
);

prova("l'euro e' un modo di leggere: un incasso di un euro non da' monete", () => {
  uguale(monetePerIncasso(euroDaLire(lireDaEuro(1)), false), 0);
});

process.exit(tirandoLeSomme("La moneta DaProd"));
