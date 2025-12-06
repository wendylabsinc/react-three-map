import { MathUtils, Vector3Tuple } from 'three';
import { Coords } from './coords';
import { earthRadius } from "../core/earth-radius";

const mercatorScaleLookup: { [key: number]: number } = {};

function getMercatorScale(lat: number): number {
  const index = Math.round(lat * 1000);
  if (mercatorScaleLookup[index] === undefined) {
    mercatorScaleLookup[index] = 1 / Math.cos(lat * MathUtils.DEG2RAD);
  }
  return mercatorScaleLookup[index];
}

/**
 * Calculates the average Mercator scale factor between two latitudes.
 *
 * This is used internally by {@link coordsToVector3} to improve accuracy
 * when converting coordinates that are far apart in latitude.
 *
 * @param originLat - The origin latitude in degrees
 * @param pointLat - The target point latitude in degrees
 * @param steps - Number of steps for numerical integration
 * @returns The average Mercator scale factor
 *
 * @internal
 */
export function averageMercatorScale(originLat: number, pointLat: number, steps = 10): number {
  let totalScale = 0;
  const latStep = (pointLat - originLat) / steps;
  for (let i = 0; i <= steps; i++) {
    const lat = originLat + latStep * i;
    totalScale += getMercatorScale(lat);
  }
  return totalScale / (steps + 1);
}

/**
 * Converts geographic coordinates to a 3D position vector relative to an origin point.
 *
 * The resulting Vector3Tuple represents the position in meters where:
 * - X axis points East (positive longitude direction)
 * - Y axis points Up (altitude)
 * - Z axis points South (negative latitude direction)
 *
 * This function applies Mercator scale correction for improved accuracy at different latitudes.
 *
 * @param point - The geographic coordinates to convert
 * @param origin - The origin coordinates used as the reference point (typically the Canvas position)
 * @returns A Vector3Tuple [x, y, z] representing the 3D position in meters
 *
 * @remarks
 * This function works well at city-level distances. At country-level distances,
 * scale distortion from the Mercator projection becomes noticeable.
 * For large distances, consider using the {@link Coordinates} component instead.
 *
 * @example
 * ```ts
 * import { coordsToVector3 } from '@wendylabsinc/react-three-map/maplibre';
 *
 * const origin = { latitude: 51.5074, longitude: -0.1278 }; // London
 * const point = { latitude: 51.5080, longitude: -0.1270, altitude: 50 };
 *
 * const position = coordsToVector3(point, origin);
 * // Returns approximately [55.6, 50, -66.7] (meters from origin)
 *
 * // Use in a component
 * <mesh position={position}>
 *   <sphereGeometry args={[10]} />
 * </mesh>
 * ```
 *
 * @see {@link vector3ToCoords} for the inverse operation
 * @see {@link NearCoordinates} for a component wrapper around this function
 */
export function coordsToVector3(point: Coords, origin: Coords): Vector3Tuple {
  const latitudeDiff = (point.latitude - origin.latitude) * MathUtils.DEG2RAD;
  const longitudeDiff = (point.longitude - origin.longitude) * MathUtils.DEG2RAD;
  const altitudeDiff = (point.altitude || 0) - (origin.altitude || 0);

  const x = longitudeDiff * earthRadius * Math.cos(origin.latitude * MathUtils.DEG2RAD);
  const y = altitudeDiff;

  // dynamic step size based on latitude difference. calculate the mercator unit scale at origin
  // and the scale average along the line to the point for better accuracy far from origin
  const steps = Math.ceil(Math.abs(point.latitude - origin.latitude)) * 100 + 1;
  const avgScale = averageMercatorScale(origin.latitude, point.latitude, steps);

  const z = ((-latitudeDiff * earthRadius) / getMercatorScale(origin.latitude)) * avgScale;
  return [x, y, z] as Vector3Tuple;
}
