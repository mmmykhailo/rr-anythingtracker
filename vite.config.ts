import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf8")
);
const APP_VERSION = packageJson.version;

// Read and parse CHANGELOG.md
let CHANGELOG = [];
try {
  const changelogContent = readFileSync(join(__dirname, "CHANGELOG.md"), "utf8");
  const lines = changelogContent.split("\n");

  let currentVersion = null;
  let currentDate = null;
  let currentChanges = [];

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(.+?)\] - (.+)$/);
    if (versionMatch) {
      // Save previous version if it exists
      if (currentVersion) {
        CHANGELOG.push({
          version: currentVersion,
          date: currentDate,
          changes: currentChanges.join('\n')
        });
      }
      // Start new version
      currentVersion = versionMatch[1];
      currentDate = versionMatch[2];
      currentChanges = [];
    } else if (currentVersion && line.trim() && !line.startsWith('#')) {
      currentChanges.push(line);
    }
  }

  // Save last version
  if (currentVersion) {
    CHANGELOG.push({
      version: currentVersion,
      date: currentDate,
      changes: currentChanges.join('\n')
    });
  }
} catch (error) {
  console.warn("Could not read CHANGELOG.md:", error instanceof Error ? error.message : String(error));
  CHANGELOG = [];
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __CHANGELOG__: JSON.stringify(CHANGELOG),
  },
});
