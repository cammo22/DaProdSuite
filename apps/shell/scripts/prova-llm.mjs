/**
 * La stessa identica domanda che la suite manda a LM Studio, mandata da Node.
 *
 * Serve a separare due cose che si confondono: **il modello è lento** oppure
 * **il nostro client è lento**. Il 17 agosto 2026 la risposta è stata la
 * seconda, ed è per questo che questo file resta:
 *
 *     node apps/shell/scripts/prova-llm.mjs
 *     -> 9 secondi, risposta buona
 *
 *     lo stesso corpo da `chiediAllLlm` (processo principale di Electron)
 *     -> 5 minuti e "The operation was aborted due to timeout"
 *
 * Stesso indirizzo, stesso modello, stesso JSON. Quindi non è LM Studio e non è
 * il prompt: è come lo chiediamo noi da dentro Electron. Da riprendere da qui.
 */

const SISTEMA = `Sei un direttore della fotografia che scrive prompt per un modello di immagini.

LA LINGUA:
- Scrivi SEMPRE in inglese, anche se ti parlano in italiano.

COM'È FATTA UNA BUONA DESCRIZIONE:
- Un paragrafo solo, da 30 a 60 parole, senza elenchi e senza titoli.
- Si comincia dal soggetto e da cosa sta facendo, poi il posto.
- Poi la luce (da dove viene, di che colore, che ora del giorno).
- Poi l'inquadratura (close-up, wide shot, from above) e l'obiettivo.
- Poi i materiali e le superfici: bagnato, arrugginito, di velluto, di vetro.

VIETATO:
- Scritte, lettere, numeri, marchi o loghi dentro l'immagine.
- Nomi di persone vere o di marche.
- Parole vuote come "beautiful", "amazing", "masterpiece", "4k", "8k".
- Cambiare il soggetto che ti viene dato: lo allarghi, non lo sostituisci.`;

const corpo = {
  model: "lfm2.5-2.6b",
  messages: [
    { role: "system", content: SISTEMA },
    {
      role: "user",
      content:
        'Allarga questa idea in una descrizione per un modello di immagini. ' +
        'Resta dentro l\'idea, non cambiarla:\n\n"un faro nella tempesta"',
    },
  ],
  temperature: 0.8,
  chat_template_kwargs: { enable_thinking: false },
  max_tokens: 900,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "descrizione",
      strict: true,
      schema: {
        type: "object",
        properties: { descrizione: { type: "string" } },
        required: ["descrizione"],
      },
    },
  },
};

const t = Date.now();
try {
  const r = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(300_000),
  });
  const d = await r.json();
  const m = d.choices?.[0]?.message ?? {};
  console.log(`${Math.round((Date.now() - t) / 1000)}s · http ${r.status}`);
  console.log("content:", (m.content || "").slice(0, 300));
  console.log("usage:", JSON.stringify(d.usage));
} catch (e) {
  console.log(`${Math.round((Date.now() - t) / 1000)}s · errore: ${e.message}`);
}
