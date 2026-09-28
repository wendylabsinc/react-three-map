import { MathUtils, Vector3Tuple } from "three";
import { Coords } from "./coords";
import { earthRadius } from "../core/earth-radius";
import { mercatorNorthing } from "./coords-to-vector-3";

/**
 * Converts a 3D position vector back to geographic coordinates.
 *
 * This is the inverse operation of {@link coordsToVector3}.
 *
 * The input Vector3Tuple should represent a position in meters where:
 * - X axis points East (positive longitude direction)
 * - Y axis points Up (altitude)
 * - Z axis points South (negative latitude direction)
 *
 * @param position - The 3D position as a Vector3Tuple [x, y, z] in meters
 * @param origin - The origin coordinates used as the reference point
 * @returns Geographic coordinates (latitude, longitude, altitude)
 *
 * @remarks
 * It is the exact inverse of {@link coordsToVector3}: converting coordinates to a position and back
 * returns the same coordinates, at any distance from the origin.
 *
 * @example
 * ```ts
 * import { vector3ToCoords, coordsToVector3 } from '@wendylabsinc/react-three-map/maplibre';
 *
 * const origin = { latitude: 51.5074, longitude: -0.1278 };
 *
 * // Convert a 3D position back to coordinates
 * const position: Vector3Tuple = [100, 50, -200];
 * const coords = vector3ToCoords(position, origin);
 * // Returns { latitude: ~51.509, longitude: ~-0.126, altitude: 50 }
 *
 * // Useful for getting coordinates after user interaction
 * const onDragEnd = (newPosition: Vector3Tuple) => {
 *   const newCoords = vector3ToCoords(newPosition, origin);
 *   console.log(`Moved to: ${newCoords.latitude}, ${newCoords.longitude}`);
 * };
 * ```
 *
 * @see {@link coordsToVector3} for the forward operation
 */
export function vector3ToCoords(position: Vector3Tuple, origin: Coords): Coords {
  const [x, y, z] = position;
  // meters per radian at the origin latitude
  const metersPerRadian = earthRadius * Math.cos(origin.latitude * MathUtils.DEG2RAD);
  const northing = mercatorNorthing(origin.latitude) - z / metersPerRadian;
  const latitude = (2 * Math.atan(Math.exp(northing)) - Math.PI / 2) * MathUtils.RAD2DEG;
  const longitude = origin.longitude + (x / metersPerRadian) * MathUtils.RAD2DEG;
  const altitude = (origin.altitude || 0) + y;
  const coords: Coords = { latitude, longitude, altitude };
  return coords;
}
