/**
 * @packageDocumentation
 * Lets the MapLibre camera go below the ground.
 */

/**
 * Options for {@link allowUndergroundCamera} and {@link UndergroundCamera}.
 */
export interface UndergroundCameraOptions {
  /**
   * Lowest altitude the camera can reach, in meters above sea level.
   * @defaultValue -Infinity
   */
  minAltitude?: number;
}

interface CameraLngLat { lng: number; lat: number }

/** The part of MapLibre's transform the camera constraint reads */
interface CameraTransform {
  getCameraAltitude(): number;
  getCameraLngLat(): CameraLngLat;
  center: CameraLngLat;
  elevation: number;
}

type CameraConstraint = (transform: CameraTransform) => { pitch?: number; zoom?: number };

/** MapLibre >= 5 keeps the camera above the ground (or terrain) with this constraint */
interface ConstrainedMap {
  _elevateCameraIfInsideTerrain?: CameraConstraint;
  calculateCameraOptionsFromTo(
    from: CameraLngLat, altitudeFrom: number, to: CameraLngLat, altitudeTo?: number,
  ): { pitch?: number; zoom?: number };
}

const CONSTRAINT = '_elevateCameraIfInsideTerrain';

/**
 * Let the MapLibre camera go below the ground, or below terrain.
 *
 * MapLibre >= 5 accepts a `maxPitch` of up to 180 degrees, but pushes the camera back above the
 * ground whenever it would end up below it. This lifts that constraint so you can look up at the
 * map from underground, or fly through tunnels, pipes and other underground assets.
 *
 * Combine it with:
 * - `maxPitch` above 90 to look up from below the map.
 * - `centerClampedToGround={false}` and `map.setCenterElevation(meters)` to orbit around a point
 *   below the ground.
 *
 * It is not available with Mapbox, which caps the pitch at 85 degrees and keeps its camera above
 * the terrain.
 *
 * @remarks
 * This replaces a private MapLibre method (`_elevateCameraIfInsideTerrain`, MapLibre 5), and does
 * nothing (with a warning) on versions that don't have it.
 *
 * @param map - the MapLibre map
 * @returns a function that restores MapLibre's default behaviour
 *
 * @example
 * ```tsx
 * const map = useMap(); // inside <Canvas>
 * useEffect(() => allowUndergroundCamera(map, { minAltitude: -500 }), [map]);
 * ```
 *
 * @see {@link UndergroundCamera} for the component version
 */
export function allowUndergroundCamera(
  map: object,
  { minAltitude = -Infinity }: UndergroundCameraOptions = {},
): () => void {
  const target = map as ConstrainedMap;
  const original = target[CONSTRAINT];
  if (typeof original !== 'function') {
    console.warn('allowUndergroundCamera: this MapLibre version has no camera constraint to lift, it needs MapLibre >= 5');
    return () => undefined;
  }

  const hadOwnConstraint = Object.prototype.hasOwnProperty.call(target, CONSTRAINT);
  const constraint: CameraConstraint = (transform) => {
    if (!(transform.getCameraAltitude() < minAltitude)) return {};
    // same correction MapLibre applies, but with our floor instead of the ground
    const { pitch, zoom } = target.calculateCameraOptionsFromTo(
      transform.getCameraLngLat(), minAltitude, transform.center, transform.elevation,
    );
    return { pitch, zoom };
  };
  target[CONSTRAINT] = constraint;

  return () => {
    // someone else replaced it in the meantime, leave theirs alone
    if (target[CONSTRAINT] !== constraint) return;
    if (hadOwnConstraint) target[CONSTRAINT] = original;
    else delete target[CONSTRAINT];
  };
}
