# ![logo](public/favicon.svg)React Three Map

[![Repository](https://img.shields.io/static/v1?&message=github&style=flat&colorA=000000&colorB=000000&label=&logo=github&logoColor=ffffff)](https://github.com/wendylabsinc/react-three-map)
[![Version](https://img.shields.io/npm/v/@wendylabsinc/react-three-map?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@wendylabsinc/react-three-map)
[![Build Size](https://img.shields.io/bundlephobia/minzip/@wendylabsinc/react-three-map?label=size&?style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=@wendylabsinc/react-three-map)
[![Storybook](https://img.shields.io/badge/storybook-demos-ff4785?style=flat&colorA=000000)](https://wendylabsinc.github.io/react-three-map/storybook/)
[![TypeDoc](https://img.shields.io/badge/typedoc-API-blue?style=flat&colorA=000000)](https://wendylabsinc.github.io/react-three-map/docs/)

**Fork of [react-three-map](https://github.com/RodrigoHamuy/react-three-map) by [RodrigoHamuy](https://github.com/RodrigoHamuy) with Custom Pivot Controls and extensive utilities for GIS applications.**

`@wendylabsinc/react-three-map` is an enhanced bridge to use [`react-three-fiber`](https://github.com/pmndrs/react-three-fiber) inside [`react-map-gl`](https://github.com/visgl/react-map-gl) with additional features for professional GIS workflows.

Until now you had:

| imperative      | declarative (react) |
| --------------- | ------------------- |
| Maplibre/Mapbox | react-map-gl        |
| THREE.js        | react-three-fiber   |

Now with `@wendylabsinc/react-three-map`, you can use them together.

## About This Fork

- Our goal is to build an advanced, Blender‑style mesh editor on top of react-three-map. This includes rich gizmos, buffer geometry editing, per‑vertex/face tools, and scene management designed for geospatial contexts.
- Because of this direction, we expect this fork to diverge rapidly from the original API and scope. We’ll strive to keep the surface area stable where possible, but new editor features will take priority.
- Tremendous credit to [RodrigoHamuy](https://github.com/RodrigoHamuy) for the original project and its elegant architecture. This work stands on top of his foundations; please consider supporting the upstream project.

## New Features in this Fork

- **Custom Pivot Controls** - Enhanced interaction controls for 3D objects in map space
- **Extensive GIS Utilities** - Professional-grade geospatial tools and calculations
- **Advanced Coordinate Systems** - Extended support for various GIS coordinate projections
- **Enhanced Developer Tools** - Improved debugging and development experience
- **Performance Optimizations** - Optimized for large-scale GIS applications

```sh
npm install @wendylabsinc/react-three-map
```

- [React Three Map](#react-three-map)
  - [Examples](#examples)
  - [What does it look like?](#what-does-it-look-like)
  - [Why we build this?](#why-we-build-this)
  - [API](#api)
    - [Canvas](#canvas)
      - [Render Props](#render-props)
      - [Render Props removed from `@react-three/fiber`](#render-props-removed-from-react-threefiber)
    - [Coordinates](#coordinates)
    - [NearCoordinates](#nearcoordinates)
    - [useMap](#usemap)
    - [coordsToVector3](#coordstovector3)
    - [vector3ToCoords](#vector3tocoords)
  - [Geofence Utilities](#geofence-utilities)
    - [bufferGeometryToWKT](#buffergeometrytowkt)
    - [wktToBufferGeometry](#wkttobuffergeometry)
    - [isCoordsInPolyhedron](#iscoordsinpolyhedron)
  - [Components](#components)
    - [EnhancedPivotControls](#enhancedpivotcontrols)
    - [Compass3D](#compass3d)
    - [CompassOverlay](#compassoverlay)


## Examples

Check out our examples [here](https://wendylabsinc.github.io/react-three-map/storybook/) (powered by [Storybook](https://storybook.js.org/)).

For API documentation, see the [TypeDoc](https://wendylabsinc.github.io/react-three-map/docs/).

## What does it look like?


<table>
  <tbody>
    <tr>
      <td>Let's build the same <code>react-three-fiber</code> basic example, but now it can be inside a map. (<a href="https://codesandbox.io/p/sandbox/react-three-map-gettings-started-dhw34w">live demo</a>).</td>
      <td>
        <a href="https://codesandbox.io/p/sandbox/react-three-map-gettings-started-dhw34w">
          <img src="docs/basic-app.gif" />
        </a>
      </td>
    </tr>
  </tbody>
</table>

1. Import `Canvas` from `react-three-map` instead of `@react-three/fiber`.
2. Give it a latitude and longitude so it knows where to position the scene in the map.
3. Everything else should work just as usual.

```jsx
import "maplibre-gl/dist/maplibre-gl.css"
import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { useFrame } from "@react-three/fiber"
import { useRef, useState } from "react"
import Map from "react-map-gl/maplibre"
import { Canvas } from "@wendylabsinc/react-three-map/maplibre"
// import { Canvas } from "@wendylabsinc/react-three-map" // if you are using MapBox

function BasicExample() {
  return <Map
    canvasContextAttributes={{
      antialias: true,
    }}
    initialViewState={{
      latitude: 51,
      longitude: 0,
      zoom: 13,
      pitch: 60
    }}
    mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  >
    <Canvas latitude={51} longitude={0}>
      <hemisphereLight
        args={["#ffffff", "#60666C"]}
        position={[1, 4.5, 3]}
      />
      <object3D scale={500}>
        <Box position={[-1.2, 1, 0]} />
        <Box position={[1.2, 1, 0]} />
      </object3D>
    </Canvas>
  </Map>
}
```

## Why we build this?

Look [how complex](https://maplibre.org/maplibre-gl-js-docs/example/add-3d-model/) is to add just one ThreeJS object to a map.

Look [how complex](https://docs.pmnd.rs/react-three-fiber/api/canvas#createroot) is to create your custom root for R3F.

You can now replace all that complexity and hundreds of lines of code with the `<Canvas>` component exported by `react-three-map`, which includes a tone of extra features and seamless integration, supporting pointer events, raycasting, and much more, all out of the box.

## API

### Canvas

Same as in `@react-three/fiber`, the `<Canvas>` object is where you start to define your React Three Fiber Scene. 

```tsx
import "maplibre-gl/dist/maplibre-gl.css"
import Map from "react-map-gl/maplibre"
import { Canvas } from '@wendylabsinc/react-three-map/maplibre'
// import { Canvas } from "@wendylabsinc/react-three-map" // if you are using MapBox

const App = () => (
  <Map 
    initialViewState={{ latitude: 51, longitude: 0, zoom: 13 }} 
    mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" >
    <Canvas latitude={51} longitude={0}>
      <pointLight position={[10, 10, 10]} />
      <mesh>
        <sphereGeometry />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </Canvas>
  </Map>
)
```

It shares most of the props from R3F `<Canvas>`, so you can check them directly in the [`@react-three/fiber` docs](https://docs.pmnd.rs/react-three-fiber/api/canvas). There are a few important exceptions though, which are mentioned bellow.

#### Render Props

| Prop      | Description                                      | Default    |
| --------- | ------------------------------------------------ | ---------- |
| latitude  | The latitude coordinate where to add the scene.  |            |
| longitude | The longitude coordinate where to add the scene. |            |
| altitude  | The altitude coordinate where to add the scene.  | `0`        |
| frameloop | Render mode: `"always"`, `"demand"`.             | `"always"` |
| overlay   | Render on a separated canvas.                    | `false`    |

**About `overlay`**

You may want to use `overlay` if:

- You use `react-postprocessing` and have issues clearing the screen.
- Want to avoid unnecesary map renders when only the Three scene changed.

But it comes with some caveats:

- ThreeJS will always render on top, as this is now a separated canvas and doesn't have access to the map depth buffer.
- `react-postprocessing` will also not work if you also use `<Coordinates>` components.

#### Render Props removed from `@react-three/fiber`

Because the scene now lives in a map, we leave a lot of the render and camera control to the map, rather than to R3F.

Therefore, the following `<Canvas>` props are ignored:

- gl
- camera
- resize
- orthographic
- dpr

### Coordinates

[![Coordinates example](docs/coordinates.png)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/multi-coordinates--default)

This component allows you to have 3D objects at different coordinates.


```tsx
import { Canvas, Coordinates } from '@wendylabsinc/react-three-map'

<Canvas latitude={51} longitude={0}>
  <Coordinates latitude={50} longitude={0}>
    <mesh><sphereGeometry /></mesh>
  </Coordinates>
  <Coordinates latitude={52} longitude={0}>
    <mesh><sphereGeometry /></mesh>
  </Coordinates>
</Canvas>
```

| Props     | Description                                      | Default |
| --------- | ------------------------------------------------ | ------- |
| latitude  | The latitude coordinate where to add the scene.  |         |
| longitude | The longitude coordinate where to add the scene. |         |
| altitude  | The altitude coordinate where to add the scene.  | `0`     |

### NearCoordinates

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/multi-coordinates--default)

Same as `Coordinates`, but scale is ignored in exchange of being able to be rendered under the same scene.

Works well at city level distances, but since scale remains unchanged, is not recommended at country level distances.

Check the story to see the difference between the two or check #102 for more info.

### useMap

Access the map from inside `@wendylabsinc/react-three-map`.

```tsx
import { useMap } from "@wendylabsinc/react-three-map";
// import { useMap } from "@wendylabsinc/react-three-map/maplibre"; if you use maplibre
const Component = () => {
  const map = useMap();
  return <>...</>
}

```

### coordsToVector3

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/extrude--extrude-coordinates)

This utility function converts geographic coordinates into a `Vector3Tuple`, which represents a 3D vector in meters.

Similar to `NearCoordinates`, remember that this only updates positions (translation) but that scale is not taken into account, which has an important factor at very long distances (country level).


| Parameter        | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `point: Coords`  | The geographic coordinates of the point to convert.             |
| `origin: Coords` | The geographic coordinates used as the origin for calculations. |

Returns a `Vector3Tuple` representing the 3D position of the point relative to the origin.

### vector3ToCoords

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/pivotcontrols--default)

This utility function converts a `Vector3Tuple`, which represents a 3D vector in meters, back into geographic coordinates.

It is the inverse of `coordsToVector3` but it does not have a good level of precision at long distances since we haven't reverse engineered #102 fix yet.

Recommended to use at city level distances, but margin errors will be noticeable at country level distances.

| Parameter                | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `position: Vector3Tuple` | The 3D vector to convert back into geographic coordinates.      |
| `origin: Coords`         | The geographic coordinates used as the origin for calculations. |

Returns a `Coords` object representing the geographic coordinates of the point relative to the origin.

## Geofence Utilities

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/geofence--default)

These utilities enable creating, storing, and querying 3D geofences. Convert Three.js BufferGeometry to PostGIS-compatible formats and test whether points are inside 3D volumes.

### bufferGeometryToWKT

Converts a Three.js BufferGeometry to PostGIS `POLYHEDRALSURFACE Z` WKT format for database storage.

```tsx
import { bufferGeometryToWKT } from '@wendylabsinc/react-three-map/maplibre';
import { BoxGeometry } from 'three';

// Define the geofence origin (Canvas position)
const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };

// Create a 100m x 100m x 100m geofence volume
const geofence = new BoxGeometry(100, 100, 100);

// Convert to WKT for PostGIS storage
const wkt = bufferGeometryToWKT(geofence, { origin, precision: 8 });

// Store in PostGIS:
// INSERT INTO geofences (geom) VALUES (ST_GeomFromText(wkt, 4326))
```

| Parameter | Description |
| --------- | ----------- |
| `geometry` | The Three.js BufferGeometry to convert |
| `options.origin` | Geographic origin for coordinate conversion (should match Canvas position) |
| `options.precision` | Decimal places for coordinates (default: 8) |

Returns a WKT string in `POLYHEDRALSURFACE Z ((...))` format.

### wktToBufferGeometry

Parses a PostGIS `POLYHEDRALSURFACE Z` WKT string back into a Three.js BufferGeometry.

```tsx
import { wktToBufferGeometry } from '@wendylabsinc/react-three-map/maplibre';

// Load WKT from database
const wkt = await fetchGeofenceFromDB();
const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };

// Convert back to BufferGeometry
const geometry = wktToBufferGeometry(wkt, { origin });

// Render in scene
<mesh geometry={geometry}>
  <meshStandardMaterial color="blue" opacity={0.3} transparent />
</mesh>
```

| Parameter | Description |
| --------- | ----------- |
| `wkt` | The WKT string in POLYHEDRALSURFACE Z format |
| `options.origin` | Geographic origin for coordinate conversion |

Returns a Three.js `BufferGeometry`.

### isCoordsInPolyhedron

Tests whether a geographic coordinate is inside a 3D geofence volume.

```tsx
import { isCoordsInPolyhedron } from '@wendylabsinc/react-three-map/maplibre';
import { BoxGeometry } from 'three';

const origin = { latitude: 51.5074, longitude: -0.1278, altitude: 0 };
const geofence = new BoxGeometry(100, 100, 100);

// Test if a point is inside the geofence
const testPoint = { latitude: 51.5074, longitude: -0.1278, altitude: 25 };
const result = isCoordsInPolyhedron(testPoint, geofence, origin);

if (result.inside) {
  console.log('Point is inside the geofence!');
}
```

| Parameter | Description |
| --------- | ----------- |
| `coords` | Geographic coordinates to test `{ latitude, longitude, altitude }` |
| `geometry` | The BufferGeometry representing the closed 3D volume |
| `origin` | Geographic origin for coordinate conversion |

Returns `{ inside: boolean, intersectionCount: number }`.

**Additional Functions:**

| Function | Description |
| -------- | ----------- |
| `isPointInPolyhedron(point, geometry)` | Test a 3D point (Vector3Tuple) against geometry |
| `isCoordsInGeoTriangles(coords, triangles, origin)` | Test coords against GeoTriangle[] from database |
| `bufferGeometryToGeoTriangles(geometry, origin)` | Convert to JSON-serializable GeoTriangle[] |
| `geoTrianglesToBufferGeometry(triangles, origin)` | Convert GeoTriangle[] back to BufferGeometry |
| `isPointOnSurface(point, geometry, tolerance)` | Test if point is on the surface (within tolerance) |

## Components

### EnhancedPivotControls

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/pivotcontrols--default)

A gizmo component for translating and rotating 3D objects in map space. Provides intuitive controls with translation arrows (red=X, green=Y, blue=Z) and rotation rings for each axis.

```tsx
import { Canvas, EnhancedPivotControls, useMap } from '@wendylabsinc/react-three-map/maplibre';
import { Matrix4, Vector3, Euler } from 'three';
import { useMemo, useState, useCallback } from 'react';

function DraggableObject() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number, number]>([0, 100, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

  const matrix = useMemo(() => {
    const m = new Matrix4();
    m.makeRotationFromEuler(new Euler(...rotation));
    m.setPosition(...position);
    return m;
  }, [position, rotation]);

  const onDragStart = useCallback(() => {
    map.dragPan.disable();
    map.dragRotate.disable();
  }, [map]);

  const onDragEnd = useCallback(() => {
    setTimeout(() => {
      map.dragPan.enable();
      map.dragRotate.enable();
    }, 50);
  }, [map]);

  const onDrag = useCallback((m4: Matrix4) => {
    const pos = new Vector3().setFromMatrixPosition(m4);
    setPosition(pos.toArray() as [number, number, number]);
    const euler = new Euler().setFromRotationMatrix(m4);
    setRotation([euler.x, euler.y, euler.z]);
  }, []);

  return (
    <>
      <EnhancedPivotControls
        matrix={matrix}
        scale={500}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDrag={onDrag}
        annotations
      />
      <mesh position={position} rotation={rotation}>
        <boxGeometry args={[100, 100, 100]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </>
  );
}
```

| Prop | Description | Default |
| ---- | ----------- | ------- |
| matrix | Transformation matrix for position/rotation/scale | `new Matrix4()` |
| scale | Scale factor for gizmo size in meters | `1` |
| onDrag | Callback fired during drag with updated matrix | |
| onDragStart | Callback when drag starts (disable map interactions here) | |
| onDragEnd | Callback when drag ends (re-enable map interactions here) | |
| disableTranslations | Disable translation controls (`true`, `false`, or `[x, y, z]`) | `false` |
| disableRotations | Disable rotation controls (`true`, `false`, or `[x, y, z]`) | `false` |
| activeAxes | Which axes are visible `[x, y, z]` | `[true, true, true]` |
| annotations | Show angle annotations while rotating | `false` |
| visible | Whether the gizmo is visible | `true` |
| enabled | Whether the gizmo is interactive | `true` |

### Compass3D

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/compass-3d--with-terrain)

A 3D compass component that displays cardinal directions (N, S, E, W) and vertical orientation (Up, Down). By default renders as a HUD overlay that tracks the camera.

```tsx
import { Canvas, Compass3D } from '@wendylabsinc/react-three-map/maplibre';

// Basic usage - auto-syncs with camera as HUD overlay
function MapWithCompass() {
  return (
    <Canvas latitude={51} longitude={0}>
      <Compass3D />
      {/* your scene */}
    </Canvas>
  );
}
```

```tsx
// Custom positioning and size
<Compass3D
  alignment="bottom-left"
  margin={[20, 20]}
  scale={1.5}
/>
```

```tsx
// World-space compass (not as overlay)
<Compass3D
  overlay={false}
  position={[100, 50, 100]}
  scale={50}
/>
```

| Prop | Description | Default |
| ---- | ----------- | ------- |
| overlay | Render as screen-space HUD overlay | `true` |
| alignment | Screen position when overlayed | `'top-right'` |
| margin | Pixel margin from screen edge `[x, y]` | `[32, 32]` |
| scale | Scale multiplier for compass size | `1` |
| position | Position in 3D space (when overlay=false) | `[0, 0, 0]` |
| bearing | Map bearing in degrees (manual mode) | `0` |
| pitch | Map pitch in degrees (manual mode) | `0` |
| syncWithCamera | Auto-sync with camera orientation | `true` |
| cylinderLength | Length of axis cylinders | `2` |
| sphereRadius | Radius of endpoint spheres | `0.2` |

Axis colors follow Three.js convention: Red (X) = East/West, Green (Y) = Up/Down, Blue (Z) = South/North.

### CompassOverlay

[![](https://img.shields.io/badge/-demo-%23ff69b4)](https://wendylabsinc.github.io/react-three-map/storybook/?path=/story/compass-3d--with-terrain)

A screen-space compass overlay that renders in its own React Three Fiber canvas. Creates a separate rendering context that floats above the map.

```tsx
import Map from 'react-map-gl/maplibre';
import { CompassOverlay } from '@wendylabsinc/react-three-map/maplibre';

function App() {
  return (
    <Map
      initialViewState={{ latitude: 51.5, longitude: -0.1, zoom: 15, pitch: 60 }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    >
      <CompassOverlay />
    </Map>
  );
}
```

```tsx
// Custom size and position
<CompassOverlay
  size={150}
  offset={{ x: 30, y: 30 }}
  className="my-compass"
/>
```

| Prop | Description | Default |
| ---- | ----------- | ------- |
| size | Size of the overlay square in pixels | `200` |
| offset | CSS inset from bottom-left corner | `{ x: 20, y: 20 }` |
| className | Optional className for the container div | |
| overlay | Controls visibility of the overlay | `true` |

Use `CompassOverlay` when you want the compass in a separate rendering context from your main 3D scene, or when you need precise control over the overlay's position and size.

## Development

To run the examples locally:

```sh
# Install dependencies
npm install

# Run Storybook for interactive development
npm run dev
# or
npm run storybook

# Build Storybook for production
npm run build:storybook
```

The Storybook will be available at `http://localhost:6006`.

## GitHub Pages Deployment

The project is configured to automatically deploy Storybook and TypeDoc to GitHub Pages when changes are pushed to the `main` branch.

### Live Demo

| Resource | URL |
| -------- | --- |
| Storybook | https://wendylabsinc.github.io/react-three-map/storybook/ |
| TypeDoc API | https://wendylabsinc.github.io/react-three-map/docs/ |

### Setup GitHub Pages

1. **Enable GitHub Pages in your repository:**
   - Go to Settings -> Pages
   - Under "Source", select "GitHub Actions"

2. **The workflow will automatically:**
   - Build Storybook and TypeDoc on every push to `main`
   - Deploy to GitHub Pages
   - Make it available at `https://wendylabsinc.github.io/react-three-map/`

### Manual Deployment
You can also trigger deployment manually from the Actions tab in GitHub.
