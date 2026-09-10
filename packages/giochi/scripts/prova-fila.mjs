/**
 * Le prove della fila: mandare una combinazione, prenderla, buttarla, e i
 * pacchetti.
 *
 * E' il pezzo per cui esiste tutto il resto — uno gioca, monta una riga, la
 * manda; l'admin la prova, le da' un prezzo e la tiene, o la butta. Vedi
 * `CONCETTI.md` §§ 8, 9 e 10.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-fila.mjs
 */

import {
  apriPacchetto,
  butta,
  classifica,
  Deposito,
  manda,
  MAX_ALLEGATI,
  MAX_PROVE,
  NienteDaFare,
  prendi,
  CAMBIO_EURO,
  regala,
  TAGLI,
  serieChiuse,
  rispondi,
  sommaDeiPezzi,
  statoMagazzino,
  tira,
} from "../dist/index.js";
import { writeFileSync } from "node:fs";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/** Un deposito con dentro uno che gioca ricco, e un giro gia' fatto. */
function tavolino(file) {
  const d = new Deposito(file);
  d.muovi("pino", 1000000);
  const giro = tira(d, "pino", "musica", "sempre", [], Math.random);
  return { d, giro, pezzi: giro.pezzi.map((p) => p.id) };
}

/**
 * Riempie il magazzino di combinazioni finte, gia' prese.
 *
 * Si scrivono dentro il deposito a mano invece di passare da `manda` e
 * `prendi`: qui si sta provando **i pacchetti**, e far girare la slot cento
 * volte per averne cento renderebbe la prova lenta e la farebbe cadere per
 * ragioni che coi pacchetti non c'entrano niente.
 */
function riempi(d, quante, prezzo) {
  const gia = d.collezionabili().length;
  for (let i = 0; i < quante; i++) {
    d.collezionabili().push({
      id: "finta_" + (gia + i),
      tavolo: "musica",
      pezzi: ["genere/finto-" + (gia + i)],
      impronta: "finta-" + (gia + i),
      prompt: "prompt finto " + (gia + i),
      titolo: "Finta " + (gia + i),
      daChi: "pino",
      quando: Date.now(),
      stato: "presa",
      numero: gia + i + 1,
      prezzo: typeof prezzo === "number" ? prezzo : 10,
    });
  }
}

/* --------------------------------------------------------------- mandare */

prova("una combinazione mandata sta in attesa, e non costa niente", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const prima = t.d.conto("pino").saldo;
    const r = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    const c = r.cosa;
    uguale(r.esito, "mandata");
    uguale(r.lire, 0, "mandare non deve costare");
    uguale(c.stato, "in-attesa");
    uguale(c.daChi, "pino");
    uguale(t.d.conto("pino").saldo, prima, "mandare non deve costare");
    uguale(t.d.conto("pino").mandate, 1);
    vero(c.titolo.length > 0, "la figurina ha un titolo: i nomi dei pezzi");
    vero(c.prompt.length > 0, "e un prompt vero da dare al modello");
  }),
);

/**
 * ⚠ **Si manda quello che si e' bloccato, e basta quello.** Cambiato il 10
 * settembre 2026: «deve inviare solo quelli bloccati e basta, anche se sono
 * solo 3».
 *
 * Prima la combinazione doveva essere completa — dodici pezzi — e gli altri
 * nove erano roba uscita a caso all'ultimo giro. Chi comanda si ritrovava a
 * giudicare mezza idea di qualcuno e mezza pescata dal mazzo.
 */
prova("si puo' mandare anche solo qualche pezzo, se sono quelli bloccati", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const tre = t.pezzi.slice(0, 3);
    const r = manda(t.d, "pino", "musica", "sempre", tre);
    uguale(r.esito, "mandata");
    uguale(r.cosa.pezzi.length, 3, "ne partono tre, non dodici");
    vero(r.cosa.prompt.length > 0, "e il prompt e' fatto con quei tre");
  }),
);

prova("senza niente bloccato non si manda", () =>
  conCartella((file) => {
    const t = tavolino(file);
    let detto = "";
    try {
      manda(t.d, "pino", "musica", "sempre", []);
    } catch (errore) {
      detto = errore.message;
      vero(errore instanceof NienteDaFare);
    }
    vero(detto.length > 0, "doveva dire di bloccare qualcosa");
  }),
);

prova("due pezzi dalla stessa casella non si mandano", () =>
  conCartella((file) => {
    const t = tavolino(file);
    let detto = "";
    try {
      manda(t.d, "pino", "musica", "sempre", [t.pezzi[0], t.pezzi[0]]);
    } catch (errore) {
      detto = errore.message;
    }
    vero(detto.length > 0, "sono lo stesso rullo due volte");
  }),
);

/**
 * ⚠ **L'ordine in cui arrivano non conta.**
 *
 * L'impronta si fa dagli id in fila, e se dipendesse da come li manda la pagina
 * la stessa identica combinazione mandata da due persone sarebbe due
 * combinazioni diverse — e la riscoperta, che e' meta' del gioco, non
 * scatterebbe mai.
 */
prova("mandati in un altro ordine sono la stessa combinazione", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const tre = t.pezzi.slice(0, 3);
    manda(t.d, "pino", "musica", "sempre", tre);
    let detto = "";
    try {
      manda(t.d, "gino", "musica", "sempre", [tre[2], tre[0], tre[1]]);
    } catch (errore) {
      detto = errore.message;
    }
    vero(detto.length > 0, "e' la stessa: non se ne fanno due");
    uguale(t.d.collezionabili().length, 1);
  }),
);

prova("finche' e' in attesa nessuno la rimanda, e lo dice subito", () =>
  conCartella((file) => {
    const t = tavolino(file);
    manda(t.d, "pino", "musica", "sempre", t.pezzi);
    let detto = "";
    try {
      // Anche da un'altra persona: l'identita' sono i pezzi, non chi la manda.
      manda(t.d, "gino", "musica", "sempre", t.pezzi);
    } catch (errore) {
      detto = errore.message;
      vero(errore instanceof NienteDaFare);
    }
    vero(detto.length > 0, "doveva rifiutare: nessuno ha ancora detto se vale");
    uguale(t.d.collezionabili().length, 1);
  }),
);

prova("chi ci arriva dopo, a una gia' presa, viene premiato come il primo", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const primo = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    const presa = prendi(t.d, "cammo", primo.cosa.id, 300);

    const prima = t.d.conto("gino").saldo;
    const secondo = manda(t.d, "gino", "musica", "sempre", t.pezzi);
    uguale(secondo.esito, "riscoperta");
    uguale(secondo.lire, presa.prezzo, "lo stesso premio di chi l'ha scoperta");
    uguale(t.d.conto("gino").saldo, prima + presa.prezzo);
    vero(
      t.d.conto("gino").collezione.indexOf(primo.cosa.id) >= 0,
      "e la figurina va in collezione anche a lui",
    );
    uguale(t.d.collezionabili().length, 1, "ma nel magazzino resta una sola");
    uguale(t.d.conto("gino").prese, 0, "non l'ha scoperta lui: in classifica non conta");
  }),
);

prova("rimandare una che hai gia' e' un buco nell'acqua, e costa due lire", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const primo = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    prendi(t.d, "cammo", primo.cosa.id, 300);

    const prima = t.d.conto("pino").saldo;
    const ancora = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    uguale(ancora.esito, "gia-tua");
    uguale(ancora.lire, -2);
    uguale(t.d.conto("pino").saldo, prima - 2);
    uguale(t.d.conto("pino").collezione.length, 1, "e non se la prende due volte");
  }),
);

prova("il premio della riscoperta e' quello vero, non uno fisso", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const primo = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    const presa = prendi(t.d, "cammo", primo.cosa.id, 1234);
    vero(presa.prezzo > 1234, "il bonus si somma ai pezzi, non li sostituisce");
    const prima = t.d.conto("gino").saldo;
    const secondo = manda(t.d, "gino", "musica", "sempre", t.pezzi);
    uguale(secondo.lire, presa.prezzo);
    uguale(t.d.conto("gino").saldo, prima + presa.prezzo);
  }),
);

/*
 * ⚠ **Qui c'erano due prove della regola vecchia, e sono cadute apposta il
 * 10 settembre 2026.**
 *
 * Dicevano che una combinazione doveva essere **completa** — dodici pezzi, uno
 * per casella, in ordine — e che mezza non valeva. Adesso si manda quello che
 * si e' bloccato, anche tre pezzi: vedi «manda» nel banco, e le prove nuove piu'
 * su.
 *
 * Le due cose che controllavano restano controllate, ma dette bene:
 *
 * - «un genere nella casella della voce» non e' piu' un caso possibile: un
 *   pezzo **ha** il suo rullo addosso e finisce dov'e' suo, non dove lo mette
 *   chi chiama. Quello che resta da vietare e' **due pezzi dalla stessa
 *   casella**, e ha la sua prova.
 * - «mezza combinazione» adesso e' esattamente quello che si vuole mandare.
 *   Quello che non si puo' mandare e' **niente**, e ha la sua prova.
 *
 * Una prova che cade quando cambia una regola ha fatto il suo mestiere: se
 * fossero rimaste verdi, vorrebbe dire che non guardavano niente.
 */

/* ------------------------------------------------------ prendere e buttare */

prova("prendere: paga chi l'ha mandata, e gliela mette in collezione", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const prima = t.d.conto("pino").saldo;
    // ⚠ Il terzo numero e' il **bonus**, non il prezzo: il prezzo e' la somma
    // dei dodici pezzi piu' quello. Chiesto il 10 settembre 2026.
    const base = sommaDeiPezzi(t.d, c);
    vero(base > 0, "dodici pezzi qualcosa devono valere");
    const presa = prendi(t.d, "cammo", c.id, 300);
    uguale(presa.stato, "presa");
    uguale(presa.prezzo, base + 300, "i pezzi piu' il bonus");
    uguale(presa.numero, 1, "il primo posto in magazzino e' l'uno");
    uguale(presa.daAdmin, "cammo");
    uguale(t.d.conto("pino").saldo, prima + base + 300, "chi l'ha mandata viene pagato");
    uguale(t.d.conto("pino").prese, 1);
    vero(t.d.conto("pino").collezione.indexOf(c.id) >= 0, "chi l'ha inventata ce l'ha");
    uguale(t.d.magazzino().length, 1);
  }),
);

/**
 * ⚠ **Gli allegati sono piu' d'uno**, dal 10 settembre 2026: «alla fine puo'
 * selezionare uno o piu' elementi generati da includere nel pacchetto; lascia
 * comunque la possibilita' di allegare ulteriori max 4 file dalla suite».
 *
 * Si prova che ci arrivino tutti **nell'ordine dato** — il primo e' la faccia
 * della scheda nello shop — e che oltre il tetto non ne entrino.
 */
prova("si attaccano piu' cose, e la prima resta la prima", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const presa = prendi(t.d, "cammo", c.id, 10, [
      { id: "a", mime: "image/png", url: "/uno.png" },
      { id: "b", mime: "image/png", url: "/due.png" },
      { id: "c", mime: "audio/mpeg", url: "/tre.mp3" },
    ]);
    uguale(presa.allegati.length, 3, "ci sono tutte e tre");
    uguale(presa.allegati[0].url, "/uno.png", "la prima e' la faccia della scheda");
    uguale(presa.allegati[2].mime, "audio/mpeg", "e ognuna si porta il suo tipo");
  }),
);

prova("oltre otto allegati non se ne attaccano", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const troppe = [];
    for (let i = 0; i < 12; i++) troppe.push({ id: "x" + i, mime: "image/png", url: "/x" + i + ".png" });
    const presa = prendi(t.d, "cammo", c.id, 10, troppe);
    uguale(presa.allegati.length, MAX_ALLEGATI, "il tetto e' otto: quattro nate e quattro scelte");
    uguale(presa.allegati[0].url, "/x0.png", "e si tengono le prime, non le ultime");
  }),
);

prova("una copertina senza niente da coprire non si attacca", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const presa = prendi(t.d, "cammo", c.id, 10, [], {
      id: "cop",
      mime: "image/png",
      url: "/cop.png",
    });
    vero(!presa.copertina, "una figurina non promette una canzone che non c'e'");
  }),
);

prova("su una gia' decisa non si decide due volte", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    prendi(t.d, "cammo", c.id, 100);
    let fermato = true;
    try {
      prendi(t.d, "cammo", c.id, 5000);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "non si puo' ripagare la stessa combinazione");
    uguale(t.d.conto("pino").prese, 1, "e non si conta due volte");
  }),
);

prova("buttarla: il motivo c'e' sempre, anche se non lo scrivi", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const b = butta(t.d, "cammo", c.id, "   ");
    uguale(b.stato, "buttata");
    vero(b.motivo.length > 0, "un no senza perche' non insegna niente");
    uguale(t.d.magazzino().length, 0);
    uguale(t.d.conto("pino").prese, 0, "una buttata non si conta");
  }),
);

prova("una buttata non si puo' rimandare uguale", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    butta(t.d, "cammo", c.id, "non mi piace");
    let fermato = true;
    try {
      manda(t.d, "pino", "musica", "sempre", t.pezzi);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "se no la stessa riga rifiutata torna ogni giorno");
  }),
);

/* ------------------------------------------------------------ i pacchetti */

/* ------------------------------------------------- provarla, fino a quattro */

/**
 * ⚠ **Il giro completo del tasto «provala», dalla porta.**
 *
 * Queste passano da `rispondi()` e non dal banco, ed e' voluto: il tetto delle
 * quattro prove e il tornare indietro dei file stanno nelle **rotte**, e una
 * prova che chiama il banco non li tocca nemmeno.
 *
 * Il contorno e' finto e fa due cose sole: dice di si' quando gli si chiede di
 * generare, e sa dire cosa e' uscito da una richiesta. E' esattamente quello
 * che fa il gateway con la libreria vera.
 */
function contornoFinto(prodotti) {
  const partite = [];
  return {
    partite,
    nomeDi: (id) => id,
    genera: () => {
      const id = "r" + (partite.length + 1);
      partite.push(id);
      return { id };
    },
    fruttiDi: (richiesta) => prodotti[richiesta] ?? [],
  };
}

const CAMMO = { id: "cammo", nome: "Cammo", admin: true };

prova("provarla parte, e si puo' rifare fino a quattro volte", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const contorno = contornoFinto({});

    for (let i = 1; i <= MAX_PROVE; i++) {
      const r = rispondi(t.d, CAMMO, contorno, "POST", "/prova", { id: c.id });
      uguale(r.codice, 200, "la numero " + i + " deve partire");
      uguale(r.dati.quante, i, "e il conto sale");
    }
    uguale(contorno.partite.length, MAX_PROVE, "quattro generazioni vere, non una");

    const quinta = rispondi(t.d, CAMMO, contorno, "POST", "/prova", { id: c.id });
    uguale(quinta.codice, 409, "la quinta no");
    vero(String(quinta.dati.errore).indexOf("scegli fra quelle") > 0, "e dice perche'");
    uguale(contorno.partite.length, MAX_PROVE, "e non ne fa partire un'altra");
  }),
);

prova("quello che e' uscito torna sulla card, senza aprire la galleria", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    // La prima e' pronta, la seconda e' ancora in forno.
    const contorno = contornoFinto({
      r1: [{ id: "f1", titolo: "la clip", mime: "audio/mpeg", url: "/libreria/file/f1" }],
    });
    rispondi(t.d, CAMMO, contorno, "POST", "/prova", { id: c.id });
    rispondi(t.d, CAMMO, contorno, "POST", "/prova", { id: c.id });

    const fila = rispondi(t.d, CAMMO, contorno, "GET", "/fila", {});
    uguale(fila.codice, 200);
    const mia = fila.dati.inAttesa[0];
    uguale(mia.prove.length, 2, "due tentativi");
    uguale(mia.prove[0].usciti.length, 1, "il primo ha prodotto");
    uguale(mia.prove[0].usciti[0].url, "/libreria/file/f1", "e si sa dove si sente");
    uguale(mia.prove[1].usciti.length, 0, "il secondo e' ancora in forno");
  }),
);

prova("senza niente che sappia generare, lo dice invece di fingere", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const spoglio = { nomeDi: (id) => id };
    const r = rispondi(t.d, CAMMO, spoglio, "POST", "/prova", { id: c.id });
    uguale(r.codice, 501, "una sala giochi senza suite attorno non genera");
  }),
);

prova("dalla porta si attaccano piu' cose in una volta", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi).cosa;
    const contorno = contornoFinto({});
    const r = rispondi(t.d, CAMMO, contorno, "POST", "/prendi", {
      id: c.id,
      bonus: 20,
      allegati: [
        { id: "f1", url: "/uno.png", mime: "image/png" },
        { id: "f2", url: "/due.png", mime: "image/png" },
      ],
    });
    uguale(r.codice, 200);
    uguale(r.dati.allegati.length, 2, "arrivano tutte e due");
    uguale(r.dati.allegati[0].url, "/uno.png");
  }),
);

/**
 * ⚠ **Un file scritto da ieri si apre lo stesso.**
 *
 * `allegato` e `provata` erano singoli fino al 10 settembre 2026. Chi giocava
 * da prima ha quella forma sul disco, e la conversione si fa **leggendo** —
 * vedi `rimettiInRiga` nel deposito. Se questa prova cade, a qualcuno sparisce
 * la copertina di una figurina che aveva gia'.
 */
prova("un file della versione di ieri si rilegge nella forma di adesso", () =>
  conCartella((file) => {
    writeFileSync(
      file,
      JSON.stringify({
        versione: 1,
        conti: [],
        collezionabili: [
          {
            id: "vecchia",
            tipo: "prompt",
            titolo: "una di ieri",
            impronta: "x",
            daChi: "pino",
            quando: 1,
            stato: "presa",
            prezzo: 50,
            allegato: { id: "f1", mime: "image/png", url: "/vecchia.png" },
            provata: { richiesta: "r9", quando: 2 },
          },
        ],
      }),
      "utf8",
    );
    const d = new Deposito(file);
    const c = d.perId("vecchia");
    uguale(c.allegati.length, 1, "l'allegato singolo diventa un elenco di uno");
    uguale(c.allegati[0].url, "/vecchia.png", "e punta dove puntava");
    uguale(c.prove.length, 1, "e la prova singola pure");
    uguale(c.prove[0].richiesta, "r9");
    vero(c.allegato === undefined, "il campo vecchio se ne va: uno solo dice la verita'");
  }),
);

prova("una serie si compra solo quando e' chiusa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 10, perPacchetto: 3, costoPacchetto: 100 });
    d.muovi("pino", 100000);
    riempi(d, 9);
    uguale(serieChiuse(d), 0, "nove su dieci non chiudono niente");
    let fermato = true;
    try {
      apriPacchetto(d, "pino", 1, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "non si compra una serie aperta");

    riempi(d, 1);
    uguale(serieChiuse(d), 1, "col decimo la serie si chiude");
  }),
);

prova("il pacchetto costa, da' le figurine, e i doppioni pagano", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 2, perPacchetto: 3, costoPacchetto: 100 });
    d.muovi("pino", 100000);
    riempi(d, 2, 40);
    uguale(serieChiuse(d), 1);

    const prima = d.conto("pino").saldo;
    /**
     * ⚠ **Col dado in mano, non a caso.** Prima questa prova girava con
     * `Math.random`: due figurine e tre pescate, e una volta su quattro
     * uscivano tutte e tre uguali — la prova diventava rossa senza che niente
     * fosse rotto. Una prova che fallisce a caso e' peggio di una prova che
     * manca: insegna a non fidarsi delle prove.
     *
     * Cosi' invece si sa cosa esce: prima, seconda, prima. Due diverse e un
     * doppione, sempre.
     */
    const pacco = apriPacchetto(d, "pino", 1, dado(0.1, 0.9, 0.1));
    uguale(pacco.figurine.length, 3);
    uguale(pacco.costo, 100);
    vero(pacco.figurine.some((f) => f.doppione), "tre pescate su due figurine: un doppione ci vuole");
    vero(pacco.vinto > 0, "il doppione deve pagare invece di deludere");
    uguale(pacco.saldo, prima - 100 + pacco.vinto);
    uguale(d.conto("pino").collezione.length, 2, "le figurine diverse sono due");
  }),
);

prova("senza lire non si comprano pacchetti", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 1, costoPacchetto: 500 });
    riempi(d, 1);
    d.muovi("spiantato", -99999);
    let fermato = true;
    try {
      apriPacchetto(d, "spiantato", 1, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "doveva rifiutare");
  }),
);

prova("girando ogni tanto cade una figurina, e mai un doppione", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // «una ogni 1» col dado a zero: cade sempre, finche' ce n'e' una nuova.
    d.cambiaImpostazioni({ unaOgniGiri: 1 });
    d.muovi("pino", 100000);
    riempi(d, 2, 10);

    const visti = new Set();
    for (let i = 0; i < 6; i++) {
      const giro = tira(d, "pino", "musica", "sempre", [], dado(0));
      if (giro.regalo) visti.add(giro.regalo.id);
    }
    uguale(visti.size, 2, "le due del magazzino, una volta ciascuna");
    uguale(d.conto("pino").collezione.length, 2, "e nessun doppione regalato");
  }),
);

prova("il magazzino sa dire a che punto sta", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 10 });
    riempi(d, 12);
    const stato = statoMagazzino(d);
    uguale(stato.prese, 12);
    uguale(stato.serieChiuse, 1);
    uguale(stato.allaProssimaSerie, 8, "ne mancano otto alla seconda serie");
  }),
);

/* ------------------------------------------------------------ classifica */

prova("davanti sta chi si e' fatto prendere le combinazioni", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("riccone", 500000);
    d.segnaGiro("riccone", 9000);
    d.conto("artista").prese = 2;
    const c = classifica(d);
    uguale(c[0].chi, "artista", "due prese battono un colpo grosso e un conto pieno");
  }),
);

/* --------------------------------------------------------------- i regali */

prova("chi comanda manda lire, e chi le riceve lo viene a sapere", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const prima = d.conto("pino").saldo;
    const fatto = regala(d, "capo", "pino", 100, "Bella quella riga");
    uguale(d.conto("pino").saldo, prima + 100);
    uguale(d.conto("pino").regali, 100, "e si tiene il conto di quanto gli e' stato dato");
    uguale(fatto.regalo.perche, "Bella quella riga");
    uguale(fatto.regalo.daAdmin, "capo");
    vero(fatto.regalo.quando > 0, "col suo quando: e' quello che dice se e' nuovo");
  }),
);

prova("un regalo senza due parole dentro ne ha comunque", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const fatto = regala(d, "capo", "pino", 5, "   ");
    vero(fatto.regalo.perche.length > 0, "un regalo muto si legge come un guasto");
  }),
);

prova("non si regalano zero lire, ne' dieci milioni in un colpo", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    for (const quanto of [0, -50, 9999999]) {
      let caduta = null;
      try {
        regala(d, "capo", "pino", quanto, "");
      } catch (e) {
        caduta = e;
      }
      vero(caduta instanceof NienteDaFare, "rifiutato: " + quanto);
    }
    uguale(d.conto("pino").saldo, d.impostazioni().regaloIniziale, "e il saldo non si e' mosso");
  }),
);

prova("a se stessi si puo'", () =>
  conCartella((file) => {
    // Il divieto c'era e l'ha tolto Cammo il 10 settembre 2026: «da android non
    // posso mandare lire a me stesso». Chi comanda il banco puo' gia' cambiare
    // tutti i numeri del gioco: il divieto non impediva niente.
    const d = new Deposito(file);
    const prima = d.conto("capo").saldo;
    regala(d, "capo", "capo", 100, "me le merito");
    uguale(d.conto("capo").saldo, prima + 100);
  }),
);

prova("i tagli sono euro, contati in lire", () => {
  // Chiesto cosi' il 10 settembre 2026: «dovevano essere l'equivalente in lire
  // della cifra che ti ho detto», cioe' da 2 a 500 euro.
  uguale(TAGLI.length, 8);
  uguale(TAGLI[0], Math.round(2 * CAMBIO_EURO), "il primo tasto e' due euro");
  uguale(TAGLI[TAGLI.length - 1], Math.round(500 * CAMBIO_EURO), "l'ultimo e' cinquecento");
  vero(TAGLI.every((t) => Number.isInteger(t) && t > 0), "tutti numeri interi");
  for (let i = 1; i < TAGLI.length; i++) vero(TAGLI[i] > TAGLI[i - 1], "e vanno in salita");
});

prova("i tagli si sommano fino al tetto, e oltre no", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // Cinque volte il tasto piu' grosso e' il tetto: si batte sui tasti come su
    // una cassa, ma venti pressioni per sbaglio non passano.
    let caduta = null;
    try {
      regala(d, "capo", "pino", TAGLI[TAGLI.length - 1] * 6, "ops");
    } catch (e) {
      caduta = e;
    }
    vero(caduta instanceof NienteDaFare, "sopra il tetto si ferma");
  }),
);

process.exit(tirandoLeSomme("la fila e i pacchetti"));
