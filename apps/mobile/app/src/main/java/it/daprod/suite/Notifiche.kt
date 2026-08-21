package it.daprod.suite

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Le notifiche dell'app: una sola, per i lavori che finiscono sul PC. */
object Notifiche {
    private const val CANALE = "lavori"

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

    fun mostra(context: Context, titolo: String, corpo: String) {
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) return

        val notifica = NotificationCompat.Builder(context, CANALE)
            .setSmallIcon(R.drawable.ic_notifica)
            .setContentTitle(titolo)
            .setContentText(corpo)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(System.currentTimeMillis().toInt(), notifica)
        } catch (_: SecurityException) {
            // Niente permesso: si riprova alla prossima.
        }
    }
}