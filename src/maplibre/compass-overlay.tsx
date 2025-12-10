/**
 * @packageDocumentation
 * Screen-space compass overlay component for MapLibre.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMap } from 'react-map-gl/maplibre';
import { Compass3D } from '../components/compass-3d';

/**
 * Props for the CompassOverlay component.
 *
 * @example Basic usage
 * ```tsx
 * <CompassOverlay />
 * ```
 *
 * @example Custom size and position
 * ```tsx
 * <CompassOverlay
 *   size={150}
 *   offset={{ x: 30, y: 30 }}
 * />
 * ```
 */
export interface CompassOverlayProps {
  /**
   * Size of the overlay square in pixels.
   * @defaultValue 200
   */
  size?: number;

  /**
   * CSS inset from bottom-left corner in pixels.
   * @defaultValue \{ x: 20, y: 20 \}
   */
  offset?: { x: number; y: number };

  /**
   * Optional className for the outer container div.
   */
  className?: string;

  /**
   * Controls visibility of the overlay.
   * Set to false to hide the compass.
   * @defaultValue true
   */
  overlay?: boolean;
}

/**
 * A screen-space compass overlay that renders in its own React Three Fiber canvas.
 *
 * This component creates a separate R3F canvas that floats above the map and displays
 * a 3D compass synchronized with the MapLibre camera's bearing and pitch.
 *
 * Use this when you want the compass in a separate rendering context from your main
 * 3D scene, or when you need precise control over the overlay's position and size.
 *
 * @example Basic usage inside a Map
 * ```tsx
 * import Map from 'react-map-gl/maplibre';
 * import { CompassOverlay } from '@wendylabsinc/react-three-map/maplibre';
 *
 * function App() {
 *   return (
 *     <Map
 *       initialViewState={{ latitude: 51.5, longitude: -0.1, zoom: 15, pitch: 60 }}
 *       mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
 *     >
 *       <CompassOverlay />
 *     </Map>
 *   );
 * }
 * ```
 *
 * @example Custom positioning
 * ```tsx
 * <CompassOverlay
 *   size={150}
 *   offset={{ x: 10, y: 10 }}
 *   className="my-compass"
 * />
 * ```
 *
 * @see {@link Compass3D} for the in-canvas compass component
 * @see {@link CompassOverlayProps} for available configuration options
 */
export function CompassOverlay({
  size = 200,
  offset = { x: 20, y: 20 },
  className,
  overlay = true,
}: CompassOverlayProps) {
  const maps = useMap();
  const map = useMemo(() => {
    const collection = maps ? Object.values(maps).filter(Boolean) : [];
    // Prefer explicit current/default keys, then fall back to the first map in the collection
    return (maps as any)?.current || (maps as any)?.default || collection[0];
  }, [maps]);
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    const mapLike = mapRef.current;
    if (!mapLike) return;
    // MapRef exposes getMap(); Map exposes bearing/pitch directly
    const m = typeof (mapLike as any).getMap === 'function' ? (mapLike as any).getMap() : mapLike;
    const update = () => {
      setBearing(m.getBearing());
      setPitch(m.getPitch());
    };
    update();
    m.on('move', update);
    m.on('rotate', update);
    m.on('pitch', update);
    m.on('render', update);
    return () => {
      m.off('move', update);
      m.off('rotate', update);
      m.off('pitch', update);
      m.off('render', update);
    };
  }, [map]);

  // Camera looking down from above; we keep the default up vector so screen-up aligns to world +Y.
  const camera = useMemo(() => ({
    position: [0, 5, 0] as const,
    near: 0.1,
    far: 100,
    zoom: 50,
  }), []);

  if (!overlay) return null;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        left: `${offset.x}px`,
        bottom: `${offset.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        background: 'rgba(0,0,0,0.7)',
        padding: '8px',
        boxSizing: 'border-box',
        zIndex: 10,
      }}
    >
      <Canvas
        orthographic
        camera={camera}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />
        <Compass3D
          bearing={bearing}
          pitch={pitch}
          scale={1}
          overlay={false}
          syncWithCamera={false}
        />
      </Canvas>
    </div>
  );
}
