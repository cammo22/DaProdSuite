/**
 * Quale indirizzo dare al telefono.
 *
 * Sembra una riga di codice e non lo è. Un computer ha **un** nome ma spesso
 * quattro indirizzi, e solo uno di quelli è raggiungibile dal telefono che sta
 * sul divano. Sul PC di Cammo, il 21 agosto 2026:
 *
 *     100.88.254.19    Tailscale
 *     172.18.32.1      vEthernet (Default Switch)
 *     192.168.1.8      Ethernet            ← l'unico buono
 *     172.28.176.1     vEthernet (WSL (Hyper-V firewall))
 *
 * La prima stesura prendeva **il primo IPv4 non interno** che trovava, cioè
 * Tailscale: il QR conteneva un indirizzo che dalla wifi di casa non esiste, e
 * l'accoppiamento non poteva riuscire in nessun modo. Non c'era niente da
 * sbagliare da parte di chi lo usava — era sbagliato l'indirizzo.
 *
 * Quindi qui non si indovina e basta: si **ordinano** i candidati con le
 * ragioni scritte, si sceglie il primo, e si lasciano vedere tutti gli altri
 * nel pannello, perché nessuna euristica è giusta su ogni macchina e chi guarda
 * lo schermo sa cose che noi non sappiamo — se ha due schede sulla stessa rete
 * di casa, quale sia quella attaccata al router lo sa lui.
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
  /** Più alto = più probabile che sia quello giusto. */
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
 * simili: utilissimi, ma raggiungibili **solo** da un altro dispositivo della
 * stessa rete virtuale — non dal telefono sulla wifi di casa.
 */
const VIRTUALE_PRIVATA = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./;

/** Tutti i posti in cui il gateway può farsi trovare, dal più probabile. */
export function reti(): Rete[] {
  const trovate: Rete[] = [];

  const schede = networkInterfaces();
  for (const scheda of Object.keys(schede)) {
    for (const net of schede[scheda] ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;

      let punteggio = 0;
      let che = "rete";

      if (CASA.test(net.address)) {
        punteggio += 100;
        che = "rete di casa";
      }
      if (VIRTUALE_PRIVATA.test(net.address)) {
        // Non si butta via: se il telefono ha Tailscale funziona **ovunque**,
        // ed è l'unico modo che c'è oggi di usare la suite fuori casa.
        punteggio -= 60;
        che = "rete virtuale, tipo Tailscale — solo da chi ne fa parte";
      }
      if (VIRTUALI.test(scheda)) {
        punteggio -= 80;
        che = "scheda virtuale — il telefono non ci arriva";
      }

      trovate.push({ ip: net.address, scheda, che, punteggio });
    }
  }

  return trovate.sort((a, b) => b.punteggio - a.punteggio);
}

/**
 * L'indirizzo da usare, se non ne è stato scelto uno a mano.
 *
 * `preferito` è quello che l'utente ha scelto nel pannello: vince sempre, ma
 * solo se esiste ancora — una scheda si può staccare, e un indirizzo salvato
 * mesi fa non deve poter rendere il pannello inutile per sempre.
 */
export function ipLocale(preferito?: string): string {
  const elenco = reti();
  if (preferito && elenco.some((r) => r.ip === preferito)) return preferito;
  return elenco[0]?.ip ?? "127.0.0.1";
}
