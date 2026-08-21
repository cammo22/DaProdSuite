# Le azioni, l'MCP, e il posto di Needle 2

Questo documento racconta come si comanda la suite **da fuori**: da un telefono,
dal browser di un altro computer, o da un programma. È il seguito naturale di
[ACCESSO-REMOTO.md](ACCESSO-REMOTO.md), che progettava il gateway; qui c'è cosa
gli si può chiedere.

Scritto il **21 agosto 2026**, con la 0.5.0.

---

## Il problema che c'era

La roadmap, § «Un'AI che usa il programma da sola», lo diceva chiaramente:

> Quello che manca oggi non è il modello: è il fatto che le app non hanno **un
> modo di essere comandate da fuori**. Ogni finestra parla col proprio motore e
> con la libreria, e nessuno dei due espone un elenco di «cose che si possono
> chiedere». Il lavoro vero è quello.

Fino alla 0.4.6 «fai un'immagine» era una cosa che sapeva fare una finestra, non
la suite. Se volevi chiederla da un telefono dovevi riscrivere quella finestra
sul telefono; da un agente, inventarti un protocollo; da uno script, aprire la
finestra e fingere di essere un dito.

## Come è fatta adesso

Un elenco solo, `packages/azioni`, e tre clienti che ne fanno cose diverse:

```
                       packages/azioni
                    (l'elenco + i controlli)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        console web      app Android      server MCP
       (il portatile)   (il telefono)   (Claude Code, agenti)
              │               │               │
              └───────────────┼───────────────┘
                              │
                     gateway (packages/gateway)
                              │
                        lo shell, che esegue
                              │
                    app · libreria · scheda video
```

**Un'azione si dichiara una volta.** Aggiungerne una a
`packages/azioni/src/catalogo.ts` la fa comparire da sola nella console web, nel
telefono e fra gli strumenti MCP: nessuno dei tre ha un elenco suo.

### Cosa c'è nell'elenco, oggi

| Azione | Cosa fa | Va in fila |
|---|---|---|
| `genera.immagine` | un'immagine da una descrizione (Foto) | sì |
| `genera.video` | una clip (Cinema) | sì |
| `genera.brano` | una canzone (Musica) | sì |
| `genera.voce` | un testo letto ad alta voce (Voce) | sì |
| `libreria.ultimi` | gli ultimi risultati di tutte le app | no |
| `suite.stato` | cosa è acceso, quanta fila c'è | no |
| `coda.elenco` | le richieste arrivate da fuori | no |
| `coda.decidi` | accetta, manda in lavorazione, scarta (solo padrone) | no |
| `app.apri` | apre una finestra sul PC (solo padrone) | no |

### La regola che divide la tabella in due

**Un'azione che occupa la scheda video non parte mai da sola.** Diventa una
richiesta in fila, e chi sta al computer dice sì o no.

Non è timidezza: su otto GB di VRAM ci sta un modello per volta, e una clip video
è un quarto d'ora in cui il PC non fa altro. Un telefono in tasca che può far
partire quattro generazioni «per provare» è un computer che non è più di chi ci
sta davanti. Le azioni che leggono, invece, rispondono subito: non costano niente
e non tolgono niente a nessuno.

Il controllo dei campi è lo stesso per tutti e tre i clienti
(`packages/azioni/src/verifica.ts`). Un campo che non esiste viene rifiutato
invece di essere ignorato: se un modello se lo inventa, è meglio dirglielo che
eseguire mezza richiesta.

---

## La console web: il portatile

Il gateway serve una pagina sua su `http://<ip-del-pc>:8790/`. Ci si arriva dal
browser di qualunque altro computer della casa, si batte il codice di otto cifre
del pannello **Da fuori**, e da lì si comanda il PC fisso.

Nasce da una domanda pratica: un portatile la suite non la può far girare — i
modelli vogliono la scheda video del fisso — ma non gli serve. Gli serve
comandare quel PC, e per farlo basta un browser. Niente da installare da
nessuna parte, e niente di nuovo da mantenere: la pagina chiede `/azioni` e si
disegna i moduli da sola.

La pagina non chiama niente da fuori: nessun CDN, nessun font remoto, nessuna
immagine. Una pagina che chiama fuori è una pagina che non funziona sulla wifi
di casa quando la linea è giù, cioè nel momento in cui serve di più.

---

## Il server MCP

`packages/mcp` è un server MCP su stdio: lo lancia un client (Claude Code, un
agente locale), lui chiede le azioni al gateway e le espone come strumenti.

**Un agente è un dispositivo come gli altri**: si accoppia col codice di otto
cifre, riceve un token, e passa dal gateway come il telefono. Non c'è una porta
di servizio per i programmi — se ci fosse, sarebbe quella che qualcuno
lascerebbe aperta. Revocarlo dal pannello **Da fuori** lo chiude fuori come
chiunque altro.

### Come si accende

Sul PC, nel pannello **Da fuori**: **Accendi**, poi **Invita un padrone**.
Compare un codice. Poi, una volta sola:

```bash
node packages/mcp/dist/cli.js --accoppia 192.168.1.20:8790 12345678 "Claude Code"
```

E in `.mcp.json`:

```json
{
  "mcpServers": {
    "daprod": {
      "command": "node",
      "args": ["C:/Users/…/DaProdSuite/packages/mcp/dist/cli.js"]
    }
  }
}
```

Gli strumenti si chiamano come le azioni, col punto diventato trattino basso:
`genera_immagine`, `libreria_ultimi`, `suite_stato`.

### Perché scritto a mano

Sono duecento righe (`packages/mcp/src/protocollo.ts`) contro una dipendenza in
più dentro l'installer, e coprono la parte del protocollo che non cambia:
`initialize`, `tools/list`, `tools/call`, `ping`. La versione del protocollo si
**rimanda indietro come l'ha chiesta il client**: un server che implementa solo
il nucleo va bene con tutte, e inseguire il numero dell'ultima specifica sarebbe
un modo di rompersi da soli il giorno che ne esce un'altra.

Due cose che si rompono in silenzio, e per cui esiste
`apps/shell/scripts/prova-mcp.mjs`:

- su **stdout** non deve finire niente che non sia protocollo — una riga di log
  di troppo e il client si stacca senza dire perché (tutto il resto va su stderr);
- un attrezzo che fallisce non è un errore di protocollo: si risponde bene, con
  `isError`, così l'agente legge il perché e riprova.

---

## Il posto di Needle 2

[Cactus-Compute/needle2](https://huggingface.co/Cactus-Compute/needle2) —
chiesto da Cammo il 21 agosto 2026. Un modello da **45 milioni di parametri**,
**14 MB** di file e circa **28 MB** di RAM, Apache 2.0, che non serve a
conversare: sa **scegliere lo strumento giusto in un elenco e riempirne i
campi**, con l'uscita costretta a JSON valido. Finestra di 256 posizioni con gli
strumenti agganciati come KV sink; centinaia di token al secondo in CPU.

**Il lavoro che serviva a Needle 2 è quello di questa versione, ed è fatto.**
Il modello vuole due cose: un elenco di strumenti e uno schema JSON per ciascuno.
`packages/azioni` produce esattamente quello — `schemaDi()` e `strumento()` — ed
è già quello che mangia il server MCP. Quello che manca adesso è solo il
traduttore in mezzo:

```
   una frase                        Needle 2                    il gateway
"fammi un'immagine   ──▶   sceglie genera.immagine   ──▶   POST /azioni/genera.immagine
 di un faro"               e riempie { prompt: … }          (e va in fila, come tutte)
```

### Cosa si sa adesso che non si sapeva

La roadmap segnalava un dubbio: «la libreria si chiama `cactus-needle`: un'altra
dipendenza nell'ambiente condiviso, che ormai sappiamo non essere gratis».

**Quel dubbio è più piccolo di come sembrava.** Il repo pubblica anche
`needle.js` + `needle.wasm`, cioè una build per Node e per il browser: girerebbe
**dentro lo shell Electron**, senza toccare l'ambiente Python condiviso e senza
aggiungere un pacchetto ai 4 GB che serviranno comunque a torch. Il posto
naturale è accanto al gateway, non dentro `services/`.

### Cosa resta da verificare, prima di prometterlo

Le stesse due cose di prima, e non sono state provate:

1. **È addestrato in inglese e sugli strumenti standard.** Le nostre azioni hanno
   nomi italiani (`genera.immagine`, campo `descrizione`) e descrizioni in
   italiano. Gli id e i nomi dei campi sono corti e regolari apposta, ma quanto
   ci prenda bene si sa solo provandolo.
2. **Quanto è buono su un catalogo di nove voci** con campi opzionali e valori
   predefiniti, che è un caso diverso dai benchmark su cui viene misurato.

Finché non è provato resta fuori dal catalogo dei modelli
(`manifest/models.json`) e fuori dall'installer: **nessuno scarica 14 MB per una
funzione che non c'è**. La regola della suite vale anche per i modelli piccoli.

### Quando ha senso farlo

Quando ci sarà un posto dove scrivere la frase. Oggi i tre clienti hanno tutti un
modulo con dei campi, e riempire un modulo a mano è più veloce che descriverlo a
parole. Needle 2 diventa interessante il giorno che c'è una **casella di testo
sola** — nell'app del telefono, o nella console — dove scrivi cosa vuoi e basta.
Il cervello per le cose difficili resta LM Studio, quando serve.

---

## Le prove

Due script, che girano senza Electron e senza scheda video:

```bash
node apps/shell/scripts/prova-gateway.mjs
node apps/shell/scripts/prova-mcp.mjs
```

Esistono perché l'accesso remoto è l'unico pezzo della suite che si può
sbagliare **in silenzio**: un controllo che non scatta non rompe niente, apre.
Il resto della suite quando sbaglia si vede.
