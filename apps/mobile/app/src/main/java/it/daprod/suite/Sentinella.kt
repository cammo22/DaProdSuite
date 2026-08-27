package it.daprod.suite

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import it.daprod.suite.data.Profili
import it.daprod.suite.net.GatewayClient
import it.daprod.suite.net.Indirizzi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * La sentinella: **sta sveglia finché il computer sta lavorando per te.**
 *
 * ## Il difetto, detto il 27 agosto 2026
 *
 * > «Le notifiche Android quando chiudo l'app a volte non arrivano o arrivano
 * > in ritardo.»
 *
 * Ed era esatto, compreso il «a volte». Fino alla 0.7.8 l'unica cosa che
 * guardava se il computer aveva finito, con l'app chiusa, era [SyncWorker]: un
 * lavoro periodico di WorkManager. Il suo intervallo più corto **è un quarto
 * d'ora** — è un limite di Android, non una nostra scelta — e quel quarto d'ora
 * è il *minimo*: dentro Doze, cioè col telefono in tasca e lo schermo spento,
 * Android accorpa quei lavori e li fa girare quando gli conviene. Mezz'ora,
 * un'ora, oppure alla prima volta che riprendi il telefono in mano.
 *
 * Per una notifica del tipo «ti hanno mandato un pensiero» va benissimo. Per
 * **«il video che hai chiesto è pronto»** non serve a niente: quel video ci
 * mette tre minuti, e l'avviso arrivava quaranta minuti dopo — cioè molto dopo
 * che eri andato a guardare da solo.
 *
 * ## Come si cura, senza un servizio di notifiche
 *
 * Le app che avvisano all'istante lo fanno con il push (Firebase e simili): un
 * server su Internet che sveglia il telefono. Qui il «server» è il PC di casa
 * di chi usa la suite: non può bussare al telefono, e mettere un servizio in
 * mezzo sarebbe contro tutta la ragione per cui questa suite esiste.
 *
 * Quello che si può fare — e che Android è d'accordo che si faccia — è
 * **restare svegli finché c'è un motivo per esserlo**. Questo è un servizio in
 * primo piano: parte quando chiudi l'app, chiede ogni venti secondi se è
 * pronto, e si spegne da solo appena non c'è più niente in ballo.
 *
 * Tre regole, e sono quelle che lo rendono onesto invece che invadente:
 *
 * - **non resta acceso se non c'è niente da aspettare.** La prima cosa che fa è
 *   chiedere al computer cosa ha in mano di tuo: se non ha niente, si spegne
 *   prima di aver fatto in tempo a consumare qualcosa.
 * - **si spegne appena la fila si svuota**, e comunque dopo [MASSIMO_MINUTI]
 *   minuti. Un servizio che resta acceso «per sicurezza» è un servizio che
 *   consuma batteria per niente.
 * - **la sua notifica dice qualcosa.** Android obbliga a mostrarne una, e
 *   invece di sprecarla con «l'app è in esecuzione» ci scriviamo a che punto è
 *   la fila: si legge «è 2° in fila» senza aprire niente.
 *
 * [SyncWorker] resta, e resta importante: è la rete di sicurezza per tutto
 * quello che succede dopo — un pensiero che qualcuno ti manda alle tre di
 * notte, una richiesta rifiutata mentre il telefono era senza linea.
 */
class Sentinella : Service() {

    private var lavoro: Job? = null
    private val ambito = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Già in piedi: due chiusure dell'app di fila non fanno due sentinelle.
        if (lavoro?.isActive == true) return START_NOT_STICKY

        creaCanale(this)
        mostrati("Guardo se il computer ha finito.")
        lavoro = ambito.launch { veglia() }
        // NOT_STICKY: se Android ci ferma per fare posto, non ci vogliamo
        // risvegliare da soli più tardi senza sapere più se c'è un motivo.
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        lavoro?.cancel()
    }

    /**
     * Il giro di guardia.
     *
     * Per ogni persona di questo telefono — non solo quella attiva, ed è la
     * stessa ragione per cui lo fa [SyncWorker]: se in casa il telefono lo usano
     * in due, il lavoro dell'altro non è meno pronto.
     */
    private suspend fun veglia() {
        val fine = System.currentTimeMillis() + MASSIMO_MINUTI * 60_000L
        var giriAVuoto = 0

        while (ambito.isActive && System.currentTimeMillis() < fine) {
            var qualcosaInBallo = false
            var daDire: String? = null

            for (persona in Profili.tutti(this)) {
                val dove = Indirizzi.quale(persona.basi, persona.base, persona.token) ?: continue
                if (dove != persona.base) Profili.ricordaBase(this, persona.id, dove)
                val cliente = GatewayClient(dove, persona.token)

                // Prima le notifiche: sono la ragione per cui siamo svegli.
                try {
                    for ((id, testo) in cliente.notificheNonLette()) {
                        Notifiche.mostra(this, persona.nome, testo)
                        cliente.segnaNotificaLetta(id)
                    }
                } catch (_: Exception) {
                    // Il computer non risponde adesso: al giro dopo.
                }

                val attesa = cliente.cosaAspetto(persona.nome)
                if (attesa != null) {
                    qualcosaInBallo = true
                    if (daDire == null) daDire = attesa.riga
                }
            }

            if (qualcosaInBallo) {
                giriAVuoto = 0
                mostrati(daDire ?: "Aspetto il computer.")
            } else {
                /**
                 * **Due giri a vuoto, non uno.**
                 *
                 * Fra il momento in cui una richiesta parte dalla pagina e
                 * quello in cui compare nella fila del computer passa qualche
                 * istante. Spegnersi al primo «non c'è niente» vorrebbe dire
                 * spegnersi esattamente nel momento in cui uno ha premuto Manda
                 * e ha chiuso l'app — cioè sempre.
                 */
                giriAVuoto += 1
                if (giriAVuoto >= 2) break
                mostrati("Guardo se il computer ha finito.")
            }

            delay(OGNI_MS)
        }
        smetti()
    }

    /* -------------------------------------------------------- la notifica */

    private fun mostrati(riga: String) {
        val avviso = NotificationCompat.Builder(this, CANALE)
            .setSmallIcon(R.drawable.ic_notifica)
            .setContentTitle("DaProd Suite")
            .setContentText(riga)
            .setContentIntent(Notifiche.apriLApp(this))
            // Silenziosa e in fondo: è un promemoria di cosa sta succedendo, non
            // un avviso. Quello vero arriva quando il lavoro è pronto.
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .setOngoing(true)
            .build()
        partiInPrimoPiano(avviso)
    }

    private fun partiInPrimoPiano(avviso: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Da Android 14 il tipo va dichiarato anche qui, non solo nel
            // manifesto, o il servizio non parte affatto.
            startForeground(ID_AVVISO, avviso, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(ID_AVVISO, avviso)
        }
    }

    private fun smetti() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    companion object {
        private const val CANALE = "attesa"
        private const val ID_AVVISO = 4201

        /** Ogni quanto si chiede al computer. Venti secondi. */
        private const val OGNI_MS = 20_000L

        /**
         * Per quanto al massimo si resta svegli.
         *
         * Mezz'ora copre qualunque cosa la suite sappia fare — il video più
         * lungo sono minuti — e mette un tetto a quello che succede se il
         * computer si pianta con la fila piena. Dopo, la palla torna a
         * [SyncWorker], che è fatto apposta per il lungo periodo.
         */
        private const val MASSIMO_MINUTI = 30L

        fun creaCanale(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val canale = NotificationChannel(
                CANALE,
                context.getString(R.string.attesa_canale),
                NotificationManager.IMPORTANCE_MIN,
            ).apply {
                description = context.getString(R.string.attesa_descrizione)
                setShowBadge(false)
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(canale)
        }

        /**
         * Mettila di guardia.
         *
         * Si chiama quando l'app va in secondo piano. Il controllo su «c'è
         * qualcosa da aspettare?» lo fa la sentinella appena parte: qui non si
         * può, perché è una domanda che vuole la rete, e questo è il momento in
         * cui l'utente sta premendo Home.
         */
        fun diGuardia(context: Context) {
            val intento = Intent(context, Sentinella::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intento)
                } else {
                    context.startService(intento)
                }
            } catch (_: Exception) {
                /**
                 * Da Android 12 un servizio in primo piano non si può far
                 * partire da un'app che è già in secondo piano, e qui ci si
                 * arriva per un pelo: questo parte mentre l'activity si sta
                 * fermando. Se Android dice di no non si insiste e non si
                 * avvisa nessuno — [SyncWorker] fa comunque il suo giro, con i
                 * suoi tempi. Meglio una notifica in ritardo che un errore in
                 * faccia a chi ha solo premuto Home.
                 */
            }
        }

        /** Torna a riposo: l'app è di nuovo aperta, e guarda lei. */
        fun aRiposo(context: Context) {
            try {
                context.stopService(Intent(context, Sentinella::class.java))
            } catch (_: Exception) {
                // Non era in piedi: va bene così.
            }
        }
    }
}
