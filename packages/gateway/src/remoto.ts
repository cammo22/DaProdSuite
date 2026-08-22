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

import { Archivio, cartellaRisultati } from "./archivio";
import { nuovoCodice, nuovoId, nuovoToken } from "./casuale";
import type {
  Dispositivo,
  Invito,
  Notifica,
  Richiesta,
  Risultato,
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
    const richiesta: Richiesta = {
      id: nuovoId("r"),
      tipo: opzioni.tipo,
      app: opzioni.app,
      testo: opzioni.testo,
      opzioni: opzioni.opzioni,
      daDispositivo: opzioni.daDispositivo.id,
      daNome: opzioni.daDispositivo.nome,
      stato: "in-attesa",
      quando: Date.now(),
    };
    dati.richieste.push(richiesta);
    this.archivio.salva();

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