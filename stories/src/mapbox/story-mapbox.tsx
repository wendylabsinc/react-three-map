import { useControls } from 'leva';
import Mapbox from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import { FC, PropsWithChildren, memo } from "react";
import Map, { Layer } from 'react-map-gl/mapbox';
import { Canvas } from '@wendylabsinc/react-three-map/mapbox';
import { StoryMapProps } from '../story-map-storybook';

/** `<Map>` styled for stories */
export const StoryMapbox: FC<Omit<StoryMapProps, 'maplibreChildren' | 'maplibreStyle'>> = ({
  latitude, longitude, canvas, children, mapChildren, mapboxChildren, mapboxStyle, ...rest
}) => {

  // Set Mapbox token from env or use the default one
  const defaultToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWJhbGV4OTkiLCJhIjoiY2o1cGttZTJjMGJ5NDMycHFwY2h0amZieSJ9.fHqdZDfrCz6dEYTdnQ-hjQ';
  
  const { mapboxToken } = useControls({
    mapboxToken: {
      value: defaultToken,
      label: 'mapbox token',
    }
  })

  // Default to light theme - can be controlled via props if needed
  const defaultMapStyle = "mapbox://styles/mapbox/streets-v12";
  
  const mapStyle = mapboxStyle || defaultMapStyle;

  // Set the access token
  if (mapboxToken) {
    Mapbox.accessToken = mapboxToken;
  }

  const { showBuildings3D } = useControls({
    showBuildings3D: {
      value: true,
      label: 'show 3D buildings'
    }
  })

  return <div style={{ height: '100vh', position: 'relative' }}>
    {!mapboxToken && <Center>Add a mapbox token to load this component</Center>}
    {!!mapboxToken && <Map
      antialias
      initialViewState={{ latitude, longitude, ...rest }}
      maxPitch={rest.pitch ? Math.min(rest.pitch, 85) : undefined}
      mapStyle={mapStyle}
      mapboxAccessToken={mapboxToken}
    >
      {mapChildren}
      {mapboxChildren}
      <Canvas latitude={latitude} longitude={longitude} {...canvas}>
        {children}
      </Canvas>
      {showBuildings3D && <Buildings3D />}
    </Map>}
  </div>
}

const Center = ({ children }: PropsWithChildren) => (
  <div style={{
    display: 'flex',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  }}>{children}</div>
)

const Buildings3D = memo(() => {
  return <Layer
    id="3d-buildings"
    type="fill-extrusion"
    source="composite"
    source-layer="building"
    minzoom={15}
    filter={['==', 'extrude', 'true']}
    paint={{
      "fill-extrusion-color": "#656565",
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "height"],
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "min_height"],
      ],
      "fill-extrusion-opacity": 1.0,
    }} />
})
Buildings3D.displayName = 'Buildings3D'