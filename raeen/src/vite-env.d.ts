/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUG_REPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
