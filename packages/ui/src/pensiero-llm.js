/**
 * La finestrella del modello che pensa, con i token che escono in diretta.
 *
 * **Perché esiste.** Un modello locale che ragiona su una scheda da 8 GB ci
 * mette da venti secondi a due minuti. Fino alla 0.5.2 in quei due minuti si
 * vedeva un tasto spento e una riga di testo ferma, e da fuori un modello che
 * pensa e un modello piantato sono la stessa identica cosa: nessuno dei due si
 * muove, e non c'è modo di sapere quale dei due stai guardando. Chi aspettava
 * ripremeva, o chiudeva l'app.
 *
 * Adesso si vede: un pallino che batte, il cronometro, i token che arrivano uno
 * a uno e quanti al secondo ne sta facendo. Non è un vezzo — è il solo numero
 * che dica «questo modello su questa macchina è troppo lento», e serve a
 * decidere se caricarne uno più piccolo.
 *
 * **Sta in `packages/ui` e non dentro DaProdCinema.** Il ragionamento non è di
 * una scheda: lo fa il modello, che è uno per tutta la suite. Nasce qui perché
 * il primo a chiederlo è stato lo storyboard, ma DaProdMusica e DaProdFoto lo
 * agganciano con due righe il giorno che serve.
 *
 * Si usa così:
 *
 *     import { chiediMostrando } from "/comune/pensiero-llm.js";
 *     const esito = await chiediMostrando(el.dovePensa, { sistema, utente, ... });
 *
 * e `esito` è lo stesso `EsitoLlm` di `suite.llm.chiedi`.
 */

const suite = window.daprodSuite;

/**
 * Lo stile se lo porta dietro il componente.
 *
 * DaProdCinema e DaProdFoto non caricano `tema.css`: hanno ancora il loro
 * foglio, per la ragione scritta in cima a `apps/cinema/stile.css`. Una
 * finestrella che arrivasse senza colori sarebbe peggio di non averla, e
 * ricordarsi di aggiungere un `<link>` in ogni app è esattamente il tipo di
 * cosa che si dimentica alla quarta. Quindi lo mette lei, una volta sola.
 */
(function vestiti() {
  const dove = "/comune/pensiero-llm.css";
  if (document.querySelector(`link[href="${dove}"]`)) return;
  const foglio = document.createElement("link");
  foglio.rel = "stylesheet";
  foglio.href = dove;
  document.head.appendChild(foglio);
})();

/** Ogni quanto si ridisegnano cronometro e velocità. Mezzo secondo basta. */
const BATTITO_MS = 500;

/**
 * Quanti caratteri si tengono nella finestra.
 *
 * Un ragionamento lungo sono decine di migliaia di caratteri, e riscriverli
 * tutti a ogni token vuol dire una pagina che scatta. Si tiene la coda, che è
 * l'unica parte che qualcuno stia davvero guardando.
 */
const CODA_MAX = 4000;

/**
 * Aggancia una finestrella dentro `contenitore` e la comanda.
 *
 * Torna quattro funzioni. Chi vuole il giro completo usa `chiediMostrando` qui
 * sotto; queste servono a chi il modello lo chiama per conto suo.
 */
export function creaPensiero(contenitore, opzioni = {}) {
  const titolo = opzioni.titolo ?? "Il modello sta pensando";

  contenitore.innerHTML = `
    <div class="pensiero" hidden>
      <div class="pensiero-testa">
        <span class="pensiero-pallino"></span>
        <b class="pensiero-titolo">${escape(titolo)}</b>
        <span class="pensiero-conto"></span>
        <button type="button" class="mini pensiero-mostra">nascondi</button>
      </div>
      <pre class="pensiero-flusso"><code></code></pre>
    </div>`;

  const scatola = contenitore.querySelector(".pensiero");
  const pallino = contenitore.querySelector(".pensiero-pallino");
  const etichetta = contenitore.querySelector(".pensiero-titolo");
  const conto = contenitore.querySelector(".pensiero-conto");
  const mostra = contenitore.querySelector(".pensiero-mostra");
  const flusso = contenitore.querySelector(".pensiero-flusso");
  const codice = flusso.querySelector("code");

  let partito = 0;
  let caratteri = 0;
  let coda = "";
  let battito = null;
  /** Chi guarda un punto preciso del ragionamento non va riportato in fondo. */
  let seguiIlFondo = true;

  flusso.onscroll = () => {
    seguiIlFondo = flusso.scrollHeight - flusso.scrollTop - flusso.clientHeight < 24;
  };

  mostra.onclick = () => {
    const chiuso = flusso.hasAttribute("hidden");
    if (chiuso) flusso.removeAttribute("hidden");
    else flusso.setAttribute("hidden", "");
    mostra.textContent = chiuso ? "nascondi" : "mostra";
  };

  function ridisegnaConto() {
    const secondi = (Date.now() - partito) / 1000;
    // I token non li conta nessuno: LM Studio in streaming non li dice, e
    // chiederli a fine risposta non aiuterebbe chi sta aspettando. Quattro
    // caratteri per token è la regola del pollice, e per capire se il modello
    // va o non va è abbastanza — la riga dice «circa», non finge precisione.
    const token = Math.round(caratteri / 4);
    const velocita = secondi > 1 ? Math.round(token / secondi) : 0;
    conto.textContent =
      `${formattaDurata(secondi)}` +
      (token ? ` · ~${token} token` : "") +
      (velocita ? ` · ~${velocita}/s` : "");
  }

  return {
    /** Comincia: la finestra compare e il cronometro parte. */
    parti(sottotitolo) {
      partito = Date.now();
      caratteri = 0;
      coda = "";
      seguiIlFondo = true;
      codice.textContent = "";
      codice.className = "";
      scatola.hidden = false;
      scatola.classList.add("vivo");
      flusso.removeAttribute("hidden");
      mostra.textContent = "nascondi";
      etichetta.textContent = sottotitolo ?? titolo;
      pallino.classList.add("batte");
      ridisegnaConto();
      clearInterval(battito);
      battito = setInterval(ridisegnaConto, BATTITO_MS);
    },

    /** Un frammento arrivato: o ragionamento, o risposta vera. */
    pezzo({ testo, pensiero }) {
      const arrivato = testo ?? pensiero ?? "";
      if (!arrivato) return;
      caratteri += arrivato.length;
      coda = (coda + arrivato).slice(-CODA_MAX);
      // Il ragionamento si legge più smorto della risposta: sono due cose
      // diverse, e chi guarda deve poterle distinguere con la coda dell'occhio.
      codice.className = testo ? "risposta" : "ragiona";
      codice.textContent = coda;
      if (seguiIlFondo) flusso.scrollTop = flusso.scrollHeight;
    },

    /** Finito: il pallino si ferma e resta scritto quanto ci ha messo. */
    finito(esito) {
      clearInterval(battito);
      battito = null;
      pallino.classList.remove("batte");
      scatola.classList.remove("vivo");
      ridisegnaConto();
      etichetta.textContent = esito?.ok ? "Ha risposto" : "Non ha risposto";
      scatola.classList.toggle("male", !esito?.ok);
      // A risposta arrivata la finestra si chiude da sé: il ragionamento serve
      // mentre aspetti, non dopo. Chi lo vuole rileggere preme «mostra».
      flusso.setAttribute("hidden", "");
      mostra.textContent = "mostra";
    },

    /** Via del tutto: si usa quando si azzera quello che c'era. */
    nascondi() {
      clearInterval(battito);
      battito = null;
      scatola.hidden = true;
    },
  };
}

/**
 * Il giro completo: chiedi al modello e fai vedere che ci sta pensando.
 *
 * È quello che serve quasi sempre. Se il ponte della suite non conosce ancora
 * la risposta in diretta — una finestra rimasta aperta da una versione
 * precedente — si ripiega sulla domanda muta invece di rompersi: si vede meno,
 * ma la risposta arriva.
 */
export async function chiediMostrando(contenitore, domanda, opzioni = {}) {
  const pensiero = creaPensiero(contenitore, opzioni);
  pensiero.parti(opzioni.titolo);
  try {
    const esito = suite.llm.chiediInDiretta
      ? await suite.llm.chiediInDiretta(domanda, (p) => pensiero.pezzo(p))
      : await suite.llm.chiedi(domanda);
    pensiero.finito(esito);
    return esito;
  } catch (e) {
    const esito = { ok: false, testo: "", motivo: String(e?.message || e) };
    pensiero.finito(esito);
    return esito;
  }
}

/** `95` diventa `1:35`, ma sotto il minuto resta in secondi: è più leggibile. */
function formattaDurata(secondi) {
  if (secondi < 60) return `${secondi.toFixed(secondi < 10 ? 1 : 0)} s`;
  const m = Math.floor(secondi / 60);
  const s = Math.floor(secondi % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const escape = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
