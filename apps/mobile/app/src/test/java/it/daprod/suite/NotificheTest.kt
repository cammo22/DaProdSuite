package it.daprod.suite

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Quali avvisi passano, e quali si possono rimandare.
 *
 * ## Perché una prova su due funzioni che guardano delle frasi
 *
 * Perché sono due decisioni, non due formattazioni, e si sbagliano nello stesso
 * modo: allargando. Il gateway scrive quattro messaggi per ogni lavoro — «nuova
 * richiesta», «l'ho accettata», «è partita», «è pronta» — e il telefono ne deve
 * mostrare **uno**. Chiesto il 5 settembre 2026: «su telefono solo una notifica
 * quando si riceve il lavoro».
 *
 * Il giorno che qualcuno aggiunge una parola al filtro per far passare una cosa
 * sua, ne passano altre tre che nessuno voleva — e non se ne accorge nessuno,
 * perché una notifica di troppo non rompe niente: dà solo fastidio, a chi non
 * sta guardando il codice. Qui invece diventa rossa.
 *
 * L'altra metà, dalla 1.2.4, è il tasto **«Rimanda»** dentro la notifica:
 * chiesto il 7 settembre 2026, «magari diciamo riprova tra poco e rimanda la
 * richiesta». Deve comparire sui lavori andati storti e su nient'altro — un
 * «rimanda» sotto a «è pronto» rifarebbe una cosa già fatta.
 */
class NotificheTest {

    @Test
    fun `un lavoro pronto vale la pena`() {
        assertTrue(Notifiche.valeLaPena("Cammo", "La tua foto è pronta"))
        assertTrue(Notifiche.valeLaPena("Cammo", "Il brano è pronto"))
    }

    @Test
    fun `i passaggi della fila non valgono la pena`() {
        assertFalse(Notifiche.valeLaPena("Cammo", "Nuova richiesta: una foto"))
        assertFalse(Notifiche.valeLaPena("Cammo", "L'ho accettata"))
        assertFalse(Notifiche.valeLaPena("Cammo", "È partita"))
        assertFalse(Notifiche.valeLaPena("Cammo", "È il tuo turno"))
        assertFalse(Notifiche.valeLaPena("Cammo", "È in fila, terza"))
    }

    @Test
    fun `una persona che ti scrive vale la pena`() {
        assertTrue(Notifiche.valeLaPena("Giulia", "ti ha mandato un pensiero"))
        assertTrue(Notifiche.valeLaPena("Giulia", "ha commentato la tua foto"))
    }

    @Test
    fun `un lavoro andato storto vale la pena`() {
        assertTrue(Notifiche.valeLaPena("Cammo", "«un faro» non è stata accettata: la fila è piena"))
        assertTrue(Notifiche.valeLaPena("Cammo", "Il video: non fatto"))
    }

    /**
     * ⚠ **Il tasto «Rimanda» solo dove ha senso.**
     *
     * Le due frasi sono le stesse che [Notifiche.valeLaPena] lascia passare per
     * i lavori storti, e non è una ripetizione da togliere: là si decide **se
     * dirlo**, qui **se offrire di rifarlo**. Il giorno che una delle due
     * cambia, l'altra non deve cambiare per forza.
     */
    @Test
    fun `si rimanda solo quello che e andato storto`() {
        assertTrue(Notifiche.siPuoRimandare("Cammo", "«un faro» non è stata accettata: la fila è piena"))
        assertTrue(Notifiche.siPuoRimandare("Cammo", "Il video: non fatto"))
    }

    @Test
    fun `non si rimanda un lavoro riuscito`() {
        assertFalse(Notifiche.siPuoRimandare("Cammo", "La tua foto è pronta"))
        assertFalse(Notifiche.siPuoRimandare("Giulia", "ti ha mandato un pensiero"))
        assertFalse(Notifiche.siPuoRimandare("Giulia", "ha commentato la tua foto"))
    }
}
