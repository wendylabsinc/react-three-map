# Getting Started

This guide will help you set up react-three-map in your project.

## Installation

```bash
npm install @wendylabsinc/react-three-map
```

You'll also need the peer dependencies:

```bash
# For MapLibre (free, open-source)
npm install react-map-gl maplibre-gl @react-three/fiber three

# For Mapbox (requires access token)
npm install react-map-gl mapbox-gl @react-three/fiber three
```

## Basic Setup

### With MapLibre (Recommended)

MapLibre is a free, open-source fork of Mapbox GL JS. No access token required.

```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import Map from "react-map-gl/maplibre";
import { Canvas } from "@wendylabsinc/react-three-map/maplibre";

function App() {
  return (
    <Map
      initialViewState={{
        latitude: 51.5074,
        longitude: -0.1278,
        zoom: 15,
        pitch: 60
      }}
      style={{ width: "100vw", height: "100vh" }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    >
      <Canvas latitude={51.5074} longitude={-0.1278}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <mesh>
          <boxGeometry args={[100, 100, 100]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </Canvas>
    </Map>
  );
}
```

### With Mapbox

Mapbox requires an access token from [mapbox.com](https://www.mapbox.com/).

```tsx
import "mapbox-gl/dist/mapbox-gl.css";
import Map from "react-map-gl/mapbox";
import { Canvas } from "@wendylabsinc/react-three-map";

function App() {
  return (
    <Map
      mapboxAccessToken="YOUR_MAPBOX_TOKEN"
      initialViewState={{
        latitude: 40.7128,
        longitude: -74.006,
        zoom: 15,
        pitch: 60
      }}
      style={{ width: "100vw", height: "100vh" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
    >
      <Canvas latitude={40.7128} longitude={-74.006}>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry args={[100, 100, 100]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </Canvas>
    </Map>
  );
}
```

## Understanding Coordinates

The `Canvas` component positions your 3D scene at specific geographic coordinates:

- **latitude**: North-South position (-90 to 90)
- **longitude**: East-West position (-180 to 180)
- **altitude**: Height in meters above sea level (default: 0)

Your Three.js scene uses meters as units:
- **X axis**: Points East
- **Y axis**: Points Up (altitude)
- **Z axis**: Points South

```tsx
<Canvas latitude={51.5074} longitude={-0.1278}>
  {/* A 100m x 100m x 100m cube */}
  <mesh position={[0, 50, 0]}>
    <boxGeometry args={[100, 100, 100]} />
  </mesh>
</Canvas>
```

## Next Steps

- Learn about [Multiple Locations](./multiple-locations.md) to place objects at different coordinates
- Explore the API Reference in the sidebar for detailed documentation
- Check out the [Storybook examples](https://wendylabsinc.github.io/react-three-map/storybook/) for interactive demos
