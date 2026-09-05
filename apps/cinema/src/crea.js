/**
 * La scheda: dal testo a un video.
 *
 * DaProdCinema faceva un'altra cosa, fino alla 0.4.1: prendeva una canzone dalla
 * libreria, ne leggeva i `[Verse]` e i `[Chorus]`, scriveva una scaletta di
 * diciassette inquadrature e le girava una dopo l'altra. Era un video musicale
 * automatico costruito sopra a una generazione base che non era mai stata
 * provata — e infatti non funzionava: il latente audio-video non veniva
 * separato prima di decodificarlo, che è un errore del motore, non un video
 * brutto.
 *
 * Adesso la scheda fa **la generazione base, e solo quella**. Si scrive cosa si
 * vuole vedere, si scelgono forma e misura come in DaProdFoto, si preme. Il
 * video musicale tornerà quando ci sarà sotto qualcosa che funziona: costruire
 * il piano su un pezzo mai provato è esattamente l'errore che è stato fatto.
 *
 * Il giro è corto e sta tutto qui sotto:
 *
 * 1. si legge il modulo e si controlla che ci sia il minimo per partire
 * 2. si svuota la scheda video (`memoria.js`)
 * 3. si caricano nel motore i fotogrammi o i riferimenti (`riferimenti.js`)
 * 4. si manda il grafo e si mette il lavoro nella sessione (`coda.js`)
 */

import {
  el, escapeHtml, libera, mostraErrore, nascondiErrore, occupa, rnd,
} from "./dom.js";
import { ESTETICHE, PROPOSTE } from "./dati/estetiche.js";
import { NEGATIVO, grafoClip, secondiVeri } from "./grafi.js";
import { videoLungo } from "./lungo.js";
import { collegaFormato, misuraScelta } from "./formato.js";
import { collegaScelta, modelloCorrente, modelloUsabile, modoCorrente } from "./scelta-modello.js";
import { caricaIngressi, collegaIngressi } from "./riferimenti.js";
import { faiSpazio } from "./memoria.js";
import { aggiungiLavoro, collegaComandiCoda } from "./coda.js";
import { storiaRileggiConti } from "./storia.js";
import * as ponte from "./ponte.js";
// Le pastiglie con le proposte sono di tutte le app, non di questa: stanno in
// `packages/ui` e la suite le serve sotto `/comune/`, dalla stessa origine
// della pagina. Qui si dice solo cosa proporre e dove finisce quello che clicchi.
import { collegaProposte } from "/comune/proposte.js";

function leggiModulo() {
  const { larghezza, altezza, etichetta } = misuraScelta();
  return {
    prompt: el.prompt.value.trim(),
    larghezza,
    altezza,
    misura: etichetta,
    secondi: Number(el.durata.value),
    passi: parseInt(el.passi.value),
    negativo: el.negativo.value.trim() || NEGATIVO,
    seed: parseInt(el.seed.value) || 0,
    // Il LoRA del modo scelto, o niente: è la differenza fra i quattro passi e
    // i venti, e la decide il pulsante «Qualità», non il cursore dei passi.
    lora: modoCorrente().lora,
  };
}

/**
 * L'estetica si scrive nella casella, non dietro le quinte.
 *
 * Stessa scelta di DaProdFoto, e per la stessa ragione: un menu che attacca le
 * sue parole in fondo al prompt senza dirlo fa somigliare tutti i video fra loro
 * senza che si capisca perché. Così invece le vedi, le correggi, le cancelli — e
 * di suo non c'è niente, che è quello che dà più varietà al modello.
 */
function collegaEstetica() {
  el.estetica.innerHTML = [
    `<option value="">nessuna</option>`,
    ...Object.keys(ESTETICHE).map((k) => `<option>${escapeHtml(k)}</option>`),
  ].join("");
  el.estetica.value = "";

  let ultima = "";
  el.estetica.onchange = () => {
    const parole = ESTETICHE[el.estetica.value] ?? "";
    const testo = el.prompt.value;

    // Si toglie quella di prima invece di accumularle: cambiare tre volte idea
    // non deve lasciare tre estetiche in fila dentro la stessa descrizione.
    const pulito = ultima
      ? testo.replace(ultima, "").replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim()
      : testo.trim();
    el.prompt.value = [pulito, parole].filter(Boolean).join(", ");
    ultima = parole;
  };
}

/**
 * La riga sotto al cursore della durata.
 *
 * Dice i **fotogrammi veri**, non quelli chiesti. Nessuno dei due modelli prende
 * un numero qualunque — LTX vuole `8n+1`, H3 vuole `17k+5` — e la differenza fra
 * i due numeri è il motivo per cui un video di «10 secondi» ne dura 10,04 o 9,7.
 * Scriverlo qui costa una riga e toglie di mezzo una domanda.
 */
function raccontaDurata() {
  const m = modelloCorrente();
  const chiesti = Number(el.durata.value);
  const veri = secondiVeri(chiesti, m);
  el.durataVal.textContent = `${veri.toFixed(2).replace(".", ",")} s`;

  // Sopra i dieci secondi la memoria del campionatore diventa il collo di
  // bottiglia, e il modo di non finirla è scendere di risoluzione. Meglio dirlo
  // qui che farglielo scoprire da un errore dopo otto minuti.
  el.notaDurata.textContent = chiesti > 10 ? "sopra i 10 s conviene stare a 720p" : "";
}

/** «Genera» si accende solo se con questo modello si può davvero generare. */
function accendiBottoni() {
  el.genera.disabled = !modelloUsabile();
}

/**
 * Un video lungo, chiesto da fuori.
 *
 * **Non aspetta che finisca**, ed è voluto: fra il telefono e questa funzione
 * c'è lo shell, che sta fermo finché la scheda non dice «è partita» (vedi
 * `collegaLavoriDaFuori`). Un minuto di video sono parecchi minuti di lavoro, e
 * tenerlo in attesa vorrebbe dire far scadere la richiesta prima ancora del
 * primo pezzo. Si fa partire e si torna; il file cucito lo trova lo shell da sé
 * quando compare, come per tutte le altre generazioni.
 *
 * L'avanzamento si racconta nel riquadro degli errori — che è l'unico posto di
 * questa scheda in cui si scrive a chi guarda — e non è un errore: la classe
 * cambia, e quando finisce sparisce.
 */
export async function lungoDaFuori(secondi) {
  const m = modelloCorrente();
  const p = leggiModulo();
  if (!p.prompt) throw new Error("Scrivi cosa vuoi vedere.");
  if (m.ingressi !== "fotogrammi") {
    throw new Error(
      "Per un video lungo serve LTX 2.5: e' l'unico che sa ripartire da un fotogramma.",
    );
  }

  await faiSpazio((detto) => occupa(el.genera, detto));

  // Fire and forget, con le sue parole: quello che va storto si legge qui.
  void videoLungo(m, { ...p, secondi }, (detto) => {
    el.error.style.display = "block";
    el.error.classList.add("lavorando");
    el.error.textContent = `Video lungo: ${detto}`;
  })
    .then(() => {
      el.error.textContent = "Video lungo: cucito. Lo trovi in galleria.";
      setTimeout(() => nascondiErrore(), 6000);
    })
    .catch((e) => {
      el.error.classList.remove("lavorando");
      mostraErrore(String(e.message || e));
    })
    .finally(() => {
      el.error.classList.remove("lavorando");
      libera(el.genera, !modelloUsabile());
    });
}

export async function collegaCrea() {
  collegaEstetica();
  collegaFormato();
  collegaProposte(el.proposte, {
    chiave: "daprod.cinema.proposte",
    difetto: PROPOSTE,
    applica: (prompt) => (el.prompt.value = prompt),
    // Il "+" parte da quello che hai appena scritto: la proposta che vale la
    // pena salvare è quasi sempre quella con cui è appena uscito un video buono.
    testoCorrente: () => el.prompt.value.trim(),
  });

  el.negativo.value = NEGATIVO;
  el.seed.value = rnd();
  el.dado.onclick = () => (el.seed.value = rnd());
  el.durata.addEventListener("input", raccontaDurata);
  el.passi.addEventListener("input", () => (el.passiVal.textContent = el.passi.value));

  el.toggleAdv.onclick = () => {
    el.avanzati.hidden = !el.avanzati.hidden;
    el.toggleAdv.classList.toggle("on", !el.avanzati.hidden);
  };

  // I riquadri di sopra si ridisegnano quando cambia il modello e quando cambia
  // il loro contenuto: le etichette `<Picture 1>` dipendono da quanti ce n'è.
  collegaIngressi(modelloCorrente(), raccontaDurata);
  collegaComandiCoda();

  // Per ultimo: è il menu dei modelli che decide durata, passi e riquadri, e
  // quando arriva deve trovare tutto il resto già in piedi.
  await collegaScelta(() => {
    accendiBottoni();
    raccontaDurata();
    // Anche la Storia: la griglia dei fotogrammi cambia con il modello, e con
    // lei quante inquadrature servono per gli stessi minuti.
    storiaRileggiConti();
  });

  el.genera.onclick = () => void genera();
}

async function genera() {
  nascondiErrore();
  const m = modelloCorrente();
  const p = leggiModulo();

  // L'unica cosa che serve davvero: cosa vuoi vedere. I riferimenti di H3 sono
  // facoltativi — il consiglio di usare LTX quando non ce ne sono sta scritto
  // sotto ai riquadri, e resta un consiglio.
  if (!p.prompt) return mostraErrore("Scrivi cosa vuoi vedere.");

  // Da qui in poi il tasto è spento e racconta. Il `try` comincia **prima** di
  // tutto quello che può metterci: un errore fuori dal try uscirebbe di qui
  // senza scrivere niente da nessuna parte, e il tasto sembrerebbe morto.
  occupa(el.genera, "preparo…");
  try {
    // **Adesso, non prima.** Fra lo scrivere il prompt e il premere passano
    // pochi secondi, e in quei secondi la scheda può essere ancora occupata da
    // un'altra app o dal modello che scrive.
    await faiSpazio((detto) => occupa(el.genera, detto));

    const dentro = await caricaIngressi(m, (detto) => occupa(el.genera, detto));

    occupa(el.genera, "mando al motore…");
    const quante = Math.max(1, Math.min(4, parseInt(el.quante.value) || 1));
    for (let i = 0; i < quante; i++) {
      // Dalla seconda in poi il seed cambia comunque: quattro copie dello stesso
      // video non sono quattro video.
      if (el.seedCasuale.checked || i > 0) el.seed.value = rnd();
      const parametri = { ...leggiModulo(), ...dentro };

      const id = await ponte.invia(grafoClip(m, parametri));
      aggiungiLavoro(id, p.prompt, {
        modello: m.nome,
        prompt: parametri.prompt,
        estetica: el.estetica.value,
        misura: parametri.misura,
        secondi: secondiVeri(parametri.secondi, m),
        passi: parametri.passi,
        // Con o senza turbo: fra due video dello stesso modello è la differenza
        // che si vede di più, e a distanza di giorni non ci si ricorda.
        modo: modoCorrente().nome,
        seed: parametri.seed,
      });
    }
  } catch (e) {
    mostraErrore(String(e.message || e));
  } finally {
    // Non `disabled = false` e basta: mentre lavorava, il controllo dei modelli
    // può aver deciso che con quello scelto non si genera più.
    libera(el.genera, !modelloUsabile());
  }
}
