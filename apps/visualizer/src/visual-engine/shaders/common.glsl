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
 * sfalsate. `drift` positivo le fa scendere, negativo salire.
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
