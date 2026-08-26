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
        when (colpo(primo, token)) {
            GatewayClient.Colpo.RISPONDE -> return Esito.Trovato(primo)
            // Un rifiuto è una risposta, e vale per tutti gli indirizzi dello
            // stesso computer: è il token a non andare bene, non la strada.
            GatewayClient.Colpo.RIFIUTA -> return Esito.Revocato
            GatewayClient.Colpo.NIENTE -> Unit
        }

        val altri = puliti.drop(1)
        if (altri.isEmpty()) return Esito.Silenzio

        // Gli altri tutti insieme: vince il primo che risponde.
        return withContext(Dispatchers.IO) {
            coroutineScope {
                val prove = altri.map { base -> async { base to colpo(base, token) } }
                var esito: Esito = Esito.Silenzio
                for (p in prove) {
                    val (base, come) = p.await()
                    if (come == GatewayClient.Colpo.RISPONDE) {
                        esito = Esito.Trovato(base)
                        break
                    }
                    if (come == GatewayClient.Colpo.RIFIUTA) esito = Esito.Revocato
                }
                for (p in prove) p.cancel()
                esito
            }
        }
    }

    /** Un colpetto: `/io` risponde solo a chi ha la credenziale giusta. */
    private suspend fun colpo(base: String, token: String): GatewayClient.Colpo =
        GatewayClient(base, token).bussa(ATTESA_MS)
}
