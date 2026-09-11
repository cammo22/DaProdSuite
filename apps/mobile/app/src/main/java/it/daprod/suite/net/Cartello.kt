package it.daprod.suite.net

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * **Il cartello**: dove il computer scrive come trovarlo, quando il suo
 * indirizzo da fuori cambia nome.
 *
 * Chiesto l'11 settembre 2026, dopo una sera fuori casa: «la connessione e' la
 * cosa piu' importante, deve sempre essere affidabile e riconnettere bene gli
 * utenti».
 *
 * ## Il buco che chiude
 *
 * Da fuori si passa dal tunnel di Cloudflare, e il suo nome cambia quando il
 * tunnel riparte. Il telefono prova gli indirizzi che ha in tasca (vedi
 * [Indirizzi]); se sono tutti morti non ha modo di sapere quello nuovo — per
 * saperlo dovrebbe parlare col computer, e per parlarci gli serve l'indirizzo.
 * Quella sera l'app diceva «non riesco a parlare col computer» con il computer
 * acceso e raggiungibile, sotto un nome che lei non conosceva.
 *
 * ## Come funziona
 *
 * Il computer scrive i suoi indirizzi da fuori su una bacheca pubblica —
 * ntfy.sh, gratuita e senza account — sotto un nome ricavato dalla chiave di
 * questo telefono, e li firma con la stessa chiave. Qui, quando nessun
 * indirizzo risponde, si legge quel cartello, si controlla la firma, e si bussa
 * agli indirizzi nuovi con la solita `/io`.
 *
 * **Perche' ci si puo' fidare**: il nome non si indovina senza la chiave, la
 * firma non si falsifica senza la chiave, e comunque `/io` fa entrare solo il
 * computer che ci conosce.
 *
 * ⚠ **La stessa ricetta sta nel computer**, in `packages/gateway/src/cartello.ts`.
 * `CartelloTest` e `prova-cartello.mjs` calcolano lo stesso esempio e aspettano
 * gli stessi numeri: se una delle due cambia, cade la sua prova.
 */
object Cartello {

    /** La bacheca: la stessa del computer. */
    const val BACHECA = "https://ntfy.sh"

    private const val VERSIONE = 1

    /**
     * Non si chiede piu' di una volta al minuto per telefono. Il giro in
     * background passa di qui ogni volta che il computer non risponde, e un
     * computer spento per una notte non deve diventare cento domande alla
     * bacheca.
     */
    private const val NON_PIU_DI_OGNI_MS = 60_000L
    private val ultimaDomanda = mutableMapOf<String, Long>()

    private val rete = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    /** Il nome del cartello di questo telefono: si ricava dalla chiave, e non la rivela. */
    fun argomentoDi(token: String): String =
        "daprod_" + esadecimale(sha256("daprod-cartello-nome:$token")).take(32)

    /** La firma di un cartello: la stessa ricetta di `firmaDi` nel computer. */
    internal fun firmaDi(token: String, pc: String, quando: Long, basi: List<String>): String {
        val testo = (listOf("daprod-cartello/$VERSIONE", pc, quando.toString()) + basi)
            .joinToString("\n")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(sha256("daprod-cartello-chiave:$token"), "HmacSHA256"))
        return esadecimale(mac.doFinal(testo.toByteArray(Charsets.UTF_8)))
    }

    /** Vero se quella firma e' davvero del computer che ha la nostra chiave. */
    internal fun firmaValida(
        token: String,
        pc: String,
        quando: Long,
        basi: List<String>,
        firma: String,
    ): Boolean = MessageDigest.isEqual(
        firmaDi(token, pc, quando, basi).toByteArray(),
        firma.lowercase().toByteArray(),
    )

    /**
     * ⚠ **Dal cartello si accettano solo indirizzi https.** Sono quelli da fuori:
     * il tunnel, o un nome fisso. Un indirizzo in chiaro scritto su una bacheca
     * pubblica non ha niente da fare in questo telefono, anche se firmato.
     */
    internal fun daTenere(basi: List<String>): List<String> =
        basi.map { it.trim().trimEnd('/') }.filter { it.startsWith("https://") }.distinct()

    /**
     * Gli indirizzi scritti sul cartello di questo telefono, dal piu' recente
     * cartello valido. Vuota se non c'e' niente, se la bacheca non risponde, o
     * se si e' chiesto meno di un minuto fa.
     */
    suspend fun leggi(token: String): List<String> = withContext(Dispatchers.IO) {
        val argomento = argomentoDi(token)
        val adesso = System.currentTimeMillis()
        synchronized(ultimaDomanda) {
            val prima = ultimaDomanda[argomento]
            if (prima != null && adesso - prima < NON_PIU_DI_OGNI_MS) return@withContext emptyList()
            ultimaDomanda[argomento] = adesso
        }
        try {
            val req = Request.Builder()
                .url("$BACHECA/$argomento/json?poll=1&since=24h")
                .build()
            rete.newCall(req).execute().use { res ->
                if (!res.isSuccessful) return@withContext emptyList()
                val righe = res.body?.string().orEmpty().lines()
                var migliore: Pair<Long, List<String>>? = null
                for (riga in righe) {
                    val letto = leggiRiga(riga, token) ?: continue
                    if (migliore == null || letto.first > migliore.first) migliore = letto
                }
                migliore?.second ?: emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /**
     * Una riga della bacheca: il cartello dentro, se c'e' e se la firma torna.
     * Visibile alle prove: `CartelloTest` le passa una riga vera, com'e' arrivata
     * da ntfy.sh l'11 settembre 2026.
     */
    internal fun leggiRiga(riga: String, token: String): Pair<Long, List<String>>? = try {
        val evento = JSONObject(riga)
        if (evento.optString("event") != "message") {
            null
        } else {
            val c = JSONObject(evento.optString("message"))
            val arr = c.optJSONArray("basi")
            val basi = (0 until (arr?.length() ?: 0)).mapNotNull { arr?.optString(it) }
            val pc = c.optString("pc")
            val quando = c.optLong("quando")
            if (c.optInt("v") == VERSIONE && pc.isNotBlank() &&
                firmaValida(token, pc, quando, basi, c.optString("firma"))
            ) {
                quando to daTenere(basi)
            } else {
                null
            }
        }
    } catch (_: Exception) {
        null
    }

    private fun sha256(testo: String): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(testo.toByteArray(Charsets.UTF_8))

    private fun esadecimale(byte: ByteArray): String =
        byte.joinToString("") { "%02x".format(it) }
}
