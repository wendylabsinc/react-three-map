/**
 * Pixel ratio the map canvas is actually drawn at.
 *
 * It is usually `window.devicePixelRatio`, but maps accept a custom `pixelRatio` and cap their canvas
 * size (MapLibre `maxCanvasSize`), and three.js has to draw at exactly the same resolution.
 */
export function getCanvasPixelRatio(canvas: HTMLCanvasElement): number {
  const { width, clientWidth } = canvas;
  if (!width || !clientWidth) return window.devicePixelRatio;
  const ratio = width / clientWidth;
  // three.js sizes the canvas to `floor(clientWidth * ratio)`, don't let rounding shrink it
  return Math.floor(clientWidth * ratio) === width ? ratio : ratio + 1e-9;
}
