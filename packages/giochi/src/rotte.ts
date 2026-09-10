/**
 * Le rotte della sala giochi: cosa si puo' chiedere al PC, e chi lo puo'
 * chiedere.
 *
 * ⚠ **E' una funzione, non un server.** Non apre porte, non conosce HTTP,
 * non sa cos'e' un token. Prende «chi sei», «cosa chiedi» e «cosa mi porti», e
 * torna un numero e un oggetto. Cosi' la stessa identica funzione la chiama il
 * gateway della suite **e** il serverino delle prove: c'e' una sola idea di
 * cosa si puo' fare, e nessuna delle due puo' divergere dall'altra.
 *
 * Chi sei lo decide chi chiama, non questo file: nella suite lo dice il token
 * del dispositivo, e il ruolo `admin` e' quello della suite. Qui dentro
 * `chi.admin` si legge e basta — se un giorno si potesse mentire su quello, il
 * problema non sarebbe qui.
 */

import {
  apriPacchetto,
  butta,
  regala,
  TAGLI,
  TAGLI_BONUS,
  classifica,
  compra,
  gradoDiFigurina,
  MAX_ALLEGATI,
  MAX_PROVE,
  mettiInVetrina,
  prezzoConsigliato,
  sommaDeiPezzi,
  togliDallaVetrina,
  vetrina,
  manda,
  mandaDallaLibreria,
  NienteDaFare,
  prendi,
  serie,
  serieChiuse,
  statoMagazzino,
  tira,
} from "./banco";
import type { Deposito } from "./deposito";
import { EPOCHE, GRADI, TETTO_FIGURINE, lire, versoIlProssimo } from "./regole";
import { rulliDi } from "./rulli";
import type { Collezionabile, Era, Grado, Tavolo, TipoCollezionabile } from "./tipi";

/** Chi sta chiedendo. Nella suite e' il dispositivo accoppiato. */
export interface Chi {
  id: string;
  nome: string;
  admin: boolean;
}

/**
 * Quello che il gioco non sa e deve chiedere a chi lo ospita.
 *
 * I **nomi** delle persone non stanno nel gioco: stanno nella suite, insieme
 * alle facce e ai permessi. Tenerne una copia qui vorrebbe dire che il giorno
 * che uno cambia nome, in classifica resta quello vecchio.
 */
export interface Contorno {
  nomeDi(id: string): string;
  /** La faccia, se chi ci ospita ne ha una. Serve solo alla classifica. */
  facciaDi?(id: string): string | undefined;
  /**
   * Dove si vede una cosa della libreria della suite: l'indirizzo del file.
   *
   * Il gioco non tiene file — tiene il numero di targa — e per mostrare una
   * foto vinta deve chiedere a chi ospita dove sta. Senza, le figurine che non
   * sono prompt si vedono solo come titolo.
   */
  indirizzoLibreria?(id: string): string | undefined;
  /**
   * Le ultime cose prodotte dalla suite, per attaccarne una a una figurina.
   *
   * ⚠ Chiesto il 10 settembre 2026: «lincare facilmente, non come ora,
   * l'immagine dalla suite». Prima chi comanda doveva **scrivere a mano**
   * l'indirizzo del file in una casella di testo: vuol dire aprire la galleria,
   * trovare la foto, copiarne l'indirizzo e incollarlo — quattro gesti in due
   * finestre, ogni volta. Con questo la pagina fa vedere le ultime sessanta e
   * se ne sceglie una col dito.
   *
   * Torna niente se chi ospita non ha una libreria.
   */
  elencoLibreria?(chi: string, quante: number): VoceLibreria[];
  /**
   * Chi c'e' in casa: tutte le persone della suite, non solo chi ha gia'
   * giocato.
   *
   * ⚠ Senza questo, «manda lire» mostrava solo chi aveva **gia' aperto la
   * sala giochi almeno una volta** — i conti nascono all'apertura. Cioe':
   * proprio la persona a cui vuoi mandare due lire per farla entrare non
   * comparirebbe nell'elenco. Il conto si apre da solo quando le lire arrivano.
   */
  gente?(): { id: string; nome: string; admin?: boolean }[];
  /**
   * Fa partire una generazione con questo prompt, per la stessa strada da cui
   * passano le richieste del telefono.
   *
   * ⚠ **Il gioco non sa niente di modelli.** Dice solo «questo e' un prompt
   * di musica» oppure «di immagini», e chi ospita sa cosa vuol dire: sessanta
   * secondi strumentali con ACE-Step Turbo, o un 4:3 con FLUX.2 9B. Se un
   * giorno cambia il modello buono, cambia li' — non in dodici posti.
   *
   * Torna niente se chi ospita non sa generare (il banco di prova, per esempio).
   */
  genera?(
    chi: string,
    tavolo: "immagini" | "musica",
    cosa: { prompt: string; titolo: string },
  ): { id: string; dove?: string } | null;
  /**
   * **Cosa e' uscito da una generazione**, quando e' pronta.
   *
   * ⚠ Chiesto il 10 settembre 2026: «quando un admin manda a generare un
   * contenuto, quando pronto lo deve vedere gia' allegato alla card in modo da
   * controllarlo». Prima `genera` faceva partire il lavoro e finiva li': la
   * pagina diceva «la trovi in galleria», e chi comanda doveva aprire la
   * galleria, cercarla, tornare qui e riattaccarla a mano. Due finestre per
   * guardare una cosa nata da questo tasto.
   *
   * ⚠ **Non serve un registro nuovo.** Quando una generazione finisce, la
   * libreria della suite scrive nei metadati del file da quale richiesta e'
   * nato: «cosa e' uscito da questa prova» e' una domanda a cui sa gia'
   * rispondere. Il gioco tiene il numero di targa della richiesta e chiede.
   *
   * Torna vuoto finche' non e' pronta, e vuoto per sempre se chi ospita non ha
   * una libreria (il banco di prova).
   */
  fruttiDi?(richiesta: string): VoceLibreria[];
}

/** Una cosa della libreria della suite, come la vede la sala giochi. */
export interface VoceLibreria {
  id: string;
  /** Come si chiama, per chi legge. */
  titolo: string;
  mime: string;
  /** Dove si guarda per intero. */
  url: string;
  /** Il francobollo, se ce l'ha: per i video e i brani non e' l'url. */
  anteprima?: string;
  quando?: number;
}

export interface Risposta {
  codice: number;
  dati: unknown;
}

const OK = (dati: unknown): Risposta => ({ codice: 200, dati });
const NO = (codice: number, perche: string): Risposta => ({ codice, dati: { errore: perche } });

/** Il tavolo chiesto, o quello di partenza. Musica: e' la prima slot. */
function tavoloDi(corpo: Record<string, unknown>): Tavolo {
  return corpo["tavolo"] === "immagini" ? "immagini" : "musica";
}

/** L'epoca chiesta, o tutte. Una scritta a caso vale come «sempre». */
function eraDi(corpo: Record<string, unknown>): Era {
  const detta = String(corpo["era"] ?? "sempre");
  return (EPOCHE.find((e) => e.id === detta)?.id ?? "sempre") as Era;
}

function numero(cosa: unknown, seManca: number): number {
  const n = typeof cosa === "number" ? cosa : Number(cosa);
  return Number.isFinite(n) ? n : seManca;
}

/**
 * Una figurina come la puo' vedere **questa** persona.
 *
 * Chi non ce l'ha in collezione vede il titolo, il prezzo e chi l'ha fatta, ma
 * **non il prompt** e **non il file**: se no non ci sarebbe niente da
 * sbloccare, e l'album sarebbe un elenco invece di una raccolta. Chi comanda
 * vede tutto, perche' deve poterle controllare.
 */
function vestita(c: Collezionabile, contorno: Contorno, scoperta: boolean) {
  const grado = gradoDiFigurina(c);
  const dove = (l?: { id: string; url?: string }) =>
    !l ? "" : (l.url ?? (contorno.indirizzoLibreria ? (contorno.indirizzoLibreria(l.id) ?? "") : ""));
  return {
    id: c.id,
    tipo: c.tipo,
    titolo: c.titolo,
    prompt: scoperta ? (c.prompt ?? "") : "",
    /** Dove si guarda o si ascolta, per le figurine che non sono prompt. */
    dove: scoperta ? dove(c.libreria) : "",
    mime: c.libreria?.mime ?? "",
    /**
     * Le cose venute fuori da quel prompt, quelle che chi comanda ha tenuto.
     *
     * Si vedono **anche da coperta**, ed e' voluto: nello shop uno deve poter
     * guardare cosa sta comprando. Il prompt no — quello resta nascosto finche'
     * non e' tuo.
     *
     * La prima e' la copertina della scheda; le altre stanno dietro.
     */
    allegati: (c.allegati ?? []).map((a) => ({ url: dove(a), mime: a.mime })),
    /** La copertina di un allegato che non si guarda: un brano, un video. */
    copertina: dove(c.copertina),
    /**
     * Quante volte e' gia' stata mandata a generare, e cosa ne e' uscito.
     *
     * Il conto serve alla pagina per sapere se il tasto «rigenera» e' ancora
     * vivo (`MAX_PROVE`); i frutti sono i file gia' pronti, che si guardano
     * sulla card senza aprire la galleria.
     */
    prove: (c.prove ?? []).map((p) => ({
      richiesta: p.richiesta,
      quando: p.quando,
      usciti: (contorno.fruttiDi ? contorno.fruttiDi(p.richiesta) : []).map((v) => ({
        id: v.id,
        titolo: v.titolo,
        mime: v.mime,
        url: v.url,
        anteprima: v.anteprima ?? "",
      })),
    })),
    inVetrina: c.inVetrina === true,
    prezzoVetrina: c.prezzoVetrina ?? 0,
    scoperta,
    numero: c.numero ?? 0,
    prezzo: c.prezzo ?? 0,
    grado,
    stato: c.stato,
    motivo: c.motivo ?? "",
    daChi: c.daChi,
    daNome: contorno.nomeDi(c.daChi),
    quando: c.quando,
    tavolo: c.tavolo ?? "",
    era: c.era ?? "",
  };
}

/**
 * Risponde a una richiesta della sala giochi.
 *
 * `percorso` e' senza il pezzo davanti: chi ospita ha gia' tolto `/giochi`.
 */
export function rispondi(
  deposito: Deposito,
  chi: Chi,
  contorno: Contorno,
  metodo: string,
  percorso: string,
  corpo: Record<string, unknown>,
): Risposta {
  try {
    /* ------------------------------------------------------------- chi sono */

    if (metodo === "GET" && (percorso === "/io" || percorso === "/")) {
      const conto = deposito.conto(chi.id);
      const imp = deposito.impostazioni();
      return OK({
        chi: chi.id,
        nome: chi.nome,
        admin: chi.admin,
        saldo: conto.saldo,
        saldoScritto: lire(conto.saldo),
        conto: {
          giri: conto.giri,
          mandate: conto.mandate,
          prese: conto.prese,
          collezione: conto.collezione.length,
          colpoGrosso: conto.colpoGrosso,
          migliorGrado: conto.migliorGrado ?? "",
          esperienza: conto.esperienza,
          ...versoIlProssimo(conto.esperienza, imp.perIlLivello),
        },
        // I numeri che si vedono: quanto costa una cosa, non come si pesca.
        costi: {
          giro: imp.costoGiro,
          pacchetto: imp.costoPacchetto,
          perPacchetto: imp.perPacchetto,
          perSerie: imp.perSerie,
          perIlLivello: imp.perIlLivello,
        },
        gradi: GRADI.map((g) => ({ ...g, inVetrina: prezzoConsigliato(g.id) })),
        /**
         * ⚠ **Fin dove si puo' scegliere, oggi.** Vedi `TETTO_FIGURINE`.
         *
         * I gradi restano tutti e dodici — servono ai rulli, e la pagina li
         * legge da `gradi` per sapere di che colore e' un pezzo. Questo dice
         * un'altra cosa: fin dove arrivano i **tasti** con cui una persona
         * assegna un grado a una cosa presa. Due elenchi diversi sarebbero due
         * verita' da tenere allineate a mano.
         */
        tettoFigurine: TETTO_FIGURINE,
        epoche: EPOCHE,
        tavoli: [
          { id: "musica", nome: "Musica", rulli: rulliDi("musica") },
          { id: "immagini", nome: "Immagini", rulli: rulliDi("immagini") },
        ],
        magazzino: statoMagazzino(deposito),
        /**
         * L'ultimo regalo, se ce n'e' uno.
         *
         * Lo manda sempre; e' la pagina che si ricorda se l'ha gia' fatto
         * vedere. Tenere qui un «visto/non visto» vorrebbe dire una scrittura
         * su disco a ogni apertura, per una cosa che riguarda uno schermo.
         */
        regalo: deposito.conto(chi.id).ultimoRegalo ?? null,
        tagli: TAGLI,
        tagliBonus: TAGLI_BONUS,
        /**
         * I due tetti della card: quante volte si puo' far generare, e quante
         * cose si possono attaccare in tutto. Li dice il PC perche' e' il PC
         * che li fa rispettare — la pagina li usa solo per spegnere un tasto
         * al momento giusto invece di far premere e poi dire di no.
         */
        maxProve: MAX_PROVE,
        maxAllegati: MAX_ALLEGATI,
      });
    }

    /* ---------------------------------------------------------------- girare */

    if (metodo === "POST" && percorso === "/gira") {
      const bloccati = Array.isArray(corpo["bloccati"])
        ? (corpo["bloccati"] as unknown[]).map((x) => (typeof x === "string" && x ? x : null))
        : [];
      const giro = tira(deposito, chi.id, tavoloDi(corpo), eraDi(corpo), bloccati, Math.random);
      return OK({
        ...giro,
        saldoScritto: lire(giro.saldo),
        regalo: giro.regalo ? vestita(giro.regalo, contorno, true) : null,
      });
    }

    /* --------------------------------------------------------------- mandare */

    if (metodo === "POST" && percorso === "/manda") {
      const pezzi = Array.isArray(corpo["pezzi"]) ? (corpo["pezzi"] as string[]) : [];
      const esito = manda(deposito, chi.id, tavoloDi(corpo), eraDi(corpo), pezzi);
      return OK({
        esito: esito.esito,
        detto: esito.detto,
        lire: esito.lire,
        saldo: esito.saldo,
        saldoScritto: lire(esito.saldo),
        cosa: vestita(esito.cosa, contorno, true),
      });
    }

    /**
     * Una cosa della suite mandata a controllare: una foto, un brano, un video.
     *
     * La porta lasciata aperta di proposito. Chi la usa e' chi ospita — la
     * galleria della suite, con un tasto «mandala in sala giochi» — non la
     * pagina della slot.
     */
    if (metodo === "POST" && percorso === "/manda-dalla-libreria") {
      const c: Collezionabile = mandaDallaLibreria(
        deposito,
        chi.id,
        String(corpo["tipo"] ?? "immagine") as TipoCollezionabile,
        String(corpo["titolo"] ?? ""),
        {
          id: String(corpo["idLibreria"] ?? ""),
          mime: String(corpo["mime"] ?? ""),
          comeEraFatta: corpo["comeEraFatta"] ? String(corpo["comeEraFatta"]) : undefined,
        },
      );
      return OK(vestita(c, contorno, true));
    }

    if (metodo === "GET" && percorso === "/mie") {
      const conto = deposito.conto(chi.id);
      const mie = deposito
        .collezionabili()
        .filter((c) => c.daChi === chi.id)
        .sort((a, b) => b.quando - a.quando);
      /**
       * ⚠ **Le buttate stanno in un mazzo loro.**
       *
       * Chiesto il 10 settembre 2026: «i prompt buttati devono essere messi in
       * una categoria a parte e scomparire, e l'utente lo vede come perdente».
       *
       * Prima stavano in fila con le altre, e una riga grigia in mezzo a quelle
       * prese e' la cosa che si guarda per prima: la pagina delle proprie cose
       * diventava l'elenco dei propri no. Adesso il mazzo che si apre e' quello
       * che sta andando bene; i biglietti perdenti stanno sotto, chiusi, e chi
       * vuole leggere il perche' li apre.
       */
      const mandate = mie.filter((c) => c.stato !== "buttata").map((c) => vestita(c, contorno, true));
      const perdenti = mie.filter((c) => c.stato === "buttata").map((c) => vestita(c, contorno, true));
      const collezione = deposito
        .magazzino()
        .filter((c) => conto.collezione.includes(c.id))
        .map((c) => vestita(c, contorno, true));
      /**
       * ⚠ **I tre numeri di chi gioca.** Chiesti il 10 settembre 2026: «un
       * counter con il totale dell'utente: il guadagno, e quanti prompt sono
       * stati accettati e quanti sono stati perdenti».
       *
       * Il conto lo fa il PC e non la pagina, ed e' la solita regola: dove ci
       * sono soldi di mezzo somma chi tiene i soldi. Una pagina che si somma
       * da sola quanto ha guadagnato e' una pagina a cui si puo' far dire un
       * altro numero.
       *
       * ⚠ Il **guadagno** e' quello che hanno pagato per le cose prese, ed e'
       * un'altra cosa da `esperienza` (che si prende girando) e da `saldo`
       * (che e' quello che resta dopo aver speso). Sono tre numeri diversi e
       * non se ne puo' usare uno al posto di un altro.
       */
      const prese = mie.filter((c) => c.stato === "presa");
      const conta = {
        guadagno: prese.reduce((somma, c) => somma + (c.prezzo ?? 0), 0),
        accettate: prese.length,
        perdenti: perdenti.length,
        inAttesa: mie.filter((c) => c.stato === "in-attesa").length,
      };
      return OK({ mandate, perdenti, collezione, conta });
    }

    /* ------------------------------------------------------------- l'album */

    if (metodo === "GET" && percorso === "/album") {
      const conto = deposito.conto(chi.id);
      const chiuse = serieChiuse(deposito);
      const quale = Math.max(1, Math.min(chiuse || 1, numero(corpo["serie"], chiuse || 1)));
      const dentro = serie(deposito, quale).map((c) =>
        vestita(c, contorno, conto.collezione.includes(c.id) || chi.admin),
      );
      return OK({ serie: quale, chiuse, figurine: dentro, magazzino: statoMagazzino(deposito) });
    }

    if (metodo === "POST" && percorso === "/pacchetto") {
      const apertura = apriPacchetto(deposito, chi.id, numero(corpo["serie"], 1), Math.random);
      return OK({
        ...apertura,
        saldoScritto: lire(apertura.saldo),
        figurine: apertura.figurine.map((f) => ({
          ...vestita(f.cosa, contorno, true),
          doppione: f.doppione,
          lire: f.lire,
        })),
      });
    }

    /* ---------------------------------------------------------------- lo shop */

    if (metodo === "GET" && percorso === "/vetrina") {
      const conto = deposito.conto(chi.id);
      return OK({
        roba: vetrina(deposito).map((c) => ({
          ...vestita(c, contorno, conto.collezione.includes(c.id) || chi.admin),
          mia: conto.collezione.includes(c.id),
          costo: c.prezzoVetrina ?? 0,
        })),
      });
    }

    if (metodo === "POST" && percorso === "/compra") {
      const acquisto = compra(deposito, chi.id, String(corpo["id"] ?? ""));
      return OK({
        cosa: vestita(acquisto.cosa, contorno, true),
        costo: acquisto.costo,
        saldo: acquisto.saldo,
        saldoScritto: lire(acquisto.saldo),
      });
    }

    if (percorso === "/vetrina/metti" || percorso === "/vetrina/togli") {
      if (!chi.admin) return NO(403, "La vetrina la decide chi comanda.");
    }

    if (metodo === "POST" && percorso === "/vetrina/metti") {
      const c = mettiInVetrina(
        deposito,
        String(corpo["id"] ?? ""),
        String(corpo["grado"] ?? "rare") as Grado,
        numero(corpo["prezzo"], 0),
      );
      return OK(vestita(c, contorno, true));
    }

    if (metodo === "POST" && percorso === "/vetrina/togli") {
      const c = togliDallaVetrina(deposito, String(corpo["id"] ?? ""));
      return OK(vestita(c, contorno, true));
    }

    /* ---------------------------------------------------------- la classifica */

    if (metodo === "GET" && percorso === "/classifica") {
      return OK({
        righe: classifica(deposito).map((r) => ({
          ...r,
          nome: contorno.nomeDi(r.chi),
          faccia: contorno.facciaDi ? contorno.facciaDi(r.chi) : undefined,
          io: r.chi === chi.id,
        })),
      });
    }

    /* ------------------------------------------------------ la fila di chi comanda */

    if (
      percorso.startsWith("/fila") ||
      percorso === "/prendi" ||
      percorso === "/butta" ||
      percorso === "/gente" ||
      percorso === "/regala" ||
      percorso === "/prova" ||
      percorso === "/libreria"
    ) {
      if (!chi.admin) return NO(403, "Questa parte e' di chi decide.");
    }

    /**
     * Chi c'e', per mandargli le lire.
     *
     * Non e' la classifica: quella e' ordinata per merito e serve a chi gioca.
     * Questa e' un elenco di persone in ordine alfabetico, con quanto hanno in
     * tasca — che e' l'unica cosa che serve sapere prima di regalare.
     */
    if (metodo === "GET" && percorso === "/gente") {
      // Tutti quelli di casa, piu' quelli che hanno un conto e non risultano
      // piu' in casa: uno che si scollega il telefono non sparisce dai libri.
      const id = new Set<string>();
      for (const p of contorno.gente ? contorno.gente() : []) id.add(p.id);
      for (const c of deposito.conti()) id.add(c.chi);
      const gente = [...id]
        .filter((x) => x && x !== chi.id)
        .map((x) => {
          const c = deposito.conti().find((y) => y.chi === x);
          return {
            chi: x,
            nome: contorno.nomeDi(x),
            faccia: contorno.facciaDi ? contorno.facciaDi(x) : undefined,
            saldo: c?.saldo ?? 0,
            saldoScritto: lire(c?.saldo ?? 0),
            regali: c?.regali ?? 0,
            prese: c?.prese ?? 0,
            /** Non ha mai aperto la sala giochi: il conto si apre da solo. */
            mai: !c,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
      return OK({ gente, tagli: TAGLI });
    }

    if (metodo === "POST" && percorso === "/regala") {
      const fatto = regala(
        deposito,
        chi.id,
        String(corpo["chi"] ?? ""),
        numero(corpo["quanto"], 0),
        String(corpo["perche"] ?? ""),
      );
      return OK({
        chi: fatto.conto.chi,
        nome: contorno.nomeDi(fatto.conto.chi),
        saldo: fatto.conto.saldo,
        saldoScritto: lire(fatto.conto.saldo),
        regalo: fatto.regalo,
      });
    }

    /**
     * Cosa c'e' nella libreria della suite, per attaccarlo a una figurina.
     *
     * ⚠ **Il gioco non sa dove stanno i file**, e non deve saperlo: chiede
     * a chi lo ospita (vedi `Contorno`). Fuori dalla suite — nel banco di prova
     * — chi ospita non ha una libreria, e questa rotta risponde che non c'e'
     * niente. Non e' un guasto: e' una sala giochi senza galleria attaccata.
     */
    if (metodo === "GET" && percorso === "/libreria") {
      if (!contorno.elencoLibreria) return OK({ voci: [] });
      return OK({ voci: contorno.elencoLibreria(chi.id, 60) });
    }

    if (metodo === "GET" && percorso === "/fila") {
      const inAttesa = deposito
        .collezionabili()
        .filter((c) => c.stato === "in-attesa")
        .sort((a, b) => a.quando - b.quando)
        .map((c) => ({
          ...vestita(c, contorno, true),
          // Il valore di base: la somma dei pezzi. Chi comanda ci aggiunge
          // solo il bonus, cosi' non deve inventarsi un numero da zero.
          base: sommaDeiPezzi(deposito, c),
        }));
      /**
       * ⚠ **Prese e buttate sono due mazzi, non uno.**
       *
       * Chiesto il 10 settembre 2026: «i prompt buttati devono essere messi in
       * una categoria a parte e scomparire». Stavano insieme, ordinate per
       * data, e sulle prese si decide la vetrina: cercare quella da mettere in
       * vendita in mezzo a dieci scartate e' lavoro inutile fatto ogni volta.
       *
       * Le buttate restano — servono a non far tornare domani la stessa riga —
       * ma stanno in fondo, in un cassetto chiuso.
       */
      const decise = deposito
        .collezionabili()
        .filter((c) => c.stato === "presa")
        .sort((a, b) => (b.decisa ?? 0) - (a.decisa ?? 0))
        .slice(0, 30)
        .map((c) => vestita(c, contorno, true));
      const buttate = deposito
        .collezionabili()
        .filter((c) => c.stato === "buttata")
        .sort((a, b) => (b.decisa ?? 0) - (a.decisa ?? 0))
        .slice(0, 40)
        .map((c) => vestita(c, contorno, true));
      return OK({ inAttesa, decise, buttate, magazzino: statoMagazzino(deposito) });
    }

    if (metodo === "POST" && percorso === "/prendi") {
      const daLi = (quale: string, seManca: string) =>
        corpo[quale]
          ? {
              id: String(corpo[quale]),
              mime: String(corpo[quale + "Mime"] ?? seManca),
              url: String(corpo[quale]),
            }
          : undefined;
      /**
       * ⚠ **Gli allegati arrivano come elenco**: uno o piu' d'uno, chiesto il
       * 10 settembre 2026. Ognuno porta il suo indirizzo e il suo tipo, perche'
       * fra i quattro generati e i quattro scelti a mano ci puo' stare un brano
       * accanto a un'immagine, e la pagina deve sapere quale si guarda e quale
       * si ascolta.
       */
      const elenco = Array.isArray(corpo["allegati"]) ? (corpo["allegati"] as unknown[]) : [];
      const allegati = elenco
        .map((x) => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => x !== null && Boolean(x["url"]))
        .map((x) => ({
          id: String(x["id"] ?? x["url"]),
          mime: String(x["mime"] ?? "image/*"),
          url: String(x["url"]),
        }));
      const c = prendi(
        deposito,
        chi.id,
        String(corpo["id"] ?? ""),
        numero(corpo["bonus"], 0),
        allegati,
        daLi("copertina", "image/*"),
      );
      return OK(vestita(c, contorno, true));
    }

    /**
     * ⚠ **Provala davvero**: parte una generazione con quel prompt.
     *
     * Chiesto il 10 settembre 2026: «quando arriva un prompt da controllare
     * agli admin ci vogliono dei pulsanti per mandare quel prompt a generare;
     * nel caso di un prompt musicale genera una clip di 60 secondi con ace step
     * turbo strumentale, nel caso dell'immagine genera l'immagine 4:3 con flux
     * 9b».
     *
     * Era gia' scritto in CONCETTI.md § 10 come la cosa che l'admin puo' fare, e
     * non c'era: si giudicava una riga di testo inglese a occhio. Adesso parte
     * **per la stessa strada delle richieste del telefono** — chi ospita la
     * mette in coda — e quando e' pronta si trova in galleria, da attaccare.
     *
     * ⚠ **Il costo lo paga il banco, non chi ha mandato.** E' l'admin che ha
     * scelto di provarla: se la togliesse dal saldo di chi la manda, mandare
     * costerebbe, e mandare deve essere gratis (CONCETTI.md § 9).
     *
     * ⚠ **Si puo' rifare, fino a quattro volte** (`MAX_PROVE`). Chiesto il 10
     * settembre 2026: «puo' rigenerare e viene generato un secondo file, max 4
     * file». Prima partiva una volta sola e poi il tasto restava spento per
     * sempre: un modello sbaglia, e giudicare un prompt dal suo primo scatto
     * e' un altro modo di tirare a indovinare.
     */
    if (metodo === "POST" && percorso === "/prova") {
      if (!contorno.genera) return NO(501, "Qui non c'e' niente che sappia generare.");
      const c = deposito.perId(String(corpo["id"] ?? ""));
      if (!c) return NO(404, "Questa non c'e'.");
      if (!c.prompt) return NO(409, "Questa non e' un prompt: non c'e' niente da generare.");
      const fatte = c.prove ?? [];
      if (fatte.length >= MAX_PROVE) {
        return NO(409, "L'hai gia' fatta generare " + MAX_PROVE + " volte: scegli fra quelle.");
      }
      const dove = contorno.genera(chi.id, c.tavolo === "immagini" ? "immagini" : "musica", {
        prompt: c.prompt,
        titolo: c.titolo,
      });
      if (!dove) return NO(501, "Non e' partita: qui non si genera.");
      c.prove = fatte.concat([{ richiesta: dove.id, quando: Date.now() }]);
      deposito.salva();
      return OK({ id: c.id, richiesta: dove.id, dove: dove.dove ?? "", quante: c.prove.length });
    }

    if (metodo === "POST" && percorso === "/butta") {
      const c = butta(deposito, chi.id, String(corpo["id"] ?? ""), String(corpo["motivo"] ?? ""));
      return OK(vestita(c, contorno, true));
    }

    return NO(404, "Qui non c'e' niente.");
  } catch (errore) {
    // Un «non si puo'» detto in italiano e' una risposta, non un guasto: si
    // manda come tale, con dentro la frase, che la pagina mostra cosi' com'e'.
    if (errore instanceof NienteDaFare) return NO(409, errore.message);
    console.error("[giochi] rotta " + percorso + " caduta", errore);
    return NO(500, "Qualcosa e' andato storto qui dentro.");
  }
}
