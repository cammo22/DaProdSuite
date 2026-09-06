/**
 * Gli shader di DaProdVisualizer, **gli stessi**.
 *
 * ⚠ **File generato.** Lo produce `packages/gateway/scripts/porta-il-visualizer.mjs`
 * leggendo `apps/visualizer/src/visual-engine`. Non si scrive a mano: se lo si
 * scrivesse a mano, alla terza correzione i due visualizer sarebbero due cose
 * diverse con lo stesso nome — ed e' precisamente quello che e' stato chiesto
 * due volte di non fare.
 *
 * ## Cosa vuol dire «port vero», qui
 *
 * L'app DaProdVisualizer e' React piu' Three.js, e dentro la console non ci
 * entra: la console si serve da se' e Three.js da solo pesa piu' di tutta la
 * pagina. Ma **Three.js non e' il visualizer**: nove degli undici preset sono
 * un rettangolo grande quanto lo schermo con sopra **un fragment shader**, e
 * quel rettangolo WebGL lo disegna da solo in trenta righe.
 *
 * Quindi qui non c'e' un'imitazione: ci sono **gli stessi file GLSL**. Stesso
 * prologo condiviso, stessi nove effetti, stesse quattro passate di
 * post-processing. Quello che si vede sul telefono e' quello che si vede sul
 * computer, perche' e' lo stesso codice che disegna.
 *
 * **Due preset restano fuori** — AudioBloom e CosmicDust — perche' sono scene
 * con particelle e mesh, e quelle Three.js lo usano davvero.
 *
 * L'unica differenza rispetto ai file dell'app: i backtick dentro tre commenti
 * GLSL sono diventati apici, perche' questo file e' un template literal. Il
 * codice che disegna e' identico.
 */

/**
 * Le fonti, cosi' come stanno nell'app.
 *
 * Restano in template literal — leggibili, e confrontabili riga per riga con
 * l'originale — e arrivano al browser passate da `JSON.stringify`, che e'
 * l'unica scappatura senza casi particolari.
 */
const FONTI: Record<string, string> = {
  comune: `
// Prologo condiviso da tutti i preset a schermo intero.
// Viene concatenato davanti al fragment shader del preset da composeFragment().

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uDelta;
uniform vec2 uResolution;
uniform float uAspect;
uniform float uIntensity;
uniform float uPosition;

uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uRms;
uniform float uPeak;
uniform float uBeat;
uniform float uOnset;
uniform float uCentroid;
uniform float uEnergy;
uniform float uBeatCount;

uniform sampler2D uSpectrum; // r = banda, g = picco, b = banda smussata
uniform sampler2D uWave;     // r = campione, 0.5 = silenzio

#define PI 3.14159265359
#define TAU 6.28318530718

/** Banda FFT a posizione normalizzata 0..1 (0 = gravi, 1 = acuti). */
float band(float x) {
  return texture2D(uSpectrum, vec2(clamp(x, 0.0, 1.0), 0.5)).r;
}

/** Picco della banda: scende lentamente, utile per i bordi delle barre. */
float bandPeak(float x) {
  return texture2D(uSpectrum, vec2(clamp(x, 0.0, 1.0), 0.5)).g;
}

/** Banda smussata: buona per le deformazioni geometriche. */
float bandSoft(float x) {
  return texture2D(uSpectrum, vec2(clamp(x, 0.0, 1.0), 0.5)).b;
}

/** Campione della forma d'onda in -1..1. */
float wave(float x) {
  return texture2D(uWave, vec2(clamp(x, 0.0, 1.0), 0.5)).r * 2.0 - 1.0;
}

/** Coordinate centrate, corrette per il rapporto d'aspetto. */
vec2 centered() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  return p;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  return fract(p * (p + p));
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += noise2(p) * amp;
    p = rot(0.5) * p * 2.02;
    amp *= 0.5;
  }
  return sum;
}

float fbm3(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += noise2(p) * amp;
    p = rot(0.7) * p * 2.1;
    amp *= 0.5;
  }
  return sum;
}

/** Palette cosinusoidale: t scorre la ruota, restituisce colori gia' bilanciati. */
vec3 palette(float t) {
  return 0.55 + 0.45 * cos(TAU * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.33, 0.67)));
}

/** Palette fredda azzurro/viola/magenta, in linea con i token dell'interfaccia. */
vec3 paletteCold(float t) {
  return vec3(0.28, 0.42, 0.62) + vec3(0.42, 0.34, 0.42) * cos(TAU * (t + vec3(0.62, 0.55, 0.42)));
}

/** Palette calda lava/ambra. */
vec3 paletteHot(float t) {
  return vec3(0.52, 0.24, 0.12) + vec3(0.48, 0.36, 0.2) * cos(TAU * (t + vec3(0.02, 0.14, 0.28)));
}

/** Curva di glow: 1 al centro, coda morbida. */
float glow(float d, float radius, float falloff) {
  return pow(radius / max(d, 1e-4), falloff);
}

/**
 * Punto tondo dentro una cella di griglia.
 *
 * Serve a evitare l'errore piu' comune con le griglie hash: accendere l'intera
 * cella con uno step() e ritrovarsi dei quadratini invece delle particelle.
 * Qui la cella decide solo dove sta il punto, la forma la fa la distanza.
 */
float cellPoint(vec2 q, float seed, float size) {
  vec2 f = fract(q) - 0.5;
  vec2 r = hash22(floor(q) + seed);
  return smoothstep(size, 0.0, length(f - (r - 0.5) * 0.72));
}

/** Seme della cella, per decidere vita e colore della particella. */
float cellSeed(vec2 q, float seed) {
  return hash21(floor(q) + seed);
}

/**
 * Campo di particelle che scorre: un punto tondo per cella, con nascita e morte
 * sfalsate. 'drift' positivo le fa scendere, negativo salire.
 */
float particleField(vec2 p, float t, float seed, float scale, float drift, float size) {
  vec2 q = p * scale;
  q.y -= t * drift;
  q.x += sin(t * 0.23 + seed) * 0.5;

  vec2 f = fract(q) - 0.5;
  vec2 r = hash22(floor(q) + seed);
  float d = length(f - (r - 0.5) * 0.72);
  float life = fract(r.x * 7.3 + t * (0.22 + r.y * 0.42));
  float env = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.45, life);
  return smoothstep(size, 0.0, d) * env;
}
`,
  post_bright: `
precision highp float;

varying vec2 vUv;

uniform sampler2D tSource;
uniform float uThreshold;
uniform float uKnee;

void main() {
  vec3 color = texture2D(tSource, vUv).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // Ginocchio morbido: evita il bordo netto fra zona in bloom e zona ferma.
  float soft = smoothstep(uThreshold - uKnee, uThreshold + uKnee, luma);
  gl_FragColor = vec4(color * soft, 1.0);
}
`,
  post_blur: `
precision highp float;

varying vec2 vUv;

uniform sampler2D tSource;
uniform vec2 uDirection; // (texelX, 0) oppure (0, texelY)

/*
 * Gaussiana a 9 tap approssimata con 5 campioni bilineari.
 * Offset e pesi sono costanti letterali per restare compatibili con GLSL ES 1.00.
 */
void main() {
  vec3 acc = texture2D(tSource, vUv).rgb * 0.2270270270;

  vec2 d1 = uDirection * 1.3846153846;
  acc += texture2D(tSource, vUv + d1).rgb * 0.3162162162;
  acc += texture2D(tSource, vUv - d1).rgb * 0.3162162162;

  vec2 d2 = uDirection * 3.2307692308;
  acc += texture2D(tSource, vUv + d2).rgb * 0.0702702703;
  acc += texture2D(tSource, vUv - d2).rgb * 0.0702702703;

  gl_FragColor = vec4(acc, 1.0);
}
`,
  post_composite: `
precision highp float;

varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 scene = texture2D(tScene, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 color = scene + bloom * uBloomStrength;

  // Tone map filmico leggero: tiene i picchi sotto controllo senza slavare.
  color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);

  // Vignettatura: aiuta a leggere i controlli sovrapposti in basso.
  vec2 d = vUv - 0.5;
  float vig = 1.0 - dot(d, d) * uVignette;
  color *= clamp(vig, 0.0, 1.0);

  // Grana finissima contro il banding sui gradienti scuri.
  float grain = (hash(vUv * uResolution + uTime) - 0.5) * uGrain;
  color += grain;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
  post_transition: `
precision highp float;

varying vec2 vUv;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float uMix;   // 0 = solo tFrom, 1 = solo tTo
uniform int uMode;    // 0 sfaldamento, 1 zoom blur, 2 onda, 3 fasce
uniform float uTime;
uniform vec2 uResolution;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Rumore valore con interpolazione morbida: la soglia dello sfaldamento deve
// muoversi a macchie, non a pixel isolati.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 zoomSample(sampler2D tex, vec2 uv, float strength) {
  vec2 center = uv - 0.5;
  vec3 acc = vec3(0.0);
  const int STEPS = 8;
  for (int i = 0; i < STEPS; i++) {
    float t = float(i) / float(STEPS - 1);
    vec2 p = 0.5 + center * (1.0 + strength * t);
    acc += texture2D(tex, clamp(p, 0.0, 1.0)).rgb;
  }
  return acc / float(STEPS);
}

void main() {
  vec3 from = texture2D(tFrom, vUv).rgb;
  vec3 to = texture2D(tTo, vUv).rgb;
  vec3 result;

  if (uMode == 1) {
    // Zoom blur: chi esce si allarga, chi entra arriva da dentro.
    float k = sin(uMix * PI) * 0.35;
    vec3 a = zoomSample(tFrom, vUv, k);
    vec3 b = zoomSample(tTo, vUv, -k);
    result = mix(a, b, smoothstep(0.0, 1.0, uMix));

  } else if (uMode == 2) {
    // Onda: un fronte circolare parte dal centro, deforma cio' che attraversa
    // e si lascia dietro il preset nuovo.
    vec2 c = vUv - 0.5;
    float d = length(c);
    vec2 dir = c / max(d, 1e-4);

    float front = uMix * 1.15;
    float ring = exp(-abs(d - front) * 13.0);
    // Increspatura sul fronte: e' quella che fa sembrare un'onda e non un cerchio.
    vec2 push = dir * ring * 0.05 * sin((d - front) * 42.0);

    vec3 a = texture2D(tFrom, clamp(vUv + push, 0.0, 1.0)).rgb;
    vec3 b = texture2D(tTo, clamp(vUv + push, 0.0, 1.0)).rgb;

    result = mix(a, b, smoothstep(front, front - 0.16, d));
    result += vec3(0.45, 0.7, 1.0) * ring * 0.45 * sin(uMix * PI);

  } else if (uMode == 3) {
    // Fasce: il fotogramma si spezza in strisce che scivolano di lato e passano
    // una alla volta, con i canali RGB sfasati sul momento del cambio.
    const float ROWS = 15.0;
    float row = floor(vUv.y * ROWS);
    float rnd = hash(vec2(row, 3.7));
    float dir = rnd > 0.5 ? 1.0 : -1.0;

    // Ogni striscia scorre e torna: massimo scarto a meta' transizione.
    float travel = dir * (1.0 - abs(uMix * 2.0 - 1.0)) * 0.22 * (0.4 + rnd);
    vec2 uvS = clamp(vec2(vUv.x + travel, vUv.y), 0.0, 1.0);

    // Le strisce non cambiano tutte insieme: l'ordine e' casuale.
    float take = smoothstep(rnd * 0.75, rnd * 0.75 + 0.25, uMix);
    float shift = (1.0 - abs(uMix * 2.0 - 1.0)) * 0.006;

    vec3 a, b;
    a.r = texture2D(tFrom, clamp(uvS + vec2(shift, 0.0), 0.0, 1.0)).r;
    a.g = texture2D(tFrom, uvS).g;
    a.b = texture2D(tFrom, clamp(uvS - vec2(shift, 0.0), 0.0, 1.0)).b;
    b.r = texture2D(tTo, clamp(uvS + vec2(shift, 0.0), 0.0, 1.0)).r;
    b.g = texture2D(tTo, uvS).g;
    b.b = texture2D(tTo, clamp(uvS - vec2(shift, 0.0), 0.0, 1.0)).b;

    result = mix(a, b, take);
    // Bordo acceso sulla striscia che sta cambiando proprio adesso.
    result += vec3(0.6, 0.85, 1.0) * (1.0 - abs(take * 2.0 - 1.0)) * 0.12;

  } else {
    // Sfaldamento: soglia rumorosa che avanza, con bordo luminoso.
    float n = noise(vUv * 9.0 + uTime * 0.15);
    float edge = smoothstep(uMix - 0.16, uMix + 0.16, n);
    result = mix(to, from, edge);
    float rim = 1.0 - abs(edge - 0.5) * 2.0;
    result += vec3(0.35, 0.75, 1.0) * pow(rim, 6.0) * 0.5 * (1.0 - abs(uMix * 2.0 - 1.0));
  }

  gl_FragColor = vec4(result, 1.0);
}
`,
  p_electric_storm: `
uniform float uBoltCount;
uniform float uRain;
uniform float uCloudGlow;

uniform float uCharge;
uniform float uStrike;
uniform float uSparkle;

/**
 * Pioggia.
 *
 * La cella e' schiacciata in verticale e la distanza dentro la cella e'
 * anisotropa: stretta in orizzontale, larga in verticale. Cosi' ogni goccia
 * diventa una scia con la testa in basso, invece di una pallina.
 */
float rainLayer(vec2 p, float t, float seed, float scale, float speed, float slant) {
  vec2 q = vec2((p.x + p.y * slant) * scale, p.y * scale * 0.3);
  q.y += t * speed;

  vec2 f = fract(q) - 0.5;
  vec2 r = hash22(floor(q) + seed);
  vec2 c = (r - 0.5) * vec2(0.85, 0.6);

  float d = length(vec2((f.x - c.x) * 6.0, (f.y - c.y) * 0.85));
  float streak = smoothstep(0.5, 0.0, d);
  // La scia si spegne verso l'alto: la goccia ha una testa e una coda.
  float taper = smoothstep(0.4, -0.12, f.y - c.y);
  return streak * taper;
}

/** Posizione orizzontale del tronco della scarica alla quota 'drop'. */
float trunkX(float x0, float seed, float t, float drop) {
  float sway = (fbm3(vec2(drop * 3.6 + seed * 13.0, t * 1.4 + seed)) - 0.5) * (0.07 + drop * 0.55);
  float lean = (hash11(seed + 5.0) - 0.5) * drop * 0.7;
  return x0 + sway + lean;
}

/**
 * Scarica verticale dal cielo al suolo.
 * 'prog' avanza da 0 a oltre 1 mentre la scarica scende: il tratto sotto il
 * fronte non e' ancora disegnato, cosi' il lampo cade invece di apparire tutto
 * insieme.
 */
float boltDown(vec2 p, float x0, float seed, float t, float prog, float width) {
  float drop = (1.0 - p.y) * 0.5; // 0 in cima, 1 in fondo
  float d = abs(p.x - trunkX(x0, seed, t, drop));
  float front = smoothstep(prog, prog - 0.22, drop);
  return glow(d + width, width * 1.1, 1.25) * front;
}

/**
 * Ramo che si stacca dal tronco.
 *
 * L'inizio e la fine sono smussati con smoothstep: tagliare di netto su 'local'
 * disegnava una riga orizzontale che attraversava il cielo.
 */
float branch(vec2 p, float x0, float seed, float t, float prog, float atDrop) {
  float drop = (1.0 - p.y) * 0.5;
  float local = drop - atDrop;

  float dir = hash11(seed + 11.0) > 0.5 ? 1.0 : -1.0;
  float wander = (fbm3(vec2(p.y * 5.0 + seed * 21.0, t * 1.6)) - 0.5) * 0.05;
  float d = abs(p.x - (trunkX(x0, seed, t, atDrop) + dir * local * 1.5 + wander));

  // Nasce sul tronco, si assottiglia e sparisce; nessun bordo netto.
  float window = smoothstep(0.0, 0.05, local) * smoothstep(0.3, 0.06, local);
  float front = smoothstep(prog, prog - 0.12, drop);
  return glow(d + 0.006, 0.0035, 1.3) * window * front;
}

void main() {
  vec2 p = centered();

  // --- Cielo e nuvole --------------------------------------------------------
  float sky = smoothstep(-1.0, 1.0, p.y);
  vec3 col = mix(vec3(0.006, 0.008, 0.018), vec3(0.03, 0.028, 0.062), sky);

  float clouds = fbm(vec2(p.x * 1.1 + uTime * 0.02, p.y * 2.0 - uTime * 0.035));
  float cloudMask = smoothstep(0.05, 0.75, p.y) * smoothstep(0.35, 0.72, clouds);
  col += vec3(0.16, 0.15, 0.3) * cloudMask * uCloudGlow * (0.4 + uCharge * 1.2);

  // --- Innesco: sul beat, oppure da solo quando non c'e' musica --------------
  float idle = smoothstep(0.05, 0.0, uEnergy);
  float autoPhase = fract(uTime * 0.33);
  float autoStrike = exp(-autoPhase * 6.5) * idle;
  float strike = max(uStrike, autoStrike);
  float seedBase = floor(uBeatCount) + floor(uTime * 0.33) * idle;

  float prog = clamp((1.0 - strike) * 1.7, 0.0, 1.5);

  float bolts = 0.0;
  float branches = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi < uBoltCount) {
      float seed = seedBase * 7.0 + fi * 31.0;
      float x0 = (hash11(seed) - 0.5) * 2.4 * uAspect;
      float w = 0.005 + hash11(seed + 2.0) * 0.004;
      bolts += boltDown(p, x0, seed, uTime, prog, w) * (0.6 + hash11(seed + 3.0) * 0.6);
      // Due rami per scarica, a quote diverse.
      branches += branch(p, x0, seed, uTime, prog, 0.3 + hash11(seed + 7.0) * 0.25);
      branches += branch(p, x0, seed + 1.7, uTime, prog, 0.6 + hash11(seed + 8.0) * 0.25) * 0.7;
    }
  }

  vec3 boltColor = mix(vec3(0.62, 0.78, 1.0), vec3(0.85, 0.7, 1.0), uCentroid);
  col += boltColor * bolts * strike * 1.4;
  col += boltColor * branches * strike * 0.7;

  // La nuvola si accende dall'interno quando parte la scarica.
  col += vec3(0.35, 0.42, 0.85) * cloudMask * strike * 1.1;

  // --- Pioggia ---------------------------------------------------------------
  // Tre piani: quello vicino cade veloce e sgranato, quelli lontani fitti e lenti.
  float rain =
      rainLayer(p, uTime, 2.3, 5.0, 2.4, 0.12)
    + rainLayer(p, uTime, 6.7, 9.0, 3.4, 0.15) * 0.7
    + rainLayer(p, uTime, 12.1, 15.0, 4.6, 0.18) * 0.45;
  // Il lampo illumina la pioggia da dietro.
  vec3 rainColor = mix(vec3(0.55, 0.68, 0.95), vec3(1.0), 0.25);
  col += rainColor * rain * uRain * (0.16 + uSparkle * 0.9 + strike * 1.1);

  // Schizzi sul terreno, in fase con la pioggia piu' vicina.
  vec2 splashQ = vec2(p.x * 26.0, floor(uTime * 9.0));
  float splash = step(0.86, hash21(floor(splashQ)))
    * exp(-abs(p.y + 0.86) * 55.0)
    * (0.4 + strike * 0.8);
  col += rainColor * splash * uRain * 0.35;

  // --- Suolo -----------------------------------------------------------------
  float ground = smoothstep(-0.55, -1.0, p.y);
  float spectrum = bandSoft(clamp(abs(p.x) / max(uAspect, 0.001), 0.0, 1.0));
  col += vec3(0.2, 0.35, 0.7) * ground * (0.06 + uCharge * 0.5 + spectrum * 0.35);
  col += boltColor * ground * strike * 0.45;

  // Bagliore diffuso su tutto il fotogramma nell'istante della scarica.
  col += boltColor * strike * strike * 0.16;

  col = col / (1.0 + col * 0.35);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_fractal_pulse: `
uniform float uFold;
uniform float uZoom;
uniform float uGlowAmount;

uniform float uPunch;
uniform float uDrift;
uniform float uBreathe;

void main() {
  // Ciclo lungo da 19 secondi: la camera scende dentro il frattale fino a meta'
  // ciclo e poi risale. Mentre siamo dentro, i parametri della forma passano da
  // una variante alla successiva: la figura si trasforma invece di essere
  // sostituita di colpo, e non si vede nessuno stacco.
  float cycle = uTime / 19.0;
  float phase = fract(cycle);
  float variantA = floor(cycle);
  float variantB = variantA + 1.0;

  float dive = smoothstep(0.04, 0.46, phase) * smoothstep(0.96, 0.54, phase);
  float morph = smoothstep(0.38, 0.62, phase);
  vec2 vseed = mix(
    vec2(hash11(variantA * 3.7), hash11(variantA * 7.3 + 11.0)),
    vec2(hash11(variantB * 3.7), hash11(variantB * 7.3 + 11.0)),
    morph
  );

  // Lo zoom si stringe sul beat, respira sui bassi e segue l'immersione.
  float zoom = uZoom * (1.28 - uPunch * 0.26 - uBreathe * 0.1)
    * (1.0 + sin(uTime * 0.23) * 0.12)
    * mix(1.0, 0.3, dive);
  vec2 p = centered() * zoom;

  // Deriva su una figura di Lissajous: la figura non resta mai incastrata al centro.
  p += vec2(sin(uTime * 0.17), cos(uTime * 0.13)) * 0.14;
  // Rotazione che accelera e rallenta invece di girare a velocita' fissa.
  p = rot(uTime * 0.13 + sin(uTime * 0.31) * 0.4) * p;

  // Kaleidoscopio a 6 settori, con l'asse di simmetria che ruota per conto suo.
  float a = atan(p.y, p.x) + uTime * 0.09;
  float r = length(p);
  a = mod(a, TAU / 6.0) - TAU / 12.0;
  p = vec2(cos(a), sin(a)) * r;

  // Il centro dell'inversione e l'angolo di piega vengono dalla variante:
  // sono questi due numeri a decidere che frattale stiamo guardando.
  vec2 c = vec2(
    uFold + (vseed.x - 0.5) * 0.22 + sin(uTime * 0.29) * 0.06,
    0.36 + uDrift * 0.16 + (vseed.y - 0.5) * 0.2 + cos(uTime * 0.21) * 0.06
  );
  float fold = 0.34 + uMid * 0.22 + (vseed.x - 0.5) * 0.5 + sin(uTime * 0.19) * 0.12;

  float trapRing = 1e6;
  float trapCross = 1e6;
  float energy = 0.0;

  for (int i = 0; i < 9; i++) {
    p = abs(p);
    // Inversione circolare: il cuore dell'IFS. Il max evita la divisione per zero.
    p = p / max(dot(p, p), 1e-4) - c;
    p = rot(fold) * p;

    trapRing = min(trapRing, abs(length(p) - 0.62));
    trapCross = min(trapCross, min(abs(p.x), abs(p.y)));
    energy += exp(-length(p) * 2.0);
  }

  // Anche la tinta cambia con la variante: ogni giro ha il suo colore.
  float hue = uCentroid * 0.4 + energy * 0.06 + uTime * 0.02 + vseed.y * 0.55;

  // Il riempimento di fondo resta scuro. Prima l'energia accumulata sulle nove
  // iterazioni saturava quasi ovunque e usciva una poltiglia uniforme: la figura
  // la devono disegnare le trappole, non la somma.
  float fill = exp(-trapRing * 5.0);
  vec3 col = palette(hue) * pow(fill, 2.0) * (0.3 + energy * 0.05);

  // Filamenti sottili: sono loro a dare l'aspetto frattale.
  col += paletteCold(hue + 0.3) * glow(trapRing + 0.006, 0.009, 1.9) * (0.3 + uGlowAmount);
  col += vec3(1.0, 0.72, 0.35) * glow(trapCross + 0.008, 0.005, 1.8) * (0.22 + uTreble * 1.2);

  // Vena centrale che pulsa col volume.
  float rc = length(centered());
  col += palette(hue + 0.5) * (0.012 / (rc * rc + 0.01)) * (0.2 + uRms * 1.0);

  col = col / (1.0 + col * 0.3);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_glitch_tape: `
uniform float uTear;
uniform float uChroma;
uniform float uScanlines;

uniform float uRip;
uniform float uJump;
uniform float uWarp;

/**
 * Immagine sorgente sintetica: il "nastro" che poi rovineremo.
 *
 * Deve restare leggibile, altrimenti il glitch non si legge come un danno ma
 * come rumore e basta: fondo scuro, barre di spettro solo nella fascia bassa,
 * traccia d'onda a meta' e una striscia di taratura in cima.
 */
vec3 sourceImage(vec2 uv) {
  vec3 col = mix(vec3(0.015, 0.02, 0.05), vec3(0.05, 0.03, 0.09), uv.y);

  // Barre di spettro a 32 colonne, deliberatamente squadrate: dal basso e,
  // specchiate, dall'alto. Riempiono il fotogramma senza coprire il centro.
  float column = floor(uv.x * 32.0) / 32.0;
  float level = bandSoft(column);
  vec3 barColor = mix(vec3(0.15, 0.95, 0.85), vec3(1.0, 0.25, 0.6), column);

  float lower = level * 0.42;
  col = mix(col, barColor * 0.9, step(uv.y, lower));
  col += vec3(1.0) * step(abs(uv.y - lower), 0.006) * step(0.02, lower) * 0.9;

  float upper = 0.86 - level * 0.28;
  col = mix(col, barColor * 0.35, step(upper, uv.y) * step(uv.y, 0.86));

  // Blocchi di dati che scorrono, come i codici a bordo nastro.
  vec2 blockQ = vec2(floor(uv.x * 48.0), floor(uv.y * 14.0 - uTime * 1.5));
  float block = step(0.93, hash21(blockQ)) * step(0.5, uv.y) * step(uv.y, 0.84);
  col += vec3(0.35, 0.8, 0.6) * block * 0.3;

  // Traccia della forma d'onda a meta' schermo.
  float w = wave(uv.x) * 0.14 + 0.5;
  col += vec3(0.9, 0.95, 0.4) * smoothstep(0.012, 0.0, abs(uv.y - w));

  // Striscia di taratura in alto, come le colour bar del nastro.
  float strip = smoothstep(0.88, 0.9, uv.y);
  col = mix(col, palette(floor(uv.x * 8.0) / 8.0) * 0.8, strip);

  // Riga di stato che scorre lentamente.
  float statusLine = smoothstep(0.012, 0.0, abs(fract(uv.y + uTime * 0.05) - 0.62));
  col += vec3(0.3, 0.9, 0.7) * statusLine * 0.25;

  return col;
}

void main() {
  vec2 uv = vUv;

  // Curvatura del tubo catodico.
  vec2 cc = uv * 2.0 - 1.0;
  cc *= 1.0 + dot(cc, cc) * (0.02 + uWarp * 0.03);
  uv = cc * 0.5 + 0.5;

  float rip = max(uRip, uJump * 0.6);

  // --- Strappi orizzontali ---------------------------------------------------
  // Il fotogramma e' diviso in righe: alcune scivolano di lato a scatti.
  float row = floor(uv.y * 26.0);
  float tick = floor(uTime * 14.0);
  float rowRnd = hash21(vec2(row, tick));
  // "active" e' parola riservata in GLSL ES: qui serve un nome qualsiasi altro.
  // Soglia alta: pochi strappi alla volta, altrimenti l'immagine sparisce.
  float torn = step(0.93 - rip * 0.16, rowRnd);
  uv.x += (rowRnd - 0.5) * torn * rip * 0.1 * uTear;

  // Salto verticale dell'intero fotogramma sul beat.
  uv.y += (hash11(tick) - 0.5) * uJump * 0.03 * uTear;

  // Banda di rullaggio che scende sempre.
  float roll = fract(uv.y + uTime * 0.12);
  float rollBand = smoothstep(0.06, 0.0, roll) * 0.6;
  uv.x += rollBand * 0.012 * uTear;

  // Bordi tenuti fermi invece che ripiegati: con 'fract' il contenuto rientrava
  // dall'altro lato e il fotogramma diventava illeggibile.
  uv = clamp(uv, 0.0, 1.0);

  // --- Sfasatura dei canali --------------------------------------------------
  float shift = (0.0015 + rip * 0.01) * uChroma;
  vec3 col;
  col.r = sourceImage(uv + vec2(shift, 0.0)).r;
  col.g = sourceImage(uv).g;
  col.b = sourceImage(uv - vec2(shift, 0.0)).b;

  // --- Difetti del nastro ----------------------------------------------------
  float dropout = step(0.997 - rip * 0.006, hash21(vec2(row * 3.1, tick * 1.7)));
  col = mix(col, vec3(0.8, 0.84, 0.92), dropout * 0.3 * uTear);

  float grain = hash21(uv * uResolution + uTime * 60.0);
  col += (grain - 0.5) * (0.025 + rip * 0.05);

  // Righe di scansione e maschera a fosfori.
  float scan = 0.85 + 0.15 * sin(uv.y * uResolution.y * 1.5);
  col *= mix(1.0, scan, uScanlines);
  col *= 0.92 + 0.08 * sin(uv.x * uResolution.x * 2.0);

  // Bordi del tubo.
  vec2 edge = abs(uv * 2.0 - 1.0);
  float frame = (1.0 - smoothstep(0.97, 1.0, edge.x)) * (1.0 - smoothstep(0.97, 1.0, edge.y));
  col *= frame;

  col += vec3(0.9, 0.95, 1.0) * rollBand * 0.05;

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_inchiostro: `
uniform float uCurrent;
uniform float uDensity;
uniform float uFilaments;

uniform float uRelease;
uniform float uSwirl;
uniform float uGrain;

/**
 * Corrente dell'acqua: gradiente di un rumore ruotato di 90 gradi.
 * E' l'approssimazione economica di un campo a divergenza nulla, cioe' un
 * flusso che gira su se stesso senza sorgenti ne' pozzi.
 */
vec2 current(vec2 p, float t) {
  float e = 0.08;
  float a = fbm3(p * 0.9 + vec2(0.0, t * 0.12));
  float b = fbm3(p * 0.9 + vec2(e, t * 0.12));
  float c = fbm3(p * 0.9 + vec2(0.0, t * 0.12 + e));
  return vec2(c - a, a - b) / e;
}

/** Macchie di inchiostro che si aprono: ognuna nasce, si allarga e si dilava. */
float blobs(vec2 p, float t) {
  float acc = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float cycle = t * 0.16 + hash11(fi * 13.7) + uRelease * 0.05;
    // La posizione cambia a ogni ciclo: le macchie non ricompaiono sempre li'.
    float slot = floor(cycle);
    float age = fract(cycle);
    vec2 home = (hash22(vec2(slot * 5.1 + fi * 17.0, slot * 2.3 + fi)) - 0.5)
      * vec2(2.3 * uAspect, 2.0);
    float radius = 0.05 + age * (0.85 + uRelease * 0.5);
    float d = length(p - home);
    acc += smoothstep(radius, radius * 0.12, d) * (1.0 - age) * (1.0 - age);
  }
  return acc;
}

void main() {
  vec2 p = centered() * 1.2;
  float t = uTime * 0.62 * uCurrent;

  // Avvezione: il punto viene trascinato all'indietro lungo la corrente, cosi'
  // l'inchiostro si allunga in filamenti invece di restare una macchia tonda.
  vec2 q = p;
  for (int i = 0; i < 4; i++) {
    q -= current(q, t) * (0.045 + uSwirl * 0.05);
  }

  float texture = fbm(q * 1.9 + vec2(0.0, -t * 0.25));
  float ink = clamp(blobs(q, t) * 1.3 + texture * 0.75 * uDensity - 0.42, 0.0, 1.6);

  // Bordo: dove la concentrazione cala in fretta l'inchiostro e' piu' saturo.
  float edge = smoothstep(0.02, 0.32, ink) * smoothstep(0.9, 0.35, ink);

  // Filamenti sottili che seguono la stessa corrente.
  float threads = fbm3(q * 7.0 + vec2(t * 0.4, 0.0));
  float filament = smoothstep(0.55, 0.72, threads) * smoothstep(0.05, 0.3, ink);

  // --- Colore ----------------------------------------------------------------
  vec3 water = mix(vec3(0.012, 0.016, 0.035), vec3(0.03, 0.05, 0.1), smoothstep(-1.0, 1.0, p.y));

  float hue = uCentroid * 0.5 + texture * 0.35 + uTime * 0.01;
  vec3 inkColor = mix(paletteCold(hue), palette(hue + 0.4), 0.4);

  vec3 col = water;
  col = mix(col, inkColor * 0.55, smoothstep(0.0, 0.5, ink));
  col += inkColor * edge * (0.5 + uSwirl * 0.8);
  col += mix(inkColor, vec3(1.0), 0.35) * filament * uFilaments * 0.55;

  // Particelle in sospensione, come pulviscolo nell'acqua.
  float motes = particleField(p, uTime, 4.2, 9.0, 0.12, 0.05)
              + particleField(p, uTime, 8.9, 15.0, 0.2, 0.04) * 0.6;
  col += vec3(0.7, 0.85, 1.0) * motes * (0.15 + uGrain * 1.1);

  // Luce che filtra dall'alto e viene assorbita dall'inchiostro.
  float shaft = smoothstep(1.1, -0.2, p.y) * (0.06 + uRms * 0.1);
  col += vec3(0.25, 0.45, 0.7) * shaft * (1.0 - smoothstep(0.1, 0.7, ink));

  col = col / (1.0 + col * 0.3);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_liquid_chrome: `
uniform float uFlow;
uniform float uRoughness;
uniform float uTint;
uniform float uDrops;

uniform float uSwell;
uniform float uShine;
uniform float uRipple;
uniform float uSplash;

/**
 * Punti in cui qualcosa cade sul metallo.
 *
 * Quattro impatti a posizione libera, non su griglia: con le celle l'onda
 * veniva troncata sul proprio bordo e si vedeva una scacchiera di linee dritte.
 * Ogni impatto ha il suo ciclo, e quando si spegne il successivo rinasce altrove.
 * Restituisce (deformazione della superficie, cresta dell'onda).
 */
vec2 impacts(vec2 p, float t) {
  float h = 0.0;
  float crest = 0.0;

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float cycle = t * (0.22 + fi * 0.045) + fi * 0.37;
    float slot = floor(cycle);
    float phase = fract(cycle);

    vec2 pos = (hash22(vec2(slot * 7.3 + fi * 19.0, slot * 3.1 + fi)) - 0.5)
      * vec2(2.2 * uAspect, 1.9);

    float d = length(p - pos);
    float radius = phase * 1.15;
    float wave = sin((d - radius) * 12.0) * exp(-abs(d - radius) * 3.5);
    float decay = (1.0 - phase) * (1.0 - phase);

    h += wave * decay * 0.09;
    crest += smoothstep(0.05, 0.0, abs(d - radius)) * decay;
  }

  return vec2(h, crest);
}

/**
 * Superficie del metallo fuso.
 *
 * Torna il fbm a cinque ottave dell'originale: e' il dettaglio fine a dare al
 * cromo il suo aspetto, appiattirlo lo trasformava in nuvole molli. Sopra ci
 * stanno due treni di creste lente, che tengono insieme la lettura di mare.
 */
float surface(vec2 p, float t) {
  vec2 warp = vec2(
    fbm3(p * 1.1 + vec2(t, -t * 0.7)),
    fbm3(p * 1.1 + vec2(4.2 - t, t * 0.5))
  );
  float h = fbm(p * 1.6 + warp * (1.4 + uSwell * 1.6) + vec2(0.0, t * 0.6));

  h += sin(p.y * 2.4 + t * 1.5 + warp.x * 2.0) * 0.1 * (0.5 + uSwell * 0.8);
  h += sin(p.x * 1.6 + p.y * 1.1 - t * 1.1) * 0.05;
  return h;
}

float height(vec2 p, float t) {
  float h = surface(p, t);
  h += impacts(p, t).x * uDrops;

  // Cerchi concentrici dal centro a ogni transiente.
  float d = length(p);
  h += sin(d * 9.0 - uTime * 3.2) * uRipple * 0.09 * exp(-d * 0.9);
  h += sin(d * 14.0 - uTime * 5.0) * uSplash * 0.05 * exp(-d * 1.3);
  return h;
}

void main() {
  vec2 p = centered() * 1.25;
  float t = uTime * 0.14 * uFlow;

  // Passo della differenza legato alla risoluzione: la normale segue il
  // dettaglio del cromo invece di spianarlo.
  float e = 7.2 / max(uResolution.y, 1.0);
  float h = height(p, t);
  float hx = height(p + vec2(e, 0.0), t);
  float hy = height(p + vec2(0.0, e), t);
  vec3 n = normalize(vec3((h - hx) / e, (h - hy) / e, 1.0));

  vec3 viewDir = normalize(vec3(p * 0.55, 1.6));
  vec3 refl = reflect(-viewDir, n);

  // Ambiente finto: bande orizzontali chiare e scure, come una sala riflessa.
  // Sono loro a disegnare il cromo, per questo restano nette.
  float bands = 0.5 + 0.5 * sin(refl.y * 5.5 + uTime * 0.2);
  bands = mix(bands, smoothstep(0.2, 0.85, bands), 1.0 - uRoughness);
  float horizon = smoothstep(-0.35, 0.75, refl.y);

  vec3 metal = mix(vec3(0.06, 0.08, 0.13), vec3(0.85, 0.92, 1.0), bands * horizon);
  metal *= 0.55 + uShine * 1.3;

  // Tinta: dal cromo neutro al viola/azzurro dei token interfaccia.
  vec3 col = mix(metal, metal * paletteCold(uCentroid * 0.6 + 0.15) * 2.0, uTint);

  // Fresnel: i bordi obliqui restano sempre luminosi.
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  col += paletteCold(uCentroid + 0.4) * fresnel * (0.5 + uShine);

  // Riflesso speculare stretto che si accende sui picchi.
  float spec = pow(max(refl.z, 0.0), 24.0 + (1.0 - uRoughness) * 60.0);
  col += vec3(1.0, 0.98, 0.95) * spec * (0.4 + uPeak * 2.2);

  // Cresta dell'onda d'impatto: un anello di luce che corre verso l'esterno.
  float crest = impacts(p, t).y * uDrops;
  col += mix(vec3(1.0), paletteCold(uCentroid + 0.2), 0.45) * crest * (0.25 + uShine * 0.9);

  // Vena luminosa nei solchi profondi.
  col += paletteCold(0.75) * smoothstep(0.62, 0.28, h) * uSwell * 0.5;

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_minimal_rings: `
uniform float uLeds;
uniform float uActivity;
uniform float uEye;

uniform float uPush;
uniform float uFlash;
uniform float uLevel;

void main() {
  vec2 p = centered();
  float r = length(p);
  float a = atan(p.y, p.x);

  // --- Sala macchine ---------------------------------------------------------
  vec3 col = vec3(0.012, 0.011, 0.015);

  // Tutto quello che sta attorno lascia libera la zona dell'occhio.
  float away = smoothstep(0.26, 0.5, r);

  // --- Spie ------------------------------------------------------------------
  // Allineate sulle stesse sette file dei bus dati: sono spie di rack, non una
  // texture. Con una griglia fitta e regolare sembrava carta millimetrata.
  vec2 lq = vec2(p.x * 17.0, (p.y + 1.0) * 7.0);
  float ledSeed = cellSeed(lq, 5.0);
  float band = bandSoft(fract(ledSeed * 3.0));
  float blink = step(0.4, fract(ledSeed * 17.0 + uTime * (0.5 + ledSeed * 2.2)));
  // Solo una cella su tre ospita una spia: il resto e' pannello vuoto.
  float present = step(0.66, fract(ledSeed * 23.0));
  float led = cellPoint(lq, 5.0, 0.1) * blink * present * (0.3 + band * 2.0);

  vec3 ledColor = mix(vec3(0.25, 1.0, 0.5), vec3(1.0, 0.72, 0.2), fract(ledSeed * 5.0));
  // Una spia su cinque e' rossa: e' quella che dice che qualcosa non va.
  ledColor = mix(ledColor, vec3(1.0, 0.22, 0.16), step(0.8, fract(ledSeed * 9.0)));
  col += ledColor * led * uLeds * away * 1.4;

  // --- Pacchetti di dati -----------------------------------------------------
  // Righe orizzontali su cui corre un impulso: sembra traffico su un bus.
  float laneIndex = floor((p.y + 1.0) * 7.0);
  float onLane = smoothstep(0.06, 0.0, abs(fract((p.y + 1.0) * 7.0) - 0.5));
  float laneSeed = hash11(laneIndex * 7.7 + 1.0);
  float head = fract(uTime * (0.25 + laneSeed * 0.55) + laneSeed);
  float x01 = clamp(p.x / max(uAspect, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  float packet = exp(-abs(x01 - head) * 22.0);

  col += vec3(0.95, 0.3, 0.14) * onLane * packet * uActivity * away * (0.3 + uLevel * 1.6);
  // Traccia fioca della riga, anche dove il pacchetto non e' passato.
  col += vec3(0.1, 0.03, 0.025) * onLane * uActivity * away;

  // Impulso che attraversa tutta la sala a ogni beat.
  col += vec3(0.8, 0.16, 0.1) * uFlash * away * smoothstep(0.14, 0.0, abs(r - (1.0 - uFlash) * 1.4)) * 0.7;

  // --- L'occhio --------------------------------------------------------------
  float eyeR = 0.23 * max(uEye, 0.001);

  // Scocca metallica: copre lo sfondo e regge la lente.
  float bezel = clamp(
    smoothstep(eyeR * 1.32, eyeR * 1.26, r) - smoothstep(eyeR * 1.02, eyeR * 0.98, r),
    0.0, 1.0
  );
  col = mix(col, vec3(0.035, 0.033, 0.04), bezel);
  // Luce radente appena accennata: prima la ghiera grigia rubava la scena al rosso.
  col += vec3(0.22, 0.23, 0.27) * bezel * pow(max(0.0, cos(a - 2.1)), 4.0) * 0.45;

  // Vetro della lente: dentro e' quasi nero, cosi' il rosso stacca.
  float lens = smoothstep(eyeR * 1.0, eyeR * 0.96, r);
  col = mix(col, vec3(0.012, 0.005, 0.007), lens);

  // Respiro lento: l'occhio non e' mai del tutto fermo, ma nemmeno agitato.
  float breathe = 0.55 + 0.45 * sin(uTime * 0.7);
  float intensity = 0.4 + uLevel * 1.2 + uFlash * 0.9 + breathe * 0.28;

  float iris = exp(-(r * r) / (0.0052 * (1.0 + uLevel * 0.6)));
  col += vec3(1.0, 0.11, 0.04) * iris * intensity * lens * 1.7;

  col += vec3(1.0, 0.5, 0.24) * smoothstep(0.032 * uEye, 0.010 * uEye, r) * (0.7 + intensity);
  col += vec3(1.0, 0.9, 0.78) * smoothstep(0.014 * uEye, 0.003 * uEye, r) * (0.5 + intensity * 0.9);

  // Riflesso che scivola sul vetro: e' quello che lo fa sembrare una lente.
  vec2 glintDir = vec2(cos(uTime * 0.25), sin(uTime * 0.25));
  col += vec3(0.45, 0.47, 0.55) * exp(-abs(dot(p, glintDir) - eyeR * 0.45) * 45.0) * lens * 0.3;

  // L'occhio illumina la sala attorno a se'.
  col += vec3(0.9, 0.08, 0.03) * exp(-max(r - eyeR, 0.0) * 7.0) * intensity * (0.35 + uPush * 0.3);
  col += vec3(1.0, 0.28, 0.13) * exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 2.2) * intensity * 0.13;

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_napoli_lava: `
uniform float uFlowSpeed;
uniform float uHeat;
uniform float uCityLights;

uniform float uSurge;
uniform float uSparks;
uniform float uEruption;

/**
 * Quota della costa a una data ascissa.
 * Non e' una costante: due onde lunghe piu' un rumore lento la fanno respirare,
 * e i bassi la alzano. La linea dritta era la cosa che tradiva di piu' il fatto
 * che fosse tutto disegnato da uno shader.
 */
float shoreAt(float x) {
  return -0.18
    + sin(x * 1.6 + uTime * 0.35) * 0.032
    + sin(x * 3.7 - uTime * 0.52) * 0.015
    + (fbm3(vec2(x * 0.9, uTime * 0.12)) - 0.5) * 0.1 * (0.6 + uSurge * 1.2);
}

/**
 * Bagliore di calore dentro la nube rossa: una macchia larga e morbida che si
 * accende e si spegne. L'esponente alto sull'impulso la tiene spenta quasi
 * sempre, cosi' resta un lampo e non un faro.
 */
float heatFlash(vec2 q, float t, float seed) {
  vec2 c = vec2(sin(t * 0.31 + seed) * 0.85, 0.3 + cos(t * 0.23 + seed * 1.7) * 0.35);
  float pulse = pow(0.5 + 0.5 * sin(t * 1.6 + seed * 3.1), 8.0);
  return exp(-length(q - c) * 3.4) * pulse;
}

/**
 * Cielo dietro il fumo: stelle e qualche fuoco d'artificio.
 *
 * Ogni fuoco ha il suo ciclo: sale un lampo, poi si apre una raggiera di
 * scintille che si allarga e si spegne. Restano pochi e radi, perche' devono
 * leggersi come un dettaglio lontano e non rubare la scena alla colata.
 */
vec3 nightSky(vec2 p) {
  vec2 sq = vec2(p.x * 42.0, p.y * 42.0);
  float starSeed = cellSeed(sq, 21.0);
  float star = step(0.972, starSeed) * cellPoint(sq, 21.0, 0.15);
  vec3 sky = vec3(0.68, 0.76, 1.0) * star * (0.45 + 0.55 * sin(uTime * 2.0 + starSeed * 60.0));

  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float cycle = uTime * (0.2 + fi * 0.06) + fi * 0.5;
    float slot = floor(cycle);
    float age = fract(cycle);

    vec2 centre = (hash22(vec2(slot * 9.1 + fi * 31.0, slot * 4.7)) - 0.5)
      * vec2(1.9 * uAspect, 0.6) + vec2(0.0, 0.6);

    vec2 d = p - centre;
    float dist = length(d);
    float radius = age * 0.32;

    // Raggiera invece di un anello pieno: sono scintille, non un cerchio.
    float rays = 0.5 + 0.5 * sin(atan(d.y, d.x) * 24.0 + hash11(slot + fi) * 20.0);
    float shell = exp(-abs(dist - radius) * 65.0) * rays;
    float fade = (1.0 - age) * (1.0 - age) * smoothstep(0.0, 0.06, age);

    vec3 tint = palette(hash11(slot * 2.3 + fi) * 0.9 + 0.1);
    sky += tint * shell * fade * 2.0;
    // Lampo dello scoppio.
    sky += tint * exp(-dist * 24.0) * smoothstep(0.1, 0.0, age) * 1.2;
  }

  return sky;
}

/** Campo della colata: fbm che scorre verso il basso e si deforma da solo. */
float lavaField(vec2 q, float t) {
  vec2 warp = vec2(fbm3(q * 1.7 + vec2(0.0, t * 0.5)), fbm3(q * 1.7 + vec2(5.2, -t * 0.35)));
  return fbm(q * 2.1 + warp * (1.2 + uSurge * 1.4) + vec2(0.0, t));
}

void main() {
  vec2 p = centered();
  float t = uTime * 0.22 * uFlowSpeed;
  float shore = shoreAt(p.x);
  vec3 col;

  if (p.y > shore) {
    // ---- Versante e colata --------------------------------------------------
    vec2 q = vec2(p.x, p.y - shore);
    float f = lavaField(q, t);

    float crack = smoothstep(0.52, 0.66, f + uSurge * 0.12 + uEruption * 0.08);
    float deep = smoothstep(0.44, 0.62, f);

    vec3 rock = mix(vec3(0.025, 0.018, 0.03), vec3(0.09, 0.06, 0.07), deep);
    vec3 magma = paletteHot(0.06 + f * 0.35 + uCentroid * 0.12) * (1.3 + uHeat * 1.4);

    col = mix(rock, magma, crack);

    // Il cielo si vede dove il fumo e' rado, e solo abbastanza in alto.
    float thin = (1.0 - smoothstep(0.42, 0.68, f)) * smoothstep(0.08, 0.4, p.y - shore);
    col += nightSky(p) * thin * 1.3;
    col += paletteHot(0.12) * smoothstep(0.38, 0.62, f) * 0.35 * uHeat;

    // Scintille tonde che salgono dalla colata. Prima erano celle intere
    // accese con uno step(): si vedevano dei quadratini.
    float sparks =
        particleField(p, uTime, 3.1, 22.0, 1.5, 0.06)
      + particleField(p, uTime, 8.4, 34.0, 2.3, 0.05) * 0.7;
    col += vec3(1.0, 0.72, 0.35) * sparks * uSparks * (0.5 + uTreble * 2.0);

    col += paletteHot(0.3) * bandSoft(clamp((p.y - shore) * 0.7, 0.0, 1.0)) * 0.35 * crack;

    // Lampi di calore dentro la nube: tre fuochi lenti, sfasati fra loro.
    float flash = heatFlash(q, uTime, 1.0)
                + heatFlash(q, uTime, 4.3) * 0.8
                + heatFlash(q, uTime, 9.1) * 0.55;
    col += vec3(1.0, 0.74, 0.52) * flash * (0.22 + uSurge * 0.5 + uEruption * 0.7);
  } else {
    // ---- Mare ---------------------------------------------------------------
    float depth = shore - p.y;
    vec2 q = vec2(p.x * 1.4, depth * 3.2);
    float ripple = sin(q.y * 6.0 - uTime * 1.4 + fbm3(q * 1.3 + vec2(0.0, uTime * 0.2)) * 3.0);
    float sheen = smoothstep(0.2, 1.0, ripple) * exp(-depth * 2.6);

    col = mix(vec3(0.012, 0.02, 0.05), vec3(0.02, 0.05, 0.11), smoothstep(0.0, 0.6, depth));
    float reflected = lavaField(vec2(p.x, depth * 0.5), t);
    col += paletteHot(0.1) * smoothstep(0.5, 0.72, reflected) * exp(-depth * 3.4) * (0.5 + uSurge * 0.9);
    col += vec3(0.35, 0.6, 0.9) * sheen * (0.25 + uTreble * 0.7);
  }

  // ---- Costa: schiuma e luci ------------------------------------------------
  float toShore = abs(p.y - shore);

  // Schiuma sulla battigia, mossa dalle stesse onde della costa.
  float foam = exp(-toShore * 90.0) * (0.55 + 0.45 * sin(p.x * 24.0 - uTime * 2.2));
  col += vec3(0.85, 0.9, 1.0) * foam * 0.16;

  // Luci della citta': punti tondi dentro le celle, non celle accese.
  vec2 lq = vec2(p.x * 78.0, p.y * 78.0);
  float lightSeed = cellSeed(lq, 3.0);
  float lit = step(0.93, lightSeed) * cellPoint(lq, 3.0, 0.24);
  float flicker = 0.6 + 0.4 * sin(uTime * 2.2 + lightSeed * 60.0 + uMid * 6.0);
  vec3 lightColor = mix(vec3(1.0, 0.86, 0.55), vec3(0.7, 0.85, 1.0), fract(lightSeed * 7.0));
  col += lightColor * lit * flicker * smoothstep(0.06, 0.0, toShore) * uCityLights * 1.4;

  // Foschia calda sopra il profilo della costa.
  col += paletteHot(0.18) * exp(-toShore * 9.0) * 0.16 * (0.5 + uSurge);

  // Eruzione: onda di calore che invade il fotogramma sui transienti forti.
  col += paletteHot(0.05) * uEruption * 0.35 * smoothstep(-1.0, 0.6, p.y);

  col = col / (1.0 + col * 0.4);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_neon_tunnel: `
uniform float uSpeed;
uniform float uBassReaction;
uniform float uGlow;
uniform float uSparks;
uniform float uBolts;

uniform float uTunnelScale;
uniform float uFlash;
uniform float uSparkle;
uniform float uStrike;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

/**
 * Arco elettrico che parte dalla superficie del nucleo, non dal suo centro.
 *
 * Le due estremita' usano smoothstep e non un ritorno anticipato: un taglio
 * netto su 'q.x' disegnerebbe una riga dritta sullo schermo, che e' esattamente
 * l'artefatto che si vedeva prima.
 */
float arc(vec2 p, float ang, float t, float seed) {
  vec2 q = rot(-ang) * p;

  float start = 0.085;
  float len = 0.5 + hash11(seed) * 0.8;

  // La deviazione e' nulla sul nucleo e si apre allontanandosi: l'arco parte
  // attaccato alla sfera e poi frusta. Tenuta bassa: con un'apertura larga la
  // coda del glow riempiva uno spicchio invece di disegnare un filo.
  float reach = max(q.x - start, 0.0);
  float jag = (fbm3(vec2(q.x * 9.0 + seed * 23.0, t * 7.0)) - 0.5) * (0.01 + reach * 0.16);
  float d = abs(q.y - jag);

  float window = smoothstep(start - 0.02, start + 0.05, q.x) * smoothstep(len, len * 0.6, q.x);
  // Esponente alto: la luce cade in fretta e resta un filamento sottile.
  return glow(d + 0.004, 0.0028, 2.1) * window;
}

void main() {
  vec2 p = centered();
  float r = length(p);
  float ang = atan(p.y, p.x);

  // Il raggio del tunnel respira sui bassi.
  float scale = 1.0 + uTunnelScale * uBassReaction * 0.5;
  float depth = scale / (r * 1.4 + 0.11);
  // Velocita' costante: non dipende dall'energia del brano, resta quella a riposo.
  float z = uTime * uSpeed * 0.5;

  // Torsione lenta: il tunnel non deve sembrare un tubo dritto.
  float twist = sin(depth * 0.35 - uTime * 0.25) * 0.5;
  vec2 tuv = vec2((ang + twist) / TAU * 14.0, depth + z);

  float rings = abs(fract(tuv.y) - 0.5);
  float ribs = abs(fract(tuv.x) - 0.5);

  // Le nervature hanno larghezza costante in angolo: sullo schermo si aprivano
  // a ventaglio e diventavano spicchi bianchi larghi venti gradi. La soglia
  // adesso si stringe allontanandosi dal centro, cosi' restano linee.
  float ribWidth = 0.05 / (1.0 + r * 3.5);
  float grid = smoothstep(0.16, 0.0, rings) + smoothstep(ribWidth, 0.0, ribs) * 0.6;

  // Trama della parete che scorre con la profondita': senza, fra un anello e
  // l'altro c'era solo nero e il tubo non si leggeva.
  //
  // Deve essere periodica in tuv.x: atan salta di 2*PI sull'asse negativo, e un
  // rumore qualsiasi ci disegnerebbe sopra una cucitura dritta. Le sinusoidi,
  // avendo periodo esatto, attraversano il salto senza accorgersene.
  float wallTex =
      (0.5 + 0.5 * sin(tuv.x * TAU + tuv.y * 3.1))
    * (0.55 + 0.45 * sin(tuv.y * 6.3 + 1.7))
    + 0.25 * (0.5 + 0.5 * sin(tuv.x * TAU * 3.0 - tuv.y * 5.0));
  grid += smoothstep(0.5, 0.06, rings) * 0.34 * wallTex;

  // Le pareti si illuminano seguendo lo spettro attorno alla circonferenza.
  float spectrumPos = fract(abs(ang) / PI + uTime * 0.03);
  grid += bandSoft(spectrumPos) * 0.9 * smoothstep(0.5, 0.02, rings);

  float fade = smoothstep(0.0, 0.5, r) * smoothstep(3.0, 0.5, depth);
  float hue = uCentroid * 0.5 + depth * 0.04 + uTime * 0.015;

  // La caduta radiale scurisce gli angoli: senza, la parete lontana riempiva
  // i bordi di un azzurro piatto.
  vec3 col = paletteCold(hue) * grid * fade * (0.55 + uGlow * 1.1) * smoothstep(2.1, 0.35, r);

  // --- Bobina di Tesla al centro ---------------------------------------------
  // Senza musica gli archi crepitano comunque: la bobina e' sempre accesa.
  float idle = smoothstep(0.05, 0.0, uEnergy);
  float autoPhase = fract(uTime * 0.4);
  float autoStrike = exp(-autoPhase * 7.0) * idle;
  float charge = max(max(uFlash, uStrike), autoStrike);
  float crackle = 0.14 + 0.11 * sin(uTime * 11.0) * sin(uTime * 7.3);
  float power = max(charge, crackle);

  float beatSeed = floor(uBeatCount) + floor(uTime * 0.4) * idle;

  float arcs = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float seed = beatSeed * 5.0 + fi * 41.0;
    // Ventaglio regolare piu' scarto casuale: gli archi non si sovrappongono.
    float a = (fi / 5.0) * TAU + hash11(seed) * 1.5 + uTime * 0.35;
    arcs += arc(p, a, uTime, seed) * (0.45 + hash11(seed + 9.0) * 0.75);
  }

  vec3 arcColor = mix(vec3(0.65, 0.82, 1.0), vec3(0.85, 0.72, 1.0), 0.35 + uCentroid * 0.4);
  col += arcColor * min(arcs, 3.0) * power * uBolts * 1.15;

  // Nucleo di plasma: piccolo e denso. Se e' troppo largo brucia il tunnel.
  float core = 0.0055 / (r * r + 0.004);
  col += vec3(0.75, 0.88, 1.0) * core * (0.3 + uRms * 1.0 + charge * 0.9);

  float corona = exp(-abs(r - 0.09) * 42.0) * (0.55 + 0.45 * sin(ang * 16.0 + uTime * 9.0));
  col += vec3(0.55, 0.78, 1.0) * corona * (0.25 + power * 1.0);

  // --- Scintille nelle zone scure --------------------------------------------
  float dark = 1.0 - clamp(luma(col) * 1.7, 0.0, 1.0);
  float sparks =
      particleField(p, uTime, 1.7, 6.0, 0.35, 0.055)
    + particleField(p, uTime, 5.1, 11.0, 0.55, 0.05) * 0.7
    + particleField(p, uTime, 9.4, 18.0, 0.85, 0.045) * 0.45;
  col += mix(paletteCold(hue + 0.18), vec3(1.0), 0.4) * sparks * uSparks
       * (0.3 + uSparkle * 2.4) * dark;

  // Lampo d'insieme sul beat.
  col += vec3(0.55, 0.8, 1.0) * uFlash * 0.45 * smoothstep(1.4, 0.0, r);

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
  p_retro_grid: `
uniform float uSpeed;
uniform float uSunSize;
uniform float uGridGlow;

uniform float uRise;
uniform float uPulse;
uniform float uTwinkle;

/** Quota dell'orizzonte in coordinate centrate. */
const float HORIZON = -0.06;

/** Profilo delle montagne: due ottave, la seconda spinta dai bassi. */
float ridge(float x) {
  float h = fbm3(vec2(x * 1.3, 4.7)) * 0.7 + fbm3(vec2(x * 3.1, 11.3)) * 0.3;
  return h * (0.16 + uRise * 0.12);
}

void main() {
  vec2 p = centered();
  vec3 col;

  if (p.y > HORIZON) {
    // ---- Cielo -------------------------------------------------------------
    float t = (p.y - HORIZON) / (1.0 - HORIZON);
    col = mix(vec3(0.20, 0.03, 0.26), vec3(0.015, 0.01, 0.06), pow(t, 0.75));

    // Sole a fette: piu' alto e piu' grande quando la traccia spinge.
    vec2 s = vec2(p.x, p.y - HORIZON - 0.30);
    float radius = uSunSize * (1.0 + uPulse * 0.06);
    float d = length(s) / radius;
    float disc = smoothstep(1.0, 0.94, d);
    // Le fessure orizzontali si allargano verso il basso del disco.
    float slit = smoothstep(0.0, 0.5, sin((s.y / radius) * 26.0 + 1.2) + 0.35 + s.y / radius * 2.2);
    vec3 sunColor = mix(vec3(1.0, 0.30, 0.55), vec3(1.0, 0.82, 0.32), clamp(s.y / radius * 0.6 + 0.55, 0.0, 1.0));
    col += sunColor * disc * clamp(slit, 0.0, 1.0) * 1.35;
    // Alone attorno al sole.
    col += sunColor * exp(-d * 2.2) * 0.35 * (0.6 + uRms * 0.9);

    // Stelle: punti tondi dentro la cella, non celle accese. Con lo step() sul
    // solo seme della cella venivano fuori dei quadratini.
    vec2 sq = p * 26.0;
    float star = cellSeed(sq, 0.0);
    float twinkle = 0.5 + 0.5 * sin(uTime * 3.0 + star * 40.0);
    float visible = step(0.987, star) * cellPoint(sq, 0.0, 0.2) * smoothstep(0.05, 0.5, t);
    col += vec3(0.75, 0.85, 1.0) * visible * twinkle * (0.6 + uTwinkle * 1.6);

    // Montagne all'orizzonte.
    float mountain = HORIZON + ridge(p.x + uTime * 0.02);
    float mask = smoothstep(mountain + 0.004, mountain - 0.004, p.y);
    vec3 mountainColor = vec3(0.05, 0.02, 0.12);
    // Cresta illuminata dal sole.
    mountainColor += vec3(1.0, 0.35, 0.6) * smoothstep(mountain - 0.02, mountain, p.y) * 0.9;
    col = mix(col, mountainColor, mask);
  } else {
    // ---- Griglia in prospettiva -------------------------------------------
    // Prima passata per sapere a che profondita' siamo, poi il pavimento viene
    // ondulato e la profondita' ricalcolata: le linee salgono e scendono
    // invece di scorrere su un piano rigido.
    float depth0 = 1.0 / max(HORIZON - p.y, 0.0012);
    float z0 = depth0 + uTime * uSpeed * 2.2;
    float swell = sin(z0 * 0.8 + p.x * 4.0) * 0.006 * (0.4 + uRise * 2.2);

    float depth = 1.0 / max(HORIZON - p.y + swell, 0.0012);
    float z = depth + uTime * uSpeed * 2.2;
    // Serpeggiamento laterale: la griglia ondeggia mentre viene verso di noi.
    float gx = p.x * depth + sin(z * 0.18) * (0.7 + uRise * 2.4);

    // Lo spessore cresce con la profondita' in unita' griglia: sullo schermo resta costante.
    float twX = min(0.45, 0.018 * depth);
    float twZ = min(0.45, 0.0012 * depth * depth);

    float lineX = smoothstep(twX, 0.0, abs(fract(gx) - 0.5));
    float lineZ = smoothstep(twZ, 0.0, abs(fract(z * 0.5) - 0.5));

    float fog = exp(-depth * 0.075);
    // Onda di luce che corre verso l'orizzonte.
    float pulse = 0.65 + 0.35 * sin(z * 0.5 - uTime * 3.0 - uPulse * 4.0);
    float grid = (lineX + lineZ * 1.2) * fog * pulse;

    // Le colonne si accendono seguendo lo spettro.
    float spectrum = bandSoft(clamp(abs(gx) * 0.055, 0.0, 1.0));
    vec3 gridColor = mix(vec3(0.25, 0.85, 1.0), vec3(1.0, 0.25, 0.75), clamp(abs(gx) * 0.04, 0.0, 1.0));

    col = gridColor * grid * (0.8 + uGridGlow * 1.6) * (0.7 + spectrum * 1.6);
    col += vec3(0.35, 0.05, 0.3) * fog * 0.5;

    // Riflesso del sole sul piano, schiacciato e tremolante.
    float mirror = exp(-abs(p.x) * 3.0) * fog * 1.2;
    col += vec3(1.0, 0.35, 0.5) * mirror * (0.25 + uPulse * 0.3) * (0.6 + 0.4 * sin(p.y * 60.0 + uTime * 4.0));
  }

  // Linea d'orizzonte: nucleo sottile piu' alone largo. Con il solo nucleo, a
  // risoluzione bassa diventava una riga dura di un pixel.
  float toHorizon = abs(p.y - HORIZON);
  col += vec3(0.6, 0.9, 1.0) * smoothstep(0.016, 0.002, toHorizon) * (0.55 + uPulse * 0.7);
  col += vec3(0.35, 0.6, 1.0) * exp(-toHorizon * 55.0) * (0.25 + uPulse * 0.5);

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`,
};

/**
 * I manifest dei nove preset, ridotti a quello che il disegno usa davvero.
 *
 * Parametri con il loro valore di serie, e i legami fra una feature del suono e
 * un uniform. Sono la meta' del carattere di un effetto: senza, gli shader
 * compilano e restano fermi.
 */
const MANIFESTI = [
  {
    "chiave": "p_electric_storm",
    "id": "daprod.electric-storm",
    "nome": "Tempesta Elettrica",
    "categoria": "Psichedelico",
    "parametri": {
      "boltCount": 3,
      "rain": 1,
      "cloudGlow": 0.8
    },
    "legami": [
      {
        "da": "bass",
        "a": "charge",
        "quanto": 1,
        "inerzia": 0.18
      },
      {
        "da": "beat",
        "a": "strike",
        "quanto": 1,
        "inerzia": 0.05
      },
      {
        "da": "treble",
        "a": "sparkle",
        "quanto": 1,
        "inerzia": 0.07
      }
    ]
  },
  {
    "chiave": "p_fractal_pulse",
    "id": "daprod.fractal-pulse",
    "nome": "Impulso Frattale",
    "categoria": "Psichedelico",
    "parametri": {
      "fold": 0.86,
      "zoom": 1,
      "glowAmount": 0.7
    },
    "legami": [
      {
        "da": "beat",
        "a": "punch",
        "quanto": 1,
        "inerzia": 0.12
      },
      {
        "da": "centroid",
        "a": "drift",
        "quanto": 1,
        "inerzia": 0.5
      },
      {
        "da": "bass",
        "a": "breathe",
        "quanto": 1,
        "inerzia": 0.2
      }
    ]
  },
  {
    "chiave": "p_glitch_tape",
    "id": "daprod.glitch-tape",
    "nome": "Nastro Rovinato",
    "categoria": "Retro",
    "parametri": {
      "tear": 0.45,
      "chroma": 1,
      "scanlines": 1
    },
    "legami": [
      {
        "da": "onset",
        "a": "rip",
        "quanto": 1,
        "inerzia": 0.05
      },
      {
        "da": "beat",
        "a": "jump",
        "quanto": 1,
        "inerzia": 0.08
      },
      {
        "da": "bass",
        "a": "warp",
        "quanto": 1,
        "inerzia": 0.2
      }
    ]
  },
  {
    "chiave": "p_inchiostro",
    "id": "daprod.inchiostro",
    "nome": "Inchiostro",
    "categoria": "Liquido",
    "parametri": {
      "current": 1,
      "density": 1,
      "filaments": 1
    },
    "legami": [
      {
        "da": "onset",
        "a": "release",
        "quanto": 1,
        "inerzia": 0.4
      },
      {
        "da": "bass",
        "a": "swirl",
        "quanto": 1,
        "inerzia": 0.3
      },
      {
        "da": "treble",
        "a": "grain",
        "quanto": 1,
        "inerzia": 0.12
      }
    ]
  },
  {
    "chiave": "p_liquid_chrome",
    "id": "daprod.liquid-chrome",
    "nome": "Cromo Liquido",
    "categoria": "Liquido",
    "parametri": {
      "flow": 1,
      "roughness": 0.35,
      "tint": 0.55,
      "drops": 1
    },
    "legami": [
      {
        "da": "bass",
        "a": "swell",
        "quanto": 1,
        "inerzia": 0.18
      },
      {
        "da": "mid",
        "a": "shine",
        "quanto": 1,
        "inerzia": 0.1
      },
      {
        "da": "onset",
        "a": "ripple",
        "quanto": 1,
        "inerzia": 0.06
      },
      {
        "da": "beat",
        "a": "splash",
        "quanto": 1,
        "inerzia": 0.12
      }
    ]
  },
  {
    "chiave": "p_minimal_rings",
    "id": "daprod.minimal-rings",
    "nome": "Occhio Rosso",
    "categoria": "Minimal",
    "parametri": {
      "leds": 1,
      "activity": 1,
      "eye": 1
    },
    "legami": [
      {
        "da": "bass",
        "a": "push",
        "quanto": 1,
        "inerzia": 0.16
      },
      {
        "da": "beat",
        "a": "flash",
        "quanto": 1,
        "inerzia": 0.08
      },
      {
        "da": "rms",
        "a": "level",
        "quanto": 1,
        "inerzia": 0.25
      }
    ]
  },
  {
    "chiave": "p_napoli_lava",
    "id": "daprod.napoli-lava",
    "nome": "Lava di Napoli",
    "categoria": "Astratto",
    "parametri": {
      "flowSpeed": 1,
      "heat": 1,
      "cityLights": 0.8
    },
    "legami": [
      {
        "da": "bass",
        "a": "surge",
        "quanto": 1,
        "inerzia": 0.2
      },
      {
        "da": "treble",
        "a": "sparks",
        "quanto": 1,
        "inerzia": 0.06
      },
      {
        "da": "onset",
        "a": "eruption",
        "quanto": 1,
        "inerzia": 0.3
      }
    ]
  },
  {
    "chiave": "p_neon_tunnel",
    "id": "daprod.neon-tunnel",
    "nome": "Tunnel al Neon",
    "categoria": "Geometrico",
    "parametri": {
      "speed": 1,
      "bassReaction": 0.8,
      "glow": 0.6,
      "sparks": 1,
      "bolts": 1
    },
    "legami": [
      {
        "da": "bass",
        "a": "tunnelScale",
        "quanto": 0.8,
        "inerzia": 0.15
      },
      {
        "da": "beat",
        "a": "flash",
        "quanto": 1,
        "inerzia": 0.04
      },
      {
        "da": "treble",
        "a": "sparkle",
        "quanto": 1,
        "inerzia": 0.08
      },
      {
        "da": "onset",
        "a": "strike",
        "quanto": 1,
        "inerzia": 0.07
      }
    ]
  },
  {
    "chiave": "p_retro_grid",
    "id": "daprod.retro-grid",
    "nome": "Griglia Retro",
    "categoria": "Retro",
    "parametri": {
      "speed": 1,
      "sunSize": 0.42,
      "gridGlow": 0.7
    },
    "legami": [
      {
        "da": "bass",
        "a": "rise",
        "quanto": 1,
        "inerzia": 0.14
      },
      {
        "da": "beat",
        "a": "pulse",
        "quanto": 1,
        "inerzia": 0.05
      },
      {
        "da": "treble",
        "a": "twinkle",
        "quanto": 1,
        "inerzia": 0.09
      }
    ]
  }
];

/**
 * Gli shader come li vede il browser: senza commenti.
 *
 * ⚠ **Non e' solo peso, ed e' costato una prova rossa.** Questi shader
 * arrivano alla pagina dentro **una riga sola** — sono una stringa JSON — e un
 * `//` dentro quella riga si mangia tutto quello che gli sta dopo, per
 * chiunque legga il copione a occhio invece che con un parser. Il controllo
 * automatico che cerca le variabili nate per sbaglio ci e' cascato subito:
 * segnalava `vUv` e `gl_Position` come globali mai dichiarate. Non erano
 * globali, era GLSL che l'analisi credeva JavaScript.
 *
 * I commenti restano dove servono — in `FONTI` qui sopra, che si confronta
 * riga per riga con i file dell'app — e al browser va solo quello che la
 * scheda video deve compilare. Sono novemila caratteri in meno a ogni
 * apertura della pagina.
 */
function perIlBrowser(glsl: string): string {
  return glsl
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((r) => r.replace(/\/\/.*$/, "").trimEnd())
    .filter((r) => r.length > 0)
    .join("\n");
}

/**
 * Il pezzo di copione che porta gli shader dentro la pagina.
 *
 * Due righe, e non e' pigrizia: `JSON.stringify` scappa tutto quello che va
 * scappato, e il browser rilegge esattamente quello che c'era nei file.
 */
export const COPIONE_VISUAL_GLSL =
  "var GLSL = " +
  JSON.stringify(Object.fromEntries(Object.entries(FONTI).map(([k, v]) => [k, perIlBrowser(v)]))) +
  ";\n" +
  "var PRESET_VISUAL = " + JSON.stringify(MANIFESTI) + ";";
