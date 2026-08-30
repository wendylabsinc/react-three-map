---
"@wendylabsinc/react-three-map": patch
---

Fix package entry points so the published package can actually be installed.

`main` pointed at `dist/index.js` and `types` at `dist/index.d.ts`, neither of
which the build emits, so `require`/`import` of the package failed with
`MODULE_NOT_FOUND`. `files: ["dist"]` also excluded the `maplibre/` resolver
shim, so the documented `@wendylabsinc/react-three-map/maplibre` subpath was
missing from the tarball, and no `mapbox/` shim had ever existed.

- Point `main`, `module` and `types` at the files the build actually emits.
- Add an `exports` map covering `.`, `./mapbox`, `./maplibre` and `./package.json`.
- Ship the `maplibre/` and `mapbox/` shims for legacy (`node`) module resolution.
- Externalize `@react-three/drei` instead of inlining it. It is now a required
  peer dependency; this drops the tarball from ~3.3 MB to ~845 kB of unpacked
  output and stops consumers getting a duplicate drei/troika/three-stdlib copy.
- Correct the package description, which described an unrelated library.
