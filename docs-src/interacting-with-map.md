# Interacting with the Map

This guide covers how to interact with the underlying map from your Three.js components.

## Using the useMap Hook

The `useMap` hook gives you access to the MapLibre or Mapbox map instance.

```tsx
import { useMap } from "react-three-map/maplibre";

function MapController() {
  const map = useMap();

  const flyToLondon = () => {
    map.flyTo({
      center: [-0.1278, 51.5074],
      zoom: 15,
      pitch: 60,
      duration: 2000
    });
  };

  return (
    <mesh onClick={flyToLondon}>
      <boxGeometry args={[50, 50, 50]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}
```

## Listening to Map Events

You can subscribe to map events like zoom, pan, and rotation changes.

```tsx
import { useMap } from "react-three-map/maplibre";
import { useEffect, useState } from "react";

function ZoomIndicator() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoom", onZoom);
    return () => map.off("zoom", onZoom);
  }, [map]);

  // Scale object based on zoom level
  const scale = Math.pow(2, 15 - zoom) * 10;

  return (
    <mesh scale={[scale, scale, scale]}>
      <sphereGeometry args={[1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
```

## Triggering Map Repaints

When using `frameloop="demand"`, you control when the scene re-renders:

```tsx
import { useThree } from "@react-three/fiber";

function AnimatedObject() {
  const invalidate = useThree((state) => state.invalidate);

  // Call invalidate() whenever you need a re-render
  const handleClick = () => {
    // ... update some state
    invalidate(); // Request a new frame
  };

  return (
    <mesh onClick={handleClick}>
      <boxGeometry />
    </mesh>
  );
}
```

## Getting Map Bounds

Useful for loading data only for the visible area:

```tsx
import { useMap } from "react-three-map/maplibre";
import { useEffect } from "react";

function VisibleAreaLoader() {
  const map = useMap();

  useEffect(() => {
    const loadVisibleData = () => {
      const bounds = map.getBounds();
      console.log("Visible area:", {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
      // Load data for these bounds...
    };

    map.on("moveend", loadVisibleData);
    loadVisibleData(); // Initial load

    return () => map.off("moveend", loadVisibleData);
  }, [map]);

  return null;
}
```

## Combining with R3F Hooks

You can combine map interaction with React Three Fiber hooks:

```tsx
import { useMap } from "react-three-map/maplibre";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

function CompassNeedle() {
  const map = useMap();
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      // Rotate to always point north regardless of map rotation
      const bearing = map.getBearing();
      meshRef.current.rotation.y = (bearing * Math.PI) / 180;
    }
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[10, 50, 4]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
```
