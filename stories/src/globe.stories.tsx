import type { Meta } from '@storybook/react';
import { button, useControls } from 'leva';
import { memo } from 'react';
import { Marker as MapboxMarker } from 'react-map-gl/mapbox';
import { Marker as MaplibreMarker } from 'react-map-gl/maplibre';
import { Coordinates, useMap } from '@wendylabsinc/react-three-map/maplibre';
import { StoryMap } from './story-map-storybook';

const CITIES = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, color: '#ffb400' },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, color: '#00a699' },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, color: '#7b61ff' },
  { name: 'Cape Town', latitude: -33.9249, longitude: 18.4241, color: '#fc642d' },
  { name: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729, color: '#3ec1d3' },
  { name: 'Reykjavik', latitude: 64.1466, longitude: -21.9426, color: '#e4e4e4' },
];

/** London, the `<Canvas>` origin */
const ORIGIN = { name: 'London', latitude: 51.5074, longitude: -0.1278, color: '#ff5a5f' };

/**
 * Objects stay anchored to the globe, and follow the map while it blends into Mercator
 * as you zoom in (MapLibre: zoom 11 to 12, Mapbox: zoom 5 to 6).
 */
export function Globe() {
  const { projection, height, radius } = useControls({
    projection: { value: 'globe', options: ['globe', 'mercator'] },
    height: { value: 800, min: 0.1, max: 2000, label: 'height (km)' },
    radius: { value: 60, min: 0.01, max: 300, label: 'radius (km)' },
  });

  return <StoryMap
    latitude={ORIGIN.latitude}
    longitude={ORIGIN.longitude}
    zoom={1.6}
    pitch={20}
    projection={projection as 'globe' | 'mercator'}
    maplibreStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    mapboxStyle="mapbox://styles/mapbox/light-v11"
    maplibreChildren={<Markers Marker={MaplibreMarker} />}
    mapboxChildren={<Markers Marker={MapboxMarker} />}
  >
    <FlyToButtons />
    <Lights />
    <Pillar color={ORIGIN.color} height={height * 1000} radius={radius * 1000} />
    {CITIES.map(city => (
      <Coordinates key={city.name} latitude={city.latitude} longitude={city.longitude}>
        <Lights />
        <Pillar color={city.color} height={height * 1000} radius={radius * 1000} />
      </Coordinates>
    ))}
  </StoryMap>
}

const FlyToButtons = memo(() => {
  const map = useMap();
  useControls('fly to', () => ({
    'whole globe': button(() => map?.flyTo({ center: [ORIGIN.longitude, ORIGIN.latitude], zoom: 1.6, pitch: 20, bearing: 0 })),
    ...Object.fromEntries([ORIGIN, ...CITIES].map(city => [
      city.name,
      button(() => map?.flyTo({ center: [city.longitude, city.latitude], zoom: 5.5, pitch: 50, bearing: 0 })),
    ])),
  }), [map]);
  return null;
});
FlyToButtons.displayName = 'FlyToButtons';

/** DOM markers placed by the map itself, to compare against the 3D objects */
const Markers = memo<{ Marker: typeof MaplibreMarker | typeof MapboxMarker }>(({ Marker }) => <>
  {[ORIGIN, ...CITIES].map(city => (
    <Marker key={city.name} latitude={city.latitude} longitude={city.longitude}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%', background: city.color,
        border: '2px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,.4)',
      }} />
    </Marker>
  ))}
</>);
Markers.displayName = 'Markers';

const Lights = memo(() => <>
  <hemisphereLight args={['#ffffff', '#60666C']} intensity={Math.PI * 0.6} />
  <directionalLight position={[1, 2, 1.5]} intensity={Math.PI * 0.6} />
</>);
Lights.displayName = 'Lights';

const Pillar = memo<{ color: string, height: number, radius: number }>(({ color, height, radius }) => (
  <mesh position={[0, height / 2, 0]}>
    <cylinderGeometry args={[radius, radius, height, 32]} />
    <meshStandardMaterial color={color} />
  </mesh>
));
Pillar.displayName = 'Pillar';

const meta: Meta = {
  title: 'Globe',
  component: Globe,
};

export default meta;
