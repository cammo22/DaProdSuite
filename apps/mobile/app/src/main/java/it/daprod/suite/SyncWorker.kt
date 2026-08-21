package it.daprod.suite

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import it.daprod.suite.data.Store
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
        val host = Store.host(ctx) ?: return Result.success()
        val token = Store.token(ctx) ?: return Result.success()

        val client = GatewayClient(host, token)
        return try {
            val notifiche = client.notificheNonLette()
            for ((id, testo) in notifiche) {
                Notifiche.mostra(ctx, ctx.getString(R.string.app_name), testo)
                client.segnaNotificaLetta(id)
            }
            Result.success()
        } catch (_: Exception) {
            // PC spento o fuori rete: si riprova alla prossima finestra.
            Result.retry()
        }
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