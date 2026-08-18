# Wiki pubblica — pronta, in attesa di un passo

Queste sono le pagine della **wiki di GitHub** (non questo repository: la wiki
è un repository git a parte, `DaProdSuite.wiki.git`, che GitHub crea solo
quando qualcuno salva la prima pagina dal sito). Finché quella prima pagina
non esiste, non si può clonare né pubblicare con `git push` — serve
un'azione da un account autenticato come proprietario del repo.

## Il passo che manca

1. Apri <https://github.com/cammo22/DaProdSuite/wiki>
2. Premi **"Create the first page"**
3. Salva anche vuota — il contenuto arriva subito dopo

## Poi si pubblica così

```bash
git clone https://github.com/cammo22/DaProdSuite.wiki.git
cp wiki-pronta/*.md DaProdSuite.wiki/
cd DaProdSuite.wiki
git add -A && git commit -m "Wiki pubblica: Home, Installazione, Le app, FAQ"
git push
```

Poi questa cartella (`wiki-pronta/`) si può togliere dal repository
principale: il suo lavoro è finito.

## Cosa c'è dentro

| File | Cosa diventa |
|---|---|
| `Home.md` | La pagina iniziale della wiki |
| `Installazione.md` | Come si scarica, il primo avvio, i requisiti |
| `Le-app.md` | Le sette schede, una per una, con lo stato vero |
| `Domande-frequenti.md` | Privacy, VRAM, licenza, dove segnalare un problema |
| `_Sidebar.md` | La barra laterale — GitHub la riconosce da questo nome |
| `_Footer.md` | Il piè di pagina di ogni pagina — stesso meccanismo |
