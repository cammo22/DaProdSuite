package it.daprod.suite

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import it.daprod.suite.data.CodaOffline
import it.daprod.suite.data.Profili
import it.daprod.suite.net.GatewayClient
import it.daprod.suite.net.GatewayException
import it.daprod.suite.net.Indirizzi
import java.util.concurrent.TimeUnit

/**
 * Il lavoro in background: almeno ogni quarto d'ora guarda se il PC ha novità
 * per noi — un risultato pronto, uno stato cambiato — e lo dice con una
 * notifica. È questo che fa arrivare l'avviso anche ore dopo, con l'app chiusa.
 */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext

        /**
         * **Tutte le persone di questo telefono, non solo quella attiva.**
         *
         * Se in casa il telefono lo usano in due e il PC finisce il lavoro di
         * chi in quel momento non è entrato nell'app, la notifica deve arrivare
         * lo stesso: chi l'ha chiesto sta aspettando, e non ha nessun modo di
         * sapere che avrebbe dovuto cambiare profilo per essere avvisato.
         */
        val persone = Profili.tutti(ctx)
        if (persone.isEmpty()) return Result.success()

        val coda = CodaOffline(ctx)
        var qualcunaFallita = false

        for (persona in persone) {
            /**
             * **Quale indirizzo risponde adesso**, non quello di ieri.
             *
             * Lo stesso giro che fa l'app quando la apri: senza, il lavoro in
             * background continuerebbe a bussare a un indirizzo morto mentre il
             * computer è raggiungibile da un'altra parte.
             */
            val dove = Indirizzi.quale(persona.basi, persona.base, persona.token)
            if (dove == null) {
                qualcunaFallita = true
                continue
            }
            if (dove != persona.base) Profili.ricordaBase(ctx, persona.id, dove)
            val client = GatewayClient(dove, persona.token)

            /**
             * **Quello che ha scritto col PC spento parte adesso**, anche se
             * l'app è chiusa.
             *
             * Chiesto il 23 agosto 2026: «le persone da android devono poter
             * accedere all'app anche se l'app pc è disconnessa, in modo
             * comunque da mandare richieste, che quando viene riaperta l'app pc
             * compariranno». Prima la coda partiva solo riaprendo l'app e
             * aspettando la schermata: se il telefono restava in tasca, quello
             * che avevi scritto restava lì.
             */
            for (voce in coda.sue(persona.id)) {
                try {
                    client.eseguiAzione(voce.azione, voce.valori)
                    coda.rimuovi(voce)
                    Notifiche.mostra(ctx, persona.nome, "«${voce.titolo}» è partita: il computer è tornato.")
                } catch (e: GatewayException) {
                    // Il computer l'ha rifiutata: tenerla per sempre non aiuta.
                    coda.rimuovi(voce)
                    Notifiche.mostra(ctx, persona.nome, "«${voce.titolo}» non è stata accettata: ${e.message}")
                } catch (_: Exception) {
                    qualcunaFallita = true
                    break
                }
            }

            try {
                for ((id, testo) in client.notificheNonLette()) {
                    // Con più persone il nome serve: «pronto» da chi, se no.
                    Notifiche.mostra(ctx, persona.nome, testo)
                    client.segnaNotificaLetta(id)
                }
            } catch (_: Exception) {
                // PC spento o fuori rete: si riprova alla prossima finestra.
                qualcunaFallita = true
            }
        }
        return if (qualcunaFallita) Result.retry() else Result.success()
    }

    companion object {
        private const val NOME = "sync-suites"

        /** La programma una volta sola; le successive la lasciano com'è. */
        fun programma(context: Context) {
            val richiesta = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                NOME,
                ExistingPeriodicWorkPolicy.KEEP,
                richiesta,
            )
        }
    }
}