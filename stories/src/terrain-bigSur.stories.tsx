import { Cone } from "@react-three/drei";
import { useControls } from "leva";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useMap } from "@wendylabsinc/react-three-map";
import { Euler, Matrix4, Vector3, Vector3Tuple } from "three";
import { EnhancedPivotControls } from "@wendylabsinc/react-three-map";
import { StoryMap } from "./story-map-storybook";

// Back to Big Sur coordinates - AWS terrain tiles have global coverage
// 36°16'47"N 121°50'00"W to decimal degrees
// 36 + 16/60 + 47/3600 = 36.2797
// -(121 + 50/60 + 0/3600) = -121.8333
const BIG_SUR_LAT = 36.2797;
const BIG_SUR_LON = -121.8333;


export function TerrainWithPivotControls() {
  const origin = useControls({
    latitude: { value: BIG_SUR_LAT, min: -90, max: 90 },
    longitude: { value: BIG_SUR_LON, min: -180, max: 180 },
    terrainExaggeration: { value: 1.5, min: 0.5, max: 3, step: 0.1, label: 'Terrain Exaggeration' },
    showTranslation: { value: true, label: 'Show Translation' },
    showRotationX: { value: true, label: 'Show Rotation X (Red)' },
    showRotationY: { value: true, label: 'Show Rotation Y (Green)' },
    showRotationZ: { value: true, label: 'Show Rotation Z (Blue)' },
    showLabels: { value: true, label: 'Show Axis Labels' },
    controlScale: { value: 500, min: 100, max: 1000, step: 50, label: 'Control Scale' },
    rotationThickness: { value: 0.06, min: 0.01, max: 0.1, step: 0.005, label: 'Rotation Thickness' },
    translationThickness: { value: 0.015, min: 0.005, max: 0.05, step: 0.005, label: 'Translation Thickness' },
    arrowHeadSize: { value: 0.05, min: 0.02, max: 0.15, step: 0.01, label: 'Arrow Head Size' },
    arrowLength: { value: 1, min: 0.5, max: 2, step: 0.1, label: 'Arrow Length' },
    arrowHeadLength: { value: 0.2, min: 0.1, max: 0.5, step: 0.05, label: 'Arrow Head Length' }
  })
  const [position, setPosition] = useState<Vector3Tuple>([0, 0, 0]);
  const [rotation, setRotation] = useState<Vector3Tuple>([0, 0, 0]);

  // reset on origin change
  useEffect(() => {
    setPosition([0, 0, 0]);
    setRotation([0, 0, 0]);
  }, [origin.latitude, origin.longitude])

  // Prepare the mapStyle for MapLibre with terrain
  const maplibreStyle = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
        maxzoom: 19
      },
      // Use AWS terrain tiles for better global coverage
      terrainSource: {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      },
      hillshadeSource: {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm'
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshadeSource',
        layout: {
          visibility: 'visible'
        },
        paint: {
          'hillshade-shadow-color': '#473B24',
          'hillshade-highlight-color': '#FEFEFE',
          'hillshade-accent-color': '#534330',
          'hillshade-exaggeration': 0.5
        }
      }
    ],
    terrain: {
      source: 'terrainSource',
      exaggeration: origin.terrainExaggeration
    }
  };

  // Prepare the mapStyle for Mapbox with terrain
  // Mapbox uses mapbox-terrain-v2 and requires different configuration
  const mapboxStyle = {
    version: 8,
    sources: {
      'mapbox-dem': {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      },
      'satellite': {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'mapbox-dem',
        layout: {
          visibility: 'visible'
        },
        paint: {
          'hillshade-shadow-color': '#473B24',
          'hillshade-highlight-color': '#FEFEFE',
          'hillshade-accent-color': '#534330',
          'hillshade-exaggeration': 0.5
        }
      }
    ],
    terrain: {
      source: 'mapbox-dem',
      exaggeration: origin.terrainExaggeration
    }
  };

  return <StoryMap
    latitude={origin.latitude}
    longitude={origin.longitude}
    zoom={11}
    pitch={60}
    bearing={80}
    maplibreStyle={maplibreStyle}
    mapboxStyle={mapboxStyle}
    canvas={{
      shadows: true,
      frameloop: 'always'
    }}
  >
    <ambientLight intensity={0.8} />
    <directionalLight position={[10, 10, 5]} intensity={1} />
    <Move
      position={position}
      rotation={rotation}
      setPosition={setPosition}
      setRotation={setRotation}
      showTranslation={origin.showTranslation}
      showRotationX={origin.showRotationX}
      showRotationY={origin.showRotationY}
      showRotationZ={origin.showRotationZ}
      showLabels={origin.showLabels}
      scale={origin.controlScale}
      rotationThickness={origin.rotationThickness}
      translationThickness={origin.translationThickness}
      arrowHeadSize={origin.arrowHeadSize}
      arrowLength={origin.arrowLength}
      arrowHeadLength={origin.arrowHeadLength}
    />
    <Cone
      args={[50, 100, 8]}
      position={position}
      rotation={rotation}
    >
      <meshStandardMaterial color="orange" />
    </Cone>
    <axesHelper position={position} rotation={rotation} args={[1000]} />
  </StoryMap>
}

interface MovingBoxProps {
  position: Vector3Tuple,
  rotation: Vector3Tuple,
  setPosition: (pos: Vector3Tuple) => void,
  setRotation: (rot: Vector3Tuple) => void,
  showTranslation: boolean,
  showRotationX: boolean,
  showRotationY: boolean,
  showRotationZ: boolean,
  showLabels: boolean,
  scale: number,
  rotationThickness: number,
  translationThickness: number,
  arrowHeadSize: number,
  arrowLength: number,
  arrowHeadLength: number
}

const _v3 = new Vector3()
const _euler = new Euler()

const Move: FC<MovingBoxProps> = ({
  position,
  rotation,
  setPosition,
  setRotation,
  showTranslation,
  showRotationX,
  showRotationY,
  showRotationZ,
  showLabels,
  scale,
  rotationThickness,
  translationThickness,
  arrowHeadSize,
  arrowLength,
  arrowHeadLength
}) => {
  const matrix = useMemo(() => {
    const m = new Matrix4();
    m.makeRotationFromEuler(_euler.fromArray(rotation));
    m.setPosition(...position);
    return m;
  }, [position, rotation]);

  const map = useMap();

  const onDragStart = useCallback(() => {
    // Disable map interactions to allow pivot control dragging
    if (map) {
      map.dragPan.disable();
      map.dragRotate.disable();
      map.doubleClickZoom.disable();
    }
  }, [map]);

  const onDragEnd = useCallback(() => {
    // Re-enable map interactions after dragging
    if (map) {
      // Use setTimeout to avoid immediate re-enabling that could capture the release event
      setTimeout(() => {
        map.dragPan.enable();
        map.dragRotate.enable();
        map.doubleClickZoom.enable();
      }, 50);
    }
  }, [map]);

  const onDrag = useCallback((m4: Matrix4) => {
    setPosition(_v3.setFromMatrixPosition(m4).toArray());
    if (showRotationX || showRotationY || showRotationZ) {
      _euler.setFromRotationMatrix(m4);
      setRotation(_euler.toArray() as Vector3Tuple);
    }
  }, [setPosition, setRotation, showRotationX, showRotationY, showRotationZ])

  const disableRotations = useMemo(() => {
    return [!showRotationX, !showRotationY, !showRotationZ] as [boolean, boolean, boolean];
  }, [showRotationX, showRotationY, showRotationZ]);

  const disableTranslations = useMemo(() => {
    return [!showTranslation, !showTranslation, !showTranslation] as [boolean, boolean, boolean];
  }, [showTranslation]);

  return (
    <EnhancedPivotControls
      fixed
      matrix={matrix}
      disableRotations={disableRotations}
      disableTranslations={disableTranslations}
      scale={scale}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
      annotations={showLabels}
      rotationThickness={rotationThickness}
      translationThickness={translationThickness}
      arrowHeadSize={arrowHeadSize}
      arrowLength={arrowLength}
      arrowHeadLength={arrowHeadLength}
    />
  )
}

export default {
  title: 'Terrain',
};

export const BigSur = TerrainWithPivotControls;
