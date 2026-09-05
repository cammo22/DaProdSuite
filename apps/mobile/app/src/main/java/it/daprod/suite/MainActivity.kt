package it.daprod.suite

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import it.daprod.suite.data.CodaOffline
import it.daprod.suite.data.Deposito
import it.daprod.suite.data.Profili
import it.daprod.suite.data.Profilo
import it.daprod.suite.data.Store
import it.daprod.suite.databinding.ActivityMainBinding
import it.daprod.suite.net.Accoppiamento
import it.daprod.suite.net.GatewayClient
import it.daprod.suite.net.GatewayException
import it.daprod.suite.net.EsitoBussata
import it.daprod.suite.net.Indirizzi
import it.daprod.suite.net.Scoperta
import it.daprod.suite.net.ServitoreOffline
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID

/**
 * L'app, che è un vetro sul PC — **anche quando il PC non c'è.**
 *
 * ## Cosa era, fino alla 0.7.5
 *
 * Una WebView sulla console che il gateway serve, più tre schermate native:
 * chi sei, collega, e **senza PC**. Quest'ultima era un menu a tendina, un
 * modulo e una lista di richieste in attesa: funzionava, ma era un'altra app.
 * Uscivi di casa, aprivi, e al posto della tua galleria trovavi uno spinner.
 *
 * ## Cosa è, dalla 0.7.6
 *
 * Detto da chi la usava, il 26 agosto 2026:
 *
 * > «quando il pc non è raggiungibile deve comunque funzionare la stessa
 * > interfaccia e app; tutto quello che si riceve automaticamente viene salvato
 * > offline, poi se uno vuole li può salvare in galleria. Al momento se il pc
 * > non è raggiungibile mostra un'altra schermata: questa cosa non va bene, e
 * > non mi piace nemmeno quella schermata.»
 *
 * Adesso la pagina è **sempre la stessa**. Col computer acceso la serve lui;
 * col computer spento la serve il telefono, dalla copia che ha tenuto — e alle
 * domande che la pagina fa (`/io`, `/azioni`, `/libreria`, `/invii`…) risponde
 * [ServitoreOffline] leggendo dal [Deposito]. Chi guarda vede la sua Casa, la
 * sua Galleria, i suoi Pensieri, e in cima una riga che dice che il computer
 * adesso non risponde. Quello che chiede si mette in coda e parte da solo.
 *
 * ## Cosa resta nativo, e perché ognuna delle cose
 *
 * Solo quello che una pagina web, dentro una WebView, **non può fare**:
 *
 * - **scegliere chi sei** all'avvio: più persone sullo stesso telefono, ognuna
 *   col suo accoppiamento (vedi [Profili]);
 * - **entrare la prima volta**: prima di accoppiarsi non si sa a quale computer
 *   bussare, quindi non c'è nessuna pagina da caricare;
 * - **il QR**, perché serve la camera;
 * - **le notifiche** quando un lavoro finisce, anche ad app chiusa;
 * - **mettere un video in galleria** e un brano fra la musica;
 * - **condividere** con le altre app del telefono;
 * - **aggiornarsi** da sola;
 * - **lo specchio**: tenere qui quello che è arrivato, che è la ragione per cui
 *   tutto il resto funziona anche a computer spento.
 */
private const val GIORNO = 24L * 60 * 60 * 1000

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var codaOffline: CodaOffline

    /** Chi sta usando l'app adesso. Null vuol dire: siamo alla scelta. */
    private var chi: Profilo? = null
    private var client: GatewayClient? = null
    private var polling: Job? = null

    /** Lo specchio del computer per la persona di adesso. */
    private var deposito: Deposito? = null
    private var servitore: ServitoreOffline? = null

    /**
     * Se in questo momento stiamo rispondendo noi al posto del computer.
     *
     * Comanda l'intercettazione: quando il computer c'è, le richieste della
     * pagina vanno in rete come sempre — sarebbe assurdo servire una copia
     * vecchia avendo l'originale a portata di mano.
     */
    private var stiamoOffline = false

    /**
     * Vero mentre la pagina sta suonando qualcosa.
     *
     * Serve a una decisione sola e importante: **con la musica accesa l'app che
     * va in secondo piano non mette di guardia la sentinella.** Due servizi in
     * primo piano insieme sono due notifiche per lo stesso telefono, e quella
     * che conta in quel momento è quella della musica.
     */
    private var staSuonando = false

    /** Dove stiamo: la schermata visibile adesso. */
    /**
     * Le quattro schermate, e SCOPRI è quella nuova della 0.9.0.
     *
     * Prima erano tre, e fra «scrivi il tuo nome» e «sei dentro» ci stava un
     * codice di otto cifre da farsi dettare. Adesso in mezzo c'è un elenco di
     * computer: si tocca quello giusto, di là compare un avviso, e chi ci sta
     * davanti dice di sì. Il codice resta ed è la strada di fuori casa, dove
     * nessun annuncio arriva.
     */
    private enum class Dove { UTENTI, ENTRA, SCOPRI, SUITE }

    private var dove = Dove.UTENTI

    /** Il nome scritto nella schermata d'ingresso, tenuto da parte. */
    private var nomeInCorso = ""

    /* ------------------------------------------------- cercare e bussare */

    /** Il giro che chiede «chi c'è» finché la schermata è aperta. */
    private var giroScoperta: Job? = null

    /** Il giro che chiede «e allora?» dopo aver bussato. */
    private var giroAttesa: Job? = null

    /** I computer sentiti, per id: chi risponde due volte non compare due volte. */
    private val computerTrovati = LinkedHashMap<String, Scoperta.Computer>()

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

    /* --------------------------------------------------- scegliere un file */

    /**
     * Chi sta aspettando il file che l'utente sceglie.
     *
     * ⚠ **Il difetto del 27 agosto 2026: «il caricamento della foto profilo non
     * funziona».** E non funzionava niente che passasse da un `<input
     * type="file">` — la foto del profilo, e anche il caricare una cosa in
     * bacheca. Toccavi «Metti una foto», si apriva la finestra dei file… no:
     * **non succedeva niente**. Nessun errore, nessun messaggio.
     *
     * La causa è una riga che non c'era. Una WebView, da sola, **non sa aprire
     * il selettore dei file**: quando la pagina ne chiede uno, Android chiama
     * `WebChromeClient.onShowFileChooser`, e se un `WebChromeClient` non c'è —
     * e qui non c'era — la richiesta viene lasciata cadere in silenzio. È
     * scritto nella documentazione di Android, e non si vede in nessun log.
     *
     * Quindi adesso c'è, e fa le tre cose che vanno fatte: apre il selettore
     * che la pagina ha chiesto, riporta indietro quello che è stato scelto, e —
     * la parte che si dimentica — **risponde comunque anche quando si annulla**.
     * Un `ValueCallback` a cui non si risponde mai lascia quell'`<input>` morto
     * per sempre: al secondo tentativo il tasto non farebbe più niente,
     * stavolta davvero.
     */
    private var attesaFile: ValueCallback<Array<Uri>>? = null

    private val scegliUnFile =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { esito ->
            val chiAspetta = attesaFile ?: return@registerForActivityResult
            attesaFile = null
            chiAspetta.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(esito.resultCode, esito.data),
            )
        }

    /** Dice alla pagina che di file non ne arriva nessuno, e libera l'input. */
    private fun nessunFileScelto() {
        attesaFile?.onReceiveValue(null)
        attesaFile = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        codaOffline = CodaOffline(this)

        Notifiche.creaCanale(this)
        Sentinella.creaCanale(this)
        Lettore.creaCanale(this)

        /**
         * I tasti della tendina e delle cuffie: non fanno il lavoro, lo chiedono.
         *
         * La fila la conosce solo la pagina, quindi premere «prossimo» sulla
         * schermata di blocco deve finire nella stessa funzione in cui finisce
         * premere «prossimo» dentro l'app. Se fossero due strade, un giorno una
         * delle due farebbe una cosa leggermente diversa dall'altra.
         */
        Lettore.comandi = { comando ->
            val quale = when (comando) {
                Lettore.Comando.PAUSA_O_SUONA -> "pausaOSuona"
                Lettore.Comando.PROSSIMO -> "prossimo"
                Lettore.Comando.PRECEDENTE -> "precedente"
                Lettore.Comando.FERMA -> "ferma"
            }
            runOnUiThread {
                binding.web.evaluateJavascript(
                    "window.DaProdLettore && window.DaProdLettore.$quale();",
                    null,
                )
            }
        }
        SyncWorker.programma(this)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            chiediNotifiche.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        preparaWeb()

        binding.btnMenu.setOnClickListener { apriMenu() }
        binding.btnNuovoUtente.setOnClickListener { vaiAdEntrare() }
        binding.btnTornaUtenti.setOnClickListener { mostra(Dove.UTENTI) }
        binding.btnScansiona.setOnClickListener { apriScanner() }
        binding.btnConnetti.setOnClickListener { connettiDaCodice() }
        binding.btnCerca.setOnClickListener { vaiAScoprire() }
        binding.btnMostraCodice.setOnClickListener { mostraIlCodice() }
        binding.btnScopriCodice.setOnClickListener {
            mostra(Dove.ENTRA)
            mostraIlCodice()
        }
        binding.btnLasciaPerdere.setOnClickListener { smettiDiAspettare() }

        // Il tasto «indietro» del telefono: dentro la suite torna indietro
        // nella pagina, e solo quando non c'è più niente dietro chiude l'app.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    dove == Dove.SUITE && binding.web.canGoBack() -> binding.web.goBack()
                    // Da «sto aspettando» si torna all'elenco, non fuori: chi
                    // ha bussato per sbaglio deve poter cambiare computer senza
                    // uscire dall'app.
                    dove == Dove.SCOPRI && giroAttesa != null -> smettiDiAspettare()
                    dove == Dove.SCOPRI -> mostra(Dove.ENTRA)
                    dove == Dove.ENTRA -> mostra(Dove.UTENTI)
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
            tutti.isEmpty() -> vaiAdEntrare()
            else -> mostra(Dove.UTENTI)
        }
    }

    override fun onResume() {
        super.onResume()
        // Guarda l'app adesso: la sentinella non serve più, e la sua notifica
        // silenziosa nemmeno. Se serve, riparte chiudendo.
        Sentinella.aRiposo(this)
        // Tornare sull'app è il momento in cui si vuole sapere com'è andata: se
        // eravamo senza computer si riprova, e se stavolta risponde la pagina
        // torna quella vera senza che nessuno prema niente.
        if (dove == Dove.SUITE && stiamoOffline) apriSuite()
    }

    /**
     * L'app va in secondo piano: **da qui in poi guarda la sentinella.**
     *
     * ⚠ La cura del difetto del 27 agosto 2026 — «le notifiche quando chiudo
     * l'app a volte non arrivano o arrivano in ritardo». Fino alla 0.7.8, da
     * questo momento l'unica cosa sveglia era [SyncWorker], che passa ogni
     * quarto d'ora **quando Android glielo lascia fare**: dentro Doze diventa
     * mezz'ora, o un'ora. Un video pronto in tre minuti si sapeva molto dopo.
     *
     * Si parte da `onStop` e non da `onPause`: `onPause` scatta anche quando ci
     * si mette davanti una finestrella — il selettore dei file, il permesso
     * delle notifiche — e mettere di guardia una sentinella perché l'utente sta
     * scegliendo una foto sarebbe assurdo.
     *
     * Solo da dentro la suite: chi è fermo sulla scelta della persona non ha
     * chiesto niente a nessuno, e non c'è niente da aspettare.
     *
     * Se non c'è davvero niente in ballo, la sentinella se ne accorge da sola e
     * si spegne: la domanda vuole la rete, e questo non è il momento di farla.
     */
    override fun onStop() {
        super.onStop()
        // Con la musica accesa il processo è già tenuto vivo dal [Lettore], e
        // due notifiche in primo piano per lo stesso telefono sono una di
        // troppo: quella che conta, in quel momento, è quella della musica.
        if (staSuonando) return
        if (dove == Dove.SUITE && chi != null) Sentinella.diGuardia(this)
    }

    /* ------------------------------------------------------ le schermate */

    private fun mostra(quale: Dove) {
        dove = quale
        binding.schermoUtenti.visibility = if (quale == Dove.UTENTI) View.VISIBLE else View.GONE
        binding.schermoCollega.visibility = if (quale == Dove.ENTRA) View.VISIBLE else View.GONE
        binding.schermoScopri.visibility = if (quale == Dove.SCOPRI) View.VISIBLE else View.GONE
        binding.web.visibility = if (quale == Dove.SUITE) View.VISIBLE else View.GONE
        // Dentro la suite la barra sparisce: la pagina ha la sua testata, con il
        // nome, la faccia e la rotella. Due intestazioni sono una di troppo.
        binding.barra.visibility = if (quale == Dove.SUITE) View.GONE else View.VISIBLE
        if (quale != Dove.SUITE) binding.attesa.visibility = View.GONE
        // Cercare costa una porta UDP aperta e un pacchetto ogni due secondi:
        // fuori da quella schermata non serve a niente e si spegne.
        if (quale != Dove.SCOPRI) {
            giroScoperta?.cancel()
            giroScoperta = null
        }
        if (quale == Dove.UTENTI) disegnaUtenti()
        aggiornaBarra()
    }

    private fun aggiornaBarra() {
        val persona = chi
        binding.chiSono.text = when {
            persona == null -> getString(R.string.app_name)
            else -> "${persona.nome} · ${persona.computer}"
        }
    }

    /* ------------------------------------------------------- chi sei */

    private fun disegnaUtenti() {
        val elenco = binding.elencoUtenti
        elenco.removeAllViews()
        for (p in Profili.tutti(this)) elenco.addView(rigaPersona(p))
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
                "Il telefono si scorda il suo collegamento e quello che aveva tenuto da parte. " +
                    "Nell'elenco della suite resta finché non lo togli anche da lì.",
            )
            .setPositiveButton("Togli") { _, _ ->
                Profili.rimuovi(this, p.id)
                if (chi?.id == p.id) {
                    chi = null
                    client = null
                    deposito = null
                    servitore = null
                    polling?.cancel()
                }
                if (Profili.tutti(this).isEmpty()) vaiAdEntrare() else mostra(Dove.UTENTI)
            }
            .setNegativeButton("Lascia stare", null)
            .show()
    }

    private fun vaiAdEntrare() {
        binding.campoNome.setText(nomeInCorso.ifBlank { "" })
        binding.campoCodice.text?.clear()
        // L'indirizzo dell'ultima volta: chi si ricollega allo stesso computer
        // deve solo battere le otto cifre.
        binding.campoIndirizzo.setText(Store.base(this) ?: "")
        /**
         * Il codice riparte chiuso, **tranne quando non c'è mai stata una rete**.
         *
         * Chi si è già collegato una volta da fuori casa ha un indirizzo
         * salvato: per lui la strada del codice è quella che usa, e ritrovarla
         * chiusa ogni volta sarebbe un tocco in più a ogni giro.
         */
        val giaUsatoIlCodice = !Store.base(this).isNullOrBlank()
        binding.bloccoCodice.visibility = if (giaUsatoIlCodice) View.VISIBLE else View.GONE
        binding.btnMostraCodice.visibility = if (giaUsatoIlCodice) View.GONE else View.VISIBLE
        binding.btnTornaUtenti.visibility =
            if (Profili.tutti(this).isEmpty()) View.GONE else View.VISIBLE
        mostra(Dove.ENTRA)
    }

    /**
     * Il codice, che dalla 0.9.0 sta sotto una riga da toccare.
     *
     * Non è nascosto per snobismo: è nascosto perché **in casa non serve più**,
     * e due caselle piene di cifre in cima alla prima schermata dicono a chi
     * apre l'app per la prima volta che questa cosa è complicata. Chi è fuori
     * casa preme la riga e le ritrova tutte e due, con dentro l'indirizzo
     * dell'ultima volta.
     */
    private fun mostraIlCodice() {
        binding.bloccoCodice.visibility = View.VISIBLE
        binding.btnMostraCodice.visibility = View.GONE
        binding.campoCodice.requestFocus()
    }

    /* ------------------------------------------------- cercare e bussare */

    /**
     * Va a vedere chi c'è, e ci resta finché non si sceglie.
     *
     * Il nome si prende **adesso**: bussare senza dire come ci si chiama non
     * ha senso, e chiederlo dopo aver scelto il computer vorrebbe dire una
     * casella in mezzo a un gesto che deve essere un tocco solo.
     */
    private fun vaiAScoprire() {
        nomeInCorso = binding.campoNome.text.toString().trim()
        if (nomeInCorso.isBlank()) {
            avvisa("Scrivi prima come vuoi farti chiamare: è il nome che vedranno gli altri.")
            binding.campoNome.requestFocus()
            return
        }
        computerTrovati.clear()
        binding.bloccoAttesa.visibility = View.GONE
        binding.scopriVuoto.visibility = View.GONE
        binding.elencoComputer.removeAllViews()
        binding.scopriSotto.setText(R.string.scopri_sotto)
        mostra(Dove.SCOPRI)
        cerca()
    }

    /**
     * Il giro che cerca: quattro secondi di ascolto, poi si ricomincia.
     *
     * **Non finisce mai da solo**, e non è una svista: un computer acceso
     * mentre questa schermata è aperta deve comparire senza che nessuno prema
     * niente. Si ferma uscendo dalla schermata (vedi `mostra`) o bussando.
     */
    private fun cerca() {
        giroScoperta?.cancel()
        giroScoperta = lifecycleScope.launch {
            var primoGiro = true
            while (isActive) {
                val sentiti = Scoperta.cerca(this@MainActivity, 4_000)
                for (c in sentiti) computerTrovati[c.id] = c
                disegnaComputer()
                // Il riquadro che spiega cosa controllare compare **dopo** il
                // primo giro: farlo comparire subito vorrebbe dire dare torto a
                // una rete che stava solo rispondendo con calma.
                if (!primoGiro || computerTrovati.isNotEmpty()) {
                    binding.scopriVuoto.visibility =
                        if (computerTrovati.isEmpty()) View.VISIBLE else View.GONE
                }
                primoGiro = false
                delay(600)
            }
        }
    }

    private fun disegnaComputer() {
        val elenco = binding.elencoComputer
        elenco.removeAllViews()
        for (c in computerTrovati.values) elenco.addView(rigaComputer(c))
    }

    /** Un computer nell'elenco: il nome, la versione, e si tocca per bussare. */
    private fun rigaComputer(c: Scoperta.Computer): View {
        val riga = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.sfondo_carta)
            setPadding(dp(16), dp(14), dp(16), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { bottomMargin = dp(10) }
            isClickable = c.apre
            alpha = if (c.apre) 1f else 0.5f
        }
        riga.addView(TextView(this).apply {
            text = c.nome
            setTextColor(ContextCompat.getColor(this@MainActivity, R.color.testo))
            textSize = 17f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        riga.addView(TextView(this).apply {
            text = buildString {
                append("DaProd Suite ")
                append(c.versione.ifBlank { "?" })
                append(" · ")
                append(c.visto)
                if (!c.apre) {
                    append(" · ")
                    append(getString(R.string.computer_chiuso))
                }
            }
            setTextColor(ContextCompat.getColor(this@MainActivity, R.color.testo_debole))
            textSize = 12f
        })
        if (c.apre) riga.setOnClickListener { bussaA(c) }
        return riga
    }

    /**
     * Bussa, e poi aspetta.
     *
     * Chi bussa non riceve niente subito: riceve un'attesa e un segreto. Il
     * segreto serve a venire a ritirare la risposta — senza, chiunque sulla
     * stessa rete potrebbe prendersi il token di un altro sapendo l'id
     * dell'attesa, che invece compare nel pannello di chi decide.
     */
    private fun bussaA(c: Scoperta.Computer) {
        giroScoperta?.cancel()
        giroScoperta = null
        binding.bloccoAttesa.visibility = View.VISIBLE
        binding.scopriVuoto.visibility = View.GONE
        binding.elencoComputer.visibility = View.GONE
        binding.attesaTitolo.text = getString(R.string.bussato_a, c.nome)

        giroAttesa = lifecycleScope.launch {
            val dove = c.doveBussare
            val bussata = try {
                GatewayClient.bussa(dove, nomeInCorso, comeMiChiamo())
            } catch (e: Exception) {
                smettiDiAspettare()
                avvisa(spiega(e))
                return@launch
            }

            /**
             * Si chiede ogni due secondi, per dieci minuti.
             *
             * Dieci minuti è quanto vive una bussata dall'altra parte: chiedere
             * più a lungo vorrebbe dire aspettare una risposta a una domanda
             * che non esiste più. Uno che non risponde entro dieci minuti non
             * sta rispondendo.
             */
            val fine = System.currentTimeMillis() + 10 * 60_000
            while (isActive && System.currentTimeMillis() < fine) {
                delay(2_000)
                val esito = try {
                    GatewayClient.esitoBussata(dove, bussata.attesa, bussata.segreto)
                } catch (_: Exception) {
                    // Un buco di rete non è un no: si riprova al giro dopo.
                    continue
                }
                when (esito) {
                    is EsitoBussata.Aspetta -> Unit
                    is EsitoBussata.No -> {
                        smettiDiAspettare()
                        avvisa(getString(R.string.bussata_no, c.nome))
                        return@launch
                    }
                    is EsitoBussata.Sparita -> {
                        smettiDiAspettare()
                        avvisa(getString(R.string.bussata_sparita))
                        return@launch
                    }
                    is EsitoBussata.Dentro -> {
                        entraDopoLaBussata(c, esito)
                        return@launch
                    }
                }
            }
            smettiDiAspettare()
        }
    }

    /**
     * Ci hanno fatto entrare: si salva il profilo e si apre la suite.
     *
     * Gli indirizzi si tengono **tutti**: quello da cui è arrivata la risposta
     * (che da questa rete funziona di sicuro) davanti, e dietro quelli che il
     * computer ha annunciato — Tailscale, il tunnel — che servono il giorno
     * che si esce di casa.
     */
    private fun entraDopoLaBussata(c: Scoperta.Computer, esito: EsitoBussata.Dentro) {
        giroAttesa = null
        val indirizzi = (listOf(c.doveBussare) + esito.basi + c.basi).distinct()
        val profilo = Profilo(
            id = UUID.randomUUID().toString(),
            nome = nomeInCorso,
            base = c.doveBussare,
            basi = indirizzi,
            token = esito.token,
            ruolo = esito.ruolo,
            computer = esito.computer,
            ultimoUso = System.currentTimeMillis(),
        )
        Profili.salva(this, profilo)
        nomeInCorso = ""
        binding.elencoComputer.visibility = View.VISIBLE
        binding.bloccoAttesa.visibility = View.GONE
        avvisa("Collegato a ${esito.computer}.")
        entra(profilo)
    }

    /** Smette di aspettare e torna all'elenco, che intanto ricomincia a cercare. */
    private fun smettiDiAspettare() {
        giroAttesa?.cancel()
        giroAttesa = null
        binding.bloccoAttesa.visibility = View.GONE
        binding.elencoComputer.visibility = View.VISIBLE
        if (dove == Dove.SCOPRI) cerca()
    }

    /**
     * Come si chiama questo telefono, per chi deve decidere.
     *
     * Non è il nome della persona — quello lo sceglie lei — è l'apparecchio:
     * «SM-A536B». Serve a distinguere due richieste con lo stesso nome, e a far
     * riconoscere a chi guarda il pannello il telefono che ha in mano.
     */
    private fun comeMiChiamo(): String =
        listOf(Build.MANUFACTURER, Build.MODEL)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .take(60)
            .ifBlank { "un telefono" }

    /* ---------------------------------------------------- accoppiamento */

    private fun apriScanner() {
        nomeInCorso = binding.campoNome.text.toString().trim()
        if (nomeInCorso.isBlank()) {
            avvisa("Scrivi prima come vuoi farti chiamare.")
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
            avvisa("Scrivi prima come vuoi farti chiamare: è il nome che vedranno gli altri.")
            binding.campoNome.requestFocus()
            return
        }
        val codice = binding.campoCodice.text.toString().trim()
        if (codice.length != 8 || !codice.all { it.isDigit() }) {
            avvisa("Il codice è di otto cifre.")
            binding.campoCodice.requestFocus()
            return
        }
        /**
         * **Il codice basta, se si dice anche dove.**
         *
         * Chiesto il 23 agosto 2026: «al primo accesso si può inserire anche il
         * codice, non per forza il QR». Il codice però dice solo *chi sei*, non
         * *a chi bussare*: quello lo portava il QR. C'è una casella per
         * l'indirizzo, già piena con quello dell'ultima volta — e la prima
         * volta si copia dal computer, dove sta scritto sotto al QR.
         */
        val scritto = binding.campoIndirizzo.text.toString().trim().trimEnd('/')
        val indirizzo = when {
            scritto.isBlank() -> Store.base(this)
            scritto.startsWith("http") -> scritto
            // «casa.trycloudflare.com» senza schema: si mette https, che è
            // quello che serve da Internet. Un ip:porta di casa resta http.
            Regex("^\\d{1,3}(\\.\\d{1,3}){3}(:\\d+)?$").matches(scritto) -> "http://$scritto"
            else -> "https://$scritto"
        }
        if (indirizzo.isNullOrBlank()) {
            avvisa("Scrivi anche l'indirizzo del computer: lo trovi sotto al codice, sulla sua schermata.")
            binding.campoIndirizzo.requestFocus()
            return
        }
        connetti(listOf(indirizzo), codice)
    }

    private fun connetti(indirizzi: List<String>, codice: String) {
        val nome = nomeInCorso.ifBlank { Store.nomeProposto() }
        binding.btnConnetti.isEnabled = false
        lifecycleScope.launch {
            try {
                // **Il codice vale una volta sola**: si prova ad accoppiarsi
                // con il primo indirizzo che risponde, e se sbagliassimo a
                // provarne uno morto per primo il codice sarebbe bruciato.
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
                /**
                 * **Il nome già preso non è un errore come gli altri.**
                 *
                 * È l'unico caso in cui la persona deve cambiare una delle due
                 * caselle, e sa già quale. Il messaggio arriva dal computer
                 * scritto in italiano; qui si mette il cursore dove serve
                 * invece di lasciarla a indovinare.
                 */
                val detto = spiega(e)
                if (detto.contains("già di qualcun altro")) {
                    binding.campoNome.requestFocus()
                    binding.campoNome.selectAll()
                }
                avvisa(detto)
            } finally {
                binding.btnConnetti.isEnabled = true
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
     */
    private fun estraiIndirizzi(contenuto: String): List<String> {
        val tutti = mutableListOf<String>()
        Regex("\"basi\"\\s*:\\s*\\[([^\\]]*)]").find(contenuto)?.groupValues?.get(1)?.let { dentro ->
            for (m in Regex("\"([^\"]+)\"").findAll(dentro)) tutti.add(m.groupValues[1])
        }
        estraiBase(contenuto)?.let { tutti.add(it) }
        return tutti.map { it.trim().trimEnd('/') }.filter { it.isNotBlank() }.distinct()
    }

    /** L'indirizzo singolo, come lo portavano la v1 e la v2. */
    private fun estraiBase(contenuto: String): String? {
        val completo = Regex("\"base\"\\s*:\\s*\"([^\"]+)\"").find(contenuto)?.groupValues?.get(1)
            ?: Regex("base=([^&]+)").find(contenuto)?.groupValues?.get(1)
        if (!completo.isNullOrBlank()) {
            return android.net.Uri.decode(completo).trim().trimEnd('/')
        }
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
        deposito = Deposito(this, profilo.id).also { d ->
            servitore = ServitoreOffline(d, codaOffline, profilo.id)
        }
        apriSuite()
        avviaPolling()
    }

    /**
     * Apre la suite. **Sempre la suite**, col computer o senza.
     *
     * Due strade, e la seconda è la novità della 0.7.6:
     *
     * 1. **Il computer risponde**: si carica la sua pagina, e in sottofondo si
     *    aggiorna lo specchio — la pagina stessa, le risposte, i file nuovi.
     * 2. **Il computer non risponde**: si carica la copia tenuta qui, con lo
     *    **stesso indirizzo di base**. È la parte che conta: `localStorage` è
     *    per origine, quindi la pagina ritrova il suo token e non chiede di
     *    rifare l'accesso. Da lì in poi risponde [ServitoreOffline].
     */
    private fun apriSuite(): Job = lifecycleScope.launch {
        val persona = chi ?: return@launch
        val cl = client ?: return@launch

        binding.attesa.visibility = View.VISIBLE
        // **Quale indirizzo risponde adesso**, non quale rispondeva l'altra
        // volta: è tutto il motivo per cui l'app si ricollega da sola.
        val esito = Indirizzi.cerca(persona.basi, persona.base, persona.token)
        binding.attesa.visibility = View.GONE

        /**
         * **«Non risponde» e «non ti conosce» non sono la stessa cosa.**
         *
         * Fino alla 0.7.6 erano trattate uguale: si mostrava la copia offline.
         * Chi era stato tolto dal computer vedeva quindi un'app che sembrava
         * funzionare e non faceva niente, e l'unica idea che veniva era
         * cancellare il profilo e rifare il codice. Adesso si dice cos'è
         * successo, e si offre il gesto giusto.
         */
        if (esito is Indirizzi.Esito.Revocato) {
            diCheEStatoTolto(persona)
            return@launch
        }
        val vivo = (esito as? Indirizzi.Esito.Trovato)?.base
        if (vivo == null) {
            apriDallaCopia(persona)
            return@launch
        }

        if (vivo != persona.base) {
            // Trovato altrove: la prossima volta si parte da qui.
            Profili.ricordaBase(this@MainActivity, persona.id, vivo)
            chi = persona.copy(base = vivo)
            client = GatewayClient(vivo, persona.token)
        }
        var attuale = chi ?: persona

        /**
         * **Dove si fa trovare adesso**, prima di aprire la pagina.
         *
         * L'indirizzo del tunnel cambia a ogni accensione della suite: quello
         * scritto qui dentro è quello di quando si è battuto il codice, e da
         * fuori casa è un indirizzo morto. Appena si arriva al PC — di solito
         * dalla wifi di casa — ci si fa dire i suoi indirizzi di oggi.
         */
        val adesso = (client ?: cl).indirizziDiAdesso()
        if (adesso.isNotEmpty()) {
            Profili.ricordaBasi(this@MainActivity, attuale.id, adesso)
            attuale = attuale.copy(basi = (adesso + attuale.basi).distinct())
            chi = attuale
        }

        stiamoOffline = false
        binding.web.loadUrl(indirizzoDellaPagina(attuale))
        mostra(Dove.SUITE)

        // La coda scritta senza PC parte adesso, che il PC c'è.
        mandaLaCoda(client ?: cl)
        // E si aggiorna lo specchio, senza fretta e senza bloccare niente.
        specchia(attuale)
    }

    /**
     * L'indirizzo con cui si apre la console.
     *
     * Il token viaggia nel **frammento**, dopo il `#`: non viene mandato al
     * server, non finisce nei log e non finisce in un Referer. La pagina lo
     * legge, lo mette da parte e lo cancella dall'indirizzo.
     *
     * `m=telefono` è la novità della 0.7.6: dice alla pagina che faccia avere.
     * È l'unica che lo sa per certo — un tablet largo aprirebbe la faccia da
     * computer, e non sarebbe la sua.
     */
    private fun indirizzoDellaPagina(p: Profilo): String = buildString {
        append(p.base.trimEnd('/'))
        append("/#t=")
        append(android.net.Uri.encode(p.token))
        append("&u=")
        append(android.net.Uri.encode(p.nome))
        append("&m=telefono")
    }

    /**
     * La pagina dalla copia tenuta qui, quando il computer non risponde.
     *
     * `loadDataWithBaseURL` con l'indirizzo vero come base: è quello che fa sì
     * che la pagina resti **la stessa origine** di quando c'era la linea, e
     * quindi ritrovi in `localStorage` il suo token. Senza, si sveglierebbe
     * ogni volta credendo di non essersi mai collegata.
     */
    private fun apriDallaCopia(p: Profilo) {
        val html = deposito?.paginaSalvata()
        if (html.isNullOrBlank()) {
            // Non c'è ancora niente da mostrare: è successo una volta sola, la
            // prima, e si dice cosa fare invece di aprire una pagina vuota.
            AlertDialog.Builder(this)
                .setTitle("Il computer non risponde")
                .setMessage(R.string.senza_copia)
                .setPositiveButton("Riprova") { _, _ -> apriSuite() }
                .setNegativeButton("Va bene", null)
                .show()
            return
        }
        stiamoOffline = true
        binding.web.loadDataWithBaseURL(
            p.base.trimEnd('/') + "/",
            conCredenziale(html, p),
            "text/html",
            "utf-8",
            p.base.trimEnd('/') + "/",
        )
        mostra(Dove.SUITE)
        avvisa(getString(R.string.senza_pc_avviso))
    }

    /**
     * Il computer c'è, e questo collegamento non vale più.
     *
     * Succede per una ragione sola: qualcuno l'ha tolto dal PC. Si dice, e si
     * offrono le due cose che hanno senso — rifare il collegamento con un
     * codice nuovo, o tornare all'elenco delle persone. **Non si cancella
     * niente da soli**: buttare via un profilo senza chiedere è esattamente il
     * genere di gesto che poi non si può disfare.
     */
    private fun diCheEStatoTolto(p: Profilo) {
        AlertDialog.Builder(this)
            .setTitle("«${p.nome}» non è più collegato")
            .setMessage(
                "${p.computer} risponde, ma dice che questo collegamento non vale più: " +
                    "vuol dire che è stato tolto dal computer.\n\n" +
                    "Per rientrare serve un codice nuovo.",
            )
            .setPositiveButton("Rifai il collegamento") { _, _ ->
                nomeInCorso = p.nome
                Profili.rimuovi(this, p.id)
                chi = null
                client = null
                deposito = null
                servitore = null
                polling?.cancel()
                vaiAdEntrare()
            }
            .setNegativeButton("Non adesso") { _, _ ->
                if (Profili.tutti(this).size > 1) {
                    Profili.esci(this)
                    chi = null
                    mostra(Dove.UTENTI)
                } else {
                    apriDallaCopia(p)
                }
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Mette la credenziale dentro la copia, prima che la pagina si svegli.
     *
     * ⚠ **È il pezzo che chiude «devo cancellare l'account e riscannerizzare il
     * codice».** Quando il computer risponde, il token viaggia nel frammento
     * dell'indirizzo; ma una pagina caricata da `loadDataWithBaseURL` un
     * frammento non ce l'ha, e la console si sveglierebbe leggendo un
     * `localStorage` che — se un 401 l'aveva svuotato — è vuoto. Risultato: la
     * schermata d'ingresso, dentro un'app che il codice ce l'ha in tasca.
     *
     * **La credenziale vera vive nel profilo**, che è il posto durevole: il
     * `localStorage` della WebView è solo dove la pagina la tiene a portata di
     * mano. Qui si rimette, con uno script che gira prima del suo.
     */
    private fun conCredenziale(html: String, p: Profilo): String {
        val script = buildString {
            append("<script>try{")
            append("localStorage.setItem('daprod.token',").append(comeStringaJs(p.token)).append(");")
            append("localStorage.setItem('daprod.nome',").append(comeStringaJs(p.nome)).append(");")
            append("localStorage.setItem('daprod.modo','telefono');")
            append("}catch(e){}</script>")
        }
        val dove = html.indexOf("</head>")
        return if (dove >= 0) html.substring(0, dove) + script + html.substring(dove) else script + html
    }

    /**
     * Una stringa che JavaScript legge come tale, qualunque cosa ci sia dentro.
     *
     * I token sono esadecimali e i nomi no: un apice in un nome romperebbe lo
     * script, e uno `</script>` dentro un nome lo chiuderebbe a metà. Si
     * codifica in JSON, che è l'unico modo che non ha casi particolari.
     */
    private fun comeStringaJs(valore: String): String =
        org.json.JSONObject.quote(valore).replace("</", "<\\/")

    /* ------------------------------------------------------- lo specchio */

    /**
     * Tiene qui quello che è arrivato, perché domani ci sia lo stesso.
     *
     * **Non è un backup**: è la memoria di cosa si era visto. Si prende quello
     * che serve a far vivere la pagina senza rete — la pagina stessa, le
     * risposte alle rotte che legge, i file e le anteprime — e nient'altro.
     *
     * Gira in sottofondo e non blocca niente: se va storto, l'unica conseguenza
     * è che la prossima volta senza linea si vede quello di ieri invece che
     * quello di oggi.
     */
    private fun specchia(@Suppress("UNUSED_PARAMETER") p: Profilo) {
        val cl = client ?: return
        val d = deposito ?: return
        lifecycleScope.launch {
            runCatching { d.salvaPagina(cl.paginaConsole()) }

            /**
             * Le rotte che la console legge davvero, e nell'ordine in cui le
             * legge. Le query sono quelle che scrive lei: una risposta salvata
             * con una domanda diversa non le servirebbe.
             */
            val daTenere = listOf(
                "/io",
                "/azioni",
                "/richieste",
                "/invii",
                "/pannello",
                "/macchina",
                "/stato",
                "/preset",
                "/modelli",
                "/libreria?quanti=60&dove=mie",
                "/libreria?quanti=6&dove=mie",
            )
            for (rotta in daTenere) {
                runCatching {
                    val (corpo, mime) = cl.prendiGrezzo(rotta)
                    d.mettiRisposta(rotta, corpo, mime)
                    if (rotta.startsWith("/libreria")) d.ricordaChiaveLibreria(rotta)
                }
            }

            // I file e le anteprime per ultimi: pesano, e il resto della
            // pagina deve essere già a posto prima che si cominci a scaricare.
            portaGiuQuelloCheManca(cl, d)
        }
    }

    /**
     * Scarica quello che non abbiamo ancora: le anteprime di tutto, i file che
     * ci stanno.
     *
     * **L'ordine è quello dell'utilità per byte speso.** Un'anteprima costa
     * decine di KB e trasforma un riquadro nero in una cosa riconoscibile: si
     * prendono tutte. Un file intero costa quanto costa: si prende se sta sotto
     * il tetto del [Deposito], e se non ci sta resta sul computer con la sua
     * anteprima qui — si vede che c'è, e si scarica quando la linea torna.
     */
    private suspend fun portaGiuQuelloCheManca(cl: GatewayClient, d: Deposito) {
        val voci = runCatching { cl.vociDellaLibreria("/libreria?quanti=60&dove=mie") }
            .getOrDefault(emptyList())
        for (v in voci) {
            if (v.anteprima && !d.ceLho(Deposito.anteprimaDi(v.id))) {
                runCatching {
                    val (corpo, mime) = cl.prendiGrezzo("/libreria/anteprima/${GatewayClient.pezzoSicuro(v.id)}")
                    d.mettiFile(Deposito.anteprimaDi(v.id), corpo, mime)
                }
            }
            if (!d.ceLho(v.id) && v.bytes in 1..Deposito.MASSIMO_FILE) {
                runCatching {
                    val (corpo, mime) = cl.prendiGrezzo("/libreria/file/${GatewayClient.pezzoSicuro(v.id)}")
                    d.mettiFile(v.id, corpo, mime)
                }
            }
        }

        // I pensieri: quelli sì, tutti quelli che ci stanno. Sono cose che
        // qualcuno ha mandato apposta a te, ed è la roba che più si vuole
        // ritrovare guardando il telefono in treno.
        val pensieri = runCatching { cl.pensieri() }.getOrDefault(emptyList())
        for (p in pensieri) {
            val chiave = "invio:${p.first}"
            if (d.ceLho(chiave)) continue
            runCatching {
                val (corpo, mime) = cl.prendiGrezzo("/invii/${GatewayClient.pezzoSicuro(p.first)}/file")
                d.mettiFile(chiave, corpo, mime)
            }
        }
    }

    /* ----------------------------------------------------------- la rete */

    @SuppressLint("SetJavaScriptEnabled")
    private fun preparaWeb() {
        val w: WebView = binding.web
        w.setBackgroundColor(getColor(R.color.sfondo))
        w.settings.javaScriptEnabled = true
        // La console tiene il token e le preferenze nel `localStorage`, come fa
        // nel browser di un portatile: senza questo si scollegherebbe a ogni
        // apertura — e senza, la pagina servita dalla copia non saprebbe chi è.
        w.settings.domStorageEnabled = true
        // Un video generato dalla suite deve poter partire con un tocco solo:
        // il gesto lo ha già fatto chi ha premuto play.
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.settings.setSupportZoom(false)

        /**
         * Il ponte verso l'app: **solo quello che una pagina non sa fare.**
         *
         * Portare un file nel telefono, passarlo a un'altra app, ricaricarsi,
         * aggiornarsi, cambiare persona. Tutto il resto lo fa la pagina, ed è
         * giusto così: ogni cosa che passa di qui è una cosa che va tenuta
         * allineata fra due programmi invece che uno.
         */
        w.addJavascriptInterface(
            object {
                @JavascriptInterface
                fun scaricaRisultato(nome: String) {
                    runOnUiThread { portaNelTelefono(nome, "/risultati/${GatewayClient.pezzoSicuro(nome)}", "risultato:$nome") }
                }

                @JavascriptInterface
                fun scaricaLibreria(id: String, nome: String) {
                    runOnUiThread {
                        portaNelTelefono(nome, "/libreria/file/${GatewayClient.pezzoSicuro(id)}", id)
                    }
                }

                @JavascriptInterface
                fun scaricaRegalo(id: String, nome: String) {
                    runOnUiThread {
                        portaNelTelefono(nome, "/invii/${GatewayClient.pezzoSicuro(id)}/file", "invio:$id")
                    }
                }

                /**
                 * Passa una cosa alle altre app del telefono.
                 *
                 * Chiesto il 26 agosto 2026: «poi un pulsante condividi
                 * sull'app». Una pagina web dentro una WebView non può farlo:
                 * `navigator.share` con i file non c'è, e anche ci fosse non
                 * avrebbe il file. Qui invece sì.
                 */
                @JavascriptInterface
                fun condividi(id: String, nome: String) {
                    runOnUiThread {
                        passaAdUnAltraApp(nome, "/libreria/file/${GatewayClient.pezzoSicuro(id)}", id)
                    }
                }

                /**
                 * **Ricarica, e questa volta ricarica davvero.**
                 *
                 * Il poscritto del 26 agosto: «ps: il tasto ricarica non
                 * ricarica». Nel menu vecchio rifaceva il giro degli indirizzi
                 * e poi *forse* riapriva la pagina: quando il computer
                 * rispondeva subito non succedeva niente di visibile, ed era
                 * esattamente il momento in cui uno lo premeva. Adesso
                 * riapre, e se nel frattempo il computer è tornato riapre
                 * quella vera invece della copia.
                 */
                @JavascriptInterface
                fun ricarica() {
                    runOnUiThread { apriSuite() }
                }

                @JavascriptInterface
                fun aggiorna() {
                    runOnUiThread { cercaAggiornamento(dilloSempre = true) }
                }

                @JavascriptInterface
                fun cambiaPersona() {
                    runOnUiThread {
                        Profili.esci(this@MainActivity)
                        chi = null
                        client = null
                        deposito = null
                        servitore = null
                        polling?.cancel()
                        mostra(Dove.UTENTI)
                    }
                }

                /**
                 * La pagina ha preso un 401 e chiede la credenziale indietro.
                 *
                 * ⚠ **La seconda metà della cura**, insieme a `conCredenziale`.
                 * Un 401 non vuol dire per forza «ti ho revocato»: la suite può
                 * essersi appena accesa, o il gateway può essere ripartito in
                 * mezzo a una chiamata. Il token vero ce l'abbiamo noi, nel
                 * profilo: si rimette e si riapre, e se era una scivolata non
                 * se ne accorge nessuno.
                 *
                 * Se invece la revoca era vera, la pagina riprova, prende altri
                 * due 401 e a quel punto **lei** decide di tornare
                 * all'ingresso — con scritto perché.
                 */
                @JavascriptInterface
                fun riprendiCredenziale() {
                    runOnUiThread { apriSuite() }
                }

                /**
                 * Il fotogramma di un video, fatto **dal telefono**.
                 *
                 * ⚠ Chiesto il 26 agosto 2026: «i video su android non mostrano
                 * bene la thumbnail». La causa vera stava sul computer: il
                 * fotogramma lo estrae FFmpeg, e **FFmpeg non e' imbarcato**
                 * nella suite (e' GPL, la suite e' MIT). Chi non ce l'ha
                 * installato vedeva un riquadro con dentro un simbolo.
                 *
                 * Qui c'e' la seconda strada, e non ha bisogno di niente:
                 * Android sa tirare fuori un fotogramma da un video da solo
                 * (`MediaMetadataRetriever`). Se il video e' nello specchio —
                 * e ci sta, sotto i quaranta mega — il fotogramma si fa qui,
                 * subito, e funziona anche senza linea.
                 *
                 * Torna una `data:` URL, che la pagina mette dritta in un `img`.
                 * Stringa vuota vuol dire: non ce l'ho, arrangiati con quello
                 * che ti manda il computer.
                 */
                @JavascriptInterface
                fun anteprimaVideo(id: String): String = fotogrammaDaQui(id)

                /** Vero se il file di questa cosa e' gia' nel telefono. */
                @JavascriptInterface
                fun ceLHoQui(id: String): Boolean = deposito?.ceLho(id) == true

                /**
                 * La pagina dice che sta suonando qualcosa (o che ha smesso).
                 *
                 * **È la sola cosa che l'app fa per la musica**, e basta a
                 * curare il difetto del 5 settembre 2026 — «fare in modo che la
                 * riproduzione continui anche se minimizzato». Il suono resta
                 * dov'era, dentro la pagina, che è l'unico posto da cui il
                 * visualizer può sentirlo; quello che manca a una pagina è il
                 * **permesso di restare viva**, e quello lo dà un servizio in
                 * primo piano. Vedi [Lettore].
                 *
                 * Arriva dal thread della WebView, non da quello dell'interfaccia:
                 * far partire un servizio da lì funziona, ma tutto quello che
                 * tocca le view va rimandato — ed è il motivo del `runOnUiThread`.
                 */
                @JavascriptInterface
                fun suonando(sta: Boolean, titolo: String, chi: String) {
                    runOnUiThread {
                        staSuonando = sta
                        if (sta) Lettore.suona(this@MainActivity, titolo, chi, true)
                        else Lettore.basta(this@MainActivity)
                    }
                }
            },
            "DaProdApp",
        )

        /**
         * Il selettore dei file, che senza questo non si apre.
         *
         * Vedi [attesaFile] per il perché per esteso. In due righe: la foto del
         * profilo e il caricare in bacheca passano da un `<input type="file">`
         * della pagina, e una WebView senza `WebChromeClient` quelle richieste
         * le butta via senza dirlo a nessuno.
         */
        w.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                chiAspetta: ValueCallback<Array<Uri>>?,
                comeLoVuole: FileChooserParams?,
            ): Boolean {
                // Se ne era rimasto uno appeso — si tocca due volte, capita —
                // gli si risponde adesso: quell'input altrimenti resta morto.
                nessunFileScelto()
                val intento = comeLoVuole?.createIntent() ?: return false
                attesaFile = chiAspetta
                return try {
                    scegliUnFile.launch(intento)
                    true
                } catch (_: Exception) {
                    // Nessuna app che sappia scegliere file: si dice di no alla
                    // pagina invece di lasciarla ad aspettare.
                    attesaFile = null
                    avvisa("Su questo telefono non trovo un'app per scegliere i file.")
                    false
                }
            }
        }

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
                request: WebResourceRequest?,
            ): Boolean {
                val chiesto = request?.url?.toString() ?: return true
                val nostri = (chi?.basi.orEmpty() + listOfNotNull(chi?.base))
                    .map { it.trimEnd('/') }
                    .filter { it.isNotBlank() }
                return nostri.none { chiesto.startsWith(it) }
            }

            /**
             * **Quando il computer non c'è, rispondiamo noi.**
             *
             * È il cuore della 0.7.6 lato telefono, e sta in quattro righe: la
             * pagina fa le sue domande come sempre, e se siamo offline le
             * esaudisce [ServitoreOffline] leggendo dallo specchio. La pagina
             * non sa di stare parlando con qualcun altro, e non deve saperlo:
             * il giorno che il computer impara una rotta nuova, questa app non
             * cambia di una riga.
             */
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?,
            ): WebResourceResponse? {
                if (!stiamoOffline || request == null) return null
                val nostro = (chi?.basi.orEmpty() + listOfNotNull(chi?.base))
                    .map { it.trimEnd('/') }
                    .any { it.isNotBlank() && request.url.toString().startsWith(it) }
                if (!nostro) return null
                return servitore?.rispondi(request)
            }

            /**
             * Se cade la pagina principale si passa alla copia.
             *
             * Un'immagine che non arriva non è un motivo per cambiare tutto:
             * conta solo il frame principale, che è la pagina stessa.
             */
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: android.webkit.WebResourceError?,
            ) {
                if (request?.isForMainFrame != true) return
                if (stiamoOffline) return
                chi?.let { apriDallaCopia(it) }
            }
        }
    }

    /* ----------------------------------------------------------- il menu */

    /**
     * Il menu dei tre puntini, ridotto all'osso.
     *
     * Quasi tutto quello che c'era è finito nelle **impostazioni della
     * pagina**, dove è stato chiesto che stesse: ricarica, come siamo messi,
     * aggiungi una persona, aggiorna l'app, scollegati. Qui restano le due
     * cose che si fanno **fuori** dalla suite, cioè quando quella rotella non
     * c'è: cambiare persona e aggiungerne una.
     */
    private fun apriMenu() {
        val menu = PopupMenu(this, binding.btnMenu)
        if (Profili.tutti(this).size > 1) menu.menu.add(0, 1, 0, R.string.menu_cambia)
        menu.menu.add(0, 2, 1, R.string.aggiungi_persona)
        menu.menu.add(0, 3, 2, R.string.menu_aggiorna)
        // Solo se il risparmio è ancora acceso: una voce di menu che non fa
        // niente è peggio di una voce che non c'è.
        if (!senzaRisparmioBatteria()) menu.menu.add(0, 4, 3, R.string.menu_batteria)

        menu.setOnMenuItemClickListener { voce ->
            when (voce.itemId) {
                1 -> {
                    Profili.esci(this)
                    chi = null
                    client = null
                    deposito = null
                    servitore = null
                    polling?.cancel()
                    mostra(Dove.UTENTI)
                }
                2 -> vaiAdEntrare()
                3 -> cercaAggiornamento(dilloSempre = true)
                4 -> spiegaLaBatteria()
            }
            true
        }
        menu.show()
    }

    /* ---------------------------------------------------------- batteria */

    /**
     * Vero se Android ha smesso di mettere a dormire questa app.
     *
     * È l'altra metà del ritardo delle notifiche, e non si può sistemare dal
     * codice: Doze è una scelta del telefono, e toglierne un'app è una scelta
     * di chi lo usa. Quello che si può fare è **dirglielo, una volta, con
     * parole sue**, e portarlo dove si preme — invece di lasciarlo a pensare
     * che l'app sia rotta.
     */
    private fun senzaRisparmioBatteria(): Boolean = try {
        val gestore = getSystemService(android.os.PowerManager::class.java)
        gestore?.isIgnoringBatteryOptimizations(packageName) == true
    } catch (_: Exception) {
        // Un telefono che non sa rispondere: si fa finta di sì e non si
        // propone niente. Meglio non chiedere che chiedere per sbaglio.
        true
    }

    private fun spiegaLaBatteria() {
        AlertDialog.Builder(this)
            .setTitle(R.string.batteria_titolo)
            .setMessage(R.string.batteria_spiega)
            .setPositiveButton(R.string.batteria_vai) { _, _ ->
                try {
                    /**
                     * L'elenco delle app, non la richiesta diretta.
                     *
                     * `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` mostrerebbe
                     * un sì/no in un colpo solo, e vorrebbe un permesso che
                     * esiste apposta per essere guardato con sospetto. Questa
                     * apre la stessa schermata delle impostazioni: un passaggio
                     * in più, e nessun permesso da chiedere per una cosa che
                     * deve restare una scelta di chi usa il telefono.
                     */
                    startActivity(
                        Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                    )
                } catch (_: Exception) {
                    avvisa("Su questo telefono quella schermata non si apre da qui.")
                }
            }
            .setNegativeButton(R.string.batteria_no, null)
            .show()
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
        // Solo le proprie: sullo stesso telefono ci possono essere le richieste
        // di un'altra persona, e partiranno con il suo collegamento.
        for (voce in codaOffline.sue(chi?.id ?: "")) {
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
            avvisa("Quello che avevi chiesto senza computer è partito.")
            binding.web.reload()
        }
    }

    /* --------------------------------------------------------- scaricare */

    /**
     * Un fotogramma da un video che abbiamo qui, come `data:` URL.
     *
     * **Il secondo secondo, non il primo.** Quasi tutte le clip generate
     * cominciano da un nero o da una dissolvenza: il fotogramma zero e'
     * esattamente il rettangolo nero che stiamo cercando di togliere.
     *
     * Il risultato si tiene nello specchio come qualunque altra anteprima: un
     * `MediaMetadataRetriever` su un video da trenta mega costa qualche decimo
     * di secondo, e una galleria che ne apre dodici scorrendo li sentirebbe
     * tutti.
     */
    private fun fotogrammaDaQui(id: String): String {
        val d = deposito ?: return ""
        // Gia' fatto un'altra volta? Allora e' li'.
        d.fileSalvato(Deposito.anteprimaDi(id))?.let { (byte, mime) ->
            if (mime.startsWith("image/")) return "data:" + mime + ";base64," + base64Di(byte)
        }

        val (video, _) = d.fileSalvato(id) ?: return ""
        return try {
            // `MediaMetadataRetriever` vuole un file o un descrittore: i byte in
            // memoria non li prende. Una copia nella cache, e via.
            val temporaneo = File(cacheDir, "fotogramma.tmp")
            temporaneo.writeBytes(video)
            val lettore = android.media.MediaMetadataRetriever()
            lettore.setDataSource(temporaneo.absolutePath)
            val quadro = lettore.getFrameAtTime(
                2_000_000L,
                android.media.MediaMetadataRetriever.OPTION_CLOSEST_SYNC,
            ) ?: lettore.frameAtTime
            lettore.release()
            temporaneo.delete()
            if (quadro == null) return ""

            val fuori = java.io.ByteArrayOutputStream()
            quadro.compress(android.graphics.Bitmap.CompressFormat.JPEG, 78, fuori)
            quadro.recycle()
            val byte = fuori.toByteArray()
            d.mettiFile(Deposito.anteprimaDi(id), byte, "image/jpeg")
            "data:image/jpeg;base64," + base64Di(byte)
        } catch (_: Exception) {
            // Formato che Android non decodifica, memoria finita: si torna al
            // riquadro col simbolo, che e' quello che c'era prima.
            ""
        }
    }

    private fun base64Di(byte: ByteArray): String =
        android.util.Base64.encodeToString(byte, android.util.Base64.NO_WRAP)

    /**
     * Porta un file dentro il telefono.
     *
     * Un'immagine finisce in galleria, un video in galleria, un brano fra la
     * musica: sotto «DaProd Suite», dove poi si ritrovano senza riaprire l'app.
     *
     * **Funziona anche senza computer**, ed è una delle cose chieste: «tutto
     * quello che si riceve automaticamente viene salvato offline, poi se uno
     * vuole li può salvare in galleria». Se il file è nello specchio si prende
     * da lì, e la rete non serve.
     */
    private fun portaNelTelefono(nome: String, rotta: String, chiaveLocale: String) {
        avvisa("Lo sto salvando…")
        lifecycleScope.launch {
            try {
                val (byte, mime) = prendiIByte(rotta, chiaveLocale)
                val dove = Scarica.salva(this@MainActivity, nome, mimeBuono(mime, nome), byte)
                avvisa("Salvato in $dove.")
            } catch (e: Exception) {
                avvisa(spiega(e))
            }
        }
    }

    /**
     * Passa un file a un'altra app: WhatsApp, la posta, quello che c'è.
     *
     * Se ne fa una copia nella cache condivisa e si consegna quella: da Android
     * 7 un file non si passa più come percorso, e la galleria di sistema non è
     * un posto da cui si possa consegnare qualcosa a nome nostro.
     */
    private fun passaAdUnAltraApp(nome: String, rotta: String, chiaveLocale: String) {
        lifecycleScope.launch {
            try {
                val (byte, mime) = prendiIByte(rotta, chiaveLocale)
                val cartella = File(cacheDir, "condivisi").apply { mkdirs() }
                // Una cartella che si svuota da sé: un file condiviso ieri non
                // serve più a nessuno, e la cache non è un archivio.
                cartella.listFiles()?.forEach { runCatching { it.delete() } }
                val file = File(cartella, nome.replace(Regex("[\\\\/:*?\"<>|]"), "_"))
                file.writeBytes(byte)

                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "$packageName.file",
                    file,
                )
                val intento = Intent(Intent.ACTION_SEND).apply {
                    type = mimeBuono(mime, nome)
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intento, getString(R.string.condividi_con)))
            } catch (e: Exception) {
                avvisa(spiega(e))
            }
        }
    }

    /**
     * I byte di una cosa: dallo specchio se ci sono, dal computer se no.
     *
     * Prima lo specchio, e non è pigrizia: è istantaneo, non consuma dati, e
     * funziona in metropolitana. Il computer è la seconda strada, non la prima.
     */
    private suspend fun prendiIByte(rotta: String, chiaveLocale: String): Pair<ByteArray, String> {
        deposito?.fileSalvato(chiaveLocale)?.let { return it }
        val cl = client ?: throw GatewayException("Serve il computer per prenderlo.")
        val preso = cl.prendiGrezzo(rotta)
        // Già che c'è, resta: la seconda volta non si scarica più.
        deposito?.mettiFile(chiaveLocale, preso.first, preso.second)
        return preso
    }

    /**
     * Il tipo del file: quello che dice il computer, o quello dell'estensione.
     *
     * Serve al telefono per sapere in che collezione metterlo. Un
     * `application/octet-stream` finirebbe nei Download anche se è una foto.
     */
    private fun mimeBuono(dallaRete: String, nome: String): String {
        val pulito = dallaRete.substringBefore(";").trim()
        if (pulito.isNotBlank() && pulito != "application/octet-stream") return pulito
        return when (nome.substringAfterLast('.', "").lowercase()) {
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
    }

    /* ------------------------------------------------------------- polling */

    /**
     * Le notifiche mentre l'app è davanti.
     *
     * Con l'app chiusa il lavoro lo fa `SyncWorker`, che passa ogni quarto
     * d'ora: è lui che porta la notifica ore dopo. Questo qui serve a chi sta
     * guardando lo schermo mentre il PC lavora — e a riaccorgersi che il PC è
     * tornato, quando si sta guardando la copia.
     */
    private fun avviaPolling() {
        polling?.cancel()
        polling = lifecycleScope.launch {
            while (isActive) {
                delay(20_000)
                controllaNotifiche()
                if (dove == Dove.SUITE && stiamoOffline) apriSuite()
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
            // Una notifica vuol quasi sempre dire «c'è una cosa nuova»: è il
            // momento buono per portarsela qui, mentre la linea c'è.
            chi?.let { specchia(it) }
        } catch (_: Exception) {
            // Offline: al giro dopo.
        }
    }

    /* ------------------------------------------------- aggiornare l'app */

    /**
     * Cerca una versione nuova.
     *
     * `dilloSempre` è la differenza fra il giro automatico e il tasto: premendo
     * **Aggiorna l'app** si vuole una risposta comunque, anche «sei già a
     * posto»; all'avvio no, o sarebbe un messaggio a ogni apertura.
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

    private fun dp(quanti: Int): Int = (quanti * resources.displayMetrics.density).toInt()

    /** Il messaggio del gateway se c'è, altrimenti quello che serve sapere. */
    private fun spiega(e: Exception): String =
        (e as? GatewayException)?.message
            ?: "Non riesco a raggiungere il computer. È acceso, con la suite aperta?"

    private fun avvisa(testo: String) {
        Toast.makeText(this, testo, Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        // Un riferimento statico a un'activity morta è la perdita di memoria
        // più classica che ci sia: si toglie qui, e da quel momento un tasto
        // premuto nella tendina non fa niente invece di far cadere l'app.
        Lettore.comandi = null
        Lettore.basta(this)
        super.onDestroy()
        polling?.cancel()
        // Un `ValueCallback` che non riceve mai risposta tiene bloccato il suo
        // `<input>`: se l'activity muore con una scelta a metà, si chiude qui.
        nessunFileScelto()
    }
}
