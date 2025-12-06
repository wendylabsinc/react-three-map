/* eslint-disable @typescript-eslint/ban-ts-comment */
import { extend } from "@react-three/fiber";
import { MercatorCoordinate } from "mapbox-gl";
import { memo, useState } from "react";
import { Layer, useMap } from "react-map-gl/mapbox";
import * as THREE from "three";
import { Matrix4Tuple } from "three";
import { CanvasProps } from "../api/canvas-props";
import { useCanvasInLayer } from "../core/canvas-in-layer/use-canvas-in-layer";
import { InitCanvasFC } from "../core/canvas-overlay/init-canvas-fc";
import { Render } from "../core/canvas-overlay/render";
import { MapInstance } from "../core/generic-map";
import { useFunction } from "../core/use-function";

extend(THREE);

const fromLngLat = MercatorCoordinate.fromLngLat

/**
 * A React Three Fiber canvas that renders inside a Mapbox map.
 *
 * This component bridges `@react-three/fiber` with `react-map-gl` (Mapbox variant),
 * allowing you to render Three.js scenes at geographic coordinates on the map.
 *
 * Must be used as a child of a `Map` component from `react-map-gl/mapbox`.
 *
 * @example
 * ```tsx
 * import "mapbox-gl/dist/mapbox-gl.css";
 * import Map from "react-map-gl/mapbox";
 * import { Canvas } from "@wendylabsinc/react-three-map";
 *
 * function App() {
 *   return (
 *     <Map
 *       mapboxAccessToken="YOUR_TOKEN"
 *       initialViewState={{
 *         latitude: 40.7128,
 *         longitude: -74.006,
 *         zoom: 15,
 *         pitch: 60
 *       }}
 *       mapStyle="mapbox://styles/mapbox/dark-v11"
 *     >
 *       <Canvas latitude={40.7128} longitude={-74.006}>
 *         <ambientLight intensity={0.5} />
 *         <mesh>
 *           <boxGeometry args={[100, 100, 100]} />
 *           <meshStandardMaterial color="hotpink" />
 *         </mesh>
 *       </Canvas>
 *     </Map>
 *   );
 * }
 * ```
 *
 * @see {@link CanvasProps} for available props
 * @see {@link Coordinates} for placing objects at different locations
 * @see {@link useMap} for accessing the Mapbox map instance
 */
export const Canvas = memo<CanvasProps>(({ overlay, ...props }) => {

  const mapRef = useMap();

  if (!mapRef.current) {
    console.error('Canvas must be used within a Map component from react-map-gl');
    return null;
  }

  const map = mapRef.current.getMap();

  return <>
    {overlay && <CanvasOverlay map={map} {...props} />}
    {!overlay && <CanvasInLayer map={map} {...props} />}
  </>
})
Canvas.displayName = 'Canvas'

interface CanvasPropsAndMap extends CanvasProps {
  map: MapInstance;
}

const CanvasInLayer = memo<CanvasPropsAndMap>(({ map, ...props }) => {
  const layerProps = useCanvasInLayer(props, fromLngLat, map);
  /* @ts-ignore */ // eslint-disable-line @typescript-eslint/ban-ts-comment
  return <Layer {...layerProps} />
})
CanvasInLayer.displayName = 'CanvasInLayer';

const CanvasOverlay = memo<CanvasPropsAndMap>(({ map, id, beforeId, ...props }) => {
  const [onRender, setOnRender] = useState<(mx: Matrix4Tuple) => void>();

  const render = useFunction<Render>((_gl, mx) => {
    if (!onRender) return;
    onRender(mx as Matrix4Tuple);
  })

  return <>
    {/* @ts-ignore  */}
    <Layer id={id} beforeId={beforeId} type="custom" render={render} />
    <InitCanvasFC {...props}
      setOnRender={setOnRender}
      map={map}
      fromLngLat={fromLngLat}
    />
  </>
})
CanvasInLayer.displayName = 'CanvasInLayer';
