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

    suspend fun cerca(basi: List<String>, preferito: String?, token: String): Esito {
        val puliti = (listOfNotNull(preferito) + basi)
            .map { it.trim().trimEnd('/') }
            .filter { it.isNotBlank() }
            .distinct()
        if (puliti.isEmpty()) return Esito.Silenzio

        // Il preferito da solo: se c'è ancora, abbiamo finito qui.
        val primo = puliti.first()
        var qualcunoHaDettoNo = false
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

        // Gli altri tutti insieme: vince il primo che risponde.
        return withContext(Dispatchers.IO) {
            coroutineScope {
                val prove = altri.map { base -> async { base to colpo(base, token) } }
                var trovato: Esito? = null
                for (p in prove) {
                    val (base, come) = p.await()
                    if (come == GatewayClient.Colpo.RISPONDE) {
                        trovato = Esito.Trovato(base)
                        break
                    }
                    if (come == GatewayClient.Colpo.RIFIUTA) qualcunoHaDettoNo = true
                }
                for (p in prove) p.cancel()
                /**
                 * **Revocato solo se nessuno ha aperto e qualcuno ha detto no.**
                 *
                 * «Non risponde» e «non ti conosco» restano due cose diverse e
                 * si raccontano diversamente — è il motivo per cui questo enum
                 * ha tre valori e non due — ma la seconda adesso ha bisogno di
                 * un accordo, non della parola di un indirizzo solo.
                 */
                trovato ?: if (qualcunoHaDettoNo) Esito.Revocato else Esito.Silenzio
            }
        }
    }

    /** Un colpetto: `/io` risponde solo a chi ha la credenziale giusta. */
    private suspend fun colpo(base: String, token: String): GatewayClient.Colpo =
        GatewayClient(base, token).bussa(ATTESA_MS)
}
