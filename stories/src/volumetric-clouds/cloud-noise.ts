import {
  BufferGeometry, Float32BufferAttribute, LinearFilter, LinearMipmapLinearFilter, Mesh, OrthographicCamera,
  RepeatWrapping, RGBAFormat, Scene, ShaderMaterial, Texture, UnsignedByteType, WebGL3DRenderTarget,
  WebGLRenderTarget, WebGLRenderer,
} from "three";

/**
 * Tileable noise the clouds are carved from, generated once on the GPU:
 * - `shape` (3D): R Perlin-Worley, GBA Worley fBm at increasing frequencies, the cloud body
 * - `detail` (3D): RGB Worley fBm, to erode the edges into wisps and billows
 * - `weather` (2D): R/G large scale Perlin fBm, where clouds gather and where they part
 */
export class CloudNoise {

  readonly shape = new WebGL3DRenderTarget(128, 128, 128, targetOptions());
  readonly detail = new WebGL3DRenderTarget(32, 32, 32, targetOptions());
  readonly weather = new WebGLRenderTarget(512, 512, { ...targetOptions(), generateMipmaps: true, minFilter: LinearMipmapLinearFilter });

  private generated = false;

  constructor() {
    for (const texture of [this.shape.texture, this.detail.texture, this.weather.texture]) {
      setRepeat(texture);
    }
  }

  /** Renders the noise the first time it is called, cheap afterwards */
  generate(gl: WebGLRenderer) {
    if (this.generated) return;
    this.generated = true;

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: NOISE_FRAGMENT,
      uniforms: { uMode: { value: 0 }, uSlice: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new Mesh(fullscreenTriangle(), material);
    quad.frustumCulled = false;
    const scene = new Scene().add(quad);

    const previousTarget = gl.getRenderTarget();
    const volumes: [WebGL3DRenderTarget, number][] = [[this.shape, 0], [this.detail, 1]];
    for (const [target, mode] of volumes) {
      material.uniforms.uMode.value = mode;
      for (let z = 0; z < target.depth; z++) {
        material.uniforms.uSlice.value = (z + 0.5) / target.depth;
        gl.setRenderTarget(target, z);
        gl.render(scene, camera);
      }
    }
    material.uniforms.uMode.value = 2;
    gl.setRenderTarget(this.weather);
    gl.render(scene, camera);
    gl.setRenderTarget(previousTarget);

    material.dispose();
    quad.geometry.dispose();
  }

  dispose() {
    this.shape.dispose();
    this.detail.dispose();
    this.weather.dispose();
  }
}

function targetOptions() {
  return {
    format: RGBAFormat,
    type: UnsignedByteType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
  };
}

function setRepeat(texture: Texture) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  (texture as Texture & { wrapR?: number }).wrapR = RepeatWrapping;
}

/** A triangle that covers the whole screen, cheaper than a quad */
export function fullscreenTriangle() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return geometry;
}

export const FULLSCREEN_VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Tileable Perlin-Worley noise, after Sebastien Hillaire's "Tileable Perlin-Worley 3D"
 * and Andrew Schneider's "Real-Time Volumetric Cloudscapes" (GPU Pro 7).
 */
const NOISE_FRAGMENT = /* glsl */`
precision highp float;
uniform int uMode;
uniform float uSlice;
varying vec2 vUv;

// integer hash by David Hoskins
#define UI0 1597334673U
#define UI1 3812015801U
#define UI3 uvec3(UI0, UI1, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))

vec3 hash33(vec3 p) {
  uvec3 q = uvec3(ivec3(p)) * UI3;
  q = (q.x ^ q.y ^ q.z) * UI3;
  return -1.0 + 2.0 * vec3(q) * UIF;
}

// gradient noise that repeats every freq cells
float gradientNoise(vec3 x, float freq) {
  vec3 p = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 ga = hash33(mod(p + vec3(0.0, 0.0, 0.0), freq));
  vec3 gb = hash33(mod(p + vec3(1.0, 0.0, 0.0), freq));
  vec3 gc = hash33(mod(p + vec3(0.0, 1.0, 0.0), freq));
  vec3 gd = hash33(mod(p + vec3(1.0, 1.0, 0.0), freq));
  vec3 ge = hash33(mod(p + vec3(0.0, 0.0, 1.0), freq));
  vec3 gf = hash33(mod(p + vec3(1.0, 0.0, 1.0), freq));
  vec3 gg = hash33(mod(p + vec3(0.0, 1.0, 1.0), freq));
  vec3 gh = hash33(mod(p + vec3(1.0, 1.0, 1.0), freq));
  float va = dot(ga, w - vec3(0.0, 0.0, 0.0));
  float vb = dot(gb, w - vec3(1.0, 0.0, 0.0));
  float vc = dot(gc, w - vec3(0.0, 1.0, 0.0));
  float vd = dot(gd, w - vec3(1.0, 1.0, 0.0));
  float ve = dot(ge, w - vec3(0.0, 0.0, 1.0));
  float vf = dot(gf, w - vec3(1.0, 0.0, 1.0));
  float vg = dot(gg, w - vec3(0.0, 1.0, 1.0));
  float vh = dot(gh, w - vec3(1.0, 1.0, 1.0));
  return va
    + u.x * (vb - va)
    + u.y * (vc - va)
    + u.z * (ve - va)
    + u.x * u.y * (va - vb - vc + vd)
    + u.y * u.z * (va - vc - ve + vg)
    + u.z * u.x * (va - vb - ve + vf)
    + u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
}

// inverted cellular noise that repeats every freq cells
float worleyNoise(vec3 uv, float freq) {
  vec3 id = floor(uv);
  vec3 p = fract(uv);
  float minDist = 10000.0;
  for (float x = -1.0; x <= 1.0; ++x) {
    for (float y = -1.0; y <= 1.0; ++y) {
      for (float z = -1.0; z <= 1.0; ++z) {
        vec3 offset = vec3(x, y, z);
        vec3 h = hash33(mod(id + offset, vec3(freq))) * 0.5 + 0.5;
        h += offset;
        vec3 d = p - h;
        minDist = min(minDist, dot(d, d));
      }
    }
  }
  return 1.0 - minDist;
}

float perlinFbm(vec3 p, float freq, int octaves) {
  float G = exp2(-0.85);
  float amp = 1.0;
  float noise = 0.0;
  for (int i = 0; i < octaves; ++i) {
    noise += amp * gradientNoise(p * freq, freq);
    freq *= 2.0;
    amp *= G;
  }
  return noise;
}

float worleyFbm(vec3 p, float freq) {
  return worleyNoise(p * freq, freq) * 0.625
    + worleyNoise(p * freq * 2.0, freq * 2.0) * 0.25
    + worleyNoise(p * freq * 4.0, freq * 4.0) * 0.125;
}

float remap(float x, float a, float b, float c, float d) {
  return (((x - a) / (b - a)) * (d - c)) + c;
}

void main() {
  vec3 p = vec3(vUv, uSlice);
  vec4 color = vec4(0.0);

  if (uMode == 0) {
    // cloud body: billowy Perlin, dilated by Worley
    float freq = 4.0;
    float pfbm = mix(1.0, perlinFbm(p, 4.0, 7), 0.5);
    pfbm = abs(pfbm * 2.0 - 1.0);
    color.g = worleyFbm(p, freq);
    color.b = worleyFbm(p, freq * 2.0);
    color.a = worleyFbm(p, freq * 4.0);
    color.r = remap(pfbm, 0.0, 1.0, color.g, 1.0);
  } else if (uMode == 1) {
    // erosion detail
    color.r = worleyFbm(p, 2.0);
    color.g = worleyFbm(p, 4.0);
    color.b = worleyFbm(p, 8.0);
    color.a = 1.0;
  } else {
    // weather: two large scale fields that tile in 2D (the third axis is fixed)
    vec3 q = vec3(vUv, 0.25);
    color.r = clamp(perlinFbm(q, 3.0, 5) * 0.75 + 0.5, 0.0, 1.0);
    color.g = clamp(perlinFbm(q + vec3(0.37, 0.71, 0.5), 5.0, 4) * 0.75 + 0.5, 0.0, 1.0);
    color.b = worleyFbm(q, 3.0);
    color.a = 1.0;
  }

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`;
