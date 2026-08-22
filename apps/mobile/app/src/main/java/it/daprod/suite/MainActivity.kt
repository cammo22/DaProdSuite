package it.daprod.suite

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
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
import it.daprod.suite.data.Profili
import it.daprod.suite.data.Profilo
import it.daprod.suite.data.Richiesta
import it.daprod.suite.data.Store
import it.daprod.suite.databinding.ActivityMainBinding
import it.daprod.suite.net.Accoppiamento
import it.daprod.suite.net.GatewayClient
import it.daprod.suite.net.Indirizzi
import it.daprod.suite.net.GatewayException
import it.daprod.suite.ui.RichiesteAdapter
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.util.UUID

/**
 * L'app, che è un vetro sul PC.
 *
 * **Cosa è cambiato nella 0.6.0, e perché.** Fino alla 0.5.2 questa era una
 * schermata sola con un menu a tendina e un modulo: chiedevi una cosa, e per
 * vederla dovevi scaricarla. Provandola, Cammo ha detto due cose che insieme
 * decidono tutto: «deve mostrare le pagine in stile della suite per pc» e
 * «niente funziona sul device a livello di risorse ma fa tutto il pc».
 *
 * Se il telefono non calcola niente e il PC calcola tutto, allora anche
 * l'**interfaccia** deve stare sul PC. Quindi la parte grossa di questa app è
 * una WebView sulla console che il gateway serve: le stesse pagine che vede il
 * portatile, con le schede, i moduli e la galleria. Una sola interfaccia da
 * scrivere, una sola da tenere allineata alle azioni, e quando sul PC compare
 * una scheda nuova compare anche qui senza pubblicare un APK.
 *
 * Quello che resta nativo è **quello che una pagina web non può fare**:
 *
 * - **scegliere chi sei** all'avvio, che era l'altra cosa chiesta: più persone
 *   sullo stesso telefono, ognuna col suo accoppiamento (vedi [Profili]);
 * - accoppiarsi col QR, perché serve la camera;
 * - le notifiche quando un lavoro finisce, anche ad app chiusa;
 * - mettere un video in galleria e un brano fra la musica;
 * - aggiornarsi da sola;
 * - **la coda quando il PC non c'è**: una pagina web, con il computer spento,
 *   non si carica nemmeno.
 */
private const val GIORNO = 24L * 60 * 60 * 1000

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: RichiesteAdapter
    private lateinit var codaOffline: CodaOffline

    /** Chi sta usando l'app adesso. Null vuol dire: siamo alla scelta. */
    private var chi: Profilo? = null
    private var client: GatewayClient? = null
    private var polling: Job? = null

    /** Le azioni, per il modulo di quando il PC non risponde. */
    private var azioni: List<Azione> = emptyList()
    private var azioneScelta: Azione? = null

    /** Dove stiamo: la schermata visibile adesso. */
    private enum class Dove { UTENTI, COLLEGA, SUITE, OFFLINE }

    private var dove = Dove.UTENTI

    /** Il nome scritto nella schermata di accoppiamento, tenuto da parte. */
    private var nomeInCorso = ""

    /** Lo scanner del QR: il contenuto è l'invito della suite. */
    private val scannerQr = registerForActivityResult(ScanContract()) { risultato ->
        val contenuto = risultato.contents ?: return@registerForActivityResult
        val indirizzi = estraiIndirizzi(contenuto)
        val codice = estraiCodice(contenuto)
        if (indirizzi.isNotEmpty() && codice != null) {
            Store.ricordaBase(this, indirizzi.first())
            connetti(indirizzi, codice)
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

        preparaWeb()

        binding.btnMenu.setOnClickListener { apriMenu() }
        binding.btnNuovoUtente.setOnClickListener { vaiAllaCollega() }
        binding.btnTornaUtenti.setOnClickListener { mostra(Dove.UTENTI) }
        binding.btnScansiona.setOnClickListener { apriScanner() }
        binding.btnConnetti.setOnClickListener { connettiDaCodice() }
        binding.btnManda.setOnClickListener { manda() }
        binding.btnRiprova.setOnClickListener { apriSuite() }

        binding.spinnerAzione.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, posizione: Int, id: Long) {
                azioni.getOrNull(posizione)?.let { disegnaCampi(it) }
            }

            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        // Il tasto «indietro» del telefono: dentro la suite torna indietro
        // nella pagina, e solo quando non c'è più niente dietro chiude l'app.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    dove == Dove.SUITE && binding.web.canGoBack() -> binding.web.goBack()
                    dove == Dove.COLLEGA -> mostra(Dove.UTENTI)
                    dove != Dove.UTENTI && Profili.tutti(this@MainActivity).size > 1 -> {
                        Profili.esci(this@MainActivity)
                        chi = null
                        mostra(Dove.UTENTI)
                    }
                    else -> {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        })

        // Un giro all'avvio, ma non più di uno al giorno e in silenzio se non
        // c'è niente: è l'unica cosa che questa app manda fuori dalla tua rete,
        // e non deve diventare un pettegolezzo continuo.
        if (System.currentTimeMillis() - Store.ultimoControlloAgg(this) > GIORNO) {
            cercaAggiornamento(dilloSempre = false)
        }

        riprendi()
    }

    /**
     * Chi eravamo l'ultima volta.
     *
     * Con una persona sola si entra dritti: chiederle ogni volta «chi sei» fra
     * una sola risposta possibile sarebbe una schermata in mezzo per niente.
     * Con più di una la scelta si fa, ed è il punto di tutto.
     */
    private fun riprendi() {
        val salvato = Profili.attivo(this)
        val tutti = Profili.tutti(this)
        when {
            salvato != null -> entra(salvato)
            tutti.size == 1 -> entra(tutti.first())
            tutti.isEmpty() -> vaiAllaCollega()
            else -> mostra(Dove.UTENTI)
        }
    }

    override fun onResume() {
        super.onResume()
        // Tornare sull'app è il momento in cui si vuole sapere com'è andata.
        if (dove == Dove.OFFLINE) apriSuite()
    }

    /* ------------------------------------------------------ le schermate */

    private fun mostra(quale: Dove) {
        dove = quale
        binding.schermoUtenti.visibility = if (quale == Dove.UTENTI) View.VISIBLE else View.GONE
        binding.schermoCollega.visibility = if (quale == Dove.COLLEGA) View.VISIBLE else View.GONE
        binding.web.visibility = if (quale == Dove.SUITE) View.VISIBLE else View.GONE
        binding.schermoOffline.visibility = if (quale == Dove.OFFLINE) View.VISIBLE else View.GONE
        if (quale != Dove.SUITE) binding.attesa.visibility = View.GONE
        if (quale == Dove.UTENTI) disegnaUtenti()
        if (quale == Dove.OFFLINE) mostraCoda()
        aggiornaBarra()
    }

    private fun aggiornaBarra() {
        val persona = chi
        binding.chiSono.text = when {
            persona == null -> getString(R.string.app_name)
            dove == Dove.OFFLINE -> "${persona.nome} · ${getString(R.string.stato_non_raggiungibile)}"
            else -> "${persona.nome} · ${persona.computer}"
        }
    }

    /* ------------------------------------------------------- chi sei */

    private fun disegnaUtenti() {
        val elenco = binding.elencoUtenti
        elenco.removeAllViews()

        for (p in Profili.tutti(this)) {
            elenco.addView(rigaPersona(p))
        }
    }

    /**
     * La scheda di una persona.
     *
     * Costruita a mano e non da `simple_list_item_2`: quel layout di sistema
     * cambia forma fra una versione di Android e l'altra — a volte è un
     * `TwoLineListItem`, a volte un `LinearLayout` — e qui gli si cambiano
     * colori, margini e sfondo. Venti righe scritte una volta valgono più di
     * una sorpresa su un telefono che non abbiamo.
     */
    private fun rigaPersona(p: Profilo): View {
        val riga = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.sfondo_carta)
            setPadding(dp(15), dp(13), dp(15), dp(13))
            isClickable = true
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { bottomMargin = dp(9) }
        }

        riga.addView(TextView(this).apply {
            text = p.nome
            setTextColor(getColor(R.color.testo))
            textSize = 17f
        })
        riga.addView(TextView(this).apply {
            text = buildString {
                append(p.computer.ifBlank { "un computer" })
                append(" · ")
                append(if (p.ePadrone) "può anche decidere" else "può chiedere")
                append(" · ")
                append(quandoUltimo(p.ultimoUso))
            }
            setTextColor(getColor(R.color.testo_debole))
            textSize = 12f
        })

        riga.setOnClickListener { entra(p) }
        // Tenere premuto per togliere: è un gesto che non si fa per sbaglio, e
        // togliere una persona vuol dire buttarne via il collegamento.
        riga.setOnLongClickListener {
            chiediDiTogliere(p)
            true
        }
        return riga
    }

    private fun quandoUltimo(quando: Long): String {
        if (quando <= 0) return getString(R.string.mai_usato)
        val passati = (System.currentTimeMillis() - quando) / 1000
        return when {
            passati < 120 -> getString(R.string.usato_adesso)
            passati < 3600 -> "${passati / 60} min fa"
            passati < 86_400 -> "${passati / 3600} h fa"
            else -> "${passati / 86_400} giorni fa"
        }
    }

    private fun chiediDiTogliere(p: Profilo) {
        AlertDialog.Builder(this)
            .setTitle("Togliere ${p.nome} da questo telefono?")
            .setMessage(
                "Il telefono si scorda il suo collegamento. Nell'elenco della suite resta " +
                    "finché non lo togli anche da lì, dal pannello «Da fuori».",
            )
            .setPositiveButton("Togli") { _, _ ->
                Profili.rimuovi(this, p.id)
                if (chi?.id == p.id) {
                    chi = null
                    client = null
                    polling?.cancel()
                }
                if (Profili.tutti(this).isEmpty()) vaiAllaCollega() else mostra(Dove.UTENTI)
            }
            .setNegativeButton("Lascia stare", null)
            .show()
    }

    private fun vaiAllaCollega() {
        binding.campoNome.setText(nomeInCorso.ifBlank { "" })
        binding.campoCodice.text?.clear()
        binding.btnTornaUtenti.visibility =
            if (Profili.tutti(this).isEmpty()) View.GONE else View.VISIBLE
        mostra(Dove.COLLEGA)
    }

    /* ---------------------------------------------------- accoppiamento */

    private fun apriScanner() {
        nomeInCorso = binding.campoNome.text.toString().trim()
        if (nomeInCorso.isBlank()) {
            avvisa("Scrivi prima come ti chiami: è il nome che vedrà il PC.")
            return
        }
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
        nomeInCorso = binding.campoNome.text.toString().trim()
        if (nomeInCorso.isBlank()) {
            avvisa("Scrivi prima come ti chiami: è il nome che vedrà il PC.")
            return
        }
        val codice = binding.campoCodice.text.toString().trim()
        if (codice.length != 8 || !codice.all { it.isDigit() }) {
            avvisa("Il codice è di otto cifre.")
            return
        }
        val indirizzo = Store.base(this)
        if (indirizzo == null) {
            avvisa("Non so ancora a quale computer bussare: la prima volta inquadra il QR.")
            return
        }
        connetti(listOf(indirizzo), codice)
    }

    private fun connetti(indirizzi: List<String>, codice: String) {
        val nome = nomeInCorso.ifBlank { Store.nomeProposto() }
        lifecycleScope.launch {
            try {
                // **Il codice vale una volta sola**: si prova ad accoppiarsi
                // con il primo indirizzo che risponde, e se sbagliassimo a
                // provarne uno morto per primo il codice sarebbe bruciato. Per
                // questo l'accoppiamento parte dal primo che dà una risposta
                // vera, non dal primo dell'elenco.
                val esito = accoppiaDoveRisponde(indirizzi, codice, nome)
                val profilo = Profilo(
                    id = UUID.randomUUID().toString(),
                    nome = nome,
                    base = esito.second,
                    basi = indirizzi,
                    token = esito.first.token,
                    ruolo = esito.first.ruolo,
                    computer = esito.first.computer,
                    ultimoUso = System.currentTimeMillis(),
                )
                Profili.salva(this@MainActivity, profilo)
                binding.campoCodice.text?.clear()
                nomeInCorso = ""
                avvisa("Collegato a ${esito.first.computer}.")
                entra(profilo)
            } catch (e: Exception) {
                avvisa(spiega(e))
            }
        }
    }

    /**
     * Si accoppia con il primo indirizzo che dà una risposta, e dice quale.
     *
     * L'ordine conta perché **il codice vale una volta sola**. Un errore di
     * rete non lo brucia — non è mai arrivato al computer — quindi si può
     * passare al prossimo indirizzo. Un rifiuto del computer invece sì: il
     * codice è stato usato o è sbagliato, e insistere sugli altri indirizzi
     * darebbe lo stesso «no» tre volte, con tre attese in mezzo.
     */
    private suspend fun accoppiaDoveRisponde(
        indirizzi: List<String>,
        codice: String,
        nome: String,
    ): Pair<Accoppiamento, String> {
        var ultimo: Exception? = null
        for (base in indirizzi) {
            try {
                return GatewayClient.accoppia(base, codice, nome) to base
            } catch (e: GatewayException) {
                // Il computer ha risposto e ha detto di no: è una risposta.
                throw e
            } catch (e: Exception) {
                ultimo = e
            }
        }
        throw ultimo ?: Exception("Nessuno di quegli indirizzi risponde.")
    }

    /**
     * Dal contenuto del QR tira fuori **tutti** gli indirizzi, in ordine.
     *
     * La v3 dell'invito porta `basi`: casa, Tailscale, il tunnel. È quello che
     * permette al telefono di ritrovare il computer quando cambia rete, invece
     * di restare fermo su un indirizzo che non esiste più.
     *
     * Le versioni precedenti ne portavano uno solo: si legge lo stesso, e
     * l'elenco è di un elemento.
     */
    private fun estraiIndirizzi(contenuto: String): List<String> {
        val tutti = mutableListOf<String>()

        // v3: "basi":["http://…","http://…"]
        Regex("\"basi\"\\s*:\\s*\\[([^\\]]*)]").find(contenuto)?.groupValues?.get(1)?.let { dentro ->
            for (m in Regex("\"([^\"]+)\"").findAll(dentro)) tutti.add(m.groupValues[1])
        }

        estraiBase(contenuto)?.let { tutti.add(it) }
        return tutti.map { it.trim().trimEnd('/') }.filter { it.isNotBlank() }.distinct()
    }

    /** L'indirizzo singolo, come lo portavano la v1 e la v2. */
    private fun estraiBase(contenuto: String): String? {
        // La v2 dell'invito porta `base`: l'indirizzo intero, schema compreso.
        // È l'unico che funzioni con il tunnel su Internet, dove il gateway sta
        // su https e non ha una porta.
        val completo = Regex("\"base\"\\s*:\\s*\"([^\"]+)\"").find(contenuto)?.groupValues?.get(1)
            ?: Regex("base=([^&]+)").find(contenuto)?.groupValues?.get(1)
        if (!completo.isNullOrBlank()) {
            return android.net.Uri.decode(completo).trim().trimEnd('/')
        }
        // La v1 aveva solo `host`, che era `ip:porta` in chiaro: ci si mette
        // davanti `http://`, che è quello che faceva l'app prima.
        val host = Regex("\"host\"\\s*:\\s*\"([^\"]+)\"").find(contenuto)?.groupValues?.get(1)
            ?: Regex("host=([^&]+)").find(contenuto)?.groupValues?.get(1)
        val pulito = host?.trim()?.trimEnd('/')?.takeIf { it.isNotBlank() } ?: return null
        return if (pulito.startsWith("http")) pulito else "http://$pulito"
    }

    private fun estraiCodice(contenuto: String): String? =
        (Regex("\"codice\"\\s*:\\s*\"([^\"]+)\"").find(contenuto)?.groupValues?.get(1)
            ?: Regex("codice=([^&]+)").find(contenuto)?.groupValues?.get(1))
            ?.takeIf { it.length == 8 && it.all(Char::isDigit) }

    /* ---------------------------------------------------------- entrare */

    private fun entra(profilo: Profilo) {
        chi = profilo
        Profili.scegli(this, profilo.id)
        Store.ricordaBase(this, profilo.base)
        client = GatewayClient(profilo.base, profilo.token)
        leggiAzioniRicordate(profilo)
        apriSuite()
        avviaPolling()
    }

    /**
     * Apre la suite, se il PC risponde.
     *
     * **Si bussa prima di aprire la pagina.** Una WebView che non riesce a
     * caricare mostra la pagina di errore del browser: in inglese, con un
     * codice, e senza nessun consiglio utile. Un giro di rete in più costa
     * mezzo secondo e in cambio, quando il PC è spento, si legge una frase che
     * dice cosa fare.
     */
    private fun apriSuite(): Job = lifecycleScope.launch {
        val persona = chi ?: return@launch
        val cl = client ?: return@launch

        binding.attesa.visibility = View.VISIBLE
        // **Quale indirizzo risponde adesso**, non quale rispondeva l'altra
        // volta: è tutto il motivo per cui l'app adesso si ricollega da sola.
        val dove = Indirizzi.quale(persona.basi, persona.base, persona.token)
        binding.attesa.visibility = View.GONE

        if (dove == null) {
            mostra(Dove.OFFLINE)
            return@launch
        }
        if (dove != persona.base) {
            // Trovato altrove: la prossima volta si parte da qui.
            Profili.ricordaBase(this@MainActivity, persona.id, dove)
            chi = persona.copy(base = dove)
            client = GatewayClient(dove, persona.token)
        }
        val attuale = chi ?: persona

        // Le azioni si rileggono a ogni entrata: servono al modulo di quando il
        // PC sparisce, e vanno tenute fresche mentre il PC c'è.
        aggiornaAzioni(attuale)

        // Il token viaggia nel **frammento** dell'indirizzo, dopo il #: non
        // viene mandato al server, non finisce nei log e non finisce in un
        // Referer. La pagina lo legge, lo mette da parte e lo cancella
        // dall'indirizzo. Vedi `console.ts`.
        val indirizzo = buildString {
            append(attuale.base.trimEnd('/'))
            append("/#t=")
            append(android.net.Uri.encode(attuale.token))
            append("&u=")
            append(android.net.Uri.encode(attuale.nome))
        }
        binding.web.loadUrl(indirizzo)
        mostra(Dove.SUITE)

        // La coda scritta senza PC parte adesso, che il PC c'è.
        mandaLaCoda(client ?: cl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun preparaWeb() {
        val w: WebView = binding.web
        w.setBackgroundColor(getColor(R.color.sfondo))
        w.settings.javaScriptEnabled = true
        // La console tiene il token e le preferenze nel `localStorage`, come fa
        // nel browser di un portatile: senza questo si scollegherebbe a ogni
        // apertura.
        w.settings.domStorageEnabled = true
        // Un video generato dalla suite deve poter partire con un tocco solo:
        // il gesto lo ha già fatto chi ha premuto play.
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.settings.setSupportZoom(false)

        /**
         * Il ponte verso l'app.
         *
         * Solo due cose, e tutte e due sono cose che una pagina web dentro una
         * WebView non sa fare bene: **portare un file nel telefono**. Un
         * `<a download>` su un blob, in una WebView, non scarica niente; e
         * anche se scaricasse, finirebbe in una cartella dell'app invece che
         * in galleria o fra la musica. Il file lo tira giù l'app, che ha già
         * il token, e lo mette dove uno se lo aspetta.
         */
        w.addJavascriptInterface(
            object {
                @JavascriptInterface
                fun scaricaRisultato(nome: String) {
                    runOnUiThread { scaricaDaRete(nome, dallaLibreria = null) }
                }

                @JavascriptInterface
                fun scaricaLibreria(id: String, nome: String) {
                    runOnUiThread { scaricaDaRete(nome, dallaLibreria = id) }
                }
            },
            "DaProdApp",
        )

        w.webViewClient = object : WebViewClient() {
            /**
             * Fuori dalla suite non si va.
             *
             * Non è paranoia: questa WebView ha un ponte verso l'app e un token
             * dentro. Se una pagina qualunque potesse aprirsi qui dentro,
             * potrebbe chiamare `DaProdApp`. Tutto quello che non è il nostro
             * gateway non si carica.
             */
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
            ): Boolean {
                val chiesto = request?.url?.toString() ?: return true
                // Vanno bene **tutti** gli indirizzi di questo computer: dopo
                // un cambio di rete la pagina sta su un altro di loro, e un
                // controllo sul solo `base` la bloccherebbe.
                val nostri = (chi?.basi.orEmpty() + listOfNotNull(chi?.base))
                    .map { it.trimEnd('/') }
                    .filter { it.isNotBlank() }
                return nostri.none { chiesto.startsWith(it) }
            }

            override fun onReceivedError(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceError?,
            ) {
                // Solo se a cadere è la pagina principale: un'immagine che non
                // arriva non è un motivo per buttare fuori chi sta guardando.
                if (request?.isForMainFrame == true) mostra(Dove.OFFLINE)
            }
        }
    }

    /* ----------------------------------------------------------- il menu */

    private fun apriMenu() {
        val menu = PopupMenu(this, binding.btnMenu)
        val persona = chi
        if (dove == Dove.SUITE) menu.menu.add(0, 1, 0, R.string.menu_ricarica)
        if (persona != null) {
            menu.menu.add(0, 2, 1, R.string.menu_stato)
            if (Profili.tutti(this).size > 1) menu.menu.add(0, 3, 2, R.string.menu_cambia)
        }
        menu.menu.add(0, 4, 3, R.string.aggiungi_persona)
        menu.menu.add(0, 5, 4, R.string.menu_aggiorna)
        if (persona != null) menu.menu.add(0, 6, 5, R.string.menu_scollega)

        menu.setOnMenuItemClickListener { voce ->
            when (voce.itemId) {
                1 -> apriSuite()
                2 -> mostraStato()
                3 -> {
                    Profili.esci(this)
                    chi = null
                    client = null
                    polling?.cancel()
                    mostra(Dove.UTENTI)
                }
                4 -> vaiAllaCollega()
                5 -> cercaAggiornamento(dilloSempre = true)
                6 -> persona?.let { chiediDiTogliere(it) }
            }
            true
        }
        menu.show()
    }

    private fun mostraStato() {
        val persona = chi ?: return
        val inCoda = codaOffline.tutte().size
        val messaggio = buildString {
            appendLine("Sei: ${persona.nome}")
            appendLine("Computer: ${persona.computer}")
            appendLine("Indirizzo: ${persona.base}")
            appendLine(
                if (persona.ePadrone) "Puoi anche decidere sui lavori degli altri."
                else "Puoi chiedere lavori.",
            )
            appendLine(
                if (persona.base.startsWith("https://")) "Il collegamento è cifrato (HTTPS)."
                else "Il collegamento è in chiaro: vale sulla wifi di casa.",
            )
            appendLine("Versione dell'app: ${Aggiornamenti.versioneInstallata(this@MainActivity)}")
            appendLine()
            appendLine(if (dove == Dove.SUITE) "Il PC risponde." else "Il PC non risponde adesso.")
            if (inCoda > 0) appendLine("$inCoda richieste aspettano qui sul telefono.")
        }
        AlertDialog.Builder(this)
            .setTitle("Stato della connessione")
            .setMessage(messaggio)
            .setPositiveButton("Va bene", null)
            .show()
    }

    /* -------------------------------------------------------- le azioni */

    /**
     * Il modulo di quando il PC non c'è.
     *
     * I campi arrivano dalle azioni che la suite dichiara (`/azioni`), le stesse
     * che vedono la console e il server MCP: quando sul PC se ne aggiunge una,
     * qui compare da sola. Offline si usano quelle **ricordate** dall'ultima
     * volta, perché senza non ci sarebbe niente da cui costruire il modulo.
     */
    private fun leggiAzioniRicordate(profilo: Profilo) {
        val grezzo = Store.azioniRicordate(this, profilo.id) ?: return
        azioni = leggiAzioni(grezzo)
        disegnaSpinner()
    }

    private fun aggiornaAzioni(profilo: Profilo): Job = lifecycleScope.launch {
        val cl = client ?: return@launch
        try {
            // Solo quelle che vanno in fila: le altre — leggere la libreria,
            // decidere — sono roba da console e da agenti, e in un menu del
            // telefono vorrebbero dire scegliere fra nove voci per arrivare a due.
            val tutte = cl.azioni().filter { it.coda }
            azioni = tutte
            Store.ricordaAzioni(this@MainActivity, profilo.id, scriviAzioni(tutte))
            disegnaSpinner()
        } catch (_: Exception) {
            // Restano quelle ricordate: meglio vecchie che nessuna.
        }
    }

    private fun leggiAzioni(grezzo: String): List<Azione> = try {
        val arr = JSONArray(grezzo)
        (0 until arr.length()).map { Azione.daJson(arr.getJSONObject(it)) }
    } catch (_: Exception) {
        emptyList()
    }

    private fun scriviAzioni(elenco: List<Azione>): String {
        val arr = JSONArray()
        for (a in elenco) arr.put(a.aJson())
        return arr.toString()
    }

    private fun disegnaSpinner() {
        if (azioni.isEmpty()) return
        binding.spinnerAzione.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            azioni.map { it.titolo },
        )
        disegnaCampi(azioneScelta?.let { scelta -> azioni.firstOrNull { it.id == scelta.id } }
            ?: azioni.first())
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
        ).apply { topMargin = dp(top) }

    private fun dp(quanti: Int): Int = (quanti * resources.displayMetrics.density).toInt()

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
        codaOffline.aggiungi(azione.id, azione.titolo, principale, valori)
        svuotaModulo()
        mostraCoda()
        avvisa(getString(R.string.salvata_in_coda))
        // E si prova subito: se il PC è tornato nel frattempo, parte adesso.
        apriSuite()
    }

    private fun svuotaModulo() {
        azioneScelta?.let { disegnaCampi(it) }
    }

    /* ------------------------------------------------------------- la fila */

    /**
     * La coda offline parte, una voce per volta.
     *
     * Al primo errore ci si ferma: se il PC se n'è andato di nuovo, insistere
     * sulle altre vorrebbe dire una decina di timeout in fila e un'app che
     * sembra piantata.
     */
    private fun mandaLaCoda(cl: GatewayClient): Job = lifecycleScope.launch {
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
        if (partitaQualcuna) avvisa("Quello che avevi scritto senza PC è partito.")
        mostraCoda()
    }

    private fun mostraCoda() {
        val offline = codaOffline.tutte().map { Richiesta.daCoda(it) }
        adapter.sostituisci(offline)
        binding.codaVuota.visibility = if (offline.isEmpty()) View.VISIBLE else View.GONE
    }

    /* --------------------------------------------------------- scaricare */

    private fun scaricaRisultato(richiesta: Richiesta) {
        val nome = richiesta.risultatoNome ?: return
        scaricaDaRete(nome, dallaLibreria = null, mime = richiesta.risultatoMime)
    }

    /**
     * Porta un file dentro il telefono.
     *
     * Un'immagine finisce in galleria, un video in galleria, un brano fra la
     * musica: sotto «DaProd Suite», dove poi si ritrovano senza riaprire l'app.
     */
    private fun scaricaDaRete(nome: String, dallaLibreria: String?, mime: String? = null) {
        val cl = client ?: return avvisa("Serve il PC collegato per scaricarlo.")
        avvisa("Lo sto scaricando…")
        lifecycleScope.launch {
            try {
                val byte =
                    if (dallaLibreria != null) cl.scaricaDallaLibreria(dallaLibreria)
                    else cl.scaricaRisultato(nome)
                val dove = Scarica.salva(
                    this@MainActivity,
                    nome,
                    mime ?: indovinaMime(nome),
                    byte,
                )
                avvisa("Salvato in $dove.")
            } catch (e: Exception) {
                avvisa(spiega(e))
            }
        }
    }

    /** Dal nome del file, che è l'unica cosa che si ha quando arriva dalla pagina. */
    private fun indovinaMime(nome: String): String = when (nome.substringAfterLast('.', "").lowercase()) {
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "webp" -> "image/webp"
        "mp4" -> "video/mp4"
        "webm" -> "video/webm"
        "mp3" -> "audio/mpeg"
        "wav" -> "audio/wav"
        "flac" -> "audio/flac"
        else -> "application/octet-stream"
    }

    /* ------------------------------------------------------------- polling */

    /**
     * Le notifiche mentre l'app è davanti.
     *
     * Con l'app chiusa il lavoro lo fa `SyncWorker`, che passa ogni quarto d'ora:
     * è lui che porta la notifica ore dopo. Questo qui serve solo a chi sta
     * guardando lo schermo mentre il PC lavora — e a riaccorgersi che il PC è
     * tornato, quando si è nella schermata «senza PC».
     */
    private fun avviaPolling() {
        polling?.cancel()
        polling = lifecycleScope.launch {
            while (isActive) {
                delay(20_000)
                controllaNotifiche()
                if (dove == Dove.OFFLINE) apriSuite()
            }
        }
    }

    private suspend fun controllaNotifiche() {
        val cl = client ?: return
        try {
            for ((id, testo) in cl.notificheNonLette()) {
                Notifiche.mostra(this, getString(R.string.app_name), testo)
                cl.segnaNotificaLetta(id)
            }
        } catch (_: Exception) {
            // Offline: al giro dopo.
        }
    }

    /* ------------------------------------------------- aggiornare l'app */

    /**
     * Cerca una versione nuova.
     *
     * `dilloSempre` è la differenza fra il giro automatico e la voce di menu:
     * premendo **Aggiorna l'app** si vuole una risposta comunque, anche «sei già
     * a posto»; all'avvio no, o sarebbe un messaggio a ogni apertura.
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

    /* ---------------------------------------------------------- aiutini */

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
