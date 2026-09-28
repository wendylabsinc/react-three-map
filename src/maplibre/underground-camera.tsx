/**
 * @packageDocumentation
 * Component that lets the MapLibre camera go below the ground.
 */
import { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { allowUndergroundCamera, UndergroundCameraOptions } from './allow-underground-camera';

/**
 * Props for the {@link UndergroundCamera} component.
 */
export interface UndergroundCameraProps extends UndergroundCameraOptions {
  /**
   * Set to `false` to restore MapLibre's default, where the camera stays above the ground.
   * @defaultValue true
   */
  enabled?: boolean;
}

/**
 * Lets the MapLibre camera go below the ground while mounted, see {@link allowUndergroundCamera}.
 *
 * Must be used as a child of a `Map` component from `react-map-gl/maplibre`.
 *
 * @example
 * ```tsx
 * import Map from 'react-map-gl/maplibre';
 * import { Canvas, UndergroundCamera } from '@wendylabsinc/react-three-map/maplibre';
 *
 * <Map maxPitch={180} centerClampedToGround={false} initialViewState={...}>
 *   <UndergroundCamera minAltitude={-300} />
 *   <Canvas latitude={51.5} longitude={-0.12}>
 *     <Tunnels />
 *   </Canvas>
 * </Map>
 * ```
 */
export function UndergroundCamera({ enabled = true, minAltitude }: UndergroundCameraProps) {
  const { current } = useMap();
  const map = current?.getMap();
  useEffect(() => {
    if (!map || !enabled) return;
    return allowUndergroundCamera(map, { minAltitude });
  }, [map, enabled, minAltitude]);
  return null;
}
