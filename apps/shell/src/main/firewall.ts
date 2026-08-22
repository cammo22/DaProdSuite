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

/**
 * Come si chiama la regola. Fissa: è anche il modo di ritrovarla.
 *
 * **Senza spazi, e non è una questione di gusto.** Si chiamava «DaProd Suite
 * (da fuori)», e il tasto non funzionava mai: `Start-Process -ArgumentList`
 * unisce gli elementi con uno spazio e **non li protegge**, quindi netsh
 * riceveva `name=DaProd Suite (da fuori)` come quattro parole separate. Errore
 * di sintassi, codice 1, e un riquadro che diceva soltanto «powershell.exe è
 * uscito con codice 1».
 *
 * Si può proteggere il quoting in tre modi diversi, tutti fragili. Oppure si
 * può togliere lo spazio, e la classe di errore non esiste più.
 */
const NOME_REGOLA = "DaProdSuite";

/**
 * Come si chiamava prima.
 *
 * Su una macchina dove per caso la regola vecchia esiste, va riconosciuta:
 * altrimenti la suite direbbe «Windows sta bloccando» davanti a una porta che
 * è già aperta.
 */
const NOMI_VECCHI = ["DaProd Suite (da fuori)"];

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
  for (const nome of [NOME_REGOLA, ...NOMI_VECCHI]) {
    if (await esiste(nome)) return { aperta: true, incerto: false };
  }
  return { aperta: false, incerto: false };
}

async function esiste(nome: string): Promise<boolean> {
  try {
    const uscita = await capture(
      "netsh",
      ["advfirewall", "firewall", "show", "rule", `name=${nome}`],
      { timeoutMs: ATTESA_LETTURA_MS },
    );
    return uscita.includes(nome);
  } catch {
    // `netsh` esce con un codice diverso da zero anche solo perché la regola
    // non c'è: non è un guasto, è la risposta «no».
    return false;
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
  const comando =
    `netsh advfirewall firewall add rule name=${NOME_REGOLA} dir=in action=allow ` +
    `protocol=TCP localport=${porta} profile=any`;

  /**
   * Si passa da PowerShell solo per `-Verb RunAs`: è quello che fa comparire il
   * riquadro di Windows. Poi da `cmd /c`, e non direttamente da netsh, per una
   * ragione sola: **serve sapere cosa ha detto netsh**, e con `-Verb RunAs`
   * PowerShell non lascia reindirizzare l'uscita. Allora la reindirizza il
   * comando stesso, in un file che si rilegge subito dopo.
   *
   * E si esce **sempre con zero**, scrivendo l'esito vero nella prima riga.
   * Il codice di uscita di `Start-Process` non è affidabile in nessuna delle due
   * direzioni: quando non riesce a lanciare niente l'errore è non-terminante e
   * `$e` resta nullo, quindi `exit $e.ExitCode` esce **zero** — cioè un guasto
   * si presenterebbe come una riuscita. Meglio leggere una riga di testo.
   */
  const script = [
    `$log = Join-Path $env:TEMP 'daprod-firewall.txt'`,
    `Remove-Item $log -ErrorAction SilentlyContinue`,
    `$riga = '${comando}' + ' > "' + $log + '" 2>&1'`,
    `try { $e = Start-Process -FilePath cmd.exe -ArgumentList '/c', $riga ` +
      `-Verb RunAs -Wait -WindowStyle Hidden -PassThru -ErrorAction Stop } catch { $e = $null }`,
    `if ($null -eq $e) { Write-Output 'ESITO=annullato' } else { Write-Output ("ESITO=" + $e.ExitCode) }`,
    `if (Test-Path $log) { Get-Content $log -Raw }`,
    `exit 0`,
  ].join("; ");

  let detto = "";
  try {
    detto = await capture("powershell.exe", ["-NoProfile", "-Command", script], {
      timeoutMs: ATTESA_SCRITTURA_MS,
    });
  } catch (err) {
    detto = err instanceof Error ? err.message : String(err);
  }

  // **La verità è la regola, non il codice di uscita.** Se dopo il giro la
  // regola c'è, è andata — comunque sia andata.
  if ((await statoFirewall()).aperta) return null;

  if (/ESITO=annullato/.test(detto)) {
    return (
      "Hai detto di no al riquadro di Windows, o non è comparso. La porta resta " +
      "chiusa: puoi riprovare, oppure usare Tailscale o il tunnel, che il firewall " +
      "non lo toccano."
    );
  }

  const parole = detto
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r && !r.startsWith("ESITO="))
    .join(" ")
    .slice(0, 220);

  return parole
    ? `Windows non ha aperto la porta: ${parole}`
    : "Windows non ha aperto la porta, e non ha detto perché. Puoi usare Tailscale o il tunnel, che il firewall non lo toccano.";
}
