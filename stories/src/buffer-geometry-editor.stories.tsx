import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Meta } from '@storybook/react'
import { StoryMap } from './story-map-storybook'
import { Coordinates } from '@wendylabsinc/react-three-map'
import { Box, Sphere, Cone, Plane } from '@react-three/drei'
import { useControls, button } from 'leva'
import * as THREE from 'three'

interface GeometryObject {
  id: string
  type: 'plane' | 'cube' | 'cone' | 'sphere'
  coordinates: [number, number]
  color: string
  scale: number
  subdivisions?: number
  segments?: number
  radialSegments?: number
  heightSegments?: number
}

function GeometryOnMap({ object }: { object: GeometryObject }) {
  const position: [number, number, number] = [0, 0, 10]
  const baseSize = 20
  
  return (
    <Coordinates longitude={object.coordinates[0]} latitude={object.coordinates[1]}>
      {/* Lights must live inside Coordinates because it renders into its own scene */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 20, 10]} intensity={1} />
      <group>
        {object.type === 'plane' && (
          <Plane 
            args={[baseSize * object.scale, baseSize * object.scale, object.subdivisions || 1, object.subdivisions || 1]} 
            position={position}
          >
            <meshStandardMaterial color={object.color} side={THREE.DoubleSide} wireframe={(object.subdivisions && object.subdivisions > 1) || false} />
          </Plane>
        )}
        {object.type === 'cube' && (
          <Box 
            args={[baseSize * object.scale, baseSize * object.scale, baseSize * object.scale, object.segments || 1, object.segments || 1, object.segments || 1]} 
            position={position}
          >
            <meshStandardMaterial color={object.color} wireframe={(object.segments && object.segments > 1) || false} />
          </Box>
        )}
        {object.type === 'sphere' && (
          <Sphere 
            args={[(baseSize/2) * object.scale, object.radialSegments || 16, object.heightSegments || 32]} 
            position={position}
          >
            <meshStandardMaterial color={object.color} wireframe={(object.radialSegments && object.radialSegments > 8) || false} />
          </Sphere>
        )}
        {object.type === 'cone' && (
          <Cone 
            args={[(baseSize/2) * object.scale, baseSize * object.scale, object.radialSegments || 32, object.heightSegments || 1]} 
            position={position}
          >
            <meshStandardMaterial color={object.color} wireframe={(object.radialSegments && object.radialSegments > 8) || false} />
          </Cone>
        )}
      </group>
    </Coordinates>
  )
}

const BufferGeometryEditorComponent = () => {
  const [objects, setObjects] = useState<GeometryObject[]>([])
  // Memoize center to keep a stable reference for hook deps
  const center = useMemo<[number, number]>(() => [-122.4194, 37.7749], [])

  // Store settings for each geometry type
  const [planeSettings, setPlaneSettings] = useState({ subdivisions: 1, scale: 1, color: '#9333ea' })
  const [cubeSettings, setCubeSettings] = useState({ segments: 1, scale: 1, color: '#dc2626' })
  const [sphereSettings, setSphereSettings] = useState({ heightSegments: 32, radialSegments: 16, scale: 1, color: '#16a34a' })
  const [coneSettings, setConeSettings] = useState({ radialSegments: 32, heightSegments: 1, scale: 1, color: '#2563eb' })

  // Keep live refs to avoid stale closures in button callbacks
  const planeRef = useRef(planeSettings)
  const cubeRef = useRef(cubeSettings)
  const sphereRef = useRef(sphereSettings)
  const coneRef = useRef(coneSettings)
  useEffect(() => { planeRef.current = planeSettings }, [planeSettings])
  useEffect(() => { cubeRef.current = cubeSettings }, [cubeSettings])
  useEffect(() => { sphereRef.current = sphereSettings }, [sphereSettings])
  useEffect(() => { coneRef.current = coneSettings }, [coneSettings])

  const { geometryType } = useControls('Geometry Editor', {
    geometryType: {
      value: 'plane' as 'plane' | 'cube' | 'cone' | 'sphere',
      options: ['plane', 'cube', 'cone', 'sphere']
    }
  })

  // Plane controls (only visible when geometryType is 'plane')
  useControls('Plane Settings', {
    subdivisions: {
      value: planeSettings.subdivisions,
      min: 1,
      max: 50,
      step: 1,
      onChange: (v) => setPlaneSettings(prev => ({ ...prev, subdivisions: v })),
      label: 'Plane Subdivisions',
      render: () => geometryType === 'plane'
    },
    scale: {
      value: planeSettings.scale,
      min: 0.1,
      max: 5,
      step: 0.1,
      onChange: (v) => setPlaneSettings(prev => ({ ...prev, scale: v })),
      label: 'Plane Scale',
      render: () => geometryType === 'plane'
    },
    color: {
      value: planeSettings.color,
      onChange: (v) => setPlaneSettings(prev => ({ ...prev, color: v })),
      label: 'Plane Color',
      render: () => geometryType === 'plane'
    }
  }, {}, [geometryType])

  // Cube controls (only visible when geometryType is 'cube')
  useControls('Cube Settings', {
    segments: {
      value: cubeSettings.segments,
      min: 1,
      max: 20,
      step: 1,
      onChange: (v) => setCubeSettings(prev => ({ ...prev, segments: v })),
      label: 'Cube Segments',
      render: () => geometryType === 'cube'
    },
    scale: {
      value: cubeSettings.scale,
      min: 0.1,
      max: 5,
      step: 0.1,
      onChange: (v) => setCubeSettings(prev => ({ ...prev, scale: v })),
      label: 'Cube Scale',
      render: () => geometryType === 'cube'
    },
    color: {
      value: cubeSettings.color,
      onChange: (v) => setCubeSettings(prev => ({ ...prev, color: v })),
      label: 'Cube Color',
      render: () => geometryType === 'cube'
    }
  }, {}, [geometryType])

  // Sphere controls (only visible when geometryType is 'sphere')
  useControls('Sphere Settings', {
    heightSegments: {
      value: sphereSettings.heightSegments,
      min: 3,
      max: 64,
      step: 1,
      onChange: (v) => setSphereSettings(prev => ({ ...prev, heightSegments: v })),
      label: 'Sphere Height Segments',
      render: () => geometryType === 'sphere'
    },
    radialSegments: {
      value: sphereSettings.radialSegments,
      min: 3,
      max: 64,
      step: 1,
      onChange: (v) => setSphereSettings(prev => ({ ...prev, radialSegments: v })),
      label: 'Sphere Radial Segments',
      render: () => geometryType === 'sphere'
    },
    scale: {
      value: sphereSettings.scale,
      min: 0.1,
      max: 5,
      step: 0.1,
      onChange: (v) => setSphereSettings(prev => ({ ...prev, scale: v })),
      label: 'Sphere Scale',
      render: () => geometryType === 'sphere'
    },
    color: {
      value: sphereSettings.color,
      onChange: (v) => setSphereSettings(prev => ({ ...prev, color: v })),
      label: 'Sphere Color',
      render: () => geometryType === 'sphere'
    }
  }, {}, [geometryType])

  // Cone controls (only visible when geometryType is 'cone')
  useControls('Cone Settings', {
    radialSegments: {
      value: coneSettings.radialSegments,
      min: 3,
      max: 64,
      step: 1,
      onChange: (v) => setConeSettings(prev => ({ ...prev, radialSegments: v })),
      label: 'Cone Radial Segments',
      render: () => geometryType === 'cone'
    },
    heightSegments: {
      value: coneSettings.heightSegments,
      min: 1,
      max: 20,
      step: 1,
      onChange: (v) => setConeSettings(prev => ({ ...prev, heightSegments: v })),
      label: 'Cone Height Segments',
      render: () => geometryType === 'cone'
    },
    scale: {
      value: coneSettings.scale,
      min: 0.1,
      max: 5,
      step: 0.1,
      onChange: (v) => setConeSettings(prev => ({ ...prev, scale: v })),
      label: 'Cone Scale',
      render: () => geometryType === 'cone'
    },
    color: {
      value: coneSettings.color,
      onChange: (v) => setConeSettings(prev => ({ ...prev, color: v })),
      label: 'Cone Color',
      render: () => geometryType === 'cone'
    }
  }, {}, [geometryType])

  const addGeometry = useCallback(() => {
    let newObject: GeometryObject
    
    switch (geometryType) {
      case 'plane':
        newObject = {
          id: `plane-${Date.now()}`,
          type: 'plane',
          coordinates: [
            center[0] + (Math.random() - 0.5) * 0.004,
            center[1] + (Math.random() - 0.5) * 0.004
          ],
          color: planeRef.current.color,
          scale: planeRef.current.scale,
          subdivisions: planeRef.current.subdivisions
        }
        break
      case 'cube':
        newObject = {
          id: `cube-${Date.now()}`,
          type: 'cube',
          coordinates: [
            center[0] + (Math.random() - 0.5) * 0.004,
            center[1] + (Math.random() - 0.5) * 0.004
          ],
          color: cubeRef.current.color,
          scale: cubeRef.current.scale,
          segments: cubeRef.current.segments
        }
        break
      case 'sphere':
        newObject = {
          id: `sphere-${Date.now()}`,
          type: 'sphere',
          coordinates: [
            center[0] + (Math.random() - 0.5) * 0.004,
            center[1] + (Math.random() - 0.5) * 0.004
          ],
          color: sphereRef.current.color,
          scale: sphereRef.current.scale,
          heightSegments: sphereRef.current.heightSegments,
          radialSegments: sphereRef.current.radialSegments
        }
        break
      case 'cone':
        newObject = {
          id: `cone-${Date.now()}`,
          type: 'cone',
          coordinates: [
            center[0] + (Math.random() - 0.5) * 0.004,
            center[1] + (Math.random() - 0.5) * 0.004
          ],
          color: coneRef.current.color,
          scale: coneRef.current.scale,
          radialSegments: coneRef.current.radialSegments,
          heightSegments: coneRef.current.heightSegments
        }
        break
    }
    
    setObjects(prev => [...prev, newObject])
  }, [geometryType, center])

  const buttonLabel = `Add ${geometryType.charAt(0).toUpperCase() + geometryType.slice(1)}`

  // Re-register the button when label or callback changes
  useControls('Actions', {
    [buttonLabel]: button(() => {
      addGeometry()
    })
  }, {}, [buttonLabel, addGeometry])

  // Keep info panel in sync with object count
  useControls('Info', {
    objectCount: {
      value: `${objects.length} objects`,
      editable: false
    },
    clearAll: button(() => {
      setObjects([])
    })
  }, {}, [objects.length])

  return (
    <StoryMap
      longitude={center[0]}
      latitude={center[1]}
      zoom={16}
      pitch={60}
      bearing={41}
      mapStyleUrl="https://basemaps.cartocdn.com/gl/dark-gl-style/style.json"
      canvas={{ frameloop: 'demand' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      {objects.map((object) => (
        <GeometryOnMap key={object.id} object={object} />
      ))}
    </StoryMap>
  )
}

const meta: Meta<typeof BufferGeometryEditorComponent> = {
  title: 'Examples/Buffer Geometry Editor',
  component: BufferGeometryEditorComponent,
}

export default meta

