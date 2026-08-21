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
 * Tutte le chiamate vanno a `http://<host>/…` con il token del dispositivo
 * nell'header Authorization. Se il PC non è raggiungibile, ogni chiamata
 * fallisce con un errore di rete: l'app lo usa per distinguere online da
 * offline, e per decidere se una richiesta parte o resta in coda sul telefono.
 *
 * Il client HTTP è **uno solo** (`condiviso`): OkHttp tiene un pool di
 * connessioni e un thread di pulizia per istanza, e crearne uno per chiamata —
 * come faceva la prima stesura in `accoppia` e in `ping` — vuol dire pagare la
 * stretta di mano TCP a ogni giro su una wifi di casa.
 */
class GatewayClient(
    private val host: String,
    private val token: String,
) {
    /** Crea una richiesta di generazione da un'azione. Torna l'esito. */
    suspend fun eseguiAzione(id: String, valori: Map<String, String>): Esito =
        withContext(Dispatchers.IO) {
            val corpo = JSONObject()
            for ((chiave, valore) in valori) corpo.put(chiave, valore)
            val req = conToken()
                .url("http://$host/azioni/${id}")
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
        val req = conToken().url("http://$host/azioni").build()
        condiviso.newCall(req).execute().use { res ->
            val testo = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw GatewayException(messaggioDi(testo, res.code))
            val arr = JSONArray(testo)
            (0 until arr.length()).map { Azione.daJson(arr.getJSONObject(it)) }
        }
    }

    /** Le richieste visibili a questo dispositivo (il padrone le vede tutte). */
    suspend fun richieste(): List<Richiesta> = withContext(Dispatchers.IO) {
        val req = conToken().url("http://$host/richieste").build()
        condiviso.newCall(req).execute().use { res ->
            val testo = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw GatewayException(messaggioDi(testo, res.code))
            val arr = JSONArray(testo)
            (0 until arr.length()).map { Richiesta.daJson(arr.getJSONObject(it)) }
        }
    }

    /** Le novità che il PC ci ha lasciato: id e testo da mostrare. */
    suspend fun notificheNonLette(): List<Pair<String, String>> = withContext(Dispatchers.IO) {
        val req = conToken().url("http://$host/notifiche").build()
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
            val req = conToken().url("http://$host/notifiche/$id/letta")
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
        val req = conToken().url("http://$host/risultati/${nome.replace(" ", "%20")}").build()
        condiviso.newCall(req).execute().use { res ->
            if (!res.isSuccessful) throw GatewayException("Non riesco a scaricarlo (${res.code})")
            res.body?.bytes() ?: throw GatewayException("Il file è arrivato vuoto.")
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
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

        /** L'accoppiamento: l'unica chiamata senza token. */
        suspend fun accoppia(base: String, codice: String, nome: String): Accoppiamento =
            withContext(Dispatchers.IO) {
                val corpo = JSONObject().put("codice", codice).put("nome", nome).toString()
                val req = Request.Builder()
                    .url("http://$base/accoppiamento")
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
