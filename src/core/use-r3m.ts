import { _roots, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Matrix4, Matrix4Tuple } from "three";
import { FromLngLat, MapInstance } from "./generic-map";

// Use the store type from @react-three/fiber's internal _roots to avoid zustand version mismatch
type FiberStore = NonNullable<ReturnType<typeof _roots.get>>['store'];

export interface R3M<T extends MapInstance = MapInstance> {
  /** Map provider */
  map: T,
  /** view projection matrix coming from the map provider */
  viewProjMx: Matrix4Tuple,
  fromLngLat: FromLngLat,
}

export function useR3M<T extends MapInstance> () {
  const r3m = useThree(s=>(s as any).r3m) as R3M<T> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  return r3m;
}

/** init `useR3M` hook */
export function useInitR3M<T extends MapInstance>(props: {
  map: T; fromLngLat: FromLngLat;
}) {
  const canvas = useThree(s => s.gl.domElement);
  const { map, fromLngLat } = props;
  // Initialise R3M after the canvas exists to avoid setState during render
  useEffect(() => {
    const root = _roots.get(canvas);
    if (!root) return;
    initR3M({ map, fromLngLat, store: root.store });
  }, [canvas, map, fromLngLat]);
}

export function initR3M<T extends MapInstance>({store, ...props}: {
  map: T;
  fromLngLat: FromLngLat;
  store: FiberStore;
}) {
  const viewProjMx = new Matrix4().identity().toArray();
  const r3m : R3M<T> = { ...props, viewProjMx };
  store.setState({r3m} as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  return r3m;
}
