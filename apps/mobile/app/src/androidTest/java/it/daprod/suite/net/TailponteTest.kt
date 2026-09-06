package it.daprod.suite.net

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * ⚠ **Che il ponte parta davvero**, dentro Android vero.
 *
 * E' l'unica prova di questo repository che **deve** girare su un telefono o
 * un emulatore, e c'e' una ragione precisa per cui non puo' stare con le altre.
 *
 * `tailponte` non e' Kotlin: e' un pezzo in Go compilato in una libreria
 * nativa. Tutto quello che si puo' sbagliare qui — la libreria per il
 * processore sbagliato, il `.aar` non finito dentro l'APK, `libgojni.so` che
 * non si carica, il runtime di Go che non parte — **non lo vede nessun
 * compilatore**. Si vede solo caricandola.
 *
 * E le prove sulla JVM non la caricherebbero mai: li' non c'e' un `System
 * .loadLibrary` che possa funzionare.
 *
 * Si lancia con l'emulatore acceso:
 *
 *     ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class TailponteTest {

    private val contesto = InstrumentationRegistry.getInstrumentation().targetContext

    /**
     * La prova che vale piu' di tutte: **la libreria si carica e il nodo
     * parte**.
     *
     * Non si controlla che entri nel tailnet — per entrarci serve l'account di
     * qualcuno, e una prova automatica non deve avere l'account di nessuno.
     * Si controlla quello che si puo': che chiamare il Go dall'app non faccia
     * cadere niente, e che il nodo arrivi a dire **qualcosa** di sensato.
     */
    @Test
    fun ilNodoParteEDiceComeSta() {
        val dove = File(contesto.cacheDir, "prova-tailscale-" + System.currentTimeMillis())
        dove.mkdirs()
        try {
            // Prima le schede di rete, come fa `Tailnet.accendi`: senza,
            // Android risponde «netlinkrib: permission denied» e non parte.
            tailponte.Tailponte.usaLeReti(ReteDelTelefono())
            tailponte.Tailponte.avvia(dove.absolutePath, "", "prova-daprod")

            /*
             * Senza chiave d'invito, un nodo nuovo puo' finire in due modi
             * soli: o gli hanno dato un indirizzo da aprire nel browser, o non
             * c'e' linea e c'e' un guaio scritto. Tutti e due vanno bene:
             * quello che si sta provando e' che **il Go gira**.
             */
            val url = tailponte.Tailponte.urlDiLogin()
            val guaio = tailponte.Tailponte.ultimoGuaio()
            assertTrue(
                "Il nodo non ha ne' un indirizzo di login ne' un guaio: url=" +
                    url + " guaio=" + guaio,
                url.isNotBlank() || guaio.isNotBlank(),
            )
            assertNotNull(tailponte.Tailponte.mioIndirizzo())
        } finally {
            try { tailponte.Tailponte.spegni() } catch (e: Throwable) { }
            dove.deleteRecursively()
        }
    }

    /**
     * Il buco non si apre se il nodo non c'e'.
     *
     * Sembra ovvio e non lo e': se `Apri` tornasse una porta buona con il nodo
     * spento, l'app ci punterebbe la WebView e chi guarda vedrebbe una pagina
     * bianca invece di «non raggiungibile» — cioe' un guasto travestito da
     * pagina vuota, che e' il modo peggiore di rompersi.
     */
    @Test
    fun colNodoSpentoNonSiApreNessunBuco() {
        try { tailponte.Tailponte.spegni() } catch (e: Throwable) { }
        var saltato = false
        try {
            tailponte.Tailponte.apri("100.88.254.19:8790")
        } catch (e: Exception) {
            saltato = true
        }
        assertTrue("Con il nodo spento Apri deve rifiutarsi", saltato)
    }
}
