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
