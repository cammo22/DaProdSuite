/**
 * NEON PARTENOPE — la Merceria di Pacco: vetrina, pacchi misteriosi, set e livelli oggetto
 */
"use strict";

const SLOT_ROB = { wings: "ali", hat: "cappello", acc: "acc", eyes: "occhi", antenna: "antenna", fx: "fx" };
const NOME_SLOT = { wings: "Ali", hat: "Cappello", acc: "Accessorio", eyes: "Occhi", antenna: "Antenna", fx: "Effetto" };

function oggettoDisponibile(o) { return !o.solo || S.ciclo >= 2; }
function posseduto(id) { return S.inv.find(x => x.id === id); }

function riempiVetrina(forza) {
  const pool = OGGETTI.filter(oggettoDisponibile);
  if (!forza && S.vetrina.length && S.vetrina.every(id => oggetto(id))) return;
  // preferisce oggetti non ancora posseduti, ordinati per prezzo
  const nuovi = mescola(pool.filter(o => !posseduto(o.id)));
  const vecchi = mescola(pool.filter(o => posseduto(o.id)));
  S.vetrina = nuovi.concat(vecchi).slice(0, 6).sort((a, b) => a.costo - b.costo).map(o => o.id);
}
function costoRinnovo() { return Math.max(1000, Math.round(lireStanza(S.maxStanza) * 60)); }
function rinnovaVetrina() {
  if (!paga("lire", costoRinnovo())) { toast("🛍️", "Lire insufficienti", "Rinnovare la vetrina costa " + fmtLire(costoRinnovo())); return; }
  riempiVetrina(true);
  Suono.suona("ruota");
  richiediRender();
}

function compraOggetto(id) {
  const o = oggetto(id); if (!o || posseduto(id) || !oggettoDisponibile(o)) return;
  if (!paga("lire", costoOggetto(o))) return;
  S.inv.push({ id, lv: 1, eq: false });
  equipaggia(id, true);
  toast(o.i, "Nuovo oggetto: " + o.n, `${RARITA[o.rar].n} · ${SET[o.set].n}`, { tipo: "oro" });
  dopoAcquisto();
}

// Pacco misterioso: 3 🎟️ per un oggetto a caso (preferibilmente nuovo)
function apriPacco() {
  if (!paga("biglietti", 3)) { toast("🎁", "Servono 3 Biglietti", "Li trovi sulle élite, sui boss e nel Laboratorio"); return; }
  const pool = OGGETTI.filter(oggettoDisponibile);
  const nuovi = pool.filter(o => !posseduto(o.id));
  const o = nuovi.length ? scegli(nuovi) : scegli(pool);
  const p = posseduto(o.id);
  if (p) { p.lv += 2; toast(o.i, o.n + " potenziato!", `Doppione: +2 livelli (ora ${p.lv})`, { tipo: "oro" }); }
  else { S.inv.push({ id: o.id, lv: 1, eq: false }); equipaggia(o.id, true); toast(o.i, "Dal pacco: " + o.n, RARITA[o.rar].n, { tipo: "oro" }); }
  Suono.suona("trofeo");
  sporca();
  richiediRender();
}

function potenziaOggetto(id) {
  const p = posseduto(id), o = oggetto(id); if (!p || !o) return;
  const c = costoLivOggetto(o, p.lv);
  if (!paga("rottami", c)) { toast("⚙️", "Rottami insufficienti", `Servono ${c} ⚙️`); return; }
  p.lv++;
  dopoAcquisto();
}

function equipaggia(id, silenzioso) {
  const p = posseduto(id), o = oggetto(id); if (!p || !o) return;
  if (p.eq) {
    p.eq = false;
    if (S.rob[SLOT_ROB[o.slot]] === id) S.rob[SLOT_ROB[o.slot]] = "none";
  } else {
    for (const it of S.inv) { const x = oggetto(it.id); if (x && x.slot === o.slot) it.eq = false; }
    p.eq = true;
    S.rob[SLOT_ROB[o.slot]] = id;
  }
  sporca();
  const set = setAttivi();
  for (const k in set) if (set[k] >= 2) S.stats.setAttivo = Math.max(1, S.stats.setAttivo);
  if (!silenzioso) Suono.suona("clic");
  aggiornaRobot();
  richiediRender();
}

// ============================================================ FERRO VECCHIO: pezzi comprati coi rottami
function listaPezzi(campo) {
  return { telaio: TELAI, occhi: OCCHI, antenna: ANTENNE, cappello: CAPPELLI, acc: ACCESSORI, arma: ARMI }[campo];
}
function pezzoSbloccato(campo, id) {
  const p = listaPezzi(campo).find(x => x.id === id);
  return !p || !p.costo || S.look.includes(campo + ":" + id) || S.look.includes(id);
}
function scegliPezzo(campo, id) {
  const lista = listaPezzi(campo); if (!lista) return;
  const p = lista.find(x => x.id === id); if (!p) return;
  if (!pezzoSbloccato(campo, id)) {
    if (!paga("rottami", p.costo)) { toast("⚙️", "Rottami insufficienti", `${p.n} costa ${p.costo} ⚙️`); return; }
    S.look.push(campo + ":" + id);
    toast("🎨", "Sbloccato: " + p.n, "", { dur: 1500 });
  }
  if (S.rob[campo] !== id) S.stats.look++;
  S.rob[campo] = id;
  // un pezzo della Merceria nello stesso punto viene tolto
  for (const it of S.inv) { const o = oggetto(it.id); if (o && SLOT_ROB[o.slot] === campo) it.eq = false; }
  sporca();
  Suono.suona("compra");
  aggiornaRobot();
  richiediRender();
}
function scegliTinta(campo, hex) {
  S.rob[campo] = hex;
  S.stats.look++;
  Suono.suona("clic");
  aggiornaRobot();
  richiediRender();
}
