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

  // Bordi tenuti fermi invece che ripiegati: con `fract` il contenuto rientrava
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
