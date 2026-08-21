package it.daprod.suite.data

import org.json.JSONObject

/** Una richiesta di lavoro, come la vede il telefono. */
data class Richiesta(
    val id: String,
    val tipo: String,
    val app: String,
    val testo: String,
    val daNome: String,
    val stato: String,
    val quando: Long,
    val motivoScarto: String? = null,
    val risultatoNome: String? = null,
    val risultatoBytes: Long = 0,
    /** Il mime del risultato: serve a salvarlo nel posto giusto del telefono. */
    val risultatoMime: String? = null,
    /** true per le voci che stanno ancora sul telefono e non sono mai partite. */
    val eOffline: Boolean = false,
) {
    /** C'è un file pronto da portarsi via. */
    val eScaricabile: Boolean
        get() = stato == "pronta" && !risultatoNome.isNullOrBlank()

    val etichettaStato: String
        get() = when {
            eOffline -> "sul telefono"
            stato == "in-attesa" -> "in attesa"
            stato == "accettata" -> "accettata"
            stato == "in-lavoro" -> "in lavorazione"
            stato == "pronta" -> "pronta ⬇"
            stato == "scartata" -> "scartata"
            stato == "scaduta" -> "scaduta"
            else -> stato
        }

    companion object {
        fun daJson(j: JSONObject): Richiesta {
            val risultato = j.optJSONObject("risultato")
            return Richiesta(
                id = j.getString("id"),
                tipo = j.optString("tipo", "testo"),
                app = j.optString("app", "suite"),
                testo = j.optString("testo", ""),
                daNome = j.optString("daNome", "telefono"),
                stato = j.optString("stato", "in-attesa"),
                quando = j.optLong("quando", 0L),
                motivoScarto = j.optString("motivoScarto").takeIf { it.isNotBlank() },
                risultatoNome = risultato?.optString("nome")?.takeIf { it.isNotBlank() },
                risultatoBytes = risultato?.optLong("bytes") ?: 0,
                risultatoMime = risultato?.optString("tipo")?.takeIf { it.isNotBlank() },
            )
        }

        /** Una voce della coda offline, mostrata insieme alle richieste vere. */
        fun daCoda(voce: CodaOffline.Voce): Richiesta = Richiesta(
            id = voce.id,
            tipo = voce.titolo,
            app = "in attesa di partire",
            testo = voce.testo,
            daNome = "questo telefono",
            stato = "in-attesa",
            quando = voce.quando,
            eOffline = true,
        )
    }
}
