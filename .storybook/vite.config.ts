import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      'react-three-map': path.resolve(__dirname, '../src'),
      'react-three-map/maplibre': path.resolve(__dirname, '../src/maplibre'),
      'react-three-map/mapbox': path.resolve(__dirname, '../src/mapbox'),
      'react-map-gl/maplibre': 'react-map-gl/dist/esm/maplibre',
      'react-map-gl': 'react-map-gl/dist/esm/index'
    }
  },
  optimizeDeps: {
    include: ['maplibre-gl', 'mapbox-gl'],
    exclude: []
  }
});
