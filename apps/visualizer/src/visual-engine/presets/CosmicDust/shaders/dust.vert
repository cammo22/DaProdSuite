precision highp float;

/** x = raggio normalizzato, y = angolo iniziale, z = quota. */
attribute vec3 aSeed;
attribute float aRand;

uniform float uTime;
uniform float uIntensity;
uniform float uBeat;
uniform float uRms;
uniform float uEnergy;
uniform float uCentroid;
uniform float uHeightScale;

uniform float uSize;
uniform float uSpin;
uniform float uSpread;

uniform float uBurst;
uniform float uPulse;
uniform float uShimmer;

uniform sampler2D uSpectrum;

varying vec3 vColor;
varying float vAlpha;

vec3 dustPalette(float t) {
  return vec3(0.3, 0.45, 0.7) + vec3(0.4, 0.32, 0.4) * cos(6.28318 * (t + vec3(0.6, 0.52, 0.4)));
}

void main() {
  float radius = aSeed.x;
  // Ogni particella e' agganciata a una banda: quelle vicine al centro ai gravi.
  float b = texture2D(uSpectrum, vec2(radius, 0.5)).b;

  // A riposo lo spettro e' nullo: un'onda lenta tiene vivo il campo.
  float idle = smoothstep(0.05, 0.0, uEnergy);
  b = max(b, idle * 0.18 * (0.5 + 0.5 * sin(radius * 11.0 - uTime * 0.7)));

  // Rotazione differenziale appena accennata: il movimento vero lo fa la camera,
  // la polvere deve quasi stare ferma.
  float spin = uTime * uSpin * (0.016 + uEnergy * 0.035) / (1.1 + radius);
  float ang = aSeed.y + spin;

  float r = radius * (5.2 + uSpread * 3.0);
  r += uBurst * 0.9 * (0.35 + aRand);
  r += b * uPulse * 0.9;

  float y = aSeed.z * (2.4 + uSpread) + sin(uTime * 0.13 + aRand * 6.28318) * 0.09;

  vec3 pos = vec3(cos(ang) * r, y, sin(ang) * r);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Due bracci a spirale marcati: senza, il campo si legge come una macchia
  // ovale uniforme. Il contrasto fra braccio e vuoto deve essere netto.
  float arm = 0.5 + 0.5 * cos(ang * 2.0 - radius * 8.5 + uTime * 0.04);
  float density = mix(0.08, 1.0, pow(arm, 2.4));
  // Il nucleo resta denso: e' li' che si concentra la materia.
  density = mix(1.0, density, smoothstep(0.05, 0.3, radius));

  float dist = max(-mv.z, 0.5);
  // Una particella su cento e' molto piu' grande: fa da stella in primo piano
  // e da' profondita' al campo.
  float bright = step(0.99, aRand) * 3.2;
  float size = uSize * (0.5 + aRand * 1.0 + bright) * (1.0 + b * 2.4 + uBeat * 0.7 + uShimmer * 0.8);
  gl_PointSize = clamp(size * uHeightScale * 34.0 / dist, 1.0, 110.0);

  // Nucleo caldo al centro, periferia fredda.
  vec3 tint = dustPalette(uCentroid * 0.4 + radius * 0.55 + aRand * 0.1);
  tint = mix(vec3(1.0, 0.86, 0.7), tint, smoothstep(0.05, 0.45, radius));
  vColor = tint * (0.7 + b * 1.8 + bright * 0.35);

  vAlpha = smoothstep(46.0, 3.0, dist)
    * (0.16 + b * 1.1 + uRms * 0.5)
    * mix(density, 1.0, bright)
    * uIntensity;
}
