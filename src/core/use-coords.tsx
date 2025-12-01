import { _roots, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Coords } from "../api/coords";

// Use the store type from @react-three/fiber's internal _roots to avoid zustand version mismatch
type FiberStore = NonNullable<ReturnType<typeof _roots.get>>['store'];

export function useCoords() {
  const coords = useThree(s=>(s as any).coords) as Coords; // eslint-disable-line @typescript-eslint/no-explicit-any
  return coords;
}

export function useSetCoords({longitude, latitude, altitude}: Coords) {
  
  const canvas = useThree(s => s.gl.domElement);
  useMemo(()=>{
    const store = _roots.get(canvas)!.store; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const coords : Coords = { longitude, latitude, altitude };
    setCoords(store, coords);
  }, [longitude, latitude, altitude]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSetRootCoords(store: FiberStore, {
  longitude, latitude, altitude
}: Coords) {
  useMemo(()=>{
    setCoords(store, {longitude, latitude, altitude});
  }, [longitude, latitude, altitude]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function setCoords(store: FiberStore, coords: Coords) {
  store.setState({coords} as any) // eslint-disable-line @typescript-eslint/no-explicit-any
}