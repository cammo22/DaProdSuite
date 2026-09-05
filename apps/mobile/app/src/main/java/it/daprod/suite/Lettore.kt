package it.daprod.suite

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle

/**
 * Il suono che non si ferma quando il telefono va in tasca.
 *
 * ## Il difetto, e perché una pagina non lo può curare da sola
 *
 * Chiesto il 5 settembre 2026: «fare in modo che la riproduzione continui anche
 * se minimizzato».
 *
 * La musica la suona la pagina, dentro la WebView, con un `<audio>` — ed è
 * giusto così: è l'unico posto da cui il visualizer può *sentire* il suono
 * (Web Audio vuole l'elemento, non un altoparlante da qualche altra parte).
 * Ma una WebView vive dentro un processo, e un processo senza niente in primo
 * piano Android lo può spegnere quando gli pare: passi a WhatsApp, torni dopo
 * due minuti, e la canzone è finita a metà senza che nessuno abbia premuto
 * niente.
 *
 * ## Cosa fa questo servizio, e cosa non fa
 *
 * **Non suona niente.** Non c'è un MediaPlayer qui dentro, e non ci deve
 * essere: due lettori che suonano la stessa canzone sono un'eco. Questo tiene
 * il processo in primo piano — che è quello che dice ad Android «questa app
 * sta facendo una cosa per l'utente, lasciala stare» — e mette i comandi dove
 * uno se li aspetta: nella tendina e sulla schermata di blocco.
 *
 * I tasti non fanno il lavoro: **lo chiedono alla pagina**, che è l'unica a
 * sapere cosa c'è in fila. È il motivo per cui il tasto sulle cuffie e il tasto
 * dentro l'app fanno esattamente la stessa cosa invece di due cose simili.
 *
 * ## Perché MediaSessionCompat e non Media3
 *
 * Media3 (ExoPlayer) è la strada giusta quando è il codice nativo a suonare.
 * Qui non suona: servono una sessione e una notifica, cioè le due classi che
 * stanno già dentro `androidx.media`. Aggiungere ExoPlayer per non usarne il
 * lettore sarebbero tre megabyte e un aggiornamento in più che può rompere
 * l'unica cosa che ci sta sopra.
 */
class Lettore : Service() {

    private var sessione: MediaSessionCompat? = null
    private var titolo = ""
    private var chi = ""
    private var suona = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            AZIONE_FERMA -> {
                comandi?.invoke(Comando.FERMA)
                spegniti()
                return START_NOT_STICKY
            }
            AZIONE_PAUSA -> comandi?.invoke(Comando.PAUSA_O_SUONA)
            AZIONE_PROSSIMO -> comandi?.invoke(Comando.PROSSIMO)
            AZIONE_PRECEDENTE -> comandi?.invoke(Comando.PRECEDENTE)
        }

        titolo = intent?.getStringExtra("titolo") ?: titolo
        chi = intent?.getStringExtra("chi") ?: chi
        if (intent?.hasExtra("suona") == true) suona = intent.getBooleanExtra("suona", true)

        preparaSessione()
        val avviso = costruisciAvviso()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(ID_AVVISO, avviso, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(ID_AVVISO, avviso)
        }
        return START_NOT_STICKY
    }

    private fun preparaSessione() {
        val s = sessione ?: MediaSessionCompat(this, "DaProdLettore").also { nuova ->
            nuova.setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { comandi?.invoke(Comando.PAUSA_O_SUONA) }
                override fun onPause() { comandi?.invoke(Comando.PAUSA_O_SUONA) }
                override fun onSkipToNext() { comandi?.invoke(Comando.PROSSIMO) }
                override fun onSkipToPrevious() { comandi?.invoke(Comando.PRECEDENTE) }
                override fun onStop() {
                    comandi?.invoke(Comando.FERMA)
                    spegniti()
                }
            })
            nuova.isActive = true
            sessione = nuova
        }

        s.setMetadata(
            MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, titolo)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, chi.ifBlank { "DaProd Suite" })
                .build(),
        )
        s.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_PLAY_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_STOP,
                )
                /**
                 * La posizione è **sconosciuta**, e va detto.
                 *
                 * Il tempo lo sa la pagina, non noi, e mandare uno zero
                 * farebbe disegnare alla schermata di blocco una barra ferma
                 * all'inizio per tutta la canzone: peggio di nessuna barra.
                 */
                .setState(
                    if (suona) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED,
                    PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                    1f,
                )
                .build(),
        )
    }

    private fun costruisciAvviso(): Notification {
        val apri = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, CANALE)
            .setSmallIcon(R.drawable.ic_notifica)
            .setContentTitle(titolo.ifBlank { getString(R.string.app_name) })
            .setContentText(chi.ifBlank { getString(R.string.lettore_sotto) })
            .setContentIntent(apri)
            .setOngoing(suona)
            .setShowWhen(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .addAction(R.drawable.ic_notifica, "Precedente", verso(AZIONE_PRECEDENTE))
            .addAction(
                R.drawable.ic_notifica,
                if (suona) "Pausa" else "Suona",
                verso(AZIONE_PAUSA),
            )
            .addAction(R.drawable.ic_notifica, "Prossimo", verso(AZIONE_PROSSIMO))
            .setStyle(
                MediaStyle()
                    .setMediaSession(sessione?.sessionToken)
                    // I tre tasti che si vedono con la notifica chiusa: sono i
                    // tre che si premono, e ce ne stanno tre.
                    .setShowActionsInCompactView(0, 1, 2)
                    .setShowCancelButton(true)
                    .setCancelButtonIntent(verso(AZIONE_FERMA)),
            )
            .build()
    }

    private fun verso(azione: String): PendingIntent = PendingIntent.getService(
        this,
        azione.hashCode(),
        Intent(this, Lettore::class.java).setAction(azione),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun spegniti() {
        sessione?.isActive = false
        sessione?.release()
        sessione = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        sessione?.isActive = false
        sessione?.release()
        sessione = null
        super.onDestroy()
    }

    /** Cosa può chiedere chi preme un tasto fuori dall'app. */
    enum class Comando { PAUSA_O_SUONA, PROSSIMO, PRECEDENTE, FERMA }

    companion object {
        private const val CANALE = "musica"
        private const val ID_AVVISO = 4411
        private const val AZIONE_PAUSA = "it.daprod.suite.PAUSA"
        private const val AZIONE_PROSSIMO = "it.daprod.suite.PROSSIMO"
        private const val AZIONE_PRECEDENTE = "it.daprod.suite.PRECEDENTE"
        private const val AZIONE_FERMA = "it.daprod.suite.FERMA"

        /**
         * Chi esegue i comandi: la pagina, tramite l'activity.
         *
         * È statico perché un servizio e un'activity sono due oggetti che
         * Android crea e distrugge per conto suo, e legarli con un binder per
         * mandare quattro parole sarebbe tre volte il codice. L'activity lo
         * mette quando nasce e lo toglie quando muore; se non c'è nessuno, un
         * tasto premuto non fa niente invece di far cadere l'app.
         */
        @Volatile
        var comandi: ((Comando) -> Unit)? = null

        fun creaCanale(contesto: Context) {
            if (Build.VERSION.SDK_INT < 26) return
            val gestore = contesto.getSystemService(NotificationManager::class.java) ?: return
            val canale = NotificationChannel(
                CANALE,
                contesto.getString(R.string.lettore_canale),
                // Bassa: è una notifica che sta lì mentre suoni, non un avviso.
                // Con l'importanza normale suonerebbe un din a ogni canzone.
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = contesto.getString(R.string.lettore_descrizione)
                setShowBadge(false)
                setSound(null, null)
            }
            gestore.createNotificationChannel(canale)
        }

        /** La pagina ha cominciato a suonare qualcosa (o ha cambiato brano). */
        fun suona(contesto: Context, titolo: String, chi: String, sta: Boolean) {
            val i = Intent(contesto, Lettore::class.java)
                .putExtra("titolo", titolo)
                .putExtra("chi", chi)
                .putExtra("suona", sta)
            try {
                ContextCompat_startForegroundService(contesto, i)
            } catch (_: Exception) {
                // Android rifiuta di far partire un servizio in primo piano se
                // l'app è già in secondo piano da un po'. Non è un guasto: vuol
                // dire che il suono resterà vivo solo finché il sistema vuole,
                // che è quello che succedeva prima di questo file.
            }
        }

        /** Non sta suonando più niente: la notifica se ne va. */
        fun basta(contesto: Context) {
            try {
                contesto.stopService(Intent(contesto, Lettore::class.java))
            } catch (_: Exception) {
                // già spento
            }
        }

        private fun ContextCompat_startForegroundService(contesto: Context, i: Intent) {
            androidx.core.content.ContextCompat.startForegroundService(contesto, i)
        }
    }
}
