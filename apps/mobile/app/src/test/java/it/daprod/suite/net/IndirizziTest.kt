package it.daprod.suite.net

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * La regola che e' costata tre giri.
 *
 * «Ad ogni aggiornamento devo eliminare e rifare l'account» e' stato detto il
 * 5, il 6 e ancora il 6 settembre 2026. Le prime due volte l'ho curato dalla
 * parte sbagliata — prima il conteggio dei rifiuti, poi la scoperta sulla rete
 * — perche' la causa vera non si vedeva da nessuna parte.
 *
 * ## Cos'era
 *
 * Il computer offre i suoi indirizzi in quest'ordine: Tailscale, **il tunnel**,
 * la rete di casa. E' l'ordine giusto per il QR, scelto apposta nella 0.7.3:
 * un telefono che si ricorda l'indirizzo di casa smette di funzionare appena
 * esce dalla porta.
 *
 * Ma il telefono usava quello stesso ordine per decidere **da dove passare
 * adesso**, e si fermava al primo che rispondeva. A casa rispondeva il tunnel,
 * quindi ogni immagine della galleria usciva su Internet per fare due metri —
 * e, quel che conta, il telefono si salvava **il tunnel** come indirizzo
 * preferito. Un nome di `trycloudflare.com` cambia a ogni accensione della
 * suite: nel registro di quel computer se ne contano dodici. Il giorno dopo
 * quel nome risponde `530`, e il telefono resta senza strada.
 *
 * ## Perche' una prova, e perche' qui
 *
 * Perche' e' una regola di due righe che nessuno vede violare. Il codice
 * continua a funzionare benissimo anche scegliendo l'indirizzo sbagliato: si
 * rompe una settimana dopo, su un altro computer, dopo un aggiornamento.
 *
 * E' anche il primo banco di prova di questo modulo: gira sulla JVM, senza
 * Android e senza rete, con `gradlew test`.
 */
class IndirizziTest {

    private val casa = "http://192.168.1.8:8790"
    private val tailscale = "http://100.88.254.19:8790"
    private val tunnel = "https://readers-planet-antarctica-collaborative.trycloudflare.com"

    @Test
    fun `la rete di casa e la piu vicina`() {
        assertEquals(0, Indirizzi.quantoLontano(casa))
        assertEquals(0, Indirizzi.quantoLontano("http://10.0.0.5:8790"))
        assertEquals(0, Indirizzi.quantoLontano("http://172.20.1.4:8790"))
    }

    @Test
    fun `Tailscale sta in mezzo`() {
        assertEquals(1, Indirizzi.quantoLontano(tailscale))
        assertEquals(1, Indirizzi.quantoLontano("http://100.64.0.1:8790"))
        assertEquals(1, Indirizzi.quantoLontano("http://100.127.255.254:8790"))
    }

    @Test
    fun `il tunnel e il piu lontano`() {
        assertEquals(2, Indirizzi.quantoLontano(tunnel))
        assertEquals(2, Indirizzi.quantoLontano("https://qualcosa.example.com"))
    }

    /**
     * ⚠ `100.88.x` e' Tailscale, `10.x` e' casa, e `100.7.x` non e' ne' l'uno
     * ne' l'altro.
     *
     * Il caso che sembra un dettaglio e non lo e': un controllo scritto con
     * `startsWith("10.")` fatto male prenderebbe anche `100.88.254.19`, e
     * l'indirizzo Tailscale finirebbe classificato come rete di casa. Il
     * telefono lo preferirebbe sempre, anche fuori casa dove non risponde.
     */
    @Test
    fun `cento non e dieci`() {
        assertEquals(1, Indirizzi.quantoLontano("http://100.88.254.19:8790"))
        assertEquals(0, Indirizzi.quantoLontano("http://10.88.254.19:8790"))
        assertEquals(2, Indirizzi.quantoLontano("http://100.7.3.1:8790"))
    }

    /**
     * **La regola, in una riga.** Fra quelli che hanno risposto vince il
     * vicino, non il veloce.
     */
    @Test
    fun `fra chi risponde vince il vicino`() {
        assertEquals(casa, Indirizzi.ilPiuVicino(listOf(tunnel, tailscale, casa)))
        assertEquals(casa, Indirizzi.ilPiuVicino(listOf(casa, tunnel)))
        // Fuori casa la rete di casa non risponde, e vince quello che c'e'.
        assertEquals(tailscale, Indirizzi.ilPiuVicino(listOf(tunnel, tailscale)))
        assertEquals(tunnel, Indirizzi.ilPiuVicino(listOf(tunnel)))
    }

    @Test
    fun `se non risponde nessuno non si sceglie niente`() {
        assertNull(Indirizzi.ilPiuVicino(emptyList()))
    }

    /**
     * L'ordine in cui arrivano non conta.
     *
     * E' il punto: prima contava, ed era l'ordine del QR — pensato per un'altra
     * domanda.
     */
    @Test
    fun `l ordine di arrivo non conta`() {
        val atteso = casa
        assertEquals(atteso, Indirizzi.ilPiuVicino(listOf(casa, tailscale, tunnel)))
        assertEquals(atteso, Indirizzi.ilPiuVicino(listOf(tunnel, casa, tailscale)))
        assertEquals(atteso, Indirizzi.ilPiuVicino(listOf(tailscale, tunnel, casa)))
    }

    /* ------------------------------------------- il buco di Tailscale (1.0.1) */

    /**
     * ⚠ **Un `100.x` nudo vale come Tailscale, ma dal telefono non risponde.**
     *
     * Il valore serve a riconoscerlo — e' cosi' che `strade` sa quale
     * indirizzo sostituire col buco — ma l'indirizzo in se' non e'
     * raggiungibile: il nodo del telefono vive dentro l'app, in spazio utente.
     */
    @Test
    fun `il buco vale come Tailscale`() {
        assertEquals(Indirizzi.VIA_TAILSCALE, Indirizzi.quantoLontano("http://127.0.0.1:41732"))
        assertEquals(Indirizzi.VIA_TAILSCALE, Indirizzi.quantoLontano(tailscale))
    }

    /**
     * E resta **dietro alla rete di casa**: sul divano il salto diretto e' piu'
     * corto di un giro che, se il collegamento diretto non si forma, passa da
     * un relay.
     */
    @Test
    fun `in casa vince la wifi anche col buco aperto`() {
        assertEquals(casa, Indirizzi.ilPiuVicino(listOf("http://127.0.0.1:41732", casa, tunnel)))
    }

    /** Fuori casa, invece, il buco batte il tunnel: uno non scade, l'altro si'. */
    @Test
    fun `fuori casa il buco batte il tunnel`() {
        assertEquals(
            "http://127.0.0.1:41732",
            Indirizzi.ilPiuVicino(listOf(tunnel, "http://127.0.0.1:41732")),
        )
    }

    /**
     * ⚠ **Col ponte acceso, l'indirizzo nudo sparisce e resta il buco.**
     *
     * E' la prova che tiene: se restassero tutti e due, ogni apertura
     * dell'app spenderebbe sei secondi a bussare a un indirizzo che non puo'
     * rispondere — che e' esattamente il genere di attesa che non si vede nel
     * codice e si sente in mano.
     */
    @Test
    fun `col ponte acceso il cento punto x diventa il buco`() {
        val dentro = Indirizzi.strade(listOf(tailscale, casa, tunnel)) { "http://127.0.0.1:41732" }
        assertEquals(listOf("http://127.0.0.1:41732", casa, tunnel), dentro)
    }

    /** E col ponte spento sparisce e basta: non lo si va a bussare per niente. */
    @Test
    fun `col ponte spento il cento punto x sparisce`() {
        assertEquals(listOf(casa, tunnel), Indirizzi.strade(listOf(tailscale, casa, tunnel)) { null })
    }

    /** Chi Tailscale non ce l'ha non si accorge di niente. */
    @Test
    fun `senza Tailscale la lista non cambia`() {
        assertEquals(listOf(casa, tunnel), Indirizzi.strade(listOf(casa, tunnel)) { null })
    }

    /**
     * Il buco si apre **una volta sola**, anche se il computer offre due
     * indirizzi del tailnet: ne serve uno, e aprirne due vorrebbe dire tenere
     * due porte per la stessa strada.
     */
    @Test
    fun `il buco si apre una volta sola`() {
        var quante = 0
        val dentro = Indirizzi.strade(listOf(tailscale, "http://100.70.1.2:8790", casa)) {
            quante++
            "http://127.0.0.1:41732"
        }
        assertEquals(1, quante)
        assertEquals(listOf("http://127.0.0.1:41732", casa), dentro)
    }
}
