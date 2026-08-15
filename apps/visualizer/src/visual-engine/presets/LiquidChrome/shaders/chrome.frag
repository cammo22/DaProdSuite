uniform float uFlow;
uniform float uRoughness;
uniform float uTint;
uniform float uDrops;

uniform float uSwell;
uniform float uShine;
uniform float uRipple;
uniform float uSplash;

/**
 * Punti in cui qualcosa cade sul metallo.
 *
 * Quattro impatti a posizione libera, non su griglia: con le celle l'onda
 * veniva troncata sul proprio bordo e si vedeva una scacchiera di linee dritte.
 * Ogni impatto ha il suo ciclo, e quando si spegne il successivo rinasce altrove.
 * Restituisce (deformazione della superficie, cresta dell'onda).
 */
vec2 impacts(vec2 p, float t) {
  float h = 0.0;
  float crest = 0.0;

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float cycle = t * (0.22 + fi * 0.045) + fi * 0.37;
    float slot = floor(cycle);
    float phase = fract(cycle);

    vec2 pos = (hash22(vec2(slot * 7.3 + fi * 19.0, slot * 3.1 + fi)) - 0.5)
      * vec2(2.2 * uAspect, 1.9);

    float d = length(p - pos);
    float radius = phase * 1.15;
    float wave = sin((d - radius) * 12.0) * exp(-abs(d - radius) * 3.5);
    float decay = (1.0 - phase) * (1.0 - phase);

    h += wave * decay * 0.09;
    crest += smoothstep(0.05, 0.0, abs(d - radius)) * decay;
  }

  return vec2(h, crest);
}

/**
 * Superficie del metallo fuso.
 *
 * Torna il fbm a cinque ottave dell'originale: e' il dettaglio fine a dare al
 * cromo il suo aspetto, appiattirlo lo trasformava in nuvole molli. Sopra ci
 * stanno due treni di creste lente, che tengono insieme la lettura di mare.
 */
float surface(vec2 p, float t) {
  vec2 warp = vec2(
    fbm3(p * 1.1 + vec2(t, -t * 0.7)),
    fbm3(p * 1.1 + vec2(4.2 - t, t * 0.5))
  );
  float h = fbm(p * 1.6 + warp * (1.4 + uSwell * 1.6) + vec2(0.0, t * 0.6));

  h += sin(p.y * 2.4 + t * 1.5 + warp.x * 2.0) * 0.1 * (0.5 + uSwell * 0.8);
  h += sin(p.x * 1.6 + p.y * 1.1 - t * 1.1) * 0.05;
  return h;
}

float height(vec2 p, float t) {
  float h = surface(p, t);
  h += impacts(p, t).x * uDrops;

  // Cerchi concentrici dal centro a ogni transiente.
  float d = length(p);
  h += sin(d * 9.0 - uTime * 3.2) * uRipple * 0.09 * exp(-d * 0.9);
  h += sin(d * 14.0 - uTime * 5.0) * uSplash * 0.05 * exp(-d * 1.3);
  return h;
}

void main() {
  vec2 p = centered() * 1.25;
  float t = uTime * 0.14 * uFlow;

  // Passo della differenza legato alla risoluzione: la normale segue il
  // dettaglio del cromo invece di spianarlo.
  float e = 7.2 / max(uResolution.y, 1.0);
  float h = height(p, t);
  float hx = height(p + vec2(e, 0.0), t);
  float hy = height(p + vec2(0.0, e), t);
  vec3 n = normalize(vec3((h - hx) / e, (h - hy) / e, 1.0));

  vec3 viewDir = normalize(vec3(p * 0.55, 1.6));
  vec3 refl = reflect(-viewDir, n);

  // Ambiente finto: bande orizzontali chiare e scure, come una sala riflessa.
  // Sono loro a disegnare il cromo, per questo restano nette.
  float bands = 0.5 + 0.5 * sin(refl.y * 5.5 + uTime * 0.2);
  bands = mix(bands, smoothstep(0.2, 0.85, bands), 1.0 - uRoughness);
  float horizon = smoothstep(-0.35, 0.75, refl.y);

  vec3 metal = mix(vec3(0.06, 0.08, 0.13), vec3(0.85, 0.92, 1.0), bands * horizon);
  metal *= 0.55 + uShine * 1.3;

  // Tinta: dal cromo neutro al viola/azzurro dei token interfaccia.
  vec3 col = mix(metal, metal * paletteCold(uCentroid * 0.6 + 0.15) * 2.0, uTint);

  // Fresnel: i bordi obliqui restano sempre luminosi.
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  col += paletteCold(uCentroid + 0.4) * fresnel * (0.5 + uShine);

  // Riflesso speculare stretto che si accende sui picchi.
  float spec = pow(max(refl.z, 0.0), 24.0 + (1.0 - uRoughness) * 60.0);
  col += vec3(1.0, 0.98, 0.95) * spec * (0.4 + uPeak * 2.2);

  // Cresta dell'onda d'impatto: un anello di luce che corre verso l'esterno.
  float crest = impacts(p, t).y * uDrops;
  col += mix(vec3(1.0), paletteCold(uCentroid + 0.2), 0.45) * crest * (0.25 + uShine * 0.9);

  // Vena luminosa nei solchi profondi.
  col += paletteCold(0.75) * smoothstep(0.62, 0.28, h) * uSwell * 0.5;

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
