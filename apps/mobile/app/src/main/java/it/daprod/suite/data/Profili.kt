package it.daprod.suite.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Chi usa questo telefono, e con quale PC.
 *
 * **Perché esiste, detto da chi l'ha chiesto**: «all'avvio dell'app devo poter
 * scegliere un user così da capire chi è chi». Fino alla 0.5.2 il telefono
 * aveva **un** accoppiamento solo, e il nome che arrivava al PC era quello del
 * modello Android — «SM-A536B». In una casa dove tre persone chiedono lavori
 * allo stesso computer, la fila diceva tre volte «SM-A536B» e non c'era modo
 * di sapere chi avesse chiesto cosa.
 *
 * Adesso il telefono tiene **un elenco di persone**, ognuna con il suo
 * accoppiamento: il suo token, il suo ruolo, il suo PC. Si sceglie all'avvio, e
 * si cambia in due tocchi. Sul PC ognuna compare col proprio nome, perché è
 * quel nome che è stato usato per accoppiarsi.
 *
 * **Un profilo è una credenziale, non un'etichetta.** Cambiare persona non
 * cambia un'intestazione: cambia il token con cui si parla al PC. Chi è ospite
 * resta ospite anche sul telefono di chi decide, e togliere una persona
 * da qui toglie davvero il suo accesso da questo telefono.
 */
data class Profilo(
    /** Un id nostro, che non è il nome: due persone possono chiamarsi uguale. */
    val id: String,
    /** Come si presenta al PC. È quello che compare nella fila, accanto a ogni richiesta. */
    val nome: String,
    /**
     * L'indirizzo che ha funzionato l'ultima volta, con lo schema.
     *
     * È il primo che si prova, e viene riscritto ogni volta che ne risponde un
     * altro: così il telefono impara da sé dove sta il computer invece di
     * restare fermo su una fotografia vecchia.
     */
    val base: String,
    /**
     * Tutti gli indirizzi che quel computer aveva quando ci si è collegati.
     *
     * Casa, Tailscale, il tunnel. Il telefono li prova finché uno risponde —
     * vedi `Indirizzi.kt`. Senza questo elenco, cambiare rete voleva dire
     * perdere il computer per sempre.
     */
    val basi: List<String> = emptyList(),
    val token: String,
    val ruolo: String,
    /** Come si chiama il computer a cui è collegata questa persona. */
    val computer: String,
    val ultimoUso: Long,
) {
    val ePadrone: Boolean get() = ruolo == "admin"
}

object Profili {
    private const val PREFS = "daprod_profili"
    private const val CHIAVE = "elenco"
    private const val CHIAVE_ATTIVO = "attivo"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Tutte le persone di questo telefono, dall'ultima che ha usato l'app. */
    fun tutti(context: Context): List<Profilo> {
        val grezzo = prefs(context).getString(CHIAVE, "[]") ?: "[]"
        return try {
            val arr = JSONArray(grezzo)
            (0 until arr.length())
                .map { daJson(arr.getJSONObject(it)) }
                .sortedByDescending { it.ultimoUso }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /** Chi sta usando l'app adesso, se qualcuno è stato scelto. */
    fun attivo(context: Context): Profilo? {
        val id = prefs(context).getString(CHIAVE_ATTIVO, null) ?: return null
        return tutti(context).firstOrNull { it.id == id }
    }

    /**
     * Aggiunge o aggiorna una persona, e la rende quella attiva.
     *
     * Se ce n'è già una **con lo stesso nome sullo stesso computer** si
     * sostituisce invece di aggiungerne una seconda: rifare l'accoppiamento è
     * quello che si fa quando il token non vale più, e ritrovarsi due «Cammo»
     * nell'elenco sarebbe la conseguenza sbagliata di un gesto giusto.
     */
    fun salva(context: Context, profilo: Profilo) {
        val altri = tutti(context).filterNot {
            it.id == profilo.id || (it.nome == profilo.nome && it.computer == profilo.computer)
        }
        scrivi(context, altri + profilo)
        scegli(context, profilo.id)
    }

    fun scegli(context: Context, id: String) {
        val profilo = tutti(context).firstOrNull { it.id == id } ?: return
        prefs(context).edit().putString(CHIAVE_ATTIVO, id).apply()
        // L'ordine dell'elenco è «l'ultima che ha usato l'app per prima»: senza
        // questa riga chi apre sempre lo stesso profilo se lo ritrova in fondo.
        scrivi(context, tutti(context).map { if (it.id == id) it.copy(ultimoUso = System.currentTimeMillis()) else it })
    }

    /**
     * Toglie una persona da questo telefono.
     *
     * **Non è una revoca.** Il dispositivo resta nell'elenco della suite finché
     * non lo si toglie anche da lì, dal pannello «Da fuori»: qui si butta via il
     * token, di là si chiude la porta. Vale la pena dirlo a chi preme.
     */
    fun rimuovi(context: Context, id: String) {
        scrivi(context, tutti(context).filterNot { it.id == id })
        if (prefs(context).getString(CHIAVE_ATTIVO, null) == id) {
            prefs(context).edit().remove(CHIAVE_ATTIVO).apply()
        }
    }

    /** Esce dalla persona attiva senza cancellarla: si torna alla scelta. */
    fun esci(context: Context) {
        prefs(context).edit().remove(CHIAVE_ATTIVO).apply()
    }

    private fun scrivi(context: Context, profili: List<Profilo>) {
        val arr = JSONArray()
        for (p in profili) {
            arr.put(
                JSONObject()
                    .put("id", p.id)
                    .put("nome", p.nome)
                    .put("base", p.base)
                    .put("basi", JSONArray().also { a -> for (b in p.basi) a.put(b) })
                    .put("token", p.token)
                    .put("ruolo", p.ruolo)
                    .put("computer", p.computer)
                    .put("ultimoUso", p.ultimoUso),
            )
        }
        prefs(context).edit().putString(CHIAVE, arr.toString()).apply()
    }

    private fun daJson(j: JSONObject): Profilo {
        val basi = mutableListOf<String>()
        j.optJSONArray("basi")?.let { arr ->
            for (i in 0 until arr.length()) basi.add(arr.getString(i))
        }
        return profiloDa(j, basi)
    }

    private fun profiloDa(j: JSONObject, basi: List<String>) = Profilo(
        id = j.optString("id"),
        nome = j.optString("nome"),
        base = j.optString("base"),
        basi = basi,
        token = j.optString("token"),
        ruolo = j.optString("ruolo", "ospite"),
        computer = j.optString("computer"),
        ultimoUso = j.optLong("ultimoUso"),
    )

    /**
     * Segna quale indirizzo ha risposto, senza toccare il resto.
     *
     * Si chiama ogni volta che il telefono ritrova il computer da un'altra
     * parte: la prossima volta si parte da lì, e non si rifà il giro.
     */
    fun ricordaBase(context: Context, id: String, base: String) {
        val tutti = tutti(context)
        val chi = tutti.firstOrNull { it.id == id } ?: return
        if (chi.base == base) return
        scrivi(context, tutti.map { if (it.id == id) it.copy(base = base) else it })
    }

    /**
     * Gli indirizzi nuovi che il computer ci ha appena detto di avere.
     *
     * **Il guasto che questo metodo chiude.** L'indirizzo del tunnel cambia a
     * ogni accensione della suite, ma il telefono si ricordava quelli letti nel
     * QR il giorno dell'accoppiamento. Fuori casa provava un indirizzo
     * Cloudflare che non esisteva piu' e diceva «non raggiungibile» per sempre:
     * l'unica cura era rifare il QR, cioe' tornare davanti al PC — proprio la
     * cosa che non si puo' fare quando si e' fuori.
     *
     * Adesso `/io` risponde anche con gli indirizzi di adesso, e quelli si
     * scrivono qui. Basta arrivarci **una volta** da qualunque parte — la wifi
     * di casa va benissimo — e il tunnel di stasera e' gia' in tasca.
     *
     * I nuovi vanno **davanti** ai vecchi e i vecchi non si buttano: un
     * indirizzo che oggi non c'e' potrebbe esserci domani (Tailscale acceso a
     * giorni alterni), e toglierlo vorrebbe dire ricominciare a perdere il PC.
     */
    fun ricordaBasi(context: Context, id: String, basi: List<String>) {
        val puliti = basi.map { it.trim().trimEnd('/') }.filter { it.isNotBlank() }
        if (puliti.isEmpty()) return
        val tutti = tutti(context)
        val chi = tutti.firstOrNull { it.id == id } ?: return
        val unite = (puliti + chi.basi).distinct().take(12)
        if (unite == chi.basi) return
        scrivi(context, tutti.map { if (it.id == id) it.copy(basi = unite) else it })
    }
}
