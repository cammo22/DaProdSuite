/**
 * Il copione, quinta parte: **DaProd**, il social della suite.
 *
 * Era la scheda «Persone», e mostrava i quadrati della rete: chi cercava «dove
 * gestisco chi è collegato» non la apriva nemmeno, e chi la apriva ci trovava
 * il firewall. Nella 0.7.6 le due cose si sono separate per bene:
 *
 * - **gli interruttori** (chi è collegato, gli inviti, la rete, i limiti della
 *   macchina) sono nelle impostazioni, che è dove uno va a cercare un
 *   interruttore;
 * - **DaProd** è la bacheca: quello che le persone hanno deciso di far vedere,
 *   con la faccia di chi l'ha fatto, il cuore, e il tasto per tenerlo.
 *
 * ## Perché una colonna e non una griglia
 *
 * La Galleria è una griglia perché lì si cerca: sono le proprie cose, si sa
 * cosa si sta cercando, e più ce ne stanno meglio è. Qui si guarda quello che
 * hanno fatto gli altri, e una cosa che si guarda ha bisogno di spazio, di una
 * faccia sopra e di un modo per dire «mi piace». Una griglia di miniature con
 * un nome sotto è una cartella condivisa; questa è un posto dove si sta.
 *
 * ## Il profilo
 *
 * Chiesto il 26 agosto 2026: «si può andare anche nel proprio profilo, che si
 * può modificare tutto — mettiamo la possibilità di aggiungere una foto di
 * profilo e caricare file da condividere nella bacheca». Tutte e tre le cose
 * stanno qui: il nome (che resta unico, e il gateway lo controlla), la riga
 * sotto al nome, la faccia, e il tasto per mettere in bacheca una cosa che non
 * ha generato il computer.
 */
export const COPIONE_DAPROD = `
  /** Da che parte si guarda la bacheca: tutto, o solo quello che hai tenuto. */
  var VISTE_BACHECA = [
    { id: "", nome: "tutto" },
    { id: "immagine", nome: "immagini" },
    { id: "video", nome: "video" },
    { id: "audio", nome: "musica" },
  ];

  function disegnaFiltriDaprod() {
    var casella = $("filtri-daprod");
    casella.innerHTML = "";
    for (var v of VISTE_BACHECA) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (v.id === filtroBacheca ? " on" : "");
      b.textContent = v.nome;
      b.addEventListener("click", (function (quale) {
        return function () { filtroBacheca = quale; disegnaFiltriDaprod(); leggiBacheca(); };
      })(v.id));
      casella.append(b);
    }
  }

  async function leggiBacheca() {
    disegnaMioProfilo();
    disegnaFiltriDaprod();
    var casella = $("bacheca");
    try {
      var risposta = await chiama(
        "/libreria?quanti=40&dove=bacheca" + (filtroBacheca ? "&tipo=" + filtroBacheca : ""),
      );
      inBacheca = (risposta && risposta.voci) || [];
      casella.innerHTML = "";
      $("bacheca-vuota").hidden = inBacheca.length > 0;
      for (var v of inBacheca) casella.append(postaDi(v));
    } catch (e) {
      casella.innerHTML = "";
      $("bacheca-vuota").hidden = false;
      $("bacheca-vuota").textContent = e.message;
    }
  }

  /** Una cosa in bacheca: la faccia sopra, la roba in mezzo, i tasti sotto. */
  function postaDi(v) {
    var box = document.createElement("div");
    box.className = "posta";

    var testa = document.createElement("div");
    testa.className = "testa";
    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda";
    riempiFaccia(faccia, v.chiNome || "?", v.chi ? "/io/foto/" + encodeURIComponent(v.chi) : "");
    var chi = document.createElement("div");
    chi.className = "cresce";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = v.mia ? (ioNome + " \\u00b7 tu") : (v.chiNome || "qualcuno");
    var q = document.createElement("div");
    q.className = "quando";
    q.textContent = [quando(v.creato), v.caricata ? "caricata" : nomeScheda(v.app)]
      .filter(Boolean).join(" \\u00b7 ");
    chi.append(nome, q);
    testa.append(faccia, chi);
    box.append(testa);

    var vetro = document.createElement("button");
    vetro.type = "button";
    vetro.className = "vetro";
    if (v.tipo === "immagine") {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = "/libreria/file/" + encodeURIComponent(v.id);
      img.alt = v.nome;
      vetro.append(img);
    } else if (v.anteprima) {
      var ant = document.createElement("img");
      ant.loading = "lazy";
      ant.src = "/libreria/anteprima/" + encodeURIComponent(v.id);
      ant.alt = v.nome;
      vetro.append(ant);
      var segno = document.createElement("span");
      segno.className = "play";
      segno.textContent = v.tipo === "video" ? "\\u25B6" : "\\u266B";
      vetro.append(segno);
    } else {
      var senza = document.createElement("div");
      senza.className = "senza";
      senza.textContent = (SCHEDE[v.app] || SCHEDE.suite).segno;
      vetro.append(senza);
    }
    vetro.addEventListener("click", function () { apriLaLente(v); });
    box.append(vetro);

    var parole = document.createElement("div");
    parole.className = "parole";
    parole.textContent = v.didascalia || v.nome;
    box.append(parole);

    var piedi = document.createElement("div");
    piedi.className = "piedi";

    /**
     * Il cuore.
     *
     * Si accende subito, prima che il computer risponda: un cuore che ci mette
     * mezzo secondo a colorarsi fa premere due volte, e la seconda volta lo
     * spegne. Se poi la chiamata va male si rimette com'era.
     */
    var cuore = document.createElement("button");
    cuore.className = "cuore" + (v.mioMiPiace ? " mio" : "");
    var simbolo = document.createElement("span");
    simbolo.className = "simbolo";
    simbolo.textContent = v.mioMiPiace ? "\\u2665" : "\\u2661";
    var conto = document.createElement("span");
    conto.textContent = v.quantiMiPiace ? String(v.quantiMiPiace) : "";
    cuore.append(simbolo, conto);
    cuore.addEventListener("click", async function () {
      var prima = v.mioMiPiace;
      v.mioMiPiace = !prima;
      v.quantiMiPiace = Math.max(0, (v.quantiMiPiace || 0) + (prima ? -1 : 1));
      cuore.className = "cuore" + (v.mioMiPiace ? " mio" : "");
      simbolo.textContent = v.mioMiPiace ? "\\u2665" : "\\u2661";
      conto.textContent = v.quantiMiPiace ? String(v.quantiMiPiace) : "";
      try {
        var esito = await chiama("/libreria/" + encodeURIComponent(v.id) + "/mipiace", {
          method: "POST",
          body: JSON.stringify({ mipiace: v.mioMiPiace }),
        });
        v.quantiMiPiace = esito.quanti;
        conto.textContent = v.quantiMiPiace ? String(v.quantiMiPiace) : "";
      } catch (e) {
        v.mioMiPiace = prima;
        cuore.className = "cuore" + (prima ? " mio" : "");
        simbolo.textContent = prima ? "\\u2665" : "\\u2661";
      }
    });
    piedi.append(cuore);

    /**
     * «Tienila»: **non è una copia**.
     *
     * La fa comparire fra le proprie cose, come un segnalibro. Il file resta di
     * chi l'ha fatto, e se lui la toglie dalla bacheca sparisce anche da qui —
     * era sua, ha cambiato idea, e un segnalibro non è un diritto acquisito.
     */
    if (!v.mia) {
      var tieni = document.createElement("button");
      tieni.className = "cuore" + (v.tenuta ? " mio" : "");
      var segnalibro = document.createElement("span");
      segnalibro.className = "simbolo";
      segnalibro.textContent = v.tenuta ? "\\u2605" : "\\u2606";
      var parola = document.createElement("span");
      parola.textContent = v.tenuta ? "tenuta" : "tieni";
      tieni.append(segnalibro, parola);
      tieni.addEventListener("click", async function () {
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id) + "/tengo", {
            method: "POST",
            body: JSON.stringify({ tengo: !v.tenuta }),
          });
          v.tenuta = !v.tenuta;
          tieni.className = "cuore" + (v.tenuta ? " mio" : "");
          segnalibro.textContent = v.tenuta ? "\\u2605" : "\\u2606";
          parola.textContent = v.tenuta ? "tenuta" : "tieni";
        } catch (e) { alert(e.message); }
      });
      piedi.append(tieni);
    } else {
      var togli = document.createElement("button");
      togli.className = "cuore";
      togli.textContent = "togli dalla bacheca";
      togli.addEventListener("click", async function () {
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id) + "/pubblica", {
            method: "POST",
            body: JSON.stringify({ pubblicato: false }),
          });
          await leggiBacheca();
        } catch (e) { alert(e.message); }
      });
      piedi.append(togli);
    }

    box.append(piedi);
    return box;
  }

  /* ---------------------------------------------------------- il profilo */

  function disegnaMioProfilo() {
    riempiFaccia($("mia-faccia"), ioNome, ioFoto);
    riempiFaccia($("mia-faccina"), ioNome, ioFoto);
    $("mio-nome").textContent = ioNome;
    $("profilo-nome").textContent = ioNome || "\\u2014";
    $("profilo-motto").textContent = ioMotto || "Nessuna riga sotto al nome.";
  }

  /**
   * Il foglio del profilo: nome, riga, faccia.
   *
   * Il nome si può cambiare, e **resta unico**: se quello scelto è di qualcun
   * altro il computer dice di no e la frase arriva qui. È lo stesso controllo
   * dell'ingresso, e sta nello stesso posto (il gateway): un controllo scritto
   * due volte è un controllo che prima o poi dice due cose diverse.
   */
  function apriIlProfilo() {
    var carta = apriFoglio("Il tuo profilo");

    var testa = document.createElement("div");
    testa.className = "profilo";
    testa.style.marginBottom = "8px";
    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda grande";
    riempiFaccia(faccia, ioNome, ioFoto);
    var scegli = document.createElement("input");
    scegli.type = "file";
    scegli.accept = "image/*";
    scegli.hidden = true;
    var cambia = document.createElement("button");
    cambia.className = "mini";
    cambia.textContent = ioFoto ? "Cambia foto" : "Metti una foto";
    cambia.addEventListener("click", function () { scegli.click(); });
    var dati = document.createElement("div");
    dati.className = "dati";
    var quale = document.createElement("div");
    quale.className = "nome";
    quale.textContent = ioNome;
    dati.append(quale);
    testa.append(faccia, dati, cambia, scegli);
    carta.append(testa);

    var avviso = document.createElement("div");
    avviso.className = "avviso";

    scegli.addEventListener("change", async function () {
      var file = scegli.files && scegli.files[0];
      scegli.value = "";
      if (!file) return;
      cambia.disabled = true;
      cambia.textContent = "carico\\u2026";
      try {
        var esito = await mandaIlFile(
          "/io/foto?nome=" + encodeURIComponent(file.name),
          file,
        );
        // Con un pezzo di indirizzo che cambia, altrimenti il browser continua
        // a mostrare la foto di prima: è la stessa via, con un contenuto nuovo.
        ioFoto = esito.foto + "?v=" + Date.now();
        riempiFaccia(faccia, ioNome, ioFoto);
        disegnaMioProfilo();
        leggiBacheca();
        avviso.textContent = "";
      } catch (e) {
        avviso.textContent = e.message;
        avviso.className = "avviso male";
      }
      cambia.disabled = false;
      cambia.textContent = "Cambia foto";
    });

    var eNome = document.createElement("label");
    eNome.textContent = "Come ti chiami";
    var campoNome = document.createElement("input");
    campoNome.type = "text";
    campoNome.maxLength = 40;
    campoNome.value = ioNome;

    var eMotto = document.createElement("label");
    eMotto.textContent = "La riga sotto al nome";
    var campoMotto = document.createElement("input");
    campoMotto.type = "text";
    campoMotto.maxLength = 120;
    campoMotto.value = ioMotto;
    campoMotto.placeholder = "due parole su di te, se ti va";

    var fila = document.createElement("div");
    fila.className = "fila";
    var salva = document.createElement("button");
    salva.textContent = "Salva";
    salva.addEventListener("click", async function () {
      salva.disabled = true;
      avviso.className = "avviso";
      avviso.textContent = "";
      try {
        await chiama("/io/profilo", {
          method: "POST",
          body: JSON.stringify({ nome: campoNome.value.trim(), motto: campoMotto.value.trim() }),
        });
        ioNome = campoNome.value.trim() || ioNome;
        ioMotto = campoMotto.value.trim();
        localStorage.setItem(CHIAVE_NOME, ioNome);
        disegnaMioProfilo();
        chiudiFoglio();
        leggiBacheca();
      } catch (e) {
        avviso.textContent = e.message;
        avviso.className = "avviso male";
        campoNome.focus();
        campoNome.select();
      }
      salva.disabled = false;
    });
    fila.append(salva);

    carta.append(eNome, campoNome, eMotto, campoMotto, fila, avviso);
  }

  /**
   * Mette in bacheca una cosa che non ha generato il computer.
   *
   * È l'altra metà di DaProd: una bacheca dove si può solo mostrare quello che
   * la suite ha prodotto è una vetrina, non un posto dove si sta.
   */
  async function caricaInBacheca(file) {
    var avviso = $("avviso-bacheca");
    avviso.className = "avviso";
    avviso.textContent = "Carico " + file.name + "\\u2026";
    try {
      var didascalia = prompt("Due parole da scriverci sotto?", "") || "";
      await mandaIlFile(
        "/bacheca?nome=" + encodeURIComponent(file.name) +
          "&didascalia=" + encodeURIComponent(didascalia),
        file,
      );
      avviso.textContent = "";
      await leggiBacheca();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    }
  }

  /**
   * Manda un file al gateway, col suo tipo e senza involucri.
   *
   * Il corpo **è** il file: niente multipart, niente base64. Un video da cento
   * MA in base64 diventano centotrentatré, e il gateway lo scrive sul disco
   * mentre arriva invece di tenerselo in memoria.
   */
  async function mandaIlFile(percorso, file) {
    var risposta = await fetch(percorso, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    var testo = await risposta.text();
    var corpo = null;
    try { corpo = testo ? JSON.parse(testo) : null; } catch (e) { corpo = null; }
    if (!risposta.ok) throw new Error((corpo && corpo.errore) || ("Errore " + risposta.status));
    return corpo;
  }
`;
