# Roadmap 2.0: il Big Update della sala

Scritta il 27 settembre 2026, subito dopo la **1.7.0**. La 1.7.0 è la versione da
usare a lungo: una settimana o un mese con più giocatori, per vedere come si
comporta la sala prima di costruirci sopra. Questa pagina dice cosa si fa
**dopo**, e in che ordine.

> «Deve essere un gioco sulla ludopatia, ma senza le parti dannose: qui è tutto
> per giocare per finta.» — Cammo

## La regola che vale per tutto

**Niente soldi veri, mai.** Le lire e gli euro della sala sono finti, la moneta
DaProd è finta, i pezzi da collezione sono finti. Non si comprano con soldi veri,
non si cambiano in soldi veri, non escono dall'app. Il gioco racconta la fortuna,
la voglia di rigiocare e la banca che vince quasi sempre. Serve a farle vedere,
non a farle pagare.

Da qui vengono tre divieti che nessuna voce di questa roadmap può aggirare:

1. **Nessun acquisto con soldi veri**, né di lire né di monete DaProd né di pacchi.
2. **Nessun ritiro**: niente esce dalla sala verso il mondo vero.
3. **Niente trucchi per trattenere**: niente conti alla rovescia che mettono ansia,
   niente «ultima occasione». Pause e limiti di tempo, quando arriveranno, li
   decide chi gioca.

---

## Fase A: DaProdProduzioni diventa l'app principale (30 settembre 2026)

Aggiunta dopo la 1.7.6, prima di tutto il resto. **Fatta nella 1.7.7**, tranne dove
è scritto «da provare». Chiesta così: «togliere
DaProdMusica e rendere DaProdProduzioni l'app principale per la creazione di
contenuti; in DaProdProduzioni gira WanGP. Voglio poter usare la full UI di WanGP
da telefono, solo admin; gli utenti scelgono solo alcuni modelli, tra cui Qwen 2.1
per le immagini e ACE-Step XL per la musica. Un admin deve poter aprire l'app
completa di WanGP e comandarla da remoto.»

| Pezzo | Cosa vuol dire | Come si prova |
|---|---|---|
| **A1. Musica esce dalla suite** ✅ | Via dall'hub, da «apri un'app» e dalle richieste da telefono. La musica si fa con ACE-Step XL da WanGP. Il codice di Musica resta finché la nuova strada non regge (come è successo a Foto, Cinema e Voce). | L'hub mostra Produzioni per prima e non mostra Musica; dal telefono nessuna richiesta finisce più in ComfyUI. |
| **A2. La full UI di WanGP dal telefono, solo admin** ✅ | Il gateway porta l'interfaccia intera di WanGP (Gradio e Deepy) a chi ha il permesso di decidere, dallo stesso indirizzo della console. **Un ospite non vede nemmeno il pulsante** (le rotte gli rispondono 404 come se non ci fossero). | Da un telefono admin si apre WanGP, si preme Genera, e il lavoro parte sul PC. Da un telefono ospite: 403. |
| **A3. Gli utenti scelgono fra pochi modelli** ✅ (Qwen da provare: vedi il CHANGELOG) | Le richieste degli ospiti (immagine, musica) passano da WanGP con modelli fissi: **Qwen-Image 2.1** e **ACE-Step XL**. L'elenco lo decide l'admin. Ogni richiesta aspetta il sì, come oggi. | Un ospite chiede un'immagine e un brano: nel form non c'è altro modello, e a lavoro finito il file è in galleria. |
| **A4. Il PC comanda WanGP** ✅ | Da admin: accendi WanGP e spegnilo (dalla pagina di WanGP, o dalle rotte `/wangp/accendi` e `/wangp/spegni`), e la suite lo spegne da sola quando nessuno lo usa. | Dal telefono admin si accende un WanGP spento. |

Vincoli che vengono dalla licenza e dal codice di WanGP (letti in `C:\Wan2GP`):

- WanGP resta un programma a parte (WanGP Community License 2.0): la suite non lo
  incorpora, lo raggiunge su `127.0.0.1`.
- WanGP è pensato per stare **alla radice di un indirizzo** (`--public-url`, controllo
  dell'origine sulle richieste che scrivono): non ha un prefisso di percorso. Il
  proxy del gateway deve tenerne conto.
- Il modello scelto da un ospite viene imposto dalla suite, non chiesto a un agente.
  **Niente Deepy** (chiesto il 30 settembre): la suite accende WanGP da sé, e i lavori
  degli utenti passano da un plugin nostro (`services/wangp/daprod_ponte`) nella
  stessa coda dell'interfaccia intera — un WanGP solo, una scheda video sola.

Il numero di release lo decide il conteggio: la Fase A esce a pezzi (1.7.7, 1.7.8…)
e la moneta DaProd (fase 1) parte dopo.

---

## Fase 0: il test lungo della 1.7.0 (adesso)

Cosa guardare in una settimana o un mese di gioco vero:

| Cosa | Dove si guarda | Il segnale che qualcosa non va |
|---|---|---|
| La Banca incassa o regala | Banca → riquadro verde o rosso in cima | resta rossa per giorni: le regole sono troppo generose |
| Chi gioca torna | Admin → giocatori, movimenti per giorno | uno sparisce dopo il primo giorno |
| I giochi pagano giusto | Banca → «dai giochi, da sempre» | un gioco solo fa perdere o vincere tutto |
| Le richieste di immagini | Fila del computer | richieste di utenti ferme per ore senza un sì |
| Qwen è veloce | log del motore: «memoria dinamica» | una modifica sopra i 3-4 minuti su 8 GB |

Quello che esce da qui decide i numeri della fase 1: quanto rende una partita,
quanto vale una moneta DaProd, ogni quanto esce un pezzo raro.

---

## Fase 1: la moneta DaProd 🪙 — fatta nella 1.7.8

Il gettone grande, tipo crypto, che si guadagna solo giocando.

- **Cos'è.** Una seconda moneta, rara, accanto alle lire. Le lire restano quelle
  che si mettono e si perdono. Le monete DaProd sono il trofeo.
- **Come si guadagna.** Con le vincite vere dei giochi: la Claw che finisce la
  collezione, il Vesuvio di Neon che erutta, il jackpot del Dozer, i livelli. Il
  giocatore continua a mettere lire e a vincere o perdere a fortuna; in più, le
  vincite grosse danno monete DaProd. «Siccome con i soldi non si capisce, le
  vincite le diamo in monete DaProd molto esclusive.»
- **Il gettone.** Una moneta 3D grande, lucida, che gira: col suo grafico,
  come una crypto (24 ore, 7 giorni, un mese), e il numero di monete in giro.
- **Per l'admin.** La Banca conia e brucia monete, vede quante ce ne sono, chi le
  ha e da dove sono arrivate. Ogni gesto resta nel registro.
- **Da decidere nel test.** Quante ne escono a settimana e quanto vale il cambio
  lire → moneta, se c'è (probabilmente no: si guadagnano e basta).

## Fase 2: la Zecca, i pezzi da collezione 🎴

I contenuti che la suite crea (immagini Qwen, brani, modellini 3D) diventano
**pezzi unici numerati**, tipo NFT ma finti e dentro l'app.

- Un pezzo ha numero di serie, rarità, chi l'ha creato e chi l'ha avuto prima.
- I **pacchetti** escono coi pezzi dentro: si aprono con le monete DaProd.
- Il riscrittore e la coda dell'admin servono qui: le immagini dei pacchetti le
  fa l'admin, gli utenti le chiedono e aspettano il sì.
- Collezioni a tema, e un premio quando ne completi una.

## Fase 3: il mercato 🏪

Uno pseudo mercato dentro l'app, solo con monete DaProd.

- Metti in vendita un pezzo a un prezzo, un altro lo compra.
- Storico dei prezzi per ogni pezzo e il pezzo più scambiato della settimana.
- La Banca prende una piccola fetta di ogni scambio: è la sua entrata in monete.
- Tutto visibile all'admin, e annullabile dalla Banca come i movimenti di oggi.

## Fase 4: le cose esclusive

Con le monete DaProd si sbloccano:

- aspetti dei giochi (pinze della Claw, monete del Dozer, robot di Neon);
- stanze e macchine speciali, per un tempo;
- i pezzi più rari della Zecca;
- un posto nella bacheca della sala.

---

## Cose tecniche rimandate a dopo il test

- **LanPaint** per le zone dipinte di Qwen: il nodo di ComfyUI non dichiara ancora
  Qwen-Image 2.1 (WanGP ha il suo). Oggi c'è il Masked Denoising, che è quello di
  serie di WanGP.
- **Posa e profondità con i preprocessori veri** (DWPose, Depth Anything): oggi la
  guida la legge Qwen3-VL da solo; i contorni passano già da Canny.
- **Memoria dinamica anche per la musica**: si riprova quando ComfyUI sistema il
  depth decoder di MiniMax (vedi `VELOCITA-MUSICA.md`).

## L'ordine, e perché

Prima il test (fase 0), perché i numeri della moneta dipendono da come gioca
davvero la gente. Poi la moneta (1), perché zecca e mercato si pagano con lei.
Poi la Zecca (2), perché senza pezzi il mercato (3) è vuoto. Le cose esclusive (4)
vengono per ultime: sono il premio, e si decidono guardando cosa piace.
