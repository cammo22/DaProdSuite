package it.daprod.suite

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * ⚠ **La voce del telefono, per le pagine.** Nuova nella 1.5.0.
 *
 * Il 25 settembre 2026, di Neon Partenope dentro la sala: «non sento i dialoghi
 * con il TTS». Il gioco parla con la sintesi vocale del browser
 * (`speechSynthesis`), e nella WebView di Android **non c'è**: sul computer la
 * Radio parlava, sul telefono restava muta, senza nessun errore.
 *
 * Qui c'è quella di Android, in italiano, e il ponte `DaProdApp.parla` la dà a
 * chi la chiede. Si accende la prima volta che serve: chi non gioca a Neon non
 * paga il motore della voce.
 */
object Voce {
    private var tts: TextToSpeech? = null
    private var pronta = false
    private var inAttesa: Triple<String, Float, Float>? = null

    fun parla(ctx: Context, testo: String, tono: Float, velocita: Float) {
        if (tts == null) {
            inAttesa = Triple(testo, tono, velocita)
            tts = TextToSpeech(ctx.applicationContext) { stato ->
                pronta = stato == TextToSpeech.SUCCESS
                if (pronta) {
                    tts?.setLanguage(Locale.ITALIAN)
                    inAttesa?.let { (a, b, c) -> dici(a, b, c) }
                }
                inAttesa = null
            }
            return
        }
        if (!pronta) { inAttesa = Triple(testo, tono, velocita); return }
        dici(testo, tono, velocita)
    }

    private fun dici(testo: String, tono: Float, velocita: Float) {
        val t = tts ?: return
        t.setPitch(tono.coerceIn(0.5f, 2f))
        t.setSpeechRate(velocita.coerceIn(0.5f, 2f))
        t.speak(testo.take(600), TextToSpeech.QUEUE_FLUSH, null, "daprod-voce")
    }

    fun zitta() {
        try { tts?.stop() } catch (_: Exception) { }
    }

    fun spegni() {
        try { tts?.shutdown() } catch (_: Exception) { }
        tts = null
        pronta = false
    }
}
