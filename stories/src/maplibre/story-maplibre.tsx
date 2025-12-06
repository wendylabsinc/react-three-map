import MapLibre from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import { FC, memo, useEffect, useRef } from "react";
import Map, { useMap, NavigationControl, TerrainControl } from 'react-map-gl/maplibre';
import { StoryMapProps } from '../story-map-storybook';
import { Canvas } from '@wendylabsinc/react-three-map/maplibre';

// Component to setup terrain after map loads
const TerrainSetup: FC<{ terrain?: any }> = ({ terrain }) => {
  const { current: map } = useMap();
  
  useEffect(() => {
    if (!map || !terrain) return;
    
    const setupTerrain = () => {
      console.log('Setting up terrain:', terrain);
      
      // Check if source exists from the style, if not add it
      if (terrain.source && !map.getSource(terrain.source)) {
        // Try to find the source definition in the style
        const style = map.getStyle();
        console.log('Current style sources:', style?.sources);
        
        if (style && style.sources && style.sources[terrain.source]) {
          // Source already exists in style, just set terrain
          console.log('Setting terrain with existing source:', terrain.source);
          // Check if setTerrain method exists
          if (typeof (map as any).setTerrain === 'function') {
            (map as any).setTerrain(terrain);
          } else {
            console.warn('setTerrain is not available in this MapLibre version');
          }
        } else {
          // Need to add the source first - this shouldn't happen with proper style config
          console.warn('Terrain source not found in style:', terrain.source);
        }
      } else if (terrain.source) {
        // Source exists, set terrain
        console.log('Source exists, setting terrain:', terrain);
        // Check if setTerrain method exists (it may not in all MapLibre versions)
        if (typeof (map as any).setTerrain === 'function') {
          (map as any).setTerrain(terrain);
        } else {
          console.warn('setTerrain is not available in this MapLibre version');
        }
      }
    };
    
    if (map.loaded()) {
      console.log('Map already loaded, setting up terrain immediately');
      setupTerrain();
    } else {
      console.log('Map not loaded yet, waiting for load event');
      map.on('load', setupTerrain);
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [map, terrain]);
  
  return null;
};

/** Maplibre `<Map>` styled for stories */
export const StoryMaplibre: FC<Omit<StoryMapProps, 'mapboxChildren' | 'mapboxStyle'>> = ({
  latitude, longitude, canvas, mapChildren, maplibreChildren, children, maplibreStyle, ...rest
}) => {

  // Default to light theme - can be controlled via props if needed
  const defaultMapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  
  const mapStyle = maplibreStyle || defaultMapStyle;
  const showTerrainControl = maplibreStyle?.terrain ? true : false;

  return <div style={{ height: '100vh', position: 'relative' }}>
    <Map
      canvasContextAttributes={{
        antialias: true,
      }}
      mapLib={MapLibre}
      initialViewState={{ latitude, longitude, ...rest }}
      maxPitch={rest.pitch ? Math.min(rest.pitch, 85) : undefined}
      mapStyle={mapStyle}
    >
      <FlyTo latitude={latitude} longitude={longitude} zoom={rest.zoom} />
      {maplibreStyle?.terrain && <TerrainSetup terrain={maplibreStyle.terrain} />}
      {showTerrainControl && maplibreStyle?.terrain?.source && (
        <>
          <NavigationControl position="top-left" />
          <TerrainControl 
            source={maplibreStyle.terrain.source}
            exaggeration={maplibreStyle.terrain.exaggeration || 1}
          />
        </>
      )}
      {mapChildren}
      {maplibreChildren}
      <Canvas latitude={latitude} longitude={longitude} {...canvas}>
        {children}
      </Canvas>
    </Map>
  </div>
}

interface FlyToProps {
  latitude: number,
  longitude: number,
  zoom?: number,
}

const FlyTo = memo<FlyToProps>(({ latitude, longitude, zoom }) => {

  const map = useMap();
  const firstRun = useRef(true);

  useEffect(() => {
    if (!map.current) return;
    if (firstRun.current) return;
    map.current.easeTo({
      center: { lon: longitude, lat: latitude },
      zoom: map.current.getZoom(),
      duration: 0,
    })
  }, [map, latitude, longitude])

  useEffect(() => {
    if (!map.current) return;
    if (firstRun.current) return;
    if (zoom === undefined) return;
    map.current.easeTo({
      center: map.current.getCenter(),
      zoom,
      essential: true,
    })
  }, [map, zoom])

  useEffect(() => {
    firstRun.current = false;
  }, [])

  return <></>
})
FlyTo.displayName = 'FlyTo';