package it.daprod.suite

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * L'app che si aggiorna da sola.
 *
 * La suite sul PC lo fa già (electron-updater legge `latest.yml` dalle Release);
 * qui si fa la stessa cosa a mano, perché un'app fuori dal Play Store nessuno
 * la aggiorna al posto tuo, e un telefono con una versione vecchia che parla a
 * un PC aggiornato è il modo più silenzioso di non funzionare.
 *
 * **È l'unica cosa che questa app manda fuori dalla tua rete**, ed è una GET
 * senza niente dentro: chiede a GitHub qual è l'ultima Release. Nessun dato tuo
 * la accompagna. Tutto il resto — richieste, risultati, notifiche — resta fra
 * il telefono e il tuo computer.
 *
 * Perché possa funzionare davvero servono due cose che non si vedono:
 *
 * - **la firma dell'APK non deve cambiare** fra una versione e l'altra, o
 *   Android rifiuta l'aggiornamento con un generico «App non installata». Per
 *   questo la release è firmata con una chiave stabile tenuta nel repository
 *   (vedi `app/build.gradle.kts`) e non con quella di debug, che ogni computer
 *   si genera per conto suo;
 * - **il permesso di installare** app da questa app, che su Android 8 e oltre
 *   si concede una volta sola nelle impostazioni. Qui si controlla prima di
 *   scaricare, invece di scoprirlo a scaricamento finito.
 */
object Aggiornamenti {

    /** Dove si chiede qual è l'ultima. */
    private const val ULTIMA =
        "https://api.github.com/repos/cammo22/DaProdSuite/releases/latest"

    private val rete = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .build()

    /** Cosa si è trovato guardando le Release. */
    sealed interface Esito {
        /** Siamo già all'ultima. */
        data class GiaAggiornata(val versione: String) : Esito

        /** Ce n'è una nuova, ed ecco dove sta. */
        data class CeNeUnaNuova(
            val versione: String,
            val url: String,
            val bytes: Long,
            /** Le note della Release, per far vedere cosa cambia. */
            val note: String,
        ) : Esito

        /** Non si è potuto sapere: niente linea, GitHub giù, o una Release senza APK. */
        data class NonSiSa(val perche: String) : Esito
    }

    /** Guarda se c'è una versione nuova. Non scarica niente. */
    suspend fun cerca(context: Context): Esito = withContext(Dispatchers.IO) {
        val mia = versioneInstallata(context)
        try {
            val req = Request.Builder()
                .url(ULTIMA)
                .header("Accept", "application/vnd.github+json")
                .build()
            rete.newCall(req).execute().use { res ->
                if (!res.isSuccessful) {
                    return@withContext Esito.NonSiSa("GitHub ha risposto ${res.code}.")
                }
                val corpo = JSONObject(res.body?.string().orEmpty())
                val tag = corpo.optString("tag_name").removePrefix("v")
                if (tag.isBlank()) return@withContext Esito.NonSiSa("Release senza numero di versione.")

                val apk = trovaApk(corpo)
                    ?: return@withContext Esito.NonSiSa(
                        "La versione $tag non ha ancora un APK da scaricare.",
                    )

                if (confronta(tag, mia) <= 0) return@withContext Esito.GiaAggiornata(mia)

                Esito.CeNeUnaNuova(
                    versione = tag,
                    url = apk.first,
                    bytes = apk.second,
                    note = corpo.optString("body").take(1500),
                )
            }
        } catch (e: Exception) {
            Esito.NonSiSa("Non riesco a raggiungere GitHub. C'è linea?")
        }
    }

    /** L'APK fra gli allegati della Release, con quanto pesa. */
    private fun trovaApk(release: JSONObject): Pair<String, Long>? {
        val allegati = release.optJSONArray("assets") ?: return null
        for (i in 0 until allegati.length()) {
            val a = allegati.getJSONObject(i)
            val nome = a.optString("name")
            if (nome.endsWith(".apk", ignoreCase = true)) {
                return a.optString("browser_download_url") to a.optLong("size")
            }
        }
        return null
    }

    /**
     * Confronta due versioni tipo `0.5.1`. Torna >0 se `a` è più recente.
     *
     * Numero per numero, non come stringhe: `0.10.0` viene **dopo** `0.9.0`, e
     * confrontandole come testo verrebbe prima.
     */
    private fun confronta(a: String, b: String): Int {
        val pa = a.split(".").map { it.filter(Char::isDigit).toIntOrNull() ?: 0 }
        val pb = b.split(".").map { it.filter(Char::isDigit).toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(pa.size, pb.size)) {
            val d = (pa.getOrNull(i) ?: 0) - (pb.getOrNull(i) ?: 0)
            if (d != 0) return d
        }
        return 0
    }

    fun versioneInstallata(context: Context): String = try {
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "0"
    } catch (_: Exception) {
        "0"
    }

    /** Il telefono ci lascia installare app? Su Android 8+ va concesso una volta. */
    fun puoInstallare(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            context.packageManager.canRequestPackageInstalls()

    /** Porta alle impostazioni dove si concede quel permesso. */
    fun chiediDiPoterInstallare(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        context.startActivity(
            Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}"),
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    /**
     * Scarica l'APK e lo consegna all'installatore di Android.
     *
     * `avanzamento` viene chiamato con la percentuale, per non lasciare fermo
     * uno schermo mentre arrivano sei megabyte.
     */
    suspend fun scaricaEInstalla(
        context: Context,
        nuova: Esito.CeNeUnaNuova,
        avanzamento: (Int) -> Unit,
    ) {
        val file = withContext(Dispatchers.IO) {
            // Nella cache: se l'installazione va a buon fine il file non serve
            // più, e il telefono può buttarlo quando gli pare.
            val cartella = File(context.cacheDir, "aggiornamenti").apply { mkdirs() }
            // Uno solo per volta: un tentativo andato male non deve lasciare
            // dietro di sé mezzo APK che poi qualcuno prova a installare.
            cartella.listFiles()?.forEach { it.delete() }
            val destinazione = File(cartella, "DaProdSuite-${nuova.versione}.apk")

            val req = Request.Builder().url(nuova.url).build()
            rete.newCall(req).execute().use { res ->
                if (!res.isSuccessful) throw IllegalStateException("Scaricamento fallito (${res.code}).")
                val corpo = res.body ?: throw IllegalStateException("Il file è arrivato vuoto.")
                val totale = if (nuova.bytes > 0) nuova.bytes else corpo.contentLength()
                corpo.byteStream().use { dentro ->
                    destinazione.outputStream().use { fuori ->
                        val buffer = ByteArray(64 * 1024)
                        var fatti = 0L
                        var letti = dentro.read(buffer)
                        var ultimaPercentuale = -1
                        while (letti >= 0) {
                            fuori.write(buffer, 0, letti)
                            fatti += letti
                            if (totale > 0) {
                                val p = (fatti * 100 / totale).toInt()
                                if (p != ultimaPercentuale) {
                                    ultimaPercentuale = p
                                    avanzamento(p)
                                }
                            }
                            letti = dentro.read(buffer)
                        }
                    }
                }
            }
            destinazione
        }

        // Da Android 7 un file non si passa come percorso: serve un URI che
        // valga anche per l'altra app, ed è quello che fa il FileProvider.
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.file", file)
        context.startActivity(
            Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            },
        )
    }
}
