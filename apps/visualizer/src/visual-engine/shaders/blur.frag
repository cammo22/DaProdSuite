precision highp float;

varying vec2 vUv;

uniform sampler2D tSource;
uniform vec2 uDirection; // (texelX, 0) oppure (0, texelY)

/*
 * Gaussiana a 9 tap approssimata con 5 campioni bilineari.
 * Offset e pesi sono costanti letterali per restare compatibili con GLSL ES 1.00.
 */
void main() {
  vec3 acc = texture2D(tSource, vUv).rgb * 0.2270270270;

  vec2 d1 = uDirection * 1.3846153846;
  acc += texture2D(tSource, vUv + d1).rgb * 0.3162162162;
  acc += texture2D(tSource, vUv - d1).rgb * 0.3162162162;

  vec2 d2 = uDirection * 3.2307692308;
  acc += texture2D(tSource, vUv + d2).rgb * 0.0702702703;
  acc += texture2D(tSource, vUv - d2).rgb * 0.0702702703;

  gl_FragColor = vec4(acc, 1.0);
}
