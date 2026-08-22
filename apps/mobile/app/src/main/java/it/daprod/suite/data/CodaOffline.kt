package it.daprod.suite.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * La coda offline: le richieste scritte senza PC collegato.
 *
 * È la ragione per cui l'app serve anche quando il computer è spento. Scrivi
 * quello che vuoi mentre sei fuori, resta qui, e parte da sola appena il
 * gateway torna raggiungibile — che di solito è quando rientri in casa.
 *
 * Tiene l'**azione e i suoi valori**, non tipo/app/testo come la prima stesura:
 * così una voce in coda sopravvive anche se nel frattempo la suite ha imparato
 * a fare cose nuove, e riparte esattamente com'era stata scritta.
 */
class CodaOffline(context: Context) {
    private val prefs = context.getSharedPreferences("coda_offline", Context.MODE_PRIVATE)

    /** Una richiesta in attesa di partire (non ancora sul PC). */
    data class Voce(
        val id: String,
        val azione: String,
        val titolo: String,
        /** Il testo che si leggerà nella lista: il campo principale. */
        val testo: String,
        val valori: Map<String, String>,
        val quando: Long,
        /**
         * Di chi è, sullo stesso telefono.
         *
         * Serve da quando la coda parte **anche con l'app chiusa**: il lavoro
         * in background gira per tutte le persone del telefono, e una richiesta
         * scritta da uno non deve arrivare al PC a nome di un altro. Vuoto vuol
         * dire: scritta prima della 0.7.3, va a chi sta usando l'app.
         */
        val chi: String = "",
    )

    fun tutte(): List<Voce> {
        val grezzo = prefs.getString("voci", "[]") ?: "[]"
        return try {
            val arr = JSONArray(grezzo)
            (0 until arr.length()).map { i -> daJson(arr.getJSONObject(i)) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun aggiungi(
        azione: String,
        titolo: String,
        testo: String,
        valori: Map<String, String>,
        chi: String,
    ) {
        val quando = System.currentTimeMillis()
        val voce = Voce("offline-$quando", azione, titolo, testo, valori, quando, chi)
        salva(tutte() + voce)
    }

    /** Quelle di una persona, più quelle vecchie che non sanno di chi sono. */
    fun sue(chi: String): List<Voce> = tutte().filter { it.chi.isBlank() || it.chi == chi }

    fun rimuovi(voce: Voce) {
        salva(tutte().filterNot { it.id == voce.id })
    }

    fun svuota() = salva(emptyList())

    private fun salva(voci: List<Voce>) {
        val arr = JSONArray()
        for (v in voci) {
            val valori = JSONObject()
            for ((chiave, valore) in v.valori) valori.put(chiave, valore)
            arr.put(
                JSONObject()
                    .put("id", v.id)
                    .put("azione", v.azione)
                    .put("titolo", v.titolo)
                    .put("testo", v.testo)
                    .put("valori", valori)
                    .put("quando", v.quando)
                    .put("chi", v.chi),
            )
        }
        prefs.edit().putString("voci", arr.toString()).apply()
    }

    private fun daJson(j: JSONObject): Voce {
        val valori = mutableMapOf<String, String>()
        j.optJSONObject("valori")?.let { o ->
            for (chiave in o.keys()) valori[chiave] = o.getString(chiave)
        }
        val quando = j.optLong("quando")
        return Voce(
            id = j.optString("id", "offline-$quando"),
            azione = j.optString("azione", ""),
            titolo = j.optString("titolo", "Richiesta"),
            testo = j.optString("testo", ""),
            valori = valori,
            quando = quando,
            chi = j.optString("chi", ""),
        )
    }
}
