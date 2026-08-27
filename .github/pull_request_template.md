<!--
  Il testo di una PR, qui, ha un mestiere solo: far capire cosa cambia a chi
  preme Merge senza leggere il codice. Due sezioni, e la seconda conta quanto
  la prima.
-->

## Cosa cambia

<!--
  Per chi usa la suite, non per chi legge il codice. Cosa poteva fare prima e
  cosa può fare adesso; oppure cosa non funzionava e adesso funziona.
-->

## Cosa è provato, e cosa no

<!--
  ⚠ Questa sezione non si lascia vuota, ed è il patto del progetto: quello che
  è stato scritto e mai fatto girare va detto qui, non scoperto usando la suite.

  Esempio:
  - la riga delle persone: provata in un browser vero a 1280 e a 375 px
  - la foto del profilo: l'APK compila, il tocco vero sul telefono no
-->

- [ ] `pnpm run build`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run prova`
- [ ] Se tocca l'app Android: `./gradlew assembleRelease` in `apps/mobile`
- [ ] `CHANGELOG.md` aggiornato

## Come si prova a mano

<!-- I gesti da rifare per vedere che funziona. Uno per riga. -->
