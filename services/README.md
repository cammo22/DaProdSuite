# services

I motori Python della suite. Uno per cartella, avviati e sorvegliati dallo shell.

Il più grosso è `comfy/`, che serve DaProdMusica, DaProdFoto e DaProdCinema: un
motore solo per tre app. Gli altri sono di una scheda sola.

## Il patto che ogni motore deve rispettare

| Requisito | Perché |
|---|---|
| ascolta su `127.0.0.1`, alla porta dichiarata in `packages/ipc/src/apps.ts` | lo shell lo cerca lì, e niente è mai esposto verso l'esterno |
| risponde `200` su `GET /health` quando è pronto | lo shell aspetta questo prima di mostrare la finestra |
| si spegne su `POST /shutdown` | altrimenti resta ad occupare la VRAM dopo la chiusura |

Rispettato questo, il motore può essere scritto come gli pare: lo shell non
guarda dentro. È il motivo per cui lo stesso
[`process-supervisor.ts`](../apps/shell/src/main/process-supervisor.ts) può
gestire motori molto diversi fra loro.

## Cosa ci finirà

| Cartella | App servite | Da dove viene |
|---|---|---|
| `comfy/` ✅ | DaProdMusica, DaProdFoto, DaProdCinema | ComfyUI, scaricato al primo avvio |
| `dream/` ✅ | DaProdDream | `DaProdDream/engine` |
| `voce/` ✅ | DaProdVoce | scritto qui: transformers e il modello Audio8 TTS |
| `iodigitale/` ✅ | DaProdIoDigitale | `AvatarParlante/LeapTalk`, solo l'inference |
| `companion/` ✅ | DaProdCompanion | `DaProdCompanion/services/brain` |

ComfyUI **non** viene copiato qui: è GPL-3.0 e la suite è MIT, quindi si scarica
al primo avvio in `%LOCALAPPDATA%\DaProdSuite\engines` insieme agli altri motori
di terze parti. Qui ci va solo il codice nostro che gli parla.

## Librerie in una versione diversa da quella comune

Un motore può dichiarare, oltre a `requisiti.txt`, un
**`requisiti-privati.txt`**. Quelle librerie **non entrano nell'ambiente
condiviso**: la suite le installa con `uv pip install --target` in
`%LOCALAPPDATA%\DaProdSuite\runtime\.daprod-privato\<servizio>`, e a metterle
nel proprio `sys.path` è soltanto il processo di quel motore.

Ne esiste uno, oggi: **DaProdVoce**. Il modello Audio8 TTS si porta dentro il
proprio codice, scritto per `transformers` 4.57, mentre l'ambiente della suite ha
la 5.15 — la versione con cui girano gli altri sei motori. Sul 5 quel modello non
dà errore: **non smette più di parlare**, il che è peggio.

È una porta stretta, e va tenuta stretta: sono 127 MB di roba doppia e un
percorso di ricerca in più da avere in testa quando si legge un traceback. Prima
di usarla per un motore nuovo vale la pena provare davvero se la versione comune
non basta — e se non basta, scrivere nel file **cosa** succede senza, come fa
`services/voce/requisiti-privati.txt`.
