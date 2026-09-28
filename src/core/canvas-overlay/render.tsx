/** custom layer `render`, the arguments after `gl` depend on the map provider and its version */
export type Render = (gl: WebGLRenderingContext, ...args: unknown[]) => void;
