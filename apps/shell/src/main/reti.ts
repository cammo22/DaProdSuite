/**
 * Su quali indirizzi il PC si fa trovare, e quale conviene provare per primo.
 *
 * Sembra una riga di codice e non lo è. Un computer ha **un** nome ma spesso
 * quattro indirizzi, e non tutti portano dove serve. Sul PC di Cammo, il 21
 * agosto 2026:
 *
 *     100.88.254.19    Tailscale
 *     172.18.32.1      vEthernet (Default Switch)
 *     192.168.1.8      Ethernet            ← la rete di casa
 *     172.28.176.1     vEthernet (WSL (Hyper-V firewall))
 *
 * La prima stesura prendeva **il primo IPv4 non interno** che trovava, cioè
 * Tailscale: il QR conteneva un indirizzo che dalla wifi di casa non esiste, e
 * l'accoppiamento non poteva riuscire in nessun modo.
 *
 * **Come è cambiata la domanda.** Fino alla 0.6.0 bisognava sceglierne *uno*,
 * perché nel QR ci stava un indirizzo solo: da lì la classifica, e il menu nel
 * pannello per correggerla a mano. Dalla 0.7.0 nel QR ci stanno **tutti**, e il
 * telefono li prova finché uno risponde (vedi `Indirizzi.kt`). Quindi qui non
 * si sceglie più: si **ordina**, perché provare per primo quello che ha più
 * probabilità di funzionare è la differenza fra collegarsi subito e collegarsi
 * dopo tre timeout.
 *
 * **Tailscale è passato davanti a tutti**, ed è la scelta di chi la usa: è
 * l'unico indirizzo che funziona **anche fuori casa**, è cifrato, e non mette
 * niente su Internet. Chi non ha Tailscale sul telefono non lo raggiunge — e
 * non è un problema, perché subito dopo c'è quello di casa.
 *
 * *(Una nota per chi verrà: il trucco del socket UDP “connesso” a 8.8.8.8 per
 * farsi dire la scheda di uscita è stato provato e tolto. `connect` è
 * asincrona, `address()` letta subito dopo torna null, e il socket teneva vivo
 * il processo. La classifica qui sotto dava comunque la risposta giusta.)*
 */

import { networkInterfaces } from "node:os";

/** Un indirizzo su cui il gateway può farsi trovare. */
export interface Rete {
  ip: string;
  /** Il nome della scheda, come lo chiama Windows. Serve a riconoscerla. */
  scheda: string;
  /** Una riga che dice cos'è, per chi legge il pannello. */
  che: string;
  /** Fin dove arriva: da questa stanza, da casa, o da ovunque. */
  dove: "ovunque" | "casa" | "virtuale";
  /** Più alto = si prova prima. */
  punteggio: number;
}

/**
 * Schede che esistono per far parlare il computer con sé stesso o con una
 * macchina virtuale. Un telefono non ci arriva mai.
 */
const VIRTUALI = /vEthernet|Hyper-V|WSL|VirtualBox|VMware|Docker|Loopback|TAP-|Npcap|Bluetooth/i;

/** Reti private “vere”, quelle di un router di casa. */
const CASA = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * 100.64.0.0/10, lo spazio del NAT degli operatori. Ci vivono Tailscale e
 * simili: raggiungibili **solo** da un altro dispositivo della stessa rete
 * virtuale, ma da lì raggiungibili **ovunque**, che è il punto.
 */
const RETE_VIRTUALE_PRIVATA = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./;

/** Il nome che Tailscale dà alla sua scheda, quando lo dice. */
const TAILSCALE = /tailscale|^ts\d/i;

/** Tutti i posti in cui il gateway può farsi trovare, dal più promettente. */
export function reti(): Rete[] {
  const trovate: Rete[] = [];

  const schede = networkInterfaces();
  for (const scheda of Object.keys(schede)) {
    for (const net of schede[scheda] ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;

      let punteggio = 0;
      let che = "rete";
      let dove: Rete["dove"] = "casa";

      if (CASA.test(net.address)) {
        punteggio += 100;
        che = "la rete di casa";
      }
      if (RETE_VIRTUALE_PRIVATA.test(net.address) || TAILSCALE.test(scheda)) {
        // **Davanti a tutti.** È l'unico che funziona anche fuori casa, ed è
        // cifrato: chi ce l'ha sul telefono non deve fare altro. Chi non ce
        // l'ha non lo raggiunge, e prova quello sotto — che è quello di casa.
        punteggio += 200;
        che = "Tailscale — funziona anche fuori casa";
        dove = "ovunque";
      }
      if (VIRTUALI.test(scheda) && !TAILSCALE.test(scheda)) {
        punteggio -= 300;
        che = "scheda virtuale — il telefono non ci arriva";
        dove = "virtuale";
      }

      trovate.push({ ip: net.address, scheda, che, dove, punteggio });
    }
  }

  return trovate.sort((a, b) => b.punteggio - a.punteggio);
}

/**
 * Gli indirizzi da mettere nell'invito, in ordine di quale provare prima.
 *
 * Le schede virtuali restano fuori: metterle vorrebbe dire far aspettare al
 * telefono un timeout per ognuna prima di arrivare a quella buona.
 */
export function indirizziBuoni(porta: number): string[] {
  return reti()
    .filter((r) => r.dove !== "virtuale")
    .map((r) => `http://${r.ip}:${porta}`);
}

/**
 * L'indirizzo da mostrare quando ne va scritto **uno**, per chi lo deve battere
 * a mano nel browser.
 *
 * `preferito` è quello che l'utente ha scelto nel pannello: vince sempre, ma
 * solo se esiste ancora — una scheda si può staccare, e un indirizzo salvato
 * mesi fa non deve poter rendere il pannello inutile per sempre.
 */
export function ipLocale(preferito?: string): string {
  const elenco = reti();
  if (preferito && elenco.some((r) => r.ip === preferito)) return preferito;
  // Per chi lo deve **scrivere** conta quello di casa, non Tailscale: chi apre
  // il browser del portatile in salotto è sulla stessa wifi.
  const casa = elenco.find((r) => r.dove === "casa");
  return casa?.ip ?? elenco[0]?.ip ?? "127.0.0.1";
}
