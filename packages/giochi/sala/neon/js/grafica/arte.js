/**
 * NEON PARTENOPE — arte vettoriale: marchio DaProd, logo del gioco, Ferro Vecchio e i dieci boss
 */
"use strict";

// Marchio DaProd (lo stesso delle altre produzioni: moneta d'oro, anello magenta e la D)
const SVG_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="dpOro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".55" stop-color="#ffd54a"/><stop offset="1" stop-color="#ff9d00"/></linearGradient>
    <linearGradient id="dpMag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3df2"/><stop offset="1" stop-color="#35e8ff"/></linearGradient>
    <symbol id="logoDaProd" viewBox="0 0 260 64">
      <g class="neon">
        <circle cx="32" cy="32" r="27" fill="#150e24" stroke="url(#dpOro)" stroke-width="4"/>
        <circle cx="32" cy="32" r="20.5" fill="none" stroke="url(#dpMag)" stroke-width="2" stroke-dasharray="3 3.4"/>
        <path d="M24 19h9.5c8 0 13 5 13 13s-5 13-13 13H24z M30 25v14h3.2c4.3 0 7-2.6 7-7s-2.7-7-7-7z" fill="url(#dpOro)" fill-rule="evenodd"/>
        <text x="70" y="44" font-family="Orbitron, 'Arial Black', sans-serif" font-weight="900" font-size="36" letter-spacing="1" fill="#fff6dd">Da<tspan fill="url(#dpOro)">Prod</tspan></text>
      </g>
    </symbol>
    <symbol id="emblemaNP" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#0d0820" stroke="url(#dpMag)" stroke-width="3"/>
      <path d="M8 44 L22 30 L27 34 L33 22 L40 22 L46 33 L56 44 Z" fill="#1a1030" stroke="#ff3df2" stroke-width="1.6"/>
      <ellipse cx="36.5" cy="22" rx="4.5" ry="1.8" fill="#ff5a1f"/>
      <path d="M34 22 q-2 -8 3 -12 q-1 6 3 8" fill="none" stroke="#ffd54a" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M8 47 H56" stroke="#35e8ff" stroke-width="2"/>
      <path d="M12 51 H52 M18 55 H46" stroke="#35e8ff" stroke-width="1.2" opacity=".55"/>
    </symbol>
  </defs>
</svg>`;

function logoDaProd(cls) { return `<svg class="logoDP ${cls || ""}" viewBox="0 0 260 64" aria-label="DaProd"><use href="#logoDaProd"/></svg>`; }
function emblema(cls) { return `<svg class="emblema ${cls || ""}" viewBox="0 0 64 64" aria-hidden="true"><use href="#emblemaNP"/></svg>`; }

// ============================================================ BOSS
function arteBoss(id) {
  switch (id) {
    case "capitano": return bossCapitano();
    case "misterk": return bossMisterK();
    case "ruggine": return bossRuggine();
    case "vipera": return bossVipera();
    case "gemelli": return bossGemelli();
    case "madonnina": return bossMadonnina();
    case "bomba": return bossBomba();
    case "munaciello": return bossMunaciello();
    case "eco": return bossEco();
    case "smc": return bossSMC();
    default: return bossCapitano();
  }
}

function bossMunaciello() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs><radialGradient id="munLuce" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#b6ff5c" stop-opacity=".6"/><stop offset="1" stop-color="#b6ff5c" stop-opacity="0"/></radialGradient></defs>
    <circle cx="118" cy="92" r="34" fill="url(#munLuce)"/>
    <path d="M52 150 C44 120 46 86 58 66 C66 50 94 50 102 66 C114 86 116 120 108 150 Z" fill="#2a1a10" stroke="#6b4a2a" stroke-width="2.5"/>
    <path d="M58 66 C62 34 98 34 102 66 C96 58 64 58 58 66 Z" fill="#3a2414" stroke="#6b4a2a" stroke-width="2"/>
    <path d="M60 60 C62 30 98 30 100 60 L94 76 Q80 86 66 76 Z" fill="#241408"/>
    <ellipse cx="72" cy="66" rx="4" ry="3" fill="#b6ff5c"/><ellipse cx="88" cy="66" rx="4" ry="3" fill="#b6ff5c"/>
    <path d="M72 76 Q80 81 88 76" stroke="#b6ff5c" stroke-width="1.6" fill="none"/>
    <path d="M100 96 L118 86" stroke="#6b4a2a" stroke-width="5" stroke-linecap="round"/>
    <rect x="108" y="84" width="20" height="26" rx="4" fill="#3a2a10" stroke="#ffd54a" stroke-width="2"/>
    <rect x="113" y="89" width="10" height="16" rx="2" fill="#fff3a0"/>
    <path d="M66 112 h28 M70 124 h20" stroke="#6b4a2a" stroke-width="2"/>
    <text x="80" y="142" font-family="monospace" font-size="8" fill="#b6ff5c" text-anchor="middle">0x4D55</text>
  </svg>`;
}

function bossEco() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs><linearGradient id="ecoG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3df2"/><stop offset="1" stop-color="#35e8ff"/></linearGradient></defs>
    <g opacity=".35"><path d="M20 30 h120 M14 60 h132 M20 90 h120 M26 120 h108" stroke="#35e8ff" stroke-width="1" stroke-dasharray="2 6"/></g>
    <path d="M58 40 C40 60 38 96 56 104 C40 120 50 140 80 148 C110 140 120 120 104 104 C122 96 120 60 102 40 Z" fill="none" stroke="url(#ecoG)" stroke-width="2.5"/>
    <path d="M60 34 C56 14 104 14 100 34 C112 50 110 70 100 78 L60 78 C50 70 48 50 60 34 Z" fill="#1a0a2c" stroke="#ff3df2" stroke-width="2"/>
    <path d="M52 30 C40 50 42 80 34 104 M108 30 C120 50 118 80 126 104" stroke="#ff3df2" stroke-width="3" fill="none" opacity=".8"/>
    <rect x="66" y="48" width="10" height="4" fill="#35e8ff"/><rect x="84" y="48" width="10" height="4" fill="#35e8ff"/>
    <path d="M70 64 q10 6 20 0" stroke="#35e8ff" stroke-width="2" fill="none"/>
    <path d="M60 104 C70 120 90 120 100 104 L110 140 Q80 130 50 140 Z" fill="#241040" stroke="#35e8ff" stroke-width="2"/>
    <path d="M50 140 L36 154 L62 146 M110 140 L124 154 L98 146" fill="#ff3df2" opacity=".85"/>
    <text x="80" y="96" font-family="monospace" font-size="9" fill="#ff3df2" text-anchor="middle">♪ 01100001</text>
  </svg>`;
}

// ============================================================ FERRO VECCHIO
// Disegnato da zero ad ogni cambio d'aspetto. Accetta sia i pezzi dell'officina sia quelli della Merceria.
function disegnaRobot(r) {
  r = r || S.rob;
  const c1 = r.col1 || "#3fa8d8", c2 = r.col2 || "#ffd54a", ec = r.colOcchi || "#5dffb4";
  const s1 = f => tono(c1, f), s2 = f => tono(c2, f);
  const t = r.telaio;
  const enf = t === "enforce", mar = t === "mario", andro = t === "andro";
  let ali = "", fx = "", gambe = "", corpo = "", braccia = "", arma = "", testa = "", occhi = "", antenna = "", cappello = "", acc = "";

  // ali (Merceria)
  if (r.ali === "w_vesuvio") ali = `<path d="M56 96 C16 70 18 36 50 30 C70 44 64 82 78 112 Z" fill="${c2}" stroke="#ff5a1f" stroke-width="2"/><path d="M144 96 C184 70 182 36 150 30 C130 44 136 82 122 112 Z" fill="${c2}" stroke="#ff5a1f" stroke-width="2"/>`;
  else if (r.ali === "w_enforcer") ali = `<path d="M58 92 L18 64 L30 110 L60 118 Z" fill="#6a7480" stroke="#3c444e" stroke-width="2.5"/><path d="M142 92 L182 64 L170 110 L140 118 Z" fill="#6a7480" stroke="#3c444e" stroke-width="2.5"/>`;
  else if (r.ali === "w_frutiger") ali = `<g fill="#bdf2ff" opacity=".8"><circle cx="186" cy="70" r="13"/><circle cx="168" cy="50" r="9"/><circle cx="160" cy="84" r="7"/><circle cx="14" cy="70" r="13"/><circle cx="32" cy="50" r="9"/><circle cx="40" cy="84" r="7"/></g>`;
  else if (r.ali === "w_partenope") ali = `<path d="M60 100 C20 90 8 50 30 34 C40 60 56 70 70 96 Z" fill="#ff3df2" opacity=".75" stroke="#35e8ff" stroke-width="2"/><path d="M140 100 C180 90 192 50 170 34 C160 60 144 70 130 96 Z" fill="#ff3df2" opacity=".75" stroke="#35e8ff" stroke-width="2"/>`;

  // effetti
  if (r.fx === "f_frutiger") fx = `<circle cx="100" cy="116" r="84" fill="#7fd4ff" opacity=".10"/><circle cx="100" cy="116" r="58" fill="#7fd4ff" opacity=".08"/>`;
  else if (r.fx === "f_sistema") fx = `<circle cx="100" cy="116" r="86" fill="none" stroke="#b07bff" stroke-width="2" stroke-dasharray="4 6" opacity=".7"/><circle cx="100" cy="116" r="70" fill="#b07bff" opacity=".07"/>`;
  else if (r.fx === "f_partenope") fx = `<g fill="none" stroke="#ff3df2" stroke-width="2" opacity=".6"><path d="M30 60 q10 -10 20 0 t20 0"/><path d="M130 50 q10 -10 20 0 t20 0"/><path d="M20 150 q10 -10 20 0 t20 0"/></g><circle cx="100" cy="116" r="80" fill="#ff3df2" opacity=".06"/>`;

  // gambe
  if (enf) gambe = `<rect x="74" y="174" width="22" height="44" fill="${s1(.7)}" rx="5"/><rect x="106" y="174" width="22" height="44" fill="${s1(.7)}" rx="5"/><rect x="64" y="214" width="34" height="12" fill="#18202c" rx="4"/><rect x="104" y="214" width="34" height="12" fill="#18202c" rx="4"/>`;
  else if (mar) gambe = `<rect x="82" y="184" width="14" height="28" fill="${s1(.85)}" rx="4"/><rect x="104" y="184" width="14" height="28" fill="${s1(.85)}" rx="4"/><ellipse cx="89" cy="214" rx="13" ry="5" fill="#18202c"/><ellipse cx="111" cy="214" rx="13" ry="5" fill="#18202c"/>`;
  else gambe = `<rect x="78" y="178" width="18" height="34" fill="${s1(.8)}" rx="${andro ? 9 : 4}"/><rect x="104" y="178" width="18" height="34" fill="${s1(.8)}" rx="${andro ? 9 : 4}"/><ellipse cx="87" cy="214" rx="15" ry="6" fill="#141c28"/><ellipse cx="113" cy="214" rx="15" ry="6" fill="#141c28"/>`;

  // corpo e braccia
  if (enf) {
    corpo = `<rect x="52" y="96" width="96" height="84" rx="10" fill="${c1}" stroke="${s1(.5)}" stroke-width="3"/><rect x="42" y="88" width="26" height="24" fill="${s1(.7)}" rx="6"/><rect x="132" y="88" width="26" height="24" fill="${s1(.7)}" rx="6"/><circle cx="100" cy="132" r="15" fill="${c2}" stroke="${s2(.6)}" stroke-width="2"/><circle cx="100" cy="132" r="7" fill="${ec}"/>`;
    braccia = `<g class="br-sx"><rect x="40" y="102" width="20" height="54" rx="7" fill="${s1(.85)}"/></g><g class="br-dx"><rect x="140" y="102" width="20" height="54" rx="7" fill="${s1(.85)}"/><circle cx="150" cy="160" r="11" fill="${s1(.65)}"/></g>`;
  } else if (mar) {
    corpo = `<rect x="72" y="106" width="56" height="72" rx="8" fill="${c1}" stroke="${s1(.5)}" stroke-width="2"/><circle cx="100" cy="146" r="13" fill="${c2}" stroke="${s2(.6)}" stroke-width="2"/><circle cx="100" cy="146" r="5" fill="${ec}"/>`;
    braccia = `<g class="br-sx"><rect x="52" y="112" width="16" height="50" rx="5" fill="${s1(.85)}"/></g><g class="br-dx"><rect x="132" y="112" width="16" height="50" rx="5" fill="${s1(.85)}"/><circle cx="140" cy="164" r="9" fill="${s1(.65)}"/></g>`;
  } else {
    corpo = `<rect x="66" y="100" width="68" height="78" rx="${andro ? 26 : 12}" fill="${c1}" stroke="${s1(.5)}" stroke-width="2"/>${andro ? `<ellipse cx="88" cy="118" rx="14" ry="8" fill="#fff" opacity=".25"/>` : `<circle cx="74" cy="108" r="2.5" fill="${s1(.45)}"/><circle cx="126" cy="108" r="2.5" fill="${s1(.45)}"/><circle cx="74" cy="170" r="2.5" fill="${s1(.45)}"/><circle cx="126" cy="170" r="2.5" fill="${s1(.45)}"/>`}<circle cx="100" cy="136" r="14" fill="${c2}" stroke="${s2(.6)}" stroke-width="2"/><circle cx="100" cy="136" r="6" fill="${ec}"/>`;
    braccia = `<g class="br-sx"><rect x="46" y="106" width="18" height="60" rx="7" fill="${s1(.85)}"/><circle cx="55" cy="170" r="10" fill="${s1(.65)}"/></g><g class="br-dx"><rect x="136" y="106" width="18" height="60" rx="7" fill="${s1(.85)}"/><circle cx="145" cy="170" r="10" fill="${s1(.65)}"/></g>`;
  }

  // armi
  if (r.arma === "chia") arma = `<g class="br-dx"><rect x="150" y="160" width="42" height="8" rx="3" fill="#aab" stroke="#687280" stroke-width="1.5" transform="rotate(-30 150 164)"/></g>`;
  else if (r.arma === "spad") arma = `<g class="br-dx"><rect x="146" y="96" width="8" height="76" rx="3" fill="#5dffb4" transform="rotate(18 150 168)"/></g>`;
  else if (r.arma === "pist") arma = `<g class="br-dx"><rect x="140" y="160" width="40" height="12" rx="3" fill="#2d3748"/><rect x="140" y="163" width="8" height="4" fill="${ec}"/><rect x="172" y="170" width="8" height="14" rx="2" fill="#4a5568"/></g>`;

  // testa
  if (enf) testa = `<rect x="70" y="18" width="60" height="58" rx="9" fill="${c1}" stroke="${s1(.5)}" stroke-width="2"/><rect x="60" y="12" width="18" height="20" rx="4" fill="${s1(.7)}"/><rect x="122" y="12" width="18" height="20" rx="4" fill="${s1(.7)}"/>`;
  else if (mar) testa = `<path d="M72 66 L74 24 Q100 12 126 24 L128 66 Z" fill="${c1}" stroke="${s1(.5)}" stroke-width="2"/>`;
  else testa = `<rect x="74" y="20" width="52" height="56" rx="${andro ? 26 : 16}" fill="${c1}" stroke="${s1(.5)}" stroke-width="2"/><rect x="70" y="40" width="6" height="16" rx="2" fill="${s1(.6)}"/><rect x="124" y="40" width="6" height="16" rx="2" fill="${s1(.6)}"/>`;

  // antenna
  if (r.antenna === "a_sistema") antenna = `<line x1="100" y1="20" x2="100" y2="0" stroke="#b07bff" stroke-width="2.5"/><circle cx="100" cy="2" r="5" fill="#b07bff"/><path d="M92 8 q8 -8 16 0" stroke="#b07bff" fill="none"/>`;
  else if (r.antenna === "p") antenna = `<line x1="100" y1="20" x2="100" y2="4" stroke="#99a" stroke-width="2"/><circle class="lampeggia" cx="100" cy="3" r="4" fill="${ec}"/>`;
  else if (r.antenna === "g") antenna = `<line x1="100" y1="20" x2="100" y2="0" stroke="#99a" stroke-width="3"/><line x1="100" y1="12" x2="112" y2="4" stroke="#99a" stroke-width="2"/><line x1="100" y1="12" x2="88" y2="4" stroke="#99a" stroke-width="2"/>`;
  else if (r.antenna === "d") antenna = `<line x1="100" y1="20" x2="100" y2="6" stroke="#99a" stroke-width="2"/><path d="M84 8 a16 8 0 0 0 32 0 z" fill="${c2}"/>`;

  // cappello
  if (r.cappello === "b") cappello = `<path d="M70 24 q30 -18 60 0 q0 8 -30 8 q-30 0 -30 -8 z" fill="${c2}"/><rect x="118" y="24" width="20" height="5" rx="2" fill="${s2(.7)}"/>`;
  else if (r.cappello === "c" || r.cappello === "h_mafia") cappello = `<path d="M70 26 q30 -14 60 0 q0 12 -30 12 q-30 0 -30 -12 z" fill="#1c2533"/><rect x="72" y="30" width="62" height="5" rx="2" fill="#111"/>`;
  else if (r.cappello === "boss") cappello = `<ellipse cx="100" cy="22" rx="38" ry="7" fill="#111824"/><path d="M84 2 h32 v20 q-16 8 -32 0 z" fill="#111824"/><rect x="84" y="14" width="32" height="5" fill="${c2}"/>`;
  else if (r.cappello === "h_vesuvio") cappello = `<path d="M70 24 L86 2 L96 16 L106 4 L118 20 L130 10 L132 26 q-32 14 -62 -2 z" fill="#c41f0f" stroke="#ffb070" stroke-width="2"/>`;
  else if (r.cappello === "h_frutiger") cappello = `<ellipse cx="100" cy="12" rx="40" ry="9" fill="none" stroke="#7fe6c5" stroke-width="4" opacity=".85"/>`;
  else if (r.cappello === "h_partenope") cappello = `<path d="M72 24 q6 -18 14 -4 q6 -16 14 -2 q8 -14 14 2 q8 -14 14 4 q-28 10 -56 0 z" fill="#ffc2e8" stroke="#ff3df2" stroke-width="2"/><circle cx="100" cy="12" r="4" fill="#fff"/>`;

  // occhi
  const oc = r.occhi;
  if (oc === "due") occhi = `<ellipse cx="89" cy="48" rx="9" ry="9" fill="${ec}" stroke="#0a141c" stroke-width="2"/><ellipse cx="111" cy="48" rx="9" ry="9" fill="${ec}" stroke="#0a141c" stroke-width="2"/><circle cx="92" cy="45" r="3" fill="#fff"/><circle cx="114" cy="45" r="3" fill="#fff"/>`;
  else if (oc === "mono") occhi = `<circle cx="100" cy="48" r="15" fill="#10141c" stroke="${c2}" stroke-width="3"/><circle cx="100" cy="48" r="6" fill="${ec}"/>`;
  else if (oc === "crt") occhi = `<rect x="80" y="36" width="40" height="24" rx="5" fill="#041208"/><path d="M85 50 l6 -8 l6 14 l5 -12 l4 8 h8" fill="none" stroke="${ec}" stroke-width="2"/>`;
  else if (oc === "e_enforcer") occhi = `<rect x="76" y="41" width="48" height="15" rx="4" fill="#101820" stroke="#3c6a50" stroke-width="2"/><rect x="80" y="45" width="40" height="3" fill="#5dff85"/>`;
  else if (oc === "e_mafia") occhi = `<path d="M82 45 h16 v7 h-16 z M102 45 h16 v7 h-16 z" fill="#ffb020" stroke="#0a141c" stroke-width="1.5"/>`;
  else if (oc === "e_sistema") occhi = `<rect x="80" y="37" width="40" height="22" rx="4" fill="#04101a" stroke="#b07bff" stroke-width="2"/><circle cx="100" cy="48" r="6" fill="none" stroke="#b07bff" stroke-width="2"/><circle cx="100" cy="48" r="2.5" fill="#b07bff"/>`;
  else occhi = `<rect x="82" y="41" width="36" height="15" rx="7" fill="${ec}" stroke="#0a141c" stroke-width="2"/><rect x="87" y="44" width="9" height="4" rx="2" fill="#fff" opacity=".7"/>`;

  // accessori
  const ac = r.acc;
  if (ac === "grem") acc = `<path d="M74 112 q26 10 52 0 v44 q-26 8 -52 -6 z" fill="#ffe28f" stroke="#b8860b" stroke-width="2"/>`;
  else if (ac === "attx") acc = `<rect x="62" y="152" width="76" height="14" rx="4" fill="#5a3a20"/><rect x="72" y="148" width="12" height="7" fill="#8a6a3a"/><rect x="94" y="148" width="12" height="7" fill="#8a6a3a"/><rect x="116" y="148" width="12" height="7" fill="#8a6a3a"/>`;
  else if (ac === "oro") acc = `<path d="M80 98 q20 26 40 0" fill="none" stroke="#ffd54a" stroke-width="4"/><circle cx="100" cy="122" r="7" fill="#ffd54a" stroke="#b8860b" stroke-width="1.5"/>`;
  else if (ac === "a_vesuvio") acc = `<circle cx="100" cy="136" r="18" fill="none" stroke="#ff5a1f" stroke-width="3"/><circle cx="100" cy="136" r="9" fill="#ff5a1f" opacity=".7"/>`;
  else if (ac === "a_enforcer") acc = `<rect x="46" y="94" width="30" height="16" rx="5" fill="#8fb2cc" stroke="#3c444e" stroke-width="2"/><rect x="124" y="94" width="30" height="16" rx="5" fill="#8fb2cc" stroke="#3c444e" stroke-width="2"/>`;
  else if (ac === "a_mafia") acc = `<rect x="118" y="150" width="30" height="24" rx="5" fill="#6b4a1a" stroke="#ffb020" stroke-width="2"/><text x="133" y="167" font-size="12" text-anchor="middle" fill="#ffd54a">₤</text>`;

  return `<svg viewBox="0 0 200 230" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="224" rx="58" ry="7" fill="#000" opacity=".45"/>
    ${fx}${ali}${gambe}${corpo}${acc}${braccia}${arma}${testa}${antenna}${cappello}${occhi}
  </svg>`;
}

// ============================================================ BOSS ORIGINALI DI VESUVIO.EXE (ritoccati)
function bossCapitano() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs>
      <linearGradient id="capG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a3d54"/><stop offset="100%" stop-color="#121a24"/></linearGradient>
      <linearGradient id="capGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ffd76a"/><stop offset="100%" stop-color="#ff9a3c"/></linearGradient>
    </defs>
    <!-- Exhaust pipes -->
    <rect x="36" y="24" width="12" height="40" rx="3" fill="#1e2630" stroke="#0e1318" stroke-width="2"/>
    <rect x="112" y="24" width="12" height="40" rx="3" fill="#1e2630" stroke="#0e1318" stroke-width="2"/>
    <!-- Torso -->
    <path d="M42 80 L118 80 L110 145 L50 145 Z" fill="url(#capG)" stroke="#0e1620" stroke-width="3"/>
    <!-- Epaulettes & Medals -->
    <rect x="34" y="80" width="22" height="12" rx="3" fill="url(#capGold)"/>
    <rect x="104" y="80" width="22" height="12" rx="3" fill="url(#capGold)"/>
    <circle cx="60" cy="104" r="5" fill="#ff4d64"/><circle cx="74" cy="104" r="5" fill="#ffd76a"/><circle cx="88" cy="104" r="5" fill="#4dd0ff"/>
    <!-- Head & Visor -->
    <rect x="56" y="38" width="48" height="42" rx="8" fill="#1a2536" stroke="#0e1620" stroke-width="3"/>
    <rect x="62" y="52" width="36" height="10" rx="4" fill="#ff3344"/>
    <!-- Peaked Cap -->
    <path d="M46 38 Q80 18 114 38 L114 44 Q80 34 46 44 Z" fill="#16202c"/>
    <rect x="58" y="38" width="44" height="4" fill="url(#capGold)"/>
    <circle cx="80" cy="30" r="5" fill="url(#capGold)"/>
  </svg>`;
}

function bossMisterK() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs>
      <radialGradient id="mkChrome" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="40%" stop-color="#d4f1f9"/><stop offset="85%" stop-color="#557f99"/><stop offset="100%" stop-color="#1f3747"/>
      </radialGradient>
    </defs>
    <!-- Shroud/Cloak -->
    <path d="M40 70 Q80 45 120 70 L135 150 L25 150 Z" fill="#0c1017" stroke="#1f2c3d" stroke-width="2"/>
    <path d="M55 70 Q80 55 105 70 L115 150 L45 150 Z" fill="#141a24"/>
    <!-- Chrome Mirror Sphere (No face) -->
    <circle cx="80" cy="65" r="32" fill="url(#mkChrome)" stroke="#ffffff" stroke-width="1.5"/>
    <!-- Glitch Waveform -->
    <path d="M62 65 h8 l4 -10 l6 20 l5 -16 l5 10 h8" fill="none" stroke="#7fe6ff" stroke-width="2" opacity="0.85"/>
  </svg>`;
}

function bossMadonnina() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs>
      <radialGradient id="madHalo" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#ffd76a"/><stop offset="100%" stop-color="#ff4824" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Stained glass halo -->
    <circle cx="80" cy="55" r="42" fill="url(#madHalo)" opacity="0.45"/>
    <circle cx="80" cy="55" r="38" fill="none" stroke="#ffd76a" stroke-width="2" stroke-dasharray="8,4"/>
    <!-- Veil & Body -->
    <path d="M48 40 C48 20 112 20 112 40 C118 70 130 110 134 150 L26 150 C30 110 42 70 48 40 Z" fill="#080c14" stroke="#ffd76a" stroke-width="1.5"/>
    <!-- Black Titanium Mask -->
    <ellipse cx="80" cy="62" rx="18" ry="24" fill="#141c28" stroke="#3a4f68" stroke-width="2"/>
    <!-- Weeping Lava Tears -->
    <circle cx="73" cy="58" r="3.5" fill="#ff4824"/><path d="M73 60 L72 74" stroke="#ff4824" stroke-width="2"/>
    <circle cx="87" cy="58" r="3.5" fill="#ff4824"/><path d="M87 60 L88 74" stroke="#ff4824" stroke-width="2"/>
  </svg>`;
}

function bossGemelli() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <!-- Torso -->
    <rect x="44" y="86" width="72" height="60" rx="8" fill="#1c2738" stroke="#0e1622" stroke-width="3"/>
    <rect x="76" y="92" width="8" height="50" fill="#ff9a3c"/>
    <!-- Left Head (Cyan CRT) -->
    <rect x="36" y="36" width="38" height="42" rx="6" fill="#121c28" stroke="#4dd0ff" stroke-width="2"/>
    <rect x="42" y="44" width="26" height="24" fill="#04121a" rx="3"/>
    <text x="55" y="60" font-family="monospace" font-size="12" fill="#4dd0ff" text-anchor="middle">01</text>
    <!-- Right Head (Red CRT) -->
    <rect x="86" y="36" width="38" height="42" rx="6" fill="#121c28" stroke="#ff4d64" stroke-width="2"/>
    <rect x="92" y="44" width="26" height="24" fill="#1a0408" rx="3"/>
    <text x="105" y="60" font-family="monospace" font-size="12" fill="#ff4d64" text-anchor="middle">10</text>
    <!-- Connecting sync beam -->
    <line x1="74" y1="56" x2="86" y2="56" stroke="#ffd76a" stroke-width="3" stroke-dasharray="3,2"/>
  </svg>`;
}

function bossVipera() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <!-- Copper & Emerald Serpentine Body -->
    <path d="M80 30 Q120 50 80 80 Q40 110 80 145" fill="none" stroke="#229974" stroke-width="24" stroke-linecap="round"/>
    <path d="M80 30 Q120 50 80 80 Q40 110 80 145" fill="none" stroke="#5ff5c5" stroke-width="6" stroke-dasharray="10,6" stroke-linecap="round"/>
    <!-- Hood/Head -->
    <path d="M60 30 Q80 10 100 30 L94 48 Q80 54 66 48 Z" fill="#17362a" stroke="#5ff5c5" stroke-width="2"/>
    <!-- Twin Emerald Slits -->
    <line x1="72" y1="32" x2="76" y2="30" stroke="#ffd76a" stroke-width="3"/>
    <line x1="88" y1="32" x2="84" y2="30" stroke="#ffd76a" stroke-width="3"/>
    <!-- Poison Blade -->
    <path d="M80 130 L80 156 L84 150 Z" fill="#5ff5c5"/>
  </svg>`;
}

function bossBomba() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs>
      <radialGradient id="bombGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#4a5568"/><stop offset="70%" stop-color="#1a202c"/><stop offset="100%" stop-color="#0d1117"/>
      </radialGradient>
    </defs>
    <!-- Fuse & Spark -->
    <path d="M80 40 Q95 20 115 22" fill="none" stroke="#ffd76a" stroke-width="4"/>
    <circle cx="118" cy="22" r="6" fill="#ff4824"/>
    <!-- Spherical Body -->
    <circle cx="80" cy="90" r="48" fill="url(#bombGrad)" stroke="#ff4824" stroke-width="3"/>
    <rect x="72" y="38" width="16" height="10" fill="#2d3748" rx="2"/>
    <!-- Detonator Core / Pressure Gauge -->
    <circle cx="80" cy="90" r="20" fill="#111" stroke="#ffd76a" stroke-width="2.5"/>
    <line x1="80" y1="90" x2="90" y2="82" stroke="#ff3344" stroke-width="2.5"/>
    <text x="80" y="125" font-family="monospace" font-size="9" fill="#ff4824" text-anchor="middle">BOOM.EXE</text>
  </svg>`;
}

function bossRuggine() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <!-- Heavy Rusted Plates -->
    <rect x="42" y="56" width="76" height="74" rx="8" fill="#7a4422" stroke="#42220f" stroke-width="3.5"/>
    <!-- Welded Patches & Rivets -->
    <rect x="50" y="66" width="30" height="24" fill="#a05a2c" stroke="#331707" stroke-width="2"/>
    <circle cx="54" cy="70" r="2" fill="#222"/><circle cx="76" cy="70" r="2" fill="#222"/>
    <circle cx="54" cy="86" r="2" fill="#222"/><circle cx="76" cy="86" r="2" fill="#222"/>
    <!-- Molten Furnace Chest -->
    <circle cx="80" cy="100" r="14" fill="#ff4824"/>
    <circle cx="80" cy="100" r="8" fill="#ffd76a"/>
    <!-- Crude Mechanical Head -->
    <rect x="62" y="24" width="36" height="32" rx="4" fill="#5c3217" stroke="#331707" stroke-width="2"/>
    <rect x="68" y="34" width="24" height="8" rx="2" fill="#ff9a3c"/>
  </svg>`;
}

function bossSMC() {
  return `<svg viewBox="0 0 160 160" width="100%" height="100%">
    <defs>
      <radialGradient id="smcGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#bdf2ff"/><stop offset="70%" stop-color="#4aa8d8"/><stop offset="100%" stop-color="#0a2a44"/>
      </radialGradient>
    </defs>
    <!-- Outer Quantum Shockwaves -->
    <circle cx="80" cy="80" r="64" fill="none" stroke="#7fe6ff" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.6"/>
    <circle cx="80" cy="80" r="54" fill="none" stroke="#ffd76a" stroke-width="2" opacity="0.75"/>
    <!-- Manifested Pure Chrome Orb -->
    <circle cx="80" cy="80" r="38" fill="url(#smcGrad)" stroke="#ffffff" stroke-width="2"/>
    <!-- Glitch Symbol 0x00 -->
    <text x="80" y="86" font-family="monospace" font-size="13" font-weight="900" fill="#041a2c" text-anchor="middle">SMC</text>
  </svg>`;
}

