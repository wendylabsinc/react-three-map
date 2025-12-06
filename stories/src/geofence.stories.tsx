import { useState, useMemo, useCallback, useRef } from 'react'
import type { Meta } from '@storybook/react'
import { StoryMap } from './story-map-storybook'
import { useControls, button } from 'leva'
import * as THREE from 'three'
import { BoxGeometry, Vector3Tuple } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  bufferGeometryToWKT,
  isCoordsInPolyhedron,
  isPointInPolyhedron,
  bufferGeometryToGeoTriangles,
  Coords,
} from '../../src/api'

interface TestPoint {
  id: string
  position: Vector3Tuple
  inside: boolean
}

function GeofenceDemo() {
  const center: [number, number] = [-122.4194, 37.7749] // San Francisco
  const origin: Coords = { latitude: center[1], longitude: center[0], altitude: 0 }

  const [testPoints, setTestPoints] = useState<TestPoint[]>([])
  const [wktOutput, setWktOutput] = useState<string>('')
  const [triangleCount, setTriangleCount] = useState<number>(0)
  const geofenceRef = useRef<THREE.Mesh>(null)

  // Geofence settings
  const { width, height, depth, showWireframe, geofenceColor, opacity } = useControls('Geofence', {
    width: { value: 80, min: 10, max: 200, step: 5, label: 'Width (m)' },
    height: { value: 60, min: 10, max: 200, step: 5, label: 'Height (m)' },
    depth: { value: 80, min: 10, max: 200, step: 5, label: 'Depth (m)' },
    showWireframe: { value: true, label: 'Show Wireframe' },
    geofenceColor: { value: '#3b82f6', label: 'Color' },
    opacity: { value: 0.3, min: 0.1, max: 1, step: 0.1, label: 'Opacity' },
  })

  // Test point settings
  const { testPointSize, insideColor, outsideColor } = useControls('Test Points', {
    testPointSize: { value: 5, min: 1, max: 15, step: 1, label: 'Point Size' },
    insideColor: { value: '#22c55e', label: 'Inside Color' },
    outsideColor: { value: '#ef4444', label: 'Outside Color' },
  })

  // Create geometry
  const geometry = useMemo(() => {
    return new BoxGeometry(width, height, depth)
  }, [width, height, depth])

  // Convert to WKT whenever geometry changes
  const handleExportWKT = useCallback(() => {
    try {
      const wkt = bufferGeometryToWKT(geometry, { origin, precision: 6 })
      setWktOutput(wkt)
      const triangles = bufferGeometryToGeoTriangles(geometry, origin)
      setTriangleCount(triangles.length)
      console.log('WKT Output:', wkt)
      console.log('Triangle count:', triangles.length)
    } catch (error) {
      console.error('Error converting to WKT:', error)
      setWktOutput(`Error: ${error}`)
    }
  }, [geometry, origin])

  // Add a random test point
  const addRandomPoint = useCallback(() => {
    const range = Math.max(width, height, depth) * 1.5
    const position: Vector3Tuple = [
      (Math.random() - 0.5) * range,
      Math.random() * height * 1.2,
      (Math.random() - 0.5) * range,
    ]
    const result = isPointInPolyhedron(position, geometry)
    const newPoint: TestPoint = {
      id: `point-${Date.now()}`,
      position,
      inside: result.inside,
    }
    setTestPoints(prev => [...prev, newPoint])
  }, [geometry, width, height, depth])

  // Add point at click location
  const handleSceneClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    // Only process if clicking on the ground plane
    if (event.object.name !== 'ground-plane') return

    const position: Vector3Tuple = [
      event.point.x,
      Math.random() * height, // Random height within geofence range
      event.point.z,
    ]
    const result = isPointInPolyhedron(position, geometry)
    const newPoint: TestPoint = {
      id: `point-${Date.now()}`,
      position,
      inside: result.inside,
    }
    setTestPoints(prev => [...prev, newPoint])
  }, [geometry, height])

  // Clear all points
  const clearPoints = useCallback(() => {
    setTestPoints([])
  }, [])

  // Re-evaluate all points (useful after resizing geofence)
  const reEvaluatePoints = useCallback(() => {
    setTestPoints(prev => prev.map(point => ({
      ...point,
      inside: isPointInPolyhedron(point.position, geometry).inside,
    })))
  }, [geometry])

  // Leva controls for actions
  useControls('Actions', {
    'Export to WKT': button(handleExportWKT),
    'Add Random Point': button(addRandomPoint),
    'Re-evaluate Points': button(reEvaluatePoints),
    'Clear Points': button(clearPoints),
  })

  // Stats display
  useControls('Stats', {
    'Points Inside': { value: testPoints.filter(p => p.inside).length, editable: false },
    'Points Outside': { value: testPoints.filter(p => !p.inside).length, editable: false },
    'Total Points': { value: testPoints.length, editable: false },
    'Triangles': { value: triangleCount, editable: false },
  }, [testPoints, triangleCount])

  return (
    <StoryMap
      longitude={center[0]}
      latitude={center[1]}
      zoom={18}
      pitch={60}
      bearing={-20}
      mapStyleUrl="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      canvas={{ frameloop: 'always' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 100, 50]} intensity={1} />
      <pointLight position={[-50, 50, -50]} intensity={0.5} />

      {/* Ground plane for click detection */}
      <mesh
        name="ground-plane"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1, 0]}
        onClick={handleSceneClick}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Geofence volume */}
      <group position={[0, height / 2, 0]}>
        {/* Solid geofence */}
        <mesh ref={geofenceRef} geometry={geometry}>
          <meshStandardMaterial
            color={geofenceColor}
            opacity={opacity}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Wireframe overlay */}
        {showWireframe && (
          <mesh geometry={geometry}>
            <meshBasicMaterial
              color={geofenceColor}
              wireframe
              opacity={0.8}
              transparent
            />
          </mesh>
        )}

        {/* Bounding box edges */}
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#ffffff" opacity={0.5} transparent />
        </lineSegments>
      </group>

      {/* Test points */}
      {testPoints.map((point) => (
        <group key={point.id} position={point.position}>
          <mesh>
            <sphereGeometry args={[testPointSize, 16, 16]} />
            <meshStandardMaterial
              color={point.inside ? insideColor : outsideColor}
              emissive={point.inside ? insideColor : outsideColor}
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Label */}
          <Html
            position={[0, testPointSize + 3, 0]}
            center
            style={{
              color: point.inside ? insideColor : outsideColor,
              fontSize: '10px',
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.7)',
              padding: '2px 4px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            {point.inside ? 'INSIDE' : 'OUTSIDE'}
          </Html>
        </group>
      ))}

      {/* Origin marker */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
      </mesh>

      {/* Axis helper */}
      <axesHelper args={[30]} position={[0, 0.1, 0]} />

      {/* WKT output display */}
      {wktOutput && (
        <Html
          position={[0, height + 30, 0]}
          center
          style={{
            background: 'rgba(0,0,0,0.9)',
            color: '#fff',
            padding: '10px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '9px',
            maxWidth: '400px',
            maxHeight: '150px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          <div style={{ marginBottom: '5px', color: '#3b82f6', fontWeight: 'bold' }}>
            PostGIS WKT Output ({triangleCount} triangles):
          </div>
          {wktOutput.length > 500
            ? wktOutput.substring(0, 500) + '...'
            : wktOutput}
        </Html>
      )}
    </StoryMap>
  )
}

function GeoCoordsDemo() {
  const center: [number, number] = [-122.4194, 37.7749]
  const origin: Coords = { latitude: center[1], longitude: center[0], altitude: 0 }

  const [result, setResult] = useState<{ inside: boolean; coords: Coords } | null>(null)

  const geometry = useMemo(() => new BoxGeometry(100, 80, 100), [])

  const { testLat, testLng, testAlt } = useControls('Test Coordinates', {
    testLat: { value: 37.7749, min: 37.774, max: 37.776, step: 0.0001, label: 'Latitude' },
    testLng: { value: -122.4194, min: -122.420, max: -122.418, step: 0.0001, label: 'Longitude' },
    testAlt: { value: 40, min: 0, max: 100, step: 5, label: 'Altitude (m)' },
  })

  const testCoords = useCallback(() => {
    const coords: Coords = { latitude: testLat, longitude: testLng, altitude: testAlt }
    const testResult = isCoordsInPolyhedron(coords, geometry, origin)
    setResult({ inside: testResult.inside, coords })
    console.log('Testing coords:', coords, 'Result:', testResult)
  }, [testLat, testLng, testAlt, geometry, origin])

  useControls('Actions', {
    'Test Coordinates': button(testCoords),
  })

  return (
    <StoryMap
      longitude={center[0]}
      latitude={center[1]}
      zoom={18}
      pitch={60}
      bearing={0}
      mapStyleUrl="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      canvas={{ frameloop: 'always' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 100, 50]} intensity={1} />

      {/* Geofence */}
      <group position={[0, 40, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#3b82f6" opacity={0.3} transparent side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      </group>

      {/* Result display */}
      {result && (
        <Html position={[0, 100, 0]} center>
          <div style={{
            background: result.inside ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {result.inside ? 'INSIDE' : 'OUTSIDE'}
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              {result.coords.latitude.toFixed(6)}, {result.coords.longitude.toFixed(6)}
              <br />
              Alt: {result.coords.altitude}m
            </div>
          </div>
        </Html>
      )}

      <axesHelper args={[50]} />
    </StoryMap>
  )
}

const meta: Meta = {
  title: 'Geofence',
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

export const Default = () => <GeofenceDemo />
Default.storyName = 'Point-in-Polyhedron Demo'

export const GeoCoordinates = () => <GeoCoordsDemo />
GeoCoordinates.storyName = 'Geographic Coordinates Test'
