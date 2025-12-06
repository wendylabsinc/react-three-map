import { Box, Cone, ScreenSizer } from "@react-three/drei";
import { useControls } from "leva";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Marker as MapboxMarker } from "react-map-gl/mapbox";
import { Marker as MaplibreMarker } from "react-map-gl/maplibre";
import { useMap, vector3ToCoords } from "@wendylabsinc/react-three-map";
import { Euler, Matrix4, Vector3, Vector3Tuple } from "three";
import { StoryMap } from "./story-map-storybook";
import { EnhancedPivotControls } from "@wendylabsinc/react-three-map";

export function EnhancedPivotStory() {
  const origin = useControls({
    latitude: { value: 51, min: -90, max: 90 },
    longitude: { value: 0, min: -180, max: 180 },
    altitude: { value: 0, min: -1000, max: 10000, step: 10 },
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
  const [selectedObject, setSelectedObject] = useState<'cone' | number>('cone');
  const [boxPositions, setBoxPositions] = useState<Vector3Tuple[]>([
    [-500, 0, -500],
    [500, 0, -500],
    [-500, 0, 500],
    [500, 0, 500],
    [0, 200, 0],
    [0, -200, 0]
  ]);
  const [boxRotations, setBoxRotations] = useState<Vector3Tuple[]>([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]);
  
  const activePosition = selectedObject === 'cone' ? position : boxPositions[selectedObject];
  const activeRotation = selectedObject === 'cone' ? rotation : boxRotations[selectedObject];
  const geoPos = useMemo(() => vector3ToCoords(activePosition, origin), [activePosition, origin])

  // reset on origin change
  useEffect(() => {
    setPosition([0, 0, 0]);
    setRotation([0, 0, 0]);
    setBoxPositions([
      [-500, 0, -500],
      [500, 0, -500],
      [-500, 0, 500],
      [500, 0, 500],
      [0, 200, 0],
      [0, -200, 0]
    ]);
    setBoxRotations([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]);
  }, [origin.latitude, origin.longitude, origin.altitude])
  
  const handleObjectSelect = useCallback((objectId: 'cone' | number) => {
    setSelectedObject(objectId);
  }, [])
  
  const handlePositionChange = useCallback((newPosition: Vector3Tuple) => {
    if (selectedObject === 'cone') {
      setPosition(newPosition);
    } else {
      const newPositions = [...boxPositions];
      newPositions[selectedObject] = newPosition;
      setBoxPositions(newPositions);
    }
  }, [selectedObject, boxPositions])
  
  const handleRotationChange = useCallback((newRotation: Vector3Tuple) => {
    if (selectedObject === 'cone') {
      setRotation(newRotation);
    } else {
      const newRotations = [...boxRotations];
      newRotations[selectedObject] = newRotation;
      setBoxRotations(newRotations);
    }
  }, [selectedObject, boxRotations])

  const hasAnyRotation = origin.showRotationX || origin.showRotationY || origin.showRotationZ;

  return <div style={{ height: '100vh' }}>
    <StoryMap
      {...origin}
      zoom={13}
      pitch={60}
      canvas={{ altitude: origin.altitude }}
      maplibreChildren={(
        <MaplibreMarker {...geoPos}>
          <div style={{ fontSize: 14, background: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '4px' }}>
            <strong>Selected: {selectedObject === 'cone' ? 'Cone' : `Box ${selectedObject + 1}`}</strong><br />
            <strong>Position:</strong><br />
            lat: {geoPos.latitude.toFixed(6)}<br />
            lon: {geoPos.longitude.toFixed(6)}<br />
            alt: {geoPos.altitude?.toFixed(2) || 0}m<br />
            {hasAnyRotation && (
              <>
                <strong>Rotation:</strong><br />
                {origin.showRotationX && <span style={{color: '#ff0000'}}>X: {(activeRotation[0] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationY && <span style={{color: '#00ff00'}}>Y: {(activeRotation[1] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationZ && <span style={{color: '#0000ff'}}>Z: {(activeRotation[2] * 180 / Math.PI).toFixed(1)}°<br /></span>}
              </>
            )}
          </div>
        </MaplibreMarker>
      )}
      mapboxChildren={(
        <MapboxMarker {...geoPos}>
          <div style={{ fontSize: 14, background: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '4px' }}>
            <strong>Selected: {selectedObject === 'cone' ? 'Cone' : `Box ${selectedObject + 1}`}</strong><br />
            <strong>Position:</strong><br />
            lat: {geoPos.latitude.toFixed(6)}<br />
            lon: {geoPos.longitude.toFixed(6)}<br />
            alt: {geoPos.altitude?.toFixed(2) || 0}m<br />
            {hasAnyRotation && (
              <>
                <strong>Rotation:</strong><br />
                {origin.showRotationX && <span style={{color: '#ff0000'}}>X: {(activeRotation[0] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationY && <span style={{color: '#00ff00'}}>Y: {(activeRotation[1] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationZ && <span style={{color: '#0000ff'}}>Z: {(activeRotation[2] * 180 / Math.PI).toFixed(1)}°<br /></span>}
              </>
            )}
          </div>
        </MapboxMarker>
      )}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      <Move 
        position={activePosition} 
        rotation={activeRotation}
        setPosition={handlePositionChange} 
        setRotation={handleRotationChange}
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
        material-color={selectedObject === 'cone' ? 'orange' : 'gray'}
        onClick={() => handleObjectSelect('cone')}
      />
      <InteractiveBoxes 
        positions={boxPositions}
        rotations={boxRotations}
        selectedObject={selectedObject}
        onSelectObject={handleObjectSelect}
      />
      <axesHelper position={position} rotation={rotation} args={[1000]} />
    </StoryMap>
  </div>
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

interface InteractiveBoxesProps {
  positions: Vector3Tuple[];
  rotations: Vector3Tuple[];
  selectedObject: 'cone' | number;
  onSelectObject: (objectId: 'cone' | number) => void;
}

const StaticBoxes: FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const positions: Vector3Tuple[] = [
    [-500, 0, -500],
    [500, 0, -500],
    [-500, 0, 500],
    [500, 0, 500],
    [0, 200, 0],
    [0, -200, 0]
  ];
  
  return (
    <>
      {positions.map((pos, index) => (
        <Box
          key={index}
          position={pos}
          args={[100, 100, 100]}
          onPointerOver={() => setHoveredIndex(index)}
          onPointerOut={() => setHoveredIndex(null)}
        >
          <meshStandardMaterial 
            color={hoveredIndex === index ? 'hotpink' : 'lightblue'} 
          />
        </Box>
      ))}
    </>
  );
};

const InteractiveBoxes: FC<InteractiveBoxesProps> = ({ 
  positions, 
  rotations, 
  selectedObject, 
  onSelectObject 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  return (
    <>
      {positions.map((pos, index) => (
        <Box
          key={index}
          position={pos}
          rotation={rotations[index]}
          args={[100, 100, 100]}
          onPointerOver={() => setHoveredIndex(index)}
          onPointerOut={() => setHoveredIndex(null)}
          onClick={() => onSelectObject(index)}
        >
          <meshStandardMaterial 
            color={
              selectedObject === index 
                ? 'orange' 
                : hoveredIndex === index 
                  ? 'hotpink' 
                  : 'lightblue'
            } 
          />
        </Box>
      ))}
    </>
  );
};

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
    map.dragPan.disable();
    map.dragRotate.disable();
  }, [map]);
  
  const onDragEnd = useCallback(() => {
    map.dragPan.enable();
    map.dragRotate.enable();
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

export function EnhancedPivotWithScreenSizer() {
  const origin = useControls('ScreenSizer Story', {
    latitude: { value: 51, min: -90, max: 90 },
    longitude: { value: 0, min: -180, max: 180 },
    altitude: { value: 0, min: -1000, max: 10000, step: 10 },
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
  const [conePosition, setConePosition] = useState<Vector3Tuple>([0, 0, 0]);
  const [coneRotation, setConeRotation] = useState<Vector3Tuple>([0, 0, 0]);
  const geoPos = useMemo(() => vector3ToCoords(conePosition, origin), [conePosition, origin])

  // reset on origin change
  useEffect(() => {
    setConePosition([0, 0, 0]);
    setConeRotation([0, 0, 0]);
  }, [origin.latitude, origin.longitude, origin.altitude])

  const hasAnyRotation = origin.showRotationX || origin.showRotationY || origin.showRotationZ;

  return <div style={{ height: '100vh' }}>
    <StoryMap
      {...origin}
      zoom={13}
      pitch={60}
      canvas={{ altitude: origin.altitude }}
      maplibreChildren={(
        <MaplibreMarker {...geoPos}>
          <div style={{ fontSize: 14, background: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '4px' }}>
            <strong>ScreenSizer Mode</strong><br />
            <strong>Position:</strong><br />
            lat: {geoPos.latitude.toFixed(6)}<br />
            lon: {geoPos.longitude.toFixed(6)}<br />
            alt: {geoPos.altitude?.toFixed(2) || 0}m<br />
            {hasAnyRotation && (
              <>
                <strong>Rotation:</strong><br />
                {origin.showRotationX && <span style={{color: '#ff0000'}}>X: {(coneRotation[0] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationY && <span style={{color: '#00ff00'}}>Y: {(coneRotation[1] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationZ && <span style={{color: '#0000ff'}}>Z: {(coneRotation[2] * 180 / Math.PI).toFixed(1)}°<br /></span>}
              </>
            )}
          </div>
        </MaplibreMarker>
      )}
      mapboxChildren={(
        <MapboxMarker {...geoPos}>
          <div style={{ fontSize: 14, background: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '4px' }}>
            <strong>ScreenSizer Mode</strong><br />
            <strong>Position:</strong><br />
            lat: {geoPos.latitude.toFixed(6)}<br />
            lon: {geoPos.longitude.toFixed(6)}<br />
            alt: {geoPos.altitude?.toFixed(2) || 0}m<br />
            {hasAnyRotation && (
              <>
                <strong>Rotation:</strong><br />
                {origin.showRotationX && <span style={{color: '#ff0000'}}>X: {(coneRotation[0] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationY && <span style={{color: '#00ff00'}}>Y: {(coneRotation[1] * 180 / Math.PI).toFixed(1)}°<br /></span>}
                {origin.showRotationZ && <span style={{color: '#0000ff'}}>Z: {(coneRotation[2] * 180 / Math.PI).toFixed(1)}°<br /></span>}
              </>
            )}
          </div>
        </MapboxMarker>
      )}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      <Move 
        position={conePosition} 
        rotation={coneRotation}
        setPosition={setConePosition} 
        setRotation={setConeRotation}
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
      <ScreenSizer position={conePosition} rotation={coneRotation} scale={1}>
        <Cone
          args={[50, 100, 8]}
          position={[0, 0, 0]}
          material-color={'hotpink'}
        />
      </ScreenSizer>
      <StaticBoxes />
      <axesHelper position={conePosition} rotation={coneRotation} args={[1000]} />
    </StoryMap>
  </div>
}

export default {
  title: 'PivotControls',
};

export const Default = EnhancedPivotStory;
export const WithScreenSizer = EnhancedPivotWithScreenSizer;