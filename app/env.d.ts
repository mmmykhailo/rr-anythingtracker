/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_TOKEN: string;
  readonly VITE_GIST_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
