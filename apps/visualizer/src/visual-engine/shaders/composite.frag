precision highp float;

varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 scene = texture2D(tScene, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 color = scene + bloom * uBloomStrength;

  // Tone map filmico leggero: tiene i picchi sotto controllo senza slavare.
  color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);

  // Vignettatura: aiuta a leggere i controlli sovrapposti in basso.
  vec2 d = vUv - 0.5;
  float vig = 1.0 - dot(d, d) * uVignette;
  color *= clamp(vig, 0.0, 1.0);

  // Grana finissima contro il banding sui gradienti scuri.
  float grain = (hash(vUv * uResolution + uTime) - 0.5) * uGrain;
  color += grain;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
