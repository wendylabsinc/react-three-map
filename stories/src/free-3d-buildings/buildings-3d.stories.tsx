import type { Meta } from '@storybook/react';
// import { Bloom, EffectComposer } from '@react-three/postprocessing'; // Temporarily disabled
import { levaStore, useControls } from "leva";
import { Suspense, useEffect } from "react";
import { Coords } from "@wendylabsinc/react-three-map";
// import { ScreenBlend } from "../screen-blend-effect/screen-blend"; // Part of post-processing, temporarily disabled
import { StoryMap } from "../story-map-storybook";
import { BatchedBuildings } from "./batched-buildings";
import { AdaptiveDpr } from '../adaptive-dpr';

const coords: Coords = { latitude: 51.5074, longitude: -0.1278 };

// Separate component to ensure hooks are used inside Canvas
// Note: Temporarily disabling post-processing due to compatibility issues
function SceneContent() {
  return (
    <>
      <AdaptiveDpr />
      {/* Post-processing temporarily disabled - EffectComposer has compatibility issues with react-three-map Canvas */}
      <ambientLight intensity={Math.PI} />
      <directionalLight intensity={Math.PI} />
      <Suspense fallback={null}>
        <BatchedBuildings buildingsCenter={coords} origin={coords} />
      </Suspense>
    </>
  );
}

export function Default() {
  // disable showBuildings3D control from Mapbox
  useControls({ showBuildings3D: { value: false, render: () => false } });

  // Dark theme is now handled via mapStyle prop

  // default this story to use overlay
  useEffect(() => {
    const overlay = levaStore.get('overlay');
    levaStore.setValueAtPath('overlay', true, true);
    return () => {
      // reset overlay
      if (overlay) return;
      levaStore.setValueAtPath('overlay', overlay, true);
    }
  }, [])

  return <StoryMap
    {...coords}
    zoom={18}
    pitch={60}
    canvas={{ shadows: 'variance' }}
  >
    <SceneContent />
  </StoryMap>
}

const meta: Meta = {
  title: 'Free 3d Buildings/Buildings 3d',
  component: Default,
};

export default meta;
