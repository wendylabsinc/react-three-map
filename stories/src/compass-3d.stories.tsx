import { Canvas } from "@react-three/fiber";
import { useControls } from "leva";
import { Compass3D, CompassOverlay as MapboxCompassOverlay } from "@wendylabsinc/react-three-map";
import { CompassOverlay as MaplibreCompassOverlay } from "@wendylabsinc/react-three-map/maplibre";
import { StoryMap } from "./story-map-storybook";

// Main story component
export function TerrainWith3DCompass() {
  const origin = useControls({
    latitude: { value: 36.2797, min: -90, max: 90 }, // Big Sur
    longitude: { value: -121.8333, min: -180, max: 180 },
    terrainExaggeration: { value: 1.5, min: 0.5, max: 3, step: 0.1 }
  });

  // Terrain configuration for MapLibre
  const maplibreStyle = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
        maxzoom: 19
      },
      terrainSource: {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      },
      hillshadeSource: {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm'
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshadeSource',
        layout: {
          visibility: 'visible'
        },
        paint: {
          'hillshade-shadow-color': '#473B24',
          'hillshade-highlight-color': '#FEFEFE',
          'hillshade-accent-color': '#534330',
          'hillshade-exaggeration': 0.5
        }
      }
    ],
    terrain: {
      source: 'terrainSource',
      exaggeration: origin.terrainExaggeration
    }
  };

  // Terrain configuration for Mapbox
  const mapboxStyle = {
    version: 8,
    sources: {
      'mapbox-dem': {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      },
      'satellite': {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'mapbox-dem',
        layout: {
          visibility: 'visible'
        },
        paint: {
          'hillshade-shadow-color': '#473B24',
          'hillshade-highlight-color': '#FEFEFE',
          'hillshade-accent-color': '#534330',
          'hillshade-exaggeration': 0.5
        }
      }
    ],
    terrain: {
      source: 'mapbox-dem',
      exaggeration: origin.terrainExaggeration
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <StoryMap
        latitude={origin.latitude}
        longitude={origin.longitude}
        zoom={11}
      pitch={60}
      bearing={0}
      maplibreStyle={maplibreStyle}
      mapboxStyle={mapboxStyle}
      mapboxChildren={<MapboxCompassOverlay />}
      maplibreChildren={<MaplibreCompassOverlay />}
    >
      {/* No other 3D objects in the scene, just the terrain */}
    </StoryMap>
  </div>
);
}

// Standalone compass story for testing
export function Compass3DStandalone() {
  const { 
    cylinderLength, 
    cylinderRadius, 
    sphereRadius,
    bearing,
    pitch,
    scale
  } = useControls({
    cylinderLength: { value: 2, min: 1, max: 5, step: 0.1 },
    cylinderRadius: { value: 0.05, min: 0.01, max: 0.2, step: 0.01 },
    sphereRadius: { value: 0.2, min: 0.1, max: 0.5, step: 0.05 },
    bearing: { value: 0, min: -180, max: 180, step: 1 },
    pitch: { value: 0, min: -90, max: 90, step: 1 },
    scale: { value: 1, min: 0.1, max: 3, step: 0.1 }
  });

  return (
    <div style={{ height: '100vh', background: '#222' }}>
      <Canvas 
        orthographic
        camera={{ 
          position: [5, 5, 5],
          zoom: 40,
          near: -1000,
          far: 1000
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />
        <Compass3D
          cylinderLength={cylinderLength}
          cylinderRadius={cylinderRadius}
          sphereRadius={sphereRadius}
          bearing={bearing}
          pitch={pitch}
          scale={scale}
          overlay={false}
          syncWithCamera={false}
          disableGizmoHelper
        />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
}

export default {
  title: 'Compass 3D',
};

export const WithTerrain = TerrainWith3DCompass;
export const Standalone = Compass3DStandalone;
