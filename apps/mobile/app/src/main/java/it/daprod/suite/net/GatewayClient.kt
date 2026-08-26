package it.daprod.suite.net

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

    /**
     * La pagina della console, così come il computer la serve.
     *
     * Serve allo specchio: senza una copia della pagina, col computer spento
     * non c'è niente da caricare. Si richiede a ogni collegamento riuscito, così
     * quando la suite si aggiorna il telefono se ne accorge da solo.
     */
    suspend fun paginaConsole(): String = withContext(Dispatchers.IO) {
        val req = conToken().url(a("/")).build()
        condiviso.newCall(req).execute().use { res ->
            if (!res.isSuccessful) throw GatewayException("La pagina non è arrivata (${res.code}).")
            res.body?.string().orEmpty()
        }
    }

    /**
     * Una rotta qualunque, presa così com'è: i byte e il tipo.
     *
     * **È il mattone dello specchio.** Le risposte del gateway si tengono nel
     * formato in cui arrivano e si ridanno uguali: rileggerle e ricostruirle
     * vorrebbe dire una seconda implementazione del contratto, e la seconda
     * implementazione è quella che diverge il giorno che il gateway aggiunge un
     * campo.
     */
    suspend fun prendiGrezzo(percorso: String): Pair<ByteArray, String> =
        withContext(Dispatchers.IO) {
            val req = conToken().url(a(percorso)).build()
            condiviso.newCall(req).execute().use { res ->
                if (!res.isSuccessful) throw GatewayException("Non arriva (${res.code}): $percorso")
                val tipo = res.header("Content-Type") ?: "application/octet-stream"
                val corpo = res.body?.bytes() ?: throw GatewayException("È arrivato vuoto: $percorso")
                corpo to tipo
            }
        }

    /** Quello che c'è in libreria, ridotto a cosa serve per decidere se tenerlo. */
    suspend fun vociDellaLibreria(rotta: String): List<VoceLib> = withContext(Dispatchers.IO) {
        val (corpo, _) = prendiGrezzo(rotta)
        val arr = JSONObject(String(corpo)).optJSONArray("voci") ?: return@withContext emptyList()
        (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            val id = o.optString("id")
            if (id.isBlank()) null
            else VoceLib(id, o.optLong("bytes"), o.optBoolean("anteprima"))
        }
    }

    /** I pensieri arrivati: id e nome, per portarseli dietro senza linea. */
    suspend fun pensieri(): List<Pair<String, String>> = withContext(Dispatchers.IO) {
        val (corpo, _) = prendiGrezzo("/invii")
        val arr = JSONObject(String(corpo)).optJSONArray("invii") ?: return@withContext emptyList()
        (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            val id = o.optString("id")
            if (id.isBlank()) null else id to o.optString("nome", "pensiero")
        }
    }

    /** Una voce di libreria, per lo specchio: cosa è, quanto pesa, se ha una faccia. */
    data class VoceLib(val id: String, val bytes: Long, val anteprima: Boolean)

    /**
     * Un colpetto per sapere se il PC risponde.
     *
     * Serve prima di aprire la pagina della suite: una WebView che non riesce a
     * caricare mostra la pagina di errore del browser, in inglese e con un
     * codice — che è esattamente quello che questa app esiste per evitare.
     * Meglio chiedere prima e dire in italiano cosa succede.
     */
    suspend fun raggiungibile(attesaMs: Long = 0): Boolean =
        bussa(attesaMs) == Colpo.RISPONDE

    /**
     * Com'è andato il colpetto. **Tre esiti, non due**, e la differenza conta.
     *
     * ⚠ Fino alla 0.7.6 questa era una domanda sì/no, e il no valeva per due
     * cose diversissime: «il computer non c'è» e «il computer c'è e dice che
     * non ti conosce». L'app le trattava allo stesso modo — mostrava la copia
     * offline — quindi chi era stato revocato vedeva un'app che sembrava
     * funzionare e non faceva niente. L'unica cura che veniva in mente era
     * cancellare il profilo e rifare il codice, ed è esattamente quello che
     * capitava: «spesso devo cancellare l'account e riscannerizzare».
     */
    enum class Colpo {
        /** Il computer c'è e ci riconosce. */
        RISPONDE,

        /** Il computer c'è, e dice di no: il collegamento è stato tolto. */
        RIFIUTA,

        /** Nessuna risposta: spento, altra rete, linea giù. */
        NIENTE,
    }

    suspend fun bussa(attesaMs: Long = 0): Colpo = withContext(Dispatchers.IO) {
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
            cliente.newCall(req).execute().use { res ->
                when {
                    res.isSuccessful -> Colpo.RISPONDE
                    res.code == 401 || res.code == 403 -> Colpo.RIFIUTA
                    // Un 500, o un proxy che si mette in mezzo: il computer non
                    // è quello che cerchiamo, ma non ci ha nemmeno cacciati.
                    else -> Colpo.NIENTE
                }
            }
        } catch (_: Exception) {
            Colpo.NIENTE
        }
    }

    /**
     * Dove si fa trovare il computer **adesso**.
     *
     * La stessa rotta del colpetto, letta invece che buttata via. Il PC ci
     * mette dentro tutti i suoi indirizzi di questo momento, tunnel compreso —
     * e il tunnel e' quello che cambia a ogni sua accensione. Chiamarla quando
     * si e' gia' collegati e' il modo in cui il telefono resta raggiungibile da
     * fuori senza che nessuno rifaccia un QR.
     *
     * Torna una lista vuota se qualcosa va storto: e' un di piu', non un
     * passaggio obbligato, e non deve poter impedire di aprire la suite.
     */
    suspend fun indirizziDiAdesso(): List<String> = withContext(Dispatchers.IO) {
        try {
            val req = conToken().url(a("/io")).build()
            condiviso.newCall(req).execute().use { res ->
                if (!res.isSuccessful) return@withContext emptyList()
                val arr = JSONObject(res.body?.string().orEmpty()).optJSONArray("basi")
                    ?: return@withContext emptyList()
                (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotBlank() } }
            }
        } catch (_: Exception) {
            emptyList()
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
        prendi(a("/risultati/${pezzoSicuro(nome)}"))
    }

    /**
     * Scarica una cosa della libreria: un'immagine, un video, un brano.
     *
     * È la stessa strada del risultato di una richiesta, ma parte dalla
     * galleria: sul PC la libreria è di tutta la suite, e da qui si prende
     * quello che si vuole portare nel telefono anche se l'ha chiesto un altro.
     */
    suspend fun scaricaDallaLibreria(id: String): ByteArray = withContext(Dispatchers.IO) {
        prendi(a("/libreria/file/${pezzoSicuro(id)}"))
    }

    /**
     * Scarica un regalo: un file che una persona ti ha mandato dal computer.
     *
     * Non e' roba della libreria e non e' il risultato di una richiesta: e'
     * qualcosa che ti hanno dato, e il gateway lo lascia prendere solo a te.
     */
    suspend fun scaricaRegalo(id: String): ByteArray = withContext(Dispatchers.IO) {
        prendi(a("/invii/${pezzoSicuro(id)}/file"))
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
        fun pezzoSicuro(nome: String): String =
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
