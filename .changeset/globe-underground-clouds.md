---
"@wendylabsinc/react-three-map": minor
---

Globe projection, an exact map camera and an underground camera.

- Support the globe projection of MapLibre >= 5 and Mapbox >= 3: `<Canvas>`, `<Coordinates>`
  and raycasting now stay anchored on the globe, and follow the map while it blends into
  Mercator as you zoom in. Objects behind the planet are hidden in `overlay` mode too.
- The R3F camera now matches the map camera exactly: `camera.position` is the map's eye, and
  `fov`, `aspect`, `near` and `far` match its projection (they used to be three.js defaults), so
  lighting, drei helpers and postprocessing that read the camera work as expected. Anything sized
  with `calculateScaleFactor` now gets the size it asked for.
- Pointer rays now go from the eye through the pointer, they used to start from the centre of the
  near plane, and pointer events over markers, popups or `<Html>` map to the right place.
- Render at the map canvas' actual pixel ratio, which differs from `devicePixelRatio` when the
  map caps its canvas size or sets a custom `pixelRatio`.
- `coordsToVector3` uses the exact Mercator formula, and `vector3ToCoords` is now its exact
  inverse (it used to drift by ~10 m at 10 km from the origin).
- New `UndergroundCamera` and `allowUndergroundCamera` (MapLibre only) let the camera go below
  the ground, to look up at the map from underneath or fly through underground assets.
- New stories: Globe, Underground and Volumetric Clouds.
