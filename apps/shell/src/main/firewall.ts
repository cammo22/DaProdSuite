/**
 * Il firewall di Windows davanti alla porta del gateway.
 *
 * **Il guasto che questo file esiste per curare.** La suite accende il gateway,
 * il pannello dice «in ascolto su 192.168.1.8:8790», il QR si inquadra, e dal
 * telefono non succede niente: «non raggiungibile». Sul PC va tutto bene, nei
 * log non c'è niente, e non c'è nessun modo di accorgersi che il problema non è
 * la suite — è Windows, che al primo ascolto ha mostrato un riquadro
 * «Consentire l'accesso?» e ha ricevuto un «Annulla», oppure non l'ha mostrato
 * affatto perché l'utente non era davanti allo schermo.
 *
 * Da lì in poi il blocco è **silenzioso e permanente**: nessun errore, nessuna
 * connessione. È il tipo di difetto peggiore che ci sia, perché sembra colpa
 * del programma che si sta usando.
 *
 * **Cosa si fa, e cosa non si fa.**
 *
 * - Non si apre niente da soli. Aggiungere una regola al firewall vuole i
 *   permessi di amministratore, e la suite si installa **senza UAC** apposta
 *   (`oneClick`, per utente). Farlo di nascosto all'installazione vorrebbe dire
 *   chiedere l'amministratore a tutti, anche a chi da fuori non ci accede mai.
 * - Si **guarda** se la regola c'è — leggere non costa permessi — e se manca il
 *   pannello lo dice, con un tasto che la crea. Quel tasto mostra il riquadro
 *   di Windows: uno solo, una volta.
 * - E si dice l'alternativa: con il tunnel acceso la porta **non serve
 *   aprirla**, perché la connessione la fa il PC verso l'esterno. Chi non vuole
 *   toccare il firewall ha una strada che funziona lo stesso.
 */

import { capture } from "@daprod/runtime";

/** Come si chiama la regola. Fissa: è anche il modo di ritrovarla. */
const NOME_REGOLA = "DaProd Suite (da fuori)";

/** Leggere le regole non costa permessi; scriverle sì. */
const ATTESA_LETTURA_MS = 6_000;
const ATTESA_SCRITTURA_MS = 60_000;

export interface StatoFirewall {
  /** La regola c'è: la porta è aperta in entrata. */
  aperta: boolean;
  /**
   * Non si è riusciti a guardare.
   *
   * Succede su una macchina dove `netsh` non c'è o risponde in una lingua che
   * non ci aspettiamo. In quel caso non si dice né sì né no: si tace, invece di
   * avvisare di un problema che potrebbe non esserci.
   */
  incerto: boolean;
}

/**
 * C'è già una regola per la nostra porta?
 *
 * Si cerca **per nome**, che è l'unica cosa indipendente dalla lingua di
 * Windows: l'uscita di `netsh` è tradotta, e cercare «Enabled: Yes» funziona
 * solo su un sistema in inglese. Se la regola col nostro nome esiste, l'abbiamo
 * messa noi e fa quello che deve.
 */
export async function statoFirewall(): Promise<StatoFirewall> {
  try {
    const uscita = await capture(
      "netsh",
      ["advfirewall", "firewall", "show", "rule", `name=${NOME_REGOLA}`],
      { timeoutMs: ATTESA_LETTURA_MS },
    );
    return { aperta: uscita.includes(NOME_REGOLA), incerto: false };
  } catch {
    // `netsh` esce con un codice diverso da zero anche solo perché la regola
    // non c'è: non è un guasto, è la risposta «no».
    return { aperta: false, incerto: false };
  }
}

/**
 * Crea la regola, chiedendo l'amministratore a Windows.
 *
 * Torna `null` se è andata, oppure il motivo. Chi annulla il riquadro di
 * Windows riceve un motivo, non un silenzio: rifiutare è una risposta legittima
 * e va raccontata come tale.
 *
 * **`profile=any`, e va detto perché.** La tentazione è limitarla alle reti
 * «private», che è la cosa prudente da scrivere. Sui PC veri non funziona:
 * Windows 11 classifica come *pubblica* qualunque wifi a cui non si sia detto
 * esplicitamente «sì, mi fido», e la wifi di casa di chi ha cliccato «No» al
 * primo collegamento è pubblica per sempre. Una regola che non si applica alla
 * rete su cui si sta è esattamente il guasto silenzioso che questo file cura.
 *
 * Cosa apre davvero: **una porta con una serratura**. Il gateway non risponde a
 * niente senza token, e l'accoppiamento ha un tetto di dieci tentativi al
 * minuto. Chi non vuole aprire niente usa il tunnel, che non tocca il firewall.
 */
export async function apriLaPorta(porta: number): Promise<string | null> {
  const argomenti = [
    "advfirewall",
    "firewall",
    "add",
    "rule",
    `name=${NOME_REGOLA}`,
    "dir=in",
    "action=allow",
    "protocol=TCP",
    `localport=${porta}`,
    "profile=any",
  ];

  // Si passa da PowerShell solo per `-Verb RunAs`: è quello che fa comparire il
  // riquadro di Windows. Gli argomenti vanno in un array di stringhe fra apici
  // singoli — dentro c'è uno spazio, nel nome della regola — e PowerShell li
  // consegna a netsh già separati, senza rimescolarli.
  const lista = argomenti.map((a) => `'${a.replace(/'/g, "''")}'`).join(",");
  const script =
    `$e = Start-Process -FilePath netsh -ArgumentList @(${lista}) ` +
    `-Verb RunAs -Wait -WindowStyle Hidden -PassThru; exit $e.ExitCode`;

  try {
    await capture("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      timeoutMs: ATTESA_SCRITTURA_MS,
    });
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err);
    // Il caso normale non è un errore di sistema: è un «no» dato al riquadro.
    return /1223|cancell|annull|Operation.*cancel/i.test(motivo)
      ? "Hai detto di no al riquadro di Windows. La porta resta chiusa: puoi riprovare, oppure accendere «Anche da fuori casa», che non tocca il firewall."
      : `Windows non ha aperto la porta: ${motivo}`;
  }

  const dopo = await statoFirewall();
  return dopo.aperta
    ? null
    : "Il comando è andato ma la regola non c'è. Prova ad accendere «Anche da fuori casa», che non ha bisogno del firewall.";
}
