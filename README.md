# DaProdGiochi

La sala giochi privata di Cammo e delle persone che invita. Un hub Windows in
Rust, telefoni Android collegati con QR e Tailscale, un'economia completamente
simulata. DaProdGiochi sostituisce DaProdSuite: foto, musica, video, assistenti,
modelli AI e relativi servizi sono stati rimossi dal programma.

## Cosa c'è

- Coin Dozer, Claw Machine e Neon Partenope, giocabili da PC e telefono.
- Macchinetta con estrazione sul server, bonus giornaliero e classifica.
- Lire simulate, monete premio DP e tre token simulati scambiabili (DPC, NEON,
  CLAW). Quotazioni ogni ora e commissione dell'1%.
- Portafoglio, banca senza interessi, trasferimenti e registro dei movimenti.
- Inviti QR monouso, telefoni revocabili e accesso del proprietario dal PC.
- Salvataggi dei giochi separati per giocatore e sincronizzati col PC.
- Aggiornamenti Android verificati e installati sopra l'app esistente.

I giochi arcade esistenti calcolano la partita sul dispositivo. Per questo
**gli incassi attendono l'approvazione del proprietario**: non vengono trattati
come risultati già verificati dal server. La macchinetta esegue invece
l'estrazione direttamente sul PC e accredita subito le vincite.

## Avvio Windows

Installa l'installer Windows della release. Per lavorare sui sorgenti servono
Rust, gli strumenti C++ di Visual Studio, WebView2 e Node 22 o superiore.

```powershell
npm ci
cargo test --workspace --locked
cargo build --features desktop
```

Poi apri `AVVIA DaProdGiochi.bat`. In sviluppo puoi anche eseguire
`cargo run --features desktop`. Il browser incorporato usa le stesse pagine
del telefono. Node serve solo allo sviluppo e al confezionamento: **non viene
usato dal server distribuito**, che è Rust.

Per l'installer: `npx tauri build --features desktop` dentro `apps/desktop`.
Per il solo server: `cargo run -- --headless`.

## Collega i telefoni

1. Installa e collega il client ufficiale Tailscale su PC e telefoni. Ammetti
   solo le persone desiderate e limita l'accesso al servizio della sala nelle
   regole Tailscale.
2. Configura il proxy HTTPS privato sul PC:

   ```powershell
   tailscale serve --bg --https=443 http://127.0.0.1:8790
   ```

   Tailscale può chiedere di abilitare i certificati HTTPS nella tua rete.
   Verifica prima che la porta 443 non serva già un'altra applicazione.
3. Avvia o riavvia DaProdGiochi. In Gestisci la sala, crea un invito QR.
4. Installa l'APK Android e inquadra il QR dall'app. Puoi creare un nuovo
   giocatore o collegare un altro telefono a un conto già esistente.

Il QR della sala autorizza il giocatore; non sostituisce il collegamento del
telefono a Tailscale. Il PC deve rimanere acceso, con l'hub aperto. Il server
ascolta normalmente solo su `127.0.0.1:8790`, dietro Tailscale Serve. L'app
Android rifiuta HTTP e non ignora errori dei certificati. Non viene attivato
Funnel, né aperto un tunnel pubblico.

## Passaggio dalla Suite 1.7.10

Leggi [la migrazione](docs/MIGRAZIONE.md) prima di sostituire l'installazione.
Il nome visibile Android cambia, ma l'ID resta `it.daprod.suite` e la firma
rimane compatibile: non disinstallare la vecchia app per aggiornarla.

## Dati e verifiche

SQLite, chiave del proprietario e backup stanno nella cartella dati locale
DaProdGiochi dell'utente Windows, fuori dalla cartella d'installazione.
Gestisci la sala → Crea backup produce una copia consistente del database.
Per un ripristino, chiudi l'hub e conserva anche l'archivio danneggiato prima
di sostituire `sala.sqlite3`. Non usare due hub sulla stessa cartella dati.

```powershell
cargo fmt --all -- --check
cargo test --workspace --locked
cargo clippy --workspace --all-targets --features desktop -- -D warnings
cargo build
node tests/browser.mjs
```

La CI compila Windows e Android e produce gli installer come artifact.
La prova browser usa dati temporanei e comprende mercato, banca, QR, ospite,
avvio dei tre giochi, ricariche e macchinetta. Le prove sul dispositivo reale
(Tailscale, fotocamera QR e aggiornamento APK) restano necessarie prima di
considerare validata una nuova distribuzione.
