import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProd IoDigitale.
 *
 * Solo quello comune: la libreria della suite, lo scambio con le altre app, il
 * modello che scrive, i log per il terminale. L'indirizzo del motore qui non
 * serve — come per DaProdDream, la pagina è **servita dal motore stesso** e lo
 * raggiunge con indirizzi relativi.
 *
 * Serve invece perché un video dell'avatar finisca in libreria e si veda dal
 * pannello Risultati insieme a tutto il resto, e perché il selettore del
 * modello che scrive sia lo stesso delle altre schede: qui LM Studio non è un
 * accessorio, è quello che dà le parole all'avatar.
 */
esponiApiApp("iodigitale");
