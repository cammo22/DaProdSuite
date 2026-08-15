precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;

  // Profilo gaussiano: niente bordi netti, si sommano bene in additivo.
  float a = exp(-r2 * 15.0);
  gl_FragColor = vec4(vColor * a * vAlpha, a);
}
