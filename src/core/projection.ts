import { MathUtils, Matrix4, Matrix4Tuple } from "three";
import { Coords } from "../api/coords";
import { earthRadius } from "./earth-radius";

/**
 * Frame the map provider expects globe geometry in.
 * - `maplibre`: unit sphere, `+Y` towards the north pole.
 * - `mapbox`: ECEF sphere of radius `8192 / 2π`, `+Y` towards the south pole.
 */
export type GlobeFrame = 'maplibre' | 'mapbox';

/** How the map provider projects the world in the frame being rendered. */
export interface ProjectionState {
  /** clip space ← Mercator coordinates (0..1) */
  mercatorMatrix: Matrix4Tuple;
  /** clip space ← globe space, `null` while the map renders flat */
  globeMatrix: Matrix4Tuple | null;
  /** `0` is flat Mercator, `1` is a globe, anything in between is a transition */
  globeness: number;
  /** frame `globeMatrix` expects its input in */
  globeFrame: GlobeFrame;
}

/** Mapbox sizes its ECEF globe to match a tile of `8192` units */
const MAPBOX_GLOBE_RADIUS = 8192 / Math.PI / 2;

type MatrixLike = ArrayLike<number>;

interface MaplibreRenderInput {
  defaultProjectionData: {
    mainMatrix: MatrixLike;
    fallbackMatrix?: MatrixLike;
    projectionTransition?: number;
  };
}

/** MapLibre >= 5 keeps the exact globe transition on its style projection */
interface MaplibreProjectionSource {
  style?: { projection?: { transitionState?: unknown } };
}

export function createProjectionState(): ProjectionState {
  return {
    mercatorMatrix: newMatrixTuple(),
    globeMatrix: null,
    globeness: 0,
    globeFrame: 'maplibre',
  };
}

/**
 * Reads the arguments of a custom layer `render` call into `state`.
 *
 * - MapLibre >= 5: `render(gl, { defaultProjectionData, ... })`
 * - MapLibre 4: `render(gl, mercatorMatrix)`
 * - Mapbox >= 2.9: `render(gl, mercatorMatrix, projection, globeToMercatorMatrix, transition)`
 */
export function readRenderArgs(
  state: ProjectionState,
  args: readonly unknown[],
  map?: object,
): ProjectionState {
  const [input, projection, globeToMercator, transition] = args;

  if (isMaplibreRenderInput(input)) {
    const data = input.defaultProjectionData;
    const isGlobe = (data.projectionTransition ?? 0) > 0;
    copyMatrix(state.mercatorMatrix, isGlobe && data.fallbackMatrix ? data.fallbackMatrix : data.mainMatrix);
    state.globeFrame = 'maplibre';
    if (isGlobe) {
      state.globeMatrix = copyMatrix(state.globeMatrix ?? newMatrixTuple(), data.mainMatrix);
      // custom layers get `projectionTransition: 1` for the whole globe range,
      // while the tiles blend into Mercator (by default between zoom 10 and 12)
      const transitionState = (map as MaplibreProjectionSource | undefined)?.style?.projection?.transitionState;
      state.globeness = typeof transitionState === 'number' ? transitionState : 1;
    } else {
      state.globeMatrix = null;
      state.globeness = 0;
    }
    return state;
  }

  copyMatrix(state.mercatorMatrix, input as MatrixLike);
  state.globeFrame = 'mapbox';
  if (isGlobeProjection(projection) && isMatrixLike(globeToMercator)) {
    // Mapbox fades the globe into Mercator (by default between zoom 5 and 6)
    const globeness = 1 - (typeof transition === 'number' ? transition : 0);
    if (globeness > 0) {
      mx.fromArray(state.mercatorMatrix).multiply(mx2.fromArray(globeToMercator));
      state.globeMatrix = mx.toArray(state.globeMatrix ?? newMatrixTuple());
      state.globeness = globeness;
      return state;
    }
  }
  state.globeMatrix = null;
  state.globeness = 0;
  return state;
}

/**
 * Model matrix of a local frame in globe space, where `+X` points east, `+Y` up and `+Z` south
 * and one unit is one meter.
 */
export function globeModelMatrix(
  { longitude, latitude, altitude = 0 }: Coords,
  frame: GlobeFrame,
  target = new Matrix4(),
): Matrix4 {
  const lng = longitude * MathUtils.DEG2RAD;
  const lat = latitude * MathUtils.DEG2RAD;
  const sinLng = Math.sin(lng), cosLng = Math.cos(lng);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat);

  // MapLibre: unit sphere with +Y north, Mapbox: GLOBE_RADIUS sphere with +Y south
  const radius = frame === 'mapbox' ? MAPBOX_GLOBE_RADIUS : 1;
  const ySign = frame === 'mapbox' ? -1 : 1;
  const unitsPerMeter = radius / earthRadius;
  const distance = radius + altitude * unitsPerMeter;

  const upX = cosLat * sinLng, upY = ySign * sinLat, upZ = cosLat * cosLng;
  const eastX = cosLng, eastY = 0, eastZ = -sinLng;
  const southX = sinLat * sinLng, southY = -ySign * cosLat, southZ = sinLat * cosLng;

  const s = unitsPerMeter;
  return target.set(
    eastX * s, upX * s, southX * s, upX * distance,
    eastY * s, upY * s, southY * s, upY * distance,
    eastZ * s, upZ * s, southZ * s, upZ * distance,
    0, 0, 0, 1,
  );
}

/**
 * Projection-view-model matrix for a local frame.
 *
 * @param mercatorModel - the frame's model matrix in Mercator space (see `coordsToMatrix`)
 * @param coords - the frame's coordinates, needed while the map renders a globe
 */
export function projectionViewModel(
  state: ProjectionState,
  mercatorModel: Matrix4Tuple,
  coords: Coords,
  target = new Matrix4(),
): Matrix4 {
  target.fromArray(state.mercatorMatrix).multiply(mx.fromArray(mercatorModel));
  const { globeMatrix, globeness } = state;
  if (!globeMatrix || globeness <= 0) return target;

  globeModelMatrix(coords, state.globeFrame, mx);
  mx.premultiply(mx2.fromArray(globeMatrix));
  if (globeness >= 1) return target.copy(mx);

  // the providers blend both projections linearly in clip space
  const out = target.elements, globe = mx.elements;
  for (let i = 0; i < 16; i++) out[i] = out[i] * (1 - globeness) + globe[i] * globeness;
  return target;
}

const mx = new Matrix4();
const mx2 = new Matrix4();

function isMaplibreRenderInput(input: unknown): input is MaplibreRenderInput {
  return typeof input === 'object' && input !== null && 'defaultProjectionData' in input;
}

function isGlobeProjection(projection: unknown): boolean {
  return typeof projection === 'object' && projection !== null
    && (projection as { name?: unknown }).name === 'globe';
}

function isMatrixLike(value: unknown): value is MatrixLike {
  return typeof value === 'object' && value !== null && (value as MatrixLike).length === 16;
}

function newMatrixTuple(): Matrix4Tuple {
  return new Matrix4().toArray();
}

function copyMatrix(target: Matrix4Tuple, source: MatrixLike): Matrix4Tuple {
  for (let i = 0; i < 16; i++) target[i] = source[i];
  return target;
}
