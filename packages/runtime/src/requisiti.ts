/**
 * Cosa si toglie da un `requirements.txt` di terzi prima di installarlo.
 *
 * Il motore e i suoi nodi custom arrivano con la loro lista di dipendenze, ma
 * l'ambiente Python è **uno solo e condiviso**: quello che uno di loro installa
 * lo ritrovano tutti gli altri. Torch in particolare è già lì con la build CUDA
 * giusta, messa da `install.ts`, e lasciarlo in lista vorrebbe dire dare a uv la
 * possibilità di sostituirlo con una wheel qualsiasi — di solito quella per sola
 * CPU, che fa girare tutto cento volte più lento senza dire niente.
 */

/** Pacchetti che nessun codice di terzi può reinstallare o cambiare di versione. */
export const INTOCCABILI = ["torch", "torchvision", "torchaudio"];

/** Il nome del pacchetto, senza vincoli di versione né extra fra parentesi. */
export function nomePacchetto(riga: string): string {
  return riga.trim().split(/[=<>!~[;\s]/)[0]!.trim().toLowerCase();
}

/**
 * Le righe utili di un `requirements.txt`, meno i pacchetti indesiderati.
 *
 * Via anche commenti e righe vuote: quello che resta si può scrivere in un file
 * nostro con la nostra intestazione, e si legge per cosa è.
 */
export function filtraRequisiti(originale: string, daTogliere: string[]): string[] {
  const escluse = new Set(daTogliere.map((n) => n.toLowerCase()));
  return originale.split(/\r?\n/).filter((riga) => {
    const pulita = riga.trim();
    if (!pulita || pulita.startsWith("#")) return false;
    return !escluse.has(nomePacchetto(pulita));
  });
}
