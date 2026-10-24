package it.daprod.suite
import org.junit.Assert.*
import org.junit.Test
class AggiornamentiTest {
    @Test fun upgradeDallaSuiteNonERilevatoComeDowngrade(){assertTrue(Aggiornamenti.codice("2.0.0")>Aggiornamenti.codice("1.7.10"))}
    @Test fun versioneNonNumericaNonFaPartireUnInstallazione(){assertEquals(0L,Aggiornamenti.codice("2.0.0-beta"))}
    @Test fun ilConfrontoNonEAlfabetico(){assertTrue(Aggiornamenti.codice("2.10.0")>Aggiornamenti.codice("2.9.9"))}
}
