import { describe, it, expect } from "vitest";
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import {
  bufferGeometryToWKT,
  wktToBufferGeometry,
  extractGeoTriangles,
  parsePolyhedralSurfaceWKT,
  bufferGeometryToGeoTriangles,
  geoTrianglesToBufferGeometry,
  GeoTriangle,
  validatePolyhedronGeometry,
} from "../api/polyhedral-surface";
import { Coords } from "../api/coords";

describe("polyhedral-surface", () => {
  const origin: Coords = {
    latitude: 51.5074,
    longitude: -0.1278,
    altitude: 0,
  };

  describe("extractGeoTriangles", () => {
    it("extracts triangles from indexed BoxGeometry", () => {
      const box = new BoxGeometry(100, 100, 100);
      const triangles = extractGeoTriangles(box, origin);

      // A box has 6 faces, each with 2 triangles = 12 triangles
      expect(triangles.length).toBe(12);

      // Each triangle should have valid coordinates
      for (const tri of triangles) {
        expect(tri.v0).toHaveProperty("longitude");
        expect(tri.v0).toHaveProperty("latitude");
        expect(tri.v0).toHaveProperty("altitude");
        expect(typeof tri.v0.longitude).toBe("number");
        expect(typeof tri.v0.latitude).toBe("number");
        expect(typeof tri.v0.altitude).toBe("number");
      }
    });

    it("extracts triangles from non-indexed geometry", () => {
      // Create a simple non-indexed triangle
      const geometry = new BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,   // v0
        100, 0, 0, // v1
        50, 100, 0 // v2
      ]);
      geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

      const triangles = extractGeoTriangles(geometry, origin);
      expect(triangles.length).toBe(1);
      expect(triangles[0].v0.altitude).toBe(0);
    });

    it("throws error for geometry without position attribute", () => {
      const geometry = new BufferGeometry();
      expect(() => extractGeoTriangles(geometry, origin)).toThrow(
        /BufferGeometry must have a 'position' attribute/
      );
    });
  });

  describe("bufferGeometryToWKT", () => {
    it("converts BoxGeometry to valid WKT format", () => {
      const box = new BoxGeometry(100, 100, 100);
      const wkt = bufferGeometryToWKT(box, { origin });

      expect(wkt).toMatch(/^POLYHEDRALSURFACE Z \(/);
      expect(wkt).toMatch(/\)$/);

      // Should have 12 polygon entries (one per triangle)
      const polygonCount = (wkt.match(/\(\(/g) || []).length;
      expect(polygonCount).toBe(12);
    });

    it("respects precision option", () => {
      const box = new BoxGeometry(100, 100, 100);
      const wkt = bufferGeometryToWKT(box, { origin, precision: 2 });

      // Extract a coordinate and check decimal places
      const coordMatch = wkt.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
      expect(coordMatch).not.toBeNull();

      // Check that we have at most 2 decimal places
      const lng = coordMatch![1];
      const decimals = lng.split(".")[1];
      expect(decimals.length).toBe(2);
    });

    it("produces closed polygons (first vertex repeated)", () => {
      const box = new BoxGeometry(100, 100, 100);
      const wkt = bufferGeometryToWKT(box, { origin });

      // Extract coordinates from the first polygon: (( coords ))
      // The pattern is: ((coord1, coord2, coord3, coord1))
      const polygonMatch = wkt.match(/\(\((-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+(?:,\s*-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+)*)\)\)/);
      expect(polygonMatch).not.toBeNull();

      const coords = polygonMatch![1].split(",").map((s) => s.trim());
      expect(coords.length).toBe(4); // 3 unique + 1 repeated
      expect(coords[0]).toBe(coords[3]); // First equals last
    });
  });

  describe("parsePolyhedralSurfaceWKT", () => {
    it("parses valid POLYHEDRALSURFACE Z WKT", () => {
      const wkt = `POLYHEDRALSURFACE Z (
        ((-0.1278 51.5074 0, -0.1268 51.5074 0, -0.1273 51.5084 0, -0.1278 51.5074 0)),
        ((-0.1278 51.5074 100, -0.1268 51.5074 100, -0.1273 51.5084 100, -0.1278 51.5074 100))
      )`;

      const triangles = parsePolyhedralSurfaceWKT(wkt);
      expect(triangles.length).toBe(2);

      expect(triangles[0].v0.longitude).toBeCloseTo(-0.1278, 4);
      expect(triangles[0].v0.latitude).toBeCloseTo(51.5074, 4);
      expect(triangles[0].v0.altitude).toBe(0);
    });

    it("handles POLYHEDRALSURFACE without Z suffix", () => {
      const wkt = `POLYHEDRALSURFACE (
        ((-0.1278 51.5074 0, -0.1268 51.5074 0, -0.1273 51.5084 0, -0.1278 51.5074 0))
      )`;

      const triangles = parsePolyhedralSurfaceWKT(wkt);
      expect(triangles.length).toBe(1);
    });

    it("handles SRID-prefixed WKT", () => {
      const wkt = `SRID=4326;POLYHEDRALSURFACE Z (
        ((-0.1278 51.5074 0, -0.1268 51.5074 0, -0.1273 51.5084 0, -0.1278 51.5074 0))
      )`;

      const triangles = parsePolyhedralSurfaceWKT(wkt);
      expect(triangles.length).toBe(1);
    });

    it("triangulates quad faces into triangles", () => {
      const wkt = `POLYHEDRALSURFACE Z (
        ((0 0 0, 1 0 0, 1 1 0, 0 1 0, 0 0 0))
      )`;

      const triangles = parsePolyhedralSurfaceWKT(wkt);
      expect(triangles.length).toBe(2);
      expect(triangles.every((t) => t.v0.altitude === 0)).toBe(true);
    });

    it("returns empty array for EMPTY surfaces", () => {
      const triangles = parsePolyhedralSurfaceWKT("POLYHEDRALSURFACE Z EMPTY");
      expect(triangles).toEqual([]);
    });

    it("throws on interior rings", () => {
      const wkt = `POLYHEDRALSURFACE Z (
        ((0 0 0, 2 0 0, 2 2 0, 0 2 0, 0 0 0), (0.5 0.5 0, 1.5 0.5 0, 1.5 1.5 0, 0.5 1.5 0, 0.5 0.5 0))
      )`;

      expect(() => parsePolyhedralSurfaceWKT(wkt)).toThrow(/interior rings are not supported/i);
    });

    it("throws on unclosed rings", () => {
      const wkt = `POLYHEDRALSURFACE Z (
        ((0 0 0, 1 0 0, 1 1 0, 0 1 0))
      )`;

      expect(() => parsePolyhedralSurfaceWKT(wkt)).toThrow(/must match to close the ring/i);
    });

    it("throws on invalid numeric values", () => {
      const wkt = `POLYHEDRALSURFACE Z (
        ((abc 0 0, 1 0 0, 1 1 0, abc 0 0))
      )`;

      expect(() => parsePolyhedralSurfaceWKT(wkt)).toThrow(/numeric value/i);
    });

    it("supports ZM by ignoring the measure", () => {
      const wkt = `POLYHEDRALSURFACE ZM (
        ((0 0 0 5, 1 0 0 5, 0 1 0 5, 0 0 0 5))
      )`;

      const triangles = parsePolyhedralSurfaceWKT(wkt);
      expect(triangles.length).toBe(1);
    });

    it("throws error for invalid WKT format", () => {
      expect(() => parsePolyhedralSurfaceWKT("POINT(0 0)")).toThrow(
        /Invalid WKT format: expected 'POLYHEDRALSURFACE Z/
      );
    });
  });

  describe("wktToBufferGeometry", () => {
    it("creates valid BufferGeometry from WKT", () => {
      const wkt = `POLYHEDRALSURFACE Z (
        ((-0.1278 51.5074 0, -0.1268 51.5074 0, -0.1273 51.5084 0, -0.1278 51.5074 0))
      )`;

      const geometry = wktToBufferGeometry(wkt, { origin });

      expect(geometry).toBeInstanceOf(BufferGeometry);
      const position = geometry.getAttribute("position");
      expect(position).not.toBeNull();
      expect(position.count).toBe(3); // 3 vertices per triangle
    });

    it("throws error for empty WKT", () => {
      const wkt = "POLYHEDRALSURFACE Z ()";
      expect(() => wktToBufferGeometry(wkt, { origin })).toThrow(
        /no faces to convert/i
      );
    });
  });

  describe("roundtrip conversion", () => {
    it("preserves geometry through WKT roundtrip", () => {
      const box = new BoxGeometry(100, 100, 100);
      const originalTriangles = extractGeoTriangles(box, origin);

      // Convert to WKT and back
      const wkt = bufferGeometryToWKT(box, { origin, precision: 8 });
      const reconstructed = wktToBufferGeometry(wkt, { origin });
      const reconstructedTriangles = extractGeoTriangles(reconstructed, origin);

      expect(reconstructedTriangles.length).toBe(originalTriangles.length);

      // Check that coordinates are preserved (within floating point tolerance)
      for (let i = 0; i < originalTriangles.length; i++) {
        const orig = originalTriangles[i];
        const recon = reconstructedTriangles[i];

        expect(recon.v0.longitude).toBeCloseTo(orig.v0.longitude, 6);
        expect(recon.v0.latitude).toBeCloseTo(orig.v0.latitude, 6);
        expect(recon.v0.altitude).toBeCloseTo(orig.v0.altitude, 2);
      }
    });
  });

  describe("bufferGeometryToGeoTriangles and geoTrianglesToBufferGeometry", () => {
    it("converts geometry to GeoTriangles array", () => {
      const box = new BoxGeometry(50, 50, 50);
      const triangles = bufferGeometryToGeoTriangles(box, origin);

      expect(Array.isArray(triangles)).toBe(true);
      expect(triangles.length).toBe(12);

      // Verify structure is JSON-serializable
      const json = JSON.stringify(triangles);
      const parsed = JSON.parse(json) as GeoTriangle[];
      expect(parsed.length).toBe(12);
    });

    it("reconstructs geometry from GeoTriangles", () => {
      const triangles: GeoTriangle[] = [
        {
          v0: { longitude: -0.1278, latitude: 51.5074, altitude: 0 },
          v1: { longitude: -0.1268, latitude: 51.5074, altitude: 0 },
          v2: { longitude: -0.1273, latitude: 51.5084, altitude: 0 },
        },
      ];

      const geometry = geoTrianglesToBufferGeometry(triangles, origin);
      expect(geometry).toBeInstanceOf(BufferGeometry);

      const position = geometry.getAttribute("position");
      expect(position.count).toBe(3);
    });

    it("throws error for empty triangles array", () => {
      expect(() => geoTrianglesToBufferGeometry([], origin)).toThrow(
        /Cannot create BufferGeometry from empty triangles array/
      );
    });

    it("preserves geometry through GeoTriangles roundtrip", () => {
      const box = new BoxGeometry(100, 100, 100);
      const originalTriangles = bufferGeometryToGeoTriangles(box, origin);

      // Simulate JSON storage roundtrip
      const json = JSON.stringify(originalTriangles);
      const parsed = JSON.parse(json) as GeoTriangle[];

      const reconstructed = geoTrianglesToBufferGeometry(parsed, origin);
      const reconstructedTriangles = extractGeoTriangles(reconstructed, origin);

      expect(reconstructedTriangles.length).toBe(originalTriangles.length);
    });
  });

  describe("validatePolyhedronGeometry", () => {
    it("accepts watertight indexed geometries", () => {
      const box = new BoxGeometry(10, 10, 10);
      const res = validatePolyhedronGeometry(box);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.triangleCount).toBeGreaterThan(0);
      expect(res.nonManifoldEdgeCount).toBe(0);
    });

    it("accepts watertight non-indexed geometries", () => {
      const box = new BoxGeometry(10, 10, 10).toNonIndexed();
      const res = validatePolyhedronGeometry(box);
      expect(res.isValid).toBe(true);
      expect(res.nonManifoldEdgeCount).toBe(0);
    });

    it("flags missing position attribute", () => {
      const geometry = new BufferGeometry();
      const res = validatePolyhedronGeometry(geometry);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });

    it("flags non-watertight geometries", () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
      );
      const res = validatePolyhedronGeometry(geometry);
      expect(res.isValid).toBe(false);
      expect(res.nonManifoldEdgeCount).toBeGreaterThan(0);
      expect(res.errors.some((e) => /non-manifold edges/i.test(e))).toBe(true);
    });

    it("flags degenerate triangles", () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]), 3)
      ); // Collinear points
      const res = validatePolyhedronGeometry(geometry);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => /degenerate/i.test(e))).toBe(true);
    });
  });
});
