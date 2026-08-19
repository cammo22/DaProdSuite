/**
 * Le anteprime che si muovono, quelle che partono passando il mouse su una
 * scheda dell'hub.
 *
 *     node apps/shell/scripts/genera-anteprime.cjs             tutte
 *     node apps/shell/scripts/genera-anteprime.cjs musica foto  solo queste
 *
 * **Cosa fa oggi.** Prende la copertina che `genera-copertine.cjs` ha già
 * generato con Anima e ne ricava una clip di quattro secondi con un movimento
 * lento di macchina — un avvicinamento con una leggera deriva laterale, diverso
 * per ogni scheda. Non è un video nuovo: è la stessa illustrazione, che si
 * muove.
 *
 * **Cosa non fa ancora, e va detto.** La roadmap chiede un'anteprima *generata
 * con l'app stessa*: DaProdDream che trasforma una webcam, il Visualizer che
 * reagisce a un brano, DaProdCinema che fa una clip vera. Quello arriva quando
 * arriverà il video (0.6.0), e allora questo file cambia dentro e non fuori:
 * la suite cerca `media/<app>.webm` e non sa né gli importa come è nato.
 *
 * Un movimento lento su un'illustrazione buona però non è un ripiego triste:
 * è quello che fanno i documentari da sessant'anni, e su una scheda di
 * centododici pixel d'altezza è esattamente quanto serve perché l'occhio
 * capisca che quella scheda è viva.
 *
 * **Serve ffmpeg**, che l'ambiente Python della suite ha già in casa
 * (`imageio-ffmpeg`): non si scarica niente. Se l'ambiente non c'è, lo dice e
 * si ferma — le copertine ferme restano, e le schede funzionano lo stesso.
 */

const { existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const MEDIA = join(__dirname, "..", "src", "renderer", "media");

/** Quanto dura una clip. Quattro secondi: il tempo di passarci sopra e guardarla. */
const SECONDI = 4;
const FPS = 24;

/**
 * La misura della striscia in cima a una scheda, come per le copertine.
 * Lati pari: i codificatori video non digeriscono le dimensioni dispari.
 */
const LARGHEZZA = 1024;
const ALTEZZA = 384;

/**
 * Il movimento di ogni scheda.
 *
 * `zoom` è quanto ci si avvicina in tutta la clip (1.10 = dieci per cento);
 * `verso` dove deriva il centro, in frazioni di inquadratura. Sono diversi per
 * scheda apposta: sette schede che fanno lo stesso identico movimento sembrano
 * un difetto del programma, non una scelta.
 */
const MOVIMENTI = {
  visualizer: { zoom: 1.12, verso: [0.03, 0] },
  musica: { zoom: 1.1, verso: [-0.03, 0.01] },
  foto: { zoom: 1.14, verso: [0, -0.02] },
  cinema: { zoom: 1.08, verso: [0.04, 0.02] },
  dream: { zoom: 1.16, verso: [-0.02, -0.02] },
  companion: { zoom: 1.09, verso: [0.02, 0.02] },
  iodigitale: { zoom: 1.11, verso: [-0.03, -0.01] },
};

function ffmpeg() {
  // Chiediamo all'ambiente della suite dov'è il suo: è quello che i motori
  // usano per i video, ed è già stato scaricato quando si è installata la prima
  // app che ne aveva bisogno.
  const python = join(
    process.env.LOCALAPPDATA || "",
    "DaProdSuite",
    "runtime",
    "Scripts",
    "python.exe",
  );
  if (!existsSync(python)) {
    throw new Error(
      "Manca l'ambiente Python della suite: installalo dall'hub, poi rilancia.\n" +
        `Cercato in ${python}`,
    );
  }
  const esito = execFileSync(
    python,
    ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
    { encoding: "utf8" },
  );
  const percorso = esito.trim();
  if (!existsSync(percorso)) {
    throw new Error(`imageio-ffmpeg dice che ffmpeg sta in ${percorso}, ma lì non c'è.`);
  }
  return percorso;
}

/**
 * Il filtro che fa il movimento.
 *
 * `zoompan` lavora fotogramma per fotogramma: `zoom` cresce di un filo a ogni
 * passo, e il centro si sposta di conseguenza. L'ingrandimento a monte
 * (`scale` per otto) non è un vezzo: senza, `zoompan` sposta il ritaglio a
 * pixel interi e il movimento esce a scatti invece che liscio.
 */
function filtro(movimento) {
  const fotogrammi = SECONDI * FPS;
  const passo = (movimento.zoom - 1) / fotogrammi;
  const [dx, dy] = movimento.verso;

  return [
    `scale=${LARGHEZZA * 8}:${ALTEZZA * 8}:flags=lanczos`,
    `zoompan=z='min(zoom+${passo.toFixed(6)},${movimento.zoom})'` +
      `:x='iw/2-(iw/zoom/2)+(${dx})*iw*on/${fotogrammi}'` +
      `:y='ih/2-(ih/zoom/2)+(${dy})*ih*on/${fotogrammi}'` +
      `:d=${fotogrammi}:s=${LARGHEZZA}x${ALTEZZA}:fps=${FPS}`,
    "format=yuv420p",
  ].join(",");
}

function generaUna(id, exe) {
  const sorgente = join(MEDIA, `${id}.webp`);
  if (!existsSync(sorgente)) {
    console.log(`· ${id}: manca la copertina (${id}.webp), salto`);
    return false;
  }

  const destinazione = join(MEDIA, `${id}.webm`);
  const movimento = MOVIMENTI[id] || { zoom: 1.1, verso: [0, 0] };

  const esito = spawnSync(
    exe,
    [
      "-y",
      "-loop", "1",
      "-i", sorgente,
      "-t", String(SECONDI),
      "-vf", filtro(movimento),
      // VP9 e non H.264: sta dentro un `<video>` di Chromium senza codec di
      // terzi, e su un'illustrazione ferma che si muove piano fa file piccoli.
      "-c:v", "libvpx-vp9",
      "-b:v", "0",
      "-crf", "38",
      "-an",
      destinazione,
    ],
    { encoding: "utf8" },
  );

  if (esito.status !== 0) {
    console.error(`· ${id}: ffmpeg è uscito con ${esito.status}`);
    console.error((esito.stderr || "").split("\n").slice(-8).join("\n"));
    return false;
  }
  console.log(`· ${id}: fatta`);
  return true;
}

function main() {
  const voluti = process.argv.slice(2);
  const daFare = voluti.length ? voluti : Object.keys(MOVIMENTI);

  mkdirSync(MEDIA, { recursive: true });
  const exe = ffmpeg();
  console.log(`ffmpeg: ${exe}\n`);

  let fatte = 0;
  for (const id of daFare) if (generaUna(id, exe)) fatte++;

  console.log(`\n${fatte} anteprime su ${daFare.length} in ${MEDIA}`);
}

main();
