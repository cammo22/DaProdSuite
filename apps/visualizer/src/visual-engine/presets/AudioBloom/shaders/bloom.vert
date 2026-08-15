precision highp float;

uniform float uTime;
uniform float uRms;
uniform float uEnergy;
uniform sampler2D uSpectrum;

uniform float uPetals;
uniform float uAmount;
uniform float uSway;

uniform float uSwell;
uniform float uBloomPulse;
uniform float uCurl;

/** Indice del livello: 0, 1, 2. Ogni corolla ruota e si colora diversamente. */
uniform float uLayer;

varying float vR;
varying float vAng;
varying float vBand;

void main() {
  float r0 = length(position.xy);
  float ang = atan(position.y, position.x);

  // Rotazione propria del livello, alternata di verso.
  float dir = mod(uLayer, 2.0) < 0.5 ? 1.0 : -1.0;
  float spin = uTime * (0.32 + uEnergy * 0.55) * dir * (1.0 + uLayer * 0.35);
  float a = ang + spin;

  // La banda letta e' simmetrica rispetto all'asse verticale: la corolla resta bilanciata.
  float bandPos = fract(abs(a) / 3.14159265 + uLayer * 0.17);
  float b = texture2D(uSpectrum, vec2(bandPos, 0.5)).b;

  // Senza musica lo spettro e' piatto a zero e la corolla si chiuderebbe fino a
  // sparire: qui resta aperta e ondeggia, cosi' il preset si puo' guardare
  // anche prima di far partire un brano.
  float idle = smoothstep(0.05, 0.0, uEnergy);
  b = max(b, idle * (0.16 + 0.12 * sin(a * 5.0 + uTime * 1.1)));
  vBand = b;

  // Profilo del petalo.
  float petal = pow(abs(cos(a * uPetals * 0.5)), 1.4);
  // Ondeggio lento, per non lasciare la forma immobile nei passaggi calmi.
  float sway = sin(a * 3.0 + uTime * 2.4) * 0.06 * uSway;

  float radius = r0 * (0.52 + uSwell * 0.16 + uBloomPulse * 0.06)
    + petal * (b * uAmount * 0.55 + 0.05) * r0
    + sway * r0;

  // Arricciatura: i petali si torcono sui medi.
  float twist = uCurl * 0.5 * r0 * r0;
  float finalAng = a + twist;

  vec3 p = vec3(cos(finalAng) * radius, sin(finalAng) * radius, uLayer * -0.01);

  vR = r0;
  vAng = a;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
