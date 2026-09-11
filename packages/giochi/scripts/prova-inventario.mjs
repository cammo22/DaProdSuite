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
  apriPacchetto,
  CASA,
  classifica,
  COPIE_PER_GRADO,
  copiePerIlProssimo,
  creaPacchetto,
  Deposito,
  gradoDelleCopie,
  inventario,
  paginaGiochi,
  prezzoNelloShop,
  rispondi,
  sguardiDelGioco,
  unaCopiaInPiu,
} from "../dist/index.js";
import vm from "node:vm";
import { dado } from "./attrezzi.mjs";

/**
 * ⚠ **Il copione della pagina si deve compilare.** L'11 settembre 2026 sera la
 * 1.3.5 aveva tutte le prove verdi e la pagina morta al caricamento — «Invalid
 * or unexpected token» — perche' nessuna prova leggeva il copione come lo legge
 * il browser: e' una stringa dentro TypeScript, e per TypeScript una stringa va
 * sempre bene. Qui la si mette insieme come la serve il gateway e la si fa
 * compilare a Node: una pagina che non parte non esce piu' verde.
 */
prova("il copione della pagina si compila", () => {
  const html = paginaGiochi("/giochi");
  const inizio = html.indexOf("<script>") + "<script>".length;
  const fine = html.lastIndexOf("</script>");
  vero(inizio > 8 && fine > inizio, "la pagina ha il suo copione");
  new vm.Script(html.slice(inizio, fine), { filename: "copione.js" });
});
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

/* ------------------------------------------------------- le figurine della casa */

/**
 * ⚠ **Cinquanta, e crescono con le copie.** Chieste l'11 settembre 2026: «quegli
 * item fake piu' ne collezioniamo piu' si evolvono, partono da basic fino a
 * ethernal». La prima copia e' Basic, la cinquantesima Ethernal.
 */
prova("le figurine della casa sono cinquanta, e crescono da Basic a Ethernal", () => {
  uguale(CASA.length, 50);
  uguale(new Set(CASA.map((f) => f.id)).size, 50, "cinquanta diverse");
  uguale(gradoDelleCopie(0), null, "zero copie: non ce l'hai");
  uguale(gradoDelleCopie(1), "basic", "la prima copia e' Basic");
  uguale(gradoDelleCopie(2), "grand");
  uguale(gradoDelleCopie(49), "mythic");
  uguale(gradoDelleCopie(50), "ethernal", "la cinquantesima e' Ethernal");
  uguale(copiePerIlProssimo(50), null, "in cima non c'e' un prossimo");
  for (let i = 1; i < COPIE_PER_GRADO.length; i++) {
    vero(COPIE_PER_GRADO[i] > COPIE_PER_GRADO[i - 1], "ogni gradino costa piu' copie del prima");
  }
});

prova("una copia in piu' fa crescere, e la carta lo sa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const prima = unaCopiaInPiu(d, "gino", "casa-07");
    uguale([prima.copie, prima.grado, prima.prima, prima.cresciuta], [1, "basic", null, true],
      "la prima copia la fa nascere");
    const seconda = unaCopiaInPiu(d, "gino", "casa-07");
    uguale([seconda.grado, seconda.prima, seconda.cresciuta], ["grand", "basic", true]);
    unaCopiaInPiu(d, "gino", "casa-07");
    const quarta = unaCopiaInPiu(d, "gino", "casa-07");
    uguale([quarta.copie, quarta.grado, quarta.cresciuta], [4, "rare", false],
      "la quarta resta Rare: la prossima e' alla quinta");
    uguale(quarta.prossimo, 5);
  }),
);

/**
 * ⚠ **Escono dai pacchetti, e non pagano lire: crescono.** Nove carte, e col
 * dado nella fetta della casa escono tutte della casa.
 */
prova("dai pacchetti escono le figurine della casa, e non pagano lire", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    creaPacchetto(d, "capo");
    d.muovi("gino", 1_000_000);
    uguale(d.impostazioni().perPacchetto, 9, "nove carte per pacchetto");
    // Il mucchio e' la figurina vera e poi le cinquanta: il dado a meta' cade
    // sempre nella casa, sulla stessa.
    const pacco = apriPacchetto(d, "gino", 1, dado(0.5));
    uguale(pacco.figurine.length, 9);
    vero(pacco.figurine.every((f) => f.casa), "tutte della casa");
    uguale(pacco.vinto, 0, "una copia in piu' non paga lire");
    const id = pacco.figurine[0].casa.figurina.id;
    uguale(d.conto("gino").copie[id], 9, "nove copie della stessa");
    uguale(pacco.figurine[8].casa.grado, "heroic", "e alla nona e' gia' Heroic");
  }),
);

prova("nell'inventario la casa ha la sua sezione, coi buchi", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    presa(d, "a", 100);
    creaPacchetto(d, "capo");
    unaCopiaInPiu(d, "gino", "casa-03");
    unaCopiaInPiu(d, "gino", "casa-03");
    const inv = inventario(d, "gino");
    uguale([inv.casa.hai, inv.casa.di], [1, 50]);
    const tre = inv.casa.figurine.find((f) => f.numero === 3);
    uguale([tre.copie, tre.grado, tre.prossimo], [2, "grand", 3]);
    uguale(inv.casa.figurine.find((f) => f.numero === 4).grado, null, "una senza copie e' un buco");
    const per = Object.fromEntries(inv.obiettivi.map((o) => [o.id, o]));
    vero(per["casa-prima"] && per["casa-prima"].fatto, "la prima della casa");
    vero(per["casa-tutte"] && !per["casa-tutte"].fatto, "tutte e cinquanta, ancora no");
  }),
);

/**
 * ⚠ **Un brano senza copertina attaccata prende quella della libreria.** Nel
 * file vero, l'11 settembre 2026, uno dei due brani non l'aveva: c'era gia'
 * nella galleria della suite, bastava chiederla.
 */
prova("un brano senza copertina prende quella che la libreria gli ha gia' fatto", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "canzone", 600, false);
    c.allegati = [{ id: "lib-canzone", mime: "audio/mpeg", url: "/libreria/file/lib-canzone" }];
    creaPacchetto(d, "capo");
    d.colleziona("gino", "canzone");
    const conCopertine = {
      nomeDi: (id) => id,
      anteprimaLibreria: (id) => "/libreria/anteprima/" + id,
    };
    const r = rispondi(d, gino, conCopertine, "GET", "/inventario", {});
    const casella = r.dati.pacchetti[0].caselle[0];
    uguale(casella.cosa.faccia, "/libreria/anteprima/lib-canzone");
  }),
);

/* ------------------------------------------- la faccia da cosa e' uscito */

/**
 * ⚠ **Una combinazione generata ha la faccia di quello che ne e' uscito.**
 * L'11 settembre 2026 sera, nel file vero, 35 combinazioni su 58 erano state
 * generate e nessuno aveva attaccato il risultato: in «Mie» si vedevano, nel
 * l'inventario no. Il contorno qui sotto fa la parte della libreria: per ogni
 * richiesta, i file che ne sono usciti. Quella nel forno non ha ancora niente.
 */
const conFrutti = {
  nomeDi: (id) => id,
  anteprimaLibreria: (id) => "/libreria/anteprima/" + encodeURIComponent(id),
  fruttiDi: (r) =>
    ({
      "r-vecchia": [{ id: "vecchia", titolo: "v", mime: "image/png", url: "/libreria/file/vecchia" }],
      "r-nuova": [{ id: "nuova", titolo: "n", mime: "image/png", url: "/libreria/file/nuova" }],
      "r-brano": [
        { id: "b", titolo: "b", mime: "audio/mpeg", url: "/libreria/file/b", anteprima: "/libreria/anteprima/b" },
      ],
    })[r] ?? [],
};

/** La faccia che arriva alla pagina per la prima casella dell'inventario di Gino. */
function facciaInInventario(d, id) {
  creaPacchetto(d, "capo");
  d.colleziona("gino", id);
  const r = rispondi(d, gino, conFrutti, "GET", "/inventario", {});
  return r.dati.pacchetti[0].caselle[0].cosa.faccia;
}

prova("una combinazione generata e mai attaccata prende la faccia dall'ultima prova", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "a", 100, false);
    c.prove = [
      { richiesta: "r-vecchia", quando: 1 },
      { richiesta: "r-nuova", quando: 2 },
      { richiesta: "r-forno", quando: 3 },
    ];
    uguale(facciaInInventario(d, "a"), "/libreria/file/nuova", "l'ultima che ha dato qualcosa");
  }),
);

prova("un brano generato e mai attaccato prende la sua copertina", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "a", 100, false);
    c.prove = [{ richiesta: "r-brano", quando: 1 }];
    uguale(facciaInInventario(d, "a"), "/libreria/anteprima/b");
  }),
);

prova("quello attaccato a mano vince su quello uscito dalle prove", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "a", 100);
    c.prove = [{ richiesta: "r-nuova", quando: 1 }];
    // La foto della libreria arriva dalla sua anteprima: la faccia la vede chiunque.
    uguale(facciaInInventario(d, "a"), "/libreria/anteprima/f-a");
  }),
);

/**
 * ⚠ **Un brano attaccato col suo indirizzo intero trova la sua copertina.** Nel
 * file vero l'id era «/libreria/file/musica%2Faudio%2F…»: la copertina c'era sul
 * disco, ma la si chiedeva con un nome che la libreria non conosce.
 */
prova("un brano che si ricorda l'indirizzo intero trova la sua copertina", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "a", 100, false);
    const indirizzo = "/libreria/file/" + encodeURIComponent("musica/audio/Con rabbia.mp3");
    c.allegati = [{ id: indirizzo, mime: "audio/mpeg", url: indirizzo }];
    uguale(
      facciaInInventario(d, "a"),
      "/libreria/anteprima/" + encodeURIComponent("musica/audio/Con rabbia.mp3"),
    );
  }),
);

prova("sui rulli della macchinetta la figurina ha la stessa faccia", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const c = presa(d, "a", 100, false);
    c.prove = [{ richiesta: "r-nuova", quando: 1 }];
    creaPacchetto(d, "capo");
    const r = rispondi(d, gino, conFrutti, "GET", "/macchinetta", {});
    vero(JSON.stringify(r.dati).includes("/libreria/file/nuova"), "la faccia uscita dalla prova gira anche li'");
  }),
);

/**
 * ⚠ **Chi gioca vede la faccia di quello che c'e' in gioco, e il file intero di
 * quello che ha sbloccato.** Chiesto l'11 settembre 2026 sera: «deve poter
 * vedere l'anteprima e quando la sblocca puo' vederla bene o ascoltarla». E
 * soprattutto quello che **non** deve uscire: una figurina non ancora in un
 * pacchetto non apre niente.
 */
prova("chi gioca vede la faccia di quello che e' in gioco, e intero quello che ha sbloccato", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const a = presa(d, "a", 100);
    a.prove = [{ richiesta: "r-nuova", quando: 1 }];
    creaPacchetto(d, "capo");
    presa(d, "dopo", 100);
    let visti = sguardiDelGioco(d, "gino", conFrutti);
    uguale(visti.get("f-a"), "anteprima", "la foto di una che sta in un pacchetto");
    uguale(visti.get("nuova"), "anteprima", "anche quella uscita dalle prove");
    uguale(visti.get("f-dopo"), undefined, "una non ancora in un pacchetto non si guarda");
    uguale(visti.get("vecchia"), undefined, "e una prova che non e' sua non c'entra");
    d.colleziona("gino", "a");
    visti = sguardiDelGioco(d, "gino", conFrutti);
    uguale(visti.get("f-a"), "tutto", "sbloccata: si guarda intera");
    uguale(visti.get("nuova"), "tutto");
  }),
);

process.exit(tirandoLeSomme("l'inventario e i pacchetti"));
