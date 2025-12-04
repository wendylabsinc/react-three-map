import { describe, it, expect } from "vitest";
import { BoxGeometry, SphereGeometry, Vector3Tuple } from "three";
import {
  isPointInPolyhedron,
  isCoordsInPolyhedron,
  isCoordsInGeoTriangles,
  isPointInGeoTriangles,
  isPointOnSurface,
} from "../api/point-in-polyhedron";
import { extractGeoTriangles } from "../api/polyhedral-surface";
import { Coords } from "../api/coords";

describe("point-in-polyhedron", () => {
  const origin: Coords = {
    latitude: 51.5074,
    longitude: -0.1278,
    altitude: 0,
  };

  describe("isPointInPolyhedron", () => {
    it("detects point inside box", () => {
      const box = new BoxGeometry(100, 100, 100);
      const pointInside: Vector3Tuple = [0, 0, 0];

      const result = isPointInPolyhedron(pointInside, box);
      expect(result.inside).toBe(true);
      expect(result.intersectionCount % 2).toBe(1);
    });

    it("detects point outside box", () => {
      const box = new BoxGeometry(100, 100, 100);
      const pointOutside: Vector3Tuple = [200, 200, 200];

      const result = isPointInPolyhedron(pointOutside, box);
      expect(result.inside).toBe(false);
      expect(result.intersectionCount % 2).toBe(0);
    });

    it("handles point at origin of centered box", () => {
      const box = new BoxGeometry(100, 100, 100);
      const origin: Vector3Tuple = [0, 0, 0];

      const result = isPointInPolyhedron(origin, box);
      expect(result.inside).toBe(true);
    });

    it("detects point just inside boundary", () => {
      const box = new BoxGeometry(100, 100, 100);
      // Box extends from -50 to 50 on each axis
      const pointJustInside: Vector3Tuple = [49, 0, 0];

      const result = isPointInPolyhedron(pointJustInside, box);
      expect(result.inside).toBe(true);
    });

    it("detects point just outside boundary", () => {
      const box = new BoxGeometry(100, 100, 100);
      const pointJustOutside: Vector3Tuple = [51, 0, 0];

      const result = isPointInPolyhedron(pointJustOutside, box);
      expect(result.inside).toBe(false);
      expect(result.onBoundary).toBe(false);
    });

    it("works with sphere geometry", () => {
      const sphere = new SphereGeometry(50, 32, 16);
      const pointInside: Vector3Tuple = [0, 0, 0];
      const pointOutside: Vector3Tuple = [60, 0, 0];

      expect(isPointInPolyhedron(pointInside, sphere).inside).toBe(true);
      expect(isPointInPolyhedron(pointOutside, sphere).inside).toBe(false);
    });

    it("handles points along different axes", () => {
      const box = new BoxGeometry(100, 100, 100);

      // Points inside on each axis
      expect(isPointInPolyhedron([25, 0, 0], box).inside).toBe(true);
      expect(isPointInPolyhedron([0, 25, 0], box).inside).toBe(true);
      expect(isPointInPolyhedron([0, 0, 25], box).inside).toBe(true);

      // Points outside on each axis
      expect(isPointInPolyhedron([100, 0, 0], box).inside).toBe(false);
      expect(isPointInPolyhedron([0, 100, 0], box).inside).toBe(false);
      expect(isPointInPolyhedron([0, 0, 100], box).inside).toBe(false);
    });

    it("handles non-indexed geometry", () => {
      // BoxGeometry creates indexed geometry, but we can test with toNonIndexed()
      const box = new BoxGeometry(100, 100, 100);
      const nonIndexed = box.toNonIndexed();

      expect(isPointInPolyhedron([0, 0, 0], nonIndexed).inside).toBe(true);
      expect(isPointInPolyhedron([200, 0, 0], nonIndexed).inside).toBe(false);
    });

    it("treats points on faces/edges/vertices as inside with boundary flag", () => {
      const box = new BoxGeometry(100, 100, 100);
      const onFace: Vector3Tuple = [50, 0, 0];
      const onEdge: Vector3Tuple = [50, 50, 0];
      const onVertex: Vector3Tuple = [50, 50, 50];

      expect(isPointInPolyhedron(onFace, box)).toMatchObject({ inside: true, onBoundary: true });
      expect(isPointInPolyhedron(onEdge, box)).toMatchObject({ inside: true, onBoundary: true });
      expect(isPointInPolyhedron(onVertex, box)).toMatchObject({ inside: true, onBoundary: true });
    });
  });

  describe("isCoordsInPolyhedron", () => {
    it("detects coordinates inside geofence", () => {
      const box = new BoxGeometry(100, 100, 100);
      // Point at origin in 3D space
      const coordsInside: Coords = { ...origin, altitude: 0 };

      const result = isCoordsInPolyhedron(coordsInside, box, origin);
      expect(result.inside).toBe(true);
    });

    it("detects coordinates outside geofence", () => {
      const box = new BoxGeometry(100, 100, 100);
      // Point far from origin (converts to a point > 50m away in 3D)
      const coordsOutside: Coords = {
        latitude: origin.latitude + 0.01, // ~1km north
        longitude: origin.longitude,
        altitude: 0,
      };

      const result = isCoordsInPolyhedron(coordsOutside, box, origin);
      expect(result.inside).toBe(false);
    });

    it("handles altitude correctly", () => {
      const box = new BoxGeometry(100, 100, 100);
      // Box extends from -50 to 50 on Y axis (altitude)

      const aboveBox: Coords = {
        ...origin,
        altitude: 60, // Above the box
      };

      const insideBox: Coords = {
        ...origin,
        altitude: 25, // Inside the box
      };

      expect(isCoordsInPolyhedron(aboveBox, box, origin).inside).toBe(false);
      expect(isCoordsInPolyhedron(insideBox, box, origin).inside).toBe(true);
    });
  });

  describe("isCoordsInGeoTriangles", () => {
    it("detects point inside GeoTriangles", () => {
      const box = new BoxGeometry(100, 100, 100);
      const triangles = extractGeoTriangles(box, origin);

      const coordsInside: Coords = { ...origin, altitude: 0 };
      const result = isCoordsInGeoTriangles(coordsInside, triangles, origin);
      expect(result.inside).toBe(true);
    });

    it("detects point outside GeoTriangles", () => {
      const box = new BoxGeometry(100, 100, 100);
      const triangles = extractGeoTriangles(box, origin);

      const coordsOutside: Coords = {
        latitude: origin.latitude + 0.01,
        longitude: origin.longitude,
        altitude: 0,
      };

      const result = isCoordsInGeoTriangles(coordsOutside, triangles, origin);
      expect(result.inside).toBe(false);
    });
  });

  describe("isPointInGeoTriangles", () => {
    it("matches BufferGeometry point-in-polyhedron results", () => {
      const box = new BoxGeometry(100, 100, 100);
      const triangles = extractGeoTriangles(box, origin);

      const testPoints: Vector3Tuple[] = [
        [0, 0, 0],
        [25, 25, 25],
        [49, 0, 0],
        [51, 0, 0],
        [100, 100, 100],
      ];

      for (const point of testPoints) {
        const bufferResult = isPointInPolyhedron(point, box);
        const geoResult = isPointInGeoTriangles(point, triangles, origin);
        expect(geoResult.inside).toBe(bufferResult.inside);
      }
    });

    it("flags boundary hits for GeoTriangle input", () => {
      const box = new BoxGeometry(100, 100, 100);
      const triangles = extractGeoTriangles(box, origin);
      const onFace: Vector3Tuple = [50, 0, 0];

      const result = isPointInGeoTriangles(onFace, triangles, origin);
      expect(result.inside).toBe(true);
      expect(result.onBoundary).toBe(true);
    });
  });

  describe("isPointOnSurface", () => {
    it("detects point on box surface", () => {
      const box = new BoxGeometry(100, 100, 100);
      // Point exactly on surface
      const onSurface: Vector3Tuple = [50, 0, 0];

      expect(isPointOnSurface(onSurface, box, 0.1)).toBe(true);
    });

    it("detects point near surface within tolerance", () => {
      const box = new BoxGeometry(100, 100, 100);
      const nearSurface: Vector3Tuple = [50.5, 0, 0];

      expect(isPointOnSurface(nearSurface, box, 1)).toBe(true);
      expect(isPointOnSurface(nearSurface, box, 0.1)).toBe(false);
    });

    it("returns false for points far from surface", () => {
      const box = new BoxGeometry(100, 100, 100);
      const farFromSurface: Vector3Tuple = [0, 0, 0]; // Center of box

      expect(isPointOnSurface(farFromSurface, box, 0.1)).toBe(false);
    });

    it("handles non-indexed geometry", () => {
      const box = new BoxGeometry(100, 100, 100);
      const nonIndexed = box.toNonIndexed();
      const onSurface: Vector3Tuple = [50, 0, 0];

      expect(isPointOnSurface(onSurface, nonIndexed, 0.1)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles very small geometries", () => {
      const tinyBox = new BoxGeometry(0.01, 0.01, 0.01);
      const point: Vector3Tuple = [0, 0, 0];

      const result = isPointInPolyhedron(point, tinyBox);
      expect(result.inside).toBe(true);
    });

    it("handles very large geometries", () => {
      const largeBox = new BoxGeometry(10000, 10000, 10000);
      const pointInside: Vector3Tuple = [0, 0, 0];
      const pointOutside: Vector3Tuple = [6000, 0, 0];

      expect(isPointInPolyhedron(pointInside, largeBox).inside).toBe(true);
      expect(isPointInPolyhedron(pointOutside, largeBox).inside).toBe(false);
    });

    it("handles asymmetric geometries", () => {
      // Long thin box
      const longBox = new BoxGeometry(1000, 10, 10);

      expect(isPointInPolyhedron([400, 0, 0], longBox).inside).toBe(true);
      expect(isPointInPolyhedron([0, 10, 0], longBox).inside).toBe(false);
    });
  });
});
