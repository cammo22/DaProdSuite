# Installazione

## Scaricare

Vai alla pagina delle
[Release](https://github.com/cammo22/DaProdSuite/releases/latest) e scarica
`DaProdSuite-Setup-<versione>.exe`. È l'unico file che serve.

Aprilo: un clic, nessuna domanda, nessun permesso di amministratore. In un
minuto la suite è installata e si apre da sola.

## Il primo avvio

La prima volta la suite ti chiede **quali app vuoi**, e per ognuna dice
**quanti gigabyte servono** prima di scaricare qualunque cosa. Scegli solo
quello che ti interessa: puoi sempre aggiungere un'altra scheda più avanti,
dall'hub.

Da lì in poi fa tutto da sola: installa un ambiente Python condiviso (circa
4 GB, una volta sola per tutte le app), i motori che le servono, e i pesi dei
modelli. Se la connessione cade a metà, riprende da dove si era fermata — non
riparte da zero.

## Non serve avere Python

La suite non tocca quello che hai già installato: si porta il proprio Python
in una cartella sua, sotto `%LOCALAPPDATA%\DaProdSuite`, senza mai mischiarsi
con altri programmi che usi.

## Quanto spazio serve

| App | Al primo avvio |
|---|---|
| DaProdVisualizer | — |
| DaProdDream | 2,6 GB |
| DaProdFoto | 5,6 GB |
| DaProdMusica | 8,0 GB |
| DaProd IoDigitale | 10,4 GB |

Più ~4 GB di ambiente Python, una volta sola per tutte. Ogni scheda ha anche
dei modelli **extra**, opzionali, per una qualità più alta in cambio di più
spazio: non si scaricano mai finché non li chiedi tu.

## Aggiornare

La suite controlla da sola se c'è una versione nuova e te lo dice in alto
nell'hub. Aggiornare sostituisce solo il programma: i tuoi modelli, i tuoi
brani, le tue immagini non vengono mai toccati.

## Disinstallare

Dall'hub, il pannello **Spazio** mostra quanto occupa ogni scheda e lascia
disinstallarne una alla volta, riprendendoti i gigabyte. I modelli condivisi
con un'altra scheda che tieni restano. Vedi anche le
[Domande frequenti](Domande-frequenti).

## Requisiti

| | Minimo | Consigliato |
|---|---|---|
| Sistema | Windows 10 64 bit | Windows 11 |
| GPU | NVIDIA con 8 GB di VRAM | 8 GB o più |
| RAM | 16 GB | 32 GB |
| Disco | 15 GB (una o due app) | 40 GB (tutte) |

La macchina su cui tutto viene misurato è una RTX 4060 da 8 GB: è il vincolo
che decide quasi ogni scelta della suite, ed è il motivo per cui gira bene
anche senza una scheda video da migliaia di euro.
