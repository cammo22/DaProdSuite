/**
 * La stessa identica domanda che la suite manda a LM Studio, mandata da Node.
 *
 *     node apps/shell/scripts/prova-llm.mjs
 *
 * Serve a separare tre cose che si confondono quando "l'app sembra piantata":
 * il modello e' lento, il nostro client e' lento, oppure la macchina e' occupata
 * da qualcos'altro.
 *
 * **Il 17 agosto 2026 la risposta e' stata la terza**, e ci sono voluti tre giri
 * di misure per arrivarci:
 *
 * | Situazione | Quanto |
 * |---|---|
 * | da Node, macchina libera | 9-10 s |
 * | dalla suite con ComfyUI acceso, via `fetch` | 254 s |
 * | dalla suite con ComfyUI acceso, via `node:http` | 148 s |
 * | dalla suite **senza nessun motore acceso** | **5 s** |
 *
 * Quindi: il modello non c'entra, e il nostro client c'entrava solo per la
 * differenza fra 254 e 148 (da li' `postJson` in `llm.ts`). Quello che conta
 * davvero e' **chi altro sta usando la macchina**: con il motore delle immagini
 * acceso, LM Studio si contende CPU e scheda e va trenta volte piu' piano.
 *
 * Da ricordare quando qualcuno dice "Bonsai e' lento": chiedere prima cosa
 * c'era acceso.
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
