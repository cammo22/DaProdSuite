# Come si lavora su DaProdSuite

Le regole di questa repo. Servono a non doverle ridecidere ogni volta.

---

## 1. La repo

**Solo `main`.** Niente branch di prova, niente `dev`, niente `feature/...`. Se il
codice non è pronto, resta sul PC e basta.

**`git clone` deve bastare.** Chi clona ottiene tutto il nostro codice e può
compilare. Quindi: nessun submodule, nessun checkout parziale, nessun file
indispensabile che vive solo sul tuo computer.

**Cosa NON sta nella repo**, e perché va bene:

| Cosa | Dove sta | Perché non è nella repo |
|---|---|---|
| Modelli (~35 GB) | `%LOCALAPPDATA%\DaProdSuite\models` | GitHub ha un limite di 2 GB per file |
| Ambiente Python + torch | `%LOCALAPPDATA%\DaProdSuite\runtime` | ~4 GB, si ricrea in locale |
| ComfyUI e altri motori di terzi | scaricati al primo avvio | codice di altri, con la sua licenza |
| Risultati e log | `%LOCALAPPDATA%\DaProdSuite\output` e `\logs` | sono tuoi, non del progetto |

Tutto questo lo scarica la suite al primo avvio, leggendo
[`manifest/models.json`](../manifest/models.json). Chi clona non deve cercarsi
niente a mano.

---

## 2. Quando si pubblica

**Pubblicare su GitHub è un aggiornamento serio, non un salvataggio.**

Il ciclo è questo, e non si salta nessun passaggio:

```
1.  si lavora sul PC              →  la copia locale può stare avanti quanto vuole
2.  provi la versione a lungo     →  finché non ti convince, resta qui
3.  dai l'ok                      →  solo tu
4.  commit su main + tag          →  git tag v0.0.2 && git push --tags
5.  la CI compila e pubblica      →  Release con installer + latest.yml
6.  chi ha la suite installata    →  vede l'aggiornamento e lo applica
```

Il passaggio 3 è l'unico che conta: **senza il tuo ok non si commetta e non si
pubblica niente.**

### Versioni

Si parte da **0.0.1**. Il numero sale **solo** quando si pubblica: le versioni
provate sul PC e mai pubblicate non consumano un numero.

- `0.0.x` — si aggiusta o si aggiunge qualcosa di piccolo
- `0.x.0` — entra un'app nuova nella suite, o cambia come funziona qualcosa
- `x.0.0` — la suite diventa un'altra cosa

Il tag `v0.0.2` deve avere lo stesso numero di `package.json`. La CI parte dal tag.

---

## 3. Si lavora su un'app per volta

Ogni app della suite sta in due posti e basta:

```
apps/<id>/        l'interfaccia
services/<id>/    il motore Python, se ne ha uno
```

Chi non ha un motore (il Visualizer) ha solo `apps/`. Chi condivide un motore con
un'altra app (Musica e Foto usano lo stesso ComfyUI) punta allo stesso
`services/comfy`.

Il patto fra shell e motore è sempre lo stesso, per tutti:

| Il motore deve | Perché |
|---|---|
| ascoltare su `127.0.0.1` alla porta dichiarata nel catalogo | lo shell lo cerca lì |
| rispondere `200` su `GET /health` quando è pronto | lo shell aspetta questo prima di mostrare la finestra |
| spegnersi su `POST /shutdown` | altrimenti resta a occupare la VRAM |

Rispettato questo, il motore può essere fatto come gli pare: lo shell non guarda
dentro. È lo stesso patto che
[`process-supervisor.ts`](../apps/shell/src/main/process-supervisor.ts) già
applica, e per questo funziona uguale per sei app diverse.

### Perché una per volta

Le app pesanti si contendono la stessa GPU da 8 GB. Lavorare su due motori
insieme significa spegnere e riaccendere di continuo, e non capire più quale dei
due ha rotto cosa. Una alla volta, fino a che funziona.

---

## 4. Aggiungere un'app nuova

Sei passi, in quest'ordine. Nessuno è saltabile.

1. **Dichiarala nel catalogo** — una voce in
   [`packages/ipc/src/apps.ts`](../packages/ipc/src/apps.ts): id, nome, una riga
   di descrizione, colore d'accento, porta del servizio, se è pesante per la GPU.
   È l'unico posto in cui si dice che la suite contiene quest'app.

2. **Dichiara i suoi modelli** in [`manifest/models.json`](../manifest/models.json),
   con URL veri e dimensioni in byte verificate. Se un modello serve anche a
   un'altra app, **non duplicarlo**: metti lo stesso id in tutte e due. Si scarica
   una volta sola.

3. **`apps/<id>/`** — l'interfaccia.

4. **`services/<id>/`** — il motore, se serve, con `/health` e `/shutdown`.

5. **Aggiungi l'id a `MIGRATED`** in
   [`app-manager.ts`](../apps/shell/src/main/app-manager.ts). Finché non è lì, la
   scheda compare nell'hub ma dice che l'app non è ancora inclusa — che è meglio
   di un bottone che non fa niente.

6. **Aggiungi il colore all'icona** rilanciando
   `pnpm --filter @daprod/shell icon`.

---

## 5. Il design resta lo stesso

Le sei app devono sembrare figlie della stessa mano, altrimenti tanto valeva
lasciarle cartelle separate.

**Da dove si prende l'aspetto:** `packages/ui`. Colori, tipografia, spaziature e
componenti stanno lì. Un'app che si scrive i suoi colori a mano è un'app che fra
sei mesi non somiglia più alle altre.

**Cosa può essere diverso:** il colore d'accento. Uno per app, dichiarato nel
catalogo, usato con misura — un alone sulla scheda, i bottoni principali. Serve a
riconoscere dove sei, non a ridipingere l'interfaccia.

**Cosa non cambia mai:**

- il fondo scuro (`#0d0f14`) e la scala di grigi dei testi
- la lingua dell'interfaccia è **l'italiano**, senza termini tecnici inglesi dove
  esiste la parola italiana ("Scaricamento", non "Download")
- i messaggi d'errore dicono cosa è successo e cosa fare, non un codice
- niente scorrimento orizzontale, mai

---

## 6. Comandi

```bash
pnpm install
```

```bash
pnpm run dev
```

```bash
pnpm run typecheck
```

```bash
pnpm run dist
```

`dist` produce `installer/DaProdSuite-Setup-<versione>.exe`. Serve per provare
l'installazione sul PC — pubblicarlo è un'altra cosa, e la decide il paragrafo 2.
