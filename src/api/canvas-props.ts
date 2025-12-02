import { RenderProps } from "@react-three/fiber";
import { PropsWithChildren } from "react";
import { Coords } from "./coords";

/**
 * Props for the Canvas component that renders a React Three Fiber scene inside a map.
 *
 * Extends the standard `@react-three/fiber` RenderProps with geographic positioning.
 *
 * @example
 * ```tsx
 * <Canvas
 *   latitude={51.5074}
 *   longitude={-0.1278}
 *   altitude={100}
 *   frameloop="always"
 * >
 *   <mesh>
 *     <boxGeometry />
 *     <meshStandardMaterial color="red" />
 *   </mesh>
 * </Canvas>
 * ```
 */
export interface CanvasProps extends Coords, Omit<RenderProps<HTMLCanvasElement>, 'frameloop'>, PropsWithChildren {
  /**
   * Unique identifier for the map layer.
   * Useful when you have multiple Canvas components.
   */
  id?: string;

  /**
   * ID of an existing layer to insert this layer before.
   * Use this to control the rendering order of multiple Canvas layers.
   */
  beforeId?: string;

  /**
   * Controls when the scene re-renders.
   * - `"always"`: Continuously render (default)
   * - `"demand"`: Only render when `invalidate()` is called
   *
   * @defaultValue "always"
   */
  frameloop?: 'always' | 'demand';

  /**
   * When true, renders on a separate canvas overlay instead of the map's WebGL context.
   *
   * Use this if:
   * - You use `react-postprocessing` and have issues clearing the screen
   * - You want to avoid unnecessary map renders when only the Three.js scene changed
   *
   * Caveats:
   * - Three.js will always render on top (no depth integration with map)
   * - `react-postprocessing` won't work if you also use `<Coordinates>` components
   *
   * @defaultValue false
   */
  overlay?: boolean;
}
