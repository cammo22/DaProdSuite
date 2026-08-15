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
 * netto su `q.x` disegnerebbe una riga dritta sullo schermo, che e' esattamente
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
