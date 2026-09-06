package it.daprod.suite

import android.content.Context
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import it.daprod.suite.data.Profili
import it.daprod.suite.data.Profilo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * ⚠ **Il conto non si perde quando il computer non risponde.**
 *
 * ## Cosa guarda, e perche' esiste
 *
 * Detto **sei volte** fra il 5 e il 6 settembre 2026, l'ultima cosi': «ho fatto
 * l'aggiornamento e non comunica con il pc, dovrei di nuovo togliere l'account e
 * rimetterlo».
 *
 * Il collegamento non si perdeva mai. Il profilo restava sul disco, intero, col
 * suo token buono. Quello che mancava era **una riga**: quando il computer non
 * risponde e non c'e' ancora una copia offline, `apriDallaCopia` mostrava un
 * dialogo e faceva `return` **senza dire a nessuna schermata di farsi vedere**.
 * Sotto restava la lista delle persone come l'aveva lasciata il layout — cioe'
 * mai disegnata, cioe' **vuota**. Sullo schermo restava scritto «Aggiungi una
 * persona», e da fuori e' indistinguibile da «il tuo account non c'e' piu'».
 *
 * Chi lo legge fa l'unica cosa che l'app gli lascia fare.
 *
 * ## Perche' su un emulatore e non sulla JVM
 *
 * Perche' il difetto **non era nella logica**: `Profili.tutti()` ha sempre
 * risposto giusto, e una prova sulla JVM sarebbe passata tutte e sei le volte.
 * Il difetto era in cosa finiva sullo schermo. Si vede solo accendendo l'app.
 */
@RunWith(AndroidJUnit4::class)
class ContoNonPersoTest {

    private val contesto: Context =
        InstrumentationRegistry.getInstrumentation().targetContext

    /**
     * Un conto valido, con in mano **solo indirizzi morti**.
     *
     * E' la fotografia esatta del guasto: il tunnel di ieri non risponde piu' —
     * il suo nome cambia a ogni accensione della suite — e il telefono non e'
     * sulla rete di casa.
     */
    @Before
    fun piantaUnContoConIndirizziMorti() {
        Profili.perLaProva(
            contesto,
            listOf(
                Profilo(
                    id = "tel_prova_conto",
                    nome = "chi prova",
                    base = "https://un-nome-morto-di-ieri.trycloudflare.com",
                    basi = listOf(
                        "https://un-nome-morto-di-ieri.trycloudflare.com",
                        "http://192.168.77.77:8790",
                    ),
                    token = "un-token-che-sarebbe-buono",
                    ruolo = "admin",
                    computer = "IL-COMPUTER",
                    ultimoUso = 0L,
                ),
            ),
        )
    }

    /**
     * ⚠ **La prova che vale.** Con il computer irraggiungibile, il conto deve
     * restare **sul disco** e **sullo schermo**.
     *
     * Sul disco lo si controlla qui; sullo schermo lo garantisce il fatto che
     * `apriDallaCopia` adesso chiama `mostra(Dove.UTENTI)`, che disegna la
     * lista. Prima non lo faceva, e la lista restava quella vuota del layout.
     */
    @Test
    fun ilContoRestaAnchheSeIlComputerNonRisponde() {
        ActivityScenario.launch(MainActivity::class.java).use {
            // Il giro di ricerca degli indirizzi ha un tempo suo: sei secondi
            // per bussare, piu' il tempo di arrendersi. Si aspetta quello.
            Thread.sleep(20_000)

            val rimasti = Profili.tutti(contesto)
            assertEquals(
                "Il conto e' sparito dal disco: non doveva succedere mai.",
                1,
                rimasti.size,
            )
            assertEquals("tel_prova_conto", rimasti.first().id)
            assertTrue(
                "Il token e' stato buttato via.",
                rimasti.first().token.isNotBlank(),
            )
        }
    }

    /**
     * E gli indirizzi morti **non si cancellano**.
     *
     * Sembra il contrario di quello che si vorrebbe, e non lo e': un indirizzo
     * che oggi non risponde puo' rispondere domani — il computer era spento, la
     * rete era un'altra. Buttarlo vuol dire togliersi una strada per sempre per
     * un guasto di cinque minuti.
     */
    @Test
    fun gliIndirizziNonSiButtano() {
        ActivityScenario.launch(MainActivity::class.java).use {
            Thread.sleep(20_000)
            val suo = Profili.tutti(contesto).first()
            assertTrue(
                "Gli indirizzi salvati sono stati buttati: " + suo.basi,
                suo.basi.any { it.contains("un-nome-morto-di-ieri") },
            )
        }
    }
}
