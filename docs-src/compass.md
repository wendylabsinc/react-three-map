# 3D Compass

The `Compass3D` component displays a 3D compass that shows cardinal directions (N, S, E, W) and vertical orientation (Up, Down). It helps users maintain spatial awareness when navigating 3D map views.

## Basic Usage

The simplest way to add a compass is to use the default overlay mode, which automatically positions the compass in the corner of your canvas:

```tsx
import { Canvas, Compass3D } from '@wendylabsinc/react-three-map/maplibre';
import Map from 'react-map-gl/maplibre';

function App() {
  return (
    <Map
      initialViewState={{ latitude: 51.5074, longitude: -0.1278, zoom: 15, pitch: 60 }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    >
      <Canvas latitude={51.5074} longitude={-0.1278}>
        <Compass3D />
      </Canvas>
    </Map>
  );
}
```

When `overlay={true}` (the default), the compass:
- Renders as a HUD element that stays fixed on screen
- Automatically syncs its orientation with the camera
- Uses the `alignment` and `margin` props for positioning

## Screen Position

Control where the compass appears using `alignment` and `margin`:

```tsx
// Bottom-left corner with 40px margin
<Compass3D alignment="bottom-left" margin={[40, 40]} />

// Top-center with default margin
<Compass3D alignment="top-center" />

// Available alignments:
// 'top-left', 'top-right', 'bottom-left', 'bottom-right'
// 'top-center', 'bottom-center', 'center-left', 'center-right'
```

## Customizing Appearance

Adjust the compass size and proportions:

```tsx
<Compass3D
  cylinderLength={3}      // Length of each axis (default: 2)
  cylinderRadius={0.08}   // Thickness of axes (default: 0.05)
  sphereRadius={0.3}      // Size of endpoint spheres (default: 0.2)
  scale={1.5}             // Overall scale multiplier (default: 1)
/>
```

## World-Space Compass

For a compass that exists in 3D world space rather than as a screen overlay, disable overlay mode and provide manual bearing/pitch values:

```tsx
import { Canvas, Compass3D, useMap } from '@wendylabsinc/react-three-map/maplibre';
import { useState, useEffect } from 'react';

function WorldSpaceCompass() {
  const map = useMap();
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);

  useEffect(() => {
    if (!map) return;

    const update = () => {
      setBearing(map.getBearing());
      setPitch(map.getPitch());
    };

    update();
    map.on('move', update);
    map.on('rotate', update);
    map.on('pitch', update);

    return () => {
      map.off('move', update);
      map.off('rotate', update);
      map.off('pitch', update);
    };
  }, [map]);

  return (
    <Compass3D
      overlay={false}
      syncWithCamera={false}
      bearing={bearing}
      pitch={pitch}
      position={[500, 100, 500]}
      scale={50}
    />
  );
}
```

## Axis Convention

The compass follows the library's axis convention:

| Axis | Color | Direction |
|------|-------|-----------|
| X | Red | East (+X) / West (-X) |
| Y | Green | Up (+Y) / Down (-Y) |
| Z | Blue | South (+Z) / North (-Z) |

## CompassOverlay Component

For advanced use cases, the `CompassOverlay` component renders the compass in a separate React Three Fiber canvas that floats above the map. This can be useful when you want complete control over the compass rendering:

```tsx
import { CompassOverlay } from '@wendylabsinc/react-three-map';
import Map, { useMap } from 'react-map-gl/maplibre';

function App() {
  return (
    <Map
      initialViewState={{ latitude: 51.5074, longitude: -0.1278, zoom: 15, pitch: 60 }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    >
      <CompassOverlay
        size={200}              // Size of the overlay in pixels
        offset={{ x: 20, y: 20 }} // Position from bottom-left
      />
    </Map>
  );
}
```

The `CompassOverlay`:
- Creates its own R3F canvas layered above the map
- Syncs bearing and pitch with the MapLibre camera
- Provides a semi-transparent background

## Props Reference

See the full API documentation for all configuration options in the API reference section.
