import '@testing-library/jest-dom'

// jsdom stubs these as notImplemented; TanStack Router calls scrollTo on every
// onRendered navigation, which floods stderr without a real implementation.
function noopScroll(this: Window, ..._args: unknown[]) {}
Object.defineProperty(window, 'scrollTo', { configurable: true, writable: true, value: noopScroll })
Object.defineProperty(window, 'scroll', { configurable: true, writable: true, value: noopScroll })
Object.defineProperty(window, 'scrollBy', { configurable: true, writable: true, value: noopScroll })

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// jsdom has no real media pipeline: give every <video> a duration long
// enough for tagged move timestamps, and make play() jump to the end so
// useSegmentPlayer's RAF watcher fires onEnd.
Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  configurable: true,
  get() { return 120 },
})
Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
  configurable: true,
  get() { return 4 },
})
HTMLMediaElement.prototype.load = function load() {}
HTMLMediaElement.prototype.pause = function pause() {}
HTMLMediaElement.prototype.play = function play() {
  this.currentTime = Number(this.duration) || 120
  return Promise.resolve()
}

beforeEach(() => {
  localStorage.clear()
})
