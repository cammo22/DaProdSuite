package it.daprod.suite.net

import it.daprod.suite.data.Azione
import it.daprod.suite.data.Richiesta
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Il client del gateway della suite.
 *
 * Tutte le chiamate vanno a `<base>/…` con il token del dispositivo
 * nell'header Authorization. Se il PC non è raggiungibile, ogni chiamata
 * fallisce con un errore di rete: l'app lo usa per distinguere online da
 * offline, e per decidere se una richiesta parte o resta in coda sul telefono.
 *
 * **`base` è un indirizzo completo, con lo schema.** Fino alla 0.5.2 era
 * `ip:porta` e l'app ci metteva davanti `http://` da sé. Con il tunnel su
 * Internet il gateway sta su `https://qualcosa.trycloudflare.com`: non ha una
 * porta, non è HTTP, e non entrava in un campo che si chiamava host. Adesso
 * l'indirizzo arriva intero dal QR e l'app non ci mette niente di suo — che è
 * anche il solo modo di **non** far parlare in chiaro un telefono che crede di
 * essere su Internet.
 *
 * Il client HTTP è **uno solo** (`condiviso`): OkHttp tiene un pool di
 * connessioni e un thread di pulizia per istanza, e crearne uno per chiamata —
 * come faceva la prima stesura in `accoppia` e in `ping` — vuol dire pagare la
 * stretta di mano TCP a ogni giro su una wifi di casa.
 */
class GatewayClient(
    private val base: String,
    private val token: String,
) {
    private fun a(percorso: String) = "${base.trimEnd('/')}$percorso"

    /** Crea una richiesta di generazione da un'azione. Torna l'esito. */
    suspend fun eseguiAzione(id: String, valori: Map<String, String>): Esito =
        withContext(Dispatchers.IO) {
            val corpo = JSONObject()
            for ((chiave, valore) in valori) corpo.put(chiave, valore)
            val req = conToken()
                .url(a("/azioni/$id"))
                .post(corpo.toString().toRequestBody(JSON))
                .build()
            condiviso.newCall(req).execute().use { res ->
                val testo = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw GatewayException(messaggioDi(testo, res.code))
                val obj = JSONObject(testo)
                when (obj.optString("esito")) {
                    "in-coda" -> Esito.InCoda(obj.getJSONObject("richiesta").getString("id"))
                    else -> Esito.Fatto(obj.opt("risultato")?.toString() ?: "")
                }
            }
        }

    /** Cosa la suite sa fare adesso. L'app non lo sa da sé: lo chiede. */
    suspend fun azioni(): List<Azione> = withContext(Dispatchers.IO) {
        val req = conToken().url(a("/azioni")).build()
        condiviso.newCall(req).execute().use { res ->
            val testo = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw GatewayException(messaggioDi(testo, res.code))
            val arr = JSONArray(testo)
            (0 until arr.length()).map { Azione.daJson(arr.getJSONObject(it)) }
        }
    }

    /** Le richieste visibili a questo dispositivo (chi decide le vede tutte). */
    suspend fun richieste(): List<Richiesta> = withContext(Dispatchers.IO) {
        val req = conToken().url(a("/richieste")).build()
        condiviso.newCall(req).execute().use { res ->
            val testo = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw GatewayException(messaggioDi(testo, res.code))
            val arr = JSONArray(testo)
            (0 until arr.length()).map { Richiesta.daJson(arr.getJSONObject(it)) }
        }
    }

    /**
     * Un colpetto per sapere se il PC risponde.
     *
     * Serve prima di aprire la pagina della suite: una WebView che non riesce a
     * caricare mostra la pagina di errore del browser, in inglese e con un
     * codice — che è esattamente quello che questa app esiste per evitare.
     * Meglio chiedere prima e dire in italiano cosa succede.
     */
    suspend fun raggiungibile(attesaMs: Long = 0): Boolean = withContext(Dispatchers.IO) {
        try {
            val req = conToken().url(a("/io")).build()
            // Bussare non è chiedere: quando si sta cercando quale indirizzo
            // risponde, aspettare sessanta secondi per ognuno non ha senso.
            val cliente =
                if (attesaMs > 0) {
                    condiviso.newBuilder()
                        .connectTimeout(attesaMs, TimeUnit.MILLISECONDS)
                        .readTimeout(attesaMs, TimeUnit.MILLISECONDS)
                        .build()
                } else {
                    condiviso
                }
            cliente.newCall(req).execute().use { it.isSuccessful }
        } catch (_: Exception) {
            false
        }
    }

    /** Le novità che il PC ci ha lasciato: id e testo da mostrare. */
    suspend fun notificheNonLette(): List<Pair<String, String>> = withContext(Dispatchers.IO) {
        val req = conToken().url(a("/notifiche")).build()
        condiviso.newCall(req).execute().use { res ->
            val testo = res.body?.string().orEmpty()
            if (!res.isSuccessful) return@withContext emptyList()
            val arr = JSONArray(testo)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                o.getString("id") to "${o.optString("titolo", "Lavoro")}: ${o.optString("corpo", "")}"
            }
        }
    }

    suspend fun segnaNotificaLetta(id: String) {
        withContext(Dispatchers.IO) {
            val req = conToken().url(a("/notifiche/$id/letta"))
                .post("{}".toRequestBody(JSON))
                .build()
            try {
                condiviso.newCall(req).execute().close()
            } catch (_: Exception) {
                // Offline: la notifica resta non letta e si ripresenta. Meglio
                // vederla due volte che perderla.
            }
        }
    }

    /**
     * Scarica il file di un risultato pronto.
     *
     * Torna i byte: chi chiama decide dove metterli. Un file può essere un video
     * da decine di MB, quindi si tiene in memoria solo il tempo di scriverlo.
     */
    suspend fun scaricaRisultato(nome: String): ByteArray = withContext(Dispatchers.IO) {
        prendi(a("/risultati/${percorsoSicuro(nome)}"))
    }

    /**
     * Scarica una cosa della libreria: un'immagine, un video, un brano.
     *
     * È la stessa strada del risultato di una richiesta, ma parte dalla
     * galleria: sul PC la libreria è di tutta la suite, e da qui si prende
     * quello che si vuole portare nel telefono anche se l'ha chiesto un altro.
     */
    suspend fun scaricaDallaLibreria(id: String): ByteArray = withContext(Dispatchers.IO) {
        prendi(a("/libreria/file/${percorsoSicuro(id)}"))
    }

    private fun prendi(url: String): ByteArray {
        val req = conToken().url(url).build()
        condiviso.newCall(req).execute().use { res ->
            if (!res.isSuccessful) throw GatewayException("Non riesco a scaricarlo (${res.code})")
            return res.body?.bytes() ?: throw GatewayException("Il file è arrivato vuoto.")
        }
    }

    private fun conToken(): Request.Builder =
        Request.Builder().header("Authorization", "Bearer $token")

    /** L'esito di un'azione: in fila sul PC, oppure una risposta subito. */
    sealed interface Esito {
        data class InCoda(val idRichiesta: String) : Esito
        data class Fatto(val risultato: String) : Esito
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        /** Un client solo per tutta l'app: il pool di connessioni si riusa. */
        private val condiviso = OkHttpClient.Builder()
            // Il tunnel su Internet fa due salti in più di una wifi di casa: i
            // cinque secondi di prima erano tarati su «il PC è nella stanza
            // accanto», e da fuori facevano sembrare irraggiungibile un PC che
            // stava solo rispondendo da più lontano.
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build()

        /**
         * L'accoppiamento: l'unica chiamata senza token.
         *
         * `base` è l'indirizzo completo del gateway, schema compreso.
         */
        suspend fun accoppia(base: String, codice: String, nome: String): Accoppiamento =
            withContext(Dispatchers.IO) {
                val corpo = JSONObject().put("codice", codice).put("nome", nome).toString()
                val req = Request.Builder()
                    .url("${base.trimEnd('/')}/accoppiamento")
                    .post(corpo.toRequestBody(JSON))
                    .build()
                condiviso.newCall(req).execute().use { res ->
                    val testo = res.body?.string().orEmpty()
                    if (!res.isSuccessful) throw GatewayException(messaggioDi(testo, res.code))
                    val obj = JSONObject(testo)
                    Accoppiamento(
                        token = obj.getString("token"),
                        computer = obj.optString("computer", base),
                        ruolo = obj.optJSONObject("dispositivo")?.optString("ruolo", "ospite") ?: "ospite",
                    )
                }
            }

        /**
         * Un pezzo di percorso, senza sorprese.
         *
         * Gli id della libreria contengono le barre delle sottocartelle
         * (`cinema/clip_003.mp4`) e quelle devono restare barre; tutto il resto
         * — spazi, accenti, parentesi — va codificato, o OkHttp rifiuta l'URL.
         */
        private fun percorsoSicuro(nome: String): String =
            nome.split("/").joinToString("/") { android.net.Uri.encode(it) }

        /**
         * Il messaggio del gateway, se ce n'è uno.
         *
         * Il gateway risponde a tutto con `{ "errore": "…" }` in italiano, e
         * quel testo è quasi sempre più utile del codice HTTP: «Codice non
         * trovato o già usato» dice cosa fare, «403» no.
         */
        private fun messaggioDi(corpo: String, codice: Int): String = try {
            JSONObject(corpo).optString("errore").takeIf { it.isNotBlank() } ?: "Errore $codice"
        } catch (_: Exception) {
            "Errore $codice"
        }
    }
}

/** Chi si è collegato, e a cosa. */
data class Accoppiamento(val token: String, val computer: String, val ruolo: String)

class GatewayException(message: String) : Exception(message)
