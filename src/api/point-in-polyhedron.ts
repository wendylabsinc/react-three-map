import { BufferGeometry, Vector3, Vector3Tuple, Ray, Triangle } from "three";
import { Coords } from "./coords";
import { coordsToVector3 } from "./coords-to-vector-3";
import { GeoTriangle, GeoVertex } from "./polyhedral-surface";

/**
 * Result of a point-in-polyhedron test.
 */
export interface PointInPolyhedronResult {
  /**
   * Whether the point is inside the polyhedron.
   */
  inside: boolean;

  /**
   * Whether the point lies on the surface (within tolerance).
   */
  onBoundary?: boolean;

  /**
   * The number of ray-triangle intersections found.
   * An odd number indicates the point is inside.
   */
  intersectionCount: number;
}

const RAY_DIRECTION = new Vector3(1, 0.0001, 0.0001).normalize();
const RAY_EPSILON = 1e-12;
const BOUNDARY_TOLERANCE = 1e-3;

/**
 * Tests whether a 3D point is inside a closed polyhedron using ray casting.
 *
 * This implements the ray casting algorithm: cast a ray from the point in
 * an arbitrary direction and count how many times it intersects the surface.
 * If the count is odd, the point is inside; if even, it's outside.
 *
 * @param point - The 3D point to test as a Vector3Tuple [x, y, z]
 * @param geometry - The BufferGeometry representing the closed polyhedron
 * @returns A PointInPolyhedronResult with the test result
 *
 * @remarks
 * The geometry must represent a closed (watertight) surface for accurate results.
 * Open surfaces or surfaces with holes may produce incorrect results.
 *
 * @throws Error if BufferGeometry has no position attribute
 *
 * @example
 * ```ts
 * import { isPointInPolyhedron } from '@wendylabsinc/react-three-map/maplibre';
 * import { BoxGeometry } from 'three';
 *
 * const box = new BoxGeometry(100, 100, 100);
 * const pointInside: Vector3Tuple = [10, 10, 10];
 * const pointOutside: Vector3Tuple = [200, 200, 200];
 *
 * isPointInPolyhedron(pointInside, box).inside; // true
 * isPointInPolyhedron(pointOutside, box).inside; // false
 * ```
 */
export function isPointInPolyhedron(
  point: Vector3Tuple,
  geometry: BufferGeometry
): PointInPolyhedronResult {
  const origin = new Vector3(point[0], point[1], point[2]);

  // Use a direction that's unlikely to be parallel to edges
  const ray = new Ray(origin, RAY_DIRECTION);

  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) {
    throw new Error(
      "BufferGeometry must have a 'position' attribute for point-in-polyhedron testing. " +
      "Ensure the geometry is properly initialized."
    );
  }

  if (positionAttr.itemSize !== 3) {
    throw new Error(
      `Expected position attribute itemSize of 3, received ${positionAttr.itemSize}. ` +
      "BufferGeometry must contain 3D positions."
    );
  }

  const positions = positionAttr.array as Float32Array;
  const index = geometry.getIndex();

  if (!index && positions.length % 3 !== 0) {
    throw new Error("Non-indexed BufferGeometry position array length must be a multiple of 3.");
  }

  if (index && index.array.length % 3 !== 0) {
    throw new Error("Indexed BufferGeometry must have indices in multiples of 3.");
  }

  if (isPointOnSurface(point, geometry, BOUNDARY_TOLERANCE)) {
    return { inside: true, intersectionCount: 0, onBoundary: true };
  }

  let intersectionCount = 0;
  const triangle = new Triangle();
  const target = new Vector3();

  if (index) {
    // Indexed geometry
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      triangle.a.set(positions[i0], positions[i0 + 1], positions[i0 + 2]);
      triangle.b.set(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      triangle.c.set(positions[i2], positions[i2 + 1], positions[i2 + 2]);

      if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, target)) {
        // Check if intersection is in the positive direction
        if (target.clone().sub(origin).dot(RAY_DIRECTION) > RAY_EPSILON) {
          intersectionCount++;
        }
      }
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positions.length; i += 9) {
      triangle.a.set(positions[i], positions[i + 1], positions[i + 2]);
      triangle.b.set(positions[i + 3], positions[i + 4], positions[i + 5]);
      triangle.c.set(positions[i + 6], positions[i + 7], positions[i + 8]);

      if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, target)) {
        // Check if intersection is in the positive direction
        if (target.clone().sub(origin).dot(RAY_DIRECTION) > RAY_EPSILON) {
          intersectionCount++;
        }
      }
    }
  }

  return {
    inside: intersectionCount % 2 === 1,
    intersectionCount,
    onBoundary: false,
  };
}

/**
 * Tests whether a geographic coordinate is inside a geo-polyhedron.
 *
 * This is the geographic version of {@link isPointInPolyhedron}, accepting
 * coordinates in latitude/longitude/altitude format.
 *
 * @param coords - The geographic coordinates to test
 * @param geometry - The BufferGeometry representing the closed polyhedron (in 3D space relative to origin)
 * @param origin - The geographic origin used for coordinate conversion
 * @returns A PointInPolyhedronResult with the test result
 *
 * @example
 * ```ts
 * import { isCoordsInPolyhedron } from '@wendylabsinc/react-three-map/maplibre';
 *
 * const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };
 * const testPoint = { latitude: 51.5080, longitude: -0.1270, altitude: 25 };
 *
 * const result = isCoordsInPolyhedron(testPoint, geofenceGeometry, origin);
 * if (result.inside) {
 *   console.log('Point is inside the geofence');
 * }
 * ```
 */
export function isCoordsInPolyhedron(
  coords: Coords,
  geometry: BufferGeometry,
  origin: Coords
): PointInPolyhedronResult {
  const point = coordsToVector3(coords, origin);
  return isPointInPolyhedron(point, geometry);
}

/**
 * Tests whether a geographic coordinate is inside a polyhedron defined by GeoTriangles.
 *
 * This is useful when you have the polyhedron stored as GeoTriangles (e.g., from a database)
 * and want to test containment without first converting to BufferGeometry.
 *
 * @param coords - The geographic coordinates to test
 * @param triangles - Array of GeoTriangle objects defining the closed surface
 * @param origin - The geographic origin used for coordinate conversion
 * @returns A PointInPolyhedronResult with the test result
 *
 * @example
 * ```ts
 * import { isCoordsInGeoTriangles } from '@wendylabsinc/react-three-map/maplibre';
 *
 * // Triangles loaded from database
 * const triangles = JSON.parse(storedGeoJson);
 * const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };
 * const testPoint = { latitude: 51.5080, longitude: -0.1270, altitude: 25 };
 *
 * const result = isCoordsInGeoTriangles(testPoint, triangles, origin);
 * ```
 */
export function isCoordsInGeoTriangles(
  coords: Coords,
  triangles: GeoTriangle[],
  origin: Coords
): PointInPolyhedronResult {
  const point = coordsToVector3(coords, origin);
  return isPointInGeoTriangles(point, triangles, origin);
}

/**
 * Tests whether a 3D point is inside a polyhedron defined by GeoTriangles.
 *
 * @param point - The 3D point to test as a Vector3Tuple [x, y, z]
 * @param triangles - Array of GeoTriangle objects defining the closed surface
 * @param origin - The geographic origin used for coordinate conversion
 * @returns A PointInPolyhedronResult with the test result
 */
export function isPointInGeoTriangles(
  point: Vector3Tuple,
  triangles: GeoTriangle[],
  origin: Coords
): PointInPolyhedronResult {
  const originVec = new Vector3(point[0], point[1], point[2]);

  // Use a direction that's unlikely to be parallel to edges
  const ray = new Ray(originVec, RAY_DIRECTION);

  let intersectionCount = 0;
  const target = new Vector3();
  const closestPoint = new Vector3();
  const triangle = new Triangle();

  const geoVertexToVector3 = (v: GeoVertex): Vector3 => {
    const pos = coordsToVector3(v, origin);
    return new Vector3(pos[0], pos[1], pos[2]);
  };

  for (const tri of triangles) {
    const a = geoVertexToVector3(tri.v0);
    const b = geoVertexToVector3(tri.v1);
    const c = geoVertexToVector3(tri.v2);

    triangle.a.copy(a);
    triangle.b.copy(b);
    triangle.c.copy(c);

    triangle.closestPointToPoint(originVec, closestPoint);
    if (originVec.distanceTo(closestPoint) <= BOUNDARY_TOLERANCE) {
      return { inside: true, intersectionCount: 0, onBoundary: true };
    }

    if (ray.intersectTriangle(a, b, c, false, target)) {
      // Check if intersection is in the positive direction
      if (target.clone().sub(originVec).dot(RAY_DIRECTION) > RAY_EPSILON) {
        intersectionCount++;
      }
    }
  }

  return {
    inside: intersectionCount % 2 === 1,
    intersectionCount,
    onBoundary: false,
  };
}

/**
 * Tests whether a 3D point is on the surface of a polyhedron (within a tolerance).
 *
 * @param point - The 3D point to test as a Vector3Tuple [x, y, z]
 * @param geometry - The BufferGeometry representing the polyhedron
 * @param tolerance - Distance tolerance in the same units as the geometry (default: 0.001)
 * @returns true if the point is within tolerance of any surface
 * @throws Error if BufferGeometry has no position attribute
 *
 * @example
 * ```ts
 * import { isPointOnSurface } from '@wendylabsinc/react-three-map/maplibre';
 * import { BoxGeometry } from 'three';
 *
 * const box = new BoxGeometry(100, 100, 100);
 * isPointOnSurface([50, 0, 0], box, 0.1); // true - on surface
 * isPointOnSurface([0, 0, 0], box, 0.1);  // false - at center
 * ```
 */
export function isPointOnSurface(
  point: Vector3Tuple,
  geometry: BufferGeometry,
  tolerance: number = 0.001
): boolean {
  const testPoint = new Vector3(point[0], point[1], point[2]);
  const positionAttr = geometry.getAttribute("position");

  if (!positionAttr) {
    throw new Error(
      "BufferGeometry must have a 'position' attribute for surface testing. " +
      "Ensure the geometry is properly initialized."
    );
  }

  const positions = positionAttr.array as Float32Array;
  const index = geometry.getIndex();
  const triangle = new Triangle();
  const closestPoint = new Vector3();

  if (index) {
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      triangle.a.set(positions[i0], positions[i0 + 1], positions[i0 + 2]);
      triangle.b.set(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      triangle.c.set(positions[i2], positions[i2 + 1], positions[i2 + 2]);

      triangle.closestPointToPoint(testPoint, closestPoint);
      if (testPoint.distanceTo(closestPoint) <= tolerance) {
        return true;
      }
    }
  } else {
    for (let i = 0; i < positions.length; i += 9) {
      triangle.a.set(positions[i], positions[i + 1], positions[i + 2]);
      triangle.b.set(positions[i + 3], positions[i + 4], positions[i + 5]);
      triangle.c.set(positions[i + 6], positions[i + 7], positions[i + 8]);

      triangle.closestPointToPoint(testPoint, closestPoint);
      if (testPoint.distanceTo(closestPoint) <= tolerance) {
        return true;
      }
    }
  }

  return false;
}
