import { useMemo } from "react";
import { Matrix4 } from "three";
import { coordsToMatrix } from "./coords-to-matrix";
import { FromLngLat } from "./generic-map";

type Props = Omit<Parameters<typeof coordsToMatrix>[0], 'fromLngLat'> & { fromLngLat?: FromLngLat };

const identity = new Matrix4().identity().toArray();

/** calculate matrix from coordinates */
export function useCoordsToMatrix({latitude, longitude, altitude, fromLngLat}: Props) {
  const m4 = useMemo(() => {
    if (!fromLngLat) return identity;
    return coordsToMatrix({
      latitude, longitude, altitude, fromLngLat,
    })
  }, [latitude, longitude, altitude, fromLngLat]);

  return m4;
}
