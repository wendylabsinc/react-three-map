import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { PropsWithChildren, memo, useLayoutEffect, useRef, useState } from "react";
import { Matrix4Tuple, PerspectiveCamera, Scene } from "three";
import { syncCamera } from "../core/sync-camera";
import { useCoordsToMatrix } from "../core/use-coords-to-matrix";
import { R3M, useR3M } from "../core/use-r3m";

/**
 * Props for the Coordinates component.
 */
export interface CoordinatesProps extends PropsWithChildren {
  /**
   * The longitude coordinate in degrees where the children will be placed.
   */
  longitude: number;

  /**
   * The latitude coordinate in degrees where the children will be placed.
   */
  latitude: number;

  /**
   * The altitude in meters above sea level.
   * @defaultValue 0
   */
  altitude?: number;
}

/**
 * A component that positions its children at specific geographic coordinates.
 *
 * Unlike {@link NearCoordinates}, this component creates a separate scene for each
 * coordinate location with proper scale adjustments. This makes it suitable for
 * placing objects at vastly different locations (e.g., different continents).
 *
 * @remarks
 * Each `Coordinates` component renders in its own scene with a synchronized camera,
 * which ensures proper scale at that geographic location. This is more accurate than
 * `NearCoordinates` for distant locations but has slightly more overhead.
 *
 * @example
 * ```tsx
 * import { Canvas, Coordinates } from '@wendylabsinc/react-three-map/maplibre';
 *
 * function App() {
 *   return (
 *     <Map initialViewState={{ latitude: 51, longitude: 0, zoom: 5 }}>
 *       <Canvas latitude={51} longitude={0}>
 *         {/* Objects at the Canvas origin *\/}
 *         <mesh>
 *           <boxGeometry args={[100, 100, 100]} />
 *           <meshStandardMaterial color="red" />
 *         </mesh>
 *
 *         {/* Objects at a different location *\/}
 *         <Coordinates latitude={48.8566} longitude={2.3522}>
 *           <mesh>
 *             <boxGeometry args={[100, 100, 100]} />
 *             <meshStandardMaterial color="blue" />
 *           </mesh>
 *         </Coordinates>
 *       </Canvas>
 *     </Map>
 *   );
 * }
 * ```
 *
 * @see {@link NearCoordinates} for a simpler alternative at city-level distances
 */
export const Coordinates = memo<CoordinatesProps>(({
  latitude, longitude, altitude = 0, children
}) => {

  const [scene] = useState(() => new Scene())

  const r3m = useR3M();

  const origin = useCoordsToMatrix({
    latitude, longitude, altitude, fromLngLat: r3m?.fromLngLat,
  });


  if (!r3m) return null;

  return <>{createPortal(<>
    <RenderAtCoords r3m={r3m} origin={origin} />
    {children}
  </>, scene, { events: { priority: 2 } })}</>
})

Coordinates.displayName = 'Coordinates';

interface RenderAtCoordsProps {
  r3m: R3M,
  origin: Matrix4Tuple
}

function RenderAtCoords({ r3m, origin }: RenderAtCoordsProps) {

  const { gl, scene, set } = useThree()

  const cameraRef = useRef<PerspectiveCamera>(null)

  useFrame(() => {
    if (!cameraRef.current) return;
    syncCamera(cameraRef.current, origin, r3m.viewProjMx);
    gl.render(scene, cameraRef.current);
  })

  useLayoutEffect(() => {
    if (!cameraRef.current) return;
    set({
      invalidate: () => {
        if (!r3m.map) return;
        r3m.map.triggerRepaint();
      },
      camera: cameraRef.current,
    });
  }, [set, r3m])

  return <perspectiveCamera ref={cameraRef} />
}
