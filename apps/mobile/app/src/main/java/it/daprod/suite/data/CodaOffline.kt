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

    fun aggiungi(azione: String, titolo: String, testo: String, valori: Map<String, String>) {
        val quando = System.currentTimeMillis()
        val voce = Voce("offline-$quando", azione, titolo, testo, valori, quando)
        salva(tutte() + voce)
    }

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
                    .put("quando", v.quando),
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
        )
    }
}
