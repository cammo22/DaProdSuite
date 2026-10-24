# Accessi e dati

DaProdGiochi è una sala privata con economia simulata. Nessuna valuta ha valore
reale. Il servizio ascolta su loopback e viene raggiunto dai telefoni attraverso
Tailscale Serve in HTTPS. Tailscale limita la rete; i token e gli inviti limitano
l'accesso all'app. Configura entrambe le autorizzazioni.

Gli inviti durano cinque minuti e funzionano una volta. Il primo telefono non
diventa amministratore. Il proprietario ha una chiave locale, fuori dal
repository. Non condividere link contenenti quella chiave. I token dei
dispositivi sono memorizzati come hash e possono essere revocati dal PC.

I giochi simulano sul client. Gli incassi richiedono approvazione; un controllo
di plausibilità non sarebbe una prova dell'esecuzione della partita. I
salvataggi sincronizzati non sono una misura antimanomissione.

La chiave di firma Android ereditata dalla Suite è pubblica. Serve a mantenere
la compatibilità dell'upgrade, ma non dimostra che l'APK sia stato creato solo
dal proprietario del progetto. Scarica le release dal repository ufficiale.
Il downloader verifica origine, dimensione, digest disponibile, versione,
package ID e firma prima di proporre l'installazione. Non cambia impostazioni
di sicurezza del telefono: l'utente autorizza l'installazione.

I backup contengono identità, accessi come hash e archivi di gioco: custodiscili
insieme alla chiave locale del proprietario. Segnala problemi al proprietario
senza allegare token, database o dati personali a issue pubbliche.
