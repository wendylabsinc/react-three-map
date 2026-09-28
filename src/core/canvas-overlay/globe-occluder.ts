import { Camera, Mesh, MeshBasicMaterial, Scene, SphereGeometry, WebGLRenderer } from "three";
import { earthRadius } from "../earth-radius";

/**
 * Depth-only sphere the size of the Earth.
 *
 * The overlay canvas doesn't share the map's depth buffer, so without it everything behind
 * the globe would show through the planet. Drawing it first lets the depth test hide it, the
 * same way the map's own depth buffer does when rendering inside the map (`overlay={false}`).
 */
export class GlobeOccluder {

  private scene?: Scene;
  private mesh?: Mesh<SphereGeometry, MeshBasicMaterial>;

  /**
   * @param altitude - altitude of the scene origin, the Earth centre is right below it
   */
  render(gl: WebGLRenderer, camera: Camera, altitude = 0) {
    if (!this.scene || !this.mesh) {
      this.mesh = new Mesh(
        // 256 x 128 segments keep the facets within ~500m of the real surface
        new SphereGeometry(earthRadius, 256, 128),
        new MeshBasicMaterial({ colorWrite: false }),
      );
      this.mesh.frustumCulled = false;
      this.scene = new Scene().add(this.mesh);
    }
    this.mesh.position.set(0, -(earthRadius + altitude), 0);
    gl.render(this.scene, camera);
  }

  dispose() {
    this.mesh?.geometry.dispose();
    this.mesh?.material.dispose();
  }
}
