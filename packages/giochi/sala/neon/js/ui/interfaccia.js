/**
 * NEON PARTENOPE — interfaccia: schede, pannelli, notifiche, Radio Partenope, finestre e opzioni.
 * I pannelli si ridisegnano con un piccolo "morph" del DOM: si aggiornano solo i nodi cambiati,
 * così i pulsanti restano gli stessi e nessun tocco va perso mentre i numeri corrono.
 */
"use strict";

const SCHEDE = [
  { id: "quartiere", i: "🏘️", n: "Quartiere" },
  { id: "officina",  i: "🔧", n: "Officina" },
  { id: "merceria",  i: "🛍️", n: "Merceria" },
  { id: "giochi",    i: "🎮", n: "Giochi" },
  { id: "borsa",     i: "📈", n: "Borsa" },
  { id: "robot",     i: "🤖", n: "Robot" },
  { id: "diario",    i: "📜", n: "Diario" },
  { id: "trofei",    i: "🏆", n: "Trofei" }
];
let schedaAttiva = "quartiere", catOfficina = "colpi";

// ============================================================ MORPH DEL DOM
function morph(el, html) {
  const nuovo = document.createElement(el.nodeName);
  nuovo.innerHTML = html;
  morphFigli(el, nuovo);
}
function morphFigli(a, b) {
  const va = Array.from(a.childNodes), vb = Array.from(b.childNodes);
  for (let i = 0; i < vb.length; i++) {
    const x = va[i], y = vb[i];
    if (!x) { a.appendChild(y); continue; }
    morphNodo(x, y);
  }
  for (let i = vb.length; i < va.length; i++) va[i].remove();
}
function morphNodo(x, y) {
  if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.dataset && y.dataset && x.dataset.k !== y.dataset.k)) { x.replaceWith(y); return; }
  if (x.nodeType === 3 || x.nodeType === 8) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
  if (x.nodeType !== 1) return;
  for (const at of Array.from(x.attributes)) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
  for (const at of Array.from(y.attributes)) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
  if (x.nodeName === "CANVAS" || x.hasAttribute("data-fisso")) return;
  morphFigli(x, y);
}

// ============================================================ RENDER
let _renderPronto = true;
function richiediRender() {
  if (!_renderPronto) return;
  _renderPronto = false;
  setTimeout(() => { _renderPronto = true; renderScheda(); aggiornaTesta(); }, 60);
}
function apriScheda(id) {
  if (!SCHEDE.find(s => s.id === id)) return;
  schedaAttiva = id;
  document.querySelectorAll("[data-scheda]").forEach(b => b.classList.toggle("on", b.dataset.scheda === id));
  $("pannello").innerHTML = "";
  $("pannello").scrollTop = 0;
  $("altroMenu").classList.remove("on");
  renderScheda();
}
function renderScheda() {
  const f = {
    daprod: () => (window.NP_DP ? NP_DP.htmlScheda() : ""),
    quartiere: htmlQuartiere, officina: htmlOfficina, merceria: htmlMerceria, giochi: htmlGiochi,
    borsa: Borsa.htmlPannello, robot: htmlRobot, diario: htmlDiario, trofei: htmlTrofei
  }[schedaAttiva];
  if (!f) return;
  morph($("pannello"), f());
  if (schedaAttiva === "borsa") Borsa.aggiornaPannello();
  if (schedaAttiva === "robot") { const p = $("robotGrande"); if (p && p.dataset.v !== JSON.stringify(S.rob)) { p.dataset.v = JSON.stringify(S.rob); p.innerHTML = disegnaRobot(S.rob); } }
}

// pezzi riutilizzabili
const puoi = (valuta, c) => (S[valuta] >= c ? "puoi" : "nonpuoi");
function btnCosto(azione, dati, costo, valuta, etichetta) {
  valuta = valuta || "lire";
  const sim = { lire: simLire(), rottami: "⚙️", biglietti: "🎟️", braci: "🔥" }[valuta];
  const d = Object.entries(dati || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
  return `<button class="btn costo ${puoi(valuta, costo)}" data-azione="${azione}"${d}>${etichetta ? `<small>${etichetta}</small>` : ""}<b>${sim} ${valuta === "lire" ? numLire(costo) : fmt(costo)}</b></button>`;
}
function titolo(i, t, sotto) { return `<div class="p-testa"><h2><span>${i}</span>${t}</h2>${sotto ? `<p>${sotto}</p>` : ""}</div>`; }
function selettoreQuantita() {
  return `<div class="quantita"><span>QUANTITÀ</span>${[1, 10, 100, "max"].map(q => `<button class="chip ${QUANTITA === q ? "on" : ""}" data-azione="quantita" data-v="${q}">${q === "max" ? "MAX" : "×" + q}</button>`).join("")}</div>`;
}

// ------------------------------------------------ QUARTIERE
function htmlQuartiere() {
  const prod = produzione();
  let visibili = 0;
  const carte = QUARTIERE.map((g, i) => {
    const n = S.gen[g.id] || 0;
    const prima = i === 0 || (S.gen[QUARTIERE[i - 1].id] || 0) > 0 || S.totLire >= g.base * 0.5;
    if (!prima) { if (visibili++ > 0) return ""; return `<div class="gen ignoto" data-k="g${g.id}"><div class="g-ico">❔</div><div class="g-info"><b>???</b><small>Un altro personaggio aspetta al buio. Guadagna più lire per scoprirlo.</small></div></div>`; }
    const q = quantiGen(g), c = costoGen(g, q), p1 = prodGen(g);
    const quota = prod > 0 ? n * p1 / prod : 0;
    const prossimo = TRAGUARDI_QUARTIERE.find(t => t > n);
    return `<div class="gen ${n ? "" : "nuovo"}" data-k="g${g.id}">
      <div class="g-ico">${g.i}<em>${n}</em></div>
      <div class="g-info">
        <b>${esc(g.n)}</b>
        <small>${esc(g.d)}</small>
        <div class="g-dati"><span>+${fmt(p1)}/s ciascuno</span>${n ? `<span>totale ${fmt(n * p1)}/s · ${perc(quota)}</span>` : ""}${prossimo ? `<span class="tr">×2 a ${prossimo}</span>` : ""}</div>
      </div>
      ${btnCosto("gen", { id: g.id }, c, "lire", QUANTITA === "max" ? "MAX ×" + q : "×" + q)}
    </div>`;
  }).join("");
  return titolo("🏘️", "Il Quartiere", `Ogni personaggio riacceso produce lire da solo e accende una finestra della città. Produzione: <b class="oro">${fmtLire(prod)}/s</b>`) +
    selettoreQuantita() + `<div class="lista">${carte}</div>`;
}

// ------------------------------------------------ OFFICINA
const CAT_OFF = [
  { id: "colpi", i: "💪", n: "Braccio e colpi" }, { id: "automi", i: "🤖", n: "Automi" }, { id: "stat", i: "⚡", n: "Statistiche" },
  { id: "prod", i: "🏭", n: "Produzione" }, { id: "difesa", i: "🛡️", n: "Critico e difesa" }, { id: "inf", i: "♾️", n: "Infiniti" }
];
function rigaUp(u) {
  const fatto = haUp(u.id), disp = upDisponibile(u);
  let blocco = "";
  if (!fatto && !disp) blocco = u.gen ? `servono ${u.req} ${esc(QUARTIERE.find(g => g.id === u.gen).n)}` : (u.req ? `dalla stanza ${u.req}` : "completa la fase 1");
  return `<div class="riga ${fatto ? "fatto" : ""} ${blocco ? "bloccato" : ""}" data-k="u${u.id}">
    <div class="r-ico">${u.i || "🔧"}</div>
    <div class="r-info"><b>${esc(u.n)}</b><small>${esc(u.d)}</small></div>
    ${fatto ? `<span class="r-fatto">✓</span>` : (blocco ? `<span class="r-blocco">🔒 ${blocco}</span>` : btnCosto("up", { id: u.id }, u.costo))}
  </div>`;
}
function rigaInf(k, suggerimento) {
  const c = INFINITI[k], ok = infSbloccato(k), lv = livInf(k);
  const eff = k === "crit" ? `+${perc(lv * c.per)} critico` : `${fmtMolt(Math.pow(c.per, lv))} attuale`;
  return `<div class="riga inf ${ok ? "" : "bloccato"}" data-k="i${k}">
    <div class="r-ico">♾️</div>
    <div class="r-info"><b>${c.n} <em>liv. ${lv}</em></b><small>${ok ? eff + " · ogni livello è permanente fino all'Eruzione" : "🔒 " + suggerimento}</small></div>
    ${ok ? btnCosto("inf", { k }, costoInf(k)) : ""}
  </div>`;
}
function htmlOfficina() {
  const cat = `<div class="sottoschede">${CAT_OFF.map(c => `<button class="chip ${catOfficina === c.id ? "on" : ""}" data-azione="catOff" data-v="${c.id}">${c.i} ${c.n}</button>`).join("")}</div>`;
  let corpo = "";
  if (catOfficina === "colpi") {
    const q = quantiBraccio(), c = costoBraccioN(S.braccio, q);
    const prossimo = (Math.floor(S.braccio / BRACCIO.raddoppioOgni) + 1) * BRACCIO.raddoppioOgni;
    corpo = `<div class="braccio carta2" data-k="braccio">
      <div class="b-ico">💪</div>
      <div class="b-info"><b>Braccio Meccanico <em>liv. ${S.braccio}</em></b>
        <small>Danno base ${fmt(danBraccio(S.braccio))} → ${fmt(danBraccio(S.braccio + q))} · ×2 al livello ${prossimo}</small>
        <div class="barretta"><i style="width:${(S.braccio % BRACCIO.raddoppioOgni) / BRACCIO.raddoppioOgni * 100}%"></i></div></div>
      ${btnCosto("braccio", {}, c, "lire", QUANTITA === "max" ? "MAX +" + q : "+" + q)}
    </div>` + selettoreQuantita() +
      `<h3>Fase 1 · Colpi</h3>` + COLPI_F1.map(rigaUp).join("") +
      (catenaCompleta(COLPI_F1) ? `<h3 class="sblocco">🔓 Fase 2 · Sintonia di Silicio</h3>` + COLPI_F2.map(rigaUp).join("") : `<div class="nota">🔒 Completa la Fase 1 per sbloccare la Sintonia di Silicio.</div>`);
  } else if (catOfficina === "automi") {
    const tot = totAutomi();
    corpo = `<div class="nota oro">🏅 ${tot} livelli automa · ogni 25 livelli: +4% danno e produzione per sempre (ora ${fmtMolt(moltAutomiTraguardo())}) · prossimo a ${(Math.floor(tot / 25) + 1) * 25}<br>☄️ Protocollo Vesuvio: ${protoSbloccato() ? "<b>sbloccato</b>, lo trovi sotto l'arena" : `si sblocca a ${PROTOCOLLO.sblocco} livelli`}</div>` +
      AUTOMI.map(a => {
        const n = S.automi[a.id] || 0;
        return `<div class="riga" data-k="a${a.id}"><div class="r-ico">${a.i}</div><div class="r-info"><b>${a.n} <em>liv. ${n}</em></b><small>${a.d} · ora ${fmt(n * a.val)}/s</small></div>${btnCosto("automa", { id: a.id }, costoAutoma(a))}</div>`;
      }).join("");
  } else if (catOfficina === "stat") {
    const eff = { multi: `ora ${perc(probMulti())}`, sovra: `sovraccarico ${fmtMolt(2.5 * (1 + 0.25 * S.stat.sovra))}`, fend: `ora ${perc(quotaFendente())} a tutta l'orda` };
    corpo = STAT.map(st => `<div class="riga" data-k="s${st.k}"><div class="r-ico">${st.i}</div><div class="r-info"><b>${st.n} <em>rango ${S.stat[st.k]}</em></b><small>${st.d} · ${eff[st.k]}</small></div>${btnCosto("stat", { k: st.k }, costoStat(st))}</div>`).join("");
  } else if (catOfficina === "prod") {
    corpo = `<h3>Catena di produzione</h3>` + PRODUZIONE.map(rigaUp).join("") +
      `<h3>Potenziamenti dei personaggi</h3>` +
      (UP_GEN.filter(u => !haUp(u.id) && (S.gen[u.gen] || 0) >= Math.min(u.req, 5)).slice(0, 12).map(rigaUp).join("") || `<div class="nota">Riaccendi almeno 10 copie di un personaggio per potenziarlo.</div>`);
  } else if (catOfficina === "difesa") {
    corpo = `<h3>Critico · ora ${perc(Math.min(0.95, probCrit()))}, danno ×${BIL.critMolt}</h3>` + CRITICO.map(rigaUp).join("") +
      `<h3>Corazza · energia ${fmt(energiaMax())}</h3>` + CORAZZA.map(rigaUp).join("") +
      `<h3>Rigenerazione · ${fmt(rigenerazione())}/s</h3>` + RIGENERA.map(rigaUp).join("") +
      `<h3>Assenza · ${perc(BIL.offlineBase * moltOffline())} della produzione, fino a ${oreOffline()} ore</h3>` + OFFLINE.map(rigaUp).join("");
  } else {
    corpo = `<div class="nota">I livelli infiniti si sbloccano completando le catene: crescono per sempre (fino alla prossima Eruzione).</div>` +
      rigaInf("click", "Completa la Fase 2 dei colpi") + rigaInf("prod", "Completa la catena di produzione") + rigaInf("crit", "Completa la catena del critico");
  }
  return titolo("🔧", "L'Officina DaProd", `Danno per colpo <b class="oro">${fmt(dannoBase())}</b> · automi <b>${fmt(colpiAutomi())}/s</b>`) + cat + `<div class="lista">${corpo}</div>`;
}

// ------------------------------------------------ MERCERIA
function htmlMerceria() {
  riempiVetrina(false);
  const set = setAttivi();
  // 2.2.0: i set per primi. Ogni set: i suoi pezzi (quelli che mancano col lucchetto),
  // il livello, la sinergia, e un tocco per indossarlo tutto.
  const carteSet = Object.entries(SET).filter(([k]) => k !== "partenope" || S.ciclo >= 2).map(([k, x]) => {
    const pezzi = pezziDelSet(k), hai = pezzi.filter(o => posseduto(o.id)).length, addosso = set[k] || 0;
    const chip = pezzi.map(o => {
      const p = posseduto(o.id);
      return p ? `<span class="sp ${p.eq ? "eq" : ""}" style="--r:${RARITA[o.rar].col}" title="${esc(o.n)}">${o.i}<b>${p.lv}</b></span>`
        : `<span class="sp manca" title="${esc(o.n)} · ${RARITA[o.rar].n}">🔒</span>`;
    }).join("");
    const stato = addosso >= 3 ? "SET COMPLETO ADDOSSO" : addosso >= 2 ? "SINERGIA ACCESA" : addosso === 1 ? "1 pezzo addosso" : hai ? "nella borsa" : "da trovare";
    return `<div class="set-carta ${addosso >= 2 ? "on" : ""} ${addosso >= 3 ? "piena" : ""}" style="--c:${x.col}" data-k="sc${k}">
      <div class="sc-testa"><b>${x.i} ${esc(x.n)}</b><em>liv. ${livelloSet(k)}</em></div>
      <div class="sc-pezzi">${chip}</div>
      <small class="sc-stato">${hai}/${pezzi.length} pezzi · ${stato}</small>
      <small>2 pezzi: ${x.b2}<br>3 pezzi: ${x.b3}</small>
      ${hai ? (addosso >= hai ? `<span class="r-fatto">✓ indossato</span>` : `<button class="btn menta" data-azione="indossaSet" data-k="${k}">Indossa il set</button>`) : ""}
    </div>`;
  }).join("");
  const vetrina = S.vetrina.map(id => {
    const o = oggetto(id), p = posseduto(id), r = RARITA[o.rar];
    return `<div class="oggetto" style="--c:${r.col}" data-k="o${id}">
      <div class="o-ico">${o.i}</div><div class="o-rar">${r.n}</div><b>${esc(o.n)}</b>
      <small>${SET[o.set].i} ${SET[o.set].n} · ${NOME_SLOT[o.slot]}</small><p>${esc(o.d)}</p>
      ${p ? `<span class="r-fatto">${p.eq ? "✓ INDOSSATO" : "✓ nella borsa"} (liv. ${p.lv})</span>` : btnCosto("compraOgg", { id }, costoOggetto(o))}
    </div>`;
  }).join("");
  // 2.1.5: «non si capisce bene cosa si ha equipaggiato e cosa no». Gli
  // indossati stanno in cima, con l'etichetta; sopra la borsa, uno slot per riga.
  const ordinati = S.inv.slice().sort((a, b) => (b.eq ? 1 : 0) - (a.eq ? 1 : 0));
  const indossati = Object.keys(NOME_SLOT).map(sl => {
    const it = S.inv.find(x => x.eq && oggetto(x.id).slot === sl), o = it && oggetto(it.id);
    return `<div class="slot-eq ${o ? "pieno" : ""}" ${o ? `style="--c:${RARITA[o.rar].col}"` : ""}><small>${NOME_SLOT[sl]}</small>` +
      (o ? `<span>${o.i}</span><b>${esc(o.n)}</b>` : `<span>·</span><b>vuoto</b>`) + `</div>`;
  }).join("");
  const borsa = S.inv.length ? ordinati.map(it => {
    const o = oggetto(it.id), r = RARITA[o.rar], c = costoLivOggetto(o, it.lv);
    return `<div class="riga ${it.eq ? "eq" : ""}" data-k="inv${it.id}" style="--c:${r.col}">
      <div class="r-ico">${o.i}</div>
      <div class="r-info"><b>${it.eq ? `<span class="indossato">✓ INDOSSATO</span> ` : ""}${esc(o.n)} <em>liv. ${it.lv}</em></b><small>${SET[o.set].n} · ${NOME_SLOT[o.slot]} · +${(it.lv - 1) * 10}% danno se indossato</small></div>
      <button class="btn ${it.eq ? "" : "menta"}" data-azione="equip" data-id="${it.id}">${it.eq ? "Togli" : "Indossa"}</button>
      ${btnCosto("livOgg", { id: it.id }, c, "rottami", "liv. " + (it.lv + 1))}
      ${it.eq ? "" : `<button class="btn" data-azione="rottama" data-id="${it.id}" title="Non ti serve? Diventa rottame">♻️ ${valoreRottame(o, it.lv)} ⚙️</button>`}
    </div>`;
  }).join("") : `<div class="nota">La borsa è vuota: compra qualcosa in vetrina o apri un pacco misterioso.</div>`;
  const lab = S.lab.lv ? `Stampa un Biglietto ogni <b>${fmtTempo(1 / velocitaLab())}</b>` : "Non ancora costruito";
  return titolo("🛍️", "La Merceria di Pacco", "Tutto gira intorno ai set: due pezzi dello stesso set accendono una sinergia, tre la potenziano. I doppioni dei pacchi potenziano da soli il pezzo che hai.") +
    `<h3>I tuoi set</h3><div class="set-griglia">${carteSet}</div>
    <h3>Indossi adesso</h3><div class="slot-griglia">${indossati}</div>
    <div class="lab carta2" data-k="lab"><div class="b-ico">🏭</div><div class="b-info"><b>Laboratorio Biglietti <em>liv. ${S.lab.lv}</em></b><small>${lab}</small><div class="barretta"><i style="width:${(S.lab.prog * 100).toFixed(1)}%"></i></div></div>${btnCosto("lab", {}, costoLab(), "lire", S.lab.lv ? "potenzia" : "costruisci")}</div>
    <div class="merc-azioni">
      ${btnCosto("rinnova", {}, costoRinnovo(), "lire", "🎲 rinnova vetrina")}
      ${btnCosto("pacco", {}, 3, "biglietti", "🎁 pacco misterioso")}
      <button class="btn oro" data-azione="mini" data-id="ruota">🎡 Ruota del Mercante</button>
    </div>
    <h3>Vetrina</h3><div class="griglia-ogg">${vetrina}</div>
    <h3>La tua borsa · ${S.inv.length} / ${OGGETTI.length}</h3><div class="lista">${borsa}</div>`;
}

// ------------------------------------------------ GIOCHI E COMMISSIONI
function htmlGiochi() {
  controllaCommissioni();
  const comm = S.commissioni.map((c, i) => {
    const d = COMMISSIONI.find(x => x.k === c.k), p = progressoComm(c), fatto = p >= c.q;
    return `<div class="riga comm ${fatto ? "pronta" : ""}" data-k="c${i}${c.k}">
      <div class="r-ico">${d.i}</div>
      <div class="r-info"><b>${d.t(fmt(c.q))}</b><small>${fmt(p)} / ${fmt(c.q)} · premio ${c.premio[0]} ⚙️${c.premio[1] ? " + 1 🎟️" : ""}</small><div class="barretta"><i style="width:${p / c.q * 100}%"></i></div></div>
      ${fatto ? `<button class="btn oro" data-azione="riscuoti" data-i="${i}">Riscuoti</button>` : btnCosto("cambiaComm", { i }, 1, "biglietti", "cambia")}
    </div>`;
  }).join("");
  const giochi = MINIGIOCHI.map(m => {
    const r = ricaricaMini(m.id);
    let btn;
    if (m.id === "ruota") btn = `<button class="btn oro" data-azione="mini" data-id="ruota">Gioca</button>`;
    else if (r > 0) btn = `<button class="btn" disabled>⏳ ${fmtTempo(r)}</button>${btnCosto("miniSubito", { id: m.id }, 1, "biglietti", "subito")}`;
    else btn = `<button class="btn oro" data-azione="mini" data-id="${m.id}">▶ Gioca</button>`;
    return `<div class="gioco" data-k="m${m.id}"><div class="gi-ico">${m.i}</div><b>${m.n}</b><small>${m.d}</small><div class="gi-btn">${btn}</div></div>`;
  }).join("");
  return titolo("📋", "Commissioni del Quartiere", "Tre lavoretti alla volta: rottami e biglietti per chi si fa trovare.") + `<div class="lista">${comm}</div>` +
    titolo("🎮", "Sala Giochi del Golfo", `Premi che crescono con il quartiere · base attuale <b class="oro">${fmtLire(premioBaseMini())}</b>`) + `<div class="griglia-giochi">${giochi}</div>`;
}

// ------------------------------------------------ ROBOT
function htmlRobot() {
  // 2.1.5: accanto al titolo, quello che e' montato adesso.
  const montato = (campo) => { const p = listaPezzi(campo).find(x => x.id === S.rob[campo]); return p ? p.n : "niente"; };
  const gruppo = (campo, tit) => `<div class="pezzi"><h4>${tit} <em class="montato">montato: ${esc(montato(campo))}</em></h4><div class="opzioni">${listaPezzi(campo).map(p => {
    const sb = pezzoSbloccato(campo, p.id), sel = S.rob[campo] === p.id;
    return `<button class="chip ${sel ? "on" : ""} ${sb ? "" : "lucchetto"}" data-azione="pezzo" data-campo="${campo}" data-v="${p.id}">${sel ? "✓ " : sb ? "" : "🔒 "}${esc(p.n)}${sb || !p.costo ? "" : ` · ${p.costo} ⚙️`}</button>`;
  }).join("")}</div></div>`;
  const tinte = (campo, tit) => `<div class="pezzi"><h4>${tit}</h4><div class="tinte">${TINTE.map(h => `<button class="tinta ${S.rob[campo] === "#" + h ? "on" : ""}" style="background:#${h}" data-azione="tinta" data-campo="${campo}" data-v="#${h}" aria-label="#${h}"></button>`).join("")}</div></div>`;
  const tel = TELAI.find(x => x.id === S.rob.telaio) || TELAI[0];
  return titolo("🤖", "Ferro Vecchio", "\"A Napoli anche i robot hanno un codice.\" I pezzi si sbloccano coi rottami; ali ed effetti arrivano dalla Merceria.") +
    `<div class="robot-scheda"><div class="robot-grande" id="robotGrande" data-fisso></div>
      <div class="robot-dati"><b>${esc(tel.n)}</b><small>${esc(tel.d)}</small>
        <div class="stat-mini"><span>💥 ${fmt(dannoBase())}</span><span>❤️ ${fmt(energiaMax())}</span><span>🎯 ${perc(Math.min(0.95, probCrit()))}</span><span>⚡ ${perc(probMulti())}</span></div></div></div>` +
    gruppo("telaio", "Telaio") + gruppo("occhi", "Occhi") + gruppo("antenna", "Antenna") + gruppo("cappello", "Cappello") + gruppo("acc", "Accessorio") + gruppo("arma", "Arma") +
    tinte("col1", "Colore del telaio") + tinte("col2", "Colore dei dettagli") + tinte("colOcchi", "Luce degli occhi");
}

// ------------------------------------------------ DIARIO (discesa, eruzione, circuiti, radio)
function htmlDiario() {
  const mappa = BOSS.map((b, i) => {
    const s = (i + 1) * 10, vinto = S.maxStanza > s, qui = !vinto && S.maxStanza >= s - 9;
    return `<div class="tappa ${vinto ? "vinta" : ""} ${qui ? "qui" : ""}" style="--c:${b.col}" data-k="t${i}">
      <div class="t-arte">${vinto || qui ? arteBoss(b.id) : "<span>?</span>"}</div>
      <small>STANZA ${s}</small><b>${vinto || qui ? esc(b.n) : "???"}</b>
    </div>`;
  }).join("");
  const br = braciEruzione();
  const eruz = S.visto.liberata ? `<div class="eruzione carta2" data-k="eruz">
      <div class="e-titolo">🌋 ERUZIONE · ciclo ${S.ciclo} → ${S.ciclo + 1}</div>
      <p>Il vulcano rinasce e la città ricomincia dalla stanza 1. Perdi lire, quartiere, officina e automi; tieni Braci, Circuiti, oggetti, trofei, rottami e biglietti.
      Ogni Brace non spesa dà <b>+${perc(BIL.braciPerc)}</b> a danno, produzione e lire.</p>
      <div class="e-braci">+${br} 🔥 <small>(crescono con la stanza massima e con le lire del ciclo)</small></div>
      <button class="btn lava grande" data-azione="erutta" ${br > 0 ? "" : "disabled"}>🔥 FAI ERUTTARE IL VESUVIO</button>
    </div>` : `<div class="nota">🔒 Sconfiggi sinteticoMC alla stanza 100 per liberare Partenope e sbloccare l'Eruzione.</div>`;
  const circ = (S.braciTot > 0) ? `<h3>Circuiti di Partenope · 🔥 ${fmt(S.braci)} Braci (bonus ${fmtMolt(moltBraci())})</h3>` + CIRCUITI.map(c => {
    const lv = livCirc(c.id), max = lv >= c.max;
    return `<div class="riga" data-k="ci${c.id}"><div class="r-ico">${c.i}</div><div class="r-info"><b>${c.n} <em>${lv}/${c.max}</em></b><small>${c.d}</small></div>${max ? `<span class="r-fatto">MAX</span>` : btnCosto("circuito", { id: c.id }, c.costo(lv), "braci")}</div>`;
  }).join("") : "";
  const log = S.diario.slice().reverse().slice(0, 40).map(d => `<div class="log"><small>${esc(d.chi || "Radio Partenope")}</small><p>${esc(d.t)}</p></div>`).join("");
  return titolo("📜", "Il Diario della Discesa", `Stanza massima <b class="oro">${S.maxStanza}</b> · ciclo <b>${S.ciclo}</b>${S.record ? ` · record ${S.record}` : ""}`) +
    `<div class="mappa">${mappa}</div>` + eruz + circ +
    `<h3>📻 Radio Partenope <button class="chip" data-azione="introRadio">riascolta l'inizio</button></h3><div class="registro">${log || '<div class="nota">Nessuna trasmissione ancora.</div>'}</div>`;
}

// ------------------------------------------------ TROFEI E STATISTICHE
function htmlTrofei() {
  const st = [
    ["Lire guadagnate in totale", fmtLire(S.totLire)], ["Lire in questo ciclo", fmtLire(S.lireCiclo)], ["Valore in euro del tuo patrimonio", fmtEuro(S.lire)],
    ["Nemici eliminati", fmt(S.kills)], ["Élite eliminate", fmt(S.stats.elite)], ["Boss sconfitti", fmt(S.bossVinti)],
    ["Colpi dati", fmt(S.stats.click)], ["Multicolpi", fmt(S.stats.multi)], ["Sovraccarichi", fmt(S.stats.sovra)],
    ["Cadute", fmt(S.stats.cadute)], ["Gocce di lava", fmt(S.stats.gocce)], ["Minigiochi", fmt(S.stats.mini)],
    ["Commissioni", fmt(S.stats.comm)], ["Personaggi del quartiere", fmt(contaQuartiere(S))], ["Tempo di gioco", fmtTempo(S.stats.tempo)]
  ].map(([a, b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join("");
  const tr = TROFEI.map(t => {
    const ok = S.trofei.includes(t.id);
    return `<div class="trofeo ${ok ? "ok" : ""}" title="${esc(t.d)}" data-k="tr${t.id}"><div>${ok ? t.i : "🔒"}</div><b>${esc(t.n)}</b><small>${esc(t.d)}</small></div>`;
  }).join("");
  return titolo("🏆", "Trofei", `${S.trofei.length} / ${TROFEI.length} sbloccati · ogni trofeo regala rottami e biglietti`) +
    `<div class="griglia-trofei">${tr}</div>` + titolo("📊", "Statistiche") + `<div class="griglia-stat">${st}</div>`;
}

// ============================================================ AZIONI (delegazione)
function eseguiAzione(el) {
  const a = el.dataset.azione, d = el.dataset;
  Suono.avvia();
  switch (a) {
    case "gen": compraGen(d.id); break;
    case "quantita": QUANTITA = d.v === "max" ? "max" : Number(d.v); Suono.suona("clic"); break;
    case "braccio": compraBraccio(); break;
    case "catOff": catOfficina = d.v; Suono.suona("clic"); break;
    case "up": compraUp(d.id); break;
    case "automa": compraAutoma(d.id); break;
    case "stat": compraStat(d.k); break;
    case "inf": compraInf(d.k); break;
    case "lab": compraLab(); break;
    case "rinnova": rinnovaVetrina(); break;
    case "pacco": apriPacco(); break;
    case "compraOgg": compraOggetto(d.id); break;
    case "equip": equipaggia(d.id); break;
    case "livOgg": potenziaOggetto(d.id); break;
    case "indossaSet": indossaSet(d.k); break;
    case "rottama": rottamaOggetto(d.id); break;
    case "dp": if (window.NP_DP) NP_DP.compraDP(d.id); break;
    case "mini": avviaMini(d.id); break;
    case "miniSubito": avviaMini(d.id, true); break;
    case "riscuoti": riscuotiComm(Number(d.i)); break;
    case "cambiaComm": cambiaComm(Number(d.i)); break;
    case "pezzo": scegliPezzo(d.campo, d.v); break;
    case "tinta": scegliTinta(d.campo, d.v); break;
    case "erutta": chiediEruzione(); break;
    case "circuito": compraCircuito(d.id); break;
    case "borsaScala": Borsa.scala(d.v); Suono.suona("clic"); break;
    case "borsaSerie": Borsa.serie(d.v); Suono.suona("clic"); break;
    case "introRadio": STORIA.intro.forEach(x => radio(x, { noLog: true })); break;
    case "chiudiModale": chiudiModale(); break;
    case "scheda": apriScheda(d.v); break;
    case "opzioni": apriOpzioni(); break;
    case "novita": mostraNovita(true); break;
    default: return;
  }
  richiediRender();
}

function chiediEruzione() {
  const b = braciEruzione();
  apriModale("🌋 Eruzione", `
    <div class="conferma">
      <p>Il Vesuvio erutterà e Napoli ricomincerà dalla <b>stanza 1</b>, più forte di prima.</p>
      <ul><li>Guadagni <b>+${b} 🔥 Braci</b> (totale ${S.braci + b}: ${fmtMolt(1 + BIL.braciPerc * (S.braci + b))} a danno, produzione e lire)</li>
      <li>Tieni: Circuiti, oggetti della Merceria, trofei, rottami, biglietti e l'aspetto del robot</li>
      <li>Si azzerano: lire, quartiere, officina, automi e laboratorio</li></ul>
      <div class="bottoni"><button class="btn" data-azione="chiudiModale">Non ancora</button><button class="btn lava grande" id="confermaEruz">🔥 ERUTTA!</button></div>
    </div>`);
  $("confermaEruz").onclick = () => { chiudiModale(); erutta(); };
}

// ============================================================ TESTATA (valute)
let _testa = {};
function imposta(id, v) { if (_testa[id] !== v) { _testa[id] = v; const e = $(id); if (e) e.textContent = v; } }
function aggiornaTesta() {
  imposta("vLire", numLire(S.lire));
  imposta("vProd", "+" + numLire(produzione()) + "/s");
  imposta("icoLire", simLire());
  imposta("vRott", fmt(S.rottami));
  imposta("vBig", fmt(S.biglietti));
  imposta("vBraci", fmt(S.braci));
  $("valBraci").hidden = !S.braciTot;
  const lire = $("valLire"); if (lire) lire.title = `${fmtEuro(S.lire)} (1 € = 1.936,27 ₤)`;
  // pallino sulle schede con qualcosa di pronto
  const commPronta = S.commissioni.some(c => progressoComm(c) >= c.q);
  document.querySelectorAll('[data-scheda="giochi"]').forEach(b => b.classList.toggle("avviso", commPronta));
  // buff attivi
  const bb = $("buffbar");
  // 2.1.6: quelli DaProd (dp…) stanno ai lati, col loro conto alla rovescia.
  const html = Object.entries(S.buff).filter(([k, b]) => b && b.fino > Date.now() && k.indexOf("dp") !== 0)
    .map(([k, b]) => `<span class="buff">${{ dan: "💥", prod: "💰", crit: "🎯" }[k]} ${esc(b.nome)} ${k === "crit" ? "+" + perc(b.val) : "×" + b.val} · ${Math.ceil((b.fino - Date.now()) / 1000)}s</span>`).join("");
  if (bb._h !== html) { bb._h = html; bb.innerHTML = html; }
}

// ============================================================ NOTIFICHE
const _toastUltimo = {};
function toast(ico, tit, testo, opz) {
  opz = opz || {};
  if (!S.opz.notifiche && !opz.sempre) return;
  // 2.2.0: «mettiamo un modo per togliere le notifiche popup del tempo e i bonus e malus».
  if (opz.effetto && S.opz.popupEffetti === false) return;
  const chiave = opz.chiave || tit;
  const t = Date.now();
  if (_toastUltimo[chiave] && t - _toastUltimo[chiave] < 2500) return;
  _toastUltimo[chiave] = t;
  const box = $("toasts");
  while (box.children.length >= 3) box.firstChild.remove();
  const el = document.createElement("div");
  el.className = "toast " + (opz.tipo || "");
  el.innerHTML = `<div class="t-ico">${ico}</div><div><b>${esc(tit)}</b>${testo ? `<small>${esc(testo)}</small>` : ""}</div>`;
  el.onclick = () => el.remove();
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add("on"));
  setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 400); }, opz.dur || 2800);
}

// ============================================================ RADIO PARTENOPE
const codaRadio = [];
let radioOcc = false, radioTimer = null, radioScrivi = null;
function radio(testo, opz) {
  opz = opz || {};
  if (!opz.noLog) { S.diario.push({ t: testo, chi: opz.chi || "PARTENOPE", q: Date.now() }); if (S.diario.length > 80) S.diario.shift(); }
  codaRadio.push({ testo, chi: opz.chi || "PARTENOPE", col: opz.col || "#00ff41" });
  if (!radioOcc) prossimaRadio();
}
// ------------------------------------------------ la voce della Radio (2.1.3)
// «Mettiamo un TTS che parla»: la sintesi vocale del telefono o del computer,
// in italiano, niente da scaricare. Se il sistema non ce l'ha, la Radio resta
// scritta come prima. Si spegne nelle Opzioni («Voce della Radio»).
// ⚠ 2.1.5: dentro l'app Android della DaProd Suite la sintesi del browser non
// c'e' (la WebView non ce l'ha): «sulla suite non sento i dialoghi con il TTS».
// L'app da' la voce di Android col ponte DaProdApp.parla, che arriva anche qui
// dentro la cornice della sala. Si usa quella quando il browser non ne ha una.
function ponteApp() {
  try { if (window.DaProdApp && window.DaProdApp.parla) return window.DaProdApp; } catch (e) { /* niente */ }
  try { if (window.top && window.top.DaProdApp && window.top.DaProdApp.parla) return window.top.DaProdApp; } catch (e) { /* niente */ }
  return null;
}
const Voce = (() => {
  const ok = typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  let voce = null;
  function scegli() {
    if (!ok) return;
    const tutte = speechSynthesis.getVoices();
    voce = tutte.find(v => /^it[-_]IT/i.test(v.lang) && /google|natural|neural/i.test(v.name)) ||
      tutte.find(v => /^it/i.test(v.lang)) || null;
  }
  if (ok) { scegli(); speechSynthesis.onvoiceschanged = scegli; }
  return {
    parla(testo, chi, fine) {
      if (!S.opz.voce) return false;
      const tono = chi === "PARTENOPE" ? 1.15 : /BOSS|VESUVIO/i.test(chi) ? 0.75 : 1;
      if (!ok || !voce) {
        const app = ponteApp();
        if (app) { try { app.parla(String(testo), tono, 1.05); return true; } catch (e) { /* niente */ } }
      }
      if (!ok) return false;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(testo);
        u.lang = "it-IT";
        if (voce) u.voice = voce;
        // Ogni voce della Radio ha il suo tono: la sirena piu' alta, i boss piu' bassi.
        u.pitch = chi === "PARTENOPE" ? 1.15 : /BOSS|VESUVIO/i.test(chi) ? 0.75 : 1;
        u.rate = 1.05;
        u.volume = Math.max(0.2, Math.min(1, S.opz.volume + 0.3));
        u.onend = fine;
        speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    },
    zitta() {
      if (ok) try { speechSynthesis.cancel(); } catch (e) { /* niente */ }
      const app = ponteApp(); if (app && app.zitta) try { app.zitta(); } catch (e) { /* niente */ }
    }
  };
})();

function prossimaRadio() {
  clearTimeout(radioTimer); clearInterval(radioScrivi);
  Voce.zitta();
  const box = $("radio");
  const m = codaRadio.shift();
  if (!m) { radioOcc = false; box.classList.remove("on"); return; }
  radioOcc = true;
  $("radioChi").textContent = m.chi;
  $("radioChi").style.color = m.col;
  $("radioAltri").textContent = codaRadio.length ? `+${codaRadio.length} ▶` : "✕";
  const p = $("radioTesto");
  p.textContent = "";
  box.classList.add("on");
  Suono.suona("radio");
  let i = 0;
  radioScrivi = setInterval(() => {
    i += 2; p.textContent = m.testo.slice(0, i);
    if (i >= m.testo.length) { clearInterval(radioScrivi); radioScrivi = null; }
  }, 22);
  radioTimer = setTimeout(prossimaRadio, 3500 + m.testo.length * 45);
  box.dataset.testo = m.testo;
  // Con la voce, il messaggio dopo arriva quando ha finito di parlare.
  const questo = m;
  if (Voce.parla(m.testo, m.chi, () => { if (box.dataset.testo === questo.testo) { clearTimeout(radioTimer); radioTimer = setTimeout(prossimaRadio, 600); } })) {
    clearTimeout(radioTimer);
    radioTimer = setTimeout(prossimaRadio, 6000 + m.testo.length * 90);
  }
}
// Un tocco sulla Radio la salta (2.1.3): «se le tappi si skippano». Prima si
// saltava solo dalla piccola ✕ in alto, che sul telefono non si prendeva.
function tocoRadio(e) {
  if (e) e.stopPropagation();
  prossimaRadio();
}

// ============================================================ FINESTRE
let _chiudiModale = null;
function apriModale(tit, html, onChiudi) {
  if (_chiudiModale) { const f = _chiudiModale; _chiudiModale = null; f(); }
  $("modTitolo").textContent = tit;
  $("modCorpo").innerHTML = html;
  $("modale").classList.add("on");
  _chiudiModale = onChiudi || null;
}
function chiudiModale() {
  $("modale").classList.remove("on");
  if (_chiudiModale) { const f = _chiudiModale; _chiudiModale = null; f(); }
  setTimeout(() => { if (!$("modale").classList.contains("on")) $("modCorpo").innerHTML = ""; }, 300);
  richiediRender();
}

function aggiornaRobot() {
  const r = $("robotPalco");
  const v = JSON.stringify(S.rob);
  if (r && r.dataset.v !== v) { r.dataset.v = v; r.innerHTML = disegnaRobot(S.rob); }
}

// ============================================================ OPZIONI
function apriOpzioni() {
  const o = S.opz;
  const sw = (k, n) => `<label class="interr"><input type="checkbox" data-opz="${k}" ${o[k] ? "checked" : ""}><span></span>${n}</label>`;
  apriModale("⚙️ Opzioni", `
    <div class="opzioni-griglia">
      <section><h4>Audio</h4>${sw("suoni", "Effetti sonori")}${sw("musica", "Musica synth dal vivo")}
        <label class="cursore">Volume <input type="range" min="0" max="1" step="0.05" value="${o.volume}" data-opz="volume"></label></section>
      <section><h4>Schermo</h4>${sw("notifiche", "Notifiche a comparsa")}${sw("popupEffetti", "Avvisi di tempo, bonus e malus")}${sw("voce", "Voce della Radio")}${sw("borsaHud", "Mini Borsa trascinabile")}
        <label class="scelta">Qualità grafica <select data-opz="qualita">${["auto", "alta", "media", "bassa"].map(q => `<option ${o.qualita === q ? "selected" : ""}>${q}</option>`).join("")}</select></label>
        <label class="scelta">Numeri grandi <select data-opz="notazione">${["suffissi", "scientifica"].map(q => `<option ${o.notazione === q ? "selected" : ""}>${q}</option>`).join("")}</select></label></section>
      <section><h4>Salvataggio</h4>
        <p class="nota">Il gioco si salva da solo ogni 10 secondi su questo dispositivo. Per portarlo altrove copia il codice.</p>
        <div class="bottoni"><button class="btn" id="oEsporta">📤 Esporta codice</button><button class="btn" id="oImporta">📥 Importa codice</button></div>
        <textarea id="oCodice" rows="3" placeholder="Il codice di salvataggio comparirà qui (o incollane uno)"></textarea>
        <button class="btn rosso" id="oAzzera">🗑️ Azzera tutto</button></section>
      <section><h4>Versione ${VERSIONE}</h4>
        <p class="nota" id="oAgg">${Aggiornamenti.stato()}</p>
        <div class="bottoni"><button class="btn" id="oControlla">🔄 Controlla aggiornamenti</button><button class="btn" data-azione="novita">✨ Novità</button></div>
        <div class="bottoni"><button class="btn" data-link="changelog">📅 Changelog</button><button class="btn" data-link="release">📥 App Android / Windows / Mac</button></div>
        <p class="crediti">${logoDaProd("piccolo")}<br>NEON PARTENOPE è un gioco DaProd · Napoli · Tecnologia · Creatività<br>Remake di VESUVIO.EXE · codice MIT</p></section>
    </div>`);
  const corpo = $("modCorpo");
  corpo.querySelectorAll("[data-opz]").forEach(inp => {
    inp.onchange = inp.oninput = () => {
      const k = inp.dataset.opz;
      S.opz[k] = inp.type === "checkbox" ? inp.checked : (inp.type === "range" ? Number(inp.value) : inp.value);
      applicaOpzioni();
      salva();
    };
  });
  $("oEsporta").onclick = () => {
    const c = esportaCodice(); $("oCodice").value = c; $("oCodice").select();
    const ok = () => toast("📋", "Codice copiato", "Incollalo sull'altro dispositivo", { sempre: true });
    try { navigator.clipboard.writeText(c).then(ok, () => {}); } catch (e) { /* si copia a mano dal riquadro */ }
  };
  $("oImporta").onclick = () => {
    try { importaCodice($("oCodice").value); location.reload(); }
    catch (e) { toast("⚠️", "Codice non valido", "Controlla di averlo copiato tutto", { sempre: true }); }
  };
  $("oAzzera").onclick = () => {
    const b = $("oAzzera");
    if (!b.dataset.sicuro) { b.dataset.sicuro = "1"; b.textContent = "⚠️ Sicuro? Tocca di nuovo per cancellare tutto"; return; }
    azzeraTutto(); location.reload();
  };
  $("oControlla").onclick = async () => { $("oAgg").textContent = "Controllo in corso…"; await Aggiornamenti.controlla(true); $("oAgg").textContent = Aggiornamenti.stato(); };
  corpo.querySelectorAll("[data-link]").forEach(b => b.onclick = () => apriEsterno(Aggiornamenti.link(b.dataset.link)));
}

function applicaOpzioni() {
  Suono.volume(S.opz.volume);
  Suono.suoni(S.opz.suoni);
  Suono.musica();
  const q = S.opz.qualita === "auto" ? (innerWidth < 760 || matchMedia("(pointer:coarse)").matches ? "media" : "alta") : S.opz.qualita;
  document.documentElement.dataset.qualita = q;
  // 2.2.0: senza avvisi di tempo restano solo i bagliori ai lati.
  document.body.classList.toggle("senza-effetti", S.opz.popupEffetti === false);
  Scena.impostaQualita(q);
  $("bMusica").classList.toggle("off", !S.opz.musica);
  $("bSuoni").classList.toggle("off", !S.opz.suoni);
  $("bSuoni").textContent = S.opz.suoni ? "🔊" : "🔇";
}

function mostraNovita(forza) {
  const n = NOVITA[VERSIONE];
  if (!n) return;
  apriModale("✨ Novità · " + VERSIONE, `
    <div class="novita"><h3>${esc(n.titolo)}</h3><ul>${n.punti.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
    <button class="btn oro grande" data-azione="chiudiModale">Jamme!</button></div>`);
}

// ============================================================ IL TELEFONO (2.1.3)
// «Su mobile e' troppo diviso in due: ogni zona deve avere la sua versione a
// schermo intero, e il quadratino dell'avventura spostabile, un PiP
// trascinabile.» Fino alla 2.1.2 l'arena stava sopra e il pannello sotto, a
// meta' schermo tutti e due. Adesso sul telefono si vede una zona per volta:
// l'Arena, o una scheda. Quando c'e' una scheda, l'arena diventa un riquadro
// che si trascina dove si vuole e si continua a toccare per colpire; un tocco
// su ⤢ la riporta a tutto schermo.
const telefono = () => matchMedia("(max-width: 979px)").matches;
function vista(quale) {
  const b = document.body;
  b.classList.toggle("vista-arena", quale === "arena");
  b.classList.toggle("vista-pannello", quale === "pannello");
  document.querySelectorAll("#barraMobile [data-vista]").forEach(x => x.classList.toggle("on", quale === "arena"));
  if (quale === "arena") document.querySelectorAll("#barraMobile [data-scheda]").forEach(x => x.classList.remove("on"));
  else document.querySelectorAll("#barraMobile [data-scheda]").forEach(x => x.classList.toggle("on", x.dataset.scheda === schedaAttiva));
  mettiPip();
  // Chi disegna sul palco si rimisura (effetti, scena).
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}
const CHIAVE_PIP = "np.pip";
function mettiPip() {
  const a = $("colArena");
  if (!document.body.classList.contains("vista-pannello") || !telefono()) { a.style.left = a.style.top = ""; return; }
  let p = null;
  try { p = JSON.parse(localStorage.getItem(CHIAVE_PIP) || "null"); } catch (e) { p = null; }
  const w = a.offsetWidth || 180, h = a.offsetHeight || 220;
  // Di partenza in basso a destra, sopra la barra: in alto passa la Radio.
  const x = p ? p.x : innerWidth - w - 10, y = p ? p.y : innerHeight - h - 84;
  a.style.left = limita(x, 4, innerWidth - w - 4) + "px";
  a.style.top = limita(y, 4, innerHeight - h - 70) + "px";
}
function abbassaPip(giu) {
  document.body.classList.toggle("pip-giu", !!giu);
  try { localStorage.setItem("np.pipGiu", giu ? "1" : "0"); } catch (e) { /* va bene */ }
}
function legaPip() {
  const a = $("colArena"), m = $("pipManiglia");
  let drag = null;
  m.addEventListener("pointerdown", e => {
    if (e.target.closest("#pipApri") || e.target.closest("#pipGiu")) return;
    drag = { x: e.clientX - a.offsetLeft, y: e.clientY - a.offsetTop };
    m.setPointerCapture(e.pointerId);
  });
  m.addEventListener("pointermove", e => {
    if (!drag) return;
    a.style.left = limita(e.clientX - drag.x, 4, innerWidth - a.offsetWidth - 4) + "px";
    a.style.top = limita(e.clientY - drag.y, 4, innerHeight - a.offsetHeight - 70) + "px";
  });
  const fine = () => {
    if (!drag) return; drag = null;
    try { localStorage.setItem(CHIAVE_PIP, JSON.stringify({ x: a.offsetLeft, y: a.offsetTop })); } catch (e) { /* va bene */ }
  };
  m.addEventListener("pointerup", fine);
  m.addEventListener("pointercancel", fine);
  $("pipApri").onclick = () => { abbassaPip(false); vista("arena"); };
  // 2.1.5: giu' del tutto, e su al volo dalla linguetta. Si ricorda.
  $("pipGiu").onclick = (e) => { e.stopPropagation(); abbassaPip(true); };
  $("pipSu").onclick = () => abbassaPip(false);
  try { if (localStorage.getItem("np.pipGiu") === "1") document.body.classList.add("pip-giu"); } catch (e) { /* va bene */ }
  addEventListener("resize", () => { if (document.body.classList.contains("vista-pannello")) mettiPip(); });
}

// ============================================================ LEGAMI
function legaInterfaccia() {
  // 2.2.0: «i potenziamenti a pagamento non sono ben visibili: mettiamo bene la
  // categoria in alto». Nella sala la prima scheda e' quella dei potenziamenti DaProd.
  if (window.DaProdLira && DaProdLira.modo === "suite" && !SCHEDE.some(s => s.id === "daprod")) SCHEDE.unshift({ id: "daprod", i: "⚡", n: "DaProd" });
  // schede (testata desktop e barra in basso)
  const tab = SCHEDE.map(s => `<button data-scheda="${s.id}"><span>${s.i}</span><em>${s.n}</em></button>`).join("");
  $("schede").innerHTML = tab;
  // Sul telefono l'Arena e' una scheda come le altre (2.1.3): la prima.
  const primi = SCHEDE.slice(0, 3);
  $("barraMobile").innerHTML = `<button data-vista="arena" class="on"><span>⚔️</span><em>Arena</em></button>` +
    primi.map(s => `<button data-scheda="${s.id}"><span>${s.i}</span><em>${s.n}</em></button>`).join("") +
    `<button id="bAltro"><span>☰</span><em>Altro</em></button>`;
  $("altroMenu").innerHTML = SCHEDE.slice(3).map(s => `<button data-scheda="${s.id}"><span>${s.i}</span>${s.n}</button>`).join("") +
    `<button data-azione="opzioni"><span>⚙️</span>Opzioni</button>`;
  document.addEventListener("click", e => {
    const sc = e.target.closest("[data-scheda]");
    if (sc) { Suono.avvia(); Suono.suona("clic"); apriScheda(sc.dataset.scheda); vista("pannello"); return; }
    const vi = e.target.closest("[data-vista]");
    if (vi) { Suono.avvia(); Suono.suona("clic"); vista(vi.dataset.vista); return; }
    const az = e.target.closest("[data-azione]");
    if (az && !az.disabled) { eseguiAzione(az); return; }
    if (!e.target.closest("#altroMenu") && !e.target.closest("#bAltro")) $("altroMenu").classList.remove("on");
  });
  $("bAltro").onclick = e => { e.stopPropagation(); $("altroMenu").classList.toggle("on"); };
  legaPip();
  vista("arena");
  $("radio").onclick = tocoRadio;
  $("modChiudi").onclick = chiudiModale;
  $("modale").addEventListener("click", e => { if (e.target === $("modale")) chiudiModale(); });
  $("bOpz").onclick = () => { Suono.avvia(); apriOpzioni(); };
  $("bMusica").onclick = () => { Suono.avvia(); S.opz.musica = !S.opz.musica; applicaOpzioni(); salva(); };
  $("bSuoni").onclick = () => { Suono.avvia(); S.opz.suoni = !S.opz.suoni; applicaOpzioni(); salva(); };
  $("bRadio").onclick = () => { apriScheda("diario"); };
  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === "Escape") chiudiModale();
    if ((e.code === "Space" || e.key === "Enter") && !$("modale").classList.contains("on") && $("intro").classList.contains("via")) { e.preventDefault(); colpoManuale(null); }
    const n = Number(e.key); if (n >= 1 && n <= SCHEDE.length && !$("modale").classList.contains("on")) apriScheda(SCHEDE[n - 1].id);
    if (e.key === "p" || e.key === "P") attivaProtocollo();
  });
}
