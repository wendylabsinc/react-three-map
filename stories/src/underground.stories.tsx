import type { Meta } from '@storybook/react';
import { Grid } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { button, useControls } from 'leva';
import MapLibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MutableRefObject, memo, useMemo, useRef } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import Map, { useMap as useMapGL } from 'react-map-gl/maplibre';
import { BackSide, CatmullRomCurve3, DoubleSide, Group, Mesh, Vector3 } from 'three';
import { Canvas, Coords, UndergroundCamera, coordsToVector3 } from '@wendylabsinc/react-three-map/maplibre';

/** Bank junction, in the City of London */
const ORIGIN = { latitude: 51.5133, longitude: -0.0886 };

interface Line {
  name: string;
  color: string;
  /** stops along the line, with depth below the street */
  path: (Coords & { altitude: number })[];
}

/** Illustrative tube tunnels around Bank, not surveyed data */
const LINES: Line[] = [
  {
    name: 'Central', color: '#dc241f', path: [
      { latitude: 51.5146, longitude: -0.0973, altitude: -22 },
      { latitude: 51.5136, longitude: -0.0925, altitude: -24 },
      { latitude: 51.5133, longitude: -0.0886, altitude: -25 },
      { latitude: 51.5152, longitude: -0.0849, altitude: -24 },
      { latitude: 51.5178, longitude: -0.0823, altitude: -22 },
    ]
  },
  {
    name: 'Northern', color: '#2b2b2b', path: [
      { latitude: 51.5186, longitude: -0.0886, altitude: -30 },
      { latitude: 51.5158, longitude: -0.0890, altitude: -33 },
      { latitude: 51.5130, longitude: -0.0880, altitude: -36 },
      { latitude: 51.5090, longitude: -0.0872, altitude: -42 },
      { latitude: 51.5052, longitude: -0.0864, altitude: -40 },
    ]
  },
  {
    name: 'Waterloo & City', color: '#76d0bd', path: [
      { latitude: 51.5129, longitude: -0.0894, altitude: -28 },
      { latitude: 51.5100, longitude: -0.0975, altitude: -34 },
      { latitude: 51.5075, longitude: -0.1050, altitude: -45 },
      { latitude: 51.5050, longitude: -0.1100, altitude: -38 },
      { latitude: 51.5031, longitude: -0.1132, altitude: -30 },
    ]
  },
];

/** A few blocks above ground, to see the ground hide them from below */
const BUILDINGS: [x: number, z: number, width: number, depth: number, height: number][] = [
  [-60, -70, 50, 40, 60], [70, -60, 40, 60, 90], [-90, 60, 60, 50, 45], [80, 80, 50, 40, 120],
];

/**
 * MapLibre only: lift the constraint that keeps the camera above the ground, then pitch past 90°
 * (right-click drag, or the buttons) to look up at the map from underground, or fly into a tunnel.
 */
export function Underground() {
  const hud = useRef<HTMLDivElement>(null);

  const { underground, minAltitude, groundOpacity, overlay } = useControls({
    underground: { value: true, label: 'allow underground' },
    minAltitude: { value: -300, min: -1000, max: 0, step: 10, label: 'min altitude (m)' },
    groundOpacity: { value: 0.3, min: 0, max: 1, label: 'ground opacity' },
    overlay: { value: false },
  });

  return <div style={{ height: '100vh', position: 'relative' }}>
    <Map
      mapLib={MapLibre}
      canvasContextAttributes={{ antialias: true }}
      initialViewState={{ ...ORIGIN, zoom: 16.4, pitch: 62, bearing: -25 }}
      // look up from below the map
      maxPitch={180}
      // let the orbit centre go below the street (see `setCenterElevation`)
      centerClampedToGround={false}
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    >
      <UndergroundCamera enabled={underground} minAltitude={minAltitude} />
      <CameraButtons />
      <Canvas latitude={ORIGIN.latitude} longitude={ORIGIN.longitude} overlay={overlay}>
        <hemisphereLight args={['#ffffff', '#8a7b6a']} intensity={Math.PI * 0.8} />
        <directionalLight position={[200, 400, 100]} intensity={Math.PI * 0.8} />
        {LINES.map(line => <Tunnel key={line.name} line={line} />)}
        <Shaft depth={42} />
        {BUILDINGS.map(([x, z, width, depth, height], i) => (
          <mesh key={i} position={[x, height / 2, z]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#d9d4cc" />
          </mesh>
        ))}
        <Ground opacity={groundOpacity} />
        <Earth />
        <CameraAltitude hud={hud} />
      </Canvas>
    </Map>
    <div ref={hud} style={{
      position: 'absolute', left: 12, bottom: 34, padding: '6px 10px', borderRadius: 6,
      background: 'rgba(0,0,0,.65)', color: 'white', font: '13px/1.4 monospace', pointerEvents: 'none',
    }} />
  </div>
}

/** Tunnel tube with a train running along it, open inside so you can fly through */
const Tunnel = memo<{ line: Line }>(({ line }) => {
  const curve = useMemo(() => new CatmullRomCurve3(
    line.path.map(stop => new Vector3(...coordsToVector3(stop, ORIGIN))),
  ), [line]);
  const train = useRef<Mesh>(null);
  const tangent = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    if (!train.current) return;
    const length = curve.getLength();
    // 15 m/s, back and forth
    const t = ((clock.elapsedTime * 15) % (2 * length)) / length;
    const u = t < 1 ? t : 2 - t;
    curve.getPointAt(u, train.current.position);
    curve.getTangentAt(u, tangent);
    train.current.lookAt(train.current.position.clone().add(tangent));
  });

  return <>
    <mesh>
      <tubeGeometry args={[curve, 256, 3.5, 20, false]} />
      <meshStandardMaterial color={line.color} side={DoubleSide} roughness={0.7} transparent opacity={0.65} />
    </mesh>
    <mesh ref={train}>
      <boxGeometry args={[2.6, 2.6, 60]} />
      <meshStandardMaterial color="#f2f2f2" emissive={line.color} emissiveIntensity={0.4} />
    </mesh>
  </>
});
Tunnel.displayName = 'Tunnel';

/** Station shaft at Bank, from the platforms up to the street */
const Shaft = memo<{ depth: number }>(({ depth }) => (
  <mesh position={[0, -depth / 2, 0]}>
    <cylinderGeometry args={[9, 9, depth, 32, 1, true]} />
    <meshStandardMaterial color="#9fb3c8" side={DoubleSide} transparent opacity={0.45} />
  </mesh>
));
Shaft.displayName = 'Shaft';

/** Street level: a grid, and a see-through layer of ground */
const Ground = memo<{ opacity: number }>(({ opacity }) => <>
  <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
    <planeGeometry args={[3000, 3000]} />
    <meshBasicMaterial color="#6f5f4b" transparent opacity={opacity} side={DoubleSide} depthWrite={false} />
  </mesh>
  <Grid
    position={[0, 0.2, 0]}
    args={[3000, 3000]}
    cellSize={10}
    sectionSize={100}
    cellColor="#8a7b6a"
    sectionColor="#4a3f33"
    fadeDistance={1500}
    side={DoubleSide}
  />
</>);
Ground.displayName = 'Ground';

/**
 * Soil around the camera while it is underground, the map draws nothing below its horizon.
 * Open at the top, so the underside of the map stays visible, with a rim just above the street
 * to hide the far end of the map.
 */
const Earth = memo(() => {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    group.current.visible = camera.position.y < 0;
    group.current.position.set(camera.position.x, 0, camera.position.z);
  });
  return <group ref={group}>
    <mesh position={[0, -985, 0]}>
      <cylinderGeometry args={[4000, 4000, 2030, 64, 1, true]} />
      <meshBasicMaterial color="#3b3026" side={BackSide} />
    </mesh>
    <mesh position={[0, -2000, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[4000, 64]} />
      <meshBasicMaterial color="#2a221b" />
    </mesh>
  </group>
});
Earth.displayName = 'Earth';

/** The camera is in scene coordinates, so its height is its altitude above the street */
const CameraAltitude = memo<{ hud: MutableRefObject<HTMLDivElement | null> }>(({ hud }) => {
  useFrame(({ camera }) => {
    if (!hud.current) return;
    const altitude = camera.position.y;
    hud.current.textContent = `camera ${altitude < 0 ? 'underground' : 'above ground'}: ${altitude.toFixed(1)} m`;
  });
  return null;
});
CameraAltitude.displayName = 'CameraAltitude';

interface CameraPose {
  center: [longitude: number, latitude: number],
  zoom: number,
  pitch: number,
  bearing: number,
  /** altitude of the orbit centre, needs `centerClampedToGround={false}` */
  elevation: number,
}

const POSES: Record<string, CameraPose> = {
  // inside the Central line tunnel, looking east towards Bank
  'dive into the tunnels': { center: [ORIGIN.longitude, ORIGIN.latitude], zoom: 18.8, pitch: 84, bearing: 80, elevation: -28 },
  'look up from below': { center: [ORIGIN.longitude, ORIGIN.latitude], zoom: 17.2, pitch: 118, bearing: -25, elevation: 0 },
  'back to the surface': { center: [ORIGIN.longitude, ORIGIN.latitude], zoom: 16.4, pitch: 62, bearing: -25, elevation: 0 },
};

let animation = 0;

/** `easeTo` ignores `elevation`, animate every camera property with `jumpTo` instead */
function animateTo(map: MaplibreMap, pose: CameraPose, duration = 3500) {
  const from = {
    center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(),
    bearing: map.getBearing(), elevation: map.getCenterElevation(),
  };
  // turn the short way round
  const bearing = from.bearing + ((((pose.bearing - from.bearing) % 360) + 540) % 360 - 180);
  const start = performance.now();
  const id = ++animation;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const step = (now: number) => {
    if (id !== animation) return;
    const k = Math.min((now - start) / duration, 1);
    const t = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    map.jumpTo({
      center: [lerp(from.center.lng, pose.center[0], t), lerp(from.center.lat, pose.center[1], t)],
      zoom: lerp(from.zoom, pose.zoom, t),
      pitch: lerp(from.pitch, pose.pitch, t),
      bearing: lerp(from.bearing, bearing, t),
      elevation: lerp(from.elevation, pose.elevation, t),
    });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const CameraButtons = memo(() => {
  const { current } = useMapGL();
  const map = current?.getMap();
  useControls('camera', Object.fromEntries(Object.entries(POSES).map(([name, pose]) => [
    name, button(() => map && animateTo(map, pose)),
  ])), [map]);
  return null;
});
CameraButtons.displayName = 'CameraButtons';

const meta: Meta = {
  title: 'Underground',
  component: Underground,
};

export default meta;
