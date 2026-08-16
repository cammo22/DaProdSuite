/**
 * Parla con una finestra della suite mentre è aperta, e le fa fare le cose.
 *
 *   cd apps/shell
 *   .\node_modules\.bin\electron.CMD . --apri foto --remote-debugging-port=9333
 *   node scripts/pilota.cjs foto "document.getElementById('modello').value"
 *   node scripts/pilota.cjs foto "document.getElementById('genera').click()"
 *
 * Il primo argomento è un pezzo del titolo o dell'indirizzo della finestra
 * (`foto`, `musica`, `visualizer`, `renderer` per l'hub); il secondo è
 * un'espressione JavaScript, anche `async`.
 *
 * **A cosa serve davvero.** Un difetto dell'interfaccia, da fuori, è un bottone
 * che non fa niente: non si sa se il clic è arrivato, se una chiamata è
 * fallita, o se lo stato era già sbagliato prima. Da qui si legge lo stato vero
 * della pagina e si eseguono gli stessi passaggi di un clic, uno per volta.
 *
 * È così che il 16 agosto è saltato fuori che `fetch` verso `daprod://file`
 * falliva mentre una `<img>` sullo stesso indirizzo funzionava: quattro righe
 * di prova dentro la pagina, e il difetto ha smesso di essere un mistero.
 */

const PORTA = process.env.CDP_PORTA || 9333;

async function main() {
  const cerca = process.argv[2] || "foto";
  const codice = process.argv[3];

  const elenco = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
  const pagine = elenco.filter((t) => t.type === "page");
  const scelta = pagine.find((t) => (t.url + t.title).toLowerCase().includes(cerca.toLowerCase()));

  if (!scelta) {
    console.log("pagine trovate:", pagine.map((p) => `${p.title} <${p.url}>`).join(" | ") || "nessuna");
    process.exit(1);
  }
  if (!codice) {
    console.log(`trovata: ${scelta.title} <${scelta.url}>`);
    return;
  }

  const ws = new WebSocket(scelta.webSocketDebuggerUrl);
  await new Promise((ok, ko) => {
    ws.onopen = ok;
    ws.onerror = ko;
  });

  const risposta = await new Promise((ok) => {
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === 1) ok(m.result);
    };
    ws.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: { expression: codice, awaitPromise: true, returnByValue: true },
      }),
    );
  });

  ws.close();
  if (risposta.exceptionDetails) {
    console.log("ECCEZIONE:", risposta.exceptionDetails.text, risposta.exceptionDetails.exception?.description ?? "");
  } else {
    const v = risposta.result?.value;
    console.log(typeof v === "string" ? v : JSON.stringify(v, null, 1));
  }
}

main().catch((e) => {
  console.error("errore:", e.message);
  process.exit(1);
});
