import { Map as MaplibreMap } from "maplibre-gl";
import { describe, expect, it, vi } from 'vitest';
import { allowUndergroundCamera } from "../maplibre/allow-underground-camera";

/** stand-in for MapLibre's camera, which keeps the camera above the ground by default */
class FakeMap {
  _elevateCameraIfInsideTerrain(transform: ReturnType<typeof cameraAt>): { pitch?: number, zoom?: number } {
    return transform.getCameraAltitude() < 0 ? { pitch: 10, zoom: 10 } : {};
  }
  calculateCameraOptionsFromTo = vi.fn(() => ({ pitch: 42, zoom: 7 }));
}

const cameraAt = (altitude: number) => ({
  getCameraAltitude: () => altitude,
  getCameraLngLat: () => ({ lng: 1, lat: 2 }),
  center: { lng: 3, lat: 4 },
  elevation: -20,
});

describe('allowUndergroundCamera', () => {

  it('targets the constraint MapLibre actually uses', () => {
    // if this fails, MapLibre renamed or removed its camera constraint and the helper needs updating
    expect(typeof (MaplibreMap.prototype as unknown as Record<string, unknown>)._elevateCameraIfInsideTerrain).toBe('function');
  });

  it('lets the camera go anywhere below the ground', () => {
    const map = new FakeMap();
    allowUndergroundCamera(map);
    expect(map._elevateCameraIfInsideTerrain(cameraAt(-5000))).toEqual({});
  });

  it('keeps the camera above `minAltitude`', () => {
    const map = new FakeMap();
    allowUndergroundCamera(map, { minAltitude: -100 });
    expect(map._elevateCameraIfInsideTerrain(cameraAt(-50))).toEqual({});
    expect(map._elevateCameraIfInsideTerrain(cameraAt(-200))).toEqual({ pitch: 42, zoom: 7 });
    expect(map.calculateCameraOptionsFromTo).toHaveBeenCalledWith({ lng: 1, lat: 2 }, -100, { lng: 3, lat: 4 }, -20);
  });

  it('restores the default constraint', () => {
    const map = new FakeMap();
    const restore = allowUndergroundCamera(map);
    restore();
    expect(Object.prototype.hasOwnProperty.call(map, '_elevateCameraIfInsideTerrain')).toBe(false);
    expect(map._elevateCameraIfInsideTerrain(cameraAt(-50))).toEqual({ pitch: 10, zoom: 10 });
  });

  it('leaves later overrides alone when restoring', () => {
    const map = new FakeMap();
    const restore = allowUndergroundCamera(map);
    const theirs = () => ({ zoom: 3 });
    map._elevateCameraIfInsideTerrain = theirs;
    restore();
    expect(map._elevateCameraIfInsideTerrain).toBe(theirs);
  });

  it('does nothing on maps without the constraint', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const map = {};
    allowUndergroundCamera(map)();
    expect(map).toEqual({});
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

});
