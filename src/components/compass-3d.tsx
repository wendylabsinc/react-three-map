/**
 * @packageDocumentation
 * 3D Compass component for orientation reference in map space.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Billboard, GizmoHelper } from '@react-three/drei';

/**
 * Props for the Compass3D component.
 *
 * @example Basic usage (overlayed, auto-synced to camera)
 * ```tsx
 * <Compass3D />
 * ```
 *
 * @example Custom size and position in world space (overlay disabled)
 * ```tsx
 * <Compass3D
 *   overlay={false}
 *   position={[100, 50, 100]}
 *   scale={50}
 *   cylinderLength={3}
 *   sphereRadius={0.3}
 * />
 * ```
 */
export interface Compass3DProps {
  /**
   * Length of each axis cylinder.
   * @defaultValue 2
   */
  cylinderLength?: number;

  /**
   * Radius of the axis cylinders.
   * @defaultValue 0.05
   */
  cylinderRadius?: number;

  /**
   * Radius of the endpoint spheres (N, S, E, W, Up, Down).
   * @defaultValue 0.2
   */
  sphereRadius?: number;

  /**
   * Position of the compass in 3D space [x, y, z].
   * @defaultValue [0, 0, 0]
   *
   * @example
   * ```tsx
   * // Place compass at a fixed location
   * <Compass3D position={[500, 100, 500]} />
   * ```
   */
  position?: [number, number, number];

  /**
   * Map bearing (rotation) in degrees.
   * Used when `overlay` is false or `syncWithCamera` is false.
   * @defaultValue 0
   *
   * @example
   * ```tsx
   * const map = useMap();
   * const [bearing, setBearing] = useState(0);
   *
   * useEffect(() => {
   *   const onRotate = () => setBearing(map.getBearing());
   *   map.on('rotate', onRotate);
   *   return () => map.off('rotate', onRotate);
   * }, [map]);
   *
   * <Compass3D bearing={bearing} />
   * ```
   */
  bearing?: number;

  /**
   * Map pitch (tilt) in degrees.
   * Used when `overlay` is false or `syncWithCamera` is false.
   * @defaultValue 0
   *
   * @example
   * ```tsx
   * <Compass3D bearing={map.getBearing()} pitch={map.getPitch()} />
   * ```
   */
  pitch?: number;

  /**
   * Scale multiplier for the entire compass.
   * Use this to size the compass appropriately for your scene.
   * @defaultValue 1
   *
   * @example
   * ```tsx
   * // Large compass for city-level view
   * <Compass3D scale={100} />
   *
   * // Small compass for street-level view
   * <Compass3D scale={10} />
   * ```
   */
  scale?: number;

  /**
   * Render the compass as a screen-space overlay (recommended). When false, it stays in world space.
   * @defaultValue true
   */
  overlay?: boolean;

  /**
   * Screen alignment for the overlayed compass.
   * @defaultValue 'top-right'
   */
  alignment?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center'
    | 'center-left'
    | 'center-right';

  /**
   * Margin in pixels from the aligned screen edges when overlayed.
   * @defaultValue [32, 32]
   */
  margin?: [number, number];

  /**
   * When true, the overlay uses the active camera orientation automatically.
   * Set to false to drive orientation manually via `bearing` and `pitch`.
   * @defaultValue true
   */
  syncWithCamera?: boolean;

  /**
   * Internal-only: disable GizmoHelper wrapping even when overlay is true.
   * Used by CompassOverlay which provides its own screen placement.
   * @internal
   */
  disableGizmoHelper?: boolean;
}

/**
 * A 3D compass component that displays cardinal directions (E, W, N, S) and vertical orientation (Up, Down)
 * following the library's axis convention (X=East/West, Y=Up/Down, Z=South/North).
 *
 * By default the compass renders as a HUD overlay that tracks the active camera so it always stays visible
 * as the map moves and rotates.
 *
 * **Axis Colors:**
 * - Red (X-axis): East-West
 * - Green (Y-axis): Up-Down
 * - Blue (Z-axis): South-North
 *
 * @example Basic compass synced with map
 * ```tsx
 * import { Canvas, Compass3D, useMap } from 'react-three-map/maplibre';
 *
 * function MapWithCompass() {
 *   const map = useMap();
 *
 *   return (
 *     <Compass3D />
 *   );
 * }
 * ```
 *
 * @see {@link Compass3DProps} for available configuration options
 */
export const Compass3D: React.FC<Compass3DProps> = ({
  cylinderLength = 2,
  cylinderRadius = 0.05,
  sphereRadius = 0.2,
  position = [0, 0, 0],
  bearing = 0,
  pitch = 0,
  scale = 1,
  overlay = true,
  alignment = 'top-right',
  margin = [32, 32],
  syncWithCamera = true,
  disableGizmoHelper = false
}) => {
  // When overlayed via GizmoHelper the quaternion is ignored; otherwise use yaw->pitch order to match map camera.
  const rotationQuat = useMemo(() => {
    if (syncWithCamera) return undefined;
    const yaw = THREE.MathUtils.degToRad(bearing); // reverse yaw sense to match desired rotation
    const pitchRad = THREE.MathUtils.degToRad(-pitch); // invert to match map pitch direction
    const q = new THREE.Quaternion();
    // Yaw (Y) then pitch (X) to keep N/S correct when tilting the camera down.
    q.setFromEuler(new THREE.Euler(pitchRad, yaw, 0, 'YXZ'));
    return q;
  }, [bearing, pitch, syncWithCamera]);

  // Colors follow common Three.js axis convention: X=red (East/West), Y=green (Up/Down), Z=blue (South/North).
  const colors = {
    x: '#ff4d4d',
    y: '#4dff4d',
    z: '#4d7bff'
  };

  // Calculate positions for spheres and text
  const halfLength = cylinderLength / 2;

  const content = (
    <group
      position={position}
      scale={scale}
      rotation={!rotationQuat ? [0, 0, 0] : undefined}
      quaternion={rotationQuat}
    >
      {/* X-axis (East-West) */}
      <group>
        {/* Cylinder */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderLength, 16]} />
          <meshStandardMaterial color={colors.x} />
        </mesh>
        
        {/* East (+X) */}
        <mesh position={[halfLength, 0, 0]}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshStandardMaterial color={colors.x} />
        </mesh>
        <Billboard position={[halfLength + sphereRadius + 0.3, 0, 0]}>
          <Text
            fontSize={sphereRadius * 2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            E
          </Text>
        </Billboard>
        
        {/* West (-X) */}
        <mesh position={[-halfLength, 0, 0]}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshStandardMaterial color={colors.x} />
        </mesh>
        <Billboard position={[-halfLength - sphereRadius - 0.3, 0, 0]}>
          <Text
            fontSize={sphereRadius * 2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            W
          </Text>
        </Billboard>
      </group>

      {/* Y-axis (Up-Down) */}
      <group>
        {/* Cylinder */}
        <mesh>
          <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderLength, 16]} />
          <meshStandardMaterial color={colors.y} />
        </mesh>
        
        {/* Up sphere */}
        <mesh position={[0, halfLength, 0]}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshStandardMaterial color={colors.y} />
        </mesh>
        <Billboard position={[0, halfLength + sphereRadius + 0.3, 0]}>
          <Text
            fontSize={sphereRadius * 2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Up
          </Text>
        </Billboard>
        
        {/* Down sphere */}
        <mesh position={[0, -halfLength, 0]}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshStandardMaterial color={colors.y} />
        </mesh>
        <Billboard position={[0, -halfLength - sphereRadius - 0.3, 0]}>
          <Text
            fontSize={sphereRadius * 2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Down
          </Text>
        </Billboard>
      </group>

      {/* Z-axis (South-North) */}
      <group>
        {/* Cylinder */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderLength, 16]} />
          <meshStandardMaterial color={colors.z} />
        </mesh>
        
        {/* South (+Z) */}
        <mesh position={[0, 0, halfLength]}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshStandardMaterial color={colors.z} />
        </mesh>
        <Billboard position={[0, 0, halfLength + sphereRadius + 0.3]}>
          <Text
            fontSize={sphereRadius * 2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            S
          </Text>
        </Billboard>
        
        {/* North (-Z) */}
        <mesh position={[0, 0, -halfLength]}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshStandardMaterial color={colors.z} />
        </mesh>
        <Billboard position={[0, 0, -halfLength - sphereRadius - 0.3]}>
          <Text
            fontSize={sphereRadius * 2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            N
          </Text>
        </Billboard>
      </group>

      {/* Optional: Add a center sphere for reference */}
      <mesh>
        <sphereGeometry args={[cylinderRadius * 2, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );

  if (!overlay || disableGizmoHelper) {
    return content;
  }

  return (
    <GizmoHelper alignment={alignment} margin={margin}>
      {content}
    </GizmoHelper>
  );
};
