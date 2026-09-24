# Passare a Tauri: si fa, ma non in questa release

> Chiesto il 24 settembre 2026, insieme al remake: «se possibile facciamo il
> passaggio a Tauri».

**In breve:** nella 1.4.0 la suite resta Electron. Il passaggio si può fare e
conviene, ma è un lavoro da release sua, a blocchi, e il primo blocco è già
fatto senza toccare Electron: **le pagine non sanno più in che guscio stanno**.
Qui c'è perché, cosa costa e in che ordine si fa.

## Cosa ci guadagna Cammo

| | Electron (oggi) | Tauri 2 |
|---|---|---|
| Installer | ~110 MB (Chromium dentro) | ~10–15 MB (usa WebView2 di Windows) |
| RAM a riposo, hub aperto | ~250–350 MB | ~60–100 MB |
| Aggiornamento | electron-updater, NSIS | plugin `updater`, NSIS/MSI, firma obbligatoria |
| Lato «server» | Node, lo stesso del gateway | Rust; Node solo come processo a parte |

Il guadagno vero è la RAM: su un PC con 8 GB di VRAM e 16 di RAM, i 250 MB che
Chromium si tiene per l'hub sono quelli che mancano a ComfyUI quando scarica un
modello dalla scheda video alla memoria.

## Perché non adesso

Lo shell non è un guscio sottile: è il **cervello** della suite. In
`apps/shell/src/main` ci sono 22 file che importano `electron`, 57 canali IPC in
`ipc.ts`, dieci preload (uno per scheda), il vassoio, lo schema `file://` della
libreria, l'updater. E soprattutto: **il gateway, la sala giochi, la libreria, le
azioni, l'arbitro della VRAM, i supervisori dei motori Python** girano tutti nel
processo principale di Electron, in Node.

Tauri il processo principale lo scrive in Rust. Riscrivere in Rust tutto quello
che oggi è TypeScript non ha senso — sono mesi, e si butterebbero le prove che
tengono in piedi la suite. La strada giusta è un'altra, ed è quella che ha già
preso DaProdVideo:

## Il piano: Node resta, cambia solo la finestra

1. **Il cervello esce da Electron.** Tutto quello che oggi sta in
   `apps/shell/src/main` e non disegna finestre diventa un processo Node a sé,
   `daprod-cuore`: gateway, giochi, libreria, motori, scaricamenti, arbitro.
   Parla con le finestre **per la stessa strada del telefono** — HTTP e SSE sul
   gateway — che esiste già ed è provata ogni giorno. È la regola di sempre, una
   cosa sola uguale ovunque: oggi le schede parlano allo shell per IPC e il
   telefono per HTTP, e sono due strade per le stesse domande.
2. **Le preload diventano un modulo solo**, `window.daprod`, che invece di
   `ipcRenderer.invoke` fa `fetch` al cuore. Le pagine non cambiano una riga:
   vedono lo stesso oggetto. *(È il primo blocco: nella 1.4.0 le schede usano
   già `/comune/*.js` serviti dal gateway, e il banco dell'hub
   — `apps/shell/scripts/banco-hub.mjs` — gira in un Chromium qualunque con un
   `window.daprod` finto. Vuol dire che le pagine sono già staccate dal guscio.)*
3. **Il guscio Tauri** è piccolo: apre le finestre, il vassoio, i menu, e lancia
   `daprod-cuore` come *sidecar* (Node impacchettato con `@yao-pkg/pkg` o Node
   portatile accanto all'EXE). Il plugin `updater` prende il posto di
   electron-updater; `tauri-plugin-single-instance` quello di
   `requestSingleInstanceLock`.
4. **Le cose che oggi fa Chromium** e che WebView2 fa diverso vanno provate una
   per una: la cattura dello schermo di Dream (`getDisplayMedia`), il
   microfono di Voce e Companion, WebGL del Visualizer, le finestre trasparenti
   del Companion. Su Windows WebView2 è Chromium, quindi il rischio è basso; su
   Mac (WKWebView) no, ma la suite oggi è solo Windows.
5. **Si pubblica in parallelo** per una release: l'EXE Electron e quello Tauri
   escono insieme, Cammo usa il secondo per una settimana, e l'Electron si
   spegne quando non manca niente.

## Cosa non si tocca

- I motori Python, ComfyUI, `services/`: non sanno chi li lancia.
- Il gateway e la console web: sono già fuori dal guscio.
- Il telefono: parla col gateway, e il gateway resta dov'è (dentro il cuore).

## Quanto costa

A occhio, **due release**: la prima sposta il cervello fuori da Electron (punti
1–2, e si pubblica ancora in Electron — deve andare identico), la seconda mette
il guscio Tauri (punti 3–5). Il primo pezzo è quello con più rischio e più
guadagno anche senza Tauri: una strada sola fra finestre e computer.
