import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import {
  Camera, Color, CustomBlending, GLSL3, HalfFloatType, LinearFilter, Material, Matrix4, Mesh, OneFactor,
  OneMinusSrcAlphaFactor, OrthographicCamera, RGBAFormat, Scene, ShaderMaterial, Vector2, Vector3, Vector4,
  WebGLRenderer, WebGLRenderTarget,
} from "three";
import { CloudNoise, FULLSCREEN_VERTEX, fullscreenTriangle } from "./cloud-noise";
import { CLOUDS_FRAGMENT, COMPOSITE_FRAGMENT, MAX_LAYERS, RESOLVE_FRAGMENT } from "./clouds-shader";

/** One layer of clouds, like a layer in a flight simulator weather panel */
export interface CloudLayer {
  enabled?: boolean;
  /** cloud base, in meters above the ground */
  altitude: number;
  /** from base to top, in meters */
  thickness: number;
  /** 0 is clear sky, 1 is overcast */
  coverage: number;
  /** how opaque the clouds are */
  density: number;
  /** 0 flat stratus, 0.5 stratocumulus, 1 towering cumulus */
  type: number;
  /** size of the cloud cells, in meters */
  size: number;
  /** how much the edges break into wisps and billows, 0 to 1 */
  erosion: number;
  /** wind speed at this layer, in meters per second */
  windSpeed: number;
  /** where the wind blows from, in degrees clockwise from north */
  windDirection: number;
}

export interface VolumetricCloudsProps {
  /** up to 4 layers */
  layers: CloudLayer[];
  /** degrees above the horizon */
  sunElevation: number;
  /** degrees clockwise from north */
  sunAzimuth: number;
  /** @defaultValue 1 */
  sunIntensity?: number;
  /** darken the map under the clouds @defaultValue true */
  shadows?: boolean;
  /** 0 to 1 @defaultValue 0.7 */
  shadowStrength?: number;
  /** clouds render at this fraction of the screen resolution @defaultValue 0.5 */
  resolutionScale?: number;
  /** ray march samples per layer @defaultValue 64 */
  steps?: number;
  /** samples towards the sun, for self shadowing @defaultValue 6 */
  lightSteps?: number;
  /** samples per layer for the shadows on the map @defaultValue 8 */
  shadowSteps?: number;
  /** clouds fade out by this distance from the camera, in meters @defaultValue 120 km */
  maxDistance?: number;
  /** radius of the cloud field around the origin, in meters @defaultValue 80 km */
  extent?: number;
  /** speeds up the wind @defaultValue 1 */
  timeScale?: number;
  /** @defaultValue 1 */
  exposure?: number;
  /** average the ray march over several frames, much less noise @defaultValue true */
  temporal?: boolean;
  /** darken the creases between billows when the sun is behind you, 0 to 1 @defaultValue 0.6 */
  powder?: number;
}

const NIGHT_SKY = new Color('#0b1020');
const DAY_SKY = new Color('#9cc3ff');
const SUNSET_SUN = new Color('#ff8a4a');
const NOON_SUN = new Color('#fff4e6');
const color = new Color();

function renderTarget(count = 1) {
  return new WebGLRenderTarget(1, 1, {
    type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, count,
  });
}

/** Renders a material over a whole render target */
class FullscreenPass {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  constructor(readonly material: Material) {
    const quad = new Mesh(fullscreenTriangle(), material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }
  render(gl: WebGLRenderer, target: WebGLRenderTarget) {
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }
}

/**
 * Ray marched volumetric clouds over the map, with the shadows they cast on it.
 *
 * Renders in scene space, so put it straight inside `<Canvas>`: the ground is at `y = 0`.
 */
export const VolumetricClouds = memo<VolumetricCloudsProps>(({
  layers,
  sunElevation,
  sunAzimuth,
  sunIntensity = 1,
  shadows = true,
  shadowStrength = 0.7,
  resolutionScale = 0.5,
  steps = 64,
  lightSteps = 6,
  shadowSteps = 8,
  maxDistance = 120_000,
  extent = 80_000,
  timeScale = 1,
  exposure = 1,
  temporal = true,
  powder = 0.6,
}) => {

  const gl = useThree(s => s.gl);

  const noise = useMemo(() => new CloudNoise(), []);
  // this frame's ray march (colour and depth), and the accumulated result of the previous frames
  const targets = useMemo(() => ({ raw: renderTarget(2), history: [renderTarget(), renderTarget()] }), []);

  const material = useMemo(() => new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: CLOUDS_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uInvViewProj: { value: new Matrix4() },
      uCameraPosition: { value: new Vector3() },
      uSunDirection: { value: new Vector3(0, 1, 0) },
      uSunColor: { value: new Vector3() },
      uSkyColor: { value: new Vector3() },
      uGroundColor: { value: new Vector3() },
      uExposure: { value: 1 },
      uPowder: { value: 0.6 },
      uShapeNoise: { value: noise.shape.texture },
      uDetailNoise: { value: noise.detail.texture },
      uWeather: { value: noise.weather.texture },
      uSteps: { value: 64 },
      uLightSteps: { value: 6 },
      uShadowSteps: { value: 8 },
      uMaxDistance: { value: 120_000 },
      uDetailDistance: { value: 40_000 },
      uExtent: { value: 80_000 },
      uExtinction: { value: 0.04 },
      uGroundAltitude: { value: 0 },
      uFrame: { value: 0 },
      uShadows: { value: 1 },
      uShadowStrength: { value: 0.7 },
      uShadowColor: { value: new Vector3() },
      uLayerCount: { value: 0 },
      uLayerA: { value: Array.from({ length: MAX_LAYERS }, () => new Vector4()) },
      uLayerB: { value: Array.from({ length: MAX_LAYERS }, () => new Vector4()) },
      uLayerC: { value: Array.from({ length: MAX_LAYERS }, () => new Vector4()) },
    },
  }), [noise]);

  const resolve = useMemo(() => new ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: RESOLVE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uCurrent: { value: targets.raw.textures[0] },
      uDepth: { value: targets.raw.textures[1] },
      uHistory: { value: null },
      uInvViewProj: { value: new Matrix4() },
      uPrevViewProj: { value: new Matrix4() },
      uCameraPosition: { value: new Vector3() },
      uTexel: { value: new Vector2() },
      uBlend: { value: 0.12 },
      uReset: { value: 1 },
    },
  }), [targets]);

  const passes = useMemo(() => ({ clouds: new FullscreenPass(material), resolve: new FullscreenPass(resolve) }), [material, resolve]);

  const composite = useMemo(() => new ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    uniforms: { uClouds: { value: null } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // the clouds pass outputs premultiplied colours
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
  }), []);
  const geometry = useMemo(() => fullscreenTriangle(), []);

  useEffect(() => () => {
    noise.dispose();
    targets.raw.dispose();
    targets.history.forEach(target => target.dispose());
    material.dispose();
    resolve.dispose();
    composite.dispose();
    geometry.dispose();
  }, [noise, targets, material, resolve, composite, geometry]);

  const frame = useRef({ index: 0, reset: true, previous: new Matrix4() });

  // accumulated wind offsets of each layer
  const wind = useRef<{ x: number, z: number, dx: number, dz: number }[]>([]);
  const size = useMemo(() => new Vector2(), []);

  useFrame((state, delta) => {
    noise.generate(gl);

    const u = material.uniforms;
    updateCamera(state.camera, u.uInvViewProj.value, u.uCameraPosition.value);

    // sun, sky and ground light
    const elevation = sunElevation * Math.PI / 180;
    const azimuth = sunAzimuth * Math.PI / 180;
    const sun = (u.uSunDirection.value as Vector3).set(
      Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), -Math.cos(azimuth) * Math.cos(elevation),
    ).normalize();
    const day = smoothstep(-0.05, 0.25, sun.y);
    color.lerpColors(SUNSET_SUN, NOON_SUN, smoothstep(0.0, 0.5, sun.y));
    (u.uSunColor.value as Vector3).set(color.r, color.g, color.b).multiplyScalar(20 * sunIntensity * smoothstep(-0.02, 0.08, sun.y));
    color.lerpColors(NIGHT_SKY, DAY_SKY, day);
    (u.uSkyColor.value as Vector3).set(color.r, color.g, color.b).multiplyScalar(0.55 * sunIntensity);
    (u.uGroundColor.value as Vector3).set(color.r, color.g, color.b).multiplyScalar(0.22 * sunIntensity);
    // shadows keep some of the blue sky light
    (u.uShadowColor.value as Vector3).set(0.04, 0.06, 0.11).multiplyScalar(day);

    u.uExposure.value = exposure;
    u.uPowder.value = powder;
    u.uSteps.value = steps;
    u.uLightSteps.value = lightSteps;
    u.uShadowSteps.value = shadowSteps;
    u.uMaxDistance.value = maxDistance;
    u.uDetailDistance.value = maxDistance * 0.4;
    u.uExtent.value = extent;
    u.uShadows.value = shadows ? 1 : 0;
    u.uShadowStrength.value = shadowStrength;

    // layers
    const active = layers.filter(layer => layer.enabled !== false).slice(0, MAX_LAYERS);
    u.uLayerCount.value = active.length;
    active.forEach((layer, i) => {
      const w = wind.current[i] ??= { x: 0, z: 0, dx: 0, dz: 0 };
      // blowing from `windDirection`
      const from = layer.windDirection * Math.PI / 180;
      const vx = -Math.sin(from) * layer.windSpeed, vz = Math.cos(from) * layer.windSpeed;
      const dt = Math.min(delta, 0.1) * timeScale;
      // the clouds drift with the wind, their detail a little faster so they evolve on the way
      w.x -= vx * dt; w.z -= vz * dt;
      w.dx -= vx * dt * 0.4; w.dz -= vz * dt * 0.4;

      (u.uLayerA.value[i] as Vector4).set(layer.altitude, layer.altitude + Math.max(layer.thickness, 10), layer.coverage, layer.density);
      (u.uLayerB.value[i] as Vector4).set(layer.type, layer.erosion, 1 / Math.max(layer.size, 100), 1 / Math.max(layer.size * 0.18, 20));
      (u.uLayerC.value[i] as Vector4).set(w.x, w.z, w.dx, w.dz);
    });

    // render the clouds at a lower resolution
    gl.getDrawingBufferSize(size);
    const width = Math.max(1, Math.round(size.x * resolutionScale));
    const height = Math.max(1, Math.round(size.y * resolutionScale));
    if (targets.raw.width !== width || targets.raw.height !== height) {
      targets.raw.setSize(width, height);
      targets.history.forEach(target => target.setSize(width, height));
      frame.current.reset = true;
    }

    const f = frame.current;
    // a different jitter every frame, averaged out by the resolve pass
    u.uFrame.value = temporal ? f.index % 64 : 0;
    const previousTarget = gl.getRenderTarget();
    passes.clouds.render(gl, targets.raw);

    const [read, write] = f.index % 2 ? targets.history : [targets.history[1], targets.history[0]];
    const r = resolve.uniforms;
    r.uHistory.value = read.texture;
    r.uInvViewProj.value.copy(u.uInvViewProj.value);
    r.uCameraPosition.value.copy(u.uCameraPosition.value);
    r.uTexel.value.set(1 / width, 1 / height);
    r.uReset.value = f.reset || !temporal ? 1 : 0;
    r.uPrevViewProj.value.copy(f.previous);
    passes.resolve.render(gl, write);
    gl.setRenderTarget(previousTarget);

    composite.uniforms.uClouds.value = write.texture;
    f.previous.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
    f.reset = false;
    f.index++;
  });

  return <mesh geometry={geometry} material={composite} frustumCulled={false} renderOrder={1e9} />
});
VolumetricClouds.displayName = 'VolumetricClouds';

function updateCamera(camera: Camera, invViewProj: Matrix4, position: Vector3) {
  invViewProj.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
  position.setFromMatrixPosition(camera.matrixWorld);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}
