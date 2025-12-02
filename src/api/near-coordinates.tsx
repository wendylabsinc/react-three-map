import { memo, useMemo } from "react";
import { useCoords } from "../core/use-coords";
import { CoordinatesProps } from "./coordinates";
import { coordsToVector3 } from "./coords-to-vector-3";

/**
 * A lightweight component that positions children at geographic coordinates near the Canvas origin.
 *
 * This component uses {@link coordsToVector3} internally to convert geographic coordinates
 * to a 3D position offset. Unlike {@link Coordinates}, it doesn't create a separate scene,
 * making it more performant but less accurate at very long distances.
 *
 * @remarks
 * **When to use NearCoordinates vs Coordinates:**
 *
 * - Use `NearCoordinates` for objects within city-level distances (up to ~100km)
 * - Use `Coordinates` for objects at country-level or global distances
 *
 * The key difference is that `NearCoordinates` applies only a translation (position offset)
 * without adjusting the scale, while `Coordinates` creates a properly scaled scene at each location.
 *
 * @example
 * ```tsx
 * import { Canvas, NearCoordinates } from 'react-three-map/maplibre';
 *
 * function CityMarkers() {
 *   const locations = [
 *     { name: 'Point A', lat: 51.5074, lng: -0.1278 },
 *     { name: 'Point B', lat: 51.5080, lng: -0.1200 },
 *     { name: 'Point C', lat: 51.5100, lng: -0.1300 },
 *   ];
 *
 *   return (
 *     <Canvas latitude={51.5074} longitude={-0.1278}>
 *       {locations.map((loc) => (
 *         <NearCoordinates
 *           key={loc.name}
 *           latitude={loc.lat}
 *           longitude={loc.lng}
 *         >
 *           <mesh>
 *             <sphereGeometry args={[10]} />
 *             <meshStandardMaterial color="red" />
 *           </mesh>
 *         </NearCoordinates>
 *       ))}
 *     </Canvas>
 *   );
 * }
 * ```
 *
 * @see {@link Coordinates} for accurate positioning at any distance
 * @see {@link coordsToVector3} for the underlying conversion function
 */
export const NearCoordinates = memo<CoordinatesProps>(({children, ...coords})=>{
  const {latitude, longitude, altitude} = useCoords();
  const pos = useMemo(()=>coordsToVector3(coords, {latitude, longitude, altitude}), [ // eslint-disable-line react-hooks/exhaustive-deps
    latitude, longitude, altitude, coords.latitude, coords.longitude, coords.altitude
  ]);
  return <object3D position={pos}>{children}</object3D>
})
NearCoordinates.displayName = 'NearCoordinates';
