import { MercatorCoordinate } from "maplibre-gl";
import { MathUtils, Matrix4, Matrix4Tuple, Vector3, Vector4 } from "three";
import { describe, expect, it } from 'vitest';
import { coordsToMatrix } from "../core/coords-to-matrix";
import { earthRadius } from "../core/earth-radius";
import { createProjectionState, globeModelMatrix, projectionViewModel, readRenderArgs } from "../core/projection";

const coords = { latitude: 51.5074, longitude: -0.1278, altitude: 25 };

function expectMatrixClose(actual: Matrix4, expected: Matrix4, precision = 12) {
  actual.elements.forEach((value, i) => expect(value).toBeCloseTo(expected.elements[i], precision));
}

/** deterministic matrix full of distinct values */
function sampleMatrix(seed: number): Matrix4Tuple {
  return Array.from({ length: 16 }, (_, i) => Math.sin(seed * 12.9898 + i * 78.233) * 10) as Matrix4Tuple;
}

describe('globeModelMatrix', () => {

  it('matches MapLibre `getMatrixForModel` for its unit sphere', () => {
    // vertical_perspective_transform.ts `getMatrixForModel`
    const lng = coords.longitude * MathUtils.DEG2RAD;
    const lat = coords.latitude * MathUtils.DEG2RAD;
    const scale = 1 / earthRadius;
    const expected = new Matrix4().makeRotationY(lng)
      .multiply(new Matrix4().makeRotationX(-lat))
      .multiply(new Matrix4().makeTranslation(0, 0, 1 + coords.altitude / earthRadius))
      .multiply(new Matrix4().makeRotationX(Math.PI * 0.5))
      .multiply(new Matrix4().makeScale(scale, scale, scale));

    expectMatrixClose(globeModelMatrix(coords, 'maplibre'), expected, 15);
  });

  it('places the local frame on the Mapbox globe at the map centre', () => {
    // `calculateGlobePosMatrix` and `globeToMercatorMatrix` from mapbox-gl with the map centred on `coords`
    const EXTENT = 8192;
    const worldSize = 512 * 2 ** 4;
    const center = MercatorCoordinate.fromLngLat([coords.longitude, coords.latitude]);
    const globeMatrix = new Matrix4()
      .makeTranslation(center.x * worldSize, center.y * worldSize, -worldSize / (2 * Math.PI))
      .multiply(new Matrix4().makeScale(worldSize / EXTENT, worldSize / EXTENT, worldSize / EXTENT))
      .multiply(new Matrix4().makeRotationX(-coords.latitude * MathUtils.DEG2RAD))
      .multiply(new Matrix4().makeRotationY(-coords.longitude * MathUtils.DEG2RAD));
    const globeToMercator = new Matrix4().makeScale(1 / worldSize, 1 / worldSize, 1 / worldSize).multiply(globeMatrix);

    const model = globeToMercator.multiply(globeModelMatrix({ ...coords, altitude: 0 }, 'mapbox'));

    const origin = new Vector4(0, 0, 0, 1).applyMatrix4(model);
    expect(origin.x).toBeCloseTo(center.x, 12);
    expect(origin.y).toBeCloseTo(center.y, 12);
    expect(origin.z).toBeCloseTo(0, 12);

    // one meter in any direction, at globe scale: x east, y up, z south
    const meter = 1 / (2 * Math.PI * earthRadius);
    const east = new Vector4(1, 0, 0, 0).applyMatrix4(model);
    const up = new Vector4(0, 1, 0, 0).applyMatrix4(model);
    const south = new Vector4(0, 0, 1, 0).applyMatrix4(model);
    [[east, [meter, 0, 0]], [up, [0, 0, meter]], [south, [0, meter, 0]]].forEach(([axis, expected]) => {
      const [x, y, z] = expected as number[];
      const v = axis as Vector4;
      expect(v.x / meter).toBeCloseTo(x / meter, 9);
      expect(v.y / meter).toBeCloseTo(y / meter, 9);
      expect(v.z / meter).toBeCloseTo(z / meter, 9);
    });
  });

  it('keeps one unit per meter and points up away from the Earth centre', () => {
    for (const frame of ['maplibre', 'mapbox'] as const) {
      const radius = frame === 'mapbox' ? 8192 / Math.PI / 2 : 1;
      const model = globeModelMatrix(coords, frame);
      const origin = new Vector3().applyMatrix4(model);
      const top = new Vector3(0, 1000, 0).applyMatrix4(model);
      const side = new Vector3(1000, 0, 1000).applyMatrix4(model);
      expect(origin.length() / radius * earthRadius).toBeCloseTo(earthRadius + coords.altitude, 6);
      expect(top.length() / radius * earthRadius).toBeCloseTo(earthRadius + coords.altitude + 1000, 6);
      expect(side.distanceTo(origin) / radius * earthRadius).toBeCloseTo(Math.SQRT2 * 1000, 6);
    }
  });

});

describe('readRenderArgs', () => {

  const mercator = sampleMatrix(1);
  const globe = sampleMatrix(2);
  const globeToMercator = sampleMatrix(3);

  it('reads MapLibre >= 5 in Mercator', () => {
    const state = readRenderArgs(createProjectionState(), [{
      defaultProjectionData: { mainMatrix: new Float64Array(mercator), fallbackMatrix: new Float64Array(mercator), projectionTransition: 0 },
    }]);
    expect(state.mercatorMatrix).toEqual(mercator);
    expect(state.globeMatrix).toBeNull();
    expect(state.globeness).toBe(0);
  });

  it('reads the MapLibre >= 5 globe and its exact transition', () => {
    const args = [{
      defaultProjectionData: { mainMatrix: new Float32Array(globe), fallbackMatrix: new Float64Array(mercator), projectionTransition: 1 },
    }];
    const state = readRenderArgs(createProjectionState(), args, { style: { projection: { transitionState: 0.25 } } });
    expect(state.mercatorMatrix).toEqual(mercator);
    expect(state.globeMatrix).toEqual(Array.from(new Float32Array(globe)));
    expect(state.globeness).toBe(0.25);
    expect(state.globeFrame).toBe('maplibre');

    // without access to the style projection, trust the layer input
    expect(readRenderArgs(createProjectionState(), args).globeness).toBe(1);
  });

  it('reads MapLibre 4 and Mapbox in Mercator', () => {
    const state = readRenderArgs(createProjectionState(), [mercator]);
    expect(state.mercatorMatrix).toEqual(mercator);
    expect(state.globeMatrix).toBeNull();
    expect(state.globeness).toBe(0);
  });

  it('reads the Mapbox globe', () => {
    const state = readRenderArgs(createProjectionState(), [mercator, { name: 'globe' }, globeToMercator, 0.3, [0.5, 0.5], 1]);
    const expected = new Matrix4().fromArray(mercator).multiply(new Matrix4().fromArray(globeToMercator));
    expect(state.globeMatrix).toEqual(expected.toArray());
    expect(state.globeness).toBeCloseTo(0.7, 12);
    expect(state.globeFrame).toBe('mapbox');

    // fully blended into Mercator
    const flat = readRenderArgs(state, [mercator, { name: 'globe' }, globeToMercator, 1]);
    expect(flat.globeMatrix).toBeNull();
    expect(flat.globeness).toBe(0);
  });

});

describe('projectionViewModel', () => {

  const origin = coordsToMatrix({ ...coords, fromLngLat: MercatorCoordinate.fromLngLat });
  const mercatorPvm = () => new Matrix4().fromArray(sampleMatrix(1)).multiply(new Matrix4().fromArray(origin));
  const globePvm = () => new Matrix4().fromArray(sampleMatrix(2)).multiply(globeModelMatrix(coords, 'maplibre'));

  const state = (globeness: number) => {
    const s = createProjectionState();
    s.mercatorMatrix = sampleMatrix(1);
    s.globeMatrix = globeness > 0 ? sampleMatrix(2) : null;
    s.globeness = globeness;
    return s;
  }

  it('uses the Mercator model matrix while flat', () => {
    expectMatrixClose(projectionViewModel(state(0), origin, coords), mercatorPvm());
  });

  it('uses the globe model matrix on a globe', () => {
    expectMatrixClose(projectionViewModel(state(1), origin, coords), globePvm());
  });

  it('blends both while transitioning', () => {
    const blended = mercatorPvm().multiplyScalar(0.75);
    const globe = globePvm().multiplyScalar(0.25).elements;
    blended.elements.forEach((_, i) => blended.elements[i] += globe[i]);
    expectMatrixClose(projectionViewModel(state(0.25), origin, coords), blended);
  });

});
