/**
 * NEON PARTENOPE — utilità: numeri, tempo, DOM, casualità
 */
"use strict";

const $ = id => document.getElementById(id);
const LIRE_PER_EURO = 1936.27;
const SUFFISSI = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", "Vg"];

// 1234 → "1.234" · 1.5e6 → "1,50M" · notazione scientifica a scelta
function fmt(n, dec) {
  if (n === null || n === undefined || !isFinite(n) || isNaN(n)) return "0";
  if (n < 0) return "-" + fmt(-n, dec);
  if (n < 1000) {
    if (n > 0 && n < 10 && n % 1 !== 0) return n.toFixed(dec === undefined ? 1 : dec).replace(".", ",");
    return Math.floor(n).toLocaleString("it-IT");
  }
  if (typeof S !== "undefined" && S.opz && S.opz.notazione === "scientifica" && n >= 1e6) {
    return n.toExponential(2).replace("e+", "e").replace(".", ",");
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier > SUFFISSI.length) return n.toExponential(2).replace("e+", "e").replace(".", ",");
  const v = n / Math.pow(10, tier * 3);
  const d = v < 10 ? 2 : (v < 100 ? 1 : 0);
  return v.toFixed(d).replace(".", ",") + SUFFISSI[tier - 1];
}
/**
 * ⚠ 2.2.0: «Neon Partenope continua a non fare lo switch lire/euro
 * nell'interfaccia». La sala sceglie la valuta (daprod-lira.js), e da qui
 * tutti i numeri delle lire la seguono: la testata, i prezzi, la Borsa. Una
 * lira del gioco e' una lira della sala, quindi basta il cambio fisso.
 */
function inEuro() { try { return !!(window.DaProdLira && DaProdLira.valuta && DaProdLira.valuta() === "euro"); } catch (e) { return false; } }
function simLire() { return inEuro() ? "€" : "₤"; }
function numLire(n) {
  if (!inEuro()) return fmt(n);
  const e = n / LIRE_PER_EURO;
  return Math.abs(e) < 1000 ? e.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : fmt(e);
}
function fmtLire(n) { return simLire() + " " + numLire(n); }
function fmtEuro(lire) {
  const e = lire / LIRE_PER_EURO;
  if (e < 1000) return e.toLocaleString("it-IT", { maximumFractionDigits: 2 }) + " €";
  return fmt(e) + " €";
}
function fmtTempo(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return h + "h " + (m ? m + "m" : "");
  if (m) return m + "m " + (s ? s + "s" : "");
  return s + "s";
}
function fmtMolt(x) {
  if (x >= 1000) return "×" + fmt(x);
  return "×" + (Math.round(x * 100) / 100).toString().replace(".", ",");
}
function perc(x) { return Math.round(x * 100) + "%"; }

function caso(a, b) { return a + Math.random() * (b - a); }
function casoInt(a, b) { return Math.floor(caso(a, b + 1)); }
function scegli(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function mescola(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function limita(x, a, b) { return Math.max(a, Math.min(b, x)); }

// Escape per inserire testo nell'HTML generato
function esc(t) {
  return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Schiarisce/scurisce un colore esadecimale
function tono(hex, f) {
  if (!hex || hex[0] !== "#") hex = "#3fa8d8";
  const n = parseInt(hex.slice(1), 16);
  const c = x => Math.min(255, Math.max(0, Math.round(x * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// Siamo dentro l'app (Android WebView o Electron) invece che nel browser?
function inApp() {
  return location.protocol === "app:" || location.hostname === "appassets.androidplatform.net";
}
// Apre un indirizzo esterno: nelle app passa al browser di sistema
function apriEsterno(url) {
  if (inApp()) location.href = url;
  else window.open(url, "_blank", "noopener");
}
