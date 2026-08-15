precision highp float;

varying vec2 vUv;

uniform sampler2D tSource;
uniform float uThreshold;
uniform float uKnee;

void main() {
  vec3 color = texture2D(tSource, vUv).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // Ginocchio morbido: evita il bordo netto fra zona in bloom e zona ferma.
  float soft = smoothstep(uThreshold - uKnee, uThreshold + uKnee, luma);
  gl_FragColor = vec4(color * soft, 1.0);
}
