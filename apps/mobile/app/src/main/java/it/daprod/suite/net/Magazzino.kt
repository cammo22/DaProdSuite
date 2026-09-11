package it.daprod.suite.net

import java.io.File
import java.security.MessageDigest

/**
 * **Il magazzino delle foto: quello che il telefono ha gia' scaricato, tenuto
 * sul telefono.**
 *
 * Chiesto il 12 settembre 2026: «carica le foto una alla volta e con
 * connessioni lente si deve aspettare che carica tutte le foto; facciamo che le
 * scarica e una volta scaricate vengono salvate sulla memoria del telefono».
 *
 * ## Perche' non bastava la cache della WebView
 *
 * Dalla 1.1.0 la WebView gira con `LOAD_NO_CACHE`, e per la pagina e' giusto:
 * la pagina **e' il programma**, e il programma si prende sempre da chi lo
 * serve — se no, dopo un aggiornamento, si vedeva la versione di ieri. Ma
 * quella riga vale per tutto, foto comprese: ogni volta che si apriva
 * l'inventario le riscaricava tutte, una per una, e con la linea lenta si
 * aspettava.
 *
 * Qui le foto prendono una strada loro: la pagina le chiede come sempre, e
 * l'app risponde dal disco quando ce l'ha gia'. La regola della pagina resta
 * intatta.
 *
 * ## ⚠ La chiave e' il nome della foto, non l'indirizzo
 *
 * Il tunnel cambia nome a ogni riavvio (vedi `Cartello.kt`): se la chiave fosse
 * l'indirizzo intero, il giorno dopo il magazzino sarebbe da buttare e si
 * riscaricherebbe tutto. La chiave e' quindi **il percorso**, che e' il nome del
 * file in libreria e non cambia mai.
 *
 * ## Quanto tiene, e cosa butta
 *
 * Fino a [QUANTO_TIENE]; quando sfora, butta i piu' vecchi finche' non scende
 * sotto i tre quarti — i piu' vecchi per **ultima volta che sono serviti**, non
 * per data di scarico. Un file piu' grande di [MASSIMO_UN_FILE] non entra: un
 * video non e' una faccia, e per quelli serve poter saltare avanti (`Range`),
 * cosa che da qui non si puo' fare.
 */
class Magazzino(
    private val dove: File,
    private val quantoTiene: Long = QUANTO_TIENE,
) {

    /** Una cosa che il magazzino ha: il file sul disco e di che tipo e'. */
    data class Roba(val file: File, val tipo: String)

    /** Quello che c'e' gia', o niente. Chiederlo lo segna come servito adesso. */
    fun ce(chiave: String): Roba? {
        val corpo = fileDi(chiave)
        val tipo = fileDelTipo(chiave)
        if (!corpo.isFile || !tipo.isFile) return null
        val quale = try {
            tipo.readText().trim()
        } catch (_: Exception) {
            return null
        }
        if (quale.isBlank()) return null
        // Serve a sapere chi buttare per primo quando il magazzino e' pieno.
        try {
            corpo.setLastModified(System.currentTimeMillis())
        } catch (_: Exception) {
            // Se il disco non si lascia toccare, pazienza: si butta per ordine di scarico.
        }
        return Roba(corpo, quale)
    }

    /**
     * Mette via una foto. Torna quello che ha messo, o niente se non entra —
     * e in quel caso chi ha chiamato la usa lo stesso, solo non la ritrova.
     */
    fun metti(chiave: String, tipo: String, byte: ByteArray): Roba? {
        if (byte.isEmpty() || byte.size > MASSIMO_UN_FILE) return null
        val quale = tipo.substringBefore(";").trim().ifBlank { return null }
        return try {
            dove.mkdirs()
            val corpo = fileDi(chiave)
            // Prima accanto e poi al suo posto: se l'app muore a meta' scarico,
            // nel magazzino non resta mezza foto che poi si vede rotta.
            val mezzo = File(corpo.parentFile, corpo.name + ".mezzo")
            mezzo.writeBytes(byte)
            if (corpo.exists()) corpo.delete()
            if (!mezzo.renameTo(corpo)) return null
            fileDelTipo(chiave).writeText(quale)
            faiPosto()
            Roba(corpo, quale)
        } catch (_: Exception) {
            null
        }
    }

    /** Quanto pesa adesso il magazzino, in byte. */
    fun quanto(): Long = (dove.listFiles() ?: emptyArray()).sumOf { it.length() }

    /** Butta tutto: si usa quando si stacca un profilo, che porta via le sue foto. */
    fun svuota() {
        for (f in dove.listFiles() ?: emptyArray()) {
            try {
                f.delete()
            } catch (_: Exception) {
                // Un file che non si lascia togliere non ferma gli altri.
            }
        }
    }

    /** Fa posto buttando i piu' vecchi, se si e' sforato. */
    private fun faiPosto() {
        if (quanto() <= quantoTiene) return
        val tutti = (dove.listFiles() ?: emptyArray())
            .filter { it.isFile && !it.name.endsWith(SUFFISSO_TIPO) }
            .sortedBy { it.lastModified() }
        var peso = quanto()
        val sotto = quantoTiene * 3 / 4
        for (f in tutti) {
            if (peso <= sotto) return
            val suo = File(f.parentFile, f.name + SUFFISSO_TIPO)
            peso -= f.length() + suo.length()
            try {
                f.delete()
                suo.delete()
            } catch (_: Exception) {
                // Come sopra: si va avanti con gli altri.
            }
        }
    }

    private fun fileDi(chiave: String) = File(dove, nomeDi(chiave))

    private fun fileDelTipo(chiave: String) = File(dove, nomeDi(chiave) + SUFFISSO_TIPO)

    private fun nomeDi(chiave: String): String {
        val impronta = MessageDigest.getInstance("SHA-256").digest(chiave.toByteArray(Charsets.UTF_8))
        return impronta.joinToString("") { "%02x".format(it) }
    }

    companion object {
        /** Quattrocento mega di foto: qualche migliaio di facce. */
        const val QUANTO_TIENE = 400L * 1024 * 1024

        /** Piu' di dodici mega non e' una faccia. */
        const val MASSIMO_UN_FILE = 12 * 1024 * 1024

        private const val SUFFISSO_TIPO = ".tipo"

        /**
         * ⚠ **Cosa si tiene: le facce, e basta.**
         *
         * Le anteprime sono sempre immagini, e sono quelle che riempiono
         * l'inventario, i pacchetti e il negozio. Un file della libreria si
         * tiene **solo quando lo chiede un `<img>`**, e lo si sa dall'`Accept`
         * che manda la WebView.
         *
         * Fuori restano i brani e i video, apposta: quelli si guardano saltando
         * avanti e indietro (`Range`), e una risposta intera da qui toglierebbe
         * la barra di scorrimento. Meglio niente magazzino che un lettore che
         * non si puo' spostare.
         */
        fun siTiene(percorso: String, accetta: String?): Boolean {
            if (percorso.startsWith("/libreria/anteprima/")) return true
            if (percorso.startsWith("/io/foto/")) return true
            val perUnImmagine = accetta?.contains("image/") == true
            return perUnImmagine && percorso.startsWith("/libreria/file/")
        }

        /**
         * La chiave di una richiesta: il percorso, e la domanda se c'e'. ⚠ Senza
         * l'indirizzo: il tunnel cambia nome, la foto no.
         */
        fun chiaveDi(percorso: String, domanda: String?): String =
            if (domanda.isNullOrBlank()) percorso else "$percorso?$domanda"
    }
}
