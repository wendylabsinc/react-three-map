# Using EnhancedPivotControls

The `EnhancedPivotControls` component provides an intuitive gizmo for translating and rotating 3D objects in map space, similar to transform controls in 3D editors like Blender.

## Features

- **Translation arrows** - Move objects along X (red), Y (green), and Z (blue) axes
- **Rotation rings** - Rotate objects around each axis
- **Hover highlighting** - Visual feedback when hovering over controls
- **Drag annotations** - Shows rotation angle in degrees during manipulation
- **Map integration** - Properly handles pointer events to work with MapLibre/Mapbox

## Basic Usage

```tsx
import { Canvas, EnhancedPivotControls, useMap } from 'react-three-map/maplibre';
import { Matrix4, Vector3, Euler } from 'three';
import { useState, useMemo, useCallback } from 'react';

function DraggableBox() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

  // Create matrix from position and rotation
  const matrix = useMemo(() => {
    const m = new Matrix4();
    const euler = new Euler(...rotation);
    m.makeRotationFromEuler(euler);
    m.setPosition(...position);
    return m;
  }, [position, rotation]);

  // Disable map interactions while dragging
  const onDragStart = useCallback(() => {
    map.dragPan.disable();
    map.dragRotate.disable();
  }, [map]);

  const onDragEnd = useCallback(() => {
    map.dragPan.enable();
    map.dragRotate.enable();
  }, [map]);

  // Update position and rotation from the matrix
  const onDrag = useCallback((m4: Matrix4) => {
    const pos = new Vector3().setFromMatrixPosition(m4);
    setPosition(pos.toArray() as [number, number, number]);

    const euler = new Euler().setFromRotationMatrix(m4);
    setRotation(euler.toArray().slice(0, 3) as [number, number, number]);
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

## Disabling Map Interactions

When using pivot controls on a map, you need to disable map panning and rotation while dragging to prevent conflicts. Use the `onDragStart` and `onDragEnd` callbacks:

```tsx
const map = useMap();

const onDragStart = () => {
  map.dragPan.disable();
  map.dragRotate.disable();
  map.doubleClickZoom.disable();
};

const onDragEnd = () => {
  // Small delay to prevent immediate re-enable from capturing the release
  setTimeout(() => {
    map.dragPan.enable();
    map.dragRotate.enable();
    map.doubleClickZoom.enable();
  }, 50);
};
```

## Customizing the Gizmo

### Scale

The `scale` prop controls the size of the gizmo in meters. For map applications, typical values are 100-1000:

```tsx
<EnhancedPivotControls scale={500} /> {/* 500 meter radius */}
```

### Disabling Axes

You can disable specific translation or rotation axes:

```tsx
// Disable all translations (rotation only)
<EnhancedPivotControls disableTranslations />

// Disable all rotations (translation only)
<EnhancedPivotControls disableRotations />

// Disable specific axes: [X, Y, Z]
<EnhancedPivotControls
  disableTranslations={[false, true, false]} // Only allow X and Z movement
  disableRotations={[true, false, true]}     // Only allow Y rotation
/>
```

### Active Axes

Control which axes are visible:

```tsx
// Only show X and Z axes
<EnhancedPivotControls activeAxes={[true, false, true]} />
```

### Appearance

Customize the gizmo appearance:

```tsx
<EnhancedPivotControls
  rotationThickness={0.06}      // Thicker rotation rings
  translationThickness={0.02}   // Thicker arrow shafts
  arrowHeadSize={0.08}          // Larger arrow heads
  arrowLength={1.2}             // Longer arrows
  arrowHeadLength={0.25}        // Longer arrow heads
/>
```

### Annotations

Show rotation angle while dragging:

```tsx
<EnhancedPivotControls annotations />
```

### Enabling/Disabling

Temporarily disable the control:

```tsx
<EnhancedPivotControls enabled={isEditing} />
```

## Multiple Objects

You can have multiple pivot controls for different objects. Track which object is selected:

```tsx
function MultiObjectEditor() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [objects, setObjects] = useState([
    { id: 1, position: [0, 0, 0], rotation: [0, 0, 0] },
    { id: 2, position: [500, 0, 0], rotation: [0, 0, 0] },
  ]);

  const selectedObject = objects.find(o => o.id === selectedId);

  return (
    <>
      {selectedObject && (
        <EnhancedPivotControls
          matrix={createMatrix(selectedObject)}
          scale={300}
          onDrag={(m4) => updateObject(selectedId, m4)}
          // ... other props
        />
      )}

      {objects.map(obj => (
        <mesh
          key={obj.id}
          position={obj.position}
          rotation={obj.rotation}
          onClick={() => setSelectedId(obj.id)}
        >
          <boxGeometry args={[100, 100, 100]} />
          <meshStandardMaterial
            color={obj.id === selectedId ? 'orange' : 'gray'}
          />
        </mesh>
      ))}
    </>
  );
}
```

## Converting to Geographic Coordinates

After moving an object, you can convert its position back to lat/lng:

```tsx
import { vector3ToCoords } from 'react-three-map/maplibre';

const onDrag = (m4: Matrix4) => {
  const position = new Vector3().setFromMatrixPosition(m4);
  setPosition(position.toArray());

  // Convert to geographic coordinates
  const coords = vector3ToCoords(position.toArray(), canvasOrigin);
  console.log(`Object at: ${coords.latitude}, ${coords.longitude}`);
};
```

## Performance Tips

1. **Memoize the matrix** - Recreate only when position/rotation changes
2. **Memoize callbacks** - Use `useCallback` for `onDrag`, `onDragStart`, `onDragEnd`
3. **Use `frameloop="demand"`** - If you don't need continuous rendering

```tsx
<Canvas latitude={51} longitude={0} frameloop="demand">
  {/* EnhancedPivotControls will trigger repaints when needed */}
</Canvas>
```
