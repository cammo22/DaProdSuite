# services

I motori Python della suite. Uno per cartella, avviati e sorvegliati dallo shell.

Vuota per ora: i motori arrivano con la migrazione delle app (versione 0.1.0 in
poi, vedi [../docs/ROADMAP.md](../docs/ROADMAP.md)).

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
| `comfy/` | DaProdMusica, DaProdFoto, DaProdCinema | ComfyUI, scaricato al primo avvio |
| `dream/` | DaProdDream | `DaProdDream/engine` |
| `talk/` | DaProd IoDigitale | `AvatarParlante/LeapTalk`, solo l'inference |
| `brain/` | DaProdCompanion | `DaProdCompanion/services/brain` |

ComfyUI **non** viene copiato qui: è GPL-3.0 e la suite è MIT, quindi si scarica
al primo avvio in `%LOCALAPPDATA%\DaProdSuite\engines` insieme agli altri motori
di terze parti. Qui ci va solo il codice nostro che gli parla.
