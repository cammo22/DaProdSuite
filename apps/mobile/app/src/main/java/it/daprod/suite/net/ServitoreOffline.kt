package it.daprod.suite.net

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import it.daprod.suite.data.CodaOffline
import it.daprod.suite.data.Deposito
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream

/**
 * Chi risponde alla console quando il computer non c'è.
 *
 * **La stessa pagina, le stesse rotte, un altro che risponde.** La console è
 * una pagina web che parla con il gateway per HTTP: se qualcuno risponde a
 * quelle rotte, lei non si accorge di niente e continua a essere sé stessa —
 * la Casa, la Produzione, il Riepilogo, la Galleria, DaProd. È il modo in cui
 * «se il pc non è raggiungibile mostra un'altra schermata» smette di essere
 * vero senza scrivere una seconda app.
 *
 * ## Cosa sa rispondere, e cosa no
 *
 * Sa rispondere a tutto quello che è **guardare**: chi sei, cosa sa fare il
 * computer, cosa hai chiesto, la tua galleria, i pensieri arrivati. Sono le
 * risposte di quando c'era la linea, tenute dal [Deposito].
 *
 * Sa rispondere anche a una cosa che **cambia**: mandare una richiesta. Quella
 * non parte — il computer non c'è — ma si mette in coda sul telefono e parte
 * da sola appena il computer torna. È la ragione per cui questa app serve
 * anche a computer spento, ed esisteva già prima di questa versione: adesso
 * però si fa dalla stessa schermata di sempre, invece che da un modulo a
 * parte.
 *
 * A tutto il resto risponde **503 con una frase in italiano**. Non un errore di
 * rete, non una pagina bianca: la console mostra quella frase dove mostrerebbe
 * qualunque altro rifiuto del computer, e chi legge capisce cos'è successo.
 *
 * ## Perché non finge di essere online
 *
 * Perché sarebbe una bugia con conseguenze: un «mi piace» accettato e mai
 * arrivato, un profilo cambiato che al ritorno torna com'era. Quello che non si
 * può fare si dice, e si dice subito.
 */
class ServitoreOffline(
    private val deposito: Deposito,
    private val coda: CodaOffline,
    /** Chi sta usando l'app adesso: le sue richieste in coda sono sue. */
    private val profiloId: String,
) {

    /**
     * La risposta a una richiesta della pagina, o null per lasciarla passare.
     *
     * Torna null solo per quello che non ci riguarda: una richiesta verso un
     * altro indirizzo, che la WebView blocca già per conto suo.
     */
    fun rispondi(richiesta: WebResourceRequest): WebResourceResponse? {
        val url = richiesta.url
        val percorso = url.path ?: return null
        val query = url.query
        val chiave = if (query.isNullOrBlank()) percorso else "$percorso?$query"
        val metodo = richiesta.method.uppercase()

        // La pagina stessa: è la prima cosa che chiede, ed è quella che senza
        // il deposito non arriverebbe mai.
        if (percorso == "/" || percorso == "/console") {
            val html = deposito.paginaSalvata() ?: return errore(
                503,
                "Il computer non risponde, e su questo telefono non c'è ancora una copia " +
                    "della pagina. Collegati una volta con il computer acceso.",
            )
            return risposta("text/html", html.toByteArray())
        }

        /**
         * Mandare una richiesta funziona anche adesso: si mette in coda.
         *
         * Torna la stessa forma che tornerebbe il gateway (`esito: in-coda`),
         * così la console si comporta come sempre — chiude il modulo, va al
         * Riepilogo, e lì la trova in attesa.
         */
        if (metodo == "POST" && percorso.startsWith("/azioni/")) {
            return accodaOffline(percorso.removePrefix("/azioni/"), richiesta)
        }

        if (metodo != "GET" && metodo != "HEAD") {
            return errore(
                503,
                "Questo si può fare solo col computer acceso. Quello che chiedi, invece, " +
                    "si mette in coda e parte da solo appena torna.",
            )
        }

        // Il flusso dello stato vivo: qui non c'è niente da spingere. Si chiude
        // subito invece di lasciare la pagina ad aspettare per sempre.
        if (percorso == "/stato/stream") {
            return WebResourceResponse(
                "text/event-stream",
                "utf-8",
                204,
                "Senza computer",
                mapOf("Cache-Control" to "no-store"),
                ByteArrayInputStream(ByteArray(0)),
            )
        }

        // I file: la galleria, le anteprime, i pensieri.
        idDelFile(percorso)?.let { id ->
            val salvato = deposito.fileSalvato(id)
                ?: return errore(404, "Questo file non è su questo telefono.")
            return risposta(salvato.second, salvato.first)
        }

        // La galleria: si rimette insieme da quello che c'è davvero qui.
        if (percorso == "/libreria") {
            val tipo = url.getQueryParameter("tipo")
            val dove = url.getQueryParameter("dove")
            // La bacheca degli altri non si tiene: sono cose di altre persone,
            // e mostrarle offline vorrebbe dire tenerne una copia sul telefono
            // di chi le guarda. Chi la apre senza linea legge che non c'è.
            if (dove == "bacheca") return risposta("application/json", "{\"voci\":[]}".toByteArray())
            return risposta("application/json", deposito.galleriaOffline(tipo).toByteArray())
        }

        // Le richieste: quelle che il computer conosceva, più quelle scritte qui.
        if (percorso == "/richieste") return richiesteOffline()

        // Tutto il resto che avevamo visto passare: `/io`, `/azioni`, `/invii`,
        // `/pannello`, `/stato`, `/macchina`, `/preset`, `/modelli`…
        deposito.rispostaSalvata(chiave)?.let { return risposta(it.second, it.first) }
        // Stessa rotta, query diversa: meglio la risposta di ieri a quella
        // domanda-parente che nessuna risposta. Vale per `/libreria?quanti=6`
        // quando in cache c'è `?quanti=60`.
        deposito.rispostaSalvata(percorso)?.let { return risposta(it.second, it.first) }

        return errore(
            503,
            "Il computer non risponde adesso. Quello che vedi è l'ultima volta che c'era.",
        )
    }

    /* ------------------------------------------------------- le richieste */

    /**
     * Le richieste, viste da qui: quelle di ieri più quelle scritte oggi.
     *
     * Le seconde nascono già «in attesa» con scritto che partiranno da sole:
     * senza quella riga, uno che manda una cosa a computer spento non ha modo
     * di sapere se è stata presa in carico o buttata via.
     */
    private fun richiesteOffline(): WebResourceResponse {
        val elenco = JSONArray()
        for (voce in coda.sue(profiloId)) {
            elenco.put(
                JSONObject()
                    .put("id", "coda-" + voce.quando)
                    .put("tipo", voce.azione)
                    .put("app", appDi(voce.azione))
                    .put("testo", voce.testo)
                    .put("daNome", "tu")
                    .put("stato", "in-attesa")
                    .put("quando", voce.quando)
                    .put("trattenuta", "Il computer non risponde: parte da sola appena torna."),
            )
        }
        deposito.rispostaSalvata("/richieste")?.let { salvate ->
            runCatching {
                val arr = JSONArray(String(salvate.first))
                for (i in 0 until arr.length()) elenco.put(arr.get(i))
            }
        }
        return risposta("application/json", elenco.toString().toByteArray())
    }

    /** Da `genera.immagine` a `foto`: serve solo a scriverci accanto la scheda. */
    private fun appDi(azione: String): String = when (azione) {
        "genera.immagine" -> "foto"
        "genera.video" -> "cinema"
        "genera.brano" -> "musica"
        "genera.voce" -> "voce"
        else -> ""
    }

    private fun accodaOffline(azione: String, richiesta: WebResourceRequest): WebResourceResponse {
        /**
         * ⚠ **Il corpo della POST non si può leggere da qui**, e non è una
         * dimenticanza nostra: `WebResourceRequest` di Android espone il
         * metodo, l'indirizzo e le intestazioni, ma **non** il corpo. È una
         * limitazione della piattaforma, vecchia quanto la WebView.
         *
         * Per questo la console, quando è nell'app, i valori li manda anche
         * nell'indirizzo (vedi `mandaAnchePerIndirizzo` in `copione-base`): non
         * è un doppione elegante, è l'unica strada che c'è.
         */
        val valori = JSONObject()
        for (nome in richiesta.url.queryParameterNames) {
            if (nome == "_offline") continue
            richiesta.url.getQueryParameter(nome)?.let { valori.put(nome, it) }
        }
        val mappa = mutableMapOf<String, String>()
        for (nome in valori.keys()) mappa[nome] = valori.optString(nome)

        if (mappa.isEmpty()) {
            return errore(
                503,
                "Il computer non risponde e non sono riuscito a leggere cosa hai chiesto. " +
                    "Riprova quando torna.",
            )
        }

        val titolo = mappa.values.firstOrNull().orEmpty()
        coda.aggiungi(azione, azione, titolo, mappa, profiloId)

        val fintaRichiesta = JSONObject()
            .put("id", "coda-" + System.currentTimeMillis())
            .put("stato", "in-attesa")
            .put("testo", titolo)
        return risposta(
            "application/json",
            JSONObject()
                .put("esito", "in-coda")
                .put("richiesta", fintaRichiesta)
                .toString()
                .toByteArray(),
        )
    }

    /* ------------------------------------------------------------ aiutini */

    /** L'id del file chiesto, se questo percorso è un file che potremmo avere. */
    private fun idDelFile(percorso: String): String? = when {
        percorso.startsWith("/libreria/file/") ->
            android.net.Uri.decode(percorso.removePrefix("/libreria/file/"))
        percorso.startsWith("/libreria/anteprima/") ->
            Deposito.anteprimaDi(android.net.Uri.decode(percorso.removePrefix("/libreria/anteprima/")))
        percorso.startsWith("/invii/") && percorso.endsWith("/file") ->
            "invio:" + android.net.Uri.decode(
                percorso.removePrefix("/invii/").removeSuffix("/file"),
            )
        percorso.startsWith("/risultati/") ->
            "risultato:" + android.net.Uri.decode(percorso.removePrefix("/risultati/"))
        else -> null
    }

    private fun risposta(mime: String, corpo: ByteArray): WebResourceResponse =
        WebResourceResponse(
            mime.substringBefore(";").trim().ifBlank { "application/octet-stream" },
            "utf-8",
            200,
            "Dal telefono",
            mapOf(
                // Senza questa, la pagina non può leggere niente: la WebView
                // applica la politica di origine anche alle risposte che
                // costruiamo noi.
                "Access-Control-Allow-Origin" to "*",
                "Cache-Control" to "no-store",
            ),
            ByteArrayInputStream(corpo),
        )

    private fun errore(codice: Int, perche: String): WebResourceResponse =
        WebResourceResponse(
            "application/json",
            "utf-8",
            codice,
            "Senza computer",
            mapOf("Cache-Control" to "no-store"),
            ByteArrayInputStream(JSONObject().put("errore", perche).toString().toByteArray()),
        )
}
