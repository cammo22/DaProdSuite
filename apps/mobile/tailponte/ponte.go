// Package tailponte mette Tailscale **dentro** l'app, senza VPN di sistema.
//
// # Il difetto che questo pacchetto cura
//
// Detto da chi la usa, il 6 settembre 2026: «continua a dare problemi quando
// aggiorno l'app». La causa, guardata fino in fondo, non era nel telefono ne'
// nel computer: era **l'indirizzo**.
//
// Da fuori casa il telefono raggiungeva il PC solo attraverso un tunnel
// Cloudflare, e il nome di un tunnel gratuito cambia **a ogni accensione della
// suite** — nel registro di quel computer se ne contano 43 diversi. Aggiornare
// vuol dire riaccendere, riaccendere vuol dire un nome nuovo, e il telefono
// resta con in mano un indirizzo che risponde 530. Per impararne uno nuovo
// dovrebbe parlare col PC, e per parlare col PC gli serve un indirizzo che
// funziona: un cane che si morde la coda, e si spezza solo tornando sulla wifi
// di casa.
//
// Un indirizzo Tailscale non cambia mai. Il PC ne ha gia' uno; mancava il
// telefono.
//
// # Perche' dentro l'app e non l'app di Tailscale
//
// Parole sue: «non voglio dover scaricare altre app». E' una richiesta di
// prodotto, non un capriccio: la suite si installa inquadrando un QR, e
// «adesso pero' installa anche quest'altra cosa e fatti un account» rimette
// esattamente il passo che la 1.0.0 aveva tolto.
//
// Si puo' fare perche' **non ci serve una VPN**. Una VPN di sistema dirotta
// tutto il telefono, chiede il permesso `VpnService`, e ne puo' stare accesa
// una sola per volta: prendersi quello slot per far passare le nostre richieste
// sarebbe sproporzionato e romperebbe la VPN di chi ne usa gia' una.
//
// Quello che serve e' molto meno: **una sola app che sa parlare col tailnet**.
// E' esattamente cosa fa `tsnet` — una pila di rete TCP/IP in spazio utente,
// dentro il processo, senza `/dev/tun` e senza privilegi. Il nodo esiste solo
// finche' l'app e' viva, e nessun'altra app del telefono se ne accorge.
//
// # Come lo vede Kotlin: una porta che sbuca dall'altra parte
//
// ⚠ Questa e' la scelta che tiene in piedi tutto il resto, e la prima volta
// l'avevo sbagliata.
//
// La strada ovvia e' un **proxy**: il pezzo Go apre una porta, Kotlin dice a
// OkHttp e alla WebView «passa di li'». Funziona, e costa caro: la WebView si
// configura solo con `ProxyController`, un proxy vale per **tutta** l'app, e
// allora servono le regole di scavalcamento — perche' `192.168.1.8` dentro il
// tailnet non esiste, e `trycloudflare.com` nemmeno. Tre modi diversi di
// sbagliare, e tutti e tre si vedono solo fuori casa.
//
// Quello che serve invece e' molto piu' piccolo: **un buco**. Il pezzo Go apre
// `127.0.0.1:qualcosa`, e tutto quello che ci entra esce dall'altra parte del
// tailnet, dentro il gateway. Da fuori e' un indirizzo come tutti gli altri:
//
//	http://127.0.0.1:41732   ← passa da Tailscale
//	http://192.168.1.8:8790  ← la wifi di casa
//	https://xxx.trycloudflare.com ← il tunnel
//
// Cosi' **niente va configurato**: la WebView carica un indirizzo, OkHttp
// chiama un indirizzo, e la logica che sceglie quale indirizzo usare — quella
// che gia' c'e', in `Indirizzi.kt` — si ritrova un candidato in piu' senza
// sapere cos'e' un tailnet.
//
// E siccome si travasa **TCP e basta**, senza guardare dentro, passano allo
// stesso modo le pagine, le immagini, i video in streaming e le websocket. Un
// proxy HTTP avrebbe dovuto capirle una per una.
package tailponte

import (
	"context"
	"errors"
	"io"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"tailscale.com/tsnet"
)

/*
 * Lo stato sta in variabili di pacchetto e non in una struttura, e la ragione
 * e' gomobile: quello che attraversa il confine con Kotlin puo' essere solo
 * roba semplice — stringhe, numeri, booleani, errori. Una struttura con dentro
 * un *tsnet.Server non ci passa. Quindi il server resta di qua, e di la' va
 * solo il numero di una porta.
 */
var (
	mu sync.Mutex

	// Il nodo. Nil quando e' spento.
	nodo *tsnet.Server

	// Il buco aperto adesso, se c'e'.
	buco *aperto

	// L'indirizzo da aprire nel browser per entrare nel tailnet. Vuoto quando
	// il nodo e' gia' autorizzato.
	urlLogin string

	// L'ultimo guaio, in italiano, per poterlo far vedere invece di un
	// «non raggiungibile» che non spiega niente.
	ultimoGuaio string
)

// Un buco aperto: la porta locale, dove sbuca, e come si chiude.
type aperto struct {
	ascolto      net.Listener
	porta        int
	destinazione string
}

/*
 * ⚠ **Quanto si aspetta l'autorizzazione.**
 *
 * `Start` torna subito, ma il nodo non e' utilizzabile finche' il tailnet non
 * lo riconosce. Con una chiave d'invito sono un paio di secondi; senza, non
 * succede finche' una persona non apre l'indirizzo nel browser — e quella
 * persona ci mette il tempo che ci mette.
 *
 * Quindi qui non si aspetta la fine: si aspetta **abbastanza da sapere se
 * serve un browser o no**, e si torna. Chi ha chiamato mostra l'indirizzo, e
 * il collegamento si completa da solo dopo.
 */
const attesaAutorizzazione = 12 * time.Second

// Avvia accende il nodo Tailscale. Non apre ancora nessun buco: quello e' Apri.
//
//   - dir e' una cartella dell'app dove il nodo tiene le sue chiavi. Deve
//     sopravvivere agli aggiornamenti, o a ogni versione nuova il telefono
//     entrerebbe nel tailnet come un dispositivo diverso — che e' esattamente
//     il difetto che stiamo curando.
//   - chiave e' una chiave d'invito Tailscale, se ce n'e' una. Vuota va bene:
//     in quel caso si passa dal browser, una volta sola.
//   - nome e' come si chiamera' il telefono nell'elenco dei dispositivi.
//
// Torna nil se il nodo e' partito. Che sia gia' **autorizzato** e' un'altra
// domanda, e la risposta sta in UrlDiLogin.
func Avvia(dir, chiave, nome string) error {
	mu.Lock()
	defer mu.Unlock()

	if nodo != nil {
		return nil
	}
	ultimoGuaio = ""

	if err := preparaLeCartelle(dir); err != nil {
		ultimoGuaio = "Non si scrivono le cartelle di Tailscale: " + err.Error()
		return err
	}

	n := &tsnet.Server{
		Dir:      dir,
		Hostname: pulisciNome(nome),
		AuthKey:  strings.TrimSpace(chiave),
		// Niente log: su Android non li legge nessuno e tsnet e' chiacchierone.
		// Quello che conta lo si chiede a LocalClient.
		Logf: func(string, ...any) {},
		// Il nodo non e' effimero: deve ritrovarsi lo stesso posto domani.
		Ephemeral: false,
	}
	if err := n.Start(); err != nil {
		ultimoGuaio = "Tailscale non e' partito: " + err.Error()
		return err
	}

	nodo = n
	urlLogin = cercaUrlDiLogin(n)
	return nil
}

/*
 * ⚠ **Dire a Tailscale dove sono le cartelle di questa app.**
 *
 * ## Il secondo muro, e come si e' visto
 *
 * Passato quello delle schede di rete, il nodo e' arrivato piu' avanti e ha
 * fatto una cosa peggiore di un errore: ha **ammazzato il processo**.
 *
 *	F libc: Fatal signal 6 (SIGABRT) in libgojni.so
 *	E Go  : panic: no safe place found to store log state
 *
 * Tailscale, per tenere lo stato dei suoi log, cerca in fila i posti che
 * conosce: le cartelle di sistema di Linux, poi `os.UserCacheDir()`, poi la
 * cartella corrente, poi una temporanea. Su Android **non esiste nessuno dei
 * quattro**: le cartelle di sistema sono vietate, `UserCacheDir` ha bisogno di
 * `HOME` o `XDG_CACHE_HOME` che nessuno imposta, la cartella corrente e' `/`, e
 * `/tmp` non c'e'. Finiti i posti, va in panico — e un panico dentro una
 * libreria nativa non e' un'eccezione che si cattura: e' l'app che sparisce.
 *
 * ## La cura
 *
 * Ogni app Android **ha** le sue cartelle, e sono scrivibili. Basta dirglielo
 * nel modo che Go gia' capisce, cioe' con le variabili d'ambiente di Unix: da
 * quel momento `os.UserCacheDir()` risponde, la prima strada buona si apre, e
 * il panico non arriva.
 *
 * Si mette qui e non in Kotlin perche' e' un dettaglio di **come e' fatto
 * Tailscale**, e chi legge il codice Kotlin non ha nessun motivo di sapere
 * che esiste.
 */
func preparaLeCartelle(dir string) error {
	if strings.TrimSpace(dir) == "" {
		return errors.New("non mi hai detto in che cartella stare")
	}
	cache := filepath.Join(dir, "cache")
	tmp := filepath.Join(dir, "tmp")
	for _, d := range []string{dir, cache, tmp} {
		if err := os.MkdirAll(d, 0o700); err != nil {
			return err
		}
	}
	os.Setenv("HOME", dir)
	os.Setenv("XDG_CACHE_HOME", cache)
	os.Setenv("XDG_CONFIG_HOME", filepath.Join(dir, "config"))
	os.Setenv("TMPDIR", tmp)
	return nil
}

/*
 * ⚠ **Il nome del nodo lo decide Tailscale, non noi.**
 *
 * Un nome di dispositivo puo' avere lettere, numeri e trattini. Il nome che
 * l'utente ha dato al telefono no: «Cammo — Pixel 8» ne ha tre, di caratteri
 * che non vanno bene. Se glielo si manda cosi', Tailscale non da' errore: se
 * ne inventa uno suo, e il telefono compare nell'elenco con un nome che
 * nessuno riconosce. Meglio storpiarlo qui, dove si vede.
 */
func pulisciNome(nome string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(strings.TrimSpace(nome)) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteRune('-')
		}
	}
	pulito := strings.Trim(b.String(), "-")
	for strings.Contains(pulito, "--") {
		pulito = strings.ReplaceAll(pulito, "--", "-")
	}
	if pulito == "" {
		return "daprod-telefono"
	}
	if len(pulito) > 40 {
		pulito = strings.Trim(pulito[:40], "-")
	}
	return pulito
}

/*
 * L'indirizzo da far aprire, o stringa vuota se il nodo e' gia' a posto.
 *
 * Si guarda per qualche secondo invece di una volta sola: subito dopo `Start`
 * lo stato e' «NoState», e l'indirizzo compare un attimo dopo. Chiedendolo una
 * volta sola tornerebbe vuoto quasi sempre, e chi ha chiamato penserebbe di
 * essere gia' dentro.
 */
func cercaUrlDiLogin(n *tsnet.Server) string {
	ctx, stop := context.WithTimeout(context.Background(), attesaAutorizzazione)
	defer stop()

	lc, err := n.LocalClient()
	if err != nil {
		return ""
	}
	for {
		st, err := lc.Status(ctx)
		if err == nil && st != nil {
			if st.BackendState == "Running" {
				return ""
			}
			if st.AuthURL != "" {
				return st.AuthURL
			}
		}
		select {
		case <-ctx.Done():
			return ""
		case <-time.After(400 * time.Millisecond):
		}
	}
}

/*
 * Apri fa un buco che sbuca dentro il tailnet, e torna la porta locale.
 *
 * `destinazione` e' host:porta **dentro il tailnet** — per esempio
 * `100.88.254.19:8790`. Da quel momento `http://127.0.0.1:<torna qui>` e'
 * lo stesso identico posto, e ci si puo' puntare la WebView.
 *
 * Chiamarla di nuovo con un'altra destinazione chiude la vecchia: un telefono
 * parla con un computer per volta, e tenere aperti buchi che nessuno usa
 * vorrebbe dire tenere in vita connessioni verso un nodo che magari e' sparito.
 */
func Apri(destinazione string) (int, error) {
	mu.Lock()
	defer mu.Unlock()

	if nodo == nil {
		return 0, errors.New("Tailscale non e' acceso")
	}
	dove := strings.TrimSpace(destinazione)
	if dove == "" {
		return 0, errors.New("non mi hai detto dove")
	}
	if buco != nil {
		if buco.destinazione == dove {
			return buco.porta, nil
		}
		_ = buco.ascolto.Close()
		buco = nil
	}

	ascolto, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		ultimoGuaio = "Non si e' aperta la porta locale: " + err.Error()
		return 0, err
	}
	_, p, _ := net.SplitHostPort(ascolto.Addr().String())
	numero, _ := strconv.Atoi(p)

	buco = &aperto{ascolto: ascolto, porta: numero, destinazione: dove}
	go travasa(ascolto, nodo, dove)
	return numero, nil
}

/*
 * Il travaso. Ogni connessione che arriva sulla porta locale ne apre una
 * gemella dentro il tailnet, e si copiano i byte nei due sensi.
 *
 * Non si guarda **niente** di quello che passa: ne' HTTP, ne' intestazioni, ne'
 * dove sta andando. E' apposta — cosi' passano allo stesso modo le pagine, i
 * video che si scaricano un pezzo per volta, e le websocket delle notifiche.
 * Un proxy che capisce HTTP avrebbe dovuto imparare le websocket a parte, e
 * l'avrebbe imparate male.
 */
func travasa(ascolto net.Listener, n *tsnet.Server, dove string) {
	for {
		di_qua, err := ascolto.Accept()
		if err != nil {
			return // il buco e' stato chiuso: e' la fine normale
		}
		go unaConnessione(di_qua, n, dove)
	}
}

func unaConnessione(di_qua net.Conn, n *tsnet.Server, dove string) {
	defer di_qua.Close()

	ctx, stop := context.WithTimeout(context.Background(), 20*time.Second)
	di_la, err := n.Dial(ctx, "tcp", dove)
	stop()
	if err != nil {
		mu.Lock()
		ultimoGuaio = "Non si arriva a " + dove + " dentro Tailscale: " + err.Error()
		mu.Unlock()
		return
	}
	defer di_la.Close()

	fine := make(chan struct{}, 2)
	copia := func(a io.Writer, b io.Reader) {
		_, _ = io.Copy(a, b)
		fine <- struct{}{}
	}
	go copia(di_la, di_qua)
	go copia(di_qua, di_la)
	<-fine
}

/*
 * ⚠ **Ci arrivo davvero, da qui?**
 *
 * Torna stringa vuota se si arriva, e il motivo se no.
 *
 * ## Perche' serve, e cosa ha nascosto
 *
 * Il 6 settembre 2026, con l'app in mano: «ho collegato tailscale a google e
 * comunque dopo l'update stesso problema». Nel foglio c'era scritto **«Acceso.
 * Questo telefono adesso si chiama 100.87.91.65»**, in verde, e non raggiungeva
 * niente.
 *
 * Era vero e non voleva dire niente. Il nodo era acceso davvero — ma dentro
 * **un'altra rete Tailscale**: entrando con Google si finisce nel tailnet di
 * quell'account, e il computer sta in un altro. Due nodi accesi che non si
 * vedranno mai.
 *
 * «Acceso» rispondeva alla domanda sbagliata. La domanda e' una sola — **ci
 * arrivo al computer?** — e la risposta la puo' dare solo una connessione vera.
 * Da qui questa funzione: apre un socket verso il computer e guarda com'e'
 * andata. Un secondo, e non si puo' sbagliare.
 */
func Provo(destinazione string) string {
	mu.Lock()
	n := nodo
	mu.Unlock()
	if n == nil {
		return "Tailscale non e' acceso."
	}
	dove := strings.TrimSpace(destinazione)
	if dove == "" {
		return "non mi hai detto dove"
	}
	ctx, stop := context.WithTimeout(context.Background(), 12*time.Second)
	defer stop()
	c, err := n.Dial(ctx, "tcp", dove)
	if err != nil {
		return err.Error()
	}
	_ = c.Close()
	return ""
}

// MioTailnet torna il nome completo di questo nodo, tipo
// «telefono.tailXXXX.ts.net». Serve a far vedere **in quale rete** si e'
// entrati, che e' la cosa che l'utente non poteva sapere.
func MioTailnet() string {
	mu.Lock()
	n := nodo
	mu.Unlock()
	if n == nil {
		return ""
	}
	lc, err := n.LocalClient()
	if err != nil {
		return ""
	}
	ctx, stop := context.WithTimeout(context.Background(), 5*time.Second)
	defer stop()
	st, err := lc.Status(ctx)
	if err != nil || st == nil || st.Self == nil {
		return ""
	}
	return strings.TrimSuffix(st.Self.DNSName, ".")
}

// Porta dice su quale porta di 127.0.0.1 c'e' il buco adesso. 0 se non ce n'e'.
func Porta() int {
	mu.Lock()
	defer mu.Unlock()
	if buco == nil {
		return 0
	}
	return buco.porta
}

// UrlDiLogin torna l'indirizzo da aprire nel browser per far entrare questo
// telefono nel tailnet, o stringa vuota se non serve.
func UrlDiLogin() string {
	mu.Lock()
	defer mu.Unlock()
	return urlLogin
}

// Acceso dice se il nodo e' partito **ed e' autorizzato**, cioe' se adesso di
// qui ci si passa davvero.
func Acceso() bool {
	mu.Lock()
	n := nodo
	mu.Unlock()
	if n == nil {
		return false
	}
	lc, err := n.LocalClient()
	if err != nil {
		return false
	}
	ctx, stop := context.WithTimeout(context.Background(), 3*time.Second)
	defer stop()
	st, err := lc.Status(ctx)
	if err != nil || st == nil {
		return false
	}
	if st.BackendState == "Running" {
		mu.Lock()
		urlLogin = ""
		mu.Unlock()
		return true
	}
	if st.AuthURL != "" {
		mu.Lock()
		urlLogin = st.AuthURL
		mu.Unlock()
	}
	return false
}

// MioIndirizzo torna l'IP che questo telefono ha nel tailnet, per poterlo far
// vedere quando qualcosa non torna. Vuoto se non e' ancora dentro.
func MioIndirizzo() string {
	mu.Lock()
	n := nodo
	mu.Unlock()
	if n == nil {
		return ""
	}
	quattro, _ := n.TailscaleIPs()
	if quattro.IsValid() {
		return quattro.String()
	}
	return ""
}

// UltimoGuaio torna l'ultimo errore in italiano, o stringa vuota.
func UltimoGuaio() string {
	mu.Lock()
	defer mu.Unlock()
	return ultimoGuaio
}

// Spegni chiude il buco e il nodo.
func Spegni() error {
	mu.Lock()
	n, b := nodo, buco
	nodo, buco, urlLogin = nil, nil, ""
	mu.Unlock()

	if b != nil {
		_ = b.ascolto.Close()
	}
	if n == nil {
		return errors.New("non era acceso")
	}
	return n.Close()
}
