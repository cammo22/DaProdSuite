package it.daprod.suite.net

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Le prove del magazzino delle foto.
 *
 * Nato il 12 settembre 2026: «carica le foto una alla volta e con connessioni
 * lente si deve aspettare; facciamo che le scarica e una volta scaricate
 * vengono salvate sulla memoria del telefono».
 *
 * Qui si prova soprattutto **cosa non deve entrarci**: un video, una foto
 * enorme, una richiesta che non e' una faccia. Un magazzino che si riempie di
 * cose sbagliate e' peggio di nessun magazzino — butta le foto vere per far
 * posto a un brano che comunque non si puo' servire da qui.
 */
class MagazzinoTest {

    private val cartella = File(System.getProperty("java.io.tmpdir"), "magazzino-prova-" + System.nanoTime())

    @After
    fun pulisci() {
        cartella.deleteRecursively()
    }

    @Test
    fun quelloCheSiMetteSiRitrova() {
        val m = Magazzino(cartella)
        assertNull("all'inizio non c'e' niente", m.ce("/libreria/anteprima/uno"))
        m.metti("/libreria/anteprima/uno", "image/png", byteArrayOf(1, 2, 3))
        val roba = m.ce("/libreria/anteprima/uno")
        assertNotNull(roba)
        assertEquals("image/png", roba?.tipo)
        assertEquals(3L, roba?.file?.length())
    }

    /** Il tipo arriva col suo contorno: `image/jpeg; charset=binary`. Si tiene il tipo. */
    @Test
    fun ilTipoSiPulisce() {
        val m = Magazzino(cartella)
        m.metti("/libreria/anteprima/due", "image/jpeg; charset=binary", byteArrayOf(9))
        assertEquals("image/jpeg", m.ce("/libreria/anteprima/due")?.tipo)
    }

    /**
     * ⚠ **La chiave e' il percorso, non l'indirizzo.** Il tunnel cambia nome a
     * ogni riavvio: se la chiave fosse l'indirizzo intero, il giorno dopo il
     * magazzino sarebbe da buttare.
     */
    @Test
    fun laChiaveNonHaLIndirizzo() {
        assertEquals("/libreria/anteprima/x", Magazzino.chiaveDi("/libreria/anteprima/x", null))
        assertEquals("/io/foto/a?v=2", Magazzino.chiaveDi("/io/foto/a", "v=2"))
    }

    @Test
    fun siTengonoLeFacceENonIBrani() {
        assertTrue(Magazzino.siTiene("/libreria/anteprima/x", null))
        assertTrue(Magazzino.siTiene("/io/foto/pippo", null))
        assertTrue(Magazzino.siTiene("/libreria/file/x", "image/avif,image/webp,*/*;q=0.8"))
        assertFalse("un brano si ascolta saltando avanti: non passa da qui", Magazzino.siTiene("/libreria/file/x", "*/*"))
        assertFalse(Magazzino.siTiene("/giochi", null))
        assertFalse(Magazzino.siTiene("/stato/stream", "image/png"))
    }

    @Test
    fun unaCosaTroppoGrossaNonEntra() {
        val m = Magazzino(cartella)
        assertNull(m.metti("/libreria/file/enorme", "image/png", ByteArray(Magazzino.MASSIMO_UN_FILE + 1)))
        assertNull(m.ce("/libreria/file/enorme"))
        assertNull("e nemmeno una risposta vuota", m.metti("/libreria/anteprima/vuota", "image/png", ByteArray(0)))
    }

    /**
     * Quando e' pieno butta i piu' vecchi, non tutto: chi ha appena guardato una
     * foto se la ritrova, e chi la guardo' la settimana scorsa la riscarica.
     */
    @Test
    fun quandoEPienoButtaIPiuVecchi() {
        val m = Magazzino(cartella, quantoTiene = 1000)
        for (i in 1..6) {
            m.metti("/libreria/anteprima/$i", "image/png", ByteArray(200))
            // Le date sul disco hanno il secondo: senza questo sarebbero tutte uguali.
            m.ce("/libreria/anteprima/$i")?.file?.setLastModified(1_000_000L + i * 60_000L)
        }
        assertTrue("sotto il tetto", m.quanto() <= 1000)
        assertNotNull("l'ultima c'e'", m.ce("/libreria/anteprima/6"))
        assertNull("la prima e' stata buttata", m.ce("/libreria/anteprima/1"))
    }

    @Test
    fun svuotaButtaTutto() {
        val m = Magazzino(cartella)
        m.metti("/libreria/anteprima/uno", "image/png", byteArrayOf(1))
        m.svuota()
        assertEquals(0, m.quanto())
        assertNull(m.ce("/libreria/anteprima/uno"))
    }
}
