/**
 * La logica dell'accesso remoto: inviti, dispositivi, richieste, notifiche.
 *
 * Tutto ciò che il server HTTP e il pannello dell'hub devono saper fare passa
 * da qui. Le regole di sicurezza stanno in un posto solo, così non possono
 * divergere fra un percorso e l'altro:
 *
 * - un invito si usa una volta sola e scade;
 * - il primo dispositivo accoppiato diventa admin, i successivi ospiti;
 * - un ospite può solo creare richieste; cambiare stato richiede l'admin;
 * - il token identifica il dispositivo, e revocarlo ne chiude l'accesso.
 */

import { Archivio, cartellaInvii, cartellaRisultati } from "./archivio";
import { nuovoCodice, nuovoId, nuovoToken } from "./casuale";
import type {
  Bussata,
  BussataPubblica,
  Dispositivo,
  DispositivoPubblico,
  Invio,
  Invito,
  Notifica,
  Richiesta,
  Risultato,
  RegolaFila,
  Ruolo,
  StatoRichiesta,
} from "./types";

/** Quanto vive un invito: cinque minuti, come da progetto. */
export const SCADENZA_INVITO_MS = 5 * 60 * 1000;

/**
 * Quanti tentativi di accoppiamento sbagliati si accettano in un minuto.
 *
 * Il codice è di otto cifre: indovinarlo a caso è improbabile, ma provarne
 * centomila al minuto no. Dieci tentativi al minuto sono più di quanti ne
 * sbaglia una persona che copia un numero dallo schermo, e rendono la forza
 * bruta più lenta della scadenza dell'invito.
 */
const TENTATIVI_AL_MINUTO = 10;

export class Remoto {
  readonly risultatiDir: string;
  /** Dove finiscono i file mandati a mano a qualcuno. */
  readonly inviiDir: string;

  /** Quando sono stati fatti i tentativi di accoppiamento andati male. */
  private tentativi: number[] = [];

  /**
   * Chi vuole sapere che una richiesta è stata accettata.
   *
   * Serve a una cosa sola e importante: **accettare deve far partire il
   * lavoro.** La decisione può arrivare da tre parti — il pannello sul PC, la
   * console, il telefono — e tutte e tre passano da `cambiaStato`. Un
   * ascoltatore qui è l'unico posto in cui la cosa si scrive una volta sola;
   * negli altri due si sarebbe dimenticata.
   */
  private accettatori: ((richiesta: Richiesta) => void)[] = [];

  /**
   * La regola della fila, decisa **dal computer**.
   *
   * Il gateway non sa — e non deve sapere — quanti lavori regge questa
   * macchina, né cosa ha scelto chi ci sta davanti. Sa solo chiedere. Lo shell
   * risponde leggendo le impostazioni, che si cambiano solo dal PC: è il modo
   * in cui «il pc è il vero admin» diventa una riga di codice invece di una
   * buona intenzione.
   *
   * Senza regola agganciata vale quella di prima: chi ha i permessi da admin
   * passa subito, gli altri aspettano. Serve alle prove automatiche, che
   * costruiscono un gateway nudo.
   */
  private regola: RegolaFila | null = null;

  /** Lo shell dice come si comporta la fila su questa macchina. */
  decideLaFila(regola: RegolaFila | null): void {
    this.regola = regola;
  }

  constructor(
    private archivio: Archivio,
    rootRisultati: string,
  ) {
    this.risultatiDir = cartellaRisultati(rootRisultati);
    this.inviiDir = cartellaInvii(rootRisultati);
  }

  /** L'archivio sottostante: per chi deve leggere richieste e dispositivi. */
  get archivi(): Archivio {
    return this.archivio;
  }

  /* ------------------------------------------------------------- inviti */

  /**
   * Crea un invito per il ruolo richiesto. Se c'è già un admin e qualcuno
   * chiede un altro invito admin, si rifiuta: un solo padrone della suite.
   */
  nuovoInvito(ruolo: "admin" | "ospite", quante = 1): Invito {
    const dati = this.archivio.datiCorrenti;
    // Gli inviti scaduti spariscono da soli: non riempiono il file.
    const vivi = dati.inviti.filter((i) => i.scade > Date.now());
    const invito: Invito = {
      codice: nuovoCodice(),
      ruolo: ruolo,
      scade: Date.now() + SCADENZA_INVITO_MS,
      restano: Math.max(1, Math.min(50, Math.floor(quante))),
    };
    vivi.push(invito);
    dati.inviti = vivi;
    this.archivio.salva();
    return invito;
  }

  /**
   * Butta tutti gli inviti, anche quelli ancora vivi.
   *
   * Serve quando cambia l'indirizzo su cui il gateway si fa trovare: un QR è
   * una fotografia dell'indirizzo di quel momento, e un codice che punta a una
   * scheda di rete che non usiamo più è peggio di nessun codice — sembra buono
   * e non funziona.
   */
  buttaInviti(): void {
    const dati = this.archivio.datiCorrenti;
    if (dati.inviti.length === 0) return;
    dati.inviti = [];
    this.archivio.salva();
  }

  /** Svuota gli invii scaduti: chiamata a ogni giro, costa pochissimo. */
  spazzaInviti(): void {
    const dati = this.archivio.datiCorrenti;
    if (dati.inviti.some((i) => i.scade <= Date.now())) {
      dati.inviti = dati.inviti.filter((i) => i.scade > Date.now());
      this.archivio.salva();
    }
  }

  /* ------------------------------------------------------- dispositivi */

  /**
   * Consuma un invito e crea il dispositivo. Se l'invito non esiste, è
   * scaduto o è già stato usato, l'accoppiamento fallisce: niente token.
   */
  accoppia(codice: string, nome: string): { dispositivo: Dispositivo; token: string } | { errore: string } {
    this.spazzaInviti();

    // Prima ancora di guardare il codice: chi sta provando a raffica si ferma
    // qui. Il conto è di tutta la porta, non per indirizzo — un attaccante che
    // cambia indirizzo a ogni tentativo non deve poter aggirare il limite.
    const unMinutoFa = Date.now() - 60_000;
    this.tentativi = this.tentativi.filter((t) => t > unMinutoFa);
    if (this.tentativi.length >= TENTATIVI_AL_MINUTO) {
      return { errore: "Troppi tentativi. Aspetta un minuto e rifai l'invito dal PC." };
    }

    const dati = this.archivio.datiCorrenti;

    /**
     * **Il nome è tuo, e di nessun altro.**
     *
     * Chiesto il 26 agosto 2026: «i futuri utenti se scelgono un nick già
     * esistente devono usare un altro nick». Non è pignoleria: da questa
     * versione il nome non è più un'etichetta accanto a una richiesta, è
     * l'identità con cui uno compare in bacheca, mette un like e ha un profilo.
     * Due Marco sono due profili che si scambiano le cose a vicenda.
     *
     * Il controllo si fa **prima** di consumare un posto dell'invito: un nome
     * già preso non deve bruciare il codice a chi lo sta scrivendo. È lo stesso
     * motivo per cui non conta come tentativo sbagliato — non lo è.
     */
    const pulito = (nome ?? "").trim();
    if (pulito) {
      const gia = dati.dispositivi.find((d) => stessoNome(d.nome, pulito));
      if (gia) {
        return {
          errore: `«${pulito}» è già di qualcun altro su questo computer. Scegline un altro.`,
        };
      }
    }

    const indice = dati.inviti.findIndex((i) => i.codice === codice);
    if (indice < 0) {
      this.tentativi.push(Date.now());
      return { errore: "Codice non trovato o già usato." };
    }
    const invito = dati.inviti[indice];
    if (!invito) {
      this.tentativi.push(Date.now());
      return { errore: "Codice non trovato o già usato." };
    }
    /**
     * Si consuma un posto, non l'invito intero.
     *
     * Un invito nasce con `restano` posti (uno, di suo). Ogni accoppiamento ne
     * toglie uno, e quando finiscono l'invito sparisce. Si toglie **prima** di
     * creare il dispositivo, anche se poi qualcosa va male: due telefoni non
     * devono poter usare lo stesso posto.
     *
     * Gli inviti scritti da una versione precedente non hanno `restano`: per
     * loro vale uno, che è quello che facevano.
     */
    const posti = (invito.restano ?? 1) - 1;
    if (posti <= 0) dati.inviti.splice(indice, 1);
    else invito.restano = posti;
    this.archivio.salvaSubito();

    const dispositivo: Dispositivo = {
      id: nuovoId("tel"),
      nome: pulito || nomeLibero(dati.dispositivi, invito.ruolo),
      ruolo: invito.ruolo,
      token: nuovoToken(),
      accoppiato: Date.now(),
      ultimoAccesso: Date.now(),
    };
    dati.dispositivi.push(dispositivo);
    /**
     * **Subito, non fra mezzo secondo.**
     *
     * È la riga che chiude «quando chiudo e apro l'app devo riscannerizzare il
     * codice»: con la scrittura differita bastava che la suite morisse male
     * nella mezza secondo dopo l'accoppiamento perché il telefono si ritrovasse
     * con un token che il computer non aveva mai scritto. Vedi `salvaSubito`.
     */
    this.archivio.salvaSubito();
    return { dispositivo, token: dispositivo.token };
  }

  /* ------------------------------------------------------------ bussate */

  /**
   * Qualcuno ha scelto questo computer da un elenco e chiede di entrare.
   *
   * **Non fa entrare nessuno**: crea un'attesa, e chi ha il computer decide.
   * È la differenza fra questo e l'accoppiamento col codice — là la decisione
   * è già stata presa quando il codice è stato generato, qui si prende adesso,
   * guardando in faccia chi bussa.
   *
   * Il nome si controlla subito, per lo stesso motivo per cui si controlla
   * nell'accoppiamento: scoprire che «Marco» era già preso *dopo* che il PC ha
   * accettato vorrebbe dire far rifare tutto a tutti e due.
   */
  bussa(dati: {
    nome: string;
    apparecchio: string;
    da: string;
    computer?: boolean;
  }): { bussata: Bussata; segreto: string } | { errore: string } {
    this.spazzaBussate();
    const archivio = this.archivio.datiCorrenti;

    // Lo stesso limite dell'accoppiamento, e per la stessa ragione: bussare
    // costa niente a chi bussa, e cento bussate al minuto sono un pannello
    // inutilizzabile per chi decide.
    const unMinutoFa = Date.now() - 60_000;
    this.tentativi = this.tentativi.filter((t) => t > unMinutoFa);
    if (this.tentativi.length >= TENTATIVI_AL_MINUTO) {
      return { errore: "Troppe richieste da questa rete. Aspetta un minuto." };
    }

    const nome = (dati.nome ?? "").trim().slice(0, 40);
    if (!nome) return { errore: "Serve un nome: è quello con cui comparirai." };
    if (archivio.dispositivi.some((d) => stessoNome(d.nome, nome))) {
      return { errore: `«${nome}» è già di qualcun altro su questo computer. Scegline un altro.` };
    }

    /**
     * Bussare due volte non fa due file.
     *
     * Chi chiude l'app e la riapre mentre aspetta ribussa: se ogni tentativo
     * lasciasse una riga, chi decide si troverebbe cinque volte la stessa
     * persona e non saprebbe quale accettare.
     */
    const gia = archivio.bussate.find(
      (b) => b.stato === "attesa" && stessoNome(b.nome, nome) && b.apparecchio === dati.apparecchio,
    );
    if (gia) {
      gia.quando = Date.now();
      gia.da = dati.da;
      this.archivio.salvaSubito();
      return { bussata: gia, segreto: gia.segreto };
    }

    this.tentativi.push(Date.now());
    const bussata: Bussata = {
      id: nuovoId("bus"),
      nome,
      apparecchio: (dati.apparecchio ?? "").trim().slice(0, 60) || "un apparecchio",
      segreto: nuovoToken(),
      quando: Date.now(),
      stato: "attesa",
      da: dati.da,
      computer: dati.computer === true ? true : undefined,
    };
    archivio.bussate.push(bussata);
    this.archivio.salvaSubito();
    for (const fn of this.bussatori) {
      try {
        fn(bussata);
      } catch {
        // Chi ascolta serve a far comparire una notifica: se scoppia, la
        // bussata resta comunque nel pannello.
      }
    }
    return { bussata, segreto: bussata.segreto };
  }

  /** Chi vuole sapere che qualcuno ha bussato (per far comparire l'avviso). */
  private bussatori: ((bussata: Bussata) => void)[] = [];

  suBussata(fn: (bussata: Bussata) => void): void {
    this.bussatori.push(fn);
  }

  /** Chi sta aspettando una risposta, per chi deve decidere. */
  bussateVive(): BussataPubblica[] {
    this.spazzaBussate();
    return this.archivio.datiCorrenti.bussate
      .filter((b) => b.stato === "attesa")
      .map(senzaSegreto)
      .sort((a, b) => b.quando - a.quando);
  }

  /**
   * Com'è finita, per chi ha bussato.
   *
   * Il segreto è l'unica cosa che distingue chi ha bussato da chiunque altro
   * sulla stessa rete: senza confronto, sapere l'id basterebbe a rubare il
   * token di un altro.
   */
  esitoBussata(
    id: string,
    segreto: string,
  ): { stato: Bussata["stato"]; token?: string; dispositivo?: DispositivoPubblico } | null {
    this.spazzaBussate();
    const b = this.archivio.datiCorrenti.bussate.find((x) => x.id === id);
    if (!b || b.segreto !== segreto) return null;
    if (b.stato !== "accettata") return { stato: b.stato };
    const dispositivo = this.archivio.datiCorrenti.dispositivi.find((d) => d.id === b.dispositivoId);
    if (!dispositivo) return { stato: b.stato, token: b.token };
    const { token: _via, ...pubblico } = dispositivo;
    return { stato: b.stato, token: b.token, dispositivo: pubblico };
  }

  /**
   * Chi decide dice sì o no.
   *
   * Dire sì **crea il dispositivo qui e adesso**, e ne mette il token dentro la
   * bussata perché chi aspetta se lo venga a prendere. Non si manda niente al
   * telefono: il telefono chiede, e chiedere funziona anche se nel frattempo ha
   * cambiato indirizzo IP — che con un telefono succede di continuo.
   */
  rispondiAllaBussata(
    id: string,
    accetta: boolean,
    ruolo: Ruolo = "ospite",
  ): { ok: true; dispositivo?: Dispositivo } | { errore: string } {
    const archivio = this.archivio.datiCorrenti;
    const b = archivio.bussate.find((x) => x.id === id);
    if (!b) return { errore: "Questa richiesta non c'è più." };
    if (b.stato !== "attesa") return { errore: "A questa è già stato risposto." };

    if (!accetta) {
      b.stato = "rifiutata";
      this.archivio.salvaSubito();
      return { ok: true };
    }

    if (archivio.dispositivi.some((d) => stessoNome(d.nome, b.nome))) {
      return { errore: `Nel frattempo «${b.nome}» se l'è preso qualcun altro.` };
    }

    const dispositivo: Dispositivo = {
      id: nuovoId(b.computer ? "pc" : "tel"),
      nome: b.nome,
      ruolo,
      token: nuovoToken(),
      accoppiato: Date.now(),
      ultimoAccesso: Date.now(),
    };
    archivio.dispositivi.push(dispositivo);
    b.stato = "accettata";
    b.token = dispositivo.token;
    b.dispositivoId = dispositivo.id;
    b.ruolo = ruolo;
    // Subito: è la riga che decide chi sei, e la scrittura differita è
    // esattamente quella che nella 0.7.7 faceva perdere gli accoppiamenti.
    this.archivio.salvaSubito();
    return { ok: true, dispositivo };
  }

  /**
   * Butta le bussate vecchie.
   *
   * Un'attesa vive **dieci minuti**: chi ha il computer deve poter accettare
   * dopo essere andato a prendere un caffè, ma una richiesta di ieri che
   * compare stamattina non si sa più di chi sia.
   *
   * Una risposta si tiene **cinque minuti** dopo che è stata data: tanto basta
   * al telefono per venirsela a prendere, e non un giorno di più — dentro c'è
   * un token.
   */
  spazzaBussate(): void {
    const archivio = this.archivio.datiCorrenti;
    const adesso = Date.now();
    const prima = archivio.bussate.length;
    archivio.bussate = archivio.bussate.filter((b) =>
      b.stato === "attesa" ? adesso - b.quando < 10 * 60_000 : adesso - b.quando < 15 * 60_000,
    );
    if (archivio.bussate.length !== prima) this.archivio.salva();
  }

  /** Chi sono io sulla rete: un id che non cambia fra un riavvio e l'altro. */
  ioSullaRete(): string {
    const archivio = this.archivio.datiCorrenti;
    if (!archivio.ioId) {
      archivio.ioId = nuovoId("pc");
      this.archivio.salvaSubito();
    }
    return archivio.ioId;
  }

  /** Chi eseguirà le richieste accettate. Lo aggancia lo shell. */
  suAccettata(fn: (richiesta: Richiesta) => void): void {
    this.accettatori.push(fn);
  }

  /** Da un token al dispositivo: il gateway usa solo questo per riconoscere. */
  daToken(token: string): Dispositivo | undefined {
    return this.archivio.datiCorrenti.dispositivi.find((d) => d.token === token);
  }

  /**
   * Aggiorna l'ultimo accesso: ogni richiesta autorizzata lo tocca.
   *
   * In memoria si aggiorna sempre; su disco solo se è passata mezza minuto
   * dall'ultima volta. "Ultimo accesso: 12 secondi fa" e "ultimo accesso:
   * adesso" dicono la stessa cosa a chi guarda il pannello, e non vale una
   * riscrittura del file per ogni battito del telefono.
   */
  tocca(dispositivo: Dispositivo): void {
    const adesso = Date.now();
    const vecchio = dispositivo.ultimoAccesso;
    dispositivo.ultimoAccesso = adesso;
    if (adesso - vecchio >= 30_000) this.archivio.salva();
  }

  /** Revoca un dispositivo: il token smette di funzionare all'istante. */
  revoca(id: string): boolean {
    const dati = this.archivio.datiCorrenti;
    const prima = dati.dispositivi.length;
    dati.dispositivi = dati.dispositivi.filter((d) => d.id !== id);
    if (dati.dispositivi.length !== prima) {
      this.archivio.salvaSubito();
      return true;
    }
    return false;
  }

  /**
   * Cambia il nome di un dispositivo.
   *
   * Serve a chi si è accoppiato di fretta scrivendo «asd» e poi si ritrova
   * quella parola accanto a ogni richiesta che manda. Il nome è l'unica cosa
   * che, in una fila di venti lavori, dice chi ha chiesto cosa.
   */
  rinomina(id: string, nome: string): boolean {
    const dispositivo = this.archivio.datiCorrenti.dispositivi.find((d) => d.id === id);
    if (!dispositivo || !nome.trim()) return false;
    const pulito = nome.trim().slice(0, 40);
    // Anche qui il nome deve restare unico: rinominarsi come un altro sarebbe
    // il modo più semplice di aggirare il controllo dell'accoppiamento.
    const preso = this.archivio.datiCorrenti.dispositivi.some(
      (d) => d.id !== id && stessoNome(d.nome, pulito),
    );
    if (preso) return false;
    dispositivo.nome = pulito;
    this.archivio.salvaSubito();
    return true;
  }

  /**
   * Il profilo: la faccia, la riga sotto al nome.
   *
   * Nasce con DaProd, la bacheca dove le cose hanno un autore: un nome senza
   * faccia in una bacheca è una riga di testo, e la differenza fra una cosa che
   * si guarda e una che si scorre via è tutta lì. La foto sta nella cartella
   * degli invii come un file qualunque — non serve un posto nuovo per un
   * quadratino da 200 px.
   */
  cambiaProfilo(id: string, cambi: { foto?: string; motto?: string }): boolean {
    const dispositivo = this.archivio.datiCorrenti.dispositivi.find((d) => d.id === id);
    if (!dispositivo) return false;
    if (cambi.foto !== undefined) dispositivo.foto = cambi.foto || undefined;
    if (cambi.motto !== undefined) dispositivo.motto = cambi.motto.trim().slice(0, 120) || undefined;
    this.archivio.salvaSubito();
    return true;
  }

  /**
   * Cambia cosa puo' fare un collegato: decidere tutto, oppure solo chiedere.
   *
   * **Perche' non basta piu' il ruolo dell'invito.** Fino alla 0.7.1 lo si
   * sceglieva una volta sola, al momento di inquadrare il QR: uno che si era
   * collegato come ospite restava ospite per sempre, e l'unico modo di
   * promuoverlo era scollegarlo e rifargli l'accoppiamento. Con piu' persone in
   * casa e' il gesto che serve piu' spesso, ed e' quello che rende vera la
   * differenza fra i due ruoli - vedi `creaRichiesta`.
   */
  cambiaRuolo(id: string, ruolo: Ruolo): boolean {
    const dispositivo = this.archivio.datiCorrenti.dispositivi.find((d) => d.id === id);
    if (!dispositivo) return false;
    dispositivo.ruolo = ruolo;
    this.archivio.salvaSubito();
    this.notifica({
      dispositivoId: dispositivo.id,
      titolo: ruolo === "admin" ? "Adesso puoi decidere" : "Adesso puoi chiedere",
      corpo:
        ruolo === "admin"
          ? "Quello che chiedi parte da solo, e puoi dire si' o no alle richieste degli altri."
          : "Quello che chiedi va a chi sta al computer, che decide se farlo.",
    });
    return true;
  }

  listaDispositivi(): Dispositivo[] {
    this.spazzaInviti();
    return [...this.archivio.datiCorrenti.dispositivi];
  }

  /* -------------------------------------------------------- richieste */

  creaRichiesta(opzioni: {
    tipo: string;
    app: string;
    testo: string;
    opzioni?: Record<string, string>;
    daDispositivo: Dispositivo;
  }): Richiesta {
    const dati = this.archivio.datiCorrenti;
    /**
     * **La differenza fra chi decide e chi chiede, ed e' l'unica.**
     *
     * Detta il 22 agosto 2026: «gli admin possono generare automaticamente
     * tutto, gli utenti possono mandare richieste, questa e' l'unica
     * differenza». Quindi una richiesta di chi decide nasce gia' accettata e va
     * in fila da sola; quella di chi chiede aspetta un si'.
     *
     * La fila resta una sola e resta seria: accettata non vuol dire «adesso»,
     * vuol dire «quando tocca a te». Su otto GB di scheda video ci sta un
     * modello per volta, e questo non cambia con il ruolo di chi ha chiesto.
     */
    /**
     * **E poi la macchina ha imparato a dire di no, ed era ora.**
     *
     * Quella regola da sola bastava finché i telefoni erano uno. Con quattro
     * persone collegate e i permessi da admin distribuiti, «chi decide genera
     * subito» vuol dire venti generazioni accodate in due minuti e un computer
     * che per due ore non è più di chi ci sta davanti. Da qui i due tetti — in
     * tutto e a testa — e l'interruttore che li governa, che sta **solo sul
     * PC**: vedi `Impostazioni.accettaDaSola` in `@daprod/ipc`.
     *
     * Quando il tetto è pieno la richiesta non si perde e non si rifiuta: resta
     * «in attesa», che è la cosa onesta da fare. La si accetta a mano quando la
     * fila si è sgombrata, e nel frattempo chi l'ha chiesta legge perché.
     */
    const verdetto = this.decidiSubito(opzioni.daDispositivo);
    const decide = verdetto.subito;
    dati.ultimoNumero = (dati.ultimoNumero ?? 0) + 1;
    const richiesta: Richiesta = {
      id: nuovoId("r"),
      numero: dati.ultimoNumero,
      tipo: opzioni.tipo,
      app: opzioni.app,
      testo: opzioni.testo,
      opzioni: opzioni.opzioni,
      daDispositivo: opzioni.daDispositivo.id,
      daNome: opzioni.daDispositivo.nome,
      stato: decide ? "accettata" : "in-attesa",
      quando: Date.now(),
      trattenuta: verdetto.trattenuta,
    };
    dati.richieste.push(richiesta);
    this.archivio.salva();

    if (decide) {
      // Nessuna notifica a nessuno: l'ha chiesta chi poteva gia' dire di si', e
      // dirglielo sarebbe raccontargli quello che ha appena fatto.
      for (const fn of this.accettatori) fn(richiesta);
      return richiesta;
    }

    // Chi decide deve saperlo. Se l'admin è un telefono in tasca, questa è
    // l'unica cosa che gli dice che c'è qualcosa da guardare; se l'admin è il
    // PC stesso, la notifica non fa danno e resta nell'archivio.
    for (const admin of dati.dispositivi) {
      if (admin.ruolo !== "admin" || admin.id === opzioni.daDispositivo.id) continue;
      this.notifica({
        dispositivoId: admin.id,
        richiestaId: richiesta.id,
        titolo: "Nuova richiesta",
        corpo: `${richiesta.daNome} chiede: “${breve(richiesta.testo)}”`,
      });
    }
    return richiesta;
  }

  /**
   * Rifà un lavoro: una richiesta nuova con le stesse opzioni.
   *
   * **Perché non si «riapre» quella vecchia.** Un lavoro finito è un fatto: ha
   * un numero, un'ora e — se è andato bene — un file. Riusarlo vorrebbe dire
   * riscrivere la storia, e chi guarda l'elenco non capirebbe più cosa è
   * successo quando. Se ne fa uno nuovo, con il suo numero, e nell'elenco si
   * vedono tutti e due.
   *
   * Chiesto il 26 agosto 2026: «la possibilità di riutilizzare quel prompt,
   * rifarlo oppure rifarlo ma prima modificarlo». Il `testo` facoltativo è la
   * seconda metà: se c'è, si rifà con quello.
   */
  rifai(id: string, da: Dispositivo, testo?: string): Richiesta | { errore: string } {
    const vecchia = this.richiesta(id);
    if (!vecchia) return { errore: "Non trovo questo lavoro." };
    // La propria, o qualunque se si può decidere: rifare il lavoro di un altro
    // vuol dire occupargli la scheda video, e quello lo decide chi decide.
    if (vecchia.daDispositivo !== da.id && da.ruolo !== "admin") {
      return { errore: "Puoi rifare solo i tuoi lavori." };
    }
    const chi = this.archivio.datiCorrenti.dispositivi.find((d) => d.id === vecchia.daDispositivo);
    return this.creaRichiesta({
      tipo: vecchia.tipo,
      app: vecchia.app,
      testo: (testo ?? vecchia.testo).trim() || vecchia.testo,
      opzioni: vecchia.opzioni,
      // Se chi l'aveva chiesta non c'è più, il lavoro nuovo è di chi lo rifà.
      daDispositivo: chi ?? da,
    });
  }

  /**
   * Accetta tutto quello che aspetta un sì. Torna quante ne sono partite.
   *
   * **Le più vecchie per prime**, che è l'unico ordine onesto: chi aspetta da
   * più tempo parte prima. E passa comunque dalla fila — accettarne venti non
   * vuol dire farne venti insieme, vuol dire metterne venti in ordine.
   */
  accettaTutte(da: Dispositivo): Richiesta[] {
    const dati = this.archivio.datiCorrenti;
    const ferme = dati.richieste
      .filter((r) => r.stato === "in-attesa")
      .sort((a, b) => a.quando - b.quando);
    if (!ferme.length) return [];

    for (const r of ferme) {
      r.stato = "accettata";
      r.trattenuta = undefined;
    }
    this.archivio.salva();
    for (const r of ferme) {
      for (const fn of this.accettatori) fn(r);
      if (r.daDispositivo === da.id) continue;
      this.notifica({
        dispositivoId: r.daDispositivo,
        richiestaId: r.id,
        titolo: "È partita",
        corpo: `Il numero ${r.numero ?? ""} è in lavorazione: “${breve(r.testo)}”`,
      });
    }
    return ferme;
  }

  /**
   * Ripassa le richieste trattenute: qualcuna può partire adesso.
   *
   * **Senza questo, i tetti sarebbero una porta che non si riapre.** Una
   * richiesta ferma perché «hai già due lavori in fila» resterebbe ferma anche
   * quando quei due sono finiti, e chi ha chiesto vedrebbe un computer libero
   * che non fa la sua roba — che è peggio di non avere tetti.
   *
   * Si chiama quando la fila si accorcia: a ogni lavoro finito, e ogni volta
   * che chi sta al computer toglie la pausa. Torna quelle fatte partire, così
   * chi chiama può avvisare.
   */
  rivediTrattenute(): Richiesta[] {
    const dati = this.archivio.datiCorrenti;
    const ferme = dati.richieste.filter((r) => r.stato === "in-attesa" && r.trattenuta);
    if (!ferme.length) return [];

    const partite: Richiesta[] = [];
    // Le più vecchie per prime: chi aspetta da più tempo passa prima.
    for (const richiesta of [...ferme].sort((a, b) => a.quando - b.quando)) {
      const chi = dati.dispositivi.find((d) => d.id === richiesta.daDispositivo);
      if (!chi) continue;
      const verdetto = this.decidiSubito(chi);
      if (!verdetto.subito) {
        // Il motivo può essere cambiato («la fila è piena» → «ne hai già due»):
        // vale la pena riscriverlo, chi guarda legge quello.
        richiesta.trattenuta = verdetto.trattenuta ?? richiesta.trattenuta;
        continue;
      }
      richiesta.stato = "accettata";
      richiesta.trattenuta = undefined;
      partite.push(richiesta);
    }
    if (partite.length) this.archivio.salva();
    for (const r of partite) {
      for (const fn of this.accettatori) fn(r);
      this.notifica({
        dispositivoId: r.daDispositivo,
        richiestaId: r.id,
        titolo: "È il tuo turno",
        corpo: `Il computer si è liberato: “${breve(r.testo)}” è partita.`,
      });
    }
    return partite;
  }

  /**
   * Questa richiesta parte da sola, o aspetta un sì?
   *
   * Tre domande in fila, e la prima che dice di no vince: chi è chi lo decide
   * il computer, e i tetti valgono **anche per chi decide** — «limitare anche
   * gli admin», che era il punto.
   */
  private decidiSubito(chi: Dispositivo): { subito: boolean; trattenuta?: string } {
    const regola = this.regola;
    if (!regola) return { subito: chi.ruolo === "admin" };

    const scelte = regola();
    if (scelte.chiPassaSubito === "mai") {
      return {
        subito: false,
        trattenuta:
          "Sul computer è stato scelto che ogni lavoro passa da un sì. La tua è in attesa.",
      };
    }
    if (scelte.chiPassaSubito === "admin" && chi.ruolo !== "admin") {
      return { subito: false };
    }

    const dati = this.archivio.datiCorrenti;
    const inFila = dati.richieste.filter(
      (r) => r.stato === "accettata" || r.stato === "in-lavoro",
    );
    if (scelte.limiteFila > 0 && inFila.length >= scelte.limiteFila) {
      return {
        subito: false,
        trattenuta: `Il computer ha già ${inFila.length} lavori in corso: la tua aspetta che si liberi.`,
      };
    }
    const suoi = inFila.filter((r) => r.daDispositivo === chi.id).length;
    if (scelte.limitePersona > 0 && suoi >= scelte.limitePersona) {
      return {
        subito: false,
        trattenuta: `Hai già ${suoi} lavori in fila: questo parte quando ne finisce uno.`,
      };
    }
    if (scelte.inPausa) {
      return {
        subito: false,
        trattenuta: "Chi sta al computer lo sta usando adesso. La tua richiesta è in attesa.",
      };
    }
    return { subito: true };
  }

  /**
   * Riscrive il testo di una richiesta ferma, prima di farla partire.
   *
   * Due strade, e la seconda e' il motivo per cui esiste la prima: **a mano**,
   * perche' chi sta al PC vede subito che «un gatto» non dara' mai niente di
   * buono, e **con il modello**, che quella stessa frase la apre in una
   * descrizione fatta come si deve. In tutti e due i casi si tiene da parte
   * com'era scritta: chi ha chiesto deve poter vedere cos'e' cambiato.
   *
   * Solo su una richiesta che non e' ancora partita: riscrivere il testo di un
   * lavoro gia' in corso vorrebbe dire raccontare una cosa diversa da quella
   * che la scheda sta facendo davvero.
   */
  riscrivi(
    id: string,
    da: Dispositivo,
    testo: string,
    chi: "mano" | "ai",
    /** Altri campi da riempire insieme: per un brano, le parole da cantare. */
    extra?: Record<string, string>,
  ): string | null {
    if (da.ruolo !== "admin") return "Questo lo puo' fare solo chi ha il permesso di decidere.";
    const richiesta = this.richiesta(id);
    if (!richiesta) return "Richiesta non trovata.";
    if (richiesta.stato !== "in-attesa") return "Si puo' riscrivere solo una richiesta ancora ferma.";
    const pulito = testo.trim();
    if (!pulito) return "Il testo non puo' restare vuoto.";

    if (!richiesta.testoOriginale) richiesta.testoOriginale = richiesta.testo;
    richiesta.testo = pulito.slice(0, 4000);
    richiesta.riscrittaDa = chi;
    /**
     * Le opzioni viaggiano con la richiesta e sono quelle che la scheda legge:
     * se il testo principale resta anche li' dentro, la scheda userebbe quello
     * vecchio e la riscrittura non servirebbe a niente.
     */
    if (richiesta.opzioni) {
      for (const campo of ["prompt", "testo", "descrizione"]) {
        if (campo in richiesta.opzioni) delete richiesta.opzioni[campo];
      }
    }
    if (extra) {
      richiesta.opzioni = { ...(richiesta.opzioni ?? {}), ...extra };
    }
    this.archivio.salva();
    return null;
  }

  /**
   * Mette via una richiesta, o la butta.
   *
   * `archiviata` la toglie dalla lista senza toccare il file; cancellare la fa
   * sparire dall'archivio. Ognuno puo' farlo con le proprie; chi decide anche
   * con quelle degli altri - e' lui che si ritrova la lista lunga.
   *
   * **Mettere via si puo' solo a lavoro finito, buttare sempre.** Non e' una
   * distinzione da pignoli: una richiesta puo' restare «in lavorazione» per
   * sempre se la suite viene chiusa mentre generava, e se anche buttarla
   * volesse un lavoro finito quella riga non se ne andrebbe piu'. Visto sul PC
   * vero il 22 agosto 2026: due lavori fermi li' da ore, e nessun modo di
   * toglierli.
   */
  metti(id: string, da: Dispositivo, come: "archivia" | "cancella"): string | null {
    const dati = this.archivio.datiCorrenti;
    const richiesta = this.richiesta(id);
    if (!richiesta) return "Richiesta non trovata.";
    if (da.ruolo !== "admin" && richiesta.daDispositivo !== da.id) {
      return "Puoi togliere solo le tue.";
    }
    if (come === "archivia") {
      const lavora =
        richiesta.stato === "in-attesa" ||
        richiesta.stato === "accettata" ||
        richiesta.stato === "in-lavoro";
      if (lavora) return "Questa sta ancora lavorando: aspetta che finisca, o dille di no.";
      richiesta.stato = "archiviata";
    } else {
      dati.richieste = dati.richieste.filter((r) => r.id !== id);
      dati.notifiche = dati.notifiche.filter((n) => n.richiestaId !== id);
    }
    this.archivio.salva();
    return null;
  }

  /* ------------------------------------------------------------ i regali */

  /**
   * Registra un file mandato a una persona, e glielo dice.
   *
   * Il file l'ha gia' scritto su disco chi ha ricevuto l'invio: qui si tiene il
   * conto di chi e', e si accende la notifica. E' quella che sul telefono fa
   * comparire il pacco.
   */
  regala(opzioni: {
    a: string;
    daNome: string;
    nome: string;
    mime: string;
    bytes: number;
    percorso: string;
    messaggio?: string;
  }): Invio | { errore: string } {
    const dati = this.archivio.datiCorrenti;
    const a = dati.dispositivi.find((d) => d.id === opzioni.a);
    if (!a) return { errore: "Questa persona non e' piu' collegata." };

    const invio: Invio = {
      id: nuovoId("i"),
      aDispositivo: a.id,
      daNome: opzioni.daNome,
      nome: opzioni.nome,
      mime: opzioni.mime,
      bytes: opzioni.bytes,
      percorso: opzioni.percorso,
      messaggio: opzioni.messaggio,
      quando: Date.now(),
      aperto: false,
    };
    dati.invii.push(invio);
    this.archivio.salva();

    this.notifica({
      dispositivoId: a.id,
      titolo: "Hai ricevuto qualcosa",
      corpo: `${opzioni.daNome} ti ha mandato "${opzioni.nome}".`,
    });
    return invio;
  }

  /** I regali di un dispositivo, dal piu' recente. */
  inviiDi(dispositivo: Dispositivo): Invio[] {
    return this.archivio.datiCorrenti.invii
      .filter((i) => i.aDispositivo === dispositivo.id)
      .sort((a, b) => b.quando - a.quando);
  }

  /** Un regalo dal suo id, ma solo se e' di chi lo chiede. */
  invio(id: string, dispositivo: Dispositivo): Invio | undefined {
    const trovato = this.archivio.datiCorrenti.invii.find((i) => i.id === id);
    return trovato && trovato.aDispositivo === dispositivo.id ? trovato : undefined;
  }

  /** Segna che il pacco e' stato aperto: l'animazione non si rifa' ogni volta. */
  apri(id: string, dispositivo: Dispositivo): boolean {
    const invio = this.invio(id, dispositivo);
    if (!invio) return false;
    invio.aperto = true;
    this.archivio.salva();
    return true;
  }

  /** Toglie un regalo dall'elenco. Torna quello tolto, per cancellarne il file. */
  scordaInvio(id: string, dispositivo: Dispositivo): Invio | null {
    const invio = this.invio(id, dispositivo);
    if (!invio) return null;
    const dati = this.archivio.datiCorrenti;
    dati.invii = dati.invii.filter((i) => i.id !== id);
    this.archivio.salva();
    return invio;
  }

  /** Le richieste visibili a un dispositivo: l'admin vede tutto, l'ospite le sue. */
  richiesteDi(dispositivo: Dispositivo): Richiesta[] {
    const tutte = [...this.archivio.datiCorrenti.richieste].sort((a, b) => b.quando - a.quando);
    return dispositivo.ruolo === "admin" ? tutte : tutte.filter((r) => r.daDispositivo === dispositivo.id);
  }

  richiesta(id: string): Richiesta | undefined {
    return this.archivio.datiCorrenti.richieste.find((r) => r.id === id);
  }

  /** Solo l'admin può cambiare lo stato di una richiesta. */
  cambiaStato(id: string, da: Dispositivo, stato: StatoRichiesta, extra?: { motivo?: string; risultato?: Risultato }): string | null {
    if (da.ruolo !== "admin") return "Solo il dispositivo admin può decidere sulle richieste.";
    const richiesta = this.richiesta(id);
    if (!richiesta) return "Richiesta non trovata.";
    richiesta.stato = stato;
    if (stato === "scartata") richiesta.motivoScarto = extra?.motivo;
    if (stato === "pronta" && extra?.risultato) richiesta.risultato = extra.risultato;
    this.archivio.salva();

    // Accettata vuol dire **falla**, non «l'ho vista»: chi esegue lo sente da
    // qui, da qualunque parte sia arrivata la decisione.
    if (stato === "accettata") {
      for (const fn of this.accettatori) fn(richiesta);
    }
    this.notifica({
      dispositivoId: richiesta.daDispositivo,
      richiestaId: richiesta.id,
      titolo: stato === "pronta" ? "Il tuo lavoro è pronto" : "Stato cambiato",
      corpo: stato === "pronta"
        ? `${richiesta.app}: “${breve(richiesta.testo)}” è pronto.`
        : `${richiesta.app}: ${stato}.`,
    });
    return null;
  }

  /* ------------------------------------------------------- notifiche */

  /** La coda di notifiche di un dispositivo: quelle non ancora lette prima. */
  notificheDi(dispositivo: Dispositivo): Notifica[] {
    return this.archivio.datiCorrenti.notifiche
      .filter((n) => n.dispositivoId === dispositivo.id && !n.letta)
      .sort((a, b) => b.quando - a.quando);
  }

  segnaLetta(id: string, dispositivoId: string): boolean {
    const nota = this.archivio.datiCorrenti.notifiche.find((n) => n.id === id);
    if (!nota || nota.dispositivoId !== dispositivoId) return false;
    nota.letta = true;
    this.archivio.salva();
    return true;
  }

  /**
   * Avvisa una persona di qualcosa che non riguarda la fila.
   *
   * Nasce con i commenti della 0.8.1: chi ha messo una cosa in bacheca deve
   * sapere che qualcuno gli ha scritto sotto, e quello non e' un lavoro, non ha
   * una richiesta, e non passa da nessuno dei giri di qui dentro. La scrive chi
   * la sa — la libreria, che sta nello shell — e questa e' la porta.
   */
  avvisaPersona(dispositivoId: string, titolo: string, corpo: string): void {
    this.notifica({ dispositivoId, titolo, corpo });
  }

  private notifica(opts: { dispositivoId: string; richiestaId?: string; titolo: string; corpo: string }): void {
    const dato = this.archivio.datiCorrenti;
    dato.notifiche.push({
      id: nuovoId("n"),
      dispositivoId: opts.dispositivoId,
      richiestaId: opts.richiestaId,
      titolo: opts.titolo,
      corpo: opts.corpo,
      quando: Date.now(),
      letta: false,
      consegnata: false,
    });
    this.archivio.salva();
  }
}

/** Taglia un testo per le notifiche: mezza riga, sa fondo. */
function breve(testo: string): string {
  const pulito = testo.replace(/\s+/g, " ").trim();
  return pulito.length > 60 ? `${pulito.slice(0, 60)}…` : pulito;
}

/**
 * Due nomi sono lo stesso nome?
 *
 * Senza guardare maiuscole e spazi ai bordi: «Cammo», «cammo » e «CAMMO» sono
 * la stessa persona per chiunque li legga, e devono esserlo anche qui — se no
 * il controllo sull'unicità si aggira battendo una lettera maiuscola.
 */
/**
 * Una bussata come la può vedere chi decide.
 *
 * Via il segreto e via il token: il primo è di chi ha bussato, il secondo è la
 * credenziale che nascerà. Nel pannello non serve né l'uno né l'altro, e quello
 * che non serve in un pannello è quello che finisce in uno screenshot.
 */
function senzaSegreto(b: Bussata): BussataPubblica {
  const { segreto: _s, token: _t, ...pubblica } = b;
  return pubblica;
}

function stessoNome(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("it") === b.trim().toLocaleLowerCase("it");
}

/**
 * Un nome di ripiego che non sia già di qualcun altro.
 *
 * Serve solo a chi si accoppia **senza** scrivere il proprio nome, che dalla
 * 0.7.6 non capita più passando dalla pagina di ingresso — ma le rotte restano
 * aperte anche a un client vecchio, e due «Telefono» sarebbero due profili
 * indistinguibili.
 */
function nomeLibero(dispositivi: { nome: string }[], ruolo: Ruolo): string {
  const radice = ruolo === "admin" ? "Telefono del padrone" : "Telefono";
  if (!dispositivi.some((d) => stessoNome(d.nome, radice))) return radice;
  for (let n = 2; n < 100; n += 1) {
    const prova = `${radice} ${n}`;
    if (!dispositivi.some((d) => stessoNome(d.nome, prova))) return prova;
  }
  return `${radice} ${Date.now().toString(36)}`;
}
