import type { StorybookConfig } from '@storybook/react-vite';
import { loadEnv } from 'vite';

const config: StorybookConfig = {
  stories: [
    '../stories/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../example-mapbox/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../example-maplibre/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-links',
    '@chromatic-com/storybook'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (config, { configType }) => {
    const { default: path } = await import('path');

    // Load environment variables from .env file
    const env = loadEnv(configType || 'development', process.cwd(), '');

    // Ensure the token is properly set
    const mapboxToken = env.VITE_MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWJhbGV4OTkiLCJhIjoiY2o1cGttZTJjMGJ5NDMycHFwY2h0amZieSJ9.fHqdZDfrCz6dEYTdnQ-hjQ';

    return {
      ...config,
      define: {
        ...config.define,
        'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(mapboxToken),
        'process.env.VITE_MAPBOX_TOKEN': JSON.stringify(mapboxToken),
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': path.resolve(__dirname, '../src'),
          'react-three-map/maplibre': path.resolve(__dirname, '../src/maplibre.index.ts'),
          'react-three-map/mapbox': path.resolve(__dirname, '../src/mapbox.index.ts'),
          'react-three-map': path.resolve(__dirname, '../src/maplibre.index.ts'),
          // Deduplicate three.js
          'three': path.resolve(__dirname, '../node_modules/three')
        },
        dedupe: ['three', '@react-three/fiber', '@react-three/drei']
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include || []),
          'maplibre-gl',
          'mapbox-gl',
          'three',
          '@react-three/postprocessing',
          'postprocessing'
        ],
        exclude: [
          ...(config.optimizeDeps?.exclude || [])
        ],
        force: true
      }
    };
  }
};

export default config;
