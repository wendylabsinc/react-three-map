import { Canvas, events as fiberEvents } from "@react-three/fiber";
import { Matrix4, Vector3 } from "three";

/** projection * view matrix inverted */
const projViewInv = new Matrix4()
const rayOrigin = new Vector3()
const rayDirection = new Vector3()

type Events = Parameters<typeof Canvas>[0]['events'];

export const events: Events = (store) => {
  const originalEvents = fiberEvents(store);
  return {
    ...originalEvents,
    connect: target => {
      if (!originalEvents.connect) return;
      originalEvents.connect(target.parentElement!);  // eslint-disable-line @typescript-eslint/no-non-null-assertion
    },
    compute: (event, state) => {

      // events come from the map container, and markers, popups or `<Html>` inside it
      // report `offsetX` relative to themselves, so measure against the canvas instead
      const rect = state.gl.domElement.getBoundingClientRect();
      const width = rect.width || state.size.width;
      const height = rect.height || state.size.height;
      state.pointer.x = ((event.clientX - rect.left) / width) * 2 - 1;
      state.pointer.y = 1 - ((event.clientY - rect.top) / height) * 2;

      if (state.camera.userData.projByViewInv) {
        projViewInv.fromArray(state.camera.userData.projByViewInv);

        // Custom raycasting for map projection
        // Ray starts at the pointer position on the near plane...
        rayOrigin.set(state.pointer.x, state.pointer.y, -1).applyMatrix4(projViewInv);

        // ...and passes through the pointer position on the far plane
        rayDirection
          .set(state.pointer.x, state.pointer.y, 1)
          .applyMatrix4(projViewInv)
          .sub(rayOrigin)
          .normalize();

        state.raycaster.camera = state.camera;
        state.raycaster.ray.origin.copy(rayOrigin);
        state.raycaster.ray.direction.copy(rayDirection);
      } else {
        // Fallback to default raycaster setup
        state.raycaster.setFromCamera(state.pointer, state.camera);
      }

    },
  };
};
