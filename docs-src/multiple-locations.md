# Working with Multiple Locations

This guide explains how to place 3D objects at different geographic locations on your map.

## Two Approaches

react-three-map provides two components for positioning objects at different coordinates:

| Component | Use Case | Accuracy | Performance |
|-----------|----------|----------|-------------|
| `Coordinates` | Objects far apart (countries, continents) | High | Lower (separate scene per location) |
| `NearCoordinates` | Objects close together (same city) | Good for <100km | Higher (single scene) |

## Using Coordinates

The `Coordinates` component creates a separate, properly-scaled scene at each location. Use this when objects are far apart.

```tsx
import { Canvas, Coordinates } from "@wendylabsinc/react-three-map/maplibre";

function WorldMarkers() {
  return (
    <Canvas latitude={0} longitude={0}>
      {/* London */}
      <Coordinates latitude={51.5074} longitude={-0.1278}>
        <mesh>
          <sphereGeometry args={[50000]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </Coordinates>

      {/* New York */}
      <Coordinates latitude={40.7128} longitude={-74.006}>
        <mesh>
          <sphereGeometry args={[50000]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </Coordinates>

      {/* Tokyo */}
      <Coordinates latitude={35.6762} longitude={139.6503}>
        <mesh>
          <sphereGeometry args={[50000]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </Coordinates>
    </Canvas>
  );
}
```

## Using NearCoordinates

The `NearCoordinates` component is more performant but only translates position without scale correction. Use this for objects within the same city or region.

```tsx
import { Canvas, NearCoordinates } from "@wendylabsinc/react-three-map/maplibre";

function CityMarkers() {
  const locations = [
    { name: "Tower Bridge", lat: 51.5055, lng: -0.0754 },
    { name: "Big Ben", lat: 51.5007, lng: -0.1246 },
    { name: "London Eye", lat: 51.5033, lng: -0.1196 },
    { name: "St Paul's", lat: 51.5138, lng: -0.0984 },
  ];

  return (
    <Canvas latitude={51.5074} longitude={-0.1278}>
      <ambientLight />
      {locations.map((loc) => (
        <NearCoordinates
          key={loc.name}
          latitude={loc.lat}
          longitude={loc.lng}
        >
          <mesh>
            <cylinderGeometry args={[20, 20, 100]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        </NearCoordinates>
      ))}
    </Canvas>
  );
}
```

## Converting Coordinates Programmatically

For more control, use the utility functions directly:

### coordsToVector3

Converts geographic coordinates to a 3D position relative to an origin.

```tsx
import { coordsToVector3 } from "@wendylabsinc/react-three-map/maplibre";

function DynamicMarker({ targetLat, targetLng }) {
  const origin = { latitude: 51.5074, longitude: -0.1278 };
  const target = { latitude: targetLat, longitude: targetLng };

  const position = coordsToVector3(target, origin);

  return (
    <mesh position={position}>
      <sphereGeometry args={[10]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
  );
}
```

### vector3ToCoords

Converts a 3D position back to geographic coordinates. Useful after user interactions.

```tsx
import { vector3ToCoords, coordsToVector3 } from "@wendylabsinc/react-three-map/maplibre";
import { useState } from "react";

function DraggableMarker() {
  const origin = { latitude: 51.5074, longitude: -0.1278 };
  const [coords, setCoords] = useState(origin);

  const position = coordsToVector3(coords, origin);

  const handleDragEnd = (newPosition) => {
    const newCoords = vector3ToCoords(
      [newPosition.x, newPosition.y, newPosition.z],
      origin
    );
    setCoords(newCoords);
    console.log(`Moved to: ${newCoords.latitude}, ${newCoords.longitude}`);
  };

  return (
    <mesh position={position} onPointerUp={(e) => handleDragEnd(e.point)}>
      <boxGeometry args={[50, 50, 50]} />
      <meshStandardMaterial color="purple" />
    </mesh>
  );
}
```

## Best Practices

1. **Choose the right component**: Use `NearCoordinates` for city-level, `Coordinates` for global.

2. **Set a sensible Canvas origin**: Place your Canvas at the center of your area of interest.

3. **Consider scale**: At the equator, 1 degree of latitude/longitude is about 111km. Objects sized in meters will appear tiny on a zoomed-out map.

4. **Use altitude for elevation**: The `altitude` prop (in meters) controls height above sea level.

```tsx
<Coordinates latitude={51.5} longitude={-0.1} altitude={100}>
  {/* This object is 100m above sea level */}
  <mesh>
    <boxGeometry args={[50, 50, 50]} />
  </mesh>
</Coordinates>
```
