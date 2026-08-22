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
  Dispositivo,
  Invio,
  Invito,
  Notifica,
  Richiesta,
  Risultato,
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
    this.archivio.salva();

    const dispositivo: Dispositivo = {
      id: nuovoId("tel"),
      nome: nome || (invito.ruolo === "admin" ? "Telefono del padrone" : "Telefono"),
      ruolo: invito.ruolo,
      token: nuovoToken(),
      accoppiato: Date.now(),
      ultimoAccesso: Date.now(),
    };
    dati.dispositivi.push(dispositivo);
    this.archivio.salva();
    return { dispositivo, token: dispositivo.token };
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
      this.archivio.salva();
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
    dispositivo.nome = nome.trim().slice(0, 40);
    this.archivio.salva();
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
    this.archivio.salva();
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
    const decide = opzioni.daDispositivo.ruolo === "admin";
    const richiesta: Richiesta = {
      id: nuovoId("r"),
      tipo: opzioni.tipo,
      app: opzioni.app,
      testo: opzioni.testo,
      opzioni: opzioni.opzioni,
      daDispositivo: opzioni.daDispositivo.id,
      daNome: opzioni.daDispositivo.nome,
      stato: decide ? "accettata" : "in-attesa",
      quando: Date.now(),
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
  riscrivi(id: string, da: Dispositivo, testo: string, chi: "mano" | "ai"): string | null {
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
    this.archivio.salva();
    return null;
  }

  /**
   * Mette via una richiesta, o la butta.
   *
   * `archiviata` la toglie dalla lista senza toccare il file; cancellare la fa
   * sparire dall'archivio. Ognuno puo' farlo con le proprie; chi decide anche
   * con quelle degli altri - e' lui che si ritrova la lista lunga.
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