# Roadmap 1.2.3 — «tutto senza errori, tutto testabile»

> «Voglio tutto senza errori, tutto testabile. Nessuna release finché non è
> tutto risolto. Voglio una 1.2.3 spaziale.»
> — Cammo, 7 settembre 2026

Da questa release in poi **ogni release ha la sua roadmap**, e questa è la
prima. Il lavoro vive negli **issue di GitHub**, sotto il traguardo
[1.2.3](https://github.com/cammo22/DaProdSuite/milestone/1): questo file dice
**come** si lavora, in che ordine, e quando si è pronti.

---

## La regola di questa release

**Non si pubblica niente finché non è finito tutto.** Non ci sono release
intermedie, non ci sono commit sparsi al giorno. Si accumula su un ramo, si
prova insieme, si pubblica una volta.

E il metro è: **tutto testabile.** Una cosa è finita quando c'è scritto come si
prova e quella prova è stata fatta — non quando compila.

---

## Il filo che tiene insieme tutto

> «Stiamo facendo un sacco di cose diverse quando invece ce ne dovrebbe stare
> una uguale — sull'applicazione ci sono cose che sul programma no.»

Non è una richiesta fra le altre: il 7 settembre 2026 ha spiegato **tre difetti
diversi su tre**, tutti guardando il codice:

- il tasto «Usa l'AI» era stato tolto **da una schermata sola** (delle tre);
- il modello predefinito è **diverso** fra telefono e computer;
- i prompt salvati stanno in **due magazzini** che si chiamano allo stesso modo.

Non sono tre difetti. È uno, che si presenta ogni volta che una schermata e la
sua gemella fanno la stessa cosa in due modi. Per questo il **blocco 1** viene
prima di tutto, anche se non si vede niente di nuovo: da lì in poi ogni cosa
nuova costa una riga invece di tre.

---

## I quattro blocchi, in ordine

L'ordine non è per importanza: è perché ognuno rende il successivo più corto.

### Blocco 1 — Un posto solo *(non si vede niente, e serve più di tutto)*

Issue [#62](https://github.com/cammo22/DaProdSuite/issues/62),
[#63](https://github.com/cammo22/DaProdSuite/issues/63),
[#64](https://github.com/cammo22/DaProdSuite/issues/64),
[#65](https://github.com/cammo22/DaProdSuite/issues/65).

Un magazzino solo per prompt e stili (e i due che ci sono si recuperano); un
modulo solo per crearli, che chiede **per cosa**; un predefinito solo (FLUX.2
Klein 9B); «com'è stata fatta» uguale in galleria e nel visualizer.

### Blocco 2 — L'app come se l'aspetta chi la scarica

Issue [#66](https://github.com/cammo22/DaProdSuite/issues/66)–[#72](https://github.com/cammo22/DaProdSuite/issues/72).

«Chi sei» solo al primo avvio col caricamento al posto suo; meno messaggini in
background; da una notifica si rimanda la richiesta; la Fila che per chi non
decide diventa **Notifiche**; il pannello dal proprio nome; i coriandoli
dell'aggiornamento. Più la prova sul telefono e sul tablet veri del
tira-per-aggiornare già fatto nella 1.2.2.

### Blocco 3 — Produzione immagini

Issue [#73](https://github.com/cammo22/DaProdSuite/issues/73)–[#77](https://github.com/cammo22/DaProdSuite/issues/77).

⚠ Comincia con **una ricerca sola** (#73) che porta a casa due cose: gli stili
veri di ogni modello, e il checkpoint SDXL per le locandine. Da lì: il mix di
stili, i quattro pulsanti, le immagini dietro ai modelli, «manda in coda».

### Blocco 4 — Prestazioni e piacere

Issue [#78](https://github.com/cammo22/DaProdSuite/issues/78)–[#84](https://github.com/cammo22/DaProdSuite/issues/84).

Visualizer fuori dallo sfondo e ottimizzato (il banco è **il tablet**); le
sirene nella barra in alto; due suoni diversi; l'easter egg che parla anche
quando si riaccende; il video che dietro resta fermo; il lettore.

---

## Come si dice a che punto siamo

Ogni tanto, un messaggio corto: **«siamo al 40%»**, e cosa manca. La percentuale
si conta sugli issue del traguardo chiusi — non a occhio.

    gh issue list --repo cammo22/DaProdSuite --milestone 1.2.3 --state all --json state

Un issue si chiude quando la sua riga «come si prova» è stata **fatta**, non
quando il codice compila.

---

## Cosa resta aperto, e lo decide Cammo

- **Gli stili**: li vuole *veri per modello* (diversi fra Anima e FLUX, perché
  sono addestrati diverso) o *categorie uguali per tutti*? Cambia come si
  costruiscono — vedi #73.
- **I due pulsanti in fondo alla produzione**: quale dei due si toglie? — #77.
- **Le immagini in coda nel lettore**: cosa dovrebbe fare una foto accodata? — #84.
- **LLaDA**: la 1.2.2 l'ha portato a 12 passi (4,2 minuti misurati). Deve dire
  se gli piace così o se si toglie.

## Cosa **non** entra in questa release

- **Le altre dieci app.** Deciso il 7 settembre 2026: «lascia stare le 10
  applicazioni». Prima la suite che c'è, fatta bene.
- **Il redesign di tutta la parte AI.** Il tasto «Usa l'AI» è stato tolto nella
  1.2.2 e le rotte del gateway sono rimaste: si rifà con calma, non di corsa.

---

## Vedi anche

- Gli issue: [traguardo 1.2.3](https://github.com/cammo22/DaProdSuite/milestone/1)
- [CHANGELOG.md](../CHANGELOG.md) — cosa è cambiato fin qui
- [docs/ROADMAP.md](ROADMAP.md) — il percorso lungo di tutta la suite
- Nella wiki: `DaProd-Operazioni/Metodo-DaProd.md` (come si lavora) e
  `DaProd-Software/Progetti/DaProd-Suite-Da-Fare.md` (le parole di Cammo,
  intere, da cui sono nati gli issue)
