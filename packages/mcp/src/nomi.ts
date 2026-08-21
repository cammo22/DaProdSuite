/**
 * I nomi, tradotti da azione a strumento MCP.
 *
 * Sta qui e non in `@daprod/azioni` perché è una regola di MCP, non della
 * suite: le azioni si chiamano `genera.immagine` e va benissimo così: è il
 * protocollo che non ama il punto nei nomi degli strumenti, e non tutti i client
 * lo accettano.
 *
 * La conseguenza pratica di tenerlo separato: `@daprod/azioni` resta senza
 * dipendenze e senza sapere chi lo legge, e questo pacchetto non ha niente da
 * richiedere a runtime — il che è il motivo per cui l'installer può spedire
 * `packages/mcp/dist` da solo, senza portarsi dietro un node_modules.
 */

/** `genera.immagine` → `genera_immagine`. */
export function nomeMcp(id: string): string {
  return id.replace(/\./g, "_");
}

/** L'inverso: `genera_immagine` → `genera.immagine`. */
export function idDaMcp(nome: string): string {
  return nome.replace(/_/g, ".");
}
