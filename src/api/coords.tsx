/**
 * Geographic coordinates representing a position on Earth.
 *
 * @example
 * ```ts
 * const newYork: Coords = {
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   altitude: 10
 * };
 * ```
 */
export interface Coords {
  /**
   * The longitude coordinate in degrees.
   * Valid range: -180 to 180
   */
  longitude: number;

  /**
   * The latitude coordinate in degrees.
   * Valid range: -90 to 90
   */
  latitude: number;

  /**
   * The altitude in meters above sea level.
   * @defaultValue 0
   */
  altitude?: number;
}
