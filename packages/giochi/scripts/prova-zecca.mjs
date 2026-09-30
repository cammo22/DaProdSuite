/**
 * Le prove della Zecca (1.7.9, `zecca.ts` e `zecca-rotte.ts`).
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-zecca.mjs
 *
 * Il caso si passa da fuori: un pacchetto che tira a sorte si prova col dado in
 * mano, non sperando che esca.
 */

import {
  apriPacchettoZecca,
  approvaProposta,
  contiZecca,
  controllaCollezioni,
  coniaPezzo,
  creaCollezione,
  creaPacchettoZecca,
  Deposito,
  numeroZecca,
  pezziDi,
  proponi,
  RARITA,
  raritaDi,
  regalaPezzo,
  rifiutaProposta,
  rispondi,
  tipoDaMime,
  tiraRarita,
  trasferisciPezzo,
  zeccaInRiga,
  zeccaNuova,
} from "../dist/index.js";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

const ADESSO = Date.UTC(2026, 8, 22, 10, 0, 0);

function lancia(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
}
const dice = (errore, pezzo) => vero(errore && new RegExp(pezzo, "i").test(errore.message), "doveva dire «" + pezzo + "», ha detto: " + (errore ? errore.message : "niente"));

const foto = (n) => ({ id: "immagini/foto" + n + ".png", mime: "image/png" });
const brano = (n) => ({ id: "musica/brano" + n + ".wav", mime: "audio/wav" });

/** Un deposito con qualche persona che ha un conto. */
function conGente(d) {
  for (const chi of ["pino", "gigi", "admin"]) d.conto(chi);
  return d;
}

/* --------------------------------------------------------- attrezzi */

prova("il tipo si capisce dalla mime", () => {
  uguale(tipoDaMime("image/png"), "immagine");
  uguale(tipoDaMime("audio/mpeg"), "brano");
  uguale(tipoDaMime("video/mp4"), "video");
  uguale(tipoDaMime("application/zip"), "altro");
  uguale(tipoDaMime(""), "altro");
});

prova("le rarita' sono sei, dal piu' comune al piu' raro, e il peso cala", () => {
  uguale(RARITA.map((r) => r.id), ["comune", "non-comune", "raro", "epico", "leggendario", "mitico"]);
  for (let i = 1; i < RARITA.length; i++) vero(RARITA[i].peso < RARITA[i - 1].peso, "il peso deve calare: " + RARITA[i].id);
  for (let i = 1; i < RARITA.length; i++) vero(RARITA[i].valore > RARITA[i - 1].valore, "il valore deve salire");
  uguale(raritaDi("inventata").id, "comune", "una rarita' sconosciuta vale comune");
  uguale(tiraRarita(dado(0)), "comune");
  uguale(tiraRarita(dado(0.99999)), "mitico");
});

prova("il numero si scrive a quattro cifre", () => {
  uguale(numeroZecca(7), "#0007");
  uguale(numeroZecca(1234), "#1234");
});

/* ------------------------------------------------------ proporre e coniare */

prova("chi gioca propone una cosa sua, e servono il nome e il file", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    dice(lancia(() => proponi(d, "pino", {}, "x")), "Manca il file");
    dice(lancia(() => proponi(d, "pino", foto(1), "   ")), "nome");
    const q = proponi(d, "pino", foto(1), "  Il faro   di notte ");
    uguale(q.titolo, "Il faro di notte", "gli spazi si sistemano");
    uguale(q.stato, "in-attesa");
    uguale(q.tipo, "immagine");
    dice(lancia(() => proponi(d, "gigi", foto(1), "uguale")), "aspetta gia'");
  }),
);

prova("chi comanda conia: numero che non si riusa, rarita' e primo passaggio", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const a = coniaPezzo(d, "admin", { file: foto(1), titolo: "Uno", rarita: "raro" }, dado(0), ADESSO);
    const b = coniaPezzo(d, "admin", { file: brano(2), titolo: "Due", rarita: "caso" }, dado(0), ADESSO);
    uguale([a.numero, b.numero], [1, 2]);
    uguale(a.id, "z1");
    uguale(a.rarita, "raro");
    uguale(b.rarita, "comune", "a sorte, col dado a zero");
    uguale(b.tipo, "brano");
    uguale(a.proprietario, "", "finche' non esce da un pacchetto e' di nessuno");
    uguale(a.creatore, "admin", "senza un creatore e' chi conia");
    uguale(a.storia, [{ chi: "admin", quando: ADESSO, come: "conio" }]);
    dice(lancia(() => coniaPezzo(d, "admin", { file: foto(1), titolo: "Doppio" }, dado(0))), "gia' un pezzo");
    dice(lancia(() => coniaPezzo(d, "admin", { file: foto(9), titolo: "" }, dado(0))), "nome");
    dice(lancia(() => coniaPezzo(d, "admin", { file: foto(9), titolo: "x", rarita: "divina" }, dado(0))), "Che rarita");
    dice(lancia(() => coniaPezzo(d, "admin", { file: foto(9), titolo: "x", collezione: "c-che-non-c-e" }, dado(0))), "collezione non c'e'");
    uguale(d.statoZecca().ultimoNumero, 2, "un conio fallito non consuma un numero");
  }),
);

prova("una proposta approvata diventa un pezzo con chi l'ha fatta come creatore", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const q = proponi(d, "pino", foto(1), "Il faro");
    const p = approvaProposta(d, "admin", q.id, "epico", dado(0), ADESSO);
    uguale(p.creatore, "pino");
    uguale(p.coniatoDa, "admin");
    uguale(p.rarita, "epico");
    uguale(d.statoZecca().proposte[0].stato, "coniata");
    uguale(d.statoZecca().proposte[0].pezzo, p.id);
    dice(lancia(() => approvaProposta(d, "admin", q.id, "raro", dado(0))), "gia' stata decisa");
    dice(lancia(() => proponi(d, "gigi", foto(1), "ancora")), "gia' un pezzo");
  }),
);

prova("rifiutare vuole il perche', e una proposta rifiutata si puo' riproporre", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const q = proponi(d, "pino", foto(1), "Il faro");
    dice(lancia(() => rifiutaProposta(d, q.id, "")), "perche");
    const r = rifiutaProposta(d, q.id, "e' sfocata");
    uguale([r.stato, r.motivo], ["rifiutata", "e' sfocata"]);
    dice(lancia(() => rifiutaProposta(d, q.id, "x")), "gia' stata decisa");
    proponi(d, "pino", foto(1), "Il faro, nitido");
    uguale(d.statoZecca().proposte.length, 2);
  }),
);

/* ---------------------------------------------------------- i pacchetti */

function conTrePezzi(d) {
  const a = coniaPezzo(d, "admin", { file: foto(1), titolo: "A", rarita: "comune" }, dado(0), ADESSO);
  const b = coniaPezzo(d, "admin", { file: foto(2), titolo: "B", rarita: "raro" }, dado(0), ADESSO);
  const c = coniaPezzo(d, "admin", { file: brano(3), titolo: "C", rarita: "mitico" }, dado(0), ADESSO);
  return [a, b, c];
}

prova("un pacchetto si fa solo con pezzi di nessuno, e ogni pezzo sta in un posto solo", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b, c] = conTrePezzi(d);
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "", prezzo: 3, perApertura: 1, pezzi: [a.id] })), "nome");
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "P", prezzo: 0, perApertura: 1, pezzi: [a.id] })), "monete");
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "P", prezzo: 3, perApertura: 0, pezzi: [a.id] })), "apertura");
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "P", prezzo: 3, perApertura: 1, pezzi: [] })), "almeno un pezzo");
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "P", prezzo: 3, perApertura: 1, pezzi: ["z99"] })), "non c'e'");
    const k = creaPacchettoZecca(d, "admin", { nome: "Primo", prezzo: 3, perApertura: 2, pezzi: [a.id, b.id, a.id] }, ADESSO);
    uguale(k.pezzi, [a.id, b.id], "un pezzo scritto due volte conta una");
    uguale(k.totali, 2);
    uguale(d.statoZecca().pezzi[0].pacchetto, k.id);
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "Altro", prezzo: 3, perApertura: 1, pezzi: [a.id] })), "gia' in un pacchetto");
    d.statoZecca().pezzi[2].proprietario = "pino";
    dice(lancia(() => creaPacchettoZecca(d, "admin", { nome: "Altro", prezzo: 3, perApertura: 1, pezzi: [c.id] })), "gia' di qualcuno");
  }),
);

prova("aprire un pacchetto costa monete, e serve averle", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b] = conTrePezzi(d);
    const k = creaPacchettoZecca(d, "admin", { nome: "Primo", prezzo: 3, perApertura: 1, pezzi: [a.id, b.id] }, ADESSO);
    dice(lancia(() => apriPacchettoZecca(d, "pino", k.id, dado(0))), "Servono 3 monete");
    uguale(d.monete("pino"), 0, "non si e' pagato niente");
    uguale(d.statoZecca().pacchetti[0].pezzi.length, 2, "e non e' uscito niente");
    dice(lancia(() => apriPacchettoZecca(d, "pino", "k-non-c-e", dado(0))), "non c'e'");
  }),
);

prova("i pezzi escono col peso della rarita', e diventano di chi li apre", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b, c] = conTrePezzi(d);
    const k = creaPacchettoZecca(d, "admin", { nome: "Primo", prezzo: 3, perApertura: 1, pezzi: [a.id, b.id, c.id] }, ADESSO);
    d.muoviMonete("pino", 10, "p", "altro", false, ADESSO);
    // Dado al massimo: cade sull'ultimo, il mitico.
    const r1 = apriPacchettoZecca(d, "pino", k.id, dado(0.999999), ADESSO);
    uguale(r1.pezzi.map((p) => p.id), [c.id]);
    uguale(r1.pezzi[0].proprietario, "pino");
    uguale(r1.monete, 7);
    uguale(r1.restano, 2);
    uguale(d.monete("pino"), 7);
    vero(!("pacchetto" in d.statoZecca().pezzi[2]), "uscito dal pacchetto, non ci sta piu'");
    uguale(d.statoZecca().pezzi[2].storia.map((x) => x.come), ["conio", "pacchetto"]);
    uguale(d.statoZecca().pezzi[2].storia[1].chi, "pino");
    uguale(d.statoMoneta().bruciate, 3, "le monete pagate sono bruciate");
    // Dado a zero: il primo della fila.
    const r2 = apriPacchettoZecca(d, "pino", k.id, dado(0), ADESSO);
    uguale(r2.pezzi[0].id, a.id);
    uguale(pezziDi(d, "pino").length, 2);
    uguale(d.statoZecca().pacchetti[0].aperture, 2);
  }),
);

prova("un pacchetto con piu' pezzi per apertura li tira tutti diversi, e finisce", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b, c] = conTrePezzi(d);
    const k = creaPacchettoZecca(d, "admin", { nome: "Terzetto", prezzo: 2, perApertura: 5, pezzi: [a.id, b.id, c.id] }, ADESSO);
    d.muoviMonete("gigi", 10, "p", "altro", false, ADESSO);
    const r = apriPacchettoZecca(d, "gigi", k.id, dado(0.3, 0.6, 0.1), ADESSO);
    uguale(r.pezzi.length, 3, "escono meno di cinque: ce ne sono tre");
    uguale(new Set(r.pezzi.map((p) => p.id)).size, 3, "tutti diversi");
    uguale(r.restano, 0);
    dice(lancia(() => apriPacchettoZecca(d, "gigi", k.id, dado(0))), "e' finito");
    uguale(d.monete("gigi"), 8, "un pacchetto finito non si paga");
  }),
);

prova("la scarsita' e' vera: niente pezzi in piu' dopo l'apertura", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a] = conTrePezzi(d);
    const k = creaPacchettoZecca(d, "admin", { nome: "Uno", prezzo: 1, perApertura: 1, pezzi: [a.id] }, ADESSO);
    d.muoviMonete("pino", 5, "p", "altro", false, ADESSO);
    apriPacchettoZecca(d, "pino", k.id, dado(0), ADESSO);
    uguale(contiZecca(d).coniati, 3);
    uguale(contiZecca(d).assegnati, 1);
    uguale(contiZecca(d).diNessuno, 2, "gli altri due aspettano un pacchetto");
    uguale(contiZecca(d).perRarita.mitico, 1);
  }),
);

/* ------------------------------------------------- passare di mano */

prova("un pezzo passa di mano solo se e' tuo, e la storia resta scritta", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a] = conTrePezzi(d);
    const k = creaPacchettoZecca(d, "admin", { nome: "Uno", prezzo: 1, perApertura: 1, pezzi: [a.id] }, ADESSO);
    d.muoviMonete("pino", 5, "p", "altro", false, ADESSO);
    apriPacchettoZecca(d, "pino", k.id, dado(0), ADESSO);
    dice(lancia(() => regalaPezzo(d, "gigi", "pino", a.id)), "non e' tuo");
    dice(lancia(() => regalaPezzo(d, "pino", "pino", a.id)), "gia' tuo");
    dice(lancia(() => regalaPezzo(d, "pino", "sconosciuto", a.id)), "non ha un conto");
    regalaPezzo(d, "pino", "gigi", a.id);
    uguale(d.statoZecca().pezzi[0].proprietario, "gigi");
    uguale(d.statoZecca().pezzi[0].storia.map((x) => [x.chi, x.come]), [["admin", "conio"], ["pino", "pacchetto"], ["gigi", "regalo"]]);
    const m = trasferisciPezzo(d, a.id, "gigi", "pino", "mercato", 4, ADESSO + 1000);
    uguale(m.pezzo.storia[3], { chi: "pino", quando: ADESSO + 1000, come: "mercato", monete: 4 }, "il passaggio di mercato dice quanto e' costato");
  }),
);

/* -------------------------------------------------------- collezioni */

prova("una collezione vuole almeno due pezzi liberi da altre collezioni", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b, c] = conTrePezzi(d);
    dice(lancia(() => creaCollezione(d, { nome: "", premio: 5, pezzi: [a.id, b.id] })), "nome");
    dice(lancia(() => creaCollezione(d, { nome: "Sola", premio: 5, pezzi: [a.id] })), "almeno due");
    dice(lancia(() => creaCollezione(d, { nome: "Sola", premio: -1, pezzi: [a.id, b.id] })), "premio");
    const col = creaCollezione(d, { nome: "Il mare", premio: 5, pezzi: [a.id, b.id] }, ADESSO);
    uguale(d.statoZecca().pezzi[0].collezione, col.id);
    dice(lancia(() => creaCollezione(d, { nome: "Altra", premio: 5, pezzi: [b.id, c.id] })), "gia' in una collezione");
  }),
);

prova("completare una collezione paga il premio in monete, una volta sola, senza tetto", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b] = conTrePezzi(d);
    creaCollezione(d, { nome: "Il mare", premio: 6, pezzi: [a.id, b.id] }, ADESSO);
    const k = creaPacchettoZecca(d, "admin", { nome: "Due", prezzo: 1, perApertura: 1, pezzi: [a.id, b.id] }, ADESSO);
    d.muoviMonete("pino", 10, "p", "altro", false, ADESSO);
    const r1 = apriPacchettoZecca(d, "pino", k.id, dado(0), ADESSO);
    uguale(r1.collezioni, [], "con un pezzo solo non e' completa");
    const r2 = apriPacchettoZecca(d, "pino", k.id, dado(0), ADESSO);
    uguale(r2.collezioni.length, 1, "col secondo si chiude");
    uguale(r2.collezioni[0].premio, 6);
    uguale(d.monete("pino"), 10 - 1 - 1 + 6, "due pacchetti pagati, sei di premio");
    uguale(d.conto("pino").moneteTot, 6, "il premio conta nel trofeo, senza passare dal tetto");
    uguale(controllaCollezioni(d, "pino"), [], "il premio si prende una volta sola");
    // Se il pezzo passa a un altro e torna, il premio non si ripaga.
    regalaPezzo(d, "pino", "gigi", a.id);
    regalaPezzo(d, "gigi", "pino", a.id);
    uguale(d.monete("pino"), 14);
  }),
);

prova("una collezione creata quando qualcuno ha gia' tutto, si completa", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b] = conTrePezzi(d);
    for (const p of [a, b]) {
      d.statoZecca().pezzi.find((x) => x.id === p.id).proprietario = "pino";
    }
    const col = creaCollezione(d, { nome: "Gia' fatta", premio: 2, pezzi: [a.id, b.id] }, ADESSO);
    uguale(controllaCollezioni(d, "pino").map((x) => x.id), [col.id]);
    uguale(d.monete("pino"), 2);
  }),
);

/* ----------------------------------------------------------- il disco */

prova("la Zecca sopravvive al riavvio", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const [a, b] = conTrePezzi(d);
    creaPacchettoZecca(d, "admin", { nome: "Due", prezzo: 1, perApertura: 1, pezzi: [a.id, b.id] }, ADESSO);
    proponi(d, "pino", foto(9), "Una proposta");
    d.scriviOra();
    const di_nuovo = new Deposito(file);
    uguale(di_nuovo.statoZecca().pezzi.length, 3);
    uguale(di_nuovo.statoZecca().pacchetti[0].pezzi.length, 2);
    uguale(di_nuovo.statoZecca().proposte.length, 1);
    uguale(di_nuovo.statoZecca().ultimoNumero, 3, "il numero non riparte");
  }),
);

prova("uno stato storto si rimette in riga, e il numero non torna indietro", () => {
  uguale(zeccaInRiga(null), zeccaNuova());
  uguale(zeccaInRiga("x"), zeccaNuova());
  const s = zeccaInRiga({ ultimoNumero: 2, pezzi: [{ id: "z9", numero: 9, file: { id: "a", mime: "x" } }, null, 4], pacchetti: "no", collezioni: [{ id: "c", nome: "n" }] });
  uguale(s.pezzi.length, 1, "le cose storte si buttano");
  uguale(s.pezzi[0].storia, [], "la storia mancante diventa vuota");
  uguale(s.pezzi[0].proprietario, "");
  uguale(s.ultimoNumero, 9, "il numero piu' alto visto vince: niente doppioni");
  uguale(s.pacchetti, []);
  uguale(s.collezioni[0].pezzi, []);
});

/* ---------------------------------------------------------- le rotte */

const libreria = [
  { id: "immagini/mia.png", titolo: "Mia", mime: "image/png", url: "/libreria/file/immagini%2Fmia.png", anteprima: "/libreria/anteprima/mia" },
  { id: "musica/mio.wav", titolo: "Mio", mime: "audio/wav", url: "/libreria/file/musica%2Fmio.wav" },
];
const contorno = {
  nomeDi: (id) => "Nome di " + id,
  indirizzoLibreria: (id) => "/libreria/file/" + encodeURIComponent(id),
  anteprimaLibreria: (id) => "/anteprima/" + id,
  elencoLibreria: (chi) => (chi === "capo" ? [...libreria, { id: "immagini/altrui.png", titolo: "Altrui", mime: "image/png", url: "/x" }] : libreria),
  gente: () => [{ id: "pino", nome: "Pino" }, { id: "gigi", nome: "Gigi" }],
};
const io = (chi, admin) => ({ id: chi, nome: chi, admin });

prova("dalle rotte: chi non comanda non tocca le cose di chi comanda", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    for (const [metodo, percorso] of [["GET", "/zecca/admin"], ["POST", "/zecca/conia"], ["POST", "/zecca/approva"], ["POST", "/zecca/rifiuta"], ["POST", "/zecca/pacchetto"], ["POST", "/zecca/collezione"]]) {
      uguale(rispondi(d, io("pino", false), contorno, metodo, percorso, { file: foto(1), titolo: "x" }).codice, 403, metodo + " " + percorso);
    }
    uguale(d.statoZecca().pezzi.length, 0);
    uguale(rispondi(d, io("pino", false), contorno, "GET", "/zecca/che-non-c-e", {}).codice, 404);
  }),
);

prova("dalle rotte: tutto il giro, dalla proposta al pezzo che e' tuo", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    // Pino propone una cosa sua; una non sua no.
    const altrui = rispondi(d, io("pino", false), contorno, "POST", "/zecca/proponi", { file: { id: "immagini/altrui.png", mime: "image/png" }, titolo: "Rubata" });
    uguale(altrui.codice, 403, "solo cose tue");
    const p = rispondi(d, io("pino", false), contorno, "POST", "/zecca/proponi", { file: { id: "immagini/mia.png", mime: "image/png" }, titolo: "La mia" });
    uguale(p.codice, 200);
    // Il capo la vede e la approva.
    const a = rispondi(d, io("capo", true), contorno, "GET", "/zecca/admin", {});
    uguale(a.dati.proposte.length, 1);
    uguale(a.dati.proposte[0].nome, "Nome di pino");
    const approvata = rispondi(d, io("capo", true), contorno, "POST", "/zecca/approva", { id: a.dati.proposte[0].id, rarita: "raro" });
    uguale(approvata.dati.pezzo.numeroScritto, "#0001");
    uguale(approvata.dati.pezzo.nomeCreatore, "Nome di pino");
    // Il capo fa un pacchetto col pezzo.
    const k = rispondi(d, io("capo", true), contorno, "POST", "/zecca/pacchetto", { nome: "Primo", prezzo: 2, perApertura: 1, pezzi: [approvata.dati.pezzo.id] });
    uguale(k.codice, 200);
    // Gigi non ha monete: non apre.
    const senza = rispondi(d, io("gigi", false), contorno, "POST", "/zecca/apri", { pacchetto: k.dati.pacchetto.id });
    uguale(senza.codice, 409);
    vero(/Servono 2/.test(senza.dati.errore), senza.dati.errore);
    // Gigi guarda la vetrina: vede la scarsita', non il pezzo.
    d.muoviMonete("gigi", 5, "p", "altro", false, ADESSO);
    const v = rispondi(d, io("gigi", false), contorno, "GET", "/zecca", {});
    uguale(v.dati.pacchetti[0].restano, 1);
    uguale(v.dati.pacchetti[0].dentro.raro, 1);
    uguale(v.dati.miei.length, 0);
    // Apre: il pezzo e' suo, e adesso vede il file intero.
    const r = rispondi(d, io("gigi", false), contorno, "POST", "/zecca/apri", { pacchetto: k.dati.pacchetto.id });
    uguale(r.codice, 200);
    uguale(r.dati.pezzi[0].nomeProprietario, "Nome di gigi");
    uguale(r.dati.monete, 3);
    const dopo = rispondi(d, io("gigi", false), contorno, "GET", "/zecca", {});
    uguale(dopo.dati.miei.length, 1);
    vero(dopo.dati.miei[0].url.startsWith("/libreria/file/"), "chi ce l'ha vede il file intero");
    uguale(dopo.dati.miei[0].storia.length, 2);
    // Pino non ce l'ha: anteprima si', file intero no.
    const vistoDaPino = rispondi(d, io("pino", false), contorno, "GET", "/zecca", {});
    uguale(vistoDaPino.dati.miei.length, 0);
    uguale(vistoDaPino.dati.pacchetti[0].finito, true);
    uguale(vistoDaPino.dati.proposte[0].stato, "coniata", "pino vede che la sua proposta e' stata coniata");
  }),
);

prova("dalle rotte: il regalo, e una collezione che si chiude", () =>
  conCartella((file) => {
    const d = conGente(new Deposito(file));
    const a = rispondi(d, io("capo", true), contorno, "POST", "/zecca/conia", { file: foto(1), titolo: "A", rarita: "comune" }).dati.pezzo;
    const b = rispondi(d, io("capo", true), contorno, "POST", "/zecca/conia", { file: foto(2), titolo: "B", rarita: "comune" }).dati.pezzo;
    const c = rispondi(d, io("capo", true), contorno, "POST", "/zecca/collezione", { nome: "Coppia", premio: 4, pezzi: [a.id, b.id] });
    uguale(c.codice, 200);
    uguale(c.dati.completataDa, []);
    for (const p of [a, b]) d.statoZecca().pezzi.find((x) => x.id === p.id).proprietario = "pino";
    const g = rispondi(d, io("pino", false), contorno, "POST", "/zecca/regala", { pezzo: a.id, a: "gigi" });
    uguale(g.codice, 200);
    uguale(d.statoZecca().pezzi.find((x) => x.id === a.id).proprietario, "gigi");
    uguale(rispondi(d, io("pino", false), contorno, "POST", "/zecca/regala", { pezzo: b.id, a: "pino" }).codice, 409, "a se stessi no");
    uguale(rispondi(d, io("pino", false), contorno, "POST", "/zecca/regala", { pezzo: a.id, a: "gigi" }).codice, 409, "un pezzo che non e' piu' tuo no");
  }),
);

process.exit(tirandoLeSomme("La Zecca"));
