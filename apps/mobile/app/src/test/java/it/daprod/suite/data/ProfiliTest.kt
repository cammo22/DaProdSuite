package it.daprod.suite.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONArray
import org.json.JSONObject

/**
 * La forma di quello che tiene la chiave di casa.
 *
 * «Ad ogni aggiornamento devo eliminare e rifare l'account» è stato detto
 * **quattro volte**, e la richiesta che ha chiuso il giro è stata: «voglio
 * essere sicuro per il login, a prova di aggiornamenti».
 *
 * Le preferenze di Android non si possono provare senza Android — servirebbe
 * Robolectric, che è una dipendenza in più per una cosa che non è il cuore. Il
 * cuore è **come si legge e si scrive quel pezzo di JSON**, e quello si prova
 * qui: se un elenco scritto oggi si rilegge domani identico, la copia in un
 * secondo file fa il suo mestiere.
 *
 * ⚠ La regola che queste prove tengono ferma: **un profilo senza token non è un
 * profilo**. Se un giorno una scrittura a metà lasciasse un id senza chiave,
 * l'app lo mostrerebbe nell'elenco delle persone e chi lo tocca finirebbe su un
 * errore che non si spiega — invece che sulla schermata «Chi sei?», che almeno
 * dice cosa fare.
 */
class ProfiliTest {

    private fun comeScrive(profili: List<Profilo>): String {
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
                    .put("pcId", p.pcId)
                    .put("ultimoUso", p.ultimoUso),
            )
        }
        return arr.toString()
    }

    private val cammo = Profilo(
        id = "tel_prova",
        nome = "Cammo",
        base = "http://192.168.1.8:8790",
        basi = listOf("http://192.168.1.8:8790", "https://qualcosa.trycloudflare.com"),
        token = "a".repeat(64),
        ruolo = "admin",
        computer = "DAPRODMAIN",
        pcId = "pc_prova",
        ultimoUso = 1788700000000,
    )

    @Test
    fun `quello che si scrive si rilegge identico`() {
        val testo = comeScrive(listOf(cammo))
        val letto = Profili.perLaProva(testo)
        assertEquals(1, letto.size)
        assertEquals(cammo.token, letto[0].token)
        assertEquals(cammo.pcId, letto[0].pcId)
        assertEquals(cammo.basi, letto[0].basi)
        assertEquals(cammo.ruolo, letto[0].ruolo)
    }

    @Test
    fun `un testo che non si legge non fa cadere niente`() {
        assertTrue(Profili.perLaProva("{ questo non e' un elenco").isEmpty())
        assertTrue(Profili.perLaProva(null).isEmpty())
        assertTrue(Profili.perLaProva("").isEmpty())
    }

    /**
     * ⚠ Un profilo senza chiave non serve a niente e non deve comparire: chi lo
     * tocca finirebbe su un errore che non si spiega.
     */
    @Test
    fun `un profilo senza token si butta`() {
        val monco = JSONArray().put(JSONObject().put("id", "x").put("nome", "Rotto")).toString()
        assertTrue(Profili.perLaProva(monco).isEmpty())
    }

    @Test
    fun `l ultimo che ha usato l app sta per primo`() {
        val vecchio = cammo.copy(id = "vecchio", ultimoUso = 1)
        val nuovo = cammo.copy(id = "nuovo", ultimoUso = 999)
        val letto = Profili.perLaProva(comeScrive(listOf(vecchio, nuovo)))
        assertEquals("nuovo", letto[0].id)
    }
}
