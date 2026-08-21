package it.daprod.suite

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * Mettere un risultato dentro il telefono, dove poi si ritrova.
 *
 * Un'immagine deve finire nella galleria, un video nella galleria, un brano fra
 * la musica: se finissero tutti in una cartella dell'app, per riascoltarli
 * bisognerebbe riaprire l'app — e allora tanto varrebbe guardarli sul PC.
 *
 * Da Android 10 in poi la strada è MediaStore, che non chiede permessi per
 * scrivere nelle proprie collezioni. Sotto (la 8 e la 9, che restano dentro il
 * `minSdk 26`) MediaStore non accetta `RELATIVE_PATH`, e si scrive nella
 * cartella pubblica com'era normale allora.
 */
object Scarica {

    /** Dove va a finire, secondo cosa è. */
    private fun collezione(mime: String): Tipo = when {
        mime.startsWith("image/") -> Tipo(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            Environment.DIRECTORY_PICTURES,
            "Immagini",
        )
        mime.startsWith("video/") -> Tipo(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            Environment.DIRECTORY_MOVIES,
            "Video",
        )
        mime.startsWith("audio/") -> Tipo(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            Environment.DIRECTORY_MUSIC,
            "Musica",
        )
        else -> Tipo(
            MediaStore.Files.getContentUri("external"),
            Environment.DIRECTORY_DOWNLOADS,
            "Download",
        )
    }

    private data class Tipo(
        val collezione: android.net.Uri,
        val cartella: String,
        val dove: String,
    )

    /**
     * Salva i byte col nome dato. Torna il nome del posto, da dire a chi guarda
     * («salvato in Immagini»), oppure lancia se non si è potuto scrivere.
     */
    suspend fun salva(
        context: Context,
        nome: String,
        mime: String,
        byte: ByteArray,
    ): String = withContext(Dispatchers.IO) {
        val tipo = collezione(mime)
        val sotto = "${tipo.cartella}/DaProd Suite"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val valori = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, nome)
                put(MediaStore.MediaColumns.MIME_TYPE, mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, sotto)
                // Finché è a 1 il file non compare in galleria: se lo
                // scaricamento si interrompe non resta una foto mezza scritta.
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = context.contentResolver.insert(tipo.collezione, valori)
                ?: throw IllegalStateException("Il telefono non mi lascia scrivere in ${tipo.dove}.")
            context.contentResolver.openOutputStream(uri).use { flusso ->
                flusso?.write(byte) ?: throw IllegalStateException("Non riesco a scrivere il file.")
            }
            valori.clear()
            valori.put(MediaStore.MediaColumns.IS_PENDING, 0)
            context.contentResolver.update(uri, valori, null, null)
        } else {
            val cartella = File(Environment.getExternalStoragePublicDirectory(tipo.cartella), "DaProd Suite")
            if (!cartella.exists()) cartella.mkdirs()
            FileOutputStream(File(cartella, nome)).use { it.write(byte) }
        }

        "${tipo.dove} › DaProd Suite"
    }
}
