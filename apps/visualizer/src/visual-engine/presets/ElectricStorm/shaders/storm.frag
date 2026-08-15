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

/** Posizione orizzontale del tronco della scarica alla quota `drop`. */
float trunkX(float x0, float seed, float t, float drop) {
  float sway = (fbm3(vec2(drop * 3.6 + seed * 13.0, t * 1.4 + seed)) - 0.5) * (0.07 + drop * 0.55);
  float lean = (hash11(seed + 5.0) - 0.5) * drop * 0.7;
  return x0 + sway + lean;
}

/**
 * Scarica verticale dal cielo al suolo.
 * `prog` avanza da 0 a oltre 1 mentre la scarica scende: il tratto sotto il
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
 * L'inizio e la fine sono smussati con smoothstep: tagliare di netto su `local`
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
