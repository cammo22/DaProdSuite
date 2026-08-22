package it.daprod.suite.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * Un'azione della suite, come la racconta il gateway.
 *
 * L'app **non sa** cosa la suite possa fare: lo chiede a `/azioni` e costruisce
 * i moduli da quello che arriva. È lo stesso elenco che vedono la console web
 * sul portatile e il server MCP, dichiarato una volta sola in `packages/azioni`.
 *
 * La conseguenza pratica: quando sul PC si aggiunge un'azione, sul telefono
 * compare da sola al prossimo collegamento. Non c'è una versione dell'app da
 * aggiornare per stare al passo con la suite.
 */
data class Azione(
    val id: String,
    val titolo: String,
    val descrizione: String,
    /** L'app che la esegue, o null se è la suite stessa. */
    val app: String?,
    /** true se occupa la scheda video e va approvata da chi sta al PC. */
    val coda: Boolean,
    val campi: List<Campo>,
) {
    override fun toString(): String = titolo

    /**
     * L'azione riscritta in JSON, per tenerla da parte.
     *
     * Serve a una cosa sola: **poter scrivere una richiesta con il PC spento.**
     * Il modulo nasce dalle azioni che la suite dichiara, e se il computer non
     * risponde non c'è nessuna azione da cui farlo nascere. Si ricorda l'ultima
     * risposta buona e la si rilegge da lì, che è quello che rende la coda
     * offline una cosa vera e non una lista di richieste che non si possono
     * scrivere. Vedi `Store.ricordaAzioni`.
     */
    fun aJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("titolo", titolo)
        .put("descrizione", descrizione)
        .put("app", app ?: JSONObject.NULL)
        .put("coda", coda)
        .put("campi", JSONArray().also { arr -> for (c in campi) arr.put(c.aJson()) })

    companion object {
        fun daJson(j: JSONObject): Azione {
            val campi = mutableListOf<Campo>()
            val arr = j.optJSONArray("campi")
            if (arr != null) {
                for (i in 0 until arr.length()) campi.add(Campo.daJson(arr.getJSONObject(i)))
            }
            return Azione(
                id = j.getString("id"),
                titolo = j.optString("titolo", j.getString("id")),
                descrizione = j.optString("descrizione", ""),
                app = j.optString("app").takeIf { it.isNotBlank() && it != "null" },
                coda = j.optBoolean("coda", false),
                campi = campi,
            )
        }
    }
}

/** Un campo da riempire. I tipi sono pochi apposta: devono bastare. */
data class Campo(
    val nome: String,
    val etichetta: String,
    val descrizione: String,
    /** "testo", "numero", "scelta", "booleano". */
    val tipo: String,
    val obbligatorio: Boolean,
    val scelte: List<String>,
    val min: Int?,
    val max: Int?,
    val maxLunghezza: Int?,
    val predefinito: String?,
    val esempio: String?,
) {
    /** Un campo lungo vuole più di una riga: è il prompt, non un numero. */
    val eLungo: Boolean
        get() = tipo == "testo" && (maxLunghezza ?: 0) > 200

    fun aJson(): JSONObject {
        val j = JSONObject()
            .put("nome", nome)
            .put("etichetta", etichetta)
            .put("descrizione", descrizione)
            .put("tipo", tipo)
            .put("obbligatorio", obbligatorio)
            .put("scelte", JSONArray().also { arr -> for (s in scelte) arr.put(s) })
        if (min != null) j.put("min", min)
        if (max != null) j.put("max", max)
        if (maxLunghezza != null) j.put("maxLunghezza", maxLunghezza)
        if (predefinito != null) j.put("predefinito", predefinito)
        if (esempio != null) j.put("esempio", esempio)
        return j
    }

    companion object {
        fun daJson(j: JSONObject): Campo {
            val scelte = mutableListOf<String>()
            j.optJSONArray("scelte")?.let { arr ->
                for (i in 0 until arr.length()) scelte.add(arr.getString(i))
            }
            return Campo(
                nome = j.getString("nome"),
                etichetta = j.optString("etichetta", j.getString("nome")),
                descrizione = j.optString("descrizione", ""),
                tipo = j.optString("tipo", "testo"),
                obbligatorio = j.optBoolean("obbligatorio", false),
                scelte = scelte,
                min = if (j.has("min")) j.optInt("min") else null,
                max = if (j.has("max")) j.optInt("max") else null,
                maxLunghezza = if (j.has("maxLunghezza")) j.optInt("maxLunghezza") else null,
                predefinito = if (j.has("predefinito")) j.get("predefinito").toString() else null,
                esempio = j.optString("esempio").takeIf { it.isNotBlank() },
            )
        }
    }
}
