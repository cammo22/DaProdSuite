package it.daprod.suite.net

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Il cartello, dalla parte del telefono.
 *
 * Nato l'11 settembre 2026: il tunnel aveva cambiato nome, e l'app diceva «non
 * riesco a parlare col computer» con il computer acceso e raggiungibile sotto un
 * nome che lei non conosceva. Il computer adesso scrive i suoi indirizzi su un
 * cartello firmato, e qui si legge (vedi [Cartello]).
 *
 * ⚠ **Due lingue, una ricetta.** Il computer fa gli stessi conti in TypeScript
 * (`packages/gateway/src/cartello.ts`), e `apps/shell/scripts/prova-cartello.mjs`
 * usa questo stesso esempio con questi stessi numeri. Se una delle due ricette
 * cambia anche di un carattere, il telefono non riconosce piu' i cartelli del
 * computer — e se ne accorge la prova, non una persona fuori casa.
 */
class CartelloTest {

    private val chiave = "0123456789abcdef".repeat(4)
    private val pc = "pc_prova"
    private val quando = 1789000000000L
    private val basi = listOf("https://esempio-di-prova.trycloudflare.com")
    private val firma = "fb9e6bfcf81c6ba024c3dc356c002da2abac100e4d20466f87762579e2715f9b"

    @Test
    fun ilNomeDelCartelloEQuelloDelComputer() {
        assertEquals("daprod_26bdd02c63ce1387f3f0159598b97e12", Cartello.argomentoDi(chiave))
    }

    @Test
    fun laFirmaEQuellaDelComputer() {
        assertEquals(firma, Cartello.firmaDi(chiave, pc, quando, basi))
        assertTrue(Cartello.firmaValida(chiave, pc, quando, basi, firma.uppercase()))
    }

    /**
     * ⚠ **Chi indovinasse il nome del cartello non potrebbe scriverci un
     * indirizzo suo.** Con un'altra chiave, o con un indirizzo cambiato, la firma
     * non torna.
     */
    @Test
    fun unaFirmaDiUnAltroNonPassa() {
        assertFalse(Cartello.firmaValida("f".repeat(64), pc, quando, basi, firma))
        assertFalse(Cartello.firmaValida(chiave, pc, quando, listOf("https://ladro.example"), firma))
    }

    @Test
    fun unaRigaDellaBachecaSiLegge() {
        val letto = Cartello.leggiRiga(rigaDellaBacheca(firma), chiave)
        assertEquals(quando, letto?.first)
        assertEquals(basi, letto?.second)
    }

    /**
     * ⚠ **Questa riga non l'ho scritta io: l'ha mandata ntfy.sh.** L'11 settembre
     * 2026 il computer ha scritto il cartello dell'esempio sulla bacheca vera, e
     * questo è quello che la bacheca ha ridato indietro, copiato così com'era.
     * Se un giorno la bacheca cambia forma, si rifà il giro e si cambia qui.
     */
    @Test
    fun unaRigaVeraDiNtfySiLegge() {
        val vera = """{"id":"Qe0lNia6dhFp","time":1789151407,"expires":1789194607,"event":"message","topic":"daprod_26bdd02c63ce1387f3f0159598b97e12","message":"{\"v\":1,\"pc\":\"pc_prova\",\"quando\":1789000000000,\"basi\":[\"https://esempio-di-prova.trycloudflare.com\"],\"firma\":\"fb9e6bfcf81c6ba024c3dc356c002da2abac100e4d20466f87762579e2715f9b\"}"}"""
        val letto = Cartello.leggiRiga(vera, chiave)
        assertEquals(quando, letto?.first)
        assertEquals(basi, letto?.second)
        assertNull(Cartello.leggiRiga(vera, "f".repeat(64)))
    }

    @Test
    fun unaRigaConLaFirmaSbagliataSiButta() {
        assertNull(Cartello.leggiRiga(rigaDellaBacheca("00".repeat(32)), chiave))
    }

    @Test
    fun gliAltriEventiDellaBachecaSiSaltano() {
        assertNull(Cartello.leggiRiga("""{"id":"x","time":1,"event":"open","topic":"t"}""", chiave))
        assertNull(Cartello.leggiRiga("non e' json", chiave))
    }

    /**
     * Dal cartello si tengono solo indirizzi https: sono quelli da fuori. Un
     * indirizzo in chiaro, anche firmato, da una bacheca pubblica non si prende.
     */
    @Test
    fun dalCartelloSiTengonoSoloIndirizziHttps() {
        assertEquals(
            listOf("https://a.trycloudflare.com"),
            Cartello.daTenere(listOf("http://192.168.1.8:8790", "https://a.trycloudflare.com/", " https://a.trycloudflare.com")),
        )
    }

    /** Una riga come la manda ntfy.sh: l'evento, e dentro il cartello come testo. */
    private fun rigaDellaBacheca(conFirma: String): String {
        val cartello = JSONObject()
            .put("v", 1)
            .put("pc", pc)
            .put("quando", quando)
            .put("basi", JSONArray(basi))
            .put("firma", conFirma)
        return JSONObject()
            .put("id", "abc123")
            .put("time", quando / 1000)
            .put("event", "message")
            .put("topic", Cartello.argomentoDi(chiave))
            .put("message", cartello.toString())
            .toString()
    }
}
