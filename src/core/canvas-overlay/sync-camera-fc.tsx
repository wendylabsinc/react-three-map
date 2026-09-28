import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Matrix4, PerspectiveCamera } from "three";
import { Coords } from "../../api/coords";
import { FromLngLat, MapInstance } from "../generic-map";
import { projectionViewModel, readRenderArgs } from "../projection";
import { syncCamera } from "../sync-camera";
import { useCoordsToMatrix } from "../use-coords-to-matrix";
import { useFunction } from "../use-function";
import { useR3M } from "../use-r3m";
import { GlobeOccluder } from "./globe-occluder";

interface SyncCameraFCProps extends Coords {
  setOnRender?: (callback: () => (...args: unknown[]) => void) => void,
  /** on `useFrame` it will manually render (used by `<Coordinates>`) */
  manualRender?: boolean,
  onReady?: () => void,
  map: MapInstance,
  fromLngLat: FromLngLat,
}

/** React Component (FC) to sync the Three camera with the map provider */
export const SyncCameraFC = memo<SyncCameraFCProps>(({
  latitude, longitude, altitude = 0, setOnRender, manualRender, onReady, map, fromLngLat
}) => {

  const mapCanvas = map.getCanvas();

  const r3m = useR3M();

  const camRef = useRef<PerspectiveCamera>(null);

  const camera = useThree(s => s.camera) as PerspectiveCamera;
  const gl = useThree(s => s.gl);
  const threeCanvas = useThree(s => s.gl.domElement);
  const scene = useThree(s => s.scene);
  const advance = useThree(s => s.advance);
  const setSize = useThree(s => s.setSize);
  const set = useThree(s => s.set);

  const origin = useCoordsToMatrix({
    latitude,
    longitude,
    altitude,
    fromLngLat: r3m?.fromLngLat ?? fromLngLat,
  });

  const coords = useMemo(() => ({ latitude, longitude, altitude }), [latitude, longitude, altitude]);
  const [projByView] = useState(() => new Matrix4());
  const [globeOccluder] = useState(() => new GlobeOccluder());
  useEffect(() => () => globeOccluder.dispose(), [globeOccluder]);

  const ready = useRef(false);

  const triggerRepaint = useMemo(() => map.triggerRepaint, [map]);
  const mapPaintRequests = useRef(0);
  const triggerRepaintOff = useFunction(() => {
    mapPaintRequests.current++;
  })

  useFrame(() => {
    if (!r3m) return;
    syncCamera(camera, projectionViewModel(r3m.projection, origin, coords, projByView));

    // this canvas has no access to the map depth, hide what is behind the globe ourselves
    if (r3m.projection.globeness > 0) globeOccluder.render(gl, camera, altitude);

    if (manualRender) gl.render(scene, camera);

    map.triggerRepaint = triggerRepaint;
    if (mapPaintRequests.current > 0) {
      mapPaintRequests.current = 0;
      map.triggerRepaint();
    }
  }, -Infinity)

  const onRender = useFunction((...args: unknown[]) => {
    if (!r3m) return;
    map.triggerRepaint = triggerRepaintOff;

    if (threeCanvas.width !== mapCanvas.width || threeCanvas.height !== mapCanvas.height) {
      setSize(
        mapCanvas.clientWidth,
        mapCanvas.clientHeight,
        true,
        mapCanvas.offsetTop,
        mapCanvas.offsetLeft,
      );
    }

    readRenderArgs(r3m.projection, args, map);
    if (!ready.current && onReady) {
      ready.current = true;
      onReady();
    }
    advance(Date.now() * .001, true);
  })

  useEffect(() => {
    setOnRender && setOnRender(() => onRender)
  }, [setOnRender, onRender])

  useLayoutEffect(() => {
    if (!manualRender) return;
    set({ camera: camRef.current! }); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    {manualRender && <perspectiveCamera
      ref={camRef}
      matrixAutoUpdate={false}
      matrixWorldAutoUpdate={false}
    />}
  </>
})

SyncCameraFC.displayName = 'SyncCameraFC';
