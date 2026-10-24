/**
 * NEON PARTENOPE — aggiornamenti
 * Sul web (GitHub Pages) rilegge index.html senza cache: se la costante VERSIONE pubblicata è più
 * nuova di quella in esecuzione propone di ricaricare. Nelle app (APK, EXE, DMG) chiede a GitHub
 * l'ultima release e, se ce n'è una più nuova, offre di scaricarla.
 */
"use strict";

const Aggiornamenti = (() => {
  const REPO = "cammo22/daprod-neon-partenope";
  const PAGINA = "https://cammo22.github.io/daprod-neon-partenope/";
  const LINK = {
    pagina: PAGINA,
    changelog: `https://github.com/${REPO}/blob/main/CHANGELOG.md`,
    release: `https://github.com/${REPO}/releases/latest`,
    repo: `https://github.com/${REPO}`
  };
  let ultimo = "", trovata = null, ultimoControllo = 0;

  // "v2.1.0" > "v2.0.9" ?
  function piuNuova(a, b) {
    const pa = String(a).replace(/^v/, "").split(".").map(Number), pb = String(b).replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
    return false;
  }

  async function controlla(aMano) {
    if (!aMano && Date.now() - ultimoControllo < 10 * 60 * 1000) return;
    ultimoControllo = Date.now();
    try {
      if (inApp()) {
        const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        const j = await r.json();
        if (j.tag_name && piuNuova(j.tag_name, VERSIONE)) trovata = { v: j.tag_name, url: j.html_url || LINK.release, app: true };
      } else if (location.protocol.startsWith("http")) {
        const r = await fetch("index.html?controllo=" + Date.now(), { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        const m = (await r.text()).match(/const VERSIONE = '(v\d+\.\d+\.\d+)'/);
        if (m && piuNuova(m[1], VERSIONE)) trovata = { v: m[1], app: false };
      }
      ultimo = trovata ? "" : "Hai l'ultima versione.";
    } catch (e) {
      ultimo = "Controllo non riuscito (sei offline?).";
    }
    mostra();
  }

  function mostra() {
    const b = $("aggiorna");
    if (!trovata) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = trovata.app
      ? `🆕 È uscita la <b>${trovata.v}</b> di Neon Partenope. <button class="btn oro" id="aggVai">📥 Scarica</button> <button class="chip" id="aggNo">più tardi</button>`
      : `🆕 È online la <b>${trovata.v}</b>! <button class="btn oro" id="aggVai">🔄 Aggiorna ora</button> <button class="chip" id="aggNo">più tardi</button>`;
    $("aggVai").onclick = () => {
      if (trovata.app) apriEsterno(trovata.url);
      else { salva(); location.replace(location.pathname + "?v=" + trovata.v.replace(/^v/, "")); }
    };
    $("aggNo").onclick = () => { b.hidden = true; };
  }

  function avvia() {
    setTimeout(() => controlla(false), 8000);
    setInterval(() => controlla(false), 15 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) controlla(false); });
  }

  return {
    avvia, controlla, piuNuova, link: k => LINK[k] || LINK.repo,
    stato: () => trovata ? `Disponibile la ${trovata.v}!` : (ultimo || (inApp() ? "App installata: controllo le release su GitHub." : "Versione web: si aggiorna da sola su GitHub Pages."))
  };
})();
