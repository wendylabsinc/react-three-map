/**
 * @packageDocumentation
 * Enhanced Pivot Controls for 3D object manipulation in map space.
 */
import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react'
import { extend, useThree, ThreeEvent } from '@react-three/fiber'
import { 
  Group, 
  Matrix4, 
  Mesh, 
  MeshBasicMaterial, 
  TubeGeometry, 
  CatmullRomCurve3, 
  Vector3, 
  Quaternion,
  Euler,
  Raycaster,
  Vector2
} from 'three'
import { Html } from '@react-three/drei'

// Extend Three.js objects for React Three Fiber
extend({ Group, Matrix4, Mesh, MeshBasicMaterial, TubeGeometry })

/**
 * Props for the EnhancedPivotControls component.
 *
 * @example Basic usage
 * ```tsx
 * <EnhancedPivotControls
 *   matrix={matrix}
 *   scale={500}
 *   onDrag={handleDrag}
 *   onDragStart={handleDragStart}
 *   onDragEnd={handleDragEnd}
 * />
 * ```
 *
 * @example Rotation only (no translation)
 * ```tsx
 * <EnhancedPivotControls
 *   matrix={matrix}
 *   scale={300}
 *   disableTranslations
 *   annotations
 *   onDrag={handleDrag}
 * />
 * ```
 *
 * @example Custom appearance
 * ```tsx
 * <EnhancedPivotControls
 *   matrix={matrix}
 *   scale={400}
 *   rotationThickness={0.08}
 *   arrowHeadSize={0.1}
 *   activeAxes={[true, true, false]} // Only X and Y
 *   onDrag={handleDrag}
 * />
 * ```
 */
export interface PivotControlsProps {
  /**
   * The transformation matrix representing the current position, rotation, and scale.
   * Create this from your position and rotation state.
   *
   * @example
   * ```tsx
   * const matrix = useMemo(() => {
   *   const m = new Matrix4();
   *   m.makeRotationFromEuler(new Euler(...rotation));
   *   m.setPosition(...position);
   *   return m;
   * }, [position, rotation]);
   * ```
   */
  matrix?: Matrix4

  /**
   * Callback fired continuously while dragging. Receives the updated transformation matrix.
   * Use this to update your object's position and rotation.
   *
   * @example
   * ```tsx
   * const onDrag = useCallback((m4: Matrix4) => {
   *   // Extract position
   *   const pos = new Vector3().setFromMatrixPosition(m4);
   *   setPosition(pos.toArray());
   *
   *   // Extract rotation
   *   const euler = new Euler().setFromRotationMatrix(m4);
   *   setRotation([euler.x, euler.y, euler.z]);
   * }, []);
   * ```
   */
  onDrag?: (matrix: Matrix4) => void

  /**
   * Callback fired when dragging starts.
   * **Important:** Use this to disable map interactions to prevent conflicts.
   *
   * @example
   * ```tsx
   * const map = useMap();
   *
   * const onDragStart = useCallback(() => {
   *   map.dragPan.disable();
   *   map.dragRotate.disable();
   *   map.doubleClickZoom.disable();
   * }, [map]);
   * ```
   */
  onDragStart?: () => void

  /**
   * Callback fired when dragging ends.
   * Use this to re-enable map interactions.
   *
   * @example
   * ```tsx
   * const map = useMap();
   *
   * const onDragEnd = useCallback(() => {
   *   // Small delay prevents the release event from triggering map pan
   *   setTimeout(() => {
   *     map.dragPan.enable();
   *     map.dragRotate.enable();
   *     map.doubleClickZoom.enable();
   *   }, 50);
   * }, [map]);
   * ```
   */
  onDragEnd?: () => void

  /**
   * Scale factor for the control gizmo size in meters.
   * Choose a value appropriate for your zoom level and object size.
   *
   * @defaultValue 1
   *
   * @example
   * ```tsx
   * // For city-level zoom (zoom 13-15), use 300-500
   * <EnhancedPivotControls scale={500} />
   *
   * // For street-level zoom (zoom 17-19), use 50-100
   * <EnhancedPivotControls scale={50} />
   * ```
   */
  scale?: number

  /**
   * When true, the gizmo maintains a fixed screen size regardless of zoom level.
   * @defaultValue false
   */
  fixed?: boolean

  /**
   * Disable translation (movement) controls.
   * - `true`: Disable all translation axes
   * - `false`: Enable all translation axes
   * - `[x, y, z]`: Disable specific axes (true = disabled)
   *
   * @defaultValue false
   *
   * @example
   * ```tsx
   * // Disable all translations (rotation only mode)
   * <EnhancedPivotControls disableTranslations />
   *
   * // Only allow horizontal movement (X and Z)
   * <EnhancedPivotControls disableTranslations={[false, true, false]} />
   *
   * // Only allow vertical movement (Y axis)
   * <EnhancedPivotControls disableTranslations={[true, false, true]} />
   * ```
   */
  disableTranslations?: boolean | [boolean, boolean, boolean]

  /**
   * Disable rotation controls.
   * - `true`: Disable all rotation axes
   * - `false`: Enable all rotation axes
   * - `[x, y, z]`: Disable specific axes (true = disabled)
   *
   * @defaultValue false
   *
   * @example
   * ```tsx
   * // Disable all rotations (translation only mode)
   * <EnhancedPivotControls disableRotations />
   *
   * // Only allow Y-axis rotation (turntable style)
   * <EnhancedPivotControls disableRotations={[true, false, true]} />
   * ```
   */
  disableRotations?: boolean | [boolean, boolean, boolean]

  /**
   * Show angle annotations while rotating.
   * Displays a tooltip with the rotation angle in degrees during drag operations.
   *
   * @defaultValue false
   *
   * @example
   * ```tsx
   * <EnhancedPivotControls annotations />
   * ```
   */
  annotations?: boolean

  /**
   * Control which axes are visible and interactive.
   * Set to `[x, y, z]` where true = active.
   *
   * @defaultValue [true, true, true]
   *
   * @example
   * ```tsx
   * // Only show X and Z axes (horizontal plane)
   * <EnhancedPivotControls activeAxes={[true, false, true]} />
   *
   * // Only show Y axis (vertical)
   * <EnhancedPivotControls activeAxes={[false, true, false]} />
   * ```
   */
  activeAxes?: [boolean, boolean, boolean]

  /**
   * Thickness of the rotation ring relative to its radius.
   * Higher values make the rings easier to click but more visually prominent.
   *
   * @defaultValue 0.03
   *
   * @example
   * ```tsx
   * // Thicker rings for easier interaction
   * <EnhancedPivotControls rotationThickness={0.08} />
   * ```
   */
  rotationThickness?: number

  /**
   * Thickness of the translation arrow shaft relative to scale.
   *
   * @defaultValue 0.015
   *
   * @example
   * ```tsx
   * // Thicker arrow shafts
   * <EnhancedPivotControls translationThickness={0.025} />
   * ```
   */
  translationThickness?: number

  /**
   * Size of the arrow head relative to scale.
   *
   * @defaultValue 0.05
   *
   * @example
   * ```tsx
   * // Larger arrow heads
   * <EnhancedPivotControls arrowHeadSize={0.1} />
   * ```
   */
  arrowHeadSize?: number

  /**
   * Length of the translation arrows relative to scale.
   *
   * @defaultValue 1
   *
   * @example
   * ```tsx
   * // Longer arrows
   * <EnhancedPivotControls arrowLength={1.5} />
   * ```
   */
  arrowLength?: number

  /**
   * Length of the arrow head relative to scale.
   *
   * @defaultValue 0.2
   */
  arrowHeadLength?: number

  /**
   * Whether the control gizmo is visible.
   * Use this to hide controls when not in edit mode.
   *
   * @defaultValue true
   *
   * @example
   * ```tsx
   * <EnhancedPivotControls visible={isEditMode} />
   * ```
   */
  visible?: boolean

  /**
   * Whether the control is interactive.
   * When false, the gizmo is displayed but grayed out and non-interactive.
   * Useful for showing controls for non-selected objects.
   *
   * @defaultValue true
   *
   * @example
   * ```tsx
   * // Only enable for selected object
   * <EnhancedPivotControls enabled={isSelected} />
   * ```
   */
  enabled?: boolean
}

interface ContextProps {
  scale: number
  annotations: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDrag?: (matrix: Matrix4) => void
  matrix: Matrix4
  rotationThickness: number
  translationThickness: number
  arrowHeadSize: number
  arrowLength: number
  arrowHeadLength: number
  enabled: boolean
  anyDragging: boolean
  setAnyDragging: (v: boolean) => void
}

const Context = createContext<ContextProps>({
  scale: 1,
  annotations: false,
  matrix: new Matrix4(),
  rotationThickness: 0.03,
  translationThickness: 0.015,
  arrowHeadSize: 0.05,
  arrowLength: 1,
  arrowHeadLength: 0.2,
  enabled: true,
  anyDragging: false,
  setAnyDragging: () => {}
})

const _quaternion = new Quaternion()
const _position = new Vector3()
const _scale = new Vector3()

// Enhanced AxisRotator with TubeGeometry for better raycasting
const AxisRotator: React.FC<{
  axis: 0 | 1 | 2
  direction: Vector3
  color: string
}> = ({ axis, direction, color }) => {
  const { scale, annotations, onDragStart, onDragEnd, onDrag, matrix, rotationThickness, enabled, anyDragging, setAnyDragging } = useContext(Context)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [angle, setAngle] = useState(0)
  const { camera, gl } = useThree()
  const raycastMeshRef = useRef<Mesh>(null)
  
  const radius = 0.8 * scale
  const segments = 64
  
  // Create rotation ring curve
  const curve = useMemo(() => {
    const points: Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const point = new Vector3()
      
      if (axis === 0) { // X axis - YZ plane
        point.set(0, Math.cos(theta) * radius, Math.sin(theta) * radius)
      } else if (axis === 1) { // Y axis - XZ plane
        point.set(Math.cos(theta) * radius, 0, Math.sin(theta) * radius)
      } else { // Z axis - XY plane
        point.set(Math.cos(theta) * radius, Math.sin(theta) * radius, 0)
      }
      
      points.push(point)
    }
    return new CatmullRomCurve3(points, true)
  }, [axis, radius, segments])
  
  // Create tube geometry for better raycasting
  const tubeGeometry = useMemo(() => {
    return new TubeGeometry(curve, segments * 2, radius * rotationThickness, 8, true)
  }, [curve, segments, radius, rotationThickness])
  
  const dragStartRef = useRef<{ x: number; y: number; rotation: Quaternion }>()
  
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled) return
    e.stopPropagation()
    // Prevent the event from reaching the map
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation()
      // Don't use preventDefault as it causes issues with passive event listeners
    }
    setDragging(true)
    setAnyDragging(true)
    
    // Store initial rotation
    matrix.decompose(_position, _quaternion, _scale)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotation: _quaternion.clone()
    }
    
    onDragStart?.()
  }
  
  const handlePointerUp = useCallback(() => {
    if (dragging) {
      setDragging(false)
      setAngle(0)
      dragStartRef.current = undefined
      setAnyDragging(false)
      onDragEnd?.()
    }
  }, [dragging, onDragEnd, setAnyDragging])
  
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (dragging && onDrag && dragStartRef.current) {
      // Get current mouse position in NDC
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      
      // Get start mouse position in NDC
      const startX = ((dragStartRef.current.x - rect.left) / rect.width) * 2 - 1
      const startY = -((dragStartRef.current.y - rect.top) / rect.height) * 2 + 1
      
      // Create rays from camera through mouse positions
      const raycaster = new Raycaster()
      raycaster.setFromCamera(new Vector2(x, y), camera)
      const currentRay = raycaster.ray.direction.clone().normalize()
      
      raycaster.setFromCamera(new Vector2(startX, startY), camera)
      const startRay = raycaster.ray.direction.clone().normalize()
      
      // Get the rotation axis vector
      const rotationAxis = new Vector3()
      if (axis === 0) rotationAxis.set(1, 0, 0) // X axis
      else if (axis === 1) rotationAxis.set(0, 1, 0) // Y axis
      else rotationAxis.set(0, 0, 1) // Z axis
      
      // Apply current rotation to the axis
      matrix.decompose(_position, _quaternion, _scale)
      rotationAxis.applyQuaternion(_quaternion)
      
      // Project rays onto the plane perpendicular to rotation axis
      const projectedStart = startRay.clone().sub(
        rotationAxis.clone().multiplyScalar(startRay.dot(rotationAxis))
      ).normalize()
      
      const projectedCurrent = currentRay.clone().sub(
        rotationAxis.clone().multiplyScalar(currentRay.dot(rotationAxis))
      ).normalize()
      
      // Calculate angle between projected vectors
      let angle = Math.acos(Math.max(-1, Math.min(1, projectedStart.dot(projectedCurrent))))
      
      // Determine rotation direction using cross product (reversed)
      const cross = new Vector3().crossVectors(projectedStart, projectedCurrent)
      if (cross.dot(rotationAxis) > 0) angle = -angle
      
      // Apply the rotation
      const rotationQuaternion = new Quaternion().setFromAxisAngle(rotationAxis, angle)
      const newQuaternion = rotationQuaternion.multiply(dragStartRef.current.rotation)
      
      const newMatrix = new Matrix4()
      newMatrix.compose(_position, newQuaternion, _scale)
      onDrag(newMatrix)
      
      setAngle(angle)
    }
  }, [dragging, onDrag, gl, camera, axis, matrix])
  
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [dragging, handlePointerMove, handlePointerUp])
  
  return (
    <group>
      {/* Visible tube mesh for both raycasting and display */}
      <mesh
        ref={raycastMeshRef}
        geometry={tubeGeometry}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => {
          if (!enabled) return
          if (!anyDragging || dragging) {
            // Ensure only the nearest intersected gizmo handles hover
            e.stopPropagation()
            setHovered(true)
          }
        }}
        onPointerOut={() => setHovered(false)}
      >
        <meshBasicMaterial 
          color={enabled ? (((hovered && !anyDragging) || dragging) ? '#ffff00' : color) : '#808080'}
          opacity={enabled ? (((hovered && !anyDragging) || dragging) ? 1 : 0.6) : 0.3}
          transparent
        />
      </mesh>
      
      {/* Annotation */}
      {annotations && dragging && (
        <Html position={direction.clone().multiplyScalar(radius * 1.2)}>
          <div
            style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '11px',
              whiteSpace: 'nowrap'
            }}
          >
            {(angle * 180 / Math.PI).toFixed(1)}°
          </div>
        </Html>
      )}
    </group>
  )
}

// Translation arrow component
const AxisArrow: React.FC<{
  axis: 0 | 1 | 2
  direction: Vector3
  color: string
}> = ({ axis, direction, color }) => {
  const { scale, onDragStart, onDragEnd, onDrag, matrix, translationThickness, arrowHeadSize, arrowLength: arrowLengthProp, arrowHeadLength, enabled, anyDragging, setAnyDragging } = useContext(Context)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { camera, gl } = useThree()
  const dragStartRef = useRef<{ x: number; y: number; position: Vector3; plane: Vector3 }>()
  
  const arrowLength = scale * arrowLengthProp
  const cylinderWidth = scale * translationThickness
  const coneWidth = scale * arrowHeadSize
  const coneLength = scale * arrowHeadLength
  
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled) return
    e.stopPropagation()
    // Prevent the event from reaching the map
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation()
      // Don't use preventDefault as it causes issues with passive event listeners
    }
    setDragging(true)
    setAnyDragging(true)
    
    // Store initial position
    matrix.decompose(_position, _quaternion, _scale)
    
    // Calculate the plane for dragging
    const cameraDirection = new Vector3()
    camera.getWorldDirection(cameraDirection)
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      position: _position.clone(),
      plane: cameraDirection
    }
    
    onDragStart?.()
  }
  
  const handlePointerUp = useCallback(() => {
    if (dragging) {
      setDragging(false)
      dragStartRef.current = undefined
      setAnyDragging(false)
      onDragEnd?.()
    }
  }, [dragging, onDragEnd, setAnyDragging])
  
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (dragging && onDrag && dragStartRef.current) {
      // Calculate translation based on screen space movement
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const startX = ((dragStartRef.current.x - rect.left) / rect.width) * 2 - 1
      const startY = -((dragStartRef.current.y - rect.top) / rect.height) * 2 + 1
      
      // Create rays from camera
      const raycaster = new Raycaster()
      raycaster.setFromCamera(new Vector2(x, y), camera)
      const currentRay = raycaster.ray.direction.clone()
      
      raycaster.setFromCamera(new Vector2(startX, startY), camera)
      const startRay = raycaster.ray.direction.clone()
      
      // Get the current rotation from the matrix
      matrix.decompose(_position, _quaternion, _scale)
      
      // Transform the axis direction by the current rotation
      const worldDirection = direction.clone().applyQuaternion(_quaternion)
      
      // Project rays onto the rotated axis direction
      const currentProjection = currentRay.dot(worldDirection) 
      const startProjection = startRay.dot(worldDirection)
      const deltaProjection = currentProjection - startProjection
      
      // Calculate new position using the rotated direction
      const delta = worldDirection.multiplyScalar(deltaProjection * scale * 2)
      const newPosition = dragStartRef.current.position.clone().add(delta)
      
      const newMatrix = new Matrix4()
      newMatrix.compose(newPosition, _quaternion, _scale)
      onDrag(newMatrix)
    }
  }, [dragging, onDrag, gl, camera, direction, matrix, scale])
  
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [dragging, handlePointerMove, handlePointerUp])
  
  const rotation = useMemo(() => {
    const euler = new Euler()
    if (axis === 0) euler.set(0, 0, -Math.PI / 2)
    else if (axis === 1) euler.set(0, 0, 0)
    else euler.set(Math.PI / 2, 0, 0)
    return euler
  }, [axis])
  
  return (
    <group rotation={rotation}>
      {/* Invisible cylinder for raycasting - covers entire arrow */}
      <mesh
        visible={false}
        position={[0, (arrowLength + coneLength) / 2, 0]}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => {
          if (!enabled) return
          if (!anyDragging || dragging) {
            // Ensure only the nearest intersected gizmo handles hover
            e.stopPropagation()
            setHovered(true)
          }
        }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[coneWidth * 1.4, coneWidth * 1.4, arrowLength + coneLength, 8, 1]} />
      </mesh>
      
      {/* Visible arrow shaft */}
      <mesh position={[0, arrowLength / 2, 0]}>
        <cylinderGeometry args={[cylinderWidth, cylinderWidth, arrowLength, 4, 1]} />
        <meshBasicMaterial 
          color={enabled ? (((hovered && !anyDragging) || dragging) ? '#ffff00' : color) : '#808080'} 
          opacity={enabled ? 1 : 0.3}
          transparent
        />
      </mesh>
      
      {/* Arrow head - positioned so base touches cylinder end */}
      <mesh position={[0, arrowLength + coneLength / 2, 0]}>
        <coneGeometry args={[coneWidth, coneLength, 8, 1]} />
        <meshBasicMaterial 
          color={enabled ? (((hovered && !anyDragging) || dragging) ? '#ffff00' : color) : '#808080'}
          opacity={enabled ? 1 : 0.3}
          transparent
        />
      </mesh>
    </group>
  )
}

/**
 * A gizmo component for translating and rotating 3D objects in map space.
 *
 * Provides intuitive controls for manipulating objects with:
 * - **Translation arrows** (red=X, green=Y, blue=Z) for moving objects
 * - **Rotation rings** for rotating around each axis
 * - **Hover highlighting** and **drag annotations**
 *
 * Designed to work seamlessly with MapLibre/Mapbox maps by properly handling
 * pointer events and providing callbacks to disable map interactions during manipulation.
 *
 * @example
 * ```tsx
 * import { Canvas, EnhancedPivotControls, useMap } from '@wendylabsinc/react-three-map/maplibre';
 * import { Matrix4, Vector3, Euler } from 'three';
 *
 * function DraggableObject() {
 *   const map = useMap();
 *   const [position, setPosition] = useState([0, 0, 0]);
 *   const [rotation, setRotation] = useState([0, 0, 0]);
 *
 *   const matrix = useMemo(() => {
 *     const m = new Matrix4();
 *     m.makeRotationFromEuler(new Euler(...rotation));
 *     m.setPosition(...position);
 *     return m;
 *   }, [position, rotation]);
 *
 *   const onDragStart = () => {
 *     map.dragPan.disable();
 *     map.dragRotate.disable();
 *   };
 *
 *   const onDragEnd = () => {
 *     map.dragPan.enable();
 *     map.dragRotate.enable();
 *   };
 *
 *   const onDrag = (m4: Matrix4) => {
 *     setPosition(new Vector3().setFromMatrixPosition(m4).toArray());
 *     const euler = new Euler().setFromRotationMatrix(m4);
 *     setRotation(euler.toArray());
 *   };
 *
 *   return (
 *     <>
 *       <EnhancedPivotControls
 *         matrix={matrix}
 *         scale={500}
 *         onDragStart={onDragStart}
 *         onDragEnd={onDragEnd}
 *         onDrag={onDrag}
 *         annotations
 *       />
 *       <mesh position={position} rotation={rotation}>
 *         <boxGeometry args={[100, 100, 100]} />
 *         <meshStandardMaterial color="orange" />
 *       </mesh>
 *     </>
 *   );
 * }
 * ```
 *
 * @see {@link PivotControlsProps} for available configuration options
 */
export const EnhancedPivotControls: React.FC<PivotControlsProps> = ({
  matrix = new Matrix4(),
  onDrag,
  onDragStart,
  onDragEnd,
  scale = 1,
  disableTranslations = false,
  disableRotations = false,
  annotations = false,
  activeAxes = [true, true, true],
  rotationThickness = 0.03,
  translationThickness = 0.015,
  arrowHeadSize = 0.05,
  arrowLength = 1,
  arrowHeadLength = 0.2,
  visible = true,
  enabled = true
}) => {
  const groupRef = useRef<Group>(null)
  const [anyDragging, setAnyDragging] = useState(false)
  
  const config = useMemo<ContextProps>(() => ({
    scale,
    annotations,
    onDragStart,
    onDragEnd,
    onDrag,
    matrix,
    rotationThickness,
    translationThickness,
    arrowHeadSize,
    arrowLength,
    arrowHeadLength,
    enabled,
    anyDragging,
    setAnyDragging,
  }), [scale, annotations, onDragStart, onDragEnd, onDrag, matrix, rotationThickness, translationThickness, arrowHeadSize, arrowLength, arrowHeadLength, enabled, anyDragging])
  
  const translationEnabled = useMemo(() => {
    if (typeof disableTranslations === 'boolean') {
      return !disableTranslations ? [true, true, true] : [false, false, false]
    }
    return disableTranslations.map(d => !d)
  }, [disableTranslations])
  
  const rotationEnabled = useMemo(() => {
    if (typeof disableRotations === 'boolean') {
      return !disableRotations ? [true, true, true] : [false, false, false]
    }
    return disableRotations.map(d => !d)
  }, [disableRotations])
  
  // Apply matrix to group
  React.useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.matrix.copy(matrix)
      groupRef.current.matrixAutoUpdate = false
      groupRef.current.matrixWorldNeedsUpdate = true
    }
  }, [matrix])
  
  if (!visible) return null
  
  return (
    <Context.Provider value={config}>
      <group ref={groupRef}>
        {/* Translation arrows */}
        {translationEnabled[0] && activeAxes[0] && (
          <AxisArrow axis={0} direction={new Vector3(1, 0, 0)} color="#ff0000" />
        )}
        {translationEnabled[1] && activeAxes[1] && (
          <AxisArrow axis={1} direction={new Vector3(0, 1, 0)} color="#00ff00" />
        )}
        {translationEnabled[2] && activeAxes[2] && (
          <AxisArrow axis={2} direction={new Vector3(0, 0, 1)} color="#0000ff" />
        )}
        
        {/* Rotation rings with enhanced raycasting */}
        {rotationEnabled[0] && activeAxes[0] && (
          <AxisRotator axis={0} direction={new Vector3(1, 0, 0)} color="#ff0000" />
        )}
        {rotationEnabled[1] && activeAxes[1] && (
          <AxisRotator axis={1} direction={new Vector3(0, 1, 0)} color="#00ff00" />
        )}
        {rotationEnabled[2] && activeAxes[2] && (
          <AxisRotator axis={2} direction={new Vector3(0, 0, 1)} color="#0000ff" />
        )}
      </group>
    </Context.Provider>
  )
}
