precision highp float;

varying vec2 vUv;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float uMix;   // 0 = solo tFrom, 1 = solo tTo
uniform int uMode;    // 0 sfaldamento, 1 zoom blur, 2 onda, 3 fasce
uniform float uTime;
uniform vec2 uResolution;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Rumore valore con interpolazione morbida: la soglia dello sfaldamento deve
// muoversi a macchie, non a pixel isolati.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 zoomSample(sampler2D tex, vec2 uv, float strength) {
  vec2 center = uv - 0.5;
  vec3 acc = vec3(0.0);
  const int STEPS = 8;
  for (int i = 0; i < STEPS; i++) {
    float t = float(i) / float(STEPS - 1);
    vec2 p = 0.5 + center * (1.0 + strength * t);
    acc += texture2D(tex, clamp(p, 0.0, 1.0)).rgb;
  }
  return acc / float(STEPS);
}

void main() {
  vec3 from = texture2D(tFrom, vUv).rgb;
  vec3 to = texture2D(tTo, vUv).rgb;
  vec3 result;

  if (uMode == 1) {
    // Zoom blur: chi esce si allarga, chi entra arriva da dentro.
    float k = sin(uMix * PI) * 0.35;
    vec3 a = zoomSample(tFrom, vUv, k);
    vec3 b = zoomSample(tTo, vUv, -k);
    result = mix(a, b, smoothstep(0.0, 1.0, uMix));

  } else if (uMode == 2) {
    // Onda: un fronte circolare parte dal centro, deforma cio' che attraversa
    // e si lascia dietro il preset nuovo.
    vec2 c = vUv - 0.5;
    float d = length(c);
    vec2 dir = c / max(d, 1e-4);

    float front = uMix * 1.15;
    float ring = exp(-abs(d - front) * 13.0);
    // Increspatura sul fronte: e' quella che fa sembrare un'onda e non un cerchio.
    vec2 push = dir * ring * 0.05 * sin((d - front) * 42.0);

    vec3 a = texture2D(tFrom, clamp(vUv + push, 0.0, 1.0)).rgb;
    vec3 b = texture2D(tTo, clamp(vUv + push, 0.0, 1.0)).rgb;

    result = mix(a, b, smoothstep(front, front - 0.16, d));
    result += vec3(0.45, 0.7, 1.0) * ring * 0.45 * sin(uMix * PI);

  } else if (uMode == 3) {
    // Fasce: il fotogramma si spezza in strisce che scivolano di lato e passano
    // una alla volta, con i canali RGB sfasati sul momento del cambio.
    const float ROWS = 15.0;
    float row = floor(vUv.y * ROWS);
    float rnd = hash(vec2(row, 3.7));
    float dir = rnd > 0.5 ? 1.0 : -1.0;

    // Ogni striscia scorre e torna: massimo scarto a meta' transizione.
    float travel = dir * (1.0 - abs(uMix * 2.0 - 1.0)) * 0.22 * (0.4 + rnd);
    vec2 uvS = clamp(vec2(vUv.x + travel, vUv.y), 0.0, 1.0);

    // Le strisce non cambiano tutte insieme: l'ordine e' casuale.
    float take = smoothstep(rnd * 0.75, rnd * 0.75 + 0.25, uMix);
    float shift = (1.0 - abs(uMix * 2.0 - 1.0)) * 0.006;

    vec3 a, b;
    a.r = texture2D(tFrom, clamp(uvS + vec2(shift, 0.0), 0.0, 1.0)).r;
    a.g = texture2D(tFrom, uvS).g;
    a.b = texture2D(tFrom, clamp(uvS - vec2(shift, 0.0), 0.0, 1.0)).b;
    b.r = texture2D(tTo, clamp(uvS + vec2(shift, 0.0), 0.0, 1.0)).r;
    b.g = texture2D(tTo, uvS).g;
    b.b = texture2D(tTo, clamp(uvS - vec2(shift, 0.0), 0.0, 1.0)).b;

    result = mix(a, b, take);
    // Bordo acceso sulla striscia che sta cambiando proprio adesso.
    result += vec3(0.6, 0.85, 1.0) * (1.0 - abs(take * 2.0 - 1.0)) * 0.12;

  } else {
    // Sfaldamento: soglia rumorosa che avanza, con bordo luminoso.
    float n = noise(vUv * 9.0 + uTime * 0.15);
    float edge = smoothstep(uMix - 0.16, uMix + 0.16, n);
    result = mix(to, from, edge);
    float rim = 1.0 - abs(edge - 0.5) * 2.0;
    result += vec3(0.35, 0.75, 1.0) * pow(rim, 6.0) * 0.5 * (1.0 - abs(uMix * 2.0 - 1.0));
  }

  gl_FragColor = vec4(result, 1.0);
}
