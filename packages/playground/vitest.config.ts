import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts, whose dev-server plugin watches the library's
// build marker — nothing a unit test run should start.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
