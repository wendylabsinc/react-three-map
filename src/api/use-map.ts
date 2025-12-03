import { useThree } from "@react-three/fiber";
import { MapInstance } from "../core/generic-map";

/**
 * React hook to access the underlying map instance from within a react-three-map Canvas.
 *
 * Returns the MapLibre or Mapbox map instance depending on which variant you're using.
 * This allows you to interact with the map API directly from your Three.js components.
 *
 * @typeParam T - The map instance type (MapLibre's Map or Mapbox's Map)
 * @returns The map instance
 *
 * @example
 * ```tsx
 * import { useMap } from 'react-three-map/maplibre';
 * // or: import { useMap } from 'react-three-map'; // for Mapbox
 *
 * function MyComponent() {
 *   const map = useMap();
 *
 *   const flyToLocation = () => {
 *     map.flyTo({
 *       center: [-74.006, 40.7128],
 *       zoom: 15,
 *       pitch: 60
 *     });
 *   };
 *
 *   return (
 *     <mesh onClick={flyToLocation}>
 *       <boxGeometry />
 *       <meshStandardMaterial color="blue" />
 *     </mesh>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Listen to map events
 * function MapListener() {
 *   const map = useMap();
 *
 *   useEffect(() => {
 *     const onZoom = () => console.log('Zoom:', map.getZoom());
 *     map.on('zoom', onZoom);
 *     return () => map.off('zoom', onZoom);
 *   }, [map]);
 *
 *   return null;
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useMap = <T extends MapInstance = MapInstance>(): T => useThree((s: any) => {
  return s.r3m?.map;
});
