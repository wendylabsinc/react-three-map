import { BufferGeometry, Vector3Tuple, Float32BufferAttribute } from "three";
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

  const positions = positionAttr.array as Float32Array;
  const index = geometry.getIndex();

  if (index) {
    // Indexed geometry
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      const v0: Vector3Tuple = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
      const v1: Vector3Tuple = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
      const v2: Vector3Tuple = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

      triangles.push({
        v0: vector3ToCoords(v0, origin),
        v1: vector3ToCoords(v1, origin),
        v2: vector3ToCoords(v2, origin),
      });
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positions.length; i += 9) {
      const v0: Vector3Tuple = [positions[i], positions[i + 1], positions[i + 2]];
      const v1: Vector3Tuple = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const v2: Vector3Tuple = [positions[i + 6], positions[i + 7], positions[i + 8]];

      triangles.push({
        v0: vector3ToCoords(v0, origin),
        v1: vector3ToCoords(v1, origin),
        v2: vector3ToCoords(v2, origin),
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
      "WKT contains no valid triangular faces. " +
      "Each polygon must have at least 4 coordinates (3 vertices + closing point)."
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

  // Remove the type prefix and outer parentheses
  const normalized = wkt.trim().toUpperCase();

  if (!normalized.startsWith("POLYHEDRALSURFACE Z") && !normalized.startsWith("POLYHEDRALSURFACE")) {
    throw new Error(
      "Invalid WKT format: expected 'POLYHEDRALSURFACE Z (...)'. " +
      `Received: "${wkt.substring(0, 50)}${wkt.length > 50 ? '...' : ''}"`
    );
  }

  // Extract content between outer parentheses
  const outerMatch = wkt.match(/POLYHEDRALSURFACE\s*Z?\s*\(\s*([\s\S]*)\s*\)$/i);
  if (!outerMatch) {
    throw new Error(
      "Invalid WKT: could not parse POLYHEDRALSURFACE content. " +
      "Check for matching parentheses and proper formatting."
    );
  }

  const content = outerMatch[1];

  // Match each polygon: ((x y z, x y z, x y z, x y z))
  const polygonRegex = /\(\(\s*([^)]+)\s*\)\)/g;
  let match;

  while ((match = polygonRegex.exec(content)) !== null) {
    const coordStr = match[1];
    const coords = coordStr.split(",").map((s) => s.trim());

    // A triangle has 4 points (first repeated at end to close)
    if (coords.length < 4) {
      continue; // Skip invalid polygons
    }

    const parseVertex = (s: string): GeoVertex => {
      const parts = s.split(/\s+/).filter((p) => p.length > 0);
      if (parts.length < 3) {
        throw new Error(
          `Invalid coordinate in WKT: expected "longitude latitude altitude" but got "${s}". ` +
          "Each coordinate must have 3 space-separated numeric values."
        );
      }
      return {
        longitude: parseFloat(parts[0]),
        latitude: parseFloat(parts[1]),
        altitude: parseFloat(parts[2]),
      };
    };

    triangles.push({
      v0: parseVertex(coords[0]),
      v1: parseVertex(coords[1]),
      v2: parseVertex(coords[2]),
    });
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
