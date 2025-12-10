import { _roots, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Coords } from "../api/coords";

// Use the store type from @react-three/fiber's internal _roots to avoid zustand version mismatch
type FiberStore = NonNullable<ReturnType<typeof _roots.get>>['store'];

export function useCoords() {
  const coords = useThree(s=>(s as any).coords) as Coords; // eslint-disable-line @typescript-eslint/no-explicit-any
  return coords;
}

export function useSetCoords({longitude, latitude, altitude}: Coords) {
  
  const canvas = useThree(s => s.gl.domElement);
  useEffect(() => {
    const root = _roots.get(canvas);
    if (!root) return;
    const coords: Coords = { longitude, latitude, altitude };
    setCoords(root.store, coords);
  }, [canvas, longitude, latitude, altitude]);
}

export function useSetRootCoords(store: FiberStore, {
  longitude, latitude, altitude
}: Coords) {
  useEffect(() => {
    setCoords(store, { longitude, latitude, altitude });
  }, [store, longitude, latitude, altitude]);
}

export function setCoords(store: FiberStore, coords: Coords) {
  store.setState({coords} as any) // eslint-disable-line @typescript-eslint/no-explicit-any
}
