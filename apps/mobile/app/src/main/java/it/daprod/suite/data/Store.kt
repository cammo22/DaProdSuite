package it.daprod.suite.data

import android.content.Context

/**
 * Le poche cose che l'app ricorda e che **non** sono di una persona sola.
 *
 * L'accoppiamento non sta più qui: sta in [Profili], perché da questa versione
 * il telefono può avere più persone e ognuna ha il suo token, il suo ruolo e il
 * suo PC. Qui restano due cose che valgono per l'app intera:
 *
 * - **l'ultimo indirizzo visto**, anche prima di essere accoppiati. Serve al
 *   codice a otto cifre battuto a mano: senza il QR non si saprebbe a quale
 *   computer bussare;
 * - **quando si è guardato l'ultima volta** se c'è una versione nuova dell'app,
 *   che è l'unica cosa che questa app manda fuori dalla tua rete e non deve
 *   diventare un pettegolezzo continuo.
 */
object Store {
    private const val PREFS = "daprod_suite"
    private const val KEY_BASE = "base"
    private const val KEY_AGG = "ultimo_controllo_aggiornamenti"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /**
     * L'ultimo indirizzo del PC visto, con lo schema davanti.
     *
     * Dalla 0.6.0 è un URL completo e non più `ip:porta`: con il tunnel acceso
     * il gateway sta su `https://qualcosa.trycloudflare.com`, che una porta non
     * ce l'ha e HTTP non è. Un indirizzo salvato dalla versione precedente —
     * «192.168.1.8:8790» — si legge lo stesso: gli si mette davanti `http://`,
     * che è quello che l'app faceva prima.
     */
    fun base(context: Context): String? {
        val salvato = prefs(context).getString(KEY_BASE, null)?.trim()?.trimEnd('/')
        if (salvato.isNullOrBlank()) return null
        return if (salvato.startsWith("http://") || salvato.startsWith("https://")) {
            salvato
        } else {
            "http://$salvato"
        }
    }

    fun ricordaBase(context: Context, base: String) {
        prefs(context).edit().putString(KEY_BASE, base.trim().trimEnd('/')).apply()
    }

    /** Quando si è guardato l'ultima volta se c'è una versione nuova dell'app. */
    fun ultimoControlloAgg(context: Context): Long = prefs(context).getLong(KEY_AGG, 0)

    fun segnaControlloAgg(context: Context) {
        prefs(context).edit().putLong(KEY_AGG, System.currentTimeMillis()).apply()
    }

    /**
     * Le azioni che il PC dichiarava l'ultima volta che ha risposto.
     *
     * Si tengono per una ragione sola: **senza, offline non si può chiedere
     * niente**. Il modulo di una richiesta nasce dalle azioni che la suite
     * dichiara, e se il PC non risponde non c'è nessuna azione da cui farlo
     * nascere — cioè la coda offline, che è la ragione per cui questa app
     * serve anche a computer spento, resterebbe una lista vuota.
     *
     * Sono per persona: due profili possono stare su due computer diversi, con
     * due suite di versioni diverse.
     */
    fun ricordaAzioni(context: Context, profilo: String, json: String) {
        prefs(context).edit().putString("azioni:$profilo", json).apply()
    }

    fun azioniRicordate(context: Context, profilo: String): String? =
        prefs(context).getString("azioni:$profilo", null)

    /** Il nome che Android propone per una persona nuova, la prima volta. */
    fun nomeProposto(): String = android.os.Build.MODEL ?: "telefono"
}
