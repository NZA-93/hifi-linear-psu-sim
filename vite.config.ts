import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages project site: https://<user>.github.io/hifi-linear-psu-sim/
// For a custom domain or relative assets, change `base` to './'.
export default defineConfig({
  base: '/hifi-linear-psu-sim/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
