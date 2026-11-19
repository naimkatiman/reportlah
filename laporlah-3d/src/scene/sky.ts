import * as THREE from 'three';

/** Direction toward the sun. Behind and to the road side of the walker, so shadows fall across the walkway. */
export const SUN_DIRECTION = new THREE.Vector3(-0.22, 0.78, -0.58).normalize();

/** Horizon haze colour. The fog uses the same value so distant blocks melt into the sky. */
export const HAZE_SRGB = [0.8, 0.875, 0.925] as const;

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uSun;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return v;
  }
  vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 horizon = lin(vec3(${HAZE_SRGB[0]}, ${HAZE_SRGB[1]}, ${HAZE_SRGB[2]}));
    vec3 mid = lin(vec3(0.42, 0.68, 0.91));
    vec3 zenith = lin(vec3(0.14, 0.41, 0.78));
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.28, h));
    col = mix(col, zenith, smoothstep(0.2, 0.95, h));

    float s = max(dot(d, uSun), 0.0);
    col += vec3(1.0, 0.92, 0.75) * (pow(s, 900.0) * 6.0 + pow(s, 14.0) * 0.28);

    if (d.y > 0.0) {
      vec2 uv = d.xz / (d.y + 0.2) * 0.8 + vec2(uTime * 0.006, 0.0);
      float base = fbm(uv * 1.5);
      float cover = smoothstep(0.52, 0.86, base);
      float shade = smoothstep(0.45, 0.95, fbm(uv * 1.5 + vec2(3.7, 1.3)));
      float fade = smoothstep(0.0, 0.2, d.y);
      vec3 cloud = mix(lin(vec3(1.0, 0.995, 0.98)), lin(vec3(0.72, 0.78, 0.86)), shade * 0.55);
      col = mix(col, cloud, cover * 0.92 * fade);
    }
    if (d.y < 0.0) col = horizon;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface Sky {
  mesh: THREE.Mesh;
  uniforms: { uSun: { value: THREE.Vector3 }; uTime: { value: number } };
  dispose(): void;
}

export function createSky(): Sky {
  const uniforms = { uSun: { value: SUN_DIRECTION.clone() }, uTime: { value: 0 } };
  const geometry = new THREE.SphereGeometry(1, 48, 24);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
