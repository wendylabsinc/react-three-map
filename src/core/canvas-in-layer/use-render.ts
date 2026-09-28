import { _roots } from "@react-three/fiber";
import { Matrix4, Matrix4Tuple, PerspectiveCamera } from "three";
import { Coords } from "../../api/coords";
import { MapInstance } from "../generic-map";
import { projectionViewModel, readRenderArgs } from "../projection";
import { syncCamera } from "../sync-camera";
import { useFunction } from "../use-function";
import { R3M } from "../use-r3m";

// Use the store type from @react-three/fiber's internal _roots to avoid zustand version mismatch
type FiberStore = NonNullable<ReturnType<typeof _roots.get>>['store'];

const projByView = new Matrix4();

export function useRender({
  map, origin, coords, useThree, frameloop, r3m,
} :{
  map: MapInstance,
  origin: Matrix4Tuple,
  coords: Coords,
  useThree: FiberStore,
  frameloop?: 'always' | 'demand',
  r3m: R3M
}) {
  const render = useFunction((_gl: WebGL2RenderingContext, ...args: unknown[]) => {
    readRenderArgs(r3m.projection, args, map);
    const state = useThree.getState();
    const camera = state.camera as PerspectiveCamera;
    const {gl, advance} = state;
    syncCamera(camera, projectionViewModel(r3m.projection, origin, coords, projByView));
    gl.resetState();
    advance(Date.now() * 0.001, true);
    if (!frameloop || frameloop === 'always') map.triggerRepaint();
  })
  return render;
}
