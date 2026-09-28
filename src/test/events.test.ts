import { Matrix4, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { describe, expect, it } from 'vitest';
import { events } from "../core/events";
import { syncCamera } from "../core/sync-camera";

function setup() {
  // map camera, off-centre like a padded map
  const source = new PerspectiveCamera(36.87, 1.6, 20, 50000);
  source.position.set(300, 2500, 1800);
  source.lookAt(0, 0, 0);
  source.updateMatrixWorld();
  source.projectionMatrix.elements[8] = 0.2;

  const camera = new PerspectiveCamera();
  syncCamera(camera, new Matrix4().multiplyMatrices(source.projectionMatrix, source.matrixWorldInverse));

  const rect = { left: 100, top: 50, width: 800, height: 500 };
  const state = {
    camera,
    pointer: new Vector2(),
    raycaster: new Raycaster(),
    size: { width: rect.width, height: rect.height },
    gl: { domElement: { getBoundingClientRect: () => rect } },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compute = events?.({ getState: () => state } as any).compute;
  if (!compute) throw new Error('events should compute rays');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pick = (clientX: number, clientY: number) => compute({ clientX, clientY } as any, state as any);
  return { state, pick, rect, source };
}

describe('events', () => {

  it('measures the pointer against the canvas, whatever element was hit', () => {
    const { state, pick, rect } = setup();
    pick(rect.left, rect.top);
    expect(state.pointer.x).toBeCloseTo(-1);
    expect(state.pointer.y).toBeCloseTo(1);
    pick(rect.left + rect.width * 0.75, rect.top + rect.height * 0.5);
    expect(state.pointer.x).toBeCloseTo(0.5);
    expect(state.pointer.y).toBeCloseTo(0);
  });

  it('casts rays from the eye through the pointer', () => {
    const { state, pick, rect, source } = setup();
    for (const [x, y] of [[0.1, 0.1], [0.5, 0.5], [0.95, 0.9]]) {
      pick(rect.left + rect.width * x, rect.top + rect.height * y);
      const { ray } = state.raycaster;
      // the ray starts on the near plane, and its line passes through the eye...
      const toEye = source.position.clone().sub(ray.origin);
      expect(toEye.clone().cross(ray.direction).length()).toBeLessThan(1e-6);
      expect(toEye.dot(ray.direction)).toBeLessThan(0);
      // ...and whatever it hits projects back under the pointer
      const hit = ray.at(1000, new Vector3()).project(source);
      expect(hit.x).toBeCloseTo(state.pointer.x, 6);
      expect(hit.y).toBeCloseTo(state.pointer.y, 6);
    }
  });

});
