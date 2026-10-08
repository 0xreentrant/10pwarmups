/// <reference types="vite/client" />
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

interface ImportMetaEnv {
  readonly VITEST?: string
  readonly VITE_TAGGER_API_URL?: string
}

interface Window {
  gtag?: (...args: unknown[]) => void
  dataLayer?: unknown[]
}
