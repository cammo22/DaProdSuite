/**
 * Porta nella suite i modelli già scaricati dai vecchi progetti.
 *
 * Sono ~34 GB fra MinimaxMusica e AvatarParlante: riscaricarli da HuggingFace
 * sarebbe ore di attesa per roba che c'è già sul disco.
 *
 *   node packages/runtime/scripts/importa-modelli.cjs            elenca e basta
 *   node packages/runtime/scripts/importa-modelli.cjs --copia    copia (i vecchi restano)
 *   node packages/runtime/scripts/importa-modelli.cjs --sposta   sposta (i vecchi smettono)
 *
 * Senza argomenti non tocca niente: dice solo cosa troverebbe e quanto pesa.
 * Spostare e' istantaneo se sorgente e destinazione sono sullo stesso disco, ma
 * lascia i vecchi progetti senza modelli: e' la scelta giusta se sono archivio,
 * sbagliata se ancora li usi.
 */

const { existsSync, mkdirSync, renameSync, statSync, readdirSync, copyFileSync } = require('node:fs');
const { join, dirname } = require('node:path');

const DESKTOP = join(process.env.USERPROFILE, 'Desktop');
const MODELLI = join(process.env.LOCALAPPDATA, 'DaProdSuite', 'models');

/**
 * Da dove a dove. Le destinazioni seguono la convenzione delle cartelle di
 * ComfyUI, cosi' un solo extra_model_paths.yaml serve Musica, Foto e Cinema.
 */
const MAPPA = [
  // DaProdMusica: modelli di diffusione, text encoder e VAE
  ...['diffusion_models', 'text_encoders', 'vae'].map((cartella) => ({
    da: join(DESKTOP, 'MinimaxMusica', 'engine', 'ComfyUI', 'models', cartella),
    a: join(MODELLI, cartella),
    perche: `DaProdMusica e DaProdFoto — ${cartella}`,
  })),
  // DaProd IoDigitale: l'avatar parlante e i modelli di voce e ascolto
  ...['SoulX-FlashHead-1_3B', 'leaptalk', 'wav2vec2-base-960h', 'asr', 'llm', 'whisper', 'piper'].map(
    (cartella) => ({
      da: join(DESKTOP, 'AvatarParlante', 'LeapTalk', 'models', cartella),
      a: join(MODELLI, cartella),
      perche: `DaProd IoDigitale — ${cartella}`,
    }),
  ),
];

const modo = process.argv.includes('--sposta')
  ? 'sposta'
  : process.argv.includes('--copia')
    ? 'copia'
    : 'elenca';

function peso(percorso) {
  let totale = 0;
  for (const voce of readdirSync(percorso, { withFileTypes: true })) {
    const p = join(percorso, voce.name);
    if (voce.isDirectory()) totale += peso(p);
    else if (voce.isFile()) totale += statSync(p).size;
  }
  return totale;
}

function copiaRicorsiva(da, a) {
  mkdirSync(a, { recursive: true });
  for (const voce of readdirSync(da, { withFileTypes: true })) {
    const origine = join(da, voce.name);
    const destinazione = join(a, voce.name);
    if (voce.isDirectory()) copiaRicorsiva(origine, destinazione);
    else if (voce.isFile() && !existsSync(destinazione)) copyFileSync(origine, destinazione);
  }
}

const gb = (b) => (b / 1024 ** 3).toFixed(2).padStart(6);

console.log(`Destinazione: ${MODELLI}\n`);

let totale = 0;
let fatti = 0;

for (const voce of MAPPA) {
  if (!existsSync(voce.da)) continue;

  const dimensione = peso(voce.da);
  if (dimensione === 0) continue;
  totale += dimensione;

  console.log(`${gb(dimensione)} GB  ${voce.perche}`);
  console.log(`            da  ${voce.da}`);
  console.log(`            a   ${voce.a}`);

  if (modo === 'elenca') {
    console.log('');
    continue;
  }

  try {
    mkdirSync(dirname(voce.a), { recursive: true });
    if (modo === 'sposta' && !existsSync(voce.a)) {
      // Istantaneo sullo stesso disco. Se la destinazione esiste gia', rename
      // fallirebbe: si passa alla copia, che salta i file gia' presenti.
      renameSync(voce.da, voce.a);
    } else {
      copiaRicorsiva(voce.da, voce.a);
    }
    console.log('            fatto\n');
    fatti += 1;
  } catch (errore) {
    console.log(`            NON RIUSCITO: ${errore.message}\n`);
  }
}

console.log(`Totale trovato: ${gb(totale)} GB`);

if (modo === 'elenca') {
  console.log('\nNiente e\' stato toccato. Per procedere:');
  console.log('  --copia    i vecchi progetti continuano a funzionare, servono altri GB');
  console.log('  --sposta   istantaneo, ma i vecchi progetti restano senza modelli');
} else {
  console.log(`Cartelle importate: ${fatti}`);
}
