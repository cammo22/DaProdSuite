/**
 * Il client HTTP verso il gateway della suite.
 *
 * Piccolo apposta: il server MCP parla solo con `/azioni`, `/stato` e
 * `/accoppiamento`, e non deve conoscere niente di più. Tutto il resto — quali
 * azioni esistono, chi può chiederle, cosa succede dopo — lo decide il gateway,
 * che è lo stesso per l'agente, per il telefono e per il portatile.
 */

import type { Schema } from "@daprod/azioni";

/** Un'azione come la racconta il gateway, con lo schema già pronto. */
export interface AzioneRemota {
  id: string;
  app: string | null;
  titolo: string;
  descrizione: string;
  produce: "file" | "elenco" | "niente";
  coda: boolean;
  schema: Schema;
}

/** Cosa risponde il gateway a chi chiede un'azione. */
export type EsitoRemoto =
  | { esito: "in-coda"; richiesta: { id: string; testo: string; app: string; stato: string } }
  | { esito: "fatto"; risultato: unknown };

export class ErroreGateway extends Error {
  constructor(
    message: string,
    readonly codice: number,
  ) {
    super(message);
  }
}

export class Cliente {
  constructor(
    private host: string,
    private token: string,
  ) {}

  async azioni(): Promise<AzioneRemota[]> {
    return this.chiama<AzioneRemota[]>("GET", "/azioni");
  }

  async esegui(id: string, argomenti: Record<string, unknown>): Promise<EsitoRemoto> {
    return this.chiama<EsitoRemoto>("POST", `/azioni/${encodeURIComponent(id)}`, argomenti);
  }

  async stato(): Promise<unknown> {
    return this.chiama<unknown>("GET", "/stato");
  }

  private async chiama<T>(metodo: string, percorso: string, corpo?: unknown): Promise<T> {
    let risposta: Response;
    try {
      risposta = await fetch(`http://${this.host}${percorso}`, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
    } catch {
      // Il caso di gran lunga più comune, e vale la pena dirlo per esteso: il
      // PC è spento, o la suite è chiusa, o l'accesso remoto non è acceso.
      throw new ErroreGateway(
        `Non riesco a raggiungere la suite su ${this.host}. Il computer è acceso, la suite aperta, e l'accesso remoto è acceso nel pannello «Da fuori»?`,
        0,
      );
    }

    const testo = await risposta.text();
    let dati: unknown = null;
    try {
      dati = testo ? JSON.parse(testo) : null;
    } catch {
      dati = null;
    }

    if (!risposta.ok) {
      const errore =
        dati && typeof dati === "object" && "errore" in dati
          ? String((dati as { errore: unknown }).errore)
          : `Errore ${risposta.status}`;
      if (risposta.status === 401) {
        throw new ErroreGateway(
          "La suite non riconosce più questo agente: probabilmente è stato revocato dal pannello «Da fuori». Rifai l'accoppiamento.",
          401,
        );
      }
      throw new ErroreGateway(errore, risposta.status);
    }

    return dati as T;
  }
}

/** L'accoppiamento: l'unica chiamata che non ha ancora un token. */
export async function accoppia(
  host: string,
  codice: string,
  nome: string,
): Promise<{ token: string; computer: string; ruolo: string }> {
  const risposta = await fetch(`http://${host}/accoppiamento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codice, nome }),
  });
  const testo = await risposta.text();
  let dati: Record<string, unknown> = {};
  try {
    dati = testo ? (JSON.parse(testo) as Record<string, unknown>) : {};
  } catch {
    dati = {};
  }
  if (!risposta.ok) {
    throw new ErroreGateway(String(dati.errore ?? `Errore ${risposta.status}`), risposta.status);
  }
  const dispositivo = dati.dispositivo as { ruolo?: string } | undefined;
  return {
    token: String(dati.token),
    computer: String(dati.computer ?? host),
    ruolo: String(dispositivo?.ruolo ?? "ospite"),
  };
}
