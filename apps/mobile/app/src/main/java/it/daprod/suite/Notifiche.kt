package it.daprod.suite

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Le notifiche dell'app. **Poche, e solo quando conta.**
 *
 * **Cosa è cambiato nella 0.7.7, e perché**, detto il 26 agosto 2026:
 * «riduciamo le notifiche su android, solo quando un lavoro è pronto e quando
 * si riceve. Usiamo la seconda immagine come logo anche per android e anche per
 * le notifiche android».
 *
 * Fino alla 0.7.6 arrivava un avviso per ogni notifica che il computer aveva
 * lasciato: «è partita», «è in fila», «l'ho accettata», «è pronta». Quattro
 * riquadri per un lavoro solo. Un programma che avvisa a ogni cosa smette di
 * essere ascoltato, e allora tanto vale non avvisare.
 *
 * Adesso ne passano due sole:
 *
 * - **un lavoro è pronto** — la cosa per cui si stava aspettando;
 * - **è arrivato un pensiero** — qualcuno ti ha mandato qualcosa;
 * - **qualcuno ha commentato una cosa tua** (dalla 0.8.1) — è l'altra metà di
 *   DaProd: un cuore si vede tornando, un commento è qualcuno che ti ha
 *   scritto, e va detto.
 *
 * Il filtro sta in [valeLaPena], e guarda il titolo che il computer manda: è la
 * cosa più stabile che c'è: il gateway li scrive in un posto solo
 * (`remoto.notifica`), e sono frasi, non codici.
 *
 * ## Il logo: due icone, e devono essere due
 *
 * ⚠ Android **non permette** un'icona piccola a colori: quella la trasforma in
 * una sagoma bianca, sempre, e un logo colorato ci diventa una macchia. Quindi:
 *
 * - **piccola** ([R.drawable.ic_notifica]): una sagoma, che è l'unica cosa che
 *   si può fare;
 * - **grande** ([R.drawable.logo_daprod]): il marchio a colori, che è quello
 *   che si vede davvero quando la notifica si apre.
 *
 * Non è un compromesso nostro: è come è fatta la piattaforma.
 */
object Notifiche {
    private const val CANALE = "lavori"

    /**
     * Toccare la notifica apre l'app. **Prima non apriva niente.**
     *
     * Sembra un dettaglio e non lo e': la notifica dice «e' pronto», e la cosa
     * che uno fa subito dopo averla letta e' toccarla per andare a vedere.
     * Senza un `contentIntent` quel tocco non fa niente — la notifica si chiude
     * e basta — e bisogna cercare l'icona dell'app come se non fosse successo
     * niente.
     *
     * `SINGLE_TOP` piu' `CLEAR_TOP`: si torna a quella gia' aperta invece di
     * aprirne una seconda sopra.
     */
    fun apriLApp(context: Context): PendingIntent? {
        val intento = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return PendingIntent.getActivity(
            context,
            0,
            intento,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun creaCanale(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val canale = NotificationChannel(
                CANALE,
                context.getString(R.string.notifica_canale),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = context.getString(R.string.notifica_descrizione)
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(canale)
        }
    }

    /**
     * Questo avviso merita di svegliare il telefono?
     *
     * Due sole famiglie passano. Il resto — «è partita», «è il tuo turno», «è in
     * fila» — sono cose che si vedono aprendo l'app, e che nessuno ha chiesto di
     * sapere mentre è a cena.
     *
     * Il confronto è sul testo perché il gateway scrive quei titoli in un posto
     * solo e sono frasi, non codici: se un giorno cambiano, questa funzione
     * smette di far passare qualcosa — e quello si nota — invece di far passare
     * tutto, che non si nota finché non dà fastidio.
     */
    fun valeLaPena(titolo: String, corpo: String): Boolean {
        val tutto = "$titolo $corpo".lowercase()
        if (tutto.contains("pronto") || tutto.contains("pronta")) return true
        if (tutto.contains("ricevut") || tutto.contains("pensiero") || tutto.contains("mandato")) return true
        // Un commento sotto a una cosa tua: e' l'altra meta' di DaProd, e senza
        // l'avviso lo scopri solo se torni a guardarla — cioe' quasi mai.
        if (tutto.contains("commentat") || tutto.contains("un commento")) return true
        // Un lavoro rifiutato è l'altra cosa che si aspetta e non arriva: dirlo
        // è meglio che lasciare qualcuno ad aspettare una cosa che non verrà.
        if (tutto.contains("non è stata accettata") || tutto.contains("non fatto")) return true
        return false
    }

    /** Mostra un avviso, **se vale la pena**. Torna vero se è partito. */
    fun mostra(context: Context, titolo: String, corpo: String): Boolean {
        if (!valeLaPena(titolo, corpo)) return false
        return mostraComunque(context, titolo, corpo)
    }

    /**
     * Mostra un avviso senza filtrarlo.
     *
     * La usa chi ha già deciso che quella cosa va detta — per esempio la coda
     * offline che riparte: quello è un fatto che riguarda una richiesta *tua*,
     * scritta quando il computer non c'era, e che adesso è partita.
     */
    fun mostraComunque(context: Context, titolo: String, corpo: String): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }

        val notifica = NotificationCompat.Builder(context, CANALE)
            // Piccola: una sagoma. Android non ne accetta altre.
            .setSmallIcon(R.drawable.ic_notifica)
            // Grande: il marchio, a colori. È quella che si vede.
            .setLargeIcon(logoGrande(context))
            .setColor(ContextCompat.getColor(context, R.color.accento))
            .setContentTitle(titolo)
            .setContentText(corpo)
            // Il testo lungo si legge tutto aprendo la notifica: un prompt di
            // trenta parole tagliato a metà non dice quale lavoro è.
            .setStyle(NotificationCompat.BigTextStyle().bigText(corpo))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            // E toccandola si apre l'app, che e' la cosa che si vuole fare
            // subito dopo aver letto «e' pronto». Vedi `apriLApp`.
            .setContentIntent(apriLApp(context))
            .setAutoCancel(true)
            .build()
        return try {
            NotificationManagerCompat.from(context).notify(System.currentTimeMillis().toInt(), notifica)
            true
        } catch (_: SecurityException) {
            // Niente permesso: si riprova alla prossima.
            false
        }
    }

    /**
     * Il marchio, disegnato una volta e tenuto da parte.
     *
     * È un vettore, e una notifica vuole una bitmap: si disegna a 192 px, che è
     * la misura che Android usa per l'icona grande sugli schermi densi. Farlo a
     * ogni notifica sarebbe un disegno per niente — sono sempre gli stessi
     * pixel.
     */
    private var logo: Bitmap? = null

    private fun logoGrande(context: Context): Bitmap? {
        logo?.let { return it }
        return try {
            val disegno = ContextCompat.getDrawable(context, R.drawable.logo_daprod) ?: return null
            val misura = 192
            val bitmap = Bitmap.createBitmap(misura, misura, Bitmap.Config.ARGB_8888)
            disegno.setBounds(0, 0, misura, misura)
            disegno.draw(Canvas(bitmap))
            logo = bitmap
            bitmap
        } catch (_: Exception) {
            // Un'icona che non si disegna non è un motivo per non avvisare.
            null
        }
    }
}
