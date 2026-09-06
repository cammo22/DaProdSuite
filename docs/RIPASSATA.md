# La ripassata — il prompt per una sessione nuova

Chiesto il 6 settembre 2026: «datti da solo un prompt per una nuova chat e vatti
a fare una ripassata di tutto il nostro progetto, andando a concentrarti sulle
cose dimenticate o trascurate, e aggiusta tutto».

Questo file **è** quel prompt. Sta qui e non in una chat perché una chat si
chiude: così si rilancia quando serve, e chi lo rilancia trova anche cosa era
già stato guardato.

---

## Il prompt

> Sei in `C:\Users\dapca\Desktop\DaProdSuite`, un monorepo pnpm: una suite
> desktop Electron (`apps/shell`) con nove schede, un gateway HTTP che serve una
> console web (`packages/gateway`), e un'app Android che è una WebView su quella
> console (`apps/mobile`).
>
> **Il compito**: una ripassata del progetto concentrata sulle **cose dimenticate
> o trascurate** — non sulle funzioni nuove. Trova quello che è stato scritto e
> mai finito, quello che è stato corretto a metà, e quello che nessuno ha più
> guardato da quando è stato messo lì. Aggiusta quello che si può aggiustare e
> **verificare**; per il resto scrivi cosa hai trovato e perché non l'hai
> toccato.
>
> **Da dove cominciare, in quest'ordine:**
>
> 1. `docs/ROADMAP.md`, le sezioni «Cosa **non** è a posto, e va detto»: ce ne
>    sono cinque, una per scheda, e sono l'elenco onesto di quello che è
>    rimasto indietro.
> 2. `docs/RIPRENDERE-DA-QUI.md`, in cima: le lezioni delle ultime versioni,
>    scritte per non ripetere gli errori. Leggile prima di toccare qualcosa.
> 3. Il `CHANGELOG.md`, le sezioni «⚠ Cosa resta da fare» delle ultime dieci
>    versioni: sono promesse fatte per iscritto.
>
> **Le regole del progetto** stanno in `docs/COME-SI-LAVORA.md`. Le tre che si
> sbagliano più spesso:
>
> - i file di `packages/gateway/src/console/` **sono template literal**: un
>   backtick lì dentro chiude il template a metà. Prima di ogni commit,
>   `node packages/gateway/scripts/niente-backtick.mjs` (con `--scrivi`
>   corregge). **Non correggerli a mano.**
> - un ramo e una PR per release, e **il merge lo fai tu**: non fermarti prima.
> - i commit vanno a nome di `cammo22`.
>
> **Come si prova**, e va provato:
>
> - `pnpm run build` poi `pnpm run typecheck`
> - `pnpm run prova` — cicli, avvio, azioni, gateway, MCP (una decina di secondi)
> - `pnpm run prova-telefono` — le prove Kotlin su JVM, senza Android
> - `node apps/shell/scripts/banco-console.mjs` con `BANCO_PORTA` e `BANCO_DATI`:
>   accende un gateway vero con dati finti e stampa due indirizzi. **La console è
>   l'interfaccia dell'app Android**, quindi guardarla in un browser a 375 px è
>   il modo di provare l'app senza il telefono.
> - `apps/mobile/gradlew.bat assembleDebug` per l'APK.
>
> **Cosa vale la pena guardare**, dalle cose che so essere trascurate:
>
> - **I cinque fogli di stile copiati**: `apps/cinema|foto|musica|voce|companion/stile.css`,
>   91 KB in tutto, con `packages/ui/src/tema.css` che dovrebbe essere il posto
>   unico. Deduplicarli cambia l'aspetto di cinque schede: si fa solo aprendole
>   una per una e guardandole.
> - **Le parole di tutta la suite**: chiesto il 22 agosto 2026 («tante cose sono
>   poco intuibili»), fatto solo per il telefono e il collegamento. Restano le
>   altre otto schede, l'hub, e **i messaggi d'errore** — che sono la parte che
>   si legge nel momento peggiore.
> - **Il Companion che non molla il modello** quando resta acceso da solo.
> - **La copertina che vive nei temporanei** finché non la si applica a un brano.
> - **«Mostra nella cartella» in DaProdFoto**: segnato come guasto e mai
>   riprodotto.
> - **Needle 2**: il giro attorno c'è (`apps/shell/src/main/needle.ts`, la rotta
>   `/capisci`), il binario da 14 MB non è mai stato scaricato.
> - **Le cose mai passate per una scheda video**: i video da 30/60/120 secondi
>   (`apps/cinema/src/lungo.js`) e le copertine con il titolo scritto sopra.
>
> **Il metodo**, che è la parte che conta:
>
> - Non fidarti di quello che c'è scritto nei commenti: la 0.9.5 è stata la
>   terza correzione dello stesso difetto perché un commento spiegava **bene** un
>   ragionamento con una premessa falsa.
> - Quando qualcosa non torna, **va' a prendere un dato nuovo**: i log in
>   `%LOCALAPPDATA%\DaProdSuite\logs\`, i `.json` accanto ai file in `output\`,
>   `remoto\remoto.json`. Il dato di solito è già lì e non l'ha letto nessuno.
> - Una prova che non diventa **rossa** quando rimetti il guasto non è una
>   prova. Verificale al contrario.
>
> **Alla fine**: pubblica come una release normale (ramo, PR, merge, tag,
> aspetta che la CI produca installer e APK) e scrivi un rapporto di quello che
> hai trovato — cosa hai corretto, cosa hai lasciato stare e perché.

---

## Cosa è già stato guardato, e quando

| Quando | Cosa | Esito |
|---|---|---|
| 6 set 2026, 0.9.7 | «Com'è stata fatta» leggeva i campi sbagliati | corretto, con dieci prove su dati veri |
| 6 set 2026, 0.9.7 | I cinque fogli di stile copiati | **guardati e non toccati**: troppo rischioso senza aprire le schede |
| 6 set 2026, 0.9.5 | L'account che saltava a ogni aggiornamento | corretto alla terza, con sette prove |
