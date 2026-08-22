package it.daprod.suite

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import it.daprod.suite.data.Profili
import it.daprod.suite.net.GatewayClient
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

        var qualcunaFallita = false
        for (persona in persone) {
            val client = GatewayClient(persona.base, persona.token)
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