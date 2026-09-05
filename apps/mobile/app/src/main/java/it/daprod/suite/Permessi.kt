package it.daprod.suite

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

/**
 * Quello che l'app ha bisogno di poter fare, chiesto **una volta e tutto insieme**.
 *
 * ## Il difetto che cura
 *
 * Fino alla 0.9.0 i permessi si chiedevano uno alla volta e nel momento
 * peggiore: le notifiche al primo avvio, dentro la schermata del nome; il
 * risparmio batteria da una voce del menu che compariva solo se non era già
 * concesso; il permesso di installare gli aggiornamenti quando un
 * aggiornamento c'era già. Il risultato era che quasi nessuno li dava tutti, e
 * poi «le notifiche non arrivano» — con la causa in un interruttore che
 * l'utente non sapeva di dover accendere.
 *
 * Chiesto il 5 settembre 2026: «facciamo che all'avvio si devono accettare
 * tutti i requisiti, come notifiche aggiornamento ecc; mettiamo anche nelle
 * impostazioni questa cosa dei permessi».
 *
 * ## Le tre cose, e perché sono queste
 *
 * | | a cosa serve | senza |
 * |---|---|---|
 * | **Notifiche** | dire che un lavoro è pronto | non lo sai finché non riapri |
 * | **Batteria** | guardare mentre il telefono è in tasca | l'avviso arriva mezz'ora dopo |
 * | **Installare** | aggiornarsi da sola | ogni versione va disinstallata a mano |
 *
 * Nessuna delle tre è indispensabile: l'app funziona senza tutte e tre, e per
 * questo si possono saltare. Ma sono tutte e tre cose che **si scoprono
 * mancanti quando è tardi**, ed è il motivo per cui adesso si chiedono prima.
 *
 * ## Cosa NON c'è qui dentro
 *
 * **La camera.** Serve solo al QR, cioè a una strada che dalla 0.9.0 è
 * l'eccezione: in casa si tocca un nome in un elenco. Chiederla all'avvio
 * vorrebbe dire chiedere l'accesso alla fotocamera a chi non la userà mai.
 */
object Permessi {

    /** Le tre cose che si chiedono, e se ce le hanno già date. */
    data class Stato(
        val notifiche: Boolean,
        val batteria: Boolean,
        val installare: Boolean,
    ) {
        /** Vero se non manca niente: allora la schermata non compare. */
        val tuttoAPosto: Boolean get() = notifiche && batteria && installare
    }

    private const val PREFS = "daprod_permessi"
    private const val CHIESTI = "gia-chiesti"

    fun stato(contesto: Context): Stato = Stato(
        notifiche = haLeNotifiche(contesto),
        batteria = senzaRisparmio(contesto),
        installare = puoInstallare(contesto),
    )

    /**
     * Vero se la schermata dei permessi va mostrata adesso.
     *
     * **Una volta sola.** Chi ha già visto quella schermata e ha detto di no ha
     * detto di no: rifargliela a ogni avvio la trasformerebbe in una cosa da
     * chiudere senza leggere, che è il modo migliore per non ottenere niente.
     * Da lì in poi si trova nelle impostazioni, dove uno la cerca quando gli
     * serve.
     */
    fun daChiedere(contesto: Context): Boolean {
        if (stato(contesto).tuttoAPosto) return false
        return !contesto.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(CHIESTI, false)
    }

    fun segnaChiesti(contesto: Context) {
        contesto.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(CHIESTI, true)
            .apply()
    }

    fun haLeNotifiche(contesto: Context): Boolean {
        if (Build.VERSION.SDK_INT < 33) return true
        return androidx.core.content.ContextCompat.checkSelfPermission(
            contesto,
            android.Manifest.permission.POST_NOTIFICATIONS,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    /**
     * Vero se Android ha smesso di mettere l'app a dormire.
     *
     * ⚠ È il permesso che conta di più e quello che nessuno dà, perché non
     * sembra un permesso: si chiama «ottimizzazione della batteria» e sembra
     * una cosa buona da tenere accesa. Con quella accesa, il lavoro periodico
     * dell'app dentro Doze passa da quindici minuti a un'ora — e «il video è
     * pronto» arriva quando l'hai già guardato.
     */
    fun senzaRisparmio(contesto: Context): Boolean = try {
        val gestore = contesto.getSystemService(android.os.PowerManager::class.java)
        gestore?.isIgnoringBatteryOptimizations(contesto.packageName) == true
    } catch (_: Exception) {
        // Su qualche telefono la domanda non si può fare: vale come «a posto»,
        // perché l'alternativa è mostrare per sempre una riga rossa che non si
        // può togliere.
        true
    }

    fun puoInstallare(contesto: Context): Boolean =
        if (Build.VERSION.SDK_INT >= 26) contesto.packageManager.canRequestPackageInstalls() else true

    /**
     * Porta l'utente dove si accende ognuno dei tre.
     *
     * Non li concede: **nessuno di questi si può concedere da codice**, ed è
     * giusto così. Quello che si può fare è aprire la schermata giusta invece
     * di dire «vai nelle impostazioni e cerca».
     */
    fun apriBatteria(attivita: Activity) {
        prova(attivita, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    fun apriInstallazione(attivita: Activity) {
        if (Build.VERSION.SDK_INT < 26) return
        prova(
            attivita,
            Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${attivita.packageName}"),
            ),
        )
    }

    /** Le impostazioni dell'app: il posto da cui si riaccende tutto. */
    fun apriLApp(attivita: Activity) {
        prova(
            attivita,
            Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:${attivita.packageName}"),
            ),
        )
    }

    private fun prova(attivita: Activity, intento: Intent) {
        try {
            attivita.startActivity(intento)
        } catch (_: Exception) {
            // Un telefono che non ha quella schermata non deve far cadere
            // l'app: si resta dove si è, e il permesso resta da dare.
            apriLApp(attivita)
        }
    }
}
