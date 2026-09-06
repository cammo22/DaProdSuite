package it.daprod.suite.net

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Tailscale acceso **dentro l'app**, e la porta locale da cui ci si passa.
 *
 * ⚠ **Perche' esiste.** Detto il 6 settembre 2026, con l'app in mano fuori
 * casa: «il problema e' Cloudflare che cambia sempre». Ed e' proprio quello.
 * Fuori casa l'unica strada era il tunnel; il nome di un tunnel gratuito
 * cambia a **ogni accensione della suite**, e aggiornare vuol dire riaccendere.
 * Il telefono restava con in mano un nome che risponde 530, e per impararne uno
 * nuovo avrebbe dovuto parlare col PC — cosa che non poteva fare, perche' per
 * parlare col PC serviva un indirizzo che funziona.
 *
 * Un indirizzo Tailscale non cambia mai. Il computer ne aveva gia' uno; il
 * telefono no, e la richiesta era netta: «non voglio dover scaricare altre
 * app». Quindi il nodo Tailscale sta **qui dentro**, in `tailponte/`.
 *
 * ## Cosa fa questo file, e cosa non fa
 *
 * Fa una cosa sola: accende il nodo e apre **un buco**, cioe' una porta su
 * `127.0.0.1` che sbuca dentro il gateway dall'altra parte del tailnet. Da quel
 * momento «passare da Tailscale» e' un indirizzo come tutti gli altri, e chi
 * sceglie fra gli indirizzi — [Indirizzi] — non deve sapere niente di tutto
 * questo.
 *
 * Non fa: VPN di sistema, permessi, dirottamento del traffico del telefono. Il
 * nodo vive dentro il processo e muore con esso.
 *
 * ## Non e' obbligatorio
 *
 * Un telefono che non ha mai acceso Tailscale continua a funzionare come prima
 * — wifi di casa, e tunnel quando si esce. Tailscale e' **una strada in piu'**,
 * che si accende quando si vuole e che, una volta accesa, e' l'unica che non
 * scade.
 */
object Tailnet {

    private const val PREFS = "daprod_tailnet"
    private const val CHIAVE_ACCESO = "acceso"
    private const val CHIAVE_INVITO = "chiave_invito"

    /**
     * ⚠ **Dove il nodo tiene le sue chiavi.**
     *
     * `filesDir` e non `cacheDir`, e la ragione e' esattamente il difetto che
     * stiamo curando: la cache Android la svuota quando vuole, e un nodo che
     * perde le chiavi rientra nel tailnet come un **dispositivo nuovo** — con
     * un indirizzo nuovo, e col vecchio che resta nell'elenco a fare confusione.
     * `filesDir` sopravvive agli aggiornamenti dell'app.
     */
    private fun cartella(context: Context): File =
        File(context.filesDir, "tailscale").also { it.mkdirs() }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Se chi usa il telefono ha detto di volerlo. Spento finche' non lo accende. */
    fun loVuole(context: Context): Boolean =
        prefs(context).getBoolean(CHIAVE_ACCESO, false)

    fun loVuole(context: Context, si: Boolean) {
        prefs(context).edit().putBoolean(CHIAVE_ACCESO, si).apply()
    }

    /**
     * La chiave d'invito, se ne e' stata data una.
     *
     * Senza, si entra dal browser: Tailscale da' un indirizzo, lo si apre, si
     * dice di si', e non si ripete piu'. Con una chiave si salta anche quello —
     * serve a chi mette in casa il quinto telefono e non vuole rifare il giro
     * ogni volta.
     */
    fun chiaveDInvito(context: Context): String =
        prefs(context).getString(CHIAVE_INVITO, "").orEmpty()

    fun chiaveDInvito(context: Context, chiave: String) {
        prefs(context).edit().putString(CHIAVE_INVITO, chiave.trim()).apply()
    }

    /**
     * Come sta messo il nodo adesso. E' quello che si fa vedere nelle
     * impostazioni, ed e' scritto per essere letto da chi non sa cos'e' un
     * tailnet.
     */
    sealed interface Stato {
        /** Non lo vuole, o non e' mai partito. */
        data object Spento : Stato

        /** Partito, e aspetta che qualcuno apra l'indirizzo nel browser. */
        data class ServeIlBrowser(val indirizzo: String) : Stato

        /**
         * Dentro **e ci si arriva**: `mio` e' l'indirizzo di questo telefono.
         *
         * ⚠ «Dentro» da solo non voleva dire niente — vedi [Stato.AltraRete].
         */
        data class Dentro(val mio: String) : Stato

        /**
         * ⚠ **Acceso, ma in un'altra rete Tailscale.** Nuovo nella 1.0.6.
         *
         * Il 6 settembre 2026, con l'app in mano: «ho collegato tailscale a
         * google e comunque stesso problema». Il foglio diceva **«Acceso.
         * Questo telefono adesso si chiama 100.87.91.65»**, in verde, e non
         * raggiungeva niente.
         *
         * Era vero e inutile: entrando con Google si finisce nel tailnet di
         * quell'account, e il computer sta in un altro. Due nodi accesi che non
         * si vedranno mai — e nessuno lo diceva.
         *
         * `mio` e' il nome di questo telefono, `perche` il motivo per cui il
         * computer non si raggiunge. Da mostrare come un guaio, non come un
         * successo.
         */
        data class AltraRete(val mio: String, val perche: String) : Stato

        /** Ci ha provato e non ce l'ha fatta. */
        data class Guaio(val perche: String) : Stato
    }

    /**
     * Accende il nodo, se serve, e dice come sta.
     *
     * Va chiamata da un thread di sfondo: il nodo parla in rete e non torna
     * subito. La prima volta ci mette qualche secondo; le volte dopo, avendo
     * gia' le chiavi in [cartella], torna quasi subito.
     */
    suspend fun accendi(
        context: Context,
        nomeDelTelefono: String,
        dentroIlTailnet: String = "",
    ): Stato =
        withContext(Dispatchers.IO) {
            if (!loVuole(context)) return@withContext Stato.Spento
            try {
                /*
                 * ⚠ **Le schede di rete prima di tutto.**
                 *
                 * Va fatto **prima** di avvia, non dopo: il nodo se le va a
                 * prendere appena parte, e senza questa riga cade li' con
                 * «netlinkrib: permission denied». Vedi `ReteDelTelefono`.
                 */
                tailponte.Tailponte.usaLeReti(ReteDelTelefono())
                tailponte.Tailponte.avvia(
                    cartella(context).absolutePath,
                    chiaveDInvito(context),
                    nomeDelTelefono,
                )
            } catch (e: Throwable) {
                return@withContext Stato.Guaio(e.message ?: "Tailscale non e' partito.")
            }
            comeSta(dentroIlTailnet)
        }

    /**
     * Come sta, senza accendere niente.
     *
     * `dentroIlTailnet` e' l'indirizzo del computer visto dal tailnet. Quando
     * c'e', **si prova ad arrivarci davvero** invece di fidarsi del fatto che il
     * nodo sia acceso: vedi [Stato.AltraRete] per il perche'.
     */
    fun comeSta(dentroIlTailnet: String = ""): Stato {
        return try {
            if (tailponte.Tailponte.acceso()) {
                val mio = tailponte.Tailponte.mioIndirizzo()
                val dove = ospiteEPorta(dentroIlTailnet)
                if (dove == null) return Stato.Dentro(mio)
                /*
                 * ⚠ La domanda vera non e' «sono acceso» ma «ci arrivo». Un
                 * secondo di attesa qui vale sei versioni di malintesi.
                 */
                val guaio = tailponte.Tailponte.provo(dove)
                if (guaio.isBlank()) Stato.Dentro(mio)
                else Stato.AltraRete(mio, guaio)
            } else {
                val url = tailponte.Tailponte.urlDiLogin()
                if (url.isNotBlank()) Stato.ServeIlBrowser(url)
                else {
                    val guaio = tailponte.Tailponte.ultimoGuaio()
                    if (guaio.isNotBlank()) Stato.Guaio(guaio) else Stato.Spento
                }
            }
        } catch (e: Throwable) {
            Stato.Guaio(e.message ?: "Tailscale non risponde.")
        }
    }

    /**
     * ⚠ **Il buco: l'indirizzo locale che sbuca dentro il tailnet.**
     *
     * `dentroIlTailnet` e' l'indirizzo del computer visto da li' — per esempio
     * `http://100.88.254.19:8790`. Torna un `http://127.0.0.1:<porta>` che e'
     * lo **stesso identico posto**, e che si puo' dare alla WebView e a OkHttp
     * senza configurare niente.
     *
     * Torna null se Tailscale non e' pronto: chi ha chiamato tira dritto con
     * gli altri indirizzi, che e' esattamente quello che deve succedere.
     */
    fun buco(dentroIlTailnet: String): String? {
        val dove = ospiteEPorta(dentroIlTailnet) ?: return null
        return try {
            val porta = tailponte.Tailponte.apri(dove)
            if (porta > 0) "http://127.0.0.1:$porta" else null
        } catch (e: Throwable) {
            null
        }
    }

    /** Da `http://100.88.254.19:8790/` a `100.88.254.19:8790`. */
    private fun ospiteEPorta(base: String): String? {
        val pulito = base.trim().trimEnd('/')
        val senzaSchema = pulito.substringAfter("://", pulito)
        if (senzaSchema.isBlank()) return null
        val soloOspite = senzaSchema.substringBefore("/")
        return if (soloOspite.contains(":")) soloOspite else "$soloOspite:80"
    }

    /**
     * Fra gli indirizzi che il computer ci ha dato, quello del tailnet.
     *
     * E' `100.64.0.0/10` — lo spazio in cui vivono i nodi Tailscale. Se non ce
     * n'e' nessuno vuol dire che quel computer Tailscale non ce l'ha, e allora
     * non c'e' niente da aprire.
     */
    fun quelloDelTailnet(basi: List<String>): String? =
        basi.firstOrNull { Indirizzi.quantoLontano(it) == Indirizzi.VIA_TAILSCALE }

    /** In che rete Tailscale e' entrato questo telefono. Vuoto se non e' acceso. */
    fun mioTailnet(): String =
        try { tailponte.Tailponte.mioTailnet() } catch (e: Throwable) { "" }

    /** Chiude tutto. Si usa quando si spegne Tailscale dalle impostazioni. */
    fun spegni(context: Context) {
        loVuole(context, false)
        try {
            tailponte.Tailponte.spegni()
        } catch (e: Throwable) {
            // Era gia' spento: non e' un guaio, e' la condizione che si voleva.
        }
    }
}
