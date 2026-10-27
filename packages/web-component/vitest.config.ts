import { defineConfig } from 'vitest/config'

// Separate from the two build configs. Tests cover the element plumbing that
// doesn't need the built library (see src/tests).
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
})
