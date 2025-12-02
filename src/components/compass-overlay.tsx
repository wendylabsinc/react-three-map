import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMap } from 'react-map-gl/maplibre';
import { Compass3D } from './compass-3d';

export interface CompassOverlayProps {
  /** Size of the overlay square in px */
  size?: number;
  /** CSS inset from bottom/left */
  offset?: { x: number; y: number };
  /** Optional className for the outer div */
  className?: string;
  /** Respect external overlay toggle */
  overlay?: boolean;
}

/**
 * Screen-space compass overlay that syncs to the MapLibre camera bearing/pitch.
 * Renders its own R3F canvas layered above the map.
 */
export function CompassOverlay({
  size = 200,
  offset = { x: 20, y: 20 },
  className,
  overlay = true,
}: CompassOverlayProps) {
  if (!overlay) return null;

  const { current: map } = useMap();
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);

  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!mapRef.current) return;
    const m = mapRef.current;
    const update = () => {
      setBearing(m.getBearing());
      setPitch(m.getPitch());
    };
    update();
    m.on('move', update);
    m.on('rotate', update);
    m.on('pitch', update);
    return () => {
      m.off('move', update);
      m.off('rotate', update);
      m.off('pitch', update);
    };
  }, []);

  // Camera looking down from above; we keep the default up vector so screen-up aligns to world +Y.
  const camera = useMemo(() => ({
    position: [0, 5, 0],
    near: 0.1,
    far: 100,
    zoom: 50,
  }), []);

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
        borderRadius: '10px',
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
