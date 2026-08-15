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
