import type { Meta } from '@storybook/react';
import { folder, useControls } from 'leva';
import { useEffect, useMemo } from 'react';
import { StoryMap } from '../story-map-storybook';
import { CloudLayer, VolumetricClouds } from './volumetric-clouds';

/** San Francisco Bay */
const ORIGIN = { latitude: 37.77, longitude: -122.35 };

const TYPES = { cumulus: 1, stratocumulus: 0.55, stratus: 0.12 };

type LayerName = 'low' | 'mid' | 'high';

type Preset = Record<LayerName, Partial<CloudLayer> & { enabled: boolean }>;

/** Weather presets, a starting point for tuning each layer */
const PRESETS: Record<string, Preset> = {
  'fair weather cumulus': {
    low: { enabled: true, altitude: 1500, thickness: 1400, coverage: 0.45, density: 1, type: TYPES.cumulus, size: 5000, erosion: 0.55 },
    mid: { enabled: false },
    high: { enabled: false },
  },
  'scattered, two layers': {
    low: { enabled: true, altitude: 1200, thickness: 1600, coverage: 0.5, density: 1, type: TYPES.cumulus, size: 5500, erosion: 0.5 },
    mid: { enabled: true, altitude: 4200, thickness: 700, coverage: 0.4, density: 0.6, type: TYPES.stratocumulus, size: 9000, erosion: 0.6 },
    high: { enabled: false },
  },
  'broken stratocumulus': {
    low: { enabled: true, altitude: 900, thickness: 900, coverage: 0.72, density: 1, type: TYPES.stratocumulus, size: 7000, erosion: 0.45 },
    mid: { enabled: false },
    high: { enabled: true, altitude: 8500, thickness: 500, coverage: 0.35, density: 0.25, type: TYPES.stratus, size: 20000, erosion: 0.8 },
  },
  'overcast': {
    low: { enabled: true, altitude: 700, thickness: 1100, coverage: 0.95, density: 1.2, type: TYPES.stratus, size: 9000, erosion: 0.35 },
    mid: { enabled: true, altitude: 3000, thickness: 800, coverage: 0.8, density: 0.7, type: TYPES.stratocumulus, size: 12000, erosion: 0.4 },
    high: { enabled: false },
  },
  'towering cumulus': {
    low: { enabled: true, altitude: 1400, thickness: 4500, coverage: 0.5, density: 1.4, type: TYPES.cumulus, size: 8000, erosion: 0.6 },
    mid: { enabled: false },
    high: { enabled: true, altitude: 9000, thickness: 600, coverage: 0.3, density: 0.2, type: TYPES.stratus, size: 25000, erosion: 0.85 },
  },
};

const DEFAULT_LAYERS: Record<LayerName, CloudLayer> = {
  low: { enabled: true, altitude: 1500, thickness: 1400, coverage: 0.45, density: 1, type: TYPES.cumulus, size: 5000, erosion: 0.55, windSpeed: 8, windDirection: 270 },
  mid: { enabled: false, altitude: 4200, thickness: 700, coverage: 0.4, density: 0.6, type: TYPES.stratocumulus, size: 9000, erosion: 0.6, windSpeed: 15, windDirection: 250 },
  high: { enabled: false, altitude: 8500, thickness: 500, coverage: 0.35, density: 0.25, type: TYPES.stratus, size: 20000, erosion: 0.8, windSpeed: 30, windDirection: 240 },
};

function useLayerControls(name: LayerName, order: number) {
  const layer = DEFAULT_LAYERS[name];
  const typeName = Object.entries(TYPES).find(([, value]) => value === layer.type)?.[0] ?? 'cumulus';
  return useControls(() => ({
    [`${name} layer`]: folder({
      [`${name}_enabled`]: { value: layer.enabled ?? true, label: 'enabled' },
      [`${name}_type`]: { value: typeName, options: Object.keys(TYPES), label: 'type' },
      [`${name}_altitude`]: { value: layer.altitude, min: 100, max: 12000, step: 50, label: 'base (m)' },
      [`${name}_thickness`]: { value: layer.thickness, min: 50, max: 8000, step: 50, label: 'thickness (m)' },
      [`${name}_coverage`]: { value: layer.coverage, min: 0, max: 1, step: 0.01, label: 'coverage' },
      [`${name}_density`]: { value: layer.density, min: 0.02, max: 3, step: 0.01, label: 'density' },
      [`${name}_size`]: { value: layer.size / 1000, min: 0.5, max: 40, step: 0.1, label: 'cell size (km)' },
      [`${name}_erosion`]: { value: layer.erosion, min: 0, max: 1, step: 0.01, label: 'wispiness' },
      [`${name}_windSpeed`]: { value: layer.windSpeed, min: 0, max: 80, step: 1, label: 'wind (m/s)' },
      [`${name}_windDirection`]: { value: layer.windDirection, min: 0, max: 360, step: 1, label: 'wind from (°)' },
    }, { collapsed: order > 0, order: order + 2 }),
  }));
}

function readLayer(name: LayerName, values: Record<string, unknown>): CloudLayer {
  const get = <T,>(key: string) => values[`${name}_${key}`] as T;
  return {
    enabled: get<boolean>('enabled'),
    type: TYPES[get<keyof typeof TYPES>('type')],
    altitude: get('altitude'),
    thickness: get('thickness'),
    coverage: get('coverage'),
    density: get('density'),
    size: get<number>('size') * 1000,
    erosion: get('erosion'),
    windSpeed: get('windSpeed'),
    windDirection: get('windDirection'),
  };
}

/**
 * Ray marched volumetric clouds with up to three layers, tuned like a flight simulator weather
 * panel, and the shadows they cast on the map.
 */
export function Default() {

  const [low, setLow] = useLayerControls('low', 0);
  const [mid, setMid] = useLayerControls('mid', 1);
  const [high, setHigh] = useLayerControls('high', 2);

  const { preset } = useControls({
    preset: { value: 'fair weather cumulus', options: Object.keys(PRESETS), order: 0 },
  });

  // apply a preset to the layer controls
  useEffect(() => {
    const layers = PRESETS[preset];
    // leva can't type the dynamic keys of these folders
    const setters = { low: setLow, mid: setMid, high: setHigh } as Record<LayerName, (values: Record<string, unknown>) => void>;
    (Object.keys(setters) as LayerName[]).forEach(name => {
      const layer = layers[name];
      const values: Record<string, unknown> = { [`${name}_enabled`]: layer.enabled };
      for (const [key, value] of Object.entries(layer)) {
        if (key === 'enabled') continue;
        if (key === 'type') values[`${name}_type`] = Object.entries(TYPES).find(([, v]) => v === value)?.[0];
        else if (key === 'size') values[`${name}_size`] = (value as number) / 1000;
        else values[`${name}_${key}`] = value;
      }
      setters[name](values);
    });
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const sun = useControls('sun', {
    elevation: { value: 38, min: -5, max: 90, step: 0.5, label: 'elevation (°)' },
    azimuth: { value: 210, min: 0, max: 360, step: 1, label: 'azimuth (°)' },
    intensity: { value: 1, min: 0.1, max: 3, step: 0.05 },
    exposure: { value: 1, min: 0.2, max: 3, step: 0.05 },
  }, { order: 1 });

  const shadow = useControls('shadows', {
    shadows: { value: true, label: 'cast on the map' },
    shadowStrength: { value: 0.6, min: 0, max: 1, step: 0.01, label: 'darkness' },
  }, { order: 1 });

  const quality = useControls('quality', {
    resolutionScale: { value: 0.5, min: 0.25, max: 1, step: 0.05, label: 'resolution' },
    steps: { value: 64, min: 16, max: 256, step: 1, label: 'samples / layer' },
    lightSteps: { value: 6, min: 1, max: 16, step: 1, label: 'light samples' },
    shadowSteps: { value: 8, min: 1, max: 16, step: 1, label: 'shadow samples' },
    maxDistance: { value: 120, min: 20, max: 300, step: 5, label: 'draw distance (km)' },
    extent: { value: 80, min: 10, max: 300, step: 5, label: 'cloud field (km)' },
    timeScale: { value: 10, min: 0, max: 200, step: 1, label: 'time lapse' },
    temporal: { value: true, label: 'temporal accumulation' },
  }, { collapsed: true, order: 5 });

  const layers = useMemo(() => [readLayer('low', low), readLayer('mid', mid), readLayer('high', high)], [low, mid, high]);

  return <StoryMap
    latitude={ORIGIN.latitude}
    longitude={ORIGIN.longitude}
    zoom={12.2}
    pitch={77}
    bearing={25}
    maplibreStyle={SATELLITE_STYLE}
    mapboxStyle="mapbox://styles/mapbox/satellite-streets-v12"
    maplibreProps={{ maxPitch: 85 }}
    mapboxProps={{ maxPitch: 85 }}
  >
    <VolumetricClouds
      layers={layers}
      sunElevation={sun.elevation}
      sunAzimuth={sun.azimuth}
      sunIntensity={sun.intensity}
      exposure={sun.exposure}
      shadows={shadow.shadows}
      shadowStrength={shadow.shadowStrength}
      resolutionScale={quality.resolutionScale}
      steps={quality.steps}
      lightSteps={quality.lightSteps}
      shadowSteps={quality.shadowSteps}
      maxDistance={quality.maxDistance * 1000}
      extent={quality.extent * 1000}
      timeScale={quality.timeScale}
      temporal={quality.temporal}
    />
  </StoryMap>
}

/** Esri World Imagery, satellite tiles that make the cloud shadows easy to see */
const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
  sky: {
    'sky-color': '#5d9be8',
    'horizon-color': '#dbe8f5',
    'fog-color': '#dbe8f5',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.7,
    'fog-ground-blend': 0.85,
  },
};

const meta: Meta = {
  title: 'Volumetric Clouds',
  component: Default,
};

export default meta;
