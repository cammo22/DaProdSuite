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

/*
 * ⚠ 2.2.0: la Merceria gira intorno ai set. Chiesto il 26 settembre 2026:
 * «nella merceria voglio poter vedere bene i set: aprendo i pacchi mi escono i
 * pezzi che si auto-potenziano e posso scegliere di equipaggiare i vari set; il
 * resto che non serve per i set diventa rottame. Concentriamoci sui set, in
 * modo da poterli switchare e capire bene a che livello».
 *
 * - Il pacco preferisce i pezzi dei set che hai cominciato e non finito.
 * - Un doppione non e' mai sprecato: il pezzo che hai sale di livello da solo;
 *   arrivato al massimo, il doppione diventa rottami.
 * - Un set si indossa tutto insieme (e si cambia con un tocco).
 * - Un pezzo che non ti serve si rottama.
 */
const LIV_MAX_OGG = 10;
function pezziDelSet(k) { return OGGETTI.filter(o => o.set === k && oggettoDisponibile(o)); }
function livelloSet(k) { return pezziDelSet(k).reduce((t, o) => t + ((posseduto(o.id) || {}).lv || 0), 0); }
function valoreRottame(o, lv) { return Math.round(10 * RARITA[o.rar].lv * (lv || 1)); }

function apriPacco() {
  if (!paga("biglietti", 3)) { toast("🎁", "Servono 3 Biglietti", "Li trovi sulle élite, sui boss e nel Laboratorio"); return; }
  const pool = OGGETTI.filter(oggettoDisponibile);
  const nuovi = pool.filter(o => !posseduto(o.id));
  // I set cominciati e non finiti tirano di piu': sei volte su dieci si pesca li'.
  const cominciati = Object.keys(SET).filter(k => pezziDelSet(k).some(o => posseduto(o.id)) && pezziDelSet(k).some(o => !posseduto(o.id)));
  const mirati = nuovi.filter(o => cominciati.includes(o.set));
  const o = mirati.length && Math.random() < 0.6 ? scegli(mirati) : nuovi.length ? scegli(nuovi) : scegli(pool);
  const p = posseduto(o.id);
  let detto;
  if (p && p.lv < LIV_MAX_OGG) { p.lv++; detto = `Doppione: si è potenziato da solo, ora liv. ${p.lv}`; }
  else if (p) { const r = valoreRottame(o, p.lv); S.rottami += r; detto = `Già al massimo: diventa ${r} ⚙️ di rottame`; }
  else { S.inv.push({ id: o.id, lv: 1, eq: false }); detto = "Nuovo pezzo"; }
  const set = SET[o.set], tot = pezziDelSet(o.set).length, hai = pezziDelSet(o.set).filter(x => posseduto(x.id)).length;
  Suono.suona("trofeo");
  sporca();
  apriModale("🎁 Dal pacco", `<div class="pacco-esce" style="--c:${RARITA[o.rar].col}">
    <div class="pe-ico">${o.i}</div><div class="pe-rar">${RARITA[o.rar].n}</div><h3>${esc(o.n)}</h3><p>${esc(detto)}</p>
    <div class="pe-set" style="--s:${set.col}">${set.i} ${esc(set.n)} · <b>${hai}/${tot} pezzi</b> · liv. set ${livelloSet(o.set)}</div>
    <div class="bottoni"><button class="btn menta" data-azione="indossaSet" data-k="${o.set}">Indossa il ${esc(set.n)}</button>
    <button class="btn" data-azione="chiudiModale">Ok</button></div></div>`);
  richiediRender();
}

/** Indossa tutti i pezzi che hai di un set, al posto di quelli che c'erano. */
function indossaSet(k) {
  const miei = pezziDelSet(k).filter(o => posseduto(o.id));
  if (!miei.length) { toast(SET[k].i, "Non hai pezzi di questo set", "Aprili dai pacchi o comprali in vetrina"); return; }
  for (const o of miei) if (!posseduto(o.id).eq) equipaggia(o.id, true);
  Suono.suona("compra");
  toast(SET[k].i, SET[k].n + " indossato", `${miei.length}/${pezziDelSet(k).length} pezzi · ${miei.length >= 2 ? "sinergia accesa" : "ne serve un altro per la sinergia"}`, { tipo: "menta" });
  chiudiModale();
  richiediRender();
}

/** Un pezzo che non serve diventa rottami (mai quelli indossati). */
function rottamaOggetto(id) {
  const p = posseduto(id), o = oggetto(id); if (!p || !o || p.eq) return;
  const r = valoreRottame(o, p.lv);
  S.inv = S.inv.filter(x => x.id !== id);
  S.rottami += r;
  Suono.suona("compra");
  toast("⚙️", o.n + " rottamato", `+${r} ⚙️`, { dur: 1800 });
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
