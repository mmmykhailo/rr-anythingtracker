// Global constants injected by Vite at build time
declare const __APP_VERSION__: string;
declare const __CHANGELOG__: Array<{
  version: string;
  date: string;
  changes: string;
}>;

export const APP_VERSION = __APP_VERSION__;
export const CHANGELOG = __CHANGELOG__;

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string;
}
