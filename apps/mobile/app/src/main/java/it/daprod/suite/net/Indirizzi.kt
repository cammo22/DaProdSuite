package it.daprod.suite.net

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

/**
 * Quale indirizzo del computer risponde, adesso.
 *
 * **Il difetto che questo file cura**, detto da chi l'ha visto: «se chiudo
 * l'app poi non si ricollega». Ed era vero, e la causa era una sola: il
 * telefono si ricordava **un** indirizzo. Ma un indirizzo è una fotografia —
 * cambia la rete di casa, passi dal wifi ai dati, il computer riavvia il
 * tunnel e ne prende uno nuovo — e da quel momento l'app dice «non
 * raggiungibile» per sempre, anche col computer acceso a due metri.
 *
 * Adesso il QR ne porta **tutti** (vedi `InvitoQr` v3), e qui si prova quale
 * risponde. Le regole sono tre, e ognuna toglie un'attesa:
 *
 * 1. **Prima quello che ha funzionato l'ultima volta.** Nove volte su dieci è
 *    ancora quello, e in quel caso non si prova nient'altro.
 * 2. **Poi tutti gli altri insieme**, non in fila. In fila, con tre indirizzi
 *    e un timeout di sei secondi, il caso peggiore sono diciotto secondi di
 *    schermata bianca: insieme sono sei.
 * 3. **Un tempo corto.** Qui non si sta scaricando niente: si sta bussando. Se
 *    un indirizzo non risponde in pochi secondi, non è quello giusto.
 */
object Indirizzi {

    /** Quanto si aspetta una risposta bussando. Corto: è solo un colpetto. */
    private const val ATTESA_MS = 6_000L

    /**
     * Il primo indirizzo che risponde, o `null` se non risponde nessuno.
     *
     * `preferito` è quello che ha funzionato l'ultima volta: si prova da solo
     * prima di disturbare gli altri.
     */
    suspend fun quale(basi: List<String>, preferito: String?, token: String): String? =
        (cerca(basi, preferito, token) as? Esito.Trovato)?.base

    /**
     * Com'è finita la ricerca. **Tre esiti**, perché «non risponde» e «dice di
     * no» sono due cose diverse e vanno raccontate diversamente.
     */
    sealed interface Esito {
        data class Trovato(val base: String) : Esito

        /**
         * Il computer c'è, e non ci riconosce più.
         *
         * Vuol dire una cosa sola: quel collegamento è stato tolto dal PC.
         * Mostrare la copia offline, in questo caso, sarebbe raccontare una
         * bugia — l'app sembrerebbe funzionare e non farebbe niente.
         */
        data object Revocato : Esito

        /** Nessuno risponde: spento, altra rete, linea giù. */
        data object Silenzio : Esito
    }

    /** La rete di casa: due metri, e l'indirizzo non cambia mai. */
    internal const val QUI_IN_CASA = 0

    /** Tailscale: esce di casa, e l'indirizzo non cambia mai. */
    internal const val VIA_TAILSCALE = 1

    /** Il tunnel: funziona ovunque, e scade sempre. */
    internal const val IL_TUNNEL = 2

    /**
     * ⚠ **Quanto è lontano un indirizzo.** Più basso è meglio.
     *
     * Serve a scegliere fra due che rispondono tutti e due, ed è la cura di
     * «ad ogni aggiornamento devo eliminare e rifare l'account» — detto tre
     * volte, e le prime due l'ho curato dalla parte sbagliata.
     *
     * ## La causa vera
     *
     * Il computer offre i suoi indirizzi in quest'ordine: **Tailscale, il
     * tunnel, la rete di casa** (vedi `indirizziDiOggi` in remoto.ts). Quell'
     * ordine è giusto per il **QR**, ed è stato scelto apposta nella 0.7.3:
     * «l'app connessione deve funzionare solo su internet, non ci interessa su
     * lan» — un telefono che si ricorda l'indirizzo di casa smette di
     * funzionare appena esce dalla porta.
     *
     * Ma qui non si sta scegliendo cosa mettere nel QR: si sta scegliendo **da
     * dove passare adesso**, e sono due domande diverse che avevano la stessa
     * risposta. Il risultato è che a casa il telefono usava **il tunnel**: ogni
     * immagine della galleria usciva su Internet, arrivava a Cloudflare e
     * tornava indietro per fare due metri.
     *
     * E soprattutto: il telefono si salva come `base` l'indirizzo che ha
     * funzionato, quindi si salvava **il tunnel**. Un indirizzo di
     * `trycloudflare.com` è una fotografia con la data sopra: cambia a **ogni
     * accensione della suite**, cioè a ogni aggiornamento. Nel registro del
     * tunnel di questo computer se ne contano dodici diversi. Il giorno dopo
     * quel nome risponde `530` — non è più il nostro computer, non è più
     * nessuno — e il telefono resta senza strada.
     *
     * Un indirizzo di casa, invece, **non cambia**. Preferirlo quando risponde
     * vuol dire che dopo il primo collegamento il telefono non dipende più da
     * un nome che scade.
     *
     * Fuori casa non cambia niente: la rete di casa non risponde, e vince
     * quello che risponde — Tailscale se c'è, altrimenti il tunnel.
     */
    internal fun quantoLontano(base: String): Int {
        val dentro = base.substringAfter("://").substringBefore(":").substringBefore("/")
        return when {
            // La rete di casa: due metri, e l'indirizzo non cambia mai.
            dentro.startsWith("192.168.") || dentro.startsWith("10.") -> QUI_IN_CASA
            Regex("^172\\.(1[6-9]|2[0-9]|3[01])\\.").containsMatchIn(dentro) -> QUI_IN_CASA
            /**
             * ⚠ **`127.0.0.1` qui vuol dire «passando da Tailscale».**
             *
             * Non e' il telefono che parla con se stesso: e' il buco che apre
             * `tailponte`, cioe' una porta locale che sbuca dentro il gateway
             * dall'altra parte del tailnet. Vedi `Tailnet.buco`.
             *
             * Vale come Tailscale perche' **e'** Tailscale: l'indirizzo non
             * scade, e funziona uguale in casa e fuori. Sta dietro alla rete di
             * casa e non davanti perche' quando si e' sul divano il salto
             * diretto resta piu' corto — due metri contro un giro che, se il
             * buco diretto non si forma, passa da un relay.
             */
            dentro == "127.0.0.1" || dentro == "localhost" -> VIA_TAILSCALE
            /**
             * ⚠ **Un `100.x` nudo, dal telefono, non risponde mai.**
             *
             * Sul computer Tailscale e' una scheda di rete vera e quell'
             * indirizzo si raggiunge. Sul telefono no: il nostro nodo vive
             * **dentro l'app**, in spazio utente, e ci si passa solo per il
             * buco. Una chiamata normale a `100.88.254.19` esce dalla rete del
             * telefono, dove quell'indirizzo non esiste, e muore in timeout.
             *
             * Il valore serve lo stesso, e serve a due cose: `Tailnet` lo usa
             * per riconoscere **dove** far sbucare il buco, e `strade` lo usa
             * per togliere di mezzo l'indirizzo nudo.
             */
            Regex("^100\\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\\.").containsMatchIn(dentro) -> VIA_TAILSCALE
            // Tutto il resto: il tunnel. Funziona ovunque e scade sempre.
            else -> IL_TUNNEL
        }
    }

    /**
     * ⚠ **Gli indirizzi su cui bussare davvero**, dati quelli che il
     * computer dice di avere.
     *
     * Fa una sostituzione sola, e conta: dove il computer offre il suo
     * indirizzo Tailscale — che dal telefono non risponde mai, vedi sopra —
     * ci mette **il buco**, che e' lo stesso posto raggiunto per la via giusta.
     *
     * Se Tailscale nel telefono non e' acceso, `apriIlBuco` torna null e il
     * `100.x` sparisce e basta: bussare a un indirizzo che non puo' rispondere
     * costa sei secondi di schermata bianca e non porta niente.
     */
    fun strade(basi: List<String>, apriIlBuco: (String) -> String?): List<String> {
        val fuori = mutableListOf<String>()
        var bucoMesso = false
        for (b in basi) {
            val suo = quantoLontano(b)
            val nudo = suo == VIA_TAILSCALE && !b.contains("127.0.0.1") && !b.contains("localhost")
            if (!nudo) {
                fuori.add(b)
                continue
            }
            if (bucoMesso) continue
            val buco = apriIlBuco(b)
            if (buco != null) {
                fuori.add(buco)
                bucoMesso = true
            }
        }
        return fuori.distinct()
    }

    /**
     * Fra quelli che hanno risposto, il piu' vicino.
     *
     * Una riga sola, e sta in una funzione sua per una ragione: e' la regola
     * che e' costata tre giri di correzioni sbagliate, ed e' l'unica cosa di
     * questo file che si puo' provare senza una rete. Vedi `IndirizziTest`.
     */
    internal fun ilPiuVicino(vivi: List<String>): String? =
        vivi.minByOrNull { quantoLontano(it) }

    suspend fun cerca(basi: List<String>, preferito: String?, token: String): Esito {
        val puliti = (listOfNotNull(preferito) + basi)
            .map { it.trim().trimEnd('/') }
            .filter { it.isNotBlank() }
            .distinct()
        if (puliti.isEmpty()) return Esito.Silenzio

        /**
         * **La scorciatoia, e quando non vale.**
         *
         * Se il preferito è già il più vicino che abbiamo, e risponde, abbiamo
         * finito: è il caso di nove aperture su dieci e costa un colpetto.
         *
         * Se invece il preferito è più lontano di qualcosa che abbiamo in
         * elenco — è il tunnel e c'è anche la rete di casa — allora **vale la
         * pena provarli tutti**, perché quello vicino potrebbe rispondere e
         * sarebbe la scelta giusta. Costa qualche centinaio di millisecondi
         * una volta all'apertura, e in cambio l'indirizzo che ci si salva non è
         * più uno che scade.
         */
        val piuVicino = puliti.minOf { quantoLontano(it) }
        val primo = puliti.first()
        var qualcunoHaDettoNo = false
        if (quantoLontano(primo) > piuVicino) return fraTutti(puliti, token)

        when (colpo(primo, token)) {
            GatewayClient.Colpo.RISPONDE -> return Esito.Trovato(primo)
            /**
             * ⚠ **Un rifiuto non ferma più la ricerca.**
             *
             * Qui c'era `return Esito.Revocato`, e la riga sopra spiegava
             * perché: un 401 vale per tutti gli indirizzi dello stesso
             * computer, quindi provarne altri è tempo perso.
             *
             * Il ragionamento è giusto e la premessa no: **non tutti gli
             * indirizzi di questa lista sono lo stesso computer.** Uno di essi
             * è il tunnel, e il tunnel prende un nome nuovo a ogni accensione
             * della suite — cioè a ogni aggiornamento. Il nome vecchio non
             * resta vuoto: Cloudflare lo ricicla, e quello che risponde di là
             * è il servizio di qualcun altro, che al nostro token dice 401.
             *
             * E `preferito` è quello che ha funzionato l'ultima volta: basta
             * aver usato l'app fuori casa una volta perché il tunnel sia il
             * primo della lista. Risultato: si aggiornava la suite, l'app
             * bussava a un indirizzo che non era più il nostro computer, si
             * prendeva un no e dichiarava una revoca — con il computer acceso
             * in salotto. Da lì l'unica strada che l'app offriva era rifare
             * l'accoppiamento, ed è esattamente quello che è stato riportato:
             * «ad ogni aggiornamento devo togliere e rimettere gli utenti».
             *
             * Adesso un no si segna e si va avanti. Una revoca vera la dicono
             * **tutti** gli indirizzi, non uno.
             */
            GatewayClient.Colpo.RIFIUTA -> qualcunoHaDettoNo = true
            GatewayClient.Colpo.NIENTE -> Unit
        }

        val altri = puliti.drop(1)
        if (altri.isEmpty()) return if (qualcunoHaDettoNo) Esito.Revocato else Esito.Silenzio
        return fraTutti(altri, token, qualcunoHaDettoNo)
    }

    /**
     * Li prova tutti insieme, e **fra quelli che rispondono sceglie il più
     * vicino** — non il più veloce.
     *
     * ⚠ È la riga che conta. Prima vinceva il primo che rispondeva, e il primo
     * dell'elenco è il tunnel: quindi a casa si passava da Internet, e
     * l'indirizzo che il telefono si salvava era quello che scade a ogni
     * riavvio della suite. Vedi `quantoLontano`.
     *
     * Si aspettano tutti e poi si sceglie: aspettare tutti costa il timeout del
     * più lento — sei secondi nel caso peggiore — e succede una volta
     * all'apertura. Fermarsi al primo costava un account da rifare a ogni
     * aggiornamento.
     */
    private suspend fun fraTutti(
        quali: List<String>,
        token: String,
        giaUnNo: Boolean = false,
    ): Esito = withContext(Dispatchers.IO) {
        coroutineScope {
            val prove = quali.map { base -> async { base to colpo(base, token) } }
            var qualcunoHaDettoNo = giaUnNo
            val vivi = mutableListOf<String>()
            for (p in prove) {
                val (base, come) = p.await()
                if (come == GatewayClient.Colpo.RISPONDE) vivi.add(base)
                if (come == GatewayClient.Colpo.RIFIUTA) qualcunoHaDettoNo = true
            }
            val migliore = ilPiuVicino(vivi)
            /**
             * **Revocato solo se nessuno ha aperto e qualcuno ha detto no.**
             *
             * «Non risponde» e «non ti conosco» restano due cose diverse e si
             * raccontano diversamente — è il motivo per cui questo enum ha tre
             * valori e non due — ma la seconda ha bisogno di un accordo, non
             * della parola di un indirizzo solo. Un `401` può arrivare da un
             * nome di tunnel riciclato che non è più il nostro computer.
             */
            if (migliore != null) Esito.Trovato(migliore)
            else if (qualcunoHaDettoNo) Esito.Revocato
            else Esito.Silenzio
        }
    }

    /** Un colpetto: `/io` risponde solo a chi ha la credenziale giusta. */
    private suspend fun colpo(base: String, token: String): GatewayClient.Colpo =
        GatewayClient(base, token).bussa(ATTESA_MS)
}
