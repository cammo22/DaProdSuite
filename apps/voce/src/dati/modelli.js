/**
 * I due modelli fra cui si sceglie.
 *
 * Gli stessi che conosce il motore (`services/voce/app/motore.py`): qui ci sono
 * perché il menu si disegna anche a motore spento — scegliere il modello e far
 * partire uno scaricamento sono le prime due cose che si fanno aprendo la
 * scheda, e non devono aspettare che Python sia in piedi.
 *
 * `catalogo` sono gli id di `manifest/models.json`, che è l'unico posto in cui
 * sta scritto cosa scarica la suite.
 */

export const MODELLI = {
  "0.1b": {
    id: "0.1b",
    nome: "Audio8 TTS 0.1B",
    riga: "1,58 GB. Il piccolo: è quello installato con l'app, e parte subito.",
    catalogo: ["audio8-tts-01b"],
    /**
     * Cosa aspettarsi in italiano.
     *
     * Non è modestia: nella tabella del modello l'errore in italiano è 14,5
     * contro il 4,8 del fratello grande. In inglese e in cinese invece si
     * somigliano.
     */
    nota: "In italiano ogni tanto storpia una parola: è il prezzo dei 170 milioni di parametri.",
  },
  "0.6b": {
    id: "0.6b",
    nome: "Audio8 TTS 0.6B",
    riga: "2,39 GB, da scaricare. Legge l'italiano molto meglio: nella tabella del modello sbaglia tre volte meno.",
    catalogo: ["audio8-tts-06b"],
    nota: "È quello da usare per l'italiano. Occupa un giga in più di scheda video, e non va più piano.",
  },
};

export const PREDEFINITO = "0.1b";

export const modello = (id) => MODELLI[id] ?? MODELLI[PREDEFINITO];
