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
