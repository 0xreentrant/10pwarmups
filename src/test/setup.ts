import '@testing-library/jest-dom'

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

// jsdom has no real media pipeline: give every <video> a duration and make
// play() jump to the end so useSegmentPlayer's RAF watcher fires onEnd.
Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  configurable: true,
  get() { return 10 },
})
Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
  configurable: true,
  get() { return 4 },
})
HTMLMediaElement.prototype.load = function load() {}
HTMLMediaElement.prototype.pause = function pause() {}
HTMLMediaElement.prototype.play = function play() {
  this.currentTime = Number(this.duration) || 10
  return Promise.resolve()
}

beforeEach(() => {
  localStorage.clear()
})
