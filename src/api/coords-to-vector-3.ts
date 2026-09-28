import { MathUtils, Vector3Tuple } from 'three';
import { Coords } from './coords';
import { earthRadius } from "../core/earth-radius";

/**
 * Calculates the average Mercator scale factor between two latitudes.
 *
 * @param originLat - The origin latitude in degrees
 * @param pointLat - The target point latitude in degrees
 * @param _steps - Unused, the average is exact
 * @returns The average Mercator scale factor
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function averageMercatorScale(originLat: number, pointLat: number, _steps?: number): number {
  const delta = (pointLat - originLat) * MathUtils.DEG2RAD;
  if (Math.abs(delta) < 1e-12) return 1 / Math.cos(originLat * MathUtils.DEG2RAD);
  return (mercatorNorthing(pointLat) - mercatorNorthing(originLat)) / delta;
}

/**
 * Mercator northing of a latitude, in radians of arc along the equator.
 * @internal
 */
export function mercatorNorthing(latitude: number): number {
  return Math.log(Math.tan(Math.PI / 4 + latitude * MathUtils.DEG2RAD / 2));
}

/**
 * Converts geographic coordinates to a 3D position vector relative to an origin point.
 *
 * The resulting Vector3Tuple represents the position in meters where:
 * - X axis points East (positive longitude direction)
 * - Y axis points Up (altitude)
 * - Z axis points South (negative latitude direction)
 *
 * The horizontal position is exact in the map's Mercator projection, with the scale of the origin
 * (the same space `<Canvas>` renders in), so it lines up with the map at any distance.
 *
 * @param point - The geographic coordinates to convert
 * @param origin - The origin coordinates used as the reference point (typically the Canvas position)
 * @returns A Vector3Tuple [x, y, z] representing the 3D position in meters
 *
 * @remarks
 * Only the position is converted: objects placed far from the origin keep the scale of the origin,
 * and Mercator scale grows towards the poles. At country-level distances that difference becomes
 * noticeable, use the {@link Coordinates} component there.
 *
 * @example
 * ```ts
 * import { coordsToVector3 } from '@wendylabsinc/react-three-map/maplibre';
 *
 * const origin = { latitude: 51.5074, longitude: -0.1278 }; // London
 * const point = { latitude: 51.5080, longitude: -0.1270, altitude: 50 };
 *
 * const position = coordsToVector3(point, origin);
 * // Returns approximately [55.4, 50, -66.7] (meters from origin)
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
  // meters per radian at the origin latitude
  const metersPerRadian = earthRadius * Math.cos(origin.latitude * MathUtils.DEG2RAD);
  const x = (point.longitude - origin.longitude) * MathUtils.DEG2RAD * metersPerRadian;
  const y = (point.altitude || 0) - (origin.altitude || 0);
  const z = -(mercatorNorthing(point.latitude) - mercatorNorthing(origin.latitude)) * metersPerRadian;
  return [x, y, z] as Vector3Tuple;
}
