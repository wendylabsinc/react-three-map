import { Matrix4, OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from 'vitest';
import { syncCamera } from "../core/sync-camera";

/** a camera like the one a map provider builds: off-centre perspective looking down at the map */
function mapCamera() {
  const camera = new PerspectiveCamera(36.87, 1.6, 12, 90000);
  camera.position.set(1200, 3400, 2500);
  camera.lookAt(100, 0, -300);
  camera.updateMatrixWorld();
  // map padding shifts the centre of perspective
  camera.projectionMatrix.elements[8] = 0.1;
  camera.projectionMatrix.elements[9] = -0.05;
  return camera;
}

/**
 * Map providers work in their own units, so the matrix they hand over scales view space,
 * and it is only defined up to a positive factor.
 */
function mapMatrix(camera: PerspectiveCamera | OrthographicCamera, unitsPerMeter = 1, factor = 1) {
  const view = new Matrix4().makeScale(unitsPerMeter, unitsPerMeter, unitsPerMeter).multiply(camera.matrixWorldInverse);
  return new Matrix4().multiplyMatrices(camera.projectionMatrix, view).multiplyScalar(factor);
}

function expectProportional(actual: Matrix4, expected: Matrix4) {
  const ratio = expected.elements[15] !== 0
    ? expected.elements[15] / actual.elements[15]
    : expected.elements[11] / actual.elements[11];
  expect(ratio).toBeGreaterThan(0);
  actual.elements.forEach((value, i) => expect(value * ratio).toBeCloseTo(expected.elements[i], 6));
}

function expectVectorClose(actual: Vector3, expected: Vector3, precision = 6) {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
}

describe('syncCamera', () => {

  it('recovers the exact eye and view direction', () => {
    const source = mapCamera();
    const camera = new PerspectiveCamera();
    syncCamera(camera, mapMatrix(source, 0.004, 3));

    expectVectorClose(camera.position, source.position);
    expectVectorClose(camera.getWorldDirection(new Vector3()), source.getWorldDirection(new Vector3()));
    // world up stays up on screen
    expect(new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).y).toBeGreaterThan(0);
  });

  it('keeps `projectionMatrix * matrixWorldInverse` equal to the map matrix', () => {
    const source = mapCamera();
    const matrix = mapMatrix(source, 0.004, 3);
    const camera = new PerspectiveCamera();
    syncCamera(camera, matrix);

    const projByView = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    expectProportional(projByView, matrix);
    expect(new Matrix4().fromArray(camera.userData.projByView)).toEqual(matrix);
    const identity = new Matrix4().fromArray(camera.userData.projByViewInv).multiply(matrix);
    identity.elements.forEach((v, i) => expect(v).toBeCloseTo(new Matrix4().elements[i], 9));
  });

  it('builds a canonical perspective projection with matching fov, aspect, near and far', () => {
    const source = mapCamera();
    const camera = new PerspectiveCamera();
    syncCamera(camera, mapMatrix(source, 0.004, 3));

    // three.js `isPerspectiveMatrix` checks for this
    expect(camera.projectionMatrix.elements[11]).toBe(-1);
    expect(camera.projectionMatrix.elements[15]).toBeCloseTo(0, 12);
    expect(camera.fov).toBeCloseTo(36.87, 9);
    expect(camera.aspect).toBeCloseTo(1.6, 9);
    // the map units don't leak into the scene, which is in meters
    expect(camera.near).toBeCloseTo(12 / 0.004, 4);
    expect(camera.far).toBeCloseTo(90000 / 0.004, 1);
    expect(camera.projectionMatrix.elements[8]).toBeCloseTo(0.1, 9);
    expect(camera.projectionMatrix.elements[9]).toBeCloseTo(-0.05, 9);
  });

  it('handles cameras looking up from below the ground', () => {
    const source = new PerspectiveCamera(36.87, 1.6, 1, 10000);
    source.position.set(0, -300, 400);
    source.lookAt(0, 50, 0);
    source.updateMatrixWorld();
    const camera = new PerspectiveCamera();
    syncCamera(camera, mapMatrix(source));

    expectVectorClose(camera.position, source.position);
    expectVectorClose(camera.getWorldDirection(new Vector3()), source.getWorldDirection(new Vector3()));
  });

  it('falls back to unprojecting for orthographic projections', () => {
    const source = new OrthographicCamera(-800, 800, 500, -500, 1, 10000);
    source.position.set(0, 3000, 3000);
    source.lookAt(0, 0, 0);
    source.updateMatrixWorld();
    const matrix = mapMatrix(source);
    const camera = new PerspectiveCamera();
    syncCamera(camera, matrix);

    expectVectorClose(camera.getWorldDirection(new Vector3()), source.getWorldDirection(new Vector3()));
    const projByView = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    projByView.elements.forEach((v, i) => expect(v).toBeCloseTo(matrix.elements[i], 9));
  });

});
