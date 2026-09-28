import { MathUtils, Matrix4, PerspectiveCamera, Vector3, Vector4 } from "three";

/** projection * view matrix inverted */
const projByViewInv = new Matrix4();
/** camera world matrix */
const pose = new Matrix4();

const eye = new Vector4();
const position = new Vector3();
const forward = new Vector3();
const up = new Vector3();
const right = new Vector3();
const target = new Vector3();

/**
 * Sync a three.js camera with the map camera.
 *
 * `projByView` is the map projection * view matrix, already multiplied by the model matrix of the
 * scene origin, so it maps scene coordinates straight to clip space.
 *
 * The camera ends up with the map's exact eye position and orientation and a canonical perspective
 * projection matrix (with matching `fov`, `aspect`, `near` and `far`).
 * `projectionMatrix * matrixWorldInverse` equals `projByView` up to a positive factor, which
 * renders exactly the same.
 */
export function syncCamera(camera: PerspectiveCamera, projByView: Matrix4) {

  projByViewInv.copy(projByView).invert();

  const isPerspective = decomposePerspective(projByView);
  if (!isPerspective) decomposeFallback();

  pose.makeBasis(right, up, forward.negate()).setPosition(position);
  camera.matrix.copy(pose);
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
  camera.matrixWorld.copy(pose);
  camera.matrixWorldInverse.copy(pose).invert();

  const projection = camera.projectionMatrix.multiplyMatrices(projByView, pose);
  if (isPerspective) normalizePerspective(camera);
  camera.projectionMatrixInverse.copy(projection).invert();

  camera.userData.projByView = projByView.toArray(camera.userData.projByView ?? []);
  camera.userData.projByViewInv = projByViewInv.toArray(camera.userData.projByViewInv ?? []);

}

/**
 * Read the eye and view axes of a perspective projection * view matrix.
 * @returns `false` if the matrix has no finite eye (e.g. an orthographic projection)
 */
function decomposePerspective(projByView: Matrix4): boolean {
  const m = projByView.elements;

  // the `w` row of a perspective projection measures depth along the view axis
  forward.set(m[3], m[7], m[11]);
  if (forward.lengthSq() === 0) return false;

  // the eye is the only point that projects to `x = y = w = 0`
  eye.set(0, 0, 1, 0).applyMatrix4(projByViewInv);
  if (eye.w === 0) return false;
  position.set(eye.x / eye.w, eye.y / eye.w, eye.z / eye.w);
  if (!Number.isFinite(position.x + position.y + position.z)) return false;

  forward.normalize();
  // the `y` row points up on screen, off-centre projections tilt it along the view axis
  up.set(m[1], m[5], m[9]);
  up.addScaledVector(forward, -up.dot(forward)).normalize();
  right.crossVectors(forward, up);
  return true;
}

/** Approximate the camera axes by unprojecting points in front of it */
function decomposeFallback() {
  position.set(0, 0, -1).applyMatrix4(projByViewInv);
  target.set(0, 0, 1).applyMatrix4(projByViewInv);
  forward.subVectors(target, position).normalize();
  up.set(0, 1, -1).applyMatrix4(projByViewInv).sub(position);
  up.addScaledVector(forward, -up.dot(forward)).normalize();
  right.crossVectors(forward, up);
}

/**
 * Scale the projection matrix so that `w` is the view depth, as three.js expects from a perspective
 * camera (`isPerspectiveMatrix`), then read `fov`, `aspect`, `near` and `far` back from it.
 * Scaling a projection matrix doesn't change what it renders.
 */
function normalizePerspective(camera: PerspectiveCamera) {
  const p = camera.projectionMatrix.elements;
  const scale = -p[11];
  if (!(scale > 0)) return;
  for (let i = 0; i < 16; i++) p[i] /= scale;
  p[11] = -1;

  camera.fov = 2 * Math.atan(1 / p[5]) * MathUtils.RAD2DEG;
  camera.aspect = Math.abs(p[5] / p[0]);
  camera.near = p[14] / (p[10] - 1);
  camera.far = p[14] / (p[10] + 1);
}
