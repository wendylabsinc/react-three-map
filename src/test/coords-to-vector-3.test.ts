import { MercatorCoordinate } from "maplibre-gl";
import { Matrix4, Vector3 } from "three";
import { describe, expect, it } from 'vitest';
import { averageMercatorScale, coordsToVector3 } from "../api/coords-to-vector-3";
import { vector3ToCoords } from "../api/vector-3-to-coords";
import { coordsToMatrix } from "../core/coords-to-matrix";

const origins = [
  { latitude: 51.5074, longitude: -0.1278, altitude: 0 },
  { latitude: -33.8688, longitude: 151.2093, altitude: 120 },
  { latitude: 69.6492, longitude: 18.9553, altitude: 0 },
  { latitude: 0, longitude: 0, altitude: 0 },
];

/** offsets in degrees, from a few meters up to hundreds of kilometers */
const offsets = [[0.0001, 0.0002], [0.01, -0.02], [0.5, 0.8], [-2, 3]];

describe('coordsToVector3', () => {

  it('matches the space `<Canvas>` renders in', () => {
    for (const origin of origins) {
      // scene coordinates of a map location: invert the scene origin matrix
      const sceneFromMercator = new Matrix4()
        .fromArray(coordsToMatrix({ ...origin, fromLngLat: MercatorCoordinate.fromLngLat }))
        .invert();
      for (const [dLat, dLng] of offsets) {
        const point = { latitude: origin.latitude + dLat, longitude: origin.longitude + dLng };
        const mercator = MercatorCoordinate.fromLngLat([point.longitude, point.latitude], origin.altitude);
        const expected = new Vector3(mercator.x, mercator.y, mercator.z).applyMatrix4(sceneFromMercator);
        const [x, , z] = coordsToVector3(point, origin);
        expect(x).toBeCloseTo(expected.x, 3);
        expect(z).toBeCloseTo(expected.z, 3);
      }
    }
  });

  it('keeps the altitude difference', () => {
    const [, y] = coordsToVector3({ latitude: 51.51, longitude: -0.12, altitude: 80 }, { ...origins[0], altitude: 30 });
    expect(y).toBe(50);
  });

});

describe('vector3ToCoords', () => {

  it('is the exact inverse of coordsToVector3', () => {
    for (const origin of origins) {
      for (const [dLat, dLng] of offsets) {
        const point = { latitude: origin.latitude + dLat, longitude: origin.longitude + dLng, altitude: 42 };
        const coords = vector3ToCoords(coordsToVector3(point, origin), origin);
        expect(coords.latitude).toBeCloseTo(point.latitude, 9);
        expect(coords.longitude).toBeCloseTo(point.longitude, 9);
        expect(coords.altitude).toBeCloseTo(point.altitude, 9);
      }
    }
  });

});

describe('averageMercatorScale', () => {

  it('is the mean of 1 / cos(latitude) between both latitudes', () => {
    // midpoint rule with plenty of samples
    const [a, b] = [40, 60];
    let sum = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) sum += 1 / Math.cos((a + (b - a) * (i + 0.5) / n) * Math.PI / 180);
    expect(averageMercatorScale(a, b)).toBeCloseTo(sum / n, 8);
    expect(averageMercatorScale(a, a)).toBeCloseTo(1 / Math.cos(a * Math.PI / 180), 12);
  });

});
