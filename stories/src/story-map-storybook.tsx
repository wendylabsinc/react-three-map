import { MapControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import MapboxGl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FC, PropsWithChildren, ReactElement, ReactNode, cloneElement, isValidElement } from "react";
import MapboxMap from 'react-map-gl/mapbox';
import MaplibreMap from 'react-map-gl/maplibre';
import { Canvas as MapboxCanvas, CanvasProps } from '@wendylabsinc/react-three-map/mapbox';
import { Canvas as MaplibreCanvas } from '@wendylabsinc/react-three-map/maplibre';

export enum MapProvider {
  maplibre = "maplibre",
  mapbox = "mapbox",
  nomap = "nomap",
}

export interface StoryMapProps extends PropsWithChildren {
  latitude: number,
  longitude: number,
  zoom?: number,
  pitch?: number,
  bearing?: number,
  canvas?: Partial<CanvasProps>,
  mapChildren?: ReactNode,
  mapboxChildren?: ReactNode,
  maplibreChildren?: ReactNode,
  maplibreStyle?: any,
  mapboxStyle?: any,
  mapStyleUrl?: string, // Added for backward compatibility
}

/** `<Map>` styled for stories */
export const StoryMap: FC<StoryMapProps> = (props) => {
  const {
    latitude,
    longitude,
    zoom = 13,
    pitch = 0,
    bearing = 0,
    canvas,
    children,
    mapChildren,
    mapboxChildren,
    maplibreChildren,
    maplibreStyle,
    mapboxStyle = 'mapbox://styles/mapbox/dark-v11',
    mapStyleUrl // For backward compatibility
  } = props;
  
  // Use mapStyleUrl as fallback for maplibreStyle if provided
  const actualMaplibreStyle = maplibreStyle || mapStyleUrl || 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

  const { mapProvider, overlay } = useControls({
    mapProvider: {
      value: MapProvider.maplibre,
      options: MapProvider,
      label: 'map provider'
    },
    overlay: {
      value: true,
    }
  });

  const canvasProps = { overlay, ...canvas };
  const mapChildrenWithOverlay = isValidElement(mapChildren)
    ? cloneElement(mapChildren as ReactElement<{ overlay?: boolean }>, { overlay })
    : mapChildren;
  const mapboxChildrenWithOverlay = isValidElement(mapboxChildren)
    ? cloneElement(mapboxChildren as ReactElement<{ overlay?: boolean }>, { overlay })
    : mapboxChildren;
  const maplibreChildrenWithOverlay = isValidElement(maplibreChildren)
    ? cloneElement(maplibreChildren as ReactElement<{ overlay?: boolean }>, { overlay })
    : maplibreChildren;
  const childrenWithOverlay = isValidElement(children)
    ? cloneElement(children as ReactElement<{ overlay?: boolean }>, { overlay })
    : children;
  
  // Set Mapbox token
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWJhbGV4OTkiLCJhIjoiY2o1cGttZTJjMGJ5NDMycHFwY2h0amZieSJ9.fHqdZDfrCz6dEYTdnQ-hjQ';
  MapboxGl.accessToken = mapboxToken;

  return <div style={{ height: '100vh', position: 'relative' }}>
    {mapProvider === MapProvider.maplibre && (
      <MaplibreMap
        initialViewState={{
          latitude,
          longitude,
          zoom,
          pitch,
          bearing
        }}
        mapStyle={actualMaplibreStyle}
      >
        <MaplibreCanvas latitude={latitude} longitude={longitude} {...canvasProps}>
          {childrenWithOverlay}
        </MaplibreCanvas>
        {mapChildrenWithOverlay}
        {maplibreChildrenWithOverlay}
      </MaplibreMap>
    )}
    
    {mapProvider === MapProvider.mapbox && (
      <MapboxMap
        mapboxAccessToken={mapboxToken}
        antialias
        initialViewState={{
          latitude,
          longitude,
          zoom,
          pitch,
          bearing
        }}
        mapStyle={mapboxStyle}
      >
        <MapboxCanvas latitude={latitude} longitude={longitude} {...canvasProps}>
          {childrenWithOverlay}
        </MapboxCanvas>
        {mapChildrenWithOverlay}
        {mapboxChildrenWithOverlay}
      </MapboxMap>
    )}
    
    {mapProvider === MapProvider.nomap && (
      <Canvas
        {...canvas}
        camera={{ position: [0, 500, 0], far: 5000 }}
      >
        <MapControls makeDefault />
        {children}
      </Canvas>
    )}
  </div>
}
