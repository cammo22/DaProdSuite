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
