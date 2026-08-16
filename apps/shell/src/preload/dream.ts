import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProdDream.
 *
 * Solo quello comune: la libreria della suite, lo scambio con le altre app, la
 * chiusura. L'indirizzo del motore qui non serve — a differenza di Musica e
 * Foto, la pagina di Dream è **servita dal motore stesso**, quindi lo raggiunge
 * con indirizzi relativi e lo sa già dove sta.
 *
 * Serve invece perché una schermata catturata qui possa finire in DaProdFoto
 * per il ritocco senza passare da "salva, cerca, riapri".
 */
esponiApiApp("dream");
