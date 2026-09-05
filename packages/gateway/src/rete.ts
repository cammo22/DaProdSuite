/**
 * I computer si vedono fra loro, e chi arriva li trova senza sapere niente.
 *
 * ## Il difetto che questo file cura
 *
 * Fino alla 0.8.2 collegarsi voleva dire **conoscere già l'indirizzo**: si
 * apriva DaProdConnessione sul PC, si faceva un invito, e si copiava un codice
 * di otto cifre (o si inquadrava un QR). Funziona, ed è sicuro, ma pretende che
 * chi ha il telefono e chi ha il computer siano nella stessa stanza nello
 * stesso momento — e che qualcuno sappia dove guardare.
 *
 * Chiesto il 5 settembre 2026: «il pc deve avere una schermata dove tutti
 * quelli che scaricano l'app da github vedono gli altri pc in rete, all'avvio
 * la creazione del profilo e automaticamente alla fine si vede in automatico
 * tutti i pc collegati e si decide a quale collegarsi; quando si seleziona il
 * pc, il pc riceve una notifica e si può accettare».
 *
 * Cioè: **non più un codice da copiare, ma un elenco da toccare.** Il codice
 * resta — serve da fuori casa, dove nessun annuncio arriva — ma in casa non
 * serve più a nessuno.
 *
 * ## Come si trovano
 *
 * Un annuncio UDP su un gruppo multicast. Tre righe di spiegazione e nessuna
 * dipendenza nuova:
 *
 * 1. ogni computer con la suite accesa entra nel gruppo `239.90.90.90:8791` e
 *    ci butta dentro **chi è** ogni otto secondi;
 * 2. chi arriva (un telefono, un altro PC) manda un `ehi`: tutti rispondono
 *    subito, così non si aspettano otto secondi;
 * 3. chi ascolta tiene un elenco di quelli sentiti negli ultimi quarantacinque
 *    secondi. Chi tace di più è spento, o ha cambiato rete.
 *
 * **Perché non mDNS.** Perché mDNS in Node vuole una libreria (`bonjour`,
 * `multicast-dns`), e questa suite ha una regola vecchia: una dipendenza in
 * meno è un aggiornamento in meno che può rompere l'unica cosa che ci sta
 * sopra. Qui il protocollo è un JSON dentro un datagramma: sta in questo file,
 * e l'app Android lo parla con quaranta righe di Kotlin.
 *
 * **Perché anche il broadcast e non solo il multicast.** Perché su qualche
 * router di casa — e su qualche wifi con l'isolamento dei client a metà — il
 * multicast non passa e il broadcast sì. Si manda su tutti e due: costa due
 * datagrammi da 200 byte.
 *
 * ## Cosa NON c'è qui dentro, e perché
 *
 * **Nessun permesso.** Un annuncio dice «ci sono, mi chiamo così, bussa qui»:
 * è un cartello sulla porta, non una chiave. Chi vuole entrare bussa (vedi
 * `Bussata` in `remoto.ts`) e aspetta che dall'altra parte qualcuno dica di sì.
 * Questo file non fa entrare nessuno.
 *
 * **Niente Tailcat.** È stato chiesto il 5 settembre 2026 se
 * [tailcat](https://github.com/tailscale/tailcat) fosse meglio. Tailcat è un
 * trasporto — netcat sul piano dati di Tailscale, senza il piano di controllo —
 * e risolve un problema che qui non abbiamo: parlarsi **fuori** dalla rete di
 * casa senza un account. Non ha elenco, non ha identità, non ha permessi: ci si
 * scambia comunque un indirizzo fuori banda, cioè esattamente quello che il QR
 * fa già. È scritto in Go, non ha binding per Node, e vorrebbe dire un binario
 * in più nell'installer. Resta segnato come possibile sostituto del **tunnel**
 * (oggi Cloudflare), non del sistema di utenti.
 */

import { createSocket, type Socket } from "node:dgram";
import { networkInterfaces } from "node:os";

/** Il gruppo su cui i computer della suite si annunciano. */
export const GRUPPO = "239.90.90.90";

/** La porta dell'annuncio. Non è quella del gateway: quella è l'8790. */
export const PORTA_ANNUNCIO = 8791;

/** Ogni quanto si dice «ci sono». */
const OGNI_MS = 8_000;

/** Dopo quanto silenzio un computer si considera sparito. */
const DIMENTICA_MS = 45_000;

/** Quanti computer si tengono in elenco: oltre, qualcosa non va. */
const MASSIMO_PARI = 64;

/** Cosa viaggia in un datagramma. Due tipi, e non uno di più. */
type Messaggio =
  | { t: "ehi"; v: 1 }
  | {
      t: "sono";
      v: 1;
      id: string;
      nome: string;
      versione: string;
      porta: number;
      basi: string[];
      /** Vero se questo computer accetta bussate adesso. */
      apre: boolean;
    };

/** Un computer sentito sulla rete. */
export interface Pari {
  id: string;
  nome: string;
  versione: string;
  /** Gli indirizzi su cui bussare, dal più promettente. */
  basi: string[];
  /** L'indirizzo IP da cui è arrivato l'annuncio: quello vale sempre. */
  visto_da: string;
  porta: number;
  apre: boolean;
  /** Quando si è fatto sentire l'ultima volta. */
  visto: number;
}

/** Chi sono io, chiesto a chi mi ha acceso. */
export interface Chi {
  id: string;
  nome: string;
  versione: string;
  porta: number;
  basi: string[];
  apre: boolean;
}

/**
 * L'annunciatore: dice chi sono, e tiene l'elenco di chi c'è.
 *
 * Uno per suite. Si accende dopo il gateway — gli serve sapere su che porta è
 * finito — e si spegne con lui.
 */
export class Rete {
  private socket: Socket | null = null;
  private battito: ReturnType<typeof setInterval> | null = null;
  private pari = new Map<string, Pari>();
  private ascoltatori: (() => void)[] = [];
  private acceso = false;

  constructor(private chiSono: () => Chi) {}

  /** Qualcuno vuole sapere quando l'elenco cambia (per ridisegnare il pannello). */
  suCambio(fn: () => void): void {
    this.ascoltatori.push(fn);
  }

  private avvisa(): void {
    for (const fn of this.ascoltatori) {
      try {
        fn();
      } catch {
        // Un ascoltatore che scoppia non deve spegnere la rete.
      }
    }
  }

  /**
   * Accende l'annuncio.
   *
   * **Non solleva mai.** Una rete che non lascia aprire quella porta — un
   * firewall aziendale, una VPN che si mette in mezzo — è un motivo per non
   * vedere gli altri computer, non per non far partire la suite. Chi non
   * riesce ad annunciarsi resta raggiungibile col codice, come prima.
   */
  accendi(): void {
    if (this.acceso) return;
    this.acceso = true;
    try {
      const s = createSocket({ type: "udp4", reuseAddr: true });
      this.socket = s;

      s.on("error", () => {
        // Porta occupata, o permesso negato: si smette in silenzio.
        this.spegni();
      });

      s.on("message", (dati, da) => this.arrivato(dati, da.address, da.port));

      s.bind(PORTA_ANNUNCIO, () => {
        try {
          s.setBroadcast(true);
          s.setMulticastTTL(2);
          // Senza questa riga due suite sullo stesso computer non si sentono, e
          // non si sente nemmeno la prova che gira in questo repository.
          s.setMulticastLoopback(true);
          // Su una macchina con quattro schede (ethernet, wifi, Tailscale, WSL)
          // l'adesione va chiesta per ognuna: senza, il sistema ne sceglie una
          // e gli annunci delle altre non arrivano mai.
          for (const ip of schedeIPv4()) {
            try {
              s.addMembership(GRUPPO, ip);
            } catch {
              // Una scheda che non regge il multicast non è un motivo per
              // rinunciare alle altre.
            }
          }
          try {
            s.addMembership(GRUPPO);
          } catch {
            // Già aggiunto per scheda: va bene così.
          }
        } catch {
          // Va avanti lo stesso: il broadcast spesso basta.
        }
        this.diCiSono();
      });

      this.battito = setInterval(() => {
        this.dimentica();
        this.diCiSono();
      }, OGNI_MS);
      this.battito.unref?.();
    } catch {
      this.acceso = false;
      this.socket = null;
    }
  }

  spegni(): void {
    this.acceso = false;
    if (this.battito) {
      clearInterval(this.battito);
      this.battito = null;
    }
    const s = this.socket;
    this.socket = null;
    if (s) {
      try {
        s.close();
      } catch {
        // Già chiuso.
      }
    }
    this.pari.clear();
  }

  /** Chi c'è adesso, dal più fresco. Senza me stesso. */
  elenco(): Pari[] {
    this.dimentica();
    const io = this.chiSono().id;
    return [...this.pari.values()].filter((p) => p.id !== io).sort((a, b) => b.visto - a.visto);
  }

  /** Un computer preciso, se è ancora lì. */
  trova(id: string): Pari | undefined {
    this.dimentica();
    return this.pari.get(id);
  }

  /**
   * Chiede a tutti di farsi sentire, adesso.
   *
   * La usa chi apre il pannello: aspettare fino a otto secondi perché un
   * computer che è acceso da un'ora compaia in elenco sembra un difetto anche
   * quando non lo è.
   */
  chiediChiCe(): void {
    this.manda({ t: "ehi", v: 1 });
  }

  /* --------------------------------------------------------------- dentro */

  private diCiSono(): void {
    const io = this.chiSono();
    this.manda({
      t: "sono",
      v: 1,
      id: io.id,
      nome: io.nome,
      versione: io.versione,
      porta: io.porta,
      basi: io.basi.slice(0, 8),
      apre: io.apre,
    });
  }

  /**
   * Butta il messaggio da tutte le parti da cui può arrivare a qualcuno.
   *
   * **Quattro destinazioni, e ognuna copre un caso che le altre non coprono.**
   * Sembra ridondante e non lo è: il datagramma pesa duecento byte e ogni
   * strada, su qualche rete vera, è l'unica che funziona.
   *
   * | dove | quando è l'unica che passa |
   * |---|---|
   * | il gruppo multicast | reti gestite, dove il broadcast è filtrato |
   * | `255.255.255.255` | wifi di casa semplici |
   * | il broadcast della scheda (`192.168.1.255`) | Windows, che spesso non manda il precedente fuori dalla scheda giusta |
   * | `127.0.0.1` | due suite sullo stesso computer, e le prove |
   */
  private manda(m: Messaggio): void {
    const s = this.socket;
    if (!s) return;
    const dati = Buffer.from(JSON.stringify(m), "utf8");
    for (const dove of [GRUPPO, "255.255.255.255", ...broadcastDelleSchede(), "127.0.0.1"]) {
      try {
        s.send(dati, 0, dati.length, PORTA_ANNUNCIO, dove);
      } catch {
        // Una rete che rifiuta il broadcast non è un motivo per non provare
        // il multicast, e viceversa.
      }
    }
  }

  private arrivato(dati: Buffer, da: string, portaDa: number): void {
    let m: Messaggio;
    try {
      // Un datagramma può arrivare da chiunque: se non è il nostro JSON, via.
      if (dati.length > 4096) return;
      m = JSON.parse(dati.toString("utf8")) as Messaggio;
    } catch {
      return;
    }
    if (!m || typeof m !== "object" || m.v !== 1) return;

    if (m.t === "ehi") {
      /**
       * Qualcuno è appena arrivato: gli si risponde **in faccia**.
       *
       * ⚠ Questa è la riga che, mancando, faceva sembrare tutto rotto. Prima
       * qui c'era un `diCiSono()`, cioè un annuncio al gruppo sulla porta 8791:
       * perfetto fra due computer, che su quella porta ci stanno tutti e due, e
       * inutile per **un telefono**, che apre una porta qualunque e da lì
       * chiede. La risposta partiva e non arrivava a nessuno.
       *
       * Quindi: una copia unicast a chi ha chiesto, sulla sua porta, e poi
       * l'annuncio al gruppo per tutti gli altri che stavano ascoltando.
       */
      const io = this.chiSono();
      const risposta = Buffer.from(
        JSON.stringify({
          t: "sono",
          v: 1,
          id: io.id,
          nome: io.nome,
          versione: io.versione,
          porta: io.porta,
          basi: io.basi.slice(0, 8),
          apre: io.apre,
        }),
        "utf8",
      );
      try {
        this.socket?.send(risposta, 0, risposta.length, portaDa, da);
      } catch {
        // Se la risposta diretta non parte resta l'annuncio al gruppo.
      }
      this.diCiSono();
      return;
    }
    if (m.t !== "sono") return;
    if (typeof m.id !== "string" || !m.id) return;
    if (m.id === this.chiSono().id) return;
    if (this.pari.size >= MASSIMO_PARI && !this.pari.has(m.id)) return;

    const prima = this.pari.get(m.id);
    const adesso: Pari = {
      id: m.id.slice(0, 64),
      nome: String(m.nome ?? "").slice(0, 60) || "Un computer",
      versione: String(m.versione ?? "").slice(0, 20),
      basi: Array.isArray(m.basi) ? m.basi.filter((b) => typeof b === "string").slice(0, 8) : [],
      porta: Number(m.porta) || 8790,
      apre: m.apre !== false,
      visto_da: da,
      visto: Date.now(),
    };
    this.pari.set(adesso.id, adesso);
    // Si avvisa solo quando cambia qualcosa di visibile: un annuncio ogni otto
    // secondi che ridisegna il pannello è un pannello che sfarfalla.
    if (
      !prima ||
      prima.nome !== adesso.nome ||
      prima.apre !== adesso.apre ||
      prima.visto_da !== adesso.visto_da ||
      prima.basi.join("|") !== adesso.basi.join("|")
    ) {
      this.avvisa();
    }
  }

  private dimentica(): void {
    const limite = Date.now() - DIMENTICA_MS;
    let tolto = false;
    for (const [id, p] of this.pari) {
      if (p.visto < limite) {
        this.pari.delete(id);
        tolto = true;
      }
    }
    if (tolto) this.avvisa();
  }
}

/**
 * L'indirizzo di broadcast di ogni scheda: `192.168.1.8/255.255.255.0` → `192.168.1.255`.
 *
 * Serve su Windows, dove un pacchetto per `255.255.255.255` esce da una scheda
 * sola — quella della rotta di default — e su un fisso con Tailscale e Hyper-V
 * quella scheda non è quasi mai la wifi di casa.
 */
function broadcastDelleSchede(): string[] {
  const fuori: string[] = [];
  for (const schede of Object.values(networkInterfaces())) {
    for (const s of schede ?? []) {
      if (s.family !== "IPv4" || s.internal || !s.netmask) continue;
      const ip = s.address.split(".").map(Number);
      const maschera = s.netmask.split(".").map(Number);
      if (ip.length !== 4 || maschera.length !== 4) continue;
      const bc = ip.map((n, i) => (n & (maschera[i] ?? 0)) | (~(maschera[i] ?? 0) & 255));
      fuori.push(bc.join("."));
    }
  }
  return [...new Set(fuori)];
}

/** Gli IPv4 delle schede vere di questa macchina. */
function schedeIPv4(): string[] {
  const fuori: string[] = [];
  for (const schede of Object.values(networkInterfaces())) {
    for (const s of schede ?? []) {
      if (s.family !== "IPv4" || s.internal) continue;
      fuori.push(s.address);
    }
  }
  return fuori;
}

/**
 * Chiede in giro chi c'è, senza essere un gateway.
 *
 * Serve a un caso solo ma importante: **le prove**. Un copione che vuole
 * verificare che l'annuncio esca non può accendere una suite intera.
 */
export function ascoltaUnMomento(quantoMs = 2_000): Promise<Pari[]> {
  return new Promise((risolvi) => {
    const trovati = new Map<string, Pari>();
    let s: Socket;
    try {
      s = createSocket({ type: "udp4", reuseAddr: true });
    } catch {
      risolvi([]);
      return;
    }
    const chiudi = () => {
      try {
        s.close();
      } catch {
        // già chiuso
      }
      risolvi([...trovati.values()]);
    };
    s.on("error", chiudi);
    s.on("message", (dati, da) => {
      try {
        const m = JSON.parse(dati.toString("utf8")) as Messaggio;
        if (m && m.v === 1 && m.t === "sono" && m.id) {
          trovati.set(m.id, {
            id: m.id,
            nome: m.nome,
            versione: m.versione,
            basi: m.basi ?? [],
            porta: m.porta,
            apre: m.apre !== false,
            visto_da: da.address,
            visto: Date.now(),
          });
        }
      } catch {
        // non è roba nostra
      }
    });
    s.bind(0, () => {
      try {
        s.setBroadcast(true);
        s.setMulticastTTL(2);
        s.setMulticastLoopback(true);
        s.addMembership(GRUPPO);
      } catch {
        // si prova lo stesso col broadcast
      }
      const ehi = Buffer.from(JSON.stringify({ t: "ehi", v: 1 }), "utf8");
      for (const dove of [GRUPPO, "255.255.255.255", ...broadcastDelleSchede(), "127.0.0.1"]) {
        try {
          s.send(ehi, 0, ehi.length, PORTA_ANNUNCIO, dove);
        } catch {
          // l'altra strada può bastare
        }
      }
      setTimeout(chiudi, quantoMs).unref?.();
    });
  });
}
