import { BufferGeometry, Vector3Tuple, Float32BufferAttribute, Vector3 } from "three";
// three ships Earcut internally; use it for triangulating polygon faces with >3 vertices
// @ts-expect-error Earcut path is provided by three but has no type declarations
import { Earcut } from "three/src/extras/Earcut.js";
import { Coords } from "./coords";
import { coordsToVector3 } from "./coords-to-vector-3";
import { vector3ToCoords } from "./vector-3-to-coords";

/**
 * Represents a 3D geographic coordinate for use in polyhedral surfaces.
 */
export interface GeoVertex {
  longitude: number;
  latitude: number;
  altitude: number;
}

/**
 * Represents a triangular face of a polyhedral surface with geo-coordinates.
 */
export interface GeoTriangle {
  v0: GeoVertex;
  v1: GeoVertex;
  v2: GeoVertex;
}

/**
 * Options for converting BufferGeometry to WKT format.
 */
export interface BufferGeometryToWKTOptions {
  /**
   * The origin coordinates used as reference for converting 3D positions to geo-coordinates.
   * This should match the Canvas or scene origin.
   */
  origin: Coords;

  /**
   * Number of decimal places for coordinates in the WKT output.
   * @defaultValue 8
   */
  precision?: number;
}

/**
 * Options for converting WKT to BufferGeometry.
 */
export interface WKTToBufferGeometryOptions {
  /**
   * The origin coordinates used as reference for converting geo-coordinates to 3D positions.
   * This should match the Canvas or scene origin.
   */
  origin: Coords;
}

const RING_CLOSURE_TOLERANCE = 1e-9;
const MIN_AREA_TOLERANCE = 1e-12;

type EarcutFn = (vertices: number[], holes?: number[], dimensions?: number) => number[];
const earcut: EarcutFn = Earcut.triangulate.bind(Earcut);

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

function verticesEqual(a: GeoVertex, b: GeoVertex, tolerance = RING_CLOSURE_TOLERANCE): boolean {
  return (
    Math.abs(a.longitude - b.longitude) <= tolerance &&
    Math.abs(a.latitude - b.latitude) <= tolerance &&
    Math.abs(a.altitude - b.altitude) <= tolerance
  );
}

function assertFiniteVertex(v: GeoVertex): void {
  if (!isFiniteNumber(v.longitude) || !isFiniteNumber(v.latitude) || !isFiniteNumber(v.altitude)) {
    throw new Error("Encountered non-finite coordinate when building GeoVertex.");
  }
}

function parseVertexStrict(token: string): GeoVertex {
  const parts = token.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length < 3) {
    throw new Error(
      `Invalid coordinate in WKT: expected "longitude latitude altitude" but got "${token}". ` +
      "Each coordinate must have 3 space-separated numeric values."
    );
  }

  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);
  const altitude = Number(parts[2]);

  if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude) || !isFiniteNumber(altitude)) {
    throw new Error(
      `Invalid numeric value in WKT coordinate: "${token}". ` +
      "Longitude, latitude, and altitude must be finite numbers."
    );
  }

  return { longitude, latitude, altitude };
}

function buildPlaneBasis(vertices: Vector3[]): { origin: Vector3; u: Vector3; v: Vector3; normal: Vector3 } {
  const origin = vertices[0].clone();

  let normal = new Vector3();
  for (let i = 1; i < vertices.length - 1; i++) {
    const ab = vertices[i].clone().sub(origin);
    for (let j = i + 1; j < vertices.length; j++) {
      const ac = vertices[j].clone().sub(origin);
      normal = ab.clone().cross(ac);
      if (normal.lengthSq() > MIN_AREA_TOLERANCE) {
        break;
      }
    }
    if (normal.lengthSq() > MIN_AREA_TOLERANCE) {
      break;
    }
  }

  if (normal.lengthSq() <= MIN_AREA_TOLERANCE) {
    throw new Error("Cannot triangulate polygon: vertices are collinear or degenerate.");
  }

  const normalizedNormal = normal.normalize();
  const helperAxis = Math.abs(normalizedNormal.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const u = new Vector3().crossVectors(normalizedNormal, helperAxis).normalize();
  const v = new Vector3().crossVectors(normalizedNormal, u).normalize();

  return { origin, u, v, normal: normalizedNormal };
}

function triangulateFace(vertices: GeoVertex[]): GeoTriangle[] {
  if (vertices.length < 3) {
    throw new Error("Cannot triangulate polygon face: fewer than 3 vertices.");
  }

  // Already a triangle
  if (vertices.length === 3) {
    const a = new Vector3(vertices[0].longitude, vertices[0].latitude, vertices[0].altitude);
    const b = new Vector3(vertices[1].longitude, vertices[1].latitude, vertices[1].altitude);
    const c = new Vector3(vertices[2].longitude, vertices[2].latitude, vertices[2].altitude);
    const area = b.clone().sub(a).cross(c.clone().sub(a)).lengthSq();
    if (area <= MIN_AREA_TOLERANCE) {
      throw new Error("Cannot triangulate polygon face: triangle is degenerate.");
    }
    return [{ v0: vertices[0], v1: vertices[1], v2: vertices[2] }];
  }

  const vectors = vertices.map(
    (v) => new Vector3(v.longitude, v.latitude, v.altitude)
  );
  const { origin, u, v } = buildPlaneBasis(vectors);

  const projected: number[] = [];
  for (const vec of vectors) {
    const relative = vec.clone().sub(origin);
    projected.push(relative.dot(u), relative.dot(v));
  }

  const indices = earcut(projected, undefined, 2);
  if (!indices || indices.length === 0 || indices.length % 3 !== 0) {
    throw new Error("Failed to triangulate polygon face with Earcut.");
  }

  const triangles: GeoTriangle[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i];
    const ib = indices[i + 1];
    const ic = indices[i + 2];
    triangles.push({
      v0: vertices[ia],
      v1: vertices[ib],
      v2: vertices[ic],
    });
  }

  return triangles;
}

function toGeoVertex(tuple: Vector3Tuple, origin: Coords): GeoVertex {
  const coords = vector3ToCoords(tuple, origin);
  const vertex: GeoVertex = {
    longitude: coords.longitude,
    latitude: coords.latitude,
    altitude: coords.altitude ?? 0,
  };
  assertFiniteVertex(vertex);
  return vertex;
}

/**
 * Extracts triangular faces from a BufferGeometry as geographic coordinates.
 *
 * @param geometry - The Three.js BufferGeometry to extract faces from
 * @param origin - The geographic origin for coordinate conversion
 * @returns An array of GeoTriangle objects representing the polyhedral surface
 * @throws Error if BufferGeometry has no position attribute
 *
 * @example
 * ```ts
 * import { extractGeoTriangles } from 'react-three-map/maplibre';
 * import { BoxGeometry } from 'three';
 *
 * const geometry = new BoxGeometry(100, 100, 100);
 * const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };
 * const triangles = extractGeoTriangles(geometry, origin);
 * ```
 */
export function extractGeoTriangles(
  geometry: BufferGeometry,
  origin: Coords
): GeoTriangle[] {
  const triangles: GeoTriangle[] = [];
  const positionAttr = geometry.getAttribute("position");

  if (!positionAttr) {
    throw new Error(
      "BufferGeometry must have a 'position' attribute. " +
      "Ensure the geometry is properly initialized before conversion."
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
    throw new Error(
      "Non-indexed BufferGeometry position array length must be a multiple of 3."
    );
  }

  if (index) {
    // Indexed geometry
    const indices = index.array;
    if (indices.length % 3 !== 0) {
      throw new Error("Indexed BufferGeometry must have indices in multiples of 3.");
    }
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      const v0: Vector3Tuple = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
      const v1: Vector3Tuple = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
      const v2: Vector3Tuple = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

      triangles.push({
        v0: toGeoVertex(v0, origin),
        v1: toGeoVertex(v1, origin),
        v2: toGeoVertex(v2, origin),
      });
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positions.length; i += 9) {
      const v0: Vector3Tuple = [positions[i], positions[i + 1], positions[i + 2]];
      const v1: Vector3Tuple = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const v2: Vector3Tuple = [positions[i + 6], positions[i + 7], positions[i + 8]];

      triangles.push({
        v0: toGeoVertex(v0, origin),
        v1: toGeoVertex(v1, origin),
        v2: toGeoVertex(v2, origin),
      });
    }
  }

  return triangles;
}

/**
 * Converts a BufferGeometry to PostGIS POLYHEDRALSURFACE Z WKT format.
 *
 * This function extracts all triangular faces from the geometry and converts
 * them to geographic coordinates suitable for storage in PostGIS with
 * `geometry(POLYHEDRALSURFACEZ, 4326)` column type.
 *
 * @param geometry - The Three.js BufferGeometry to convert
 * @param options - Conversion options including the geographic origin
 * @returns WKT string in POLYHEDRALSURFACE Z format
 *
 * @remarks
 * The output format is:
 * ```
 * POLYHEDRALSURFACE Z (
 *   ((lng1 lat1 alt1, lng2 lat2 alt2, lng3 lat3 alt3, lng1 lat1 alt1)),
 *   ...
 * )
 * ```
 *
 * Note: PostGIS uses (longitude, latitude, altitude) order (X, Y, Z).
 *
 * @throws Error if BufferGeometry has no position attribute
 * @throws Error if BufferGeometry has no triangular faces
 *
 * @example
 * ```ts
 * import { bufferGeometryToWKT } from 'react-three-map/maplibre';
 * import { BoxGeometry } from 'three';
 *
 * const geometry = new BoxGeometry(100, 100, 100);
 * const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };
 *
 * const wkt = bufferGeometryToWKT(geometry, { origin });
 * // Store in PostGIS: INSERT INTO geofences (geom) VALUES (ST_GeomFromText(wkt, 4326))
 * ```
 *
 * @see {@link wktToBufferGeometry} for the inverse operation
 */
export function bufferGeometryToWKT(
  geometry: BufferGeometry,
  options: BufferGeometryToWKTOptions
): string {
  const { origin, precision = 8 } = options;
  const triangles = extractGeoTriangles(geometry, origin);

  if (triangles.length === 0) {
    throw new Error(
      "BufferGeometry has no triangular faces to convert. " +
      "The geometry must contain indexed triangles or non-indexed vertex triplets."
    );
  }

  const formatCoord = (v: GeoVertex): string => {
    const lng = v.longitude.toFixed(precision);
    const lat = v.latitude.toFixed(precision);
    const alt = v.altitude.toFixed(precision);
    return `${lng} ${lat} ${alt}`;
  };

  const polygons = triangles.map((tri) => {
    // Close the polygon by repeating the first vertex
    const c0 = formatCoord(tri.v0);
    const c1 = formatCoord(tri.v1);
    const c2 = formatCoord(tri.v2);
    return `((${c0}, ${c1}, ${c2}, ${c0}))`;
  });

  return `POLYHEDRALSURFACE Z (${polygons.join(", ")})`;
}

/**
 * Parses a PostGIS POLYHEDRALSURFACE Z WKT string and converts it to a BufferGeometry.
 *
 * @param wkt - The WKT string in POLYHEDRALSURFACE Z format
 * @param options - Conversion options including the geographic origin
 * @returns A Three.js BufferGeometry representing the polyhedral surface
 *
 * @remarks
 * The function expects WKT in the format:
 * ```
 * POLYHEDRALSURFACE Z (
 *   ((lng1 lat1 alt1, lng2 lat2 alt2, lng3 lat3 alt3, lng1 lat1 alt1)),
 *   ...
 * )
 * ```
 *
 * @throws Error if WKT is not in POLYHEDRALSURFACE Z format
 * @throws Error if WKT contains no valid triangular faces
 * @throws Error if coordinate parsing fails
 *
 * @example
 * ```ts
 * import { wktToBufferGeometry } from 'react-three-map/maplibre';
 *
 * const wkt = 'POLYHEDRALSURFACE Z (((-0.1 51.5 0, -0.1 51.6 0, -0.2 51.5 0, -0.1 51.5 0)))';
 * const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };
 *
 * const geometry = wktToBufferGeometry(wkt, { origin });
 * // Use in a mesh:
 * // <mesh geometry={geometry}>
 * //   <meshStandardMaterial />
 * // </mesh>
 * ```
 *
 * @see {@link bufferGeometryToWKT} for the inverse operation
 */
export function wktToBufferGeometry(
  wkt: string,
  options: WKTToBufferGeometryOptions
): BufferGeometry {
  const { origin } = options;
  const triangles = parsePolyhedralSurfaceWKT(wkt);

  if (triangles.length === 0) {
    throw new Error(
      "WKT contains no faces to convert (polyhedral surface is EMPTY or has no valid polygons)."
    );
  }

  // Convert to positions array (non-indexed for simplicity)
  const positions: number[] = [];

  for (const tri of triangles) {
    const p0 = coordsToVector3(tri.v0, origin);
    const p1 = coordsToVector3(tri.v1, origin);
    const p2 = coordsToVector3(tri.v2, origin);

    positions.push(p0[0], p0[1], p0[2]);
    positions.push(p1[0], p1[1], p1[2]);
    positions.push(p2[0], p2[1], p2[2]);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Parses a POLYHEDRALSURFACE Z WKT string into an array of GeoTriangles.
 *
 * @param wkt - The WKT string to parse
 * @returns An array of GeoTriangle objects
 *
 * @internal
 */
export function parsePolyhedralSurfaceWKT(wkt: string): GeoTriangle[] {
  const triangles: GeoTriangle[] = [];

  const trimmed = wkt.trim();
  if (!trimmed) {
    throw new Error("Invalid WKT: empty string.");
  }

  // Strip SRID prefix if present
  const sridMatch = trimmed.match(/^SRID=\d+;([\s\S]*)$/i);
  const wktBody = (sridMatch ? sridMatch[1] : trimmed).trim();

  // Handle EMPTY
  const emptyMatch = wktBody.match(/^POLYHEDRALSURFACE\s*(?:ZM|Z|M)?\s*EMPTY$/i);
  if (emptyMatch) {
    return [];
  }

  const outerMatch = wktBody.match(/^(POLYHEDRALSURFACE)\s*(?:ZM|Z|M)?\s*\(\s*([\s\S]*)\s*\)$/i);
  if (!outerMatch) {
    throw new Error(
      "Invalid WKT format: expected 'POLYHEDRALSURFACE Z (...)'. " +
      `Received: "${wkt.substring(0, 50)}${wkt.length > 50 ? "..." : ""}"`
    );
  }

  const content = outerMatch[2];

  // Match each polygon: ((x y z, x y z, x y z, x y z))
  const polygonRegex = /\(\(\s*([\s\S]*?)\s*\)\)/g;
  let match: RegExpExecArray | null;

  while ((match = polygonRegex.exec(content)) !== null) {
    const rawRing = match[1];

    // Detect interior rings (holes) and bail early – PostGIS supports them but we don't yet.
    const rings = rawRing.split(/\)\s*,\s*\(/);
    if (rings.length > 1) {
      throw new Error("POLYHEDRALSURFACE faces with interior rings are not supported.");
    }

    const coordTokens = rawRing.split(",").map((s) => s.trim()).filter(Boolean);

    // A polygon must have at least 3 unique vertices + closing vertex
    if (coordTokens.length < 4) {
      throw new Error(
        "Each polygon must have at least 4 coordinates (3 vertices + closing point)."
      );
    }

    const vertices = coordTokens.map(parseVertexStrict);

    if (!verticesEqual(vertices[0], vertices[vertices.length - 1])) {
      throw new Error(
        "Invalid polygon ring: first and last coordinates must match to close the ring."
      );
    }

    // Remove closing coordinate for triangulation
    const openVertices = vertices.slice(0, -1);
    openVertices.forEach(assertFiniteVertex);

    triangles.push(...triangulateFace(openVertices));
  }

  return triangles;
}

/**
 * Converts BufferGeometry to a JSON-serializable format for storage.
 *
 * This is an alternative to WKT that preserves the exact triangle structure
 * and can be stored in a JSON/JSONB column.
 *
 * @param geometry - The Three.js BufferGeometry to convert
 * @param origin - The geographic origin for coordinate conversion
 * @returns An array of GeoTriangle objects that can be serialized to JSON
 * @throws Error if geometry has no position attribute
 *
 * @example
 * ```ts
 * import { bufferGeometryToGeoTriangles } from 'react-three-map/maplibre';
 *
 * const triangles = bufferGeometryToGeoTriangles(geometry, origin);
 * const json = JSON.stringify(triangles);
 * // Store in database JSONB column
 * ```
 */
export function bufferGeometryToGeoTriangles(
  geometry: BufferGeometry,
  origin: Coords
): GeoTriangle[] {
  return extractGeoTriangles(geometry, origin);
}

/**
 * Converts an array of GeoTriangles back to a BufferGeometry.
 *
 * @param triangles - Array of GeoTriangle objects
 * @param origin - The geographic origin for coordinate conversion
 * @returns A Three.js BufferGeometry
 * @throws Error if triangles array is empty
 *
 * @example
 * ```ts
 * import { geoTrianglesToBufferGeometry } from 'react-three-map/maplibre';
 *
 * const json = await fetchFromDatabase();
 * const triangles = JSON.parse(json);
 * const geometry = geoTrianglesToBufferGeometry(triangles, origin);
 * ```
 */
export function geoTrianglesToBufferGeometry(
  triangles: GeoTriangle[],
  origin: Coords
): BufferGeometry {
  if (triangles.length === 0) {
    throw new Error(
      "Cannot create BufferGeometry from empty triangles array. " +
      "Provide at least one GeoTriangle."
    );
  }

  const positions: number[] = [];

  for (const tri of triangles) {
    assertFiniteVertex(tri.v0);
    assertFiniteVertex(tri.v1);
    assertFiniteVertex(tri.v2);

    const p0 = coordsToVector3(tri.v0, origin);
    const p1 = coordsToVector3(tri.v1, origin);
    const p2 = coordsToVector3(tri.v2, origin);

    positions.push(p0[0], p0[1], p0[2]);
    positions.push(p1[0], p1[1], p1[2]);
    positions.push(p2[0], p2[1], p2[2]);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return geometry;
}

export interface GeometryValidationOptions {
  /**
   * Tolerance used when comparing edge endpoints for watertightness.
   * @defaultValue 1e-6
   */
  tolerance?: number;
}

export interface GeometryValidationResult {
  isValid: boolean;
  errors: string[];
  triangleCount: number;
  nonManifoldEdgeCount: number;
}

/**
 * Validates that a BufferGeometry is suitable for polyhedral operations.
 * Checks for:
 * - Presence of a position attribute with itemSize 3
 * - Index/position array lengths divisible by 3
 * - Non-degenerate triangles
 * - Watertightness (each edge shared by exactly two triangles) within a tolerance
 *
 * Does not mutate the geometry.
 */
export function validatePolyhedronGeometry(
  geometry: BufferGeometry,
  options?: GeometryValidationOptions
): GeometryValidationResult {
  const errors: string[] = [];
  const tolerance = options?.tolerance ?? 1e-6;

  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) {
    return {
      isValid: false,
      errors: ["BufferGeometry must have a 'position' attribute."],
      triangleCount: 0,
      nonManifoldEdgeCount: 0,
    };
  }

  if (positionAttr.itemSize !== 3) {
    errors.push(
      `Expected position attribute itemSize of 3, received ${positionAttr.itemSize}.`
    );
  }

  const positions = positionAttr.array as ArrayLike<number>;
  if (positions.length % 3 !== 0) {
    errors.push("Position array length must be a multiple of 3.");
  }

  const index = geometry.getIndex();
  if (!index && positions.length % 9 !== 0) {
    errors.push("Non-indexed geometries must have 9 position entries per triangle.");
  }
  if (index && index.array.length % 3 !== 0) {
    errors.push("Indexed geometries must have indices in multiples of 3.");
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      triangleCount: 0,
      nonManifoldEdgeCount: 0,
    };
  }

  const triangles = index ? index.array.length / 3 : positions.length / 9;
  let triangleCount = 0;

  const vertexKey = (x: number, y: number, z: number): string => {
    const inv = 1 / tolerance;
    return `${Math.round(x * inv)},${Math.round(y * inv)},${Math.round(z * inv)}`;
  };

  const vertexIdMap = new Map<string, number>();
  const getVertexId = (x: number, y: number, z: number): number => {
    const key = vertexKey(x, y, z);
    const existing = vertexIdMap.get(key);
    if (existing !== undefined) return existing;
    const id = vertexIdMap.size;
    vertexIdMap.set(key, id);
    return id;
  };

  const edgeCounts = new Map<string, number>();
  const addEdge = (a: number, b: number): void => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  };

  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();

  const processTriangle = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number): void => {
    a.set(ax, ay, az);
    b.set(bx, by, bz);
    c.set(cx, cy, cz);

    const areaSq = b.clone().sub(a).cross(c.clone().sub(a)).lengthSq();
    if (areaSq <= MIN_AREA_TOLERANCE) {
      errors.push("Degenerate triangle detected (zero area).");
      return;
    }

    const aId = getVertexId(ax, ay, az);
    const bId = getVertexId(bx, by, bz);
    const cId = getVertexId(cx, cy, cz);

    addEdge(aId, bId);
    addEdge(bId, cId);
    addEdge(cId, aId);
    triangleCount++;
  };

  if (index) {
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      processTriangle(
        positions[i0], positions[i0 + 1], positions[i0 + 2],
        positions[i1], positions[i1 + 1], positions[i1 + 2],
        positions[i2], positions[i2 + 1], positions[i2 + 2]
      );
    }
  } else {
    for (let i = 0; i < positions.length; i += 9) {
      processTriangle(
        positions[i], positions[i + 1], positions[i + 2],
        positions[i + 3], positions[i + 4], positions[i + 5],
        positions[i + 6], positions[i + 7], positions[i + 8]
      );
    }
  }

  const nonManifoldEdges = Array.from(edgeCounts.values()).filter((c) => c !== 2).length;
  if (nonManifoldEdges > 0) {
    errors.push(`Found ${nonManifoldEdges} non-manifold edges (expected 2 uses per edge).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    triangleCount,
    nonManifoldEdgeCount: nonManifoldEdges,
  };
}
