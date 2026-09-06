/**
 * Il visualizer vero, quello di DaProdVisualizer, dentro la console.
 *
 * ## Perche' questo file esiste, detto due volte
 *
 * Nella 0.9.0 il visualizer era un canvas 2D con cinque effetti fatti a mano.
 * Nella 0.9.1 e' stato spostato dove serviva — dentro il palco, non dietro
 * alla pagina — ma era ancora quello. La risposta, il 5 settembre 2026:
 *
 * > «le visual non sono quelle del mio programma daprodvisualizer bro, e' gia'
 * > la seconda volta: fai un port vero del visualizer.»
 *
 * Aveva ragione due volte. **Un port vero non e' «rifatto uguale»: e' lo stesso
 * codice che disegna.**
 *
 * ## Come ci si sta, senza Three.js
 *
 * L'app DaProdVisualizer e' React piu' Three.js, e nella console non ci entra:
 * la regola di questa cartella e' che la pagina si serve da se', e Three da
 * solo pesa piu' di tutto il resto messo insieme.
 *
 * Ma **Three.js non e' il visualizer**. Guardando il motore vero, nove degli
 * undici preset sono la stessa identica cosa: un rettangolo grande quanto lo
 * schermo, e sopra un fragment shader. Three li' fa il lavoro di disegnare due
 * triangoli — trenta righe di WebGL. Quello che fa l'effetto e' il GLSL, e
 * quello si porta tale e quale.
 *
 * Quindi qui c'e':
 *
 * - **gli stessi nove shader**, presi dai file dell'app da
 *   `porta-il-visualizer.mjs` (vedi `copione-visual-glsl.ts`);
 * - **lo stesso prologo** `common.glsl`, con `band()`, `fbm()`, `palette()`;
 * - **gli stessi manifest**: parametri e `audioMappings`, che sono la meta' del
 *   carattere di un effetto — e' quella riga a decidere che il tunnel respira
 *   sui bassi e non sugli acuti;
 * - **lo stesso analizzatore**: bande logaritmiche, guadagno automatico,
 *   flusso spettrale, onset, beat con periodo refrattario, centroide;
 * - **le stesse quattro passate** di post-processing: soglia morbida,
 *   sfocatura gaussiana a raggio raddoppiato, tone map filmico con
 *   vignettatura e grana, e le quattro transizioni.
 *
 * **Due preset restano fuori**: AudioBloom e CosmicDust sono scene con
 * particelle e mesh, e quelle Three lo usano davvero. Sono gli unici due, ed e'
 * scritto qui perche' si sappia cosa manca invece di scoprirlo.
 *
 * ## Cosa cambia rispetto all'app, e perche'
 *
 * - **La qualita' e' fissa su «media»**: due passate di bloom, pixel ratio al
 *   massimo 1,25. Nell'app c'e' un gestore che la alza e la abbassa guardando
 *   gli fps; qui il pubblico e' un telefono e la scelta prudente e' quella
 *   giusta di serie.
 * - **Il cambio automatico e' acceso**, quarantacinque secondi, e aspetta un
 *   colpo forte per cambiare. Nell'app e' spento perche' li' uno sceglie;
 *   qui e' stato chiesto «effetti shuffle».
 * - **Niente nomi degli effetti a schermo.** Chiesto il 5 settembre 2026:
 *   «togli anche le scritte del nome dell'effetto». Il nome resta nel titolo
 *   del tasto, per chi passa col mouse.
 *
 * ## Le regole del file
 *
 * Niente backtick e niente template literal: questo file **e'** un template
 * literal. Le stringhe si concatenano con il piu'.
 */
import { COPIONE_VISUAL_GLSL } from "./copione-visual-glsl";

export const COPIONE_VISUAL =
  COPIONE_VISUAL_GLSL +
  `

  /**
   * Il motore, tutto dentro una chiusura.
   *
   * Fuori escono sei cose: accendi, spegni, disegna, collega, cambia e nome.
   * Tutto il resto — il contesto WebGL, i bersagli, i programmi, lo stato
   * dell'analisi — sta qui dentro e non tocca il resto della pagina.
   */
  var Visual = (function () {

    /* =================================================== quello che si sa */

    /** Bande logaritmiche prodotte dall'analizzatore. Come nell'app. */
    var BANDE = 64;
    /** Campioni di forma d'onda passati agli shader. Come nell'app. */
    var ONDE = 256;
    var FFT = 2048;

    /** Finestra dinamica in dB con cui lo spettro diventa 0..1. */
    var DB_MIN = -96;
    var DB_MAX = -12;

    /** Estremi delle bande logaritmiche. */
    var HZ_MIN = 28;
    var HZ_MAX = 16000;

    /** I confini delle tre fasce. */
    var BASSI = [20, 250];
    var MEDI = [250, 2000];
    var ALTI = [2000, 16000];

    /**
     * La banda su cui si cerca il colpo.
     *
     * Volutamente piu' stretta dei «bassi»: sopra i 160 Hz entrano charleston e
     * rullanti, che facevano scattare il doppio dei beat.
     */
    var BANDA_COLPO = [30, 160];

    /** Fra due colpi almeno 280 ms, cioe' al massimo ~214 BPM. */
    var REFRATTARIO = 0.28;

    var MIRA_GUADAGNO = 0.5;
    var GUADAGNO_MIN = 0.65;
    var GUADAGNO_MAX = 4.5;

    /** Quanto dura una transizione fra due preset. */
    var TRANSIZIONE = 1.4;
    /** Ogni quanto si cambia effetto da soli. */
    var DURATA_PRESET = 45;
    /** Quanto si aspetta un colpo forte prima di cambiare comunque. */
    var ATTESA_COLPO = 8;

    /** Delta massimo accettato: dopo un blocco lungo i preset non devono saltare. */
    var DELTA_MAX = 0.1;

    /** Due passate di bloom e pixel ratio a 1,25: la qualita' «media» dell'app. */
    var BLOOM_GIRI = 2;
    var BLOOM_FORZA = 0.85;
    var RATIO_MAX = 1.25;

    /* ================================================== stato del motore */

    var tela = null;
    var gl = null;
    var quad = null;
    /** chiave dello shader -> { programma, uniformi } */
    var programmi = {};
    var passate = {};
    var bersagli = null;
    var texSpettro = null;
    var texOnda = null;

    var attivo = null;
    var entrante = null;
    var mix = 0;
    var modoTransizione = 0;
    var daQuandoCambio = 0;
    var aspettoIlColpo = false;
    var aspettatoDa = 0;

    var largo = 0;
    var alto = 0;
    var scorso = 0;
    var passato = 0;
    var giro = 0;
    var rotto = false;

    /* ================================================= stato dell'analisi */

    var contesto = null;
    var nodo = null;
    var giaCollegato = null;
    var freqDb = null;
    var freqByte = null;
    var tempoDominio = null;
    var binNorm = null;
    var binPrima = null;
    var fette = [];
    var binQuanti = 0;
    var binHz = 0;
    var haFloat = true;

    var bandeMorbide = new Float32Array(BANDE);
    var picchi = new Float32Array(BANDE);
    var lisce = new Float32Array(BANDE);
    var datiSpettro = new Uint8Array(BANDE * 4);
    var datiOnda = new Uint8Array(ONDE * 4);

    var rifLivello = 0.35;
    var rifRms = 0.12;
    var tenutaPicco = 0;
    var mediaFlusso = 0.02;
    var mediaFlussoColpo = 0.02;
    var ultimoColpo = -10;
    var inviluppoColpo = 0;
    var intervalli = [];
    var bpmStimato = 0;
    var ultimoTempoBrano = 0;

    /** Le feature del fotogramma. Un oggetto solo, riscritto: niente spazzatura. */
    var F = {
      time: 0, rms: 0, peak: 0, bass: 0, mid: 0, treble: 0,
      beat: 0, beatCount: 0, onset: 0, centroid: 0.35, flux: 0,
      bpm: 0, energy: 0, silent: true,
      bands: new Float32Array(BANDE),
      waveform: new Float32Array(ONDE),
    };

    /* ======================================================= due aiutanti */

    function fra(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function zeroUno(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

    /** Coefficiente di smoothing esponenziale indipendente dagli fps. */
    function coeff(dt, tau) {
      if (tau <= 0) return 1;
      return 1 - Math.exp(-dt / tau);
    }

    /** Frazione della banda che cade dentro un intervallo di frequenze. */
    function dentro(f0, f1, gamma) {
      var lo = Math.max(f0, gamma[0]);
      var hi = Math.min(f1, gamma[1]);
      if (hi <= lo) return 0;
      return (hi - lo) / (f1 - f0);
    }

    /**
     * I bassi sotto i 60 Hz sono spesso sovra-rappresentati e schiacciano la
     * fascia: alle bande piu' gravi si toglie un po' di peso.
     */
    function smussaGravi(centro, gamma) {
      if (centro >= gamma[0] * 2.2) return 1;
      return fra(0.45 + (centro - gamma[0]) / (gamma[0] * 2.2), 0.45, 1);
    }

    /* ================================================ l'analisi del suono */

    /**
     * Precalcola quale bin FFT finisce in quale banda, e con che peso.
     *
     * Si fa una volta sola: dipende solo dalla frequenza di campionamento.
     */
    function costruisciLeBande() {
      fette = [];
      var nyquist = binQuanti * binHz;
      var massimo = Math.min(HZ_MAX, nyquist * 0.96);
      var rapporto = Math.log(massimo / HZ_MIN);
      for (var b = 0; b < BANDE; b++) {
        var f0 = HZ_MIN * Math.exp((rapporto * b) / BANDE);
        var f1 = HZ_MIN * Math.exp((rapporto * (b + 1)) / BANDE);
        var lo = fra(Math.floor(f0 / binHz), 0, binQuanti - 1);
        var hi = fra(Math.max(lo, Math.ceil(f1 / binHz) - 1), 0, binQuanti - 1);
        var centro = (f0 + f1) * 0.5;
        fette.push({
          lo: lo, hi: hi,
          wB: dentro(f0, f1, BASSI) * smussaGravi(centro, BASSI),
          wM: dentro(f0, f1, MEDI),
          wA: dentro(f0, f1, ALTI),
        });
      }
    }

    /**
     * Le feature del fotogramma, dallo spettro.
     *
     * ⚠ Questa funzione e' il porto riga per riga di «AudioAnalyzer.analyze».
     * Le costanti non sono state ritoccate: cambiarne una qui vorrebbe dire che
     * lo stesso brano si vede diverso di qua e di la', che e' esattamente la
     * cosa che questo file esiste per non fare.
     */
    function analizza(dt, quando, acceso) {
      F.time = quando;
      if (!nodo || !acceso) { spegniPianoPiano(dt); return F; }

      if (haFloat) nodo.getFloatFrequencyData(freqDb);
      else {
        nodo.getByteFrequencyData(freqByte);
        for (var k = 0; k < binQuanti; k++) freqDb[k] = DB_MIN + (freqByte[k] / 255) * (DB_MAX - DB_MIN);
      }
      if (nodo.getFloatTimeDomainData) nodo.getFloatTimeDomainData(tempoDominio);

      /* --- spettro in 0..1, flusso spettrale, centroide -------------------- */
      var invGamma = 1 / (DB_MAX - DB_MIN);
      var flusso = 0;
      var flussoColpo = 0;
      var somma = 0;
      var hzPesati = 0;
      var colpoLo = Math.max(1, Math.floor(BANDA_COLPO[0] / binHz));
      var colpoHi = Math.min(binQuanti - 1, Math.ceil(BANDA_COLPO[1] / binHz));

      for (var i = 0; i < binQuanti; i++) {
        var db = freqDb[i];
        if (!isFinite(db)) db = DB_MIN;
        var norm = zeroUno((db - DB_MIN) * invGamma);
        binNorm[i] = norm;
        var salita = norm - binPrima[i];
        if (salita > 0) {
          flusso += salita;
          if (i >= colpoLo && i <= colpoHi) flussoColpo += salita;
        }
        somma += norm;
        hzPesati += norm * (i * binHz);
      }
      binPrima.set(binNorm);
      flusso /= binQuanti;
      flussoColpo /= Math.max(1, colpoHi - colpoLo + 1);

      /* --- bande logaritmiche --------------------------------------------- */
      var attacco = coeff(dt, 0.02);
      var rilascio = coeff(dt, 0.16);
      var media = 0;
      for (var b = 0; b < BANDE; b++) {
        var fetta = fette[b];
        var acc = 0, cima = 0, n = 0;
        for (var j = fetta.lo; j <= fetta.hi; j++) {
          var v = binNorm[j];
          acc += v;
          if (v > cima) cima = v;
          n++;
        }
        // Le bande acute raccolgono decine di bin: con la sola media un picco
        // stretto (piatto, charleston) sparirebbe. Meta' media, meta' picco.
        var grezzo = n > 0 ? (acc / n) * 0.5 + cima * 0.5 : 0;
        media += grezzo;
        var prima = bandeMorbide[b];
        bandeMorbide[b] = prima + (grezzo - prima) * (grezzo > prima ? attacco : rilascio);
      }
      media /= BANDE;

      /* --- guadagno automatico -------------------------------------------- */
      var kLivello = media > rifLivello ? coeff(dt, 0.4) : coeff(dt, 6.0);
      rifLivello += (media - rifLivello) * kLivello;
      var guadagno = fra(MIRA_GUADAGNO / Math.max(rifLivello, 0.04), GUADAGNO_MIN, GUADAGNO_MAX);

      /* --- bande in uscita, e le tre fasce -------------------------------- */
      var bA = 0, pA = 0, bM = 0, pM = 0, bT = 0, pT = 0;
      for (var c = 0; c < BANDE; c++) {
        var fe = fette[c];
        var fuori = zeroUno(bandeMorbide[c] * guadagno);
        F.bands[c] = fuori;
        bA += fuori * fe.wB; pA += fe.wB;
        bM += fuori * fe.wM; pM += fe.wM;
        bT += fuori * fe.wA; pT += fe.wA;
      }
      F.bass = zeroUno(pA > 0 ? bA / pA : 0);
      F.mid = zeroUno(pM > 0 ? bM / pM : 0);
      F.treble = zeroUno(pT > 0 ? bT / pT : 0);
      F.energy = zeroUno(F.bass * 0.5 + F.mid * 0.32 + F.treble * 0.18);

      /* --- rms e picco, dal dominio del tempo ----------------------------- */
      var quadrati = 0, cimaAss = 0;
      for (var t = 0; t < FFT; t++) {
        var x = tempoDominio[t];
        quadrati += x * x;
        var a = x < 0 ? -x : x;
        if (a > cimaAss) cimaAss = a;
      }
      var rmsGrezzo = Math.sqrt(quadrati / FFT);
      var kRms = rmsGrezzo > rifRms ? coeff(dt, 0.5) : coeff(dt, 6.0);
      rifRms += (rmsGrezzo - rifRms) * kRms;
      var guadagnoRms = fra(0.42 / Math.max(rifRms, 0.01), 0.7, 6);

      var miraRms = zeroUno(rmsGrezzo * guadagnoRms);
      F.rms += (miraRms - F.rms) * (miraRms > F.rms ? coeff(dt, 0.03) : coeff(dt, 0.2));

      var miraPicco = zeroUno(cimaAss * guadagnoRms);
      tenutaPicco = miraPicco > tenutaPicco
        ? miraPicco
        : tenutaPicco + (miraPicco - tenutaPicco) * coeff(dt, 0.45);
      F.peak = tenutaPicco;

      /* --- centroide spettrale -------------------------------------------- */
      var centroHz = somma > 1e-4 ? hzPesati / somma : HZ_MIN;
      var arco = Math.log(HZ_MAX / HZ_MIN);
      var centroNorm = zeroUno(Math.log(Math.max(centroHz, HZ_MIN) / HZ_MIN) / arco);
      F.centroid += (centroNorm - F.centroid) * coeff(dt, 0.12);

      /* --- onset ----------------------------------------------------------- */
      mediaFlusso += (flusso - mediaFlusso) * coeff(dt, 0.6);
      var onsetGrezzo = zeroUno((flusso - mediaFlusso) / Math.max(mediaFlusso * 1.6, 0.004));
      F.flux = zeroUno(flusso * 22);
      F.onset = onsetGrezzo > F.onset ? onsetGrezzo : F.onset + (onsetGrezzo - F.onset) * coeff(dt, 0.09);

      /* --- il colpo -------------------------------------------------------- */
      mediaFlussoColpo += (flussoColpo - mediaFlussoColpo) * coeff(dt, 0.9);
      var soglia = mediaFlussoColpo * 1.7 + 0.008;
      var daUltimo = quando - ultimoColpo;
      // Un salto all'indietro nel brano non deve bloccare il rilevamento.
      if (daUltimo < 0) { ultimoColpo = quando - REFRATTARIO; daUltimo = REFRATTARIO; }

      if (flussoColpo > soglia && daUltimo > REFRATTARIO && F.energy > 0.06) {
        if (daUltimo < 2.5) contaIlTempo(daUltimo);
        ultimoColpo = quando;
        inviluppoColpo = 1;
        F.beatCount++;
      } else {
        inviluppoColpo = Math.max(0, inviluppoColpo - dt * 6);
      }
      F.beat = inviluppoColpo;
      F.bpm = bpmStimato;
      F.silent = F.rms < 0.004;
      ultimoTempoBrano = quando;

      /* --- la forma d'onda -------------------------------------------------- */
      var passo = FFT / ONDE;
      for (var w = 0; w < ONDE; w++) {
        var inizio = (w * passo) | 0;
        var sacco = 0;
        for (var z = 0; z < passo; z++) sacco += tempoDominio[inizio + z];
        F.waveform[w] = sacco / passo;
      }
      return F;
    }

    /** Senza suono le feature scendono a zero invece di restare congelate. */
    function spegniPianoPiano(dt) {
      var k = coeff(dt, 0.35);
      F.rms += (0 - F.rms) * k;
      F.peak += (0 - F.peak) * k;
      F.bass += (0 - F.bass) * k;
      F.mid += (0 - F.mid) * k;
      F.treble += (0 - F.treble) * k;
      F.energy += (0 - F.energy) * k;
      F.onset += (0 - F.onset) * k;
      F.flux += (0 - F.flux) * k;
      inviluppoColpo = Math.max(0, inviluppoColpo - dt * 6);
      F.beat = inviluppoColpo;
      for (var b = 0; b < BANDE; b++) {
        bandeMorbide[b] += (0 - bandeMorbide[b]) * k;
        F.bands[b] = bandeMorbide[b];
      }
      for (var w = 0; w < ONDE; w++) F.waveform[w] *= 1 - k;
      F.silent = F.rms < 0.004;
      ultimoColpo = Math.min(ultimoColpo, ultimoTempoBrano);
    }

    /**
     * Il tempo, dagli intervalli fra i colpi.
     *
     * La mediana e non la media: gli intervalli misurati oscillano di decine di
     * millisecondi perche' il rilevamento e' agganciato al fotogramma, e la
     * mediana regge sia un colpo mancato (intervallo doppio) sia uno spurio
     * (intervallo dimezzato).
     */
    function contaIlTempo(intervallo) {
      intervalli.push(intervallo);
      if (intervalli.length > 24) intervalli.shift();
      if (intervalli.length < 6) return;

      var piegati = intervalli.map(function (iv) {
        var v = iv;
        while (v < 0.3) v *= 2;
        while (v > 1.2) v /= 2;
        return v;
      }).sort(function (a, b) { return a - b; });

      var mediana = piegati[piegati.length >> 1];
      if (mediana <= 0) return;
      var dentroLaMedia = 0;
      for (var i = 0; i < piegati.length; i++) {
        if (Math.abs(piegati[i] - mediana) < mediana * 0.18) dentroLaMedia++;
      }
      if (dentroLaMedia < Math.ceil(piegati.length * 0.5)) return;
      var bpm = 60 / mediana;
      bpmStimato = bpmStimato === 0 ? bpm : bpmStimato * 0.7 + bpm * 0.3;
    }

    /**
     * Collega un audio o un video all'analizzatore.
     *
     * Il contesto si crea **una volta sola** e si riusa: un browser ne concede
     * pochi. Ogni elemento invece si collega una volta e una sola — collegarlo
     * due volte solleva, ed e' il motivo di «giaCollegato».
     */
    function collega(elemento) {
      try {
        var Contesto = window.AudioContext || window.webkitAudioContext;
        if (!Contesto) return false;
        if (!contesto) contesto = new Contesto();
        if (contesto.state === "suspended") void contesto.resume();
        if (!nodo) {
          nodo = contesto.createAnalyser();
          nodo.fftSize = FFT;
          // Il grosso dello smoothing lo facciamo noi, con attacco e rilascio
          // separati: qui basta togliere il tremolio del singolo fotogramma.
          nodo.smoothingTimeConstant = 0.55;
          nodo.minDecibels = DB_MIN;
          nodo.maxDecibels = DB_MAX;
          nodo.connect(contesto.destination);
          binQuanti = nodo.frequencyBinCount;
          binHz = contesto.sampleRate / FFT;
          freqDb = new Float32Array(binQuanti);
          freqByte = new Uint8Array(binQuanti);
          tempoDominio = new Float32Array(FFT);
          binNorm = new Float32Array(binQuanti);
          binPrima = new Float32Array(binQuanti);
          haFloat = typeof nodo.getFloatFrequencyData === "function";
          costruisciLeBande();
        }
        if (giaCollegato !== elemento) {
          contesto.createMediaElementSource(elemento).connect(nodo);
          giaCollegato = elemento;
        }
        return true;
      } catch (e) {
        // Niente Web Audio qui: gli shader girano lo stesso, con il suono a
        // zero. Uno sfondo che si muove piano e' meglio di uno nero.
        nodo = null;
        return false;
      }
    }

    /** Azzera lo stato adattivo. Si chiama quando cambia il brano. */
    function ricomincia() {
      rifLivello = 0.35;
      rifRms = 0.12;
      tenutaPicco = 0;
      mediaFlusso = 0.02;
      mediaFlussoColpo = 0.02;
      ultimoColpo = -10;
      inviluppoColpo = 0;
      intervalli = [];
      bpmStimato = 0;
      bandeMorbide.fill(0);
      picchi.fill(0);
      lisce.fill(0);
      if (binPrima) binPrima.fill(0);
      F.beatCount = 0;
      F.bands.fill(0);
      F.waveform.fill(0);
    }

    /* ================================================== il disegno, WebGL */

    /** Il vertex shader: due triangoli che coprono lo schermo. */
    var VERTICE =
      "attribute vec2 aPos;" +
      "varying vec2 vUv;" +
      "void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";

    function compila(sorgente, tipo) {
      var s = gl.createShader(tipo);
      gl.shaderSource(s, sorgente);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        var perche = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(perche || "shader rifiutato");
      }
      return s;
    }

    /**
     * Un programma, e la mappa dei suoi uniform.
     *
     * Gli uniform si leggono **una volta** e si tengono: «getUniformLocation»
     * a ogni fotogramma, per venti nomi e sessanta fotogrammi al secondo, e'
     * milleduecento chiamate al driver per niente.
     */
    function programma(chiave, sorgenteFrag) {
      if (programmi[chiave]) return programmi[chiave];
      var p = gl.createProgram();
      gl.attachShader(p, compila(VERTICE, gl.VERTEX_SHADER));
      gl.attachShader(p, compila(sorgenteFrag, gl.FRAGMENT_SHADER));
      gl.bindAttribLocation(p, 0, "aPos");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p) || "programma rifiutato");
      }
      var dove = {};
      var quanti = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < quanti; i++) {
        var info = gl.getActiveUniform(p, i);
        if (!info) continue;
        var nome = info.name.replace("[0]", "");
        dove[nome] = gl.getUniformLocation(p, nome);
      }
      programmi[chiave] = { p: p, dove: dove };
      return programmi[chiave];
    }

    /** Una texture su cui disegnare, e il suo framebuffer. */
    function bersaglio(w, h) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.max(1, w), Math.max(1, h), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      // LINEAR e CLAMP_TO_EDGE: sono le uniche impostazioni che WebGL 1
      // accetta su una texture di dimensione qualunque.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { t: t, f: f, w: Math.max(1, w), h: Math.max(1, h) };
    }

    function ridimensiona(b, w, h) {
      w = Math.max(1, w | 0); h = Math.max(1, h | 0);
      if (b.w === w && b.h === h) return;
      b.w = w; b.h = h;
      gl.bindTexture(gl.TEXTURE_2D, b.t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    /** Una texture 1D di dati, per lo spettro e per l'onda. */
    function texDati(quanti) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, quanti, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return t;
    }

    /**
     * Lo spettro dentro una texture.
     *
     * Tre canali con tre letture diverse dello stesso numero, e sono quelle che
     * gli shader chiedono con «band()», «bandPeak()» e «bandSoft()»:
     * r = la banda adesso, g = il picco che scende piano, b = la banda smussata.
     */
    function scriviLoSpettro(dt) {
      var caduta = Math.min(1, dt * 1.6);
      var kLiscia = 1 - Math.exp(-dt / 0.12);
      for (var i = 0; i < BANDE; i++) {
        var v = F.bands[i] || 0;
        picchi[i] = v > picchi[i] ? v : picchi[i] - caduta * 0.6;
        if (picchi[i] < 0) picchi[i] = 0;
        lisce[i] += (v - lisce[i]) * kLiscia;
        var o = i * 4;
        datiSpettro[o] = (v * 255) | 0;
        datiSpettro[o + 1] = (picchi[i] * 255) | 0;
        datiSpettro[o + 2] = (lisce[i] * 255) | 0;
        datiSpettro[o + 3] = 255;
      }
      gl.bindTexture(gl.TEXTURE_2D, texSpettro);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BANDE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, datiSpettro);

      for (var w = 0; w < ONDE; w++) {
        var s = zeroUno((F.waveform[w] || 0) * 0.5 + 0.5);
        var q = w * 4;
        datiOnda[q] = (s * 255) | 0;
        datiOnda[q + 3] = 255;
      }
      gl.bindTexture(gl.TEXTURE_2D, texOnda);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ONDE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, datiOnda);
    }

    /** Disegna il rettangolo con quel programma su quel bersaglio (null = schermo). */
    function passata(prog, dove) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dove ? dove.f : null);
      gl.viewport(0, 0, dove ? dove.w : largo, dove ? dove.h : alto);
      gl.useProgram(prog.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function texUnita(prog, nome, tex, unita) {
      if (!prog.dove[nome]) return;
      gl.activeTexture(gl.TEXTURE0 + unita);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(prog.dove[nome], unita);
    }

    function f1(prog, nome, v) { if (prog.dove[nome]) gl.uniform1f(prog.dove[nome], v); }
    function f2(prog, nome, a, b) { if (prog.dove[nome]) gl.uniform2f(prog.dove[nome], a, b); }
    function i1(prog, nome, v) { if (prog.dove[nome]) gl.uniform1i(prog.dove[nome], v); }

    /* ============================================== i preset e i loro legami */

    /**
     * Prepara un preset: il suo programma, i suoi parametri, i suoi legami.
     *
     * I legami sono la parte che si dimentica facilmente e che fa la
     * differenza: «{bass -> tunnelScale, 0.8, 0.15}» vuol dire che l'uniform
     * «uTunnelScale» insegue l'energia dei bassi moltiplicata per 0,8 con
     * centocinquanta millisecondi di inerzia. Senza, lo shader compila e resta
     * fermo.
     */
    function preparaPreset(m) {
      var prog = programma(m.chiave, GLSL.comune + "\\n" + GLSL[m.chiave]);
      var legami = [];
      for (var i = 0; i < m.legami.length; i++) {
        var l = m.legami[i];
        legami.push({ da: l.da, nome: "u" + l.a.charAt(0).toUpperCase() + l.a.slice(1), quanto: l.quanto, inerzia: l.inerzia, valore: 0 });
      }
      return { m: m, prog: prog, legami: legami };
    }

    function leggiLaFonte(quale) {
      if (quale === "bass") return F.bass;
      if (quale === "mid") return F.mid;
      if (quale === "treble") return F.treble;
      if (quale === "rms") return F.rms;
      if (quale === "peak") return F.peak;
      if (quale === "beat") return F.beat;
      if (quale === "onset") return F.onset;
      if (quale === "centroid") return F.centroid;
      if (quale === "energy") return F.energy;
      return 0;
    }

    /** Disegna un preset dentro un bersaglio, con tutti i suoi uniform. */
    function disegnaPreset(v, dove, dt) {
      var p = v.prog;
      gl.useProgram(p.p);
      f1(p, "uTime", passato);
      f1(p, "uDelta", dt);
      f2(p, "uResolution", largo, alto);
      f1(p, "uAspect", largo / Math.max(1, alto));
      f1(p, "uIntensity", 1);
      f1(p, "uPosition", F.time);
      f1(p, "uBass", F.bass);
      f1(p, "uMid", F.mid);
      f1(p, "uTreble", F.treble);
      f1(p, "uRms", F.rms);
      f1(p, "uPeak", F.peak);
      f1(p, "uBeat", F.beat);
      f1(p, "uOnset", F.onset);
      f1(p, "uCentroid", F.centroid);
      f1(p, "uEnergy", F.energy);
      f1(p, "uBeatCount", F.beatCount);
      texUnita(p, "uSpectrum", texSpettro, 0);
      texUnita(p, "uWave", texOnda, 1);

      for (var nome in v.m.parametri) {
        if (!Object.prototype.hasOwnProperty.call(v.m.parametri, nome)) continue;
        f1(p, "u" + nome.charAt(0).toUpperCase() + nome.slice(1), v.m.parametri[nome]);
      }
      for (var i = 0; i < v.legami.length; i++) {
        var l = v.legami[i];
        var mira = leggiLaFonte(l.da) * l.quanto;
        var k = l.inerzia > 0 ? 1 - Math.exp(-dt / l.inerzia) : 1;
        l.valore += (mira - l.valore) * k;
        f1(p, l.nome, l.valore);
      }
      passata(p, dove);
    }

    /* ==================================================== accendere e usare */

    /**
     * Accende il motore su quel canvas. Torna false se WebGL non c'e'.
     *
     * Chi chiama non deve preoccuparsene: con false il lettore lascia il palco
     * com'e' e nessuno vede un errore.
     */
    function accendi(quale) {
      if (gl && tela === quale) return true;
      if (rotto) return false;
      tela = quale;
      try {
        var opzioni = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false };
        gl = tela.getContext("webgl", opzioni) || tela.getContext("experimental-webgl", opzioni);
        if (!gl) { rotto = true; return false; }

        quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        texSpettro = texDati(BANDE);
        texOnda = texDati(ONDE);

        passate.soglia = programma("post_bright", GLSL.post_bright);
        passate.sfoca = programma("post_blur", GLSL.post_blur);
        passate.componi = programma("post_composite", GLSL.post_composite);
        passate.transizione = programma("post_transition", GLSL.post_transition);

        bersagli = {
          corrente: bersaglio(2, 2),
          entrante: bersaglio(2, 2),
          fusione: bersaglio(2, 2),
          ping: bersaglio(2, 2),
          pong: bersaglio(2, 2),
        };

        attivo = preparaPreset(unoACaso(null));
        daQuandoCambio = 0;
        scorso = 0;
        passato = 0;
        return true;
      } catch (e) {
        // Un driver che rifiuta uno shader, una WebView senza WebGL: si spegne
        // qui e il resto della pagina non se ne accorge.
        rotto = true;
        gl = null;
        return false;
      }
    }

    /** Un preset a caso, diverso da quello passato. */
    function unoACaso(escluso) {
      var scelta = PRESET_VISUAL;
      if (escluso) {
        scelta = PRESET_VISUAL.filter(function (m) { return m.chiave !== escluso; });
        if (!scelta.length) scelta = PRESET_VISUAL;
      }
      return scelta[Math.floor(Math.random() * scelta.length)];
    }

    /** Comincia il passaggio a un altro preset, con una transizione a caso. */
    function cambia(quale) {
      if (!gl || entrante) return;
      var m = quale || unoACaso(attivo ? attivo.m.chiave : null);
      try {
        entrante = preparaPreset(m);
      } catch (e) { entrante = null; return; }
      mix = 0;
      // Quattro modi, e mai due volte lo stesso di fila.
      var modi = [0, 1, 2, 3].filter(function (n) { return n !== modoTransizione; });
      modoTransizione = modi[Math.floor(Math.random() * modi.length)];
      aspettoIlColpo = false;
      daQuandoCambio = 0;
    }

    /**
     * Un fotogramma intero: analisi, preset, transizione, post-processing.
     *
     * «elemento» e' quello che sta suonando (o null), e serve solo a sapere se
     * il suono e' fermo: le feature devono scendere a zero, non congelarsi.
     */
    function disegna(elemento) {
      if (!gl || !tela) return;

      var adesso = performance.now() / 1000;
      var dt = scorso ? Math.min(DELTA_MAX, adesso - scorso) : 1 / 60;
      scorso = adesso;
      passato += dt;
      giro++;

      /**
       * La misura del buffer si decide **qui**, non su un evento di resize.
       *
       * Su un telefono la finestra cambia altezza ogni volta che compare la
       * tastiera o la barra dell'indirizzo, e un ascoltatore di resize su un
       * canvas a schermo intero e' il modo piu' semplice di far scattare tutto.
       */
      var ratio = Math.min(window.devicePixelRatio || 1, RATIO_MAX);
      var w = Math.max(2, Math.floor(tela.clientWidth * ratio));
      var h = Math.max(2, Math.floor(tela.clientHeight * ratio));
      if (w !== largo || h !== alto) {
        largo = w; alto = h;
        tela.width = w; tela.height = h;
        ridimensiona(bersagli.corrente, w, h);
        ridimensiona(bersagli.entrante, w, h);
        ridimensiona(bersagli.fusione, w, h);
        ridimensiona(bersagli.ping, w >> 1, h >> 1);
        ridimensiona(bersagli.pong, w >> 1, h >> 1);
      }

      var acceso = !!(elemento && !elemento.paused && !elemento.ended);
      analizza(dt, elemento && isFinite(elemento.currentTime) ? elemento.currentTime : passato, acceso);
      scriviLoSpettro(dt);

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      disegnaPreset(attivo, bersagli.corrente, dt);

      var scena = bersagli.corrente;
      if (entrante) {
        disegnaPreset(entrante, bersagli.entrante, dt);
        mix += dt / TRANSIZIONE;
        if (mix >= 1) {
          attivo = entrante;
          entrante = null;
          mix = 0;
          daQuandoCambio = 0;
        } else {
          var tr = passate.transizione;
          gl.useProgram(tr.p);
          texUnita(tr, "tFrom", bersagli.corrente.t, 0);
          texUnita(tr, "tTo", bersagli.entrante.t, 1);
          f1(tr, "uMix", mix);
          i1(tr, "uMode", modoTransizione);
          f1(tr, "uTime", passato);
          f2(tr, "uResolution", largo, alto);
          passata(tr, bersagli.fusione);
          scena = bersagli.fusione;
        }
      } else {
        /**
         * **Il cambio da solo, e perche' aspetta un colpo.**
         *
         * Chiesto «effetti shuffle»: quarantacinque secondi e' piu' o meno una
         * strofa e mezza. Ma cambiare **a meta' di una frase** si vede come uno
         * stacco sbagliato: appena scaduto il tempo si aspetta il primo colpo
         * forte, e si cambia li'. Se per otto secondi non arriva — un pezzo
         * calmo, un finale — si cambia lo stesso.
         */
        daQuandoCambio += dt;
        if (!aspettoIlColpo && daQuandoCambio >= DURATA_PRESET) {
          aspettoIlColpo = true;
          aspettatoDa = 0;
        }
        if (aspettoIlColpo) {
          aspettatoDa += dt;
          if ((F.beat > 0.85 && F.energy > 0.25) || aspettatoDa > ATTESA_COLPO) cambia(null);
        }
      }

      /* --- bloom, tone map, vignettatura, grana ---------------------------- */
      var bloom = null;
      if (BLOOM_GIRI > 0) {
        var so = passate.soglia;
        gl.useProgram(so.p);
        texUnita(so, "tSource", scena.t, 0);
        f1(so, "uThreshold", 0.6);
        f1(so, "uKnee", 0.25);
        passata(so, bersagli.ping);

        var texelX = 1 / Math.max(1, largo >> 1);
        var texelY = 1 / Math.max(1, alto >> 1);
        var sf = passate.sfoca;
        for (var g = 0; g < BLOOM_GIRI; g++) {
          // Il raggio raddoppia a ogni giro: si copre un'area ampia con poche
          // passate, che e' il trucco per cui il bloom costa poco.
          var raggio = 1 << g;
          gl.useProgram(sf.p);
          texUnita(sf, "tSource", bersagli.ping.t, 0);
          f2(sf, "uDirection", texelX * raggio, 0);
          passata(sf, bersagli.pong);

          gl.useProgram(sf.p);
          texUnita(sf, "tSource", bersagli.pong.t, 0);
          f2(sf, "uDirection", 0, texelY * raggio);
          passata(sf, bersagli.ping);
        }
        bloom = bersagli.ping;
      }

      var co = passate.componi;
      gl.useProgram(co.p);
      texUnita(co, "tScene", scena.t, 0);
      texUnita(co, "tBloom", (bloom || scena).t, 1);
      f1(co, "uBloomStrength", bloom ? BLOOM_FORZA : 0);
      f1(co, "uVignette", 0.55);
      f1(co, "uGrain", 0.012);
      f1(co, "uTime", passato);
      f2(co, "uResolution", largo, alto);
      passata(co, null);
    }

    /** Come si chiama l'effetto che si sta vedendo. Serve solo al titolo. */
    function nome() {
      return attivo ? attivo.m.nome : "";
    }

    return {
      accendi: accendi,
      collega: collega,
      ricomincia: ricomincia,
      disegna: disegna,
      cambia: cambia,
      nome: nome,
      /** Il beat e l'energia di adesso: la barra in fondo li usa per pulsare. */
      feature: function () { return F; },
      cePosto: function () { return !!gl; },
    };
  })();
`;
