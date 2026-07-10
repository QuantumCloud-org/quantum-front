/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_DEVTOOLS?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  // Local demo flag. When 'true', network egress for auth/session and menu
  // routers is short-circuited to fixtures (src/lib/mock). Passed via shell env
  // (VITE_FEATURE_MOCK=true bun run dev), never committed to .env files.
  readonly VITE_FEATURE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
