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
