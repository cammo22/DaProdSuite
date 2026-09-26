/**
 * Il copione di **Crea** (1.5.2): la Produzione rifatta da zero, per le due
 * cose che fa chiunque — un'immagine e una canzone.
 *
 * Chiesto il 26 settembre 2026, guardando la schermata di «Modifica»: «i
 * pulsanti e la grafica non mi piacciono, vorrei una cosa facile da capire, più
 * intuitiva; togliamo anche i prompt e tutto quanto, ridisegniamola da zero
 * pensando solo che deve funzionare bene con il nuovo Qwen Image 2.1 e YuE».
 *
 * Il modulo di prima era **generico**: leggeva i campi del catalogo e li
 * disegnava uno sotto l'altro, con i prompt salvati in cima, gli stili, e le
 * spiegazioni lunghe del catalogo come sottotitoli. Andava bene per un agente,
 * non per una persona col telefono in mano. Qui invece ci sono solo le domande
 * che servono, fatte a mano:
 *
 * - **Immagine**: nuova o modifica di una foto; cosa vuoi vedere (col dado
 *   delle idee); la forma; **Veloce (8 passi) o Fine (40 passi)**; quante.
 * - **Canzone**: il titolo, i generi a pastiglie, cantata o strumentale, il
 *   testo, la durata. **Il motore lo sceglie la pagina**: col testo scritto
 *   canta YuE2 (che canta le parole che gli dai), senza testo ACE-Step XL
 *   (che il testo se lo inventa).
 *
 * Quello che si manda passa dalla stessa strada di sempre (`/azioni/…`): il
 * catalogo resta l'unico a dire cosa si può chiedere e a controllarlo. Il
 * modulo generico resta per le cose di chi decide — video, voce, 3D — e per
 * la chiacchierata, che riempie quello.
 *
 * Usa gli attrezzi degli altri copioni (chiama, avvisa, vaiA, decido,
 * suTelefono, leggiCoda, anchePerIndirizzo, apriLeMieFoto, caricaImmagine,
 * suUnaTela, telaInBlob, caricaSulComputer, chiudiModulo). Stesse regole: una
 * stringa sola, niente apici inversi e niente barre rovesciate.
 */
export const COPIONE_CREA = `
  /* ------------------------------------------------------ crea (1.5.2) */

  var CREA_CHIAVE = "daprod.crea";
  var crea = {
    cosa: "immagine",
    strada: "nuova",
    testo: "",
    modifica: "",
    forma: "1:1",
    qualita: "veloce",
    quante: 1,
    foto: null,
    titolo: "",
    generi: [],
    voce: "si",
    parole: "",
    durata: 120,
  };
  try {
    var creaLetto = JSON.parse(localStorage.getItem(CREA_CHIAVE) || "{}");
    ["cosa", "strada", "forma", "qualita", "quante", "voce", "durata", "generi"].forEach(function (k) {
      if (creaLetto[k] !== undefined) crea[k] = creaLetto[k];
    });
  } catch (e) { /* la prima volta */ }
  function ricordaCrea() {
    try {
      localStorage.setItem(CREA_CHIAVE, JSON.stringify({
        cosa: crea.cosa, strada: crea.strada, forma: crea.forma, qualita: crea.qualita,
        quante: crea.quante, voce: crea.voce, durata: crea.durata, generi: crea.generi,
      }));
    } catch (e) { /* niente */ }
  }

  var FORME = [
    { id: "1:1", nome: "Quadrata", segno: "creaForma q" },
    { id: "9:16", nome: "Alta", segno: "creaForma a" },
    { id: "16:9", nome: "Larga", segno: "creaForma l" },
    { id: "4:3", nome: "Foto", segno: "creaForma f" },
  ];

  /**
   * I generi a pastiglie: il nome che si legge, e quello che capisce il
   * modello (in inglese, piccolo e preciso: il genere largo e' il primo slop
   * della musica, vedi idee.js).
   */
  var GENERI = [
    ["Pop", "pop"], ["Neomelodico", "neapolitan neo-melodic"], ["Trap", "melodic trap"], ["Rap", "hip hop"],
    ["R&B", "r&b"], ["Rock", "rock"], ["Indie", "indie pop"], ["Cantautorato", "italian singer-songwriter"],
    ["Ballata", "piano ballad"], ["Reggaeton", "reggaeton"], ["Afrobeat", "afrobeat"], ["Dance anni 90", "90s eurodance"],
    ["Italo disco", "italo disco"], ["House", "house"], ["Techno", "techno"], ["Lo-fi", "lo-fi hip hop"],
    ["Jazz", "jazz"], ["Acustica", "acoustic folk"], ["Colonna sonora", "film score"], ["Synthwave", "synthwave"],
  ];

  function azioneDi(id) {
    for (var i = 0; i < azioni.length; i++) if (azioni[i].id === id) return azioni[i];
    return null;
  }

  function disegnaCrea() {
    var dove = $("crea-dentro");
    if (!dove) return;
    var tasti = document.querySelectorAll("[data-crea-cosa]");
    for (var i = 0; i < tasti.length; i++) tasti[i].classList.toggle("scelto", tasti[i].getAttribute("data-crea-cosa") === crea.cosa);
    dove.innerHTML = crea.cosa === "canzone" ? htmlCanzone() : htmlImmagine();
    var t = $("crea-testo");
    if (t) t.value = crea.strada === "modifica" && crea.cosa === "immagine" ? crea.modifica : crea.cosa === "canzone" ? crea.parole : crea.testo;
    var ti = $("crea-titolo");
    if (ti) ti.value = crea.titolo;
    segnaIlTasto();
  }

  function sicuroC(x) {
    return String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function htmlImmagine() {
    var mod = crea.strada === "modifica";
    var h = '<div class="crea-strade">' +
      '<button type="button" data-crea-strada="nuova" class="' + (mod ? "" : "scelto") + '"><b>Nuova</b><small>la scrivi e nasce</small></button>' +
      '<button type="button" data-crea-strada="modifica" class="' + (mod ? "scelto" : "") + '"><b>Modifica</b><small>parti da una foto</small></button>' +
      '</div>';
    if (mod) {
      if (crea.foto) {
        h += '<div class="crea-foto piena"><img src="' + sicuroC(crea.foto.anteprima) + '" alt="">' +
          '<div class="crea-foto-dice"><b>' + sicuroC(crea.foto.nome || "La tua foto") + '</b><small>' + (crea.foto.id ? "pronta" : "la carico…") + '</small></div>' +
          '<button type="button" class="crea-mini" data-crea-foto="cambia">Cambia</button></div>';
      } else {
        h += '<div class="crea-foto"><p>Scegli la foto da cambiare</p><div class="crea-foto-tasti">' +
          '<button type="button" data-crea-foto="mie"><i>▦</i>Le tue foto</button>' +
          '<button type="button" data-crea-foto="galleria"><i>↑</i>Galleria</button>' +
          (suTelefono() ? '<button type="button" data-crea-foto="scatta"><i>◉</i>Scatta</button>' : '') +
          '</div></div>';
      }
    }
    h += '<label class="crea-domanda" for="crea-testo">' + (mod ? "Cosa deve cambiare?" : "Cosa vuoi vedere?") + '</label>' +
      '<div class="crea-scrivi"><textarea id="crea-testo" rows="4" maxlength="2000" placeholder="' +
      (mod ? "fai diventare il cielo un tramonto arancione" : "una vespa rossa parcheggiata davanti a una pizzeria di notte") + '"></textarea>' +
      (mod ? '' : '<button type="button" class="crea-dado" id="crea-dado" title="Un’idea a caso, di quelle vere">🎲 Idea</button>') + '</div>';
    if (!mod) {
      h += '<div class="crea-riga"><span class="crea-etichetta">Forma</span><div class="crea-scelte forme">' +
        FORME.map(function (f) {
          return '<button type="button" data-crea-forma="' + f.id + '" class="' + (crea.forma === f.id ? "scelto" : "") + '"><i class="' + f.segno + '"></i>' + f.nome + '</button>';
        }).join("") + '</div></div>';
    }
    h += '<div class="crea-riga"><span class="crea-etichetta">Come la faccio</span><div class="crea-qualita">' +
      '<button type="button" data-crea-qualita="veloce" class="' + (crea.qualita === "veloce" ? "scelto" : "") + '"><i>⚡</i><b>Veloce</b><small>8 passi · pochi secondi</small></button>' +
      '<button type="button" data-crea-qualita="fine" class="' + (crea.qualita === "fine" ? "scelto" : "") + '"><i>💎</i><b>Fine</b><small>40 passi · più dettaglio</small></button>' +
      '</div></div>';
    h += '<div class="crea-riga"><span class="crea-etichetta">Quante</span><div class="crea-quante">' +
      '<button type="button" data-crea-quante="-1" aria-label="Meno">−</button><b>' + crea.quante + '</b><button type="button" data-crea-quante="1" aria-label="Più">+</button></div></div>';
    h += '<button type="button" class="crea-vai" id="crea-vai">' + (mod ? "✎ Cambia la foto" : "✦ Crea " + (crea.quante > 1 ? crea.quante + " immagini" : "l’immagine")) + '</button>' +
      (decido() ? '<button type="button" class="crea-coda" id="crea-coda">o mettila in fila come tutti</button>' : '') +
      '<p class="crea-nota" id="crea-nota">Qwen-Image 2.1 · ' + (crea.qualita === "veloce" ? "Veloce: la LoRA Viggle, 8 passi" : "Fine: il modello di serie, 40 passi") + '.</p>';
    return h;
  }

  function htmlCanzone() {
    var cantata = crea.voce !== "no";
    var h = '<label class="crea-domanda" for="crea-titolo">Come si chiama?</label>' +
      '<input id="crea-titolo" class="crea-casella" maxlength="80" placeholder="facoltativo: se lo lasci vuoto lo ricavo dal testo">';
    h += '<div class="crea-riga colonna"><span class="crea-etichetta">Che genere · fino a tre <button type="button" class="crea-mini" id="crea-dado-generi">🎲 A caso</button></span>' +
      '<div class="crea-generi">' + GENERI.map(function (g) {
        return '<button type="button" data-crea-genere="' + sicuroC(g[1]) + '" class="' + (crea.generi.indexOf(g[1]) >= 0 ? "scelto" : "") + '">' + sicuroC(g[0]) + '</button>';
      }).join("") + '</div></div>';
    h += '<div class="crea-riga"><span class="crea-etichetta">La voce</span><div class="crea-scelte">' +
      '<button type="button" data-crea-voce="si" class="' + (cantata ? "scelto" : "") + '">🎤 Cantata</button>' +
      '<button type="button" data-crea-voce="no" class="' + (cantata ? "" : "scelto") + '">🎹 Strumentale</button></div></div>';
    if (cantata) {
      h += '<label class="crea-domanda" for="crea-testo">Il testo <small>facoltativo</small></label>' +
        '<div class="crea-scrivi"><textarea id="crea-testo" rows="7" maxlength="4000" placeholder="[Verse]&#10;Le luci del porto si accendono piano&#10;&#10;[Chorus]&#10;…"></textarea></div>' +
        '<div class="crea-sezioni">' + ["[Verse]", "[Chorus]", "[Bridge]", "[Outro]"].map(function (s) {
          return '<button type="button" data-crea-sezione="' + s + '">' + s + '</button>';
        }).join("") + '</div>';
    }
    h += '<div class="crea-riga"><span class="crea-etichetta">Quanto dura</span><div class="crea-scelte">' +
      [[60, "1 min"], [120, "2 min"], [180, "3 min"]].map(function (d) {
        return '<button type="button" data-crea-durata="' + d[0] + '" class="' + (Number(crea.durata) === d[0] ? "scelto" : "") + '">' + d[1] + '</button>';
      }).join("") + '</div></div>';
    h += '<button type="button" class="crea-vai canzone" id="crea-vai">♫ Crea la canzone</button>' +
      (decido() ? '<button type="button" class="crea-coda" id="crea-coda">o mettila in fila come tutti</button>' : '') +
      '<p class="crea-nota" id="crea-nota"></p>';
    return h;
  }

  /** Il motore della canzone: col testo YuE2 lo canta, senza ACE-Step se lo inventa. */
  function motoreCanzone() {
    return crea.voce !== "no" && crea.parole.trim() ? "yue2" : "ace-xl-turbo";
  }

  function segnaIlTasto() {
    var vai = $("crea-vai");
    var nota = $("crea-nota");
    if (!vai) return;
    var manca = "";
    if (crea.cosa === "immagine") {
      if (crea.strada === "modifica" && !crea.foto) manca = "Prima scegli la foto.";
      else if (crea.strada === "modifica" && !crea.foto.id) manca = "Aspetta che la foto sia caricata.";
      else if (!(crea.strada === "modifica" ? crea.modifica : crea.testo).trim()) manca = crea.strada === "modifica" ? "Scrivi cosa deve cambiare." : "Scrivi cosa vuoi vedere, o tira il dado.";
    } else {
      if (!crea.generi.length) manca = "Scegli almeno un genere.";
      if (nota) {
        nota.textContent = motoreCanzone() === "yue2"
          ? "La canta YuE2, con le tue parole, nella lingua in cui le scrivi."
          : crea.voce === "no" ? "Strumentale, con ACE-Step XL." : "Senza testo il testo se lo inventa ACE-Step XL. Se lo scrivi, la canta YuE2.";
      }
    }
    vai.disabled = Boolean(manca);
    vai.title = manca;
    var coda = $("crea-coda");
    if (coda) coda.disabled = Boolean(manca);
    if (nota && crea.cosa === "immagine") {
      nota.textContent = manca || "Qwen-Image 2.1 · " + (crea.qualita === "veloce" ? "Veloce: la LoRA Viggle, 8 passi" : "Fine: il modello di serie, 40 passi") + ".";
    }
  }

  /* ---------------------------------------------------- la foto da cambiare */

  var creaScegli = null;
  var creaScatta = null;
  function casellaFile(scatta) {
    var c = document.createElement("input");
    c.type = "file";
    c.accept = "image/" + "*";
    if (scatta) c.setAttribute("capture", "environment");
    c.hidden = true;
    c.addEventListener("change", function () {
      var f = c.files && c.files[0];
      if (!f) return;
      var indirizzo = URL.createObjectURL(f);
      void mettiLaFoto(indirizzo, scatta ? "appena scattata" : f.name).then(function () { URL.revokeObjectURL(indirizzo); });
      c.value = "";
    });
    document.body.append(c);
    return c;
  }

  /** La foto scelta: si porta a misura, si fa vedere, e si carica sul computer. */
  async function mettiLaFoto(sorgente, nome) {
    crea.foto = { anteprima: "", nome: nome, id: "" };
    disegnaCrea();
    try {
      var im = await caricaImmagine(sorgente);
      var tela = suUnaTela(im);
      crea.foto.anteprima = tela.toDataURL("image/jpeg", 0.7);
      crea.foto.nome = (nome || "La tua foto") + " · " + tela.width + "×" + tela.height;
      disegnaCrea();
      var id = await caricaSulComputer(await telaInBlob(tela), "sorgente");
      if (crea.foto) crea.foto.id = id;
      disegnaCrea();
    } catch (e) {
      crea.foto = null;
      disegnaCrea();
      avvisa("La foto non e' arrivata: " + (e.message || e), "male");
    }
  }

  /* ---------------------------------------------------------- le idee */

  var idee = null;
  function leIdee() {
    if (idee) return Promise.resolve(idee);
    return import("/daprod/idee.js").then(function (m) { idee = m; return m; });
  }

  /* ---------------------------------------------------------- mandare */

  async function mandaCrea(inCoda) {
    var id, valori = {};
    if (crea.cosa === "immagine") {
      var modello = crea.qualita === "veloce" ? "qwen21-turbo" : "qwen21";
      if (crea.strada === "modifica") {
        id = "modifica.immagine";
        valori = { immagine: crea.foto.id, prompt: crea.modifica.trim(), modello: modello };
      } else {
        id = "genera.immagine";
        valori = { prompt: crea.testo.trim(), forma: crea.forma, risoluzione: "1080", quante: String(crea.quante), modello: modello };
      }
    } else {
      id = "genera.brano";
      var cantata = crea.voce !== "no";
      valori = {
        descrizione: crea.generi.slice(0, 3).join(", "),
        voce: cantata ? "si" : "no",
        secondi: String(crea.durata),
        modello: motoreCanzone(),
      };
      if (crea.titolo.trim()) valori.titolo = crea.titolo.trim();
      if (cantata && crea.parole.trim()) valori.testo = crea.parole.trim();
    }
    var vai = $("crea-vai");
    vai.disabled = true;
    var prima = vai.textContent;
    vai.textContent = "Lo mando…";
    try {
      var coda = anchePerIndirizzo(valori);
      if (inCoda) coda += (coda ? "&" : "?") + "inCoda=1";
      var esito = await chiama("/azioni/" + encodeURIComponent(id) + coda, { method: "POST", body: JSON.stringify(valori) });
      if (esito.esito === "in-coda") {
        avvisa(esito.quante > 1 ? esito.quante + " lavori in fila: uno per ognuna." : "Mandato al computer: lo trovi in Fila.", "bene");
        await leggiCoda();
        vaiA("riepilogo");
      } else {
        avvisa("Fatto.", "bene");
      }
    } catch (e) {
      avvisa(e.message, "male");
    } finally {
      vai.textContent = prima;
      segnaIlTasto();
    }
  }

  /* ---------------------------------------------------------- i gesti */

  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("button") : null;
    if (!b || !b.closest("#crea")) return;
    var v;
    if ((v = b.getAttribute("data-crea-cosa"))) {
      crea.cosa = v;
      if (typeof chiudiModulo === "function") chiudiModulo();
    } else if ((v = b.getAttribute("data-crea-strada"))) crea.strada = v;
    else if ((v = b.getAttribute("data-crea-forma"))) crea.forma = v;
    else if ((v = b.getAttribute("data-crea-qualita"))) crea.qualita = v;
    else if ((v = b.getAttribute("data-crea-quante"))) crea.quante = Math.max(1, Math.min(4, crea.quante + Number(v)));
    else if ((v = b.getAttribute("data-crea-voce"))) crea.voce = v;
    else if ((v = b.getAttribute("data-crea-durata"))) crea.durata = Number(v);
    else if ((v = b.getAttribute("data-crea-genere"))) {
      var i = crea.generi.indexOf(v);
      if (i >= 0) crea.generi.splice(i, 1);
      else { crea.generi.push(v); if (crea.generi.length > 3) crea.generi.shift(); }
    } else if ((v = b.getAttribute("data-crea-sezione"))) {
      var t = $("crea-testo");
      var aCapo = t.value && t.value.slice(-1) !== String.fromCharCode(10) ? String.fromCharCode(10) : "";
      t.value += aCapo + v + String.fromCharCode(10);
      crea.parole = t.value;
      t.focus();
      segnaIlTasto();
      return;
    } else if ((v = b.getAttribute("data-crea-foto"))) {
      if (v === "cambia") { crea.foto = null; disegnaCrea(); return; }
      if (v === "mie") { void apriLeMieFoto(function (sorgente, nome) { return mettiLaFoto(sorgente, nome); }); return; }
      if (v === "galleria") { (creaScegli || (creaScegli = casellaFile(false))).click(); return; }
      if (v === "scatta") { (creaScatta || (creaScatta = casellaFile(true))).click(); return; }
    } else if (b.id === "crea-dado") {
      leIdee().then(function (m) {
        var idea = m.ideaImmagine();
        crea.testo = idea.prompt;
        var t2 = $("crea-testo");
        if (t2) t2.value = crea.testo;
        segnaIlTasto();
      }, function () { avvisa("Le idee non si sono caricate: riprova.", "male"); });
      return;
    } else if (b.id === "crea-dado-generi") {
      var messi = [];
      while (messi.length < 2) {
        var g = GENERI[Math.floor(Math.random() * GENERI.length)][1];
        if (messi.indexOf(g) < 0) messi.push(g);
      }
      crea.generi = messi;
    } else if (b.id === "crea-vai") { void mandaCrea(false); return; }
    else if (b.id === "crea-coda") { void mandaCrea(true); return; }
    else return;
    ricordaCrea();
    disegnaCrea();
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t || !t.closest || !t.closest("#crea")) return;
    if (t.id === "crea-testo") {
      if (crea.cosa === "canzone") crea.parole = t.value;
      else if (crea.strada === "modifica") crea.modifica = t.value;
      else crea.testo = t.value;
    }
    if (t.id === "crea-titolo") crea.titolo = t.value;
    segnaIlTasto();
  });

  /** Da fuori (una tessera della Casa): si entra in Crea sulla cosa giusta. */
  function apriCrea(cosa, strada) {
    crea.cosa = cosa;
    if (strada) crea.strada = strada;
    ricordaCrea();
    vaiA("produzione");
    if (typeof chiudiModulo === "function") chiudiModulo();
    disegnaCrea();
  }
`;
