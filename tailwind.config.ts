import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './stories/**/*.{js,ts,jsx,tsx}',
    './example-mapbox/**/*.{js,ts,jsx,tsx}',
    './example-maplibre/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
