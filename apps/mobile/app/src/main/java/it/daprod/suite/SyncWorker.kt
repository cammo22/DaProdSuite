package it.daprod.suite

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
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
 * Il lavoro in background: **la rete di sicurezza del lungo periodo.**
 *
 * Almeno ogni quarto d'ora guarda se il PC ha novità per noi — un risultato
 * pronto, un pensiero arrivato — e lo dice con una notifica. È questo che fa
 * arrivare l'avviso anche ore dopo, con l'app chiusa da un pezzo.
 *
 * ⚠ **Quello che questo non può fare**, ed è la metà mancante della 0.8.0: un
 * lavoro periodico di WorkManager **non scende sotto il quarto d'ora** — è un
 * limite di Android — e quel quarto d'ora è il minimo, non la promessa. Col
 * telefono in tasca e lo schermo spento, Doze accorpa questi lavori e li fa
 * girare quando gli conviene: mezz'ora, un'ora, o alla prima volta che
 * riprendi il telefono in mano. Da qui il difetto del 27 agosto 2026, «le
 * notifiche a volte non arrivano o arrivano in ritardo».
 *
 * L'altra metà è [Sentinella], che sta sveglia mentre il computer sta
 * lavorando per te e avvisa in venti secondi. I due si dividono il tempo:
 * lei i primi trenta minuti, questo tutto il resto della giornata.
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
             * **E gli indirizzi di oggi**, gia' che si e' arrivati.
             *
             * Il tunnel del PC cambia nome a ogni sua accensione. Farsi dire
             * qui dove si fa trovare adesso vuol dire che il telefono impara
             * l'indirizzo nuovo **mentre sta in tasca**, sulla wifi di casa, e
             * quando poi si esce quello buono ce l'ha gia'.
             */
            Profili.ricordaBasi(ctx, persona.id, client.indirizziDiAdesso())

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
                    Notifiche.mostraComunque(ctx, persona.nome, "«${voce.titolo}» è partita: il computer è tornato.")
                } catch (e: GatewayException) {
                    // Il computer l'ha rifiutata: tenerla per sempre non aiuta.
                    coda.rimuovi(voce)
                    Notifiche.mostraComunque(ctx, persona.nome, "«${voce.titolo}» non è stata accettata: ${e.message}")
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

        /**
         * La mette in calendario. **Aggiornandola, non tenendola com'è.**
         *
         * ⚠ Era `KEEP`, e voleva dire: se un lavoro con questo nome esiste già,
         * lascialo esattamente com'è. Sembra prudente ed è il modo più sicuro
         * di non far mai arrivare una correzione: chi aveva l'app installata
         * dalla 0.5 si teneva il lavoro programmato allora, con le regole di
         * allora, per sempre. Le due righe qui sotto — la rete e il riprovare —
         * non le avrebbe viste nessuno.
         *
         * Con `UPDATE` il lavoro si aggiorna e il calendario resta il suo:
         * aggiornare l'app non fa ripartire il conto da capo.
         */
        fun programma(context: Context) {
            val richiesta = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                /**
                 * **Senza linea non si prova nemmeno.**
                 *
                 * Un giro senza rete finisce sempre in `retry`, e ogni retry
                 * allunga l'attesa del giro dopo. In aereo, o in cantina,
                 * bastavano tre giri a vuoto per portare il prossimo controllo
                 * a un'ora e mezza dopo il ritorno della linea. Così invece
                 * Android lo tiene fermo finché la rete non c'è, e appena c'è
                 * lo fa partire.
                 */
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                /**
                 * E se va storto, si riprova presto.
                 *
                 * Il predefinito è esponenziale da trenta secondi, che dopo
                 * quattro tentativi è otto minuti e dopo sei è un'ora. Lineare
                 * da un minuto vuol dire: il PC si è acceso adesso, la prossima
                 * volta che ci proviamo è fra poco.
                 */
                .setBackoffCriteria(BackoffPolicy.LINEAR, 1, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                NOME,
                ExistingPeriodicWorkPolicy.UPDATE,
                richiesta,
            )
        }
    }
}