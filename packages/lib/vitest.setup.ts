import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// RTL's built-in auto-cleanup only registers when it detects a global `afterEach`,
// which isn't present since `test.globals` isn't enabled — so wire it explicitly,
// otherwise DOM from one test's render() leaks into the next.
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement ResizeObserver — stub it so components that use it
// (e.g. ChannelAddress's truncation check) don't crash when mounted under test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  // @ts-expect-error jsdom has no ResizeObserver type to satisfy
  globalThis.ResizeObserver = ResizeObserverStub
}

// jsdom doesn't implement IntersectionObserver either — stub it so components
// that use it (e.g. the nav spine's scroll-spy) don't crash when mounted under test.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

if (!('IntersectionObserver' in globalThis)) {
  // @ts-expect-error jsdom has no IntersectionObserver type to satisfy
  globalThis.IntersectionObserver = IntersectionObserverStub
}
