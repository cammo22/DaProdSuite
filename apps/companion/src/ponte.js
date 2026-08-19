/**
 * Tutto quello che sta fuori da questa pagina: il motore e la suite.
 *
 * Stessa forma dei ponti di DaProdMusica e DaProdFoto, con una differenza: qui
 * il motore non è ComfyUI ma il cervello del Companion, che è codice nostro e
 * risponde in JSON su `127.0.0.1:8760`.
 */

/** Riempito all'avvio da `collega`: la porta la dichiara il catalogo, non questa pagina. */
let motore = "http://127.0.0.1:8760";

/* ------------------------------------------------------------------ motore */

/**
 * Si collega al motore e resta in ascolto di quello che gli nasce da solo.
 *
 * **Il WebSocket non è un lusso.** Un sogno comincia perché è arrivata l'ora,
 * non perché qualcuno l'ha chiesto: senza un canale aperto, la pagina lo
 * scoprirebbe solo ricaricando. Le stesse cose valgono per il grafo che cambia.
 *
 * Se il canale cade si riprova, con calma: il motore può essersi spento perché
 * l'utente ha chiuso l'app, e in quel caso non c'è niente da riprendere.
 */
export async function collega(alCambioStato, allEvento) {
  motore = (await window.daprodCompanion.motore()) || motore;

  let ws = null;
  let vivo = true;

  const riprova = () => {
    if (!vivo) return;
    setTimeout(apri, 2500);
  };

  function apri() {
    if (!vivo) return;
    try {
      ws = new WebSocket(`${motore.replace(/^http/, "ws")}/ws`);
    } catch {
      riprova();
      return;
    }

    ws.onopen = () => alCambioStato(true);
    ws.onclose = () => {
      alCambioStato(false);
      riprova();
    };
    // `onerror` non dice niente di utile — il browser non lo racconta — e
    // `onclose` arriva comunque subito dopo: si lascia fare a lui.
    ws.onerror = () => {};
    ws.onmessage = (ev) => {
      try {
        const evento = JSON.parse(ev.data);
        allEvento(evento.type, evento.payload ?? {});
      } catch {
        // Un messaggio che non si capisce si butta: meglio perderne uno che
        // fermare il canale su cui arrivano tutti gli altri.
      }
    };
  }

  apri();
  return () => {
    vivo = false;
    ws?.close();
  };
}

/** Una domanda e una risposta. Può metterci minuti: chi chiama lo mostra. */
export async function parla(messaggio, modello) {
  const risposta = await fetch(`${motore}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messaggio, modello: modello || "" }),
  });
  if (!risposta.ok) {
    throw new Error(await motivo(risposta));
  }
  return risposta.json();
}

/** Cosa non va, se qualcosa non va: LM Studio spento, nessun modello. */
export const diagnostica = () => leggi("/diagnostics");

/** Quello che il Companion ha capito: entità e legami. */
export const grafo = () => leggi("/graph/snapshot");

/** Gli ultimi scambi, come sono salvati nella memoria episodica. */
export const storico = () => leggi("/conversation/history");

/** Quando ha sognato l'ultima volta e quando lo rifarà. */
export const statoSogni = () => leggi("/dreaming/status");

/** Consolida adesso invece di aspettare le quattro. Ci mette un minuto o due. */
export async function sognaOra() {
  const risposta = await fetch(`${motore}/dreaming/run`, { method: "POST" });
  if (!risposta.ok) throw new Error(await motivo(risposta));
  return risposta.json();
}

async function leggi(rotta) {
  const risposta = await fetch(`${motore}${rotta}`);
  if (!risposta.ok) throw new Error(await motivo(risposta));
  return risposta.json();
}

/**
 * Il motivo vero di un errore, non il suo numero.
 *
 * È la lezione del 19 agosto 2026, applicata qui: `500` da solo non dice
 * niente a nessuno, e il perché il motore ce l'ha già scritto nel corpo della
 * risposta. Portarlo dove uno sta guardando costa queste otto righe.
 */
async function motivo(risposta) {
  try {
    const corpo = await risposta.json();
    if (corpo?.detail) return String(corpo.detail);
  } catch {
    // non era JSON: si ripiega sul numero, che è meglio di niente
  }
  return `Il motore ha risposto ${risposta.status}.`;
}

/* ------------------------------------------------------------------ suite */

/**
 * Apre in Esplora risorse la cartella dove i ricordi finiscono scritti.
 *
 * Non passa dalla libreria della suite — quella tiene brani, immagini e video,
 * e un appunto in markdown non è un risultato da ascoltare o da guardare — ma
 * dal ponte di questa app, perché è l'unica che sa dove sta quella cartella.
 */
export const apriCartellaRicordi = () => window.daprodCompanion.apriRicordi();
