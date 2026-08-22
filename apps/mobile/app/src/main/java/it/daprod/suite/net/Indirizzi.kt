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
    suspend fun quale(basi: List<String>, preferito: String?, token: String): String? {
        val puliti = (listOfNotNull(preferito) + basi)
            .map { it.trim().trimEnd('/') }
            .filter { it.isNotBlank() }
            .distinct()
        if (puliti.isEmpty()) return null

        // Il preferito da solo: se c'è ancora, abbiamo finito qui.
        val primo = puliti.first()
        if (bussa(primo, token)) return primo

        val altri = puliti.drop(1)
        if (altri.isEmpty()) return null

        // Gli altri tutti insieme: vince il primo che risponde.
        return withContext(Dispatchers.IO) {
            coroutineScope {
                val prove = altri.map { base -> async { if (bussa(base, token)) base else null } }
                // `awaitAll` aspetterebbe anche i perdenti; qui basta il primo
                // che torna qualcosa, e gli altri si annullano uscendo di scope.
                var vinto: String? = null
                for (p in prove) {
                    val esito = p.await()
                    if (esito != null) {
                        vinto = esito
                        break
                    }
                }
                for (p in prove) p.cancel()
                vinto
            }
        }
    }

    /** Un colpetto: `/io` risponde solo a chi ha la credenziale giusta. */
    private suspend fun bussa(base: String, token: String): Boolean =
        GatewayClient(base, token).raggiungibile(ATTESA_MS)
}
