/**
 * Le prove dell'inventario, e dei pacchetti visti da chi gioca.
 *
 * ⚠ **Qui si prova soprattutto quello che NON deve uscire.** L'inventario e il
 * pacchetto aperto mostrano cose diverse a persone diverse — chi comanda vede
 * tutto, chi gioca vede le sue — e l'unico modo di sbagliare in silenzio e' far
 * uscire il titolo o il prompt di una figurina che uno non ha. Per questo molte
 * prove passano da `rispondi()`, cioe' da quello che arriva davvero alla
 * pagina, e non solo dalle funzioni del banco.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-inventario.mjs
 */

import {
  classifica,
  creaPacchetto,
  Deposito,
  inventario,
  prezzoNelloShop,
  rispondi,
} from "../dist/index.js";
import { conCartella, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/** Una figurina presa, col suo prompt segreto e, se si vuole, una faccia. */
function presa(d, id, prezzo, conFaccia = true) {
  const c = {
    id,
    tipo: "prompt",
    titolo: "Titolo " + id,
    impronta: "imp-" + id,
    daChi: "pino",
    quando: 1,
    stato: "presa",
    numero: d.collezionabili().length + 1,
    prezzo,
    prompt: "segreto " + id,
  };
  if (conFaccia) c.allegati = [{ id: "f-" + id, mime: "image/png", url: "/libreria/file/" + id }];
  d.collezionabili().push(c);
  return c;
}

const contorno = { nomeDi: (id) => id };
const gino = { id: "gino", nome: "Gino", admin: false };
const capo = { id: "capo", nome: "Capo", admin: true };
const chiedi = (d, chi, percorso, metodo = "GET", corpo = {}) =>
  rispondi(d, chi, contorno, metodo, percorso, corpo);

/* ------------------------------------------------------------ l'inventario */

prova("l'inventario conta le figurine dei pacchetti, coi buchi al loro posto", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    presa(d, "b", 600);
    presa(d, "c", 3600);
    creaPacchetto(d, "capo", "Primo");
    d.colleziona("gino", "b");

    const inv = inventario(d, "gino");
    uguale([inv.hai, inv.di], [1, 3]);
    uguale(inv.pacchetti.length, 1);
    uguale(inv.pacchetti[0].caselle.map((k) => (k.cosa ? k.cosa.id : null)), [null, "b", null],
      "la casella piena e' al suo posto, fra i due buchi");
    uguale(inv.pacchetti[0].caselle.map((k) => k.grado), ["basic", "rare", "unique"],
      "il grado si vede anche nei buchi: che ti manca un Unique lo devi sapere");
  }),
);

/**
 * ⚠ **Un buco non dice cosa c'e' dentro.** Ne' il titolo, ne' il prompt, ne'
 * la faccia: se no l'inventario sarebbe un elenco da leggere, non una raccolta
 * da riempire. Si guarda quello che arriva davvero alla pagina.
 */
prova("di una figurina che non hai non esce niente, se non il numero e il grado", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    presa(d, "b", 600);
    creaPacchetto(d, "capo");
    d.colleziona("gino", "b");

    const r = chiedi(d, gino, "/inventario");
    uguale(r.codice, 200);
    const testo = JSON.stringify(r.dati);
    vero(testo.indexOf("Titolo a") < 0, "il titolo di quella che manca non deve uscire");
    vero(testo.indexOf("segreto a") < 0, "e nemmeno il prompt");
    vero(testo.indexOf("/libreria/file/a") < 0, "e nemmeno la faccia");
    vero(testo.indexOf("Titolo b") >= 0, "di quella che hai, si'");
  }),
);

prova("quelle prese dopo non sono buchi, e le tue fuori dai pacchetti si vedono a parte", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    creaPacchetto(d, "capo");
    presa(d, "z", 100);
    d.colleziona("gino", "z");

    const inv = inventario(d, "gino");
    uguale(inv.di, 1, "una presa stamattina non e' ancora una casella: non si puo' avere da nessuna parte");
    uguale(inv.fuori.map((c) => c.id), ["z"], "ma se e' tua si vede, a parte");
  }),
);

/**
 * ⚠ **Gli obiettivi vengono dai pacchetti**, non da un elenco scritto a mano:
 * un elenco a parte il giorno che si chiude un pacchetto nuovo non lo sa.
 */
prova("gli obiettivi vengono dai pacchetti, e non promettono cose finte", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    presa(d, "b", 600);
    creaPacchetto(d, "capo", "Primo");
    d.colleziona("gino", "a");
    d.colleziona("gino", "b");

    const per = Object.fromEntries(inventario(d, "gino").obiettivi.map((o) => [o.id, o]));
    vero(per["prima"] && per["prima"].fatto, "la prima figurina");
    vero(per["pacchetto-1"] && per["pacchetto-1"].fatto, "il pacchetto completo");
    vero(per["grado-rare"] && per["grado-rare"].fatto, "il primo Rare");
    uguale(per["tante-10"], undefined, "dieci figurine con due in giro sarebbe un obiettivo finto");
  }),
);

/* ------------------------------------------------------ il pacchetto aperto */

prova("un pacchetto aperto: chi comanda lo vede intero, chi gioca vede le sue", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    presa(d, "b", 600);
    presa(d, "c", 3600);
    creaPacchetto(d, "capo");
    d.colleziona("gino", "b");

    const suo = chiedi(d, gino, "/album/1").dati;
    uguale(suo.figurine.map((c) => c.id), ["b"], "chi gioca vede solo quelle che ha");
    uguale(suo.nascoste, 2, "e sa quante altre ce ne sono");
    vero(JSON.stringify(suo).indexOf("Titolo a") < 0, "delle altre non arriva nemmeno il titolo");

    const tutto = chiedi(d, capo, "/album/1").dati;
    uguale(tutto.figurine.length, 3, "chi comanda le vede tutte");
    uguale(tutto.nascoste, 0);

    uguale(chiedi(d, gino, "/album").dati.pacchetti[0].tue, 1, "e la bustina sa quante ne hai");
    uguale(chiedi(d, gino, "/album/9").codice, 404, "un pacchetto che non c'e' non c'e'");
  }),
);

/**
 * ⚠ **La tendina di Pacchetti**: le cose prese che non stanno ancora in nessun
 * pacchetto. Chiesta l'11 settembre 2026: «nel menu mostriamo solo gli
 * elementi che non fanno parte di un pack». Stessa regola del pacchetto aperto.
 */
prova("la tendina: chi comanda vede tutte quelle fuori, chi gioca le sue e quante altre", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    creaPacchetto(d, "capo");
    presa(d, "x", 100);
    presa(d, "y", 100);
    d.colleziona("gino", "x");

    const g = chiedi(d, gino, "/album").dati;
    uguale(g.fuori.map((c) => c.id), ["x"]);
    uguale(g.fuoriAltre, 1);
    const c = chiedi(d, capo, "/album").dati;
    uguale(c.fuori.map((x) => x.id), ["x", "y"]);
    uguale(c.fuoriAltre, 0);
  }),
);

/* -------------------------------------------------------------- lo shop */

prova("nello shop ci sono i pacchetti, e il cartellino e' quello che si paga", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    presa(d, "b", 3600);
    creaPacchetto(d, "capo");
    d.muovi("gino", 1_000_000);

    const v = chiedi(d, gino, "/vetrina").dati;
    uguale(v.pacchetti.length, 1);
    const b = v.pacchetti[0].roba.find((x) => x.id === "b");
    uguale(b.costo, prezzoNelloShop(d, d.perId("b")));
    uguale(b.prompt, "", "il prompt resta coperto finche' non paghi");
    vero(b.faccia.length > 0, "ma la faccia si vede: uno deve guardare cosa compra");

    const prima = d.conto("gino").saldo;
    const r = chiedi(d, gino, "/compra", "POST", { id: "b" });
    uguale(r.codice, 200);
    uguale(d.conto("gino").saldo, prima - b.costo, "si paga il numero che c'era scritto");
  }),
);

/**
 * ⚠ **Quando la figurina E' la foto, la faccia la vede solo chi ce l'ha.** Per
 * un prompt la faccia e' una cosa che ne e' uscita, e si guarda; per una foto
 * della galleria la faccia e' la figurina stessa, e guardarla vuol dire averla.
 */
prova("una foto che e' la figurina non si regala guardandola", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "foto", 600, false);
    c.tipo = "immagine";
    c.libreria = { id: "lib-foto", mime: "image/png", url: "/libreria/file/lib-foto" };
    creaPacchetto(d, "capo");

    uguale(chiedi(d, gino, "/vetrina").dati.pacchetti[0].roba[0].faccia, "", "coperta: niente foto");
    d.colleziona("gino", "foto");
    uguale(chiedi(d, gino, "/vetrina").dati.pacchetti[0].roba[0].faccia, "/libreria/file/lib-foto",
      "tua: la foto c'e'");
  }),
);

/* ---------------------------------------------------------------- casa */

prova("in Casa il colpo non c'e' piu'", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("gino");
    const righe = classifica(d);
    uguale(righe.length, 1);
    uguale("colpoGrosso" in righe[0], false, "chiesto l'11 settembre 2026: «togliamo la statistica colpo»");
  }),
);

process.exit(tirandoLeSomme("l'inventario e i pacchetti"));
