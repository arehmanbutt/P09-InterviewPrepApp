/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  // add other VITE_... vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
