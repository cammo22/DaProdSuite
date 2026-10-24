# Cambiamenti

## 2.0.0 — DaProdGiochi

- La suite diventa una sala giochi privata: rimossi i moduli creativi e i
  relativi runtime AI, gateway generale, Electron e dipendenze Python.
- Nuovo hub Windows Tauri con server Rust e database SQLite.
- Nuova interfaccia condivisa fra PC e Android: sala, portafoglio, mercato,
  compagnia e gestione del proprietario.
- Conservati Coin Dozer, Claw Machine e Neon Partenope. Nuova macchinetta con
  estrazione sul server. Incassi arcade approvati dal proprietario.
- Nuovi token simulati, commissioni, banca, bonus e registro dei movimenti.
- Inviti QR monouso e revoca dei dispositivi, con Tailscale Serve in HTTPS.
- Salvataggi dei giochi per giocatore sul PC, con controllo di revisione.
- Importazione transazionale dei vecchi conti, telefoni e archivio giochi.
- Android mantiene package ID, firma compatibile e profili; aggiornamenti
  verificati e installati con conferma esplicita.
- Pipeline di verifica e creazione installer per Windows e Android.

La cronologia precedente rimane nella storia Git di DaProdSuite.
