/**
 * React Three Map - MapLibre variant
 *
 * This module provides the MapLibre GL JS integration for react-three-map.
 * Use this when working with MapLibre GL JS and `react-map-gl/maplibre`.
 *
 * @packageDocumentation
 * @module @wendylabsinc/react-three-map/maplibre
 *
 * @example
 * ```tsx
 * import "maplibre-gl/dist/maplibre-gl.css";
 * import Map from "react-map-gl/maplibre";
 * import { Canvas, Coordinates, useMap, coordsToVector3 } from "@wendylabsinc/react-three-map/maplibre";
 *
 * function App() {
 *   return (
 *     <Map
 *       initialViewState={{ latitude: 51.5074, longitude: -0.1278, zoom: 15 }}
 *       mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
 *     >
 *       <Canvas latitude={51.5074} longitude={-0.1278}>
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
import type { Map } from 'maplibre-gl';
import { useMap as useMapGeneric } from './api/use-map';

export * from './api';
export * from './maplibre/canvas';
export { EnhancedPivotControls } from './components/enhanced-pivot-controls';
export type { PivotControlsProps } from './components/enhanced-pivot-controls';
export { Compass3D } from './components/compass-3d';
export type { Compass3DProps } from './components/compass-3d';
export { CompassOverlay } from './maplibre/compass-overlay';
export type { CompassOverlayProps } from './maplibre/compass-overlay';

/**
 * Hook to access the MapLibre GL JS map instance from within a Canvas.
 *
 * @returns The MapLibre GL JS Map instance
 *
 * @example
 * ```tsx
 * import { useMap } from "@wendylabsinc/react-three-map/maplibre";
 *
 * function MyComponent() {
 *   const map = useMap();
 *   // map is typed as maplibre-gl Map
 *   console.log(map.getZoom());
 *   return null;
 * }
 * ```
 */
export const useMap = useMapGeneric<Map>;
