/**
 * Il copione, prima parte: chi siamo, come si parla col computer, come si entra.
 *
 * Qui dentro c'è tutto quello che gli altri pezzi danno per scontato: le
 * variabili condivise, la funzione che chiama il gateway, l'ingresso, la
 * navigazione fra le cinque schede, il semaforo in cima alla Casa.
 *
 * **Il `modo` si decide qui, una volta sola.** È la cosa nuova della 0.7.6 e
 * la ragione per cui esiste: `telefono` è la faccia di chi fa una cosa,
 * `computer` è la faccia di chi governa la macchina. Vedi l'intestazione di
 * `index.ts` per il perché.
 *
 * ⚠ **Niente backtick e niente template literal in questo file dentro la
 * stringa**: questa stringa *è* un template literal, e un backtick la
 * chiuderebbe. Le stringhe si concatenano con `+`.
 */
export const COPIONE_BASE = `
  var CHIAVE = "daprod.token";
  var CHIAVE_NOME = "daprod.nome";
  var CHIAVE_MODO = "daprod.modo";
  var $ = function (id) { return document.getElementById(id); };

  var token = localStorage.getItem(CHIAVE) || "";
  var ioNome = localStorage.getItem(CHIAVE_NOME) || "";
  /** L'id di questo dispositivo: serve a non offrire di cambiare permesso a sé stessi. */
  var ioId = "";
  var ioFoto = "";
  var ioMotto = "";
  var puoiDecidere = false;
  var azioni = [];
  var scelta = null;
  var flusso = null;
  var pagina = "casa";
  var filtro = "";
  var pannello = null;
  var macchina = null;
  var suite = null;
  var richieste = [];
  var orologioInvito = null;
  /** Galleria: le proprie cose, oppure i pensieri arrivati. */
  var dove = "mie";
  /** Riepilogo: quelli che stanno lavorando, quelli finiti, o quelli messi via. */
  var filtroLavori = "vivi";
  /** I modi di generare messi da parte, come li tiene il computer. */
  var preset = [];
  /** Se c'è qualcuno a cui chiedere di scrivere. Vuoto vuol dire di sì. */
  var aiMotivo = "non lo so ancora";
  /** I pensieri arrivati, e quale pacco è aperto adesso. */
  var regali = [];
  var paccoAperto = null;
  /** La chiacchierata in corso, se ce n'è una. */
  var sessione = null;
  var orologioChiacchiera = null;
  /** La bacheca di DaProd, e da che filtro la si guarda. */
  var inBacheca = [];
  var filtroBacheca = "";

  /**
   * **Chi sta guardando, e con che faccia.**
   *
   * - \`telefono\`: la faccia di chi fa una cosa. Niente quadrati della rete,
   *   niente elenco dei collegati, niente azioni di servizio.
   * - \`computer\`: la faccia di chi governa. Tutto, comprese le azioni che
   *   leggono la libreria e raccontano lo stato della suite.
   *
   * Lo dice l'app del telefono nel frammento (\`m=telefono\`), perché è l'unica
   * che lo sa per certo. Se non lo dice nessuno si guarda la larghezza dello
   * schermo, che è un indizio e non una prova, ma è meglio di niente — e
   * comunque \`sonoLaCasa\` decide da solo la parte che conta davvero, cioè gli
   * interruttori della macchina.
   */
  var modo = "computer";

  /** Vero solo dentro DaProdConnessione: il computer che ospita tutto. */
  var sonoLaCasa = false;

  /**
   * Il token, il nome e il modo possono arrivare dall'indirizzo.
   *
   * È così che aprono questa pagina l'app del telefono e DaProdConnessione: si
   * sono accoppiati loro, e passano quello che hanno ottenuto. Sta nel
   * **frammento** (dopo il #) di proposito: il frammento non viene mandato al
   * server, non finisce nei log e non finisce in un Referer. Letto una volta,
   * si cancella dall'indirizzo.
   */
  (function dallIndirizzo() {
    /**
     * Il modo, in tre gradi di certezza.
     *
     * 1. **quello che ha detto l'app**, che è l'unica a saperlo per certo;
     * 2. **quello che ha detto l'ultima volta**, tenuto da parte — serve quando
     *    la pagina si apre dalla copia tenuta nel telefono, che un frammento
     *    non ce l'ha;
     * 3. **la larghezza dello schermo**, che è un indizio e non una prova.
     */
    modo = window.innerWidth < 760 ? "telefono" : "computer";
    var ricordato = localStorage.getItem(CHIAVE_MODO);
    if (ricordato === "telefono" || ricordato === "computer") modo = ricordato;

    if (!location.hash) return;
    var pezzi = new URLSearchParams(location.hash.slice(1));
    var t = pezzi.get("t");
    var u = pezzi.get("u");
    var m = pezzi.get("m");
    if (t) { token = t; localStorage.setItem(CHIAVE, t); }
    if (u) { ioNome = u; localStorage.setItem(CHIAVE_NOME, u); }
    if (m === "telefono" || m === "computer") {
      modo = m;
      localStorage.setItem(CHIAVE_MODO, m);
    }
    history.replaceState(null, "", location.pathname);
  })();

  var suTelefono = function () { return modo === "telefono"; };

  /* ------------------------------------------------------------- chiamate */

  async function chiama(percorso, opzioni) {
    opzioni = opzioni || {};
    var testate = { "Content-Type": "application/json" };
    if (token) testate.Authorization = "Bearer " + token;

    var risposta = await fetch(percorso, {
      method: opzioni.method || "GET",
      body: opzioni.body,
      headers: testate,
    });
    var testo = await risposta.text();
    var corpo = null;
    try { corpo = testo ? JSON.parse(testo) : null; } catch (e) { corpo = null; }
    if (!risposta.ok) {
      if (risposta.status === 401) perdutaLaCredenziale();
      throw new Error((corpo && corpo.errore) || ("Errore " + risposta.status));
    }
    // Una risposta buona azzera il conto: quello che conta sono i 401 **di
    // fila**, non i 401 in assoluto.
    quantiNo = 0;
    return corpo;
  }

  /** Quanti 401 di fila abbiamo preso. Uno solo non vuol dire niente. */
  var quantiNo = 0;

  /**
   * Il computer dice che non ci conosce. **Non è detto che abbia ragione.**
   *
   * ⚠ Questo pezzo è la seconda metà della cura al difetto più fastidioso della
   * 0.7.6: «quando chiudo e apro l'app spesso devo cancellare l'account e
   * riscannerizzare il codice».
   *
   * Prima bastava **un** 401 e si buttava via il token da \`localStorage\`. Un
   * 401 però capita anche per ragioni che non sono «ti ho revocato»: la suite
   * si sta ancora accendendo, la pagina è stata riaperta da una copia mentre il
   * computer tornava, una chiamata è partita nel mezzo di un riavvio del
   * gateway. E buttato il token, dentro l'app non c'era più modo di rientrare —
   * la pagina servita dalla copia non ha il frammento con la credenziale —
   * quindi l'unica strada sembrava rifare il codice.
   *
   * Adesso:
   *
   * 1. **si chiede all'app di rimetterlo.** La credenziale vera vive nel
   *    profilo del telefono, che è il posto durevole: \`localStorage\` è solo
   *    dove la pagina la tiene a portata di mano. Se l'app c'è, la rimette.
   * 2. **si insiste tre volte** prima di credere che sia una revoca vera.
   * 3. **e anche allora non si butta niente in silenzio**: si torna alla
   *    pagina d'ingresso con scritto cosa è successo.
   */
  function perdutaLaCredenziale() {
    quantiNo += 1;

    if (window.DaProdApp && window.DaProdApp.riprendiCredenziale && quantiNo <= 3) {
      // L'app rimette il token e ricarica: se era una scivolata, da qui in poi
      // non se ne accorge nessuno.
      window.DaProdApp.riprendiCredenziale();
      return;
    }
    if (quantiNo < 3) return;
    scollega(true);
  }

  /**
   * Pianta il biscotto di sessione.
   *
   * Serve a una cosa sola e non se ne può fare a meno: un tag img o video non
   * sa mettere l'header con la credenziale. Senza, la galleria dovrebbe
   * scaricare ogni file in memoria per mostrarlo — niente anteprime pigre,
   * niente barra di scorrimento su un video da cento MB.
   *
   * Il gateway lo accetta **solo in lettura** e lo marca SameSite=Strict.
   */
  async function piantaSessione() {
    try { await chiama("/sessione", { method: "POST", body: "{}" }); } catch (e) { /* si vedrà */ }
  }

  /* -------------------------------------------------------- accoppiamento */

  async function collega() {
    var codice = $("codice").value.trim();
    var nome = $("nome").value.trim();
    var avviso = $("avviso-entra");
    avviso.className = "avviso";
    if (!nome) {
      avviso.textContent = "Scrivi come vuoi farti chiamare: è il nome che si vedrà accanto a quello che fai.";
      avviso.className = "avviso male";
      $("nome").focus();
      return;
    }
    if (!/^\\d{8}$/.test(codice)) {
      avviso.textContent = "Il codice è di otto cifre, senza spazi.";
      avviso.className = "avviso male";
      $("codice").focus();
      return;
    }
    $("collega").disabled = true;
    $("collega").textContent = "un attimo…";
    try {
      var esito = await chiama("/accoppiamento", {
        method: "POST",
        body: JSON.stringify({ codice: codice, nome: nome }),
      });
      token = esito.token;
      ioNome = nome;
      localStorage.setItem(CHIAVE, token);
      localStorage.setItem(CHIAVE_NOME, nome);
      await entra();
    } catch (e) {
      /**
       * **Il nome già preso non è un errore come gli altri.**
       *
       * È l'unico caso in cui la persona deve cambiare una delle due caselle, e
       * sa già quale: il messaggio arriva dal gateway scritto in italiano
       * («"Marco" è già di qualcun altro»), e si mette il cursore dove serve
       * invece di lasciarla a cercare quale delle due riscrivere.
       */
      if (/gi\\u00e0 di qualcun altro/.test(e.message)) {
        $("nome").focus();
        $("nome").select();
      }
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("collega").disabled = false;
      $("collega").textContent = "Entra";
    }
  }

  function scollega(automatico) {
    token = "";
    quantiNo = 0;
    localStorage.removeItem(CHIAVE);
    // Il **nome** resta: chi rientra deve ribattere otto cifre, non anche
    // ricordarsi come si era chiamato. Ed è anche l'unico nome che gli sarà
    // permesso riusare, visto che è già suo.

    if (flusso) { flusso.close(); flusso = null; }
    chiudiFoglio();
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("pag-entra").classList.add("on");
    $("fondo").hidden = true;
    $("chi").hidden = true;
    $("apri-impostazioni").hidden = true;
    $("nome").value = ioNome;
    if (automatico) {
      var avviso = $("avviso-entra");
      avviso.textContent = "Il computer non ci riconosce più: fatti dare un codice nuovo.";
      avviso.className = "avviso male";
    }
  }

  /* ---------------------------------------------------------- navigazione */

  function vaiA(quale) {
    pagina = quale;
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    var sezione = $("pag-" + quale);
    if (sezione) sezione.classList.add("on");
    for (var b of document.querySelectorAll("nav.fondo button")) {
      b.classList.toggle("on", b.dataset.pagina === quale);
    }
    window.scrollTo({ top: 0 });
    if (quale === "galleria") leggiGalleria();
    if (quale === "daprod") leggiBacheca();
    // Chi apre LM Studio a suite gia' accesa deve ritrovare i tasti accesi
    // senza riaprire niente: si richiede quando si va dove servono.
    if (quale === "produzione" || quale === "riepilogo") void guardaAi();
    if (quale === "produzione") void leggiModelli();
  }

  /** C'e' qualcuno a cui chiedere di scrivere? Vuoto vuol dire di si'. */
  async function guardaAi() {
    try {
      var ai = await chiama("/ai");
      aiMotivo = ai && ai.ok ? "" : (ai && ai.motivo) || "";
    } catch (e) { /* si riprova la prossima volta */ }
  }

  /* --------------------------------------------------------- la macchina */

  /**
   * Com'è messo il computer: chi lavora, chi aspetta, e le regole.
   *
   * Si legge a ogni spinta dello stato vivo, come tutto il resto. Serve a tre
   * posti diversi — la fascia della pausa in Casa, le strisce del Riepilogo,
   * gli interruttori nelle impostazioni — che senza questa chiamata
   * racconterebbero tre versioni diverse della stessa cosa.
   */
  async function leggiMacchina() {
    try {
      macchina = await chiama("/macchina");
    } catch (e) {
      macchina = null;
      return;
    }
    sonoLaCasa = macchina.sonoLaCasa === true;
    disegnaPausa();
    disegnaStrisce();
  }

  /**
   * La fascia gialla: **il computer è in pausa**.
   *
   * Senza, dal telefono si vedrebbe solo una richiesta che non parte, e non
   * c'è niente di peggio di un programma che non fa una cosa senza dire
   * perché. Chi sta al computer la vede uguale: è lui che l'ha messa, ma se ne
   * dimentica.
   */
  function disegnaPausa() {
    var fascia = $("fascia-pausa");
    if (!macchina || !macchina.inPausa) { fascia.hidden = true; return; }
    fascia.hidden = false;
    $("pausa-perche").textContent = sonoLaCasa
      ? "L'hai messa tu: i lavori nuovi aspettano. Si toglie dalle impostazioni."
      : "Chi ci sta davanti lo sta usando: quello che chiedi aspetta il suo turno.";
  }

  /* ------------------------------------------------------- il semaforo */

  /**
   * La risposta alla sola domanda che conta: **funziona?**
   *
   * Non un elenco di spie da interpretare: una frase, e se qualcosa non va il
   * tasto per rimediare accanto. L'ordine dei controlli è quello di quanto
   * fanno male: senza gateway non funziona niente, col firewall chiuso non
   * arriva nessuno, senza Tailscale né tunnel funziona solo in casa.
   *
   * **Dal telefono si dice un'altra cosa**, e non è una bugia gentile: chi
   * guarda dal telefono *sta già parlando col computer* — la pagina gliel'ha
   * servita lui — quindi «da fuori non ci si arriva» sarebbe falso proprio per
   * chi lo legge. A lui interessa un'altra domanda: il computer sta lavorando?
   */
  function disegnaSemaforo() {
    if (!pannello) return;
    var box = $("semaforo");
    var tasto = $("semaforo-tasto");
    tasto.hidden = true;
    box.className = "semaforo bene";
    $("semaforo-faccia").textContent = "\\u2713";

    if (suTelefono() && !sonoLaCasa) { semaforoDelTelefono(box); return; }

    var fuoriCasa = pannello.indirizzi.some(function (i) { return i.dove === "ovunque"; });
    /**
     * Il firewall conta **anche con Tailscale**, e per un pelo non me ne
     * accorgevo: una regola di Windows vale per la porta, non per la scheda di
     * rete da cui si arriva, quindi blocca allo stesso modo chi entra dalla
     * wifi e chi entra dalla rete virtuale. L'unico che lo scavalca è il
     * tunnel, perché quella connessione **esce** dal computer invece di
     * entrarci: quando è acceso, la porta chiusa non fa alcun danno.
     */
    var passaDalTunnel = pannello.tunnel.fase === "acceso";

    if (pannello.tunnel.fase === "scarico" || pannello.tunnel.fase === "accendo") {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "\\u22EF";
      $("semaforo-titolo").textContent = "Sto aprendo la strada da fuori";
      $("semaforo-perche").textContent =
        pannello.tunnel.fase === "scarico"
          ? "Scarico quello che serve, una volta sola" +
            (pannello.tunnel.quota ? " \\u2014 " + Math.round(pannello.tunnel.quota * 100) + "%" : "") + "\\u2026"
          : "Ci vuole qualche secondo.";
      return;
    }

    if (pannello.firewall && !pannello.firewall.aperta && !pannello.firewall.incerto && !passaDalTunnel) {
      box.className = "semaforo male";
      $("semaforo-faccia").textContent = "\\u2715";
      $("semaforo-titolo").textContent = "Windows sta bloccando";
      $("semaforo-perche").textContent =
        "Il computer risponde, ma il firewall non lascia entrare nessuno dalla rete. " +
        "\\u00c8 il motivo per cui dal telefono sembra spento.";
      if (pannello.puoiDecidere) {
        tasto.hidden = false;
        tasto.textContent = "Sblocca";
        tasto.onclick = sbloccaLaPorta;
      }
      return;
    }

    if (pannello.tunnel.fase === "guasto") {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "!";
      $("semaforo-titolo").textContent = "In casa funziona, fuori no";
      $("semaforo-perche").textContent = pannello.tunnel.motivo || "La strada da fuori non si \\u00e8 aperta.";
      return;
    }

    /**
     * **Quello che conta è arrivarci da fuori.**
     *
     * Chiesto il 23 agosto 2026: «l'app connessione deve funzionare solo su
     * internet, non ci interessa su lan». Quindi la rete di casa non è più una
     * risposta: se da fuori non ci si arriva il semaforo non è verde, anche se
     * in salotto funziona tutto.
     */
    if (!fuoriCasa) {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "!";
      $("semaforo-titolo").textContent = "Da fuori casa non ci si arriva";
      $("semaforo-perche").textContent =
        "Adesso questo computer risponde solo dalla rete di casa. Apri la strada da " +
        "Internet, oppure accendi Tailscale su tutti e due i dispositivi.";
      if (pannello.puoiDecidere) {
        tasto.hidden = false;
        tasto.textContent = "Apri la strada";
        tasto.onclick = cambiaTunnel;
      }
      return;
    }

    $("semaforo-titolo").textContent = "Tutto a posto, anche fuori casa";
    $("semaforo-perche").textContent = "Questo computer si raggiunge da qualunque rete.";
  }

  /**
   * Il semaforo come lo vede chi sta al telefono.
   *
   * Non parla di firewall né di tunnel: quello che serve sapere, da qui, è se
   * il computer sta facendo qualcosa e se la propria roba è in fila. Il resto
   * sono cose che si aggiustano stando davanti a quella macchina.
   */
  function semaforoDelTelefono(box) {
    var quanti = macchina && macchina.fila ? macchina.fila.length : 0;
    var adesso = macchina && macchina.adesso;

    if (macchina && macchina.inPausa) {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "\\u23F8";
      $("semaforo-titolo").textContent = "Il computer \\u00e8 occupato";
      $("semaforo-perche").textContent =
        "Chi ci sta davanti lo sta usando. Puoi chiedere lo stesso: parte appena si libera.";
      return;
    }
    if (adesso) {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "\\u22EF";
      $("semaforo-titolo").textContent = "Il computer sta lavorando";
      $("semaforo-perche").textContent =
        adesso.che + (quanti ? " \\u00b7 e dietro ce ne sono " + quanti : "");
      return;
    }
    $("semaforo-titolo").textContent = "Il computer \\u00e8 libero";
    $("semaforo-perche").textContent = "Quello che chiedi adesso parte subito.";
  }

  /* --------------------------------------------------------- i numeri */

  /**
   * I quadrati con i numeri, in Casa.
   *
   * **Da utente, sul telefono, non ci sono.** Chiesto il 26 agosto 2026: «la
   * schermata casa su android, quando sei utente, non vedi gli utenti
   * collegati». E il resto di quei numeri — quante aspettano il sì, quante in
   * lavorazione — sono numeri di chi governa la fila, non di chi ci sta dentro:
   * a chi aspetta la sua serve sapere a che punto è **la sua**, e quello lo
   * dice il Riepilogo.
   */
  function disegnaNumeri() {
    var casella = $("numeri");
    casella.innerHTML = "";
    if (!pannello || !suite) return;
    if (suTelefono() && !sonoLaCasa) { casella.hidden = true; return; }
    casella.hidden = false;

    var inAttesa = richieste.filter(function (r) { return r.stato === "in-attesa"; }).length;
    var inLavoro = richieste.filter(function (r) {
      return r.stato === "accettata" || r.stato === "in-lavoro";
    }).length;
    var pronte = richieste.filter(function (r) { return r.stato === "pronta"; }).length;

    quadratoNumero(casella, pannello.dispositivi.length, "collegati", inAttesa ? "" : "verde", "daprod");
    quadratoNumero(casella, inLavoro, "in lavorazione", inLavoro ? "giallo" : "", "riepilogo");
    quadratoNumero(casella, pronte, "pronti", pronte ? "verde" : "", "riepilogo");
    quadratoNumero(casella, inAttesa, "aspettano il s\\u00ec", inAttesa ? "rosso" : "", "riepilogo");
  }

  function quadratoNumero(casella, numero, testo, colore, vai) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "quadrato " + (colore || "");
    var n = document.createElement("span");
    n.className = "grande";
    n.textContent = String(numero);
    var t = document.createElement("span");
    t.className = "nome";
    t.textContent = testo;
    b.append(n, t);
    b.addEventListener("click", function () { vaiA(vai); });
    casella.append(b);
  }

  /* ------------------------------------------------------------- aiutini */

  function quando(ms) {
    if (!ms) return "";
    var passati = (Date.now() - ms) / 1000;
    if (passati < 60) return "adesso";
    if (passati < 3600) return Math.round(passati / 60) + " min fa";
    if (passati < 86400) return Math.round(passati / 3600) + " h fa";
    return new Date(ms).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  }

  /**
   * Da quanto sta andando una cosa: «2 min», «14 min», «1 h 3 min».
   *
   * Non si dice **quanto manca**, e non e' una mancanza: nessuno lo sa, nemmeno
   * il motore. Sapere da quanto e' partito basta a capire se e' cominciato
   * adesso o se e' li' da un quarto d'ora, che e' la domanda vera.
   */
  function daQuanto(da) {
    var quanti = Math.max(0, Math.round((Date.now() - da) / 1000));
    if (quanti < 60) return quanti + " s";
    var minuti = Math.floor(quanti / 60);
    if (minuti < 60) return minuti + " min";
    return Math.floor(minuti / 60) + " h " + (minuti % 60) + " min";
  }

  function pesa(b) {
    if (!b) return "";
    if (b >= 1048576) return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
    // Sotto il chilo si scrivono i byte: un file da settanta byte che dice
    // «0 KB» sembra un file rotto, e visto sul pacco di prova lo sembrava.
    if (b < 1024) return b + " byte";
    return Math.round(b / 1024) + " KB";
  }

  /** Le iniziali di un nome, per quando la faccia non c'è. */
  function iniziali(nome) {
    var pezzi = String(nome || "?").trim().split(/\\s+/);
    var prima = (pezzi[0] || "?").charAt(0);
    var seconda = pezzi.length > 1 ? pezzi[pezzi.length - 1].charAt(0) : "";
    return (prima + seconda).toUpperCase();
  }

  /**
   * La faccia di una persona: la sua foto, o le sue iniziali.
   *
   * Mai un riquadro vuoto. In una bacheca, un buco al posto della faccia è
   * peggio di un'iniziale: sembra una cosa che non ha caricato.
   */
  function riempiFaccia(elemento, nome, indirizzoFoto) {
    elemento.textContent = "";
    elemento.style.backgroundImage = "";
    if (indirizzoFoto) {
      elemento.style.backgroundImage = "url(" + indirizzoFoto + ")";
      elemento.style.backgroundSize = "cover";
      elemento.style.backgroundPosition = "center";
      return;
    }
    elemento.textContent = iniziali(nome);
  }

  /**
   * Come si chiama una scheda della suite, e il suo segno.
   *
   * Sono caratteri del piano base e non emoji: un emoji fuori dal piano base
   * scritto con quattro cifre diventa un carattere sbagliato più una cifra —
   * ed è esattamente quello che compariva accanto a «Leggi un testo».
   */
  var SCHEDE = {
    foto: { nome: "DaProdFoto", segno: "\\u25C9", che: "un'immagine da una descrizione", tinta: "viola" },
    cinema: { nome: "DaProdCinema", segno: "\\u25B6", che: "una clip video, col suono", tinta: "rosa" },
    musica: { nome: "DaProdMusica", segno: "\\u266B", che: "una canzone, anche cantata", tinta: "ciano" },
    voce: { nome: "DaProdVoce", segno: "\\u275E", che: "un testo letto ad alta voce", tinta: "ambra" },
    connessione: { nome: "DaProd", segno: "\\u263C", che: "messo in bacheca da una persona", tinta: "verde" },
    suite: { nome: "La suite", segno: "\\u25A6", che: "leggere e decidere", tinta: "viola" },
  };

  function nomeScheda(app) {
    return (SCHEDE[app] || {}).nome || app || "";
  }
`;
