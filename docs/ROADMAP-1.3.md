# Roadmap 1.3 — «le immagini come si deve, e la sala giochi che si guarda»

> La 1.2.3 è stata «tutto senza errori, tutto testabile», e ci è voluta una
> settimana e venticinque issue. La 1.3 è un'altra cosa: **poche cose grosse**,
> e quasi tutte guardano dalla stessa parte — quello che si vede.

Il lavoro vive negli **issue di GitHub**, sotto il traguardo
[1.3](https://github.com/cammo22/DaProdSuite/milestone/2). Questo file dice
**in che ordine**, **perché in quest'ordine**, e **quando si è pronti**.

`gh issue list --milestone 1.3` è il posto dove guardare a che punto siamo.
Questa pagina non tiene il conto: lo tiene GitHub.

---

## Come si pubblica, in questa release

⚠ **A blocchi finiti, non tutto insieme e non a ogni correzione.**

La regola della 1.2.3 era «niente release finché non è tutto risolto». È durata
un giorno: il 9 e il 10 settembre sono uscite quattro release una dietro
l'altra, e ha funzionato meglio — Cammo ha potuto provare la sala giochi la sera
stessa invece che a fine settimana, e metà delle cose scritte qui sotto sono
nate da quella serata.

Quindi: **quando un blocco sta in piedi da solo, si pubblica.** Non prima —
mezza funzione pubblicata è tempo perso per tutti e due — e non si aspetta la
fine.

Il numero sale di `0.0.1` a ogni release, e dopo la `.9` viene il numero di
mezzo. Non si sceglie: si conta.

### ⚠ Quale release chiude questo traguardo

Il traguardo si chiama **1.3**, e non è un nome a caso: è **il numero che uscirà
quando l'ultimo issue è chiuso**. Chiesto il 10 settembre 2026, quando la
domanda è arrivata così: «non sto capendo, vedo lavori-1.3 ma la versione
rilasciata è la 1.2.8?».

Contando, ci sta poco spazio in mezzo:

| Release | Cosa c'è andato |
|---|---|
| ~~1.2.8~~ | la sala giochi che si guarda |
| ~~1.3.0~~ | i soldi su una scala sola, e le anteprime che si aprono |
| ~~1.3.1~~ | chi resta fuori casa si vede prima, e rientra con un messaggio |
| ~~1.3.2~~ | fuori due modelli, e i premi della slot tornano piccoli |
| ~~1.3.3~~ | la macchinetta delle figurine, e i gradi arrivano in cima |
| ~~1.3.4~~ | tre file alla macchinetta, l'inventario, e i pacchetti che si strappano |
| ~~1.3.5~~ | la macchinetta a due tiri, una faccia per ogni figurina, e le figurine della casa |

⚠ **La 1.3.0 è uscita prima che il traguardo chiudesse**, perché l'ha chiesta
lui il 10 settembre 2026: «aggiusta tutto e facciamo la 1.3.0». Quindi il nome
del traguardo è **speso**: quello che resta uscirà come 1.3.1, 1.3.2 e così via,
e questa scatola non promette più un numero.

Resta la regola, per la prossima: **il traguardo si chiama come la release che
lo chiude**, e se il lavoro non ci sta si ribattezza il traguardo — non si
inventa un numero.

---

## I quattro blocchi, in ordine

### Blocco 1 — la sala giochi, quello che è saltato fuori provandola

Sono cinque cose viste giocando la sera del 10 settembre, e stanno insieme
perché toccano tutte la stessa pagina.

| | Cosa | Perché adesso |
|---|---|---|
| [#98](https://github.com/cammo22/DaProdSuite/issues/98) | mandata una combinazione, la slot riparte | è il gesto più frequente del gioco, e finisce male |
| [#99](https://github.com/cammo22/DaProdSuite/issues/99) | le generate si vedono sulla card, fino a quattro | è quello che rende «prendere» una decisione invece di un'ipotesi |
| [#100](https://github.com/cammo22/DaProdSuite/issues/100) | per adesso le figurine vanno da Basic a Unique | i gradi alti non si possono spendere adesso: non c'è niente sotto |
| | ⚠ **e il 12 settembre 2026 è tornato indietro**: «gli item ricevuti possono arrivare fino al grado ethernal» | il magazzino ha cominciato a riempirsi, e quel «per adesso» era scritto per questo giorno (1.3.3) |
| [#101](https://github.com/cammo22/DaProdSuite/issues/101) | tenere premuto non deve selezionare il testo | sul telefono il gesto principale ne fa partire due |
| [#102](https://github.com/cammo22/DaProdSuite/issues/102) | il grado si deve vedere, e la schermata si stringe | in un gioco di rarità il grado è la cosa che si guarda |

**Si pubblica quando sono chiusi tutti e cinque**, e si prova col telefono in
mano: si manda una combinazione, si fa generare, si guarda una figurina.

### Blocco 2 — la modifica delle foto, che è rotta

[#92](https://github.com/cammo22/DaProdSuite/issues/92) — «modifica una foto»
stravolge tutto. Il modello è a posto, il grafo no: servono le ControlNet, il
denoise giusto, e un pennello che conti davvero.

Sta da solo, ed è l'unico **difetto** della release: tutto il resto sono
aggiunte. Va per primo fra le cose grosse.

⚠ Le ControlNet sono **pesi a parte**. Se non ci sono, si dice e si chiede — non
si sostituisce con una strada che sembra funzionare
([i modelli decisi non si sostituiscono](../CLAUDE.md)).

### Blocco 3 — gli stili, che è una ricerca prima di essere codice

[#73](https://github.com/cammo22/DaProdSuite/issues/73) regge tutto il blocco:
si buttano i 54 stili copiati e si riparte dagli stili **veri** di ogni
modello, e nella stessa ricerca esce il checkpoint SDXL per le locandine.

Sopra ci stanno, e solo dopo:

- [#74](https://github.com/cammo22/DaProdSuite/issues/74) — mescolare più stili e salvare il mix;
- [#76](https://github.com/cammo22/DaProdSuite/issues/76) — l'immagine dietro al pulsante di ogni modello. Ultima davvero: le immagini si generano con gli stili veri, farle prima vuol dire rifarle.

⚠ **C'è una domanda aperta per Cammo, e blocca l'inizio**: gli stili li vuole
*veri per modello* (diversi fra Anima e FLUX, perché sono addestrati diverso) o
*categorie uguali per tutti* (fotografia / anime / cinema)? Cambia come si
costruiscono, non come si mostrano.

### Blocco 4 — le due che stanno per conto loro

- [#80](https://github.com/cammo22/DaProdSuite/issues/80) — due suoni diversi: quando arriva una richiesta e quando un lavoro è pronto. Mezz'ora, si infila dove capita.
- [#103](https://github.com/cammo22/DaProdSuite/issues/103) — togliere il tunnel a chi ha l'indirizzo fisso, e buttare la schermata «cerca i computer». Veniva da una voce ferma nel changelog da quattro release.
- [#67](https://github.com/cammo22/DaProdSuite/issues/67) — il tira-per-aggiornare sul telefono e sul tablet veri. **Non è codice**: il codice c'è dalla 1.2.2. È un banco di prova, e lo fa Cammo.

---

## Cosa vuol dire «finito», per un issue

La stessa cosa di sempre: la riga **«come si prova»** è stata fatta. Non i test
verdi — quelli sono il minimo — la cosa vera, aperta, col gesto rifatto.

La 0.5.0 è uscita rotta con novanta prove verdi. Da allora si apre la suite e si
guarda.

---

## Le trappole che sono già costate tempo

Valgono per tutta la release, e sono scritte perché ci si è già cascati.

- **Il `dist` vecchio vince sul sorgente.** Se una prova passa quando dovrebbe
  fallire, il primo sospetto è quello. `pnpm run build` prima di guardare.
- **Una cosa sola, uguale ovunque.** Prima di aggiungere una funzione, si guarda
  se esiste già la sua gemella altrove. Il 7 settembre tre difetti diversi erano
  la stessa malattia.
- **Riprodurre batte dedurre.** Sui grafi si accende il motore, sul telefono si
  attacca `adb`. Al secondo giro sullo stesso sintomo serve un dato nuovo, non
  un'altra ipotesi.
- **Una istanza per volta.** Se la suite è aperta, si chiede di chiuderla.
