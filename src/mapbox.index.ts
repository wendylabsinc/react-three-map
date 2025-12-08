/**
 * React Three Map - Mapbox variant
 *
 * This module provides the Mapbox GL JS integration for react-three-map.
 * Use this when working with Mapbox GL JS and `react-map-gl/mapbox`.
 *
 * @packageDocumentation
 * @module @wendylabsinc/react-three-map
 *
 * @example
 * ```tsx
 * import "mapbox-gl/dist/mapbox-gl.css";
 * import Map from "react-map-gl/mapbox";
 * import { Canvas, Coordinates, useMap, coordsToVector3 } from "@wendylabsinc/react-three-map";
 *
 * function App() {
 *   return (
 *     <Map
 *       mapboxAccessToken="YOUR_TOKEN"
 *       initialViewState={{ latitude: 40.7128, longitude: -74.006, zoom: 15 }}
 *       mapStyle="mapbox://styles/mapbox/dark-v11"
 *     >
 *       <Canvas latitude={40.7128} longitude={-74.006}>
 *         <mesh>
 *           <boxGeometry args={[100, 100, 100]} />
 *           <meshStandardMaterial color="red" />
 *         </mesh>
 *       </Canvas>
 *     </Map>
 *   );
 * }
 * ```
 */
import type { Map } from 'mapbox-gl';
import { useMap as useMapGeneric } from './api/use-map';

export * from './api';
export * from './mapbox/canvas';
export { EnhancedPivotControls } from './components/enhanced-pivot-controls';
export type { PivotControlsProps } from './components/enhanced-pivot-controls';
export { Compass3D } from './components/compass-3d';
export type { Compass3DProps } from './components/compass-3d';
export { CompassOverlay } from './mapbox/compass-overlay';
export type { CompassOverlayProps } from './mapbox/compass-overlay';

/**
 * Hook to access the Mapbox GL JS map instance from within a Canvas.
 *
 * @returns The Mapbox GL JS Map instance
 *
 * @example
 * ```tsx
 * import { useMap } from "@wendylabsinc/react-three-map";
 *
 * function MyComponent() {
 *   const map = useMap();
 *   // map is typed as mapbox-gl Map
 *   console.log(map.getZoom());
 *   return null;
 * }
 * ```
 */
export const useMap = useMapGeneric<Map>;
