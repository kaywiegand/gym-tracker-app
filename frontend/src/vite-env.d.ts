/// <reference types="vite/client" />

// Injected by deploy/deploy.sh at build time. Absent in `npm run dev`.
interface ImportMetaEnv {
  readonly VITE_BUILD_ID?: string
  readonly VITE_BUILD_COMMIT?: string
  readonly VITE_BUILD_TIME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
