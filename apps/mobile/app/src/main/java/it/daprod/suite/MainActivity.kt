package it.daprod.suite

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import it.daprod.suite.data.Azione
import it.daprod.suite.data.Campo
import it.daprod.suite.data.CodaOffline
import it.daprod.suite.data.Richiesta
import it.daprod.suite.data.Store
import it.daprod.suite.databinding.ActivityMainBinding
import it.daprod.suite.net.GatewayClient
import it.daprod.suite.net.GatewayException
import it.daprod.suite.ui.RichiesteAdapter
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * L'unica schermata dell'app.
 *
 * Fa tre cose, in quest'ordine: si collega a un PC, gli chiede qualcosa, e
 * mostra come vanno le richieste già mandate.
 *
 * Il modulo della richiesta **non è scritto qui**. I campi arrivano dalle
 * azioni che la suite dichiara (`/azioni`) e si costruiscono a runtime: è lo
 * stesso elenco che vedono la console web sul portatile e il server MCP. Quando
 * sul PC si aggiunge un'azione, qui compare da sola — senza una versione nuova
 * dell'app.
 */
private const val GIORNO = 24L * 60 * 60 * 1000

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: RichiesteAdapter
    private lateinit var codaOffline: CodaOffline

    /** Il client verso il PC: null finché non c'è un accoppiamento salvato. */
    private var client: GatewayClient? = null
    private var polling: Job? = null

    private var azioni: List<Azione> = emptyList()
    private var azioneScelta: Azione? = null

    /** Le richieste che stanno sul PC (senza quelle ancora in coda qui). */
    private var dalPc: List<Richiesta> = emptyList()

    /** L'ultima volta ha risposto? Serve solo alla riga di stato. */
    private var raggiungibile = false

    /** Lo scanner del QR: il contenuto è l'invito della suite. */
    private val scannerQr = registerForActivityResult(ScanContract()) { risultato ->
        val contenuto = risultato.contents ?: return@registerForActivityResult
        val host = estraiHost(contenuto)
        val codice = estraiCodice(contenuto)
        if (host != null && codice != null) {
            Store.ricordaHost(this, host)
            connetti(host, codice)
        } else {
            avvisa("Questo QR non è un invito della suite.")
        }
    }

    private val chiediCamera =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { concesso ->
            if (concesso) scannerQr.launch(opzioniScan())
            else avvisa("Senza la camera non posso inquadrare il QR. Puoi sempre scrivere il codice.")
        }

    /**
     * Il permesso delle notifiche.
     *
     * Da Android 13 va chiesto, e senza non compare niente. La prima stesura il
     * canale lo creava e le notifiche le costruiva, ma non lo chiedeva mai: il
     * telefono le buttava via in silenzio, che per una funzione il cui unico
     * scopo è avvisare ore dopo è il modo peggiore di non funzionare.
     */
    private val chiediNotifiche =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        codaOffline = CodaOffline(this)
        adapter = RichiesteAdapter(mutableListOf()) { scaricaRisultato(it) }
        binding.listaRichieste.adapter = adapter
        binding.listaRichieste.layoutManager = LinearLayoutManager(this)

        Notifiche.creaCanale(this)
        SyncWorker.programma(this)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            chiediNotifiche.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        binding.btnConnetti.setOnClickListener { connettiDaCodice() }
        binding.btnScansiona.setOnClickListener { apriScanner() }
        binding.btnManda.setOnClickListener { manda() }
        binding.btnScollega.setOnClickListener { chiediScollega() }

        binding.spinnerAzione.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, posizione: Int, id: Long) {
                azioni.getOrNull(posizione)?.let { disegnaCampi(it) }
            }

            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        binding.bottomBar.setOnItemSelectedListener { voce ->
            when (voce.itemId) {
                R.id.nav_stato -> mostraStato()
                R.id.nav_aggiorna -> cercaAggiornamento(dilloSempre = true)
                else -> rinfresca()
            }
            true
        }

        // Un giro all'avvio, ma non più di uno al giorno e in silenzio se non
        // c'è niente: è l'unica cosa che questa app manda fuori dalla tua rete,
        // e non deve diventare un pettegolezzo continuo.
        if (System.currentTimeMillis() - Store.ultimoControlloAgg(this) > GIORNO) {
            cercaAggiornamento(dilloSempre = false)
        }

        // Se c'è un accoppiamento salvato, riparte da lì.
        val token = Store.token(this)
        val host = Store.host(this)
        if (token != null && host != null) {
            client = GatewayClient(host, token)
            entra()
        }
        mostraCoda()
        aggiornaTestata()
    }

    override fun onResume() {
        super.onResume()
        // Tornare sull'app è il momento in cui si vuole sapere com'è andata:
        // si rilegge subito, senza aspettare il giro del polling.
        if (client != null) rinfresca()
    }

    /* ---------------------------------------------------- accoppiamento */

    private fun apriScanner() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            scannerQr.launch(opzioniScan())
        } else {
            chiediCamera.launch(Manifest.permission.CAMERA)
        }
    }

    private fun opzioniScan(): ScanOptions = ScanOptions().apply {
        setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        setPrompt("Inquadra il QR sullo schermo del PC")
        setBeepEnabled(false)
        setOrientationLocked(false)
    }

    private fun connettiDaCodice() {
        val codice = binding.campoCodice.text.toString().trim()
        if (codice.length != 8 || !codice.all { it.isDigit() }) {
            avvisa("Il codice è di otto cifre.")
            return
        }
        val host = Store.host(this)
        if (host == null) {
            avvisa("Non so ancora a quale computer bussare: la prima volta inquadra il QR.")
            return
        }
        connetti(host, codice)
    }

    private fun connetti(host: String, codice: String) {
        lifecycleScope.launch {
            try {
                val esito = GatewayClient.accoppia(host, codice, Store.nome(this@MainActivity))
                Store.salvaAccoppiamento(
                    this@MainActivity,
                    host = host,
                    token = esito.token,
                    nome = Store.nome(this@MainActivity),
                    computer = esito.computer,
                    ruolo = esito.ruolo,
                )
                client = GatewayClient(host, esito.token)
                binding.campoCodice.text?.clear()
                entra()
                avvisa("Collegato a ${esito.computer}.")
            } catch (e: Exception) {
                avvisa(spiega(e))
            }
        }
    }

    private fun chiediScollega() {
        AlertDialog.Builder(this)
            .setTitle("Scollegare questo telefono?")
            .setMessage(
                "Il telefono si scorda il PC. Nell'elenco della suite resta finché non lo togli anche da lì, dal pannello «Da fuori».",
            )
            .setPositiveButton("Scollega") { _, _ ->
                Store.scollega(this)
                client = null
                polling?.cancel()
                azioni = emptyList()
                dalPc = emptyList()
                raggiungibile = false
                binding.schedaAccoppiamento.visibility = View.VISIBLE
                binding.schedaRichiesta.visibility = View.GONE
                binding.btnScollega.visibility = View.GONE
                mostraCoda()
                aggiornaTestata()
            }
            .setNegativeButton("Lascia stare", null)
            .show()
    }

    /** Dal contenuto del QR (JSON o URL) tira fuori indirizzo e codice. */
    private fun estraiHost(contenuto: String): String? {
        val host = Regex("\"host\"\\s*:\\s*\"([^\"]+)\"").find(contenuto)?.groupValues?.get(1)
            ?: Regex("host=([^&]+)").find(contenuto)?.groupValues?.get(1)
        return host?.trim()?.trimEnd('/')?.takeIf { it.isNotBlank() }
    }

    private fun estraiCodice(contenuto: String): String? =
        (Regex("\"codice\"\\s*:\\s*\"([^\"]+)\"").find(contenuto)?.groupValues?.get(1)
            ?: Regex("codice=([^&]+)").find(contenuto)?.groupValues?.get(1))
            ?.takeIf { it.length == 8 && it.all(Char::isDigit) }

    /* -------------------------------------------------------- le azioni */

    /** Entrati: si chiedono le azioni, si legge la fila, e si parte a guardare. */
    private fun entra() {
        binding.schedaAccoppiamento.visibility = View.GONE
        binding.btnScollega.visibility = View.VISIBLE
        caricaAzioni()
        rinfresca()
        avviaPolling()
    }

    private fun caricaAzioni() {
        val cl = client ?: return
        lifecycleScope.launch {
            try {
                // Le azioni che vanno in fila sono quelle che una persona vuole
                // chiedere da qui. Le altre (leggere la libreria, decidere) sono
                // roba da console e da agenti: metterle in un menu del telefono
                // vorrebbe dire far scegliere fra nove voci per arrivare a due.
                azioni = cl.azioni().filter { it.coda }
                if (azioni.isEmpty()) return@launch
                binding.spinnerAzione.adapter = ArrayAdapter(
                    this@MainActivity,
                    android.R.layout.simple_spinner_dropdown_item,
                    azioni.map { it.titolo },
                )
                binding.schedaRichiesta.visibility = View.VISIBLE
                disegnaCampi(azioni.first())
            } catch (_: Exception) {
                // Senza azioni non si può chiedere niente, ma la coda offline
                // già scritta resta e si vede lo stesso.
                binding.schedaRichiesta.visibility = if (azioni.isEmpty()) View.GONE else View.VISIBLE
            }
        }
    }

    /**
     * Costruisce il modulo di un'azione.
     *
     * Un campo per riga: etichetta, controllo, e la sua spiegazione sotto. I
     * tipi sono quattro e bastano — testo, numero, scelta, sì/no.
     */
    private fun disegnaCampi(azione: Azione) {
        azioneScelta = azione
        binding.descrizioneAzione.text = azione.descrizione
        val contenitore = binding.campiAzione
        contenitore.removeAllViews()

        for (campo in azione.campi) {
            contenitore.addView(etichetta(campo.etichetta + if (campo.obbligatorio) " *" else ""))
            contenitore.addView(controllo(campo).also { it.tag = campo.nome })
            if (campo.descrizione.isNotBlank()) contenitore.addView(nota(campo.descrizione))
        }
    }

    private fun etichetta(testo: String): TextView = TextView(this).apply {
        text = testo
        setTextColor(getColor(R.color.testo_debole))
        textSize = 13f
        layoutParams = margini(top = 12)
    }

    private fun nota(testo: String): TextView = TextView(this).apply {
        text = testo
        setTextColor(getColor(R.color.testo_debole))
        textSize = 11f
        layoutParams = margini(top = 3)
    }

    private fun controllo(campo: Campo): View = when {
        campo.tipo == "scelta" -> Spinner(this).apply {
            val voci = (if (campo.obbligatorio) emptyList() else listOf("—")) + campo.scelte
            adapter = ArrayAdapter(
                this@MainActivity,
                android.R.layout.simple_spinner_dropdown_item,
                voci,
            )
            layoutParams = margini(top = 4)
        }

        campo.tipo == "numero" -> EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            setText(campo.predefinito ?: "")
            applicaStile(campo)
        }

        campo.eLungo -> EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            minLines = 3
            setText(campo.predefinito ?: "")
            applicaStile(campo)
        }

        else -> EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT
            setText(campo.predefinito ?: "")
            applicaStile(campo)
        }
    }

    private fun EditText.applicaStile(campo: Campo) {
        hint = campo.esempio ?: ""
        setTextColor(getColor(R.color.testo))
        setHintTextColor(getColor(R.color.testo_debole))
        importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
        layoutParams = margini(top = 4)
    }

    private fun margini(top: Int): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = (top * resources.displayMetrics.density).toInt() }

    /** Quel che l'utente ha scritto, campo per campo. */
    private fun valoriDelModulo(azione: Azione): Map<String, String> {
        val valori = mutableMapOf<String, String>()
        for (i in 0 until binding.campiAzione.childCount) {
            val vista = binding.campiAzione.getChildAt(i)
            val nome = vista.tag as? String ?: continue
            val valore = when (vista) {
                is EditText -> vista.text.toString().trim()
                is Spinner -> vista.selectedItem?.toString()?.takeIf { it != "—" } ?: ""
                else -> ""
            }
            if (valore.isNotBlank()) valori[nome] = valore
        }
        return valori
    }

    /* ------------------------------------------------------- mandare */

    private fun manda() {
        val azione = azioneScelta ?: return
        val valori = valoriDelModulo(azione)

        // Il controllo vero lo fa il gateway, che è l'unico posto dove le regole
        // stanno scritte una volta sola. Qui si guarda solo l'ovvio, per non far
        // fare un giro di rete a una richiesta vuota.
        val mancante = azione.campi.firstOrNull { it.obbligatorio && valori[it.nome].isNullOrBlank() }
        if (mancante != null) {
            avvisa("Manca «${mancante.etichetta}».")
            return
        }

        val principale = valori[azione.campi.firstOrNull { it.obbligatorio }?.nome] ?: azione.titolo
        val cl = client

        if (cl == null) {
            codaOffline.aggiungi(azione.id, azione.titolo, principale, valori)
            svuotaModulo()
            mostraCoda()
            avvisa(getString(R.string.salvata_in_coda))
            return
        }

        binding.btnManda.isEnabled = false
        lifecycleScope.launch {
            try {
                cl.eseguiAzione(azione.id, valori)
                svuotaModulo()
                avvisa(getString(R.string.in_fila))
                rinfresca()
            } catch (e: GatewayException) {
                // Il gateway ha risposto e ha detto di no: rimandarla non
                // servirebbe. Si dice il perché, che è già in italiano.
                avvisa(e.message ?: "Il PC ha rifiutato la richiesta.")
            } catch (e: Exception) {
                // La rete è caduta proprio adesso: in coda, come se fossimo
                // stati offline dall'inizio.
                codaOffline.aggiungi(azione.id, azione.titolo, principale, valori)
                svuotaModulo()
                mostraCoda()
                avvisa(getString(R.string.salvata_in_coda))
            } finally {
                binding.btnManda.isEnabled = true
            }
        }
    }

    private fun svuotaModulo() {
        azioneScelta?.let { disegnaCampi(it) }
    }

    /* ------------------------------------------------------- la fila */

    private fun rinfresca() {
        val cl = client ?: return
        lifecycleScope.launch {
            try {
                dalPc = cl.richieste()
                raggiungibile = true
                mandaLaCoda(cl)
            } catch (_: Exception) {
                raggiungibile = false
            }
            mostraCoda()
            aggiornaTestata()
        }
    }

    /**
     * La coda offline parte, una voce per volta.
     *
     * Al primo errore ci si ferma: se il PC se n'è andato di nuovo, insistere
     * sulle altre vorrebbe dire una decina di timeout in fila e un'app che
     * sembra piantata.
     */
    private suspend fun mandaLaCoda(cl: GatewayClient) {
        var partitaQualcuna = false
        for (voce in codaOffline.tutte()) {
            try {
                cl.eseguiAzione(voce.azione, voce.valori)
                codaOffline.rimuovi(voce)
                partitaQualcuna = true
            } catch (e: GatewayException) {
                // Il PC l'ha rifiutata: tenerla in coda per sempre non aiuta
                // nessuno. Si toglie e si dice perché.
                codaOffline.rimuovi(voce)
                avvisa("«${voce.titolo}» non è stata accettata: ${e.message}")
            } catch (_: Exception) {
                break
            }
        }
        if (partitaQualcuna) {
            runCatching { dalPc = cl.richieste() }
            avvisa("Quello che avevi scritto senza PC è partito.")
        }
    }

    /** Le voci ancora sul telefono in cima, poi quelle che stanno sul PC. */
    private fun mostraCoda() {
        val offline = codaOffline.tutte().map { Richiesta.daCoda(it) }
        val tutte = offline + dalPc
        adapter.sostituisci(tutte)
        binding.codaVuota.visibility = if (tutte.isEmpty()) View.VISIBLE else View.GONE
    }

    /* --------------------------------------------------------- scaricare */

    private fun scaricaRisultato(richiesta: Richiesta) {
        val cl = client ?: return avvisa("Serve il PC collegato per scaricarlo.")
        val nome = richiesta.risultatoNome ?: return
        avvisa("Lo sto scaricando…")
        lifecycleScope.launch {
            try {
                val byte = cl.scaricaRisultato(nome)
                val dove = Scarica.salva(
                    this@MainActivity,
                    nome,
                    richiesta.risultatoMime ?: "application/octet-stream",
                    byte,
                )
                avvisa("Salvato in $dove.")
            } catch (e: Exception) {
                avvisa(spiega(e))
            }
        }
    }

    /* ------------------------------------------------------------- polling */

    /**
     * Ogni venti secondi, finché l'app è davanti.
     *
     * Con l'app chiusa il lavoro lo fa `SyncWorker`, che passa ogni quarto d'ora:
     * è lui che porta la notifica ore dopo. Questo qui serve solo a chi sta
     * guardando lo schermo mentre il PC lavora.
     */
    private fun avviaPolling() {
        polling?.cancel()
        polling = lifecycleScope.launch {
            while (isActive) {
                delay(20_000)
                rinfresca()
                controllaNotifiche()
            }
        }
    }

    private fun controllaNotifiche() {
        val cl = client ?: return
        lifecycleScope.launch {
            try {
                for ((id, testo) in cl.notificheNonLette()) {
                    Notifiche.mostra(this@MainActivity, getString(R.string.app_name), testo)
                    cl.segnaNotificaLetta(id)
                }
            } catch (_: Exception) {
                // Offline: al giro dopo.
            }
        }
    }

    /* ------------------------------------------------- aggiornare l'app */

    /**
     * Cerca una versione nuova.
     *
     * `dilloSempre` è la differenza fra il giro automatico e il tasto: premendo
     * **Aggiorna** si vuole una risposta comunque, anche «sei già a posto»;
     * all'avvio no, o sarebbe un messaggio a ogni apertura.
     */
    private fun cercaAggiornamento(dilloSempre: Boolean) {
        if (dilloSempre) avvisa(getString(R.string.agg_cerco))
        lifecycleScope.launch {
            Store.segnaControlloAgg(this@MainActivity)
            when (val esito = Aggiornamenti.cerca(this@MainActivity)) {
                is Aggiornamenti.Esito.GiaAggiornata -> {
                    binding.bannerAggiornamento.visibility = View.GONE
                    if (dilloSempre) avvisa(getString(R.string.agg_a_posto, esito.versione))
                }

                is Aggiornamenti.Esito.NonSiSa ->
                    if (dilloSempre) avvisa(esito.perche)

                is Aggiornamenti.Esito.CeNeUnaNuova -> {
                    binding.bannerAggiornamento.text = getString(R.string.agg_banner, esito.versione)
                    binding.bannerAggiornamento.visibility = View.VISIBLE
                    binding.bannerAggiornamento.setOnClickListener { proponi(esito) }
                    if (dilloSempre) proponi(esito)
                }
            }
            binding.bottomBar.selectedItemId = R.id.nav_richieste
        }
    }

    private fun proponi(nuova: Aggiornamenti.Esito.CeNeUnaNuova) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.agg_trovata, nuova.versione))
            .setMessage(
                buildString {
                    append(nuova.note.ifBlank { "Una versione nuova dell'app." })
                    append("\n\n")
                    append(pesa(nuova.bytes))
                },
            )
            .setPositiveButton(R.string.agg_scarica) { _, _ -> scarica(nuova) }
            .setNegativeButton(R.string.agg_dopo, null)
            .show()
    }

    private fun scarica(nuova: Aggiornamenti.Esito.CeNeUnaNuova) {
        // Il permesso si chiede **prima** di scaricare sei megabyte, non dopo.
        if (!Aggiornamenti.puoInstallare(this)) {
            AlertDialog.Builder(this)
                .setMessage(R.string.agg_permesso)
                .setPositiveButton(R.string.agg_vai) { _, _ ->
                    Aggiornamenti.chiediDiPoterInstallare(this)
                }
                .setNegativeButton(R.string.agg_dopo, null)
                .show()
            return
        }
        avvisa("Scarico la ${nuova.versione}…")
        lifecycleScope.launch {
            try {
                var ultimoDetto = 0
                Aggiornamenti.scaricaEInstalla(this@MainActivity, nuova) { percento ->
                    // Un avviso ogni quarto, non cento: sarebbero cento toast.
                    if (percento >= ultimoDetto + 25 && percento < 100) {
                        ultimoDetto = percento
                        runOnUiThread { avvisa("$percento%") }
                    }
                }
            } catch (e: Exception) {
                avvisa(e.message ?: "Non sono riuscito a scaricarla.")
            }
        }
    }

    private fun pesa(b: Long): String = when {
        b >= 1_048_576 -> String.format(java.util.Locale.ITALIAN, "%.1f MB", b / 1_048_576.0)
        b > 0 -> "${b / 1024} KB"
        else -> ""
    }

    /* ------------------------------------------------------------- lo stato */

    private fun aggiornaTestata() {
        val computer = Store.computer(this)
        binding.statoConnessione.text = when {
            client == null -> getString(R.string.stato_offline)
            !raggiungibile -> "${computer ?: Store.host(this)}: ${getString(R.string.stato_non_raggiungibile)}"
            else -> "${getString(R.string.stato_online)} ${computer ?: Store.host(this)}"
        }
    }

    private fun mostraStato() {
        val inCoda = codaOffline.tutte().size
        val messaggio = buildString {
            appendLine("Computer: ${Store.computer(this@MainActivity) ?: "nessuno"}")
            appendLine("Indirizzo: ${Store.host(this@MainActivity) ?: "—"}")
            appendLine("Questo telefono: ${Store.nome(this@MainActivity)}")
            appendLine("Ruolo: ${if (Store.ePadrone(this@MainActivity)) "padrone" else "ospite"}")
            appendLine("Versione dell'app: ${Aggiornamenti.versioneInstallata(this@MainActivity)}")
            appendLine()
            appendLine(if (raggiungibile) "Il PC risponde." else "Il PC non risponde adesso.")
            if (inCoda > 0) appendLine("$inCoda richieste aspettano qui sul telefono.")
        }
        AlertDialog.Builder(this)
            .setTitle("Come siamo messi")
            .setMessage(messaggio)
            .setPositiveButton("Va bene", null)
            .show()
        binding.bottomBar.selectedItemId = R.id.nav_richieste
    }

    /** Il messaggio del gateway se c'è, altrimenti quello che serve sapere. */
    private fun spiega(e: Exception): String =
        (e as? GatewayException)?.message
            ?: "Non riesco a raggiungere il PC. È acceso, con la suite aperta e l'accesso «Da fuori» acceso?"

    private fun avvisa(testo: String) {
        Toast.makeText(this, testo, Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        polling?.cancel()
    }
}
