package it.daprod.suite.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

/**
 * Lo specchio del computer, dentro il telefono.
 *
 * **Il difetto che questo file esiste per curare, detto il 26 agosto 2026:**
 *
 * > «quando il pc non è raggiungibile deve comunque funzionare la stessa
 * > interfaccia e app; tutto quello che si riceve automaticamente viene salvato
 * > offline, poi se uno vuole li può salvare in galleria. Al momento se il pc
 * > non è raggiungibile mostra un'altra schermata: questa cosa non va bene, e
 * > non mi piace nemmeno quella schermata.»
 *
 * Aveva ragione due volte. La schermata «senza PC» era brutta, ma soprattutto
 * era **un'altra app**: un menu a tendina, un modulo e una lista — niente
 * galleria, niente bacheca, niente di quello che uno aveva appena guardato. Un
 * programma che a computer spento diventa un altro programma è un programma di
 * cui non ci si fida.
 *
 * ## L'idea, in una riga
 *
 * **La pagina resta la stessa; a rispondere, invece del computer, è il
 * telefono.** La console è una pagina web che parla con un gateway per rotte
 * HTTP: se qualcuno risponde a quelle rotte, la pagina non si accorge di
 * niente. Questo file è quel qualcuno.
 *
 * Quindi qui dentro ci sono due cose:
 *
 * 1. **le risposte** che il computer ha dato l'ultima volta che c'era, tenute
 *    così come sono arrivate (`/io`, `/azioni`, `/richieste`, `/libreria`, …);
 * 2. **i file** — le immagini, i video, i brani, i pensieri — scaricati mentre
 *    la linea c'era, con le loro anteprime.
 *
 * ## Perché tenere le risposte così come sono
 *
 * Perché il formato lo decide il gateway, non noi. Se domani `/libreria`
 * guadagna un campo, questo file non se ne accorge nemmeno: lo tiene e lo
 * ridà. Rileggerle e ricostruirle vorrebbe dire una seconda implementazione del
 * contratto — e la seconda implementazione è quella che diverge.
 *
 * ## Quanto tiene, e perché non tutto
 *
 * I file grossi no: un telefono non è un disco di riserva, e sessanta video da
 * cento MB sono sei giga che nessuno ha chiesto. Si tengono **le anteprime di
 * tutto** — sono decine di KB, e sono quello che rende una galleria una
 * galleria — e **i file interi fino a [MASSIMO_FILE]**, che è la misura di
 * un'immagine, di un brano e di una clip corta.
 */
class Deposito(context: Context, profiloId: String) {

    private val radice = File(context.filesDir, "deposito/${pulito(profiloId)}")
    private val risposte = File(radice, "risposte")
    private val file = File(radice, "file")

    init {
        risposte.mkdirs()
        file.mkdirs()
    }

    /* --------------------------------------------------------- la pagina */

    private val pagina = File(radice, "console.html")

    /**
     * La console, come il computer l'ha servita l'ultima volta.
     *
     * **È il pezzo che rende possibile tutto il resto.** Una WebView senza rete
     * non carica niente: senza questa copia, offline non ci sarebbe nessuna
     * pagina da cui far partire le domande che questo file sa esaudire.
     *
     * Si riscrive a ogni collegamento riuscito: quando la suite si aggiorna e
     * la pagina cambia, il telefono se ne accorge alla prima volta che il
     * computer risponde.
     */
    fun salvaPagina(html: String) {
        if (html.isBlank()) return
        runCatching { pagina.writeText(html) }
    }

    fun paginaSalvata(): String? =
        runCatching { if (pagina.exists()) pagina.readText() else null }.getOrNull()

    /* ------------------------------------------------------- le risposte */

    /**
     * Tiene la risposta a una rotta, così com'è arrivata.
     *
     * La chiave è il percorso con la sua query: `/libreria?quanti=60&dove=mie`
     * e `/libreria?quanti=6&dove=mie` sono due domande diverse e due risposte
     * diverse, e la pagina le fa tutte e due.
     */
    fun mettiRisposta(chiave: String, corpo: ByteArray, mime: String) {
        runCatching {
            File(risposte, nomeDi(chiave)).writeBytes(corpo)
            File(risposte, nomeDi(chiave) + ".mime").writeText(mime)
        }
    }

    fun rispostaSalvata(chiave: String): Pair<ByteArray, String>? = runCatching {
        val corpo = File(risposte, nomeDi(chiave))
        if (!corpo.exists()) return@runCatching null
        val mime = File(risposte, nomeDi(chiave) + ".mime")
            .takeIf { it.exists() }?.readText() ?: "application/json"
        corpo.readBytes() to mime
    }.getOrNull()

    /* ----------------------------------------------------------- i file */

    /**
     * Tiene un file, con il suo tipo. Torna falso se era troppo grosso.
     *
     * L'id è quello della libreria (o dell'invio): è la stessa chiave con cui
     * la pagina lo richiederà, quindi non c'è nessuna traduzione da tenere in
     * piedi fra quello che si salva e quello che si serve.
     */
    fun mettiFile(id: String, corpo: ByteArray, mime: String): Boolean {
        if (corpo.size > MASSIMO_FILE) return false
        return runCatching {
            File(file, nomeDi(id)).writeBytes(corpo)
            File(file, nomeDi(id) + ".mime").writeText(mime)
            true
        }.getOrDefault(false)
    }

    fun fileSalvato(id: String): Pair<ByteArray, String>? = runCatching {
        val corpo = File(file, nomeDi(id))
        if (!corpo.exists()) return@runCatching null
        val mime = File(file, nomeDi(id) + ".mime")
            .takeIf { it.exists() }?.readText() ?: "application/octet-stream"
        corpo.readBytes() to mime
    }.getOrNull()

    fun ceLho(id: String): Boolean = File(file, nomeDi(id)).exists()

    /* ------------------------------------------------------- la galleria */

    /**
     * L'elenco delle cose tenute qui, nel formato che la pagina si aspetta.
     *
     * Si ricava dalle risposte salvate di `/libreria`, tenendo **solo quelle di
     * cui abbiamo davvero il file o l'anteprima**: mostrare offline un riquadro
     * che non si apre è peggio che non mostrarlo, perché promette una cosa che
     * non c'è.
     */
    fun galleriaOffline(filtroTipo: String?): String {
        val voci = JSONArray()
        val viste = mutableSetOf<String>()
        for (chiave in chiaviLibreria()) {
            val salvata = rispostaSalvata(chiave) ?: continue
            val dentro = runCatching { JSONObject(String(salvata.first)) }.getOrNull() ?: continue
            val arr = dentro.optJSONArray("voci") ?: continue
            for (i in 0 until arr.length()) {
                val v = arr.optJSONObject(i) ?: continue
                val id = v.optString("id")
                if (id.isBlank() || !viste.add(id)) continue
                if (!ceLho(id) && !ceLho(anteprimaDi(id))) continue
                if (!filtroTipo.isNullOrBlank() && v.optString("tipo") != filtroTipo) continue
                // Quello che non c'è per intero si può ancora guardare in
                // piccolo: l'anteprima c'è quasi sempre, il file no.
                v.put("anteprima", ceLho(anteprimaDi(id)))
                voci.put(v)
            }
        }
        return JSONObject().put("voci", voci).toString()
    }

    /** Le domande a `/libreria` che abbiamo visto passare, per rimetterle insieme. */
    private fun chiaviLibreria(): List<String> = runCatching {
        File(radice, "chiavi-libreria.txt")
            .takeIf { it.exists() }?.readLines()?.filter { it.isNotBlank() } ?: emptyList()
    }.getOrDefault(emptyList())

    fun ricordaChiaveLibreria(chiave: String) {
        runCatching {
            val elenco = File(radice, "chiavi-libreria.txt")
            val gia = chiaviLibreria()
            if (chiave in gia) return
            elenco.appendText(chiave + "\n")
        }
    }

    /* ------------------------------------------------------------ aiutini */

    companion object {
        /**
         * Quanto può pesare un file tenuto offline: quaranta mega.
         *
         * È la misura di un'immagine, di un brano e di una clip corta. Un video
         * da cento MB resta sul computer, e qui ne resta l'anteprima: si vede
         * che c'è, si sa cos'è, e si scarica quando la linea torna.
         */
        const val MASSIMO_FILE = 40 * 1024 * 1024

        /** La chiave con cui si tiene l'anteprima di una cosa. */
        fun anteprimaDi(id: String): String = "anteprima:$id"

        private fun nomeDi(chiave: String): String {
            val sha = MessageDigest.getInstance("SHA-1").digest(chiave.toByteArray())
            return sha.joinToString("") { "%02x".format(it) }
        }

        private fun pulito(s: String): String = s.replace(Regex("[^A-Za-z0-9_-]"), "_")
    }
}
