precision highp float;

uniform float uIntensity;
uniform float uCentroid;
uniform float uBeat;
uniform float uLayer;

varying float vR;
varying float vAng;
varying float vBand;

vec3 petalPalette(float t) {
  return vec3(0.42, 0.3, 0.6) + vec3(0.45, 0.4, 0.4) * cos(6.28318 * (t + vec3(0.05, 0.28, 0.58)));
}

void main() {
  // Corpo pieno verso l'interno e bordo acceso, ma con la transizione lunga:
  // con un bordo stretto i tre livelli additivi facevano frange di colore dure.
  float body = smoothstep(0.02, 0.3, vR) * smoothstep(1.02, 0.5, vR);
  float rim = smoothstep(0.55, 1.0, vR);

  // Sfasature di tinta piccole fra un livello e l'altro: cosi' i colori si
  // fondono invece di sovrapporsi a contrasto.
  vec3 color = petalPalette(uCentroid * 0.45 + vAng / 6.28318 * 0.25 + uLayer * 0.07);
  float amount = (body * 0.5 + rim * 0.7) * (0.2 + vBand * 1.5) * (1.0 + uBeat * 0.4);

  gl_FragColor = vec4(color * amount * uIntensity, amount);
}
