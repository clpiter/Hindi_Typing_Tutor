import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  document.cookie.split('; ').forEach((c) => {
    const name = c.split('=')[0]
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`
  })
  try {
    window.localStorage.clear()
  } catch {
    /* ignore */
  }
})

// jsdom lacks these browser APIs
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
window.HTMLMediaElement.prototype.pause = vi.fn()
window.scrollTo = vi.fn()
if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
