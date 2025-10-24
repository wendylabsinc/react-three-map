import Map from 'react-map-gl/maplibre';
import { useState } from 'react';
import { Canvas } from 'react-three-map/maplibre';

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "../ui/menubar";

export default { title: 'Layout/Menubar + Map' };

type PrimitiveType = 'cube' | 'sphere' | 'cone' | 'cylinder';

export function MenubarWithMap() {
  const [primitives, setPrimitives] = useState<PrimitiveType[]>([]);

  function addPrimitive(type: PrimitiveType) {
    setPrimitives((prev) => [...prev, type]);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>New Window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Share</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Print</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Add</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={(e) => { e.preventDefault(); addPrimitive('cube'); }}>Cube</MenubarItem>
            <MenubarItem onSelect={(e) => { e.preventDefault(); addPrimitive('sphere'); }}>Sphere</MenubarItem>
            <MenubarItem onSelect={(e) => { e.preventDefault(); addPrimitive('cone'); }}>Cone</MenubarItem>
            <MenubarItem onSelect={(e) => { e.preventDefault(); addPrimitive('cylinder'); }}>Cylinder</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Map
          initialViewState={{
            latitude: 51,
            longitude: 0,
            zoom: 13,
            pitch: 45,
          }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          <Canvas latitude={51} longitude={0}>
            <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]} intensity={Math.PI} />
            <object3D scale={500}>
              {primitives.map((type, idx) => {
                const x = (idx % 6) - 3; // spread along X
                const z = Math.floor(idx / 6) * 2; // rows along Z
                return (
                  <Primitive key={idx} type={type} position={[x * 1.6, 1, z * 1.6]} />
                );
              })}
            </object3D>
          </Canvas>
        </Map>
      </div>
    </div>
  );
}

function Primitive({ type, position }: { type: PrimitiveType; position: [number, number, number] }) {
  switch (type) {
    case 'cube':
      return (
        <mesh position={position}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#4f46e5" />
        </mesh>
      );
    case 'sphere':
      return (
        <mesh position={position}>
          <sphereGeometry args={[0.7, 32, 32]} />
          <meshStandardMaterial color="#16a34a" />
        </mesh>
      );
    case 'cone':
      return (
        <mesh position={position}>
          <coneGeometry args={[0.8, 1.4, 24]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      );
    case 'cylinder':
      return (
        <mesh position={position}>
          <cylinderGeometry args={[0.8, 0.8, 1.4, 24]} />
          <meshStandardMaterial color="#ca8a04" />
        </mesh>
      );
    default:
      return null;
  }
}
