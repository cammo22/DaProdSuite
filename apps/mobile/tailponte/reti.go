package tailponte

import (
	"net"
	"strconv"
	"strings"
	"sync"

	"tailscale.com/net/netmon"
)

/*
 * ⚠ **Le schede di rete gliele deve passare Java.**
 *
 * ## Il muro
 *
 * La prima volta che questo pacchetto e' girato su Android vero — non
 * compilato: girato, dentro l'emulatore — e' morto in una riga:
 *
 *	tsnet: route ip+net: netlinkrib: permission denied
 *
 * Da Android 11 un'app **non puo' leggere la tabella di routing**. Il `net`
 * di Go la legge da li', quindi `net.Interfaces()` non funziona e non
 * funzionera' mai: e' una porta chiusa dal sistema, non un difetto da
 * aggirare. E' l'issue 2293 di Tailscale.
 *
 * ⚠ **E non lo diceva nessun compilatore.** Il pacchetto compilava per
 * `android/arm64` senza una parola, la libreria si caricava, e la prima
 * chiamata cadeva. E' esattamente il motivo per cui `TailponteTest` gira
 * sull'emulatore invece che sulla JVM come tutte le altre prove.
 *
 * ## La via che c'e'
 *
 * `netmon` la prevede: `RegisterInterfaceGetter` sostituisce il modo in cui
 * Tailscale chiede le schede di rete. Quello che serve e' qualcuno che sappia
 * elencarle **senza** passare dalla tabella di routing, e su Android quel
 * qualcuno e' Java: `NetworkInterface.getNetworkInterfaces()` ci arriva per
 * un'altra strada, che il sistema lascia aperta.
 *
 * Quindi il giro e': Kotlin elenca, manda qui una stringa, e qui la si
 * traduce in quello che Tailscale si aspetta.
 *
 * ## Perche' una stringa e non una lista di oggetti
 *
 * Perche' fra Go e Kotlin, con gomobile, passa poca roba: numeri, stringhe,
 * booleani. Una lista di strutture non passa. Si potrebbe fare un oggetto per
 * scheda con dieci metodi — e sarebbero dieci salti attraverso JNI per ogni
 * scheda, ogni volta che Tailscale controlla la rete, che e' spesso.
 *
 * Una stringa e' **un** salto, e il formato sta scritto qui sotto in cinque
 * righe. Le cose che attraversano un confine conviene siano piatte.
 */

// Reti e' chi sa elencare le schede di rete. Lo implementa Kotlin.
type Reti interface {
	/*
	 * Le schede, una per riga (`\n`), e ogni riga a pezzi separati da `;`:
	 *
	 *	nome;indice;mtu;bandiere;ip/bit,ip/bit
	 *
	 * Le bandiere sono lettere, e ci sono quelle che ci sono:
	 * `u` accesa, `l` e' il loopback, `p` punto-punto, `m` multicast.
	 *
	 * Esempio:
	 *
	 *	wlan0;12;1500;um;192.168.1.42/24,fe80::1/64
	 *	lo;1;65536;ul;127.0.0.1/8
	 */
	Elenco() string
}

var (
	retiMu sync.Mutex
	leReti Reti
)

/*
 * UsaLeReti dice a Tailscale di chiedere le schede a Kotlin invece che al
 * sistema.
 *
 * Va chiamata **prima** di Avvia: dopo sarebbe tardi, perche' il nodo le
 * schede se le va a prendere appena parte — ed e' proprio li' che cadeva.
 */
func UsaLeReti(r Reti) {
	retiMu.Lock()
	leReti = r
	retiMu.Unlock()

	netmon.RegisterInterfaceGetter(func() ([]netmon.Interface, error) {
		retiMu.Lock()
		chi := leReti
		retiMu.Unlock()
		if chi == nil {
			return nil, nil
		}
		return leggiSchede(chi.Elenco()), nil
	})
}

/*
 * Traduce quello che manda Kotlin.
 *
 * Non torna mai errore, ed e' voluto: una riga storta e' una scheda che si
 * salta, non un nodo che non parte. Se il formato cambiasse per sbaglio, il
 * peggio che puo' capitare e' che Tailscale creda di essere su una macchina
 * senza rete e usi un relay — lento, ma vivo. Molto meglio di un'app che si
 * rifiuta di aprirsi.
 */
func leggiSchede(testo string) []netmon.Interface {
	var fuori []netmon.Interface
	for _, riga := range strings.Split(testo, "\n") {
		riga = strings.TrimSpace(riga)
		if riga == "" {
			continue
		}
		pezzi := strings.Split(riga, ";")
		if len(pezzi) < 4 {
			continue
		}
		indice, _ := strconv.Atoi(pezzi[1])
		mtu, _ := strconv.Atoi(pezzi[2])

		var bandiere net.Flags
		for _, b := range pezzi[3] {
			switch b {
			case 'u':
				bandiere |= net.FlagUp | net.FlagRunning
			case 'l':
				bandiere |= net.FlagLoopback
			case 'p':
				bandiere |= net.FlagPointToPoint
			case 'm':
				bandiere |= net.FlagMulticast
			}
		}

		scheda := netmon.Interface{
			Interface: &net.Interface{
				Index: indice,
				MTU:   mtu,
				Name:  pezzi[0],
				Flags: bandiere,
			},
		}
		if len(pezzi) > 4 {
			scheda.AltAddrs = leggiIndirizzi(pezzi[4])
		}
		fuori = append(fuori, scheda)
	}
	return fuori
}

func leggiIndirizzi(testo string) []net.Addr {
	var fuori []net.Addr
	for _, uno := range strings.Split(testo, ",") {
		uno = strings.TrimSpace(uno)
		if uno == "" {
			continue
		}
		ip, rete, err := net.ParseCIDR(uno)
		if err != nil {
			// Senza i bit della maschera: si prende l'indirizzo e basta.
			if solo := net.ParseIP(uno); solo != nil {
				fuori = append(fuori, &net.IPNet{IP: solo, Mask: mascheraPiena(solo)})
			}
			continue
		}
		fuori = append(fuori, &net.IPNet{IP: ip, Mask: rete.Mask})
	}
	return fuori
}

func mascheraPiena(ip net.IP) net.IPMask {
	if ip.To4() != nil {
		return net.CIDRMask(32, 32)
	}
	return net.CIDRMask(128, 128)
}
