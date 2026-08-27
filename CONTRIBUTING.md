# Dare una mano

Grazie. Ci sono tre modi, e il primo vale quanto gli altri due.

## 1. Usarla e dire cosa non va

È così che sono nate quasi tutte le correzioni di questa suite: qualcuno l'ha
aperta, ha provato a fare una cosa, e non ci è riuscito.

- [**Qualcosa non funziona**](https://github.com/cammo22/DaProdSuite/issues/new?template=difetto.yml)
  — un tasto che non fa niente, un errore, una cosa che si comporta male.
- [**Un'idea, o una cosa che manca**](https://github.com/cammo22/DaProdSuite/issues/new?template=idea.yml)
  — anche «questa parola non si capisce». Quella è una delle segnalazioni
  migliori che si possano fare: una parola che non si capisce vale come una
  funzione che non c'è.

Prima di scrivere, il tasto **log** in basso a destra in ogni app (o `Ctrl+L`)
mostra le ultime righe del motore. Quasi sempre la risposta è lì, e incollarne
un pezzo fa risparmiare un giro di domande.

## 2. Provare un modello

La suite non addestra niente: sceglie. Se conosci un modello che fa meglio di
uno di quelli che usiamo — sugli **8 GB di VRAM**, che è il vincolo che decide
quasi ogni scelta qui dentro — dillo, con il link e con cosa ci hai fatto.

Il ragionamento su quali modelli e perché sta in
[docs/MODELLI-E-STRATEGIA.md](docs/MODELLI-E-STRATEGIA.md).

## 3. Scrivere codice

```bash
git clone https://github.com/cammo22/DaProdSuite.git
```

```bash
cd DaProdSuite && pnpm install && pnpm run dev
```

Serve [Node.js 22+](https://nodejs.org) e [pnpm](https://pnpm.io). Su Windows
basta anche il doppio clic su `AVVIA DaProd Suite.bat`.

Prima di aprire una PR:

```bash
pnpm run build
```

```bash
pnpm run typecheck
```

```bash
pnpm run prova
```

Se tocchi l'app Android, `./gradlew assembleRelease` dentro `apps/mobile`.

### Le tre regole che contano più delle altre

**Si scrive cosa una cosa fa, non come si chiama dentro.** Le parole che
l'utente legge sono in italiano e dicono il gesto: «Collegamento», non «Da
fuori»; «Stato della connessione», non «Come siamo messi». I nomi tecnici
restano nel codice.

**Quello che non è stato provato si dice.** Nel changelog e nel testo della PR
c'è una sezione per questo, e non si lascia vuota. Una riga scritta e mai fatta
girare non è un difetto: dirla «fatta» sì.

**Il commento spiega il perché, non il cosa.** In questo progetto i commenti
sono lunghi apposta: raccontano quale difetto ha fatto nascere quella riga, così
nessuno la toglie fra sei mesi credendo che sia di troppo. Guarda un file
qualunque in `apps/shell/src/main/` per capire il tono.

Il resto — versioni, come si aggiunge un'app, il patto fra shell e motore —
sta in [docs/COME-SI-LAVORA.md](docs/COME-SI-LAVORA.md).

## Come è messa insieme

| | |
|---|---|
| [README.md](README.md) | Cos'è, come si installa, cosa fa |
| [CHANGELOG.md](CHANGELOG.md) | Cosa è cambiato, dall'ultima volta in giù |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Dove si sta andando, e **cosa è provato davvero** |
| [docs/COME-SI-LAVORA.md](docs/COME-SI-LAVORA.md) | Le regole della repo |
| [docs/ACCESSO-REMOTO.md](docs/ACCESSO-REMOTO.md) | Gateway, QR, tunnel, app Android |
| [docs/MODELLI-E-STRATEGIA.md](docs/MODELLI-E-STRATEGIA.md) | Quali modelli, quanto pesano, perché quelli |
| [SECURITY.md](SECURITY.md) | Cosa esce dal computer, e come segnalare un buco |

## Licenza

Contribuendo accetti che il tuo codice esca sotto [MIT](LICENSE), come il resto
della suite.
