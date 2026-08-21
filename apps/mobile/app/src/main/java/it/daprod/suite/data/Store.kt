package it.daprod.suite.data

import android.content.Context

/**
 * Cosa l'app ricorda fra un avvio e l'altro.
 *
 * Poche cose, tutte dell'accoppiamento: dove sta il PC, il token che ci fa
 * entrare, come si chiama questo telefono e come si chiama quel computer.
 *
 * I due nomi sono **due cose diverse** e la prima stesura li confondeva: il
 * nome del PC finiva nella casella del nome del telefono, e al secondo
 * accoppiamento il telefono si presentava alla suite col nome del computer.
 */
object Store {
    private const val PREFS = "daprod_suite"
    private const val KEY_TOKEN = "token"
    private const val KEY_HOST = "host"
    private const val KEY_NOME = "nome"
    private const val KEY_COMPUTER = "computer"
    private const val KEY_RUOLO = "ruolo"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun salvaAccoppiamento(
        context: Context,
        host: String,
        token: String,
        /** Come si chiama **questo telefono**, quello che la suite mostrerà. */
        nome: String,
        /** Come si chiama **il PC** a cui ci si è collegati. */
        computer: String,
        ruolo: String,
    ) {
        prefs(context).edit()
            .putString(KEY_HOST, host)
            .putString(KEY_TOKEN, token)
            .putString(KEY_NOME, nome)
            .putString(KEY_COMPUTER, computer)
            .putString(KEY_RUOLO, ruolo)
            .apply()
    }

    /** L'ultimo indirizzo visto, anche prima di essere accoppiati (dal QR). */
    fun ricordaHost(context: Context, host: String) {
        prefs(context).edit().putString(KEY_HOST, host).apply()
    }

    fun token(context: Context): String? = prefs(context).getString(KEY_TOKEN, null)

    fun host(context: Context): String? = prefs(context).getString(KEY_HOST, null)

    /** Il nome di questo telefono. La prima volta lo propone Android. */
    fun nome(context: Context): String =
        prefs(context).getString(KEY_NOME, null) ?: android.os.Build.MODEL ?: "telefono"

    fun computer(context: Context): String? = prefs(context).getString(KEY_COMPUTER, null)

    fun ruolo(context: Context): String = prefs(context).getString(KEY_RUOLO, "ospite") ?: "ospite"

    fun ePadrone(context: Context): Boolean = ruolo(context) == "admin"

    /**
     * Dimentica l'accoppiamento.
     *
     * Non è la stessa cosa della revoca dal PC: qui il telefono si scorda il
     * token, ma il dispositivo resta nell'elenco della suite finché non lo si
     * toglie da lì. Vale la pena dirlo a chi preme.
     */
    fun scollega(context: Context) {
        prefs(context).edit().clear().apply()
    }
}
