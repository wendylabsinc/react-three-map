import type { Preview } from '@storybook/react';
import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen'
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
