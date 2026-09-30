/**
 * Le rotte della Zecca (1.7.9). Vedi `zecca.ts` per cosa sono i pezzi.
 *
 * Stanno a parte per non gonfiare `rotte.ts`, e rispondono solo ai percorsi che
 * cominciano con `/zecca`: `rispondi` le chiama per prime e, se il percorso non
 * e' suo, tornano `null`.
 *
 * ⚠ **Chi non comanda non tocca le cose di chi comanda**: conia, pacchetti,
 * collezioni e proposte da decidere rispondono 403 — e nella pagina il loro
 * tasto non c'e' nemmeno (Cammo, 30 settembre 2026: gli utenti non devono vedere
 * quello che non e' loro).
 *
 * ⚠ **Il file intero lo vede solo chi ha il pezzo**; l'anteprima la vede
 * chiunque lo guardi in un pacchetto o nel mercato. Stessa regola delle
 * figurine (`sguardiDelGioco`).
 */

import { NienteDaFare } from "./banco";
import type { Chi, Contorno, Risposta, VoceLibreria } from "./rotte";
import type { Deposito } from "./deposito";
import {
  RARITA,
  apriPacchettoZecca,
  approvaProposta,
  contiZecca,
  controllaCollezioni,
  coniaPezzo,
  creaCollezione,
  creaPacchettoZecca,
  numeroZecca,
  pezziDi,
  proponi,
  raritaDi,
  regalaPezzo,
  rifiutaProposta,
  type FileZecca,
  type PezzoZecca,
} from "./zecca";

const OK = (dati: unknown): Risposta => ({ codice: 200, dati });
const NO = (codice: number, perche: string): Risposta => ({ codice, dati: { errore: perche } });

/** Il nome vero di una cosa della libreria (vedi `idInLibreria` in `rotte.ts`). */
function idInLibreria(id: string): string {
  const PREFISSO = "/libreria/file/";
  if (!id.startsWith(PREFISSO)) return id;
  try {
    return decodeURIComponent(id.slice(PREFISSO.length));
  } catch {
    return id;
  }
}

/** Un pezzo come lo vede la pagina: i nomi al posto degli id, e il file solo a chi puo'. */
function vestiPezzo(p: PezzoZecca, contorno: Contorno, chi: string, admin: boolean) {
  const intero = (f: FileZecca | undefined): string =>
    !f ? "" : f.url ?? (contorno.indirizzoLibreria ? (contorno.indirizzoLibreria(f.id) ?? "") : "");
  const piccolo = (f: FileZecca | undefined): string => {
    if (!f || !contorno.anteprimaLibreria) return "";
    if (f.url && !f.url.startsWith("/libreria/file/")) return "";
    return contorno.anteprimaLibreria(idInLibreria(f.id)) ?? "";
  };
  const mio = p.proprietario === chi || admin;
  const r = raritaDi(p.rarita);
  return {
    id: p.id,
    numero: p.numero,
    numeroScritto: numeroZecca(p.numero),
    tipo: p.tipo,
    titolo: p.titolo,
    rarita: { id: r.id, nome: r.nome, colore: r.colore, valore: r.valore },
    creatore: p.creatore,
    nomeCreatore: contorno.nomeDi(p.creatore),
    quando: p.quando,
    proprietario: p.proprietario,
    nomeProprietario: p.proprietario ? contorno.nomeDi(p.proprietario) : "",
    mio: p.proprietario === chi,
    collezione: p.collezione ?? null,
    mime: p.file.mime,
    anteprima: piccolo(p.copertina) || piccolo(p.file),
    url: mio ? intero(p.file) : "",
    copertina: mio ? intero(p.copertina) : "",
    // La storia si legge per intero: e' il punto dei pezzi numerati.
    storia: p.storia.map((x) => ({ ...x, nome: contorno.nomeDi(x.chi) })),
  };
}

/** Le cose della libreria che una persona puo' proporre: le sue, meno quelle gia' in Zecca. */
function mieCose(deposito: Deposito, contorno: Contorno, chi: string): VoceLibreria[] {
  if (!contorno.elencoLibreria) return [];
  const gia = new Set(deposito.statoZecca().pezzi.map((p) => p.file.id));
  const inAttesa = new Set(deposito.statoZecca().proposte.filter((q) => q.stato === "in-attesa").map((q) => q.file.id));
  return contorno.elencoLibreria(chi, 80).filter((v) => !gia.has(v.id) && !inAttesa.has(v.id));
}

function fileDi(v: unknown): FileZecca | null {
  const x = (v ?? {}) as Partial<FileZecca>;
  if (typeof x.id !== "string" || !x.id) return null;
  return { id: x.id, mime: String(x.mime ?? ""), ...(x.url ? { url: String(x.url) } : {}) };
}

/**
 * Risponde a una richiesta della Zecca. Torna `null` se il percorso non e' suo.
 */
export function rispondiZecca(
  deposito: Deposito,
  chi: Chi,
  contorno: Contorno,
  metodo: string,
  percorso: string,
  corpo: Record<string, unknown>,
  caso: () => number = Math.random,
): Risposta | null {
  if (percorso !== "/zecca" && !percorso.startsWith("/zecca/")) return null;
  try {
    const s = deposito.statoZecca();
    const admin = Boolean(chi.admin);
    const soloAdmin = ["/zecca/admin", "/zecca/conia", "/zecca/approva", "/zecca/rifiuta", "/zecca/pacchetto", "/zecca/collezione"];
    if (soloAdmin.includes(percorso) && !admin) return NO(403, "La Zecca la tiene chi comanda.");

    /* ---------------------------------------------------- chi gioca */

    if (metodo === "GET" && percorso === "/zecca") {
      const miei = pezziDi(deposito, chi.id).map((p) => vestiPezzo(p, contorno, chi.id, admin));
      return OK({
        monete: deposito.monete(chi.id),
        quota: deposito.quotaMoneta(),
        rarita: RARITA,
        conti: contiZecca(deposito),
        miei,
        pacchetti: s.pacchetti.map((k) => ({
          id: k.id,
          nome: k.nome,
          prezzo: k.prezzo,
          perApertura: k.perApertura,
          restano: k.pezzi.length,
          totali: k.totali,
          aperture: k.aperture,
          finito: k.pezzi.length === 0,
          // Cosa c'e' ancora dentro, per rarita': si sa la scarsita', non i pezzi.
          dentro: Object.fromEntries(
            RARITA.map((r) => [r.id, k.pezzi.filter((id) => s.pezzi.find((p) => p.id === id)?.rarita === r.id).length]),
          ),
        })),
        collezioni: s.collezioni.map((c) => ({
          id: c.id,
          nome: c.nome,
          premio: c.premio,
          totali: c.pezzi.length,
          hai: c.pezzi.filter((id) => s.pezzi.find((p) => p.id === id)?.proprietario === chi.id).length,
          completata: Boolean(c.completata[chi.id]),
          quandoCompletata: c.completata[chi.id] ?? null,
          chiHaCompletato: Object.keys(c.completata).length,
          // I pezzi della collezione, per rarita', senza dire chi li ha.
          pezzi: c.pezzi.map((id) => {
            const p = s.pezzi.find((x) => x.id === id);
            return p ? { id: p.id, numeroScritto: numeroZecca(p.numero), titolo: p.titolo, rarita: raritaDi(p.rarita).id, mio: p.proprietario === chi.id, anteprima: vestiPezzo(p, contorno, chi.id, false).anteprima } : null;
          }).filter(Boolean),
        })),
        proposte: s.proposte.filter((q) => q.chi === chi.id).slice(0, 30),
        propongo: mieCose(deposito, contorno, chi.id),
        gente: contorno.gente ? contorno.gente().filter((g) => g.id !== chi.id) : [],
      });
    }

    if (metodo === "POST" && percorso === "/zecca/proponi") {
      const f = fileDi(corpo["file"]);
      if (!f) return NO(400, "Quale cosa?");
      // Solo una cosa tua: fra quelle che la libreria dice tue.
      if (contorno.elencoLibreria && !contorno.elencoLibreria(chi.id, 300).some((v) => v.id === f.id)) {
        return NO(403, "Puoi proporre solo cose tue.");
      }
      const q = proponi(deposito, chi.id, f, corpo["titolo"], fileDi(corpo["copertina"]) ?? undefined);
      return OK({ proposta: q });
    }

    if (metodo === "POST" && percorso === "/zecca/apri") {
      const esito = apriPacchettoZecca(deposito, chi.id, String(corpo["pacchetto"] ?? ""), caso);
      return OK({
        ...esito,
        pezzi: esito.pezzi.map((p) => vestiPezzo(p, contorno, chi.id, false)),
      });
    }

    if (metodo === "POST" && percorso === "/zecca/regala") {
      const esito = regalaPezzo(deposito, chi.id, String(corpo["a"] ?? ""), String(corpo["pezzo"] ?? ""));
      return OK({ pezzo: vestiPezzo(esito.pezzo, contorno, chi.id, false), collezioni: esito.collezioni });
    }

    /* -------------------------------------------------- chi comanda */

    if (metodo === "GET" && percorso === "/zecca/admin") {
      return OK({
        proposte: s.proposte
          .filter((q) => q.stato === "in-attesa")
          .map((q) => ({ ...q, nome: contorno.nomeDi(q.chi), anteprima: contorno.anteprimaLibreria ? (contorno.anteprimaLibreria(idInLibreria(q.file.id)) ?? "") : "" })),
        // I pezzi di nessuno e fuori da ogni pacchetto: si possono mettere in un pacchetto.
        liberi: s.pezzi
          .filter((p) => !p.proprietario && !p.pacchetto)
          .map((p) => vestiPezzo(p, contorno, chi.id, true)),
        senzaCollezione: s.pezzi.filter((p) => !p.collezione).map((p) => ({ id: p.id, numeroScritto: numeroZecca(p.numero), titolo: p.titolo, rarita: p.rarita })),
        pacchetti: s.pacchetti,
        collezioni: s.collezioni.map((c) => ({ ...c, completate: Object.keys(c.completata).length })),
        libreria: contorno.elencoLibreria
          ? contorno.elencoLibreria(chi.id, 60).filter((v) => !s.pezzi.some((p) => p.file.id === v.id))
          : [],
        rarita: RARITA,
        conti: contiZecca(deposito),
      });
    }

    if (metodo === "POST" && percorso === "/zecca/conia") {
      const f = fileDi(corpo["file"]);
      if (!f) return NO(400, "Quale cosa?");
      const p = coniaPezzo(
        deposito,
        chi.id,
        { file: f, titolo: corpo["titolo"], copertina: fileDi(corpo["copertina"]) ?? undefined, rarita: corpo["rarita"] ? String(corpo["rarita"]) : undefined, creatore: corpo["creatore"] ? String(corpo["creatore"]) : undefined },
        caso,
      );
      return OK({ pezzo: vestiPezzo(p, contorno, chi.id, true) });
    }

    if (metodo === "POST" && percorso === "/zecca/approva") {
      const p = approvaProposta(deposito, chi.id, String(corpo["id"] ?? ""), corpo["rarita"] ? String(corpo["rarita"]) : undefined, caso);
      return OK({ pezzo: vestiPezzo(p, contorno, chi.id, true) });
    }

    if (metodo === "POST" && percorso === "/zecca/rifiuta") {
      return OK({ proposta: rifiutaProposta(deposito, String(corpo["id"] ?? ""), corpo["motivo"]) });
    }

    if (metodo === "POST" && percorso === "/zecca/pacchetto") {
      return OK({ pacchetto: creaPacchettoZecca(deposito, chi.id, { nome: corpo["nome"], prezzo: corpo["prezzo"], perApertura: corpo["perApertura"], pezzi: corpo["pezzi"] }) });
    }

    if (metodo === "POST" && percorso === "/zecca/collezione") {
      const c = creaCollezione(deposito, { nome: corpo["nome"], premio: corpo["premio"], pezzi: corpo["pezzi"] });
      // Chi ha gia' tutti i pezzi la completa subito.
      const gia: string[] = [];
      for (const conto of deposito.conti()) if (controllaCollezioni(deposito, conto.chi).some((x) => x.id === c.id)) gia.push(conto.chi);
      return OK({ collezione: c, completataDa: gia });
    }

    return NO(404, "Questa rotta della Zecca non c'e'.");
  } catch (errore) {
    if (errore instanceof NienteDaFare) return NO(409, errore.message);
    throw errore;
  }
}
