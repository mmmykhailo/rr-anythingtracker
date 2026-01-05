#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read package.json
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Get current version
const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// Parse version bump type from command line args (default: patch)
const bumpType = process.argv[2] || 'patch'; // patch, minor, or major

// Parse semantic version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`New version: ${newVersion}`);

// Get latest git tag
let lastTag;
try {
  lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
} catch (error) {
  lastTag = null;
  console.log('No previous tags found. This will be the first release.');
}

// Get commits since last tag
let commits = [];
try {
  const gitRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const commitOutput = execSync(`git log ${gitRange} --oneline`, { encoding: 'utf8' });
  commits = commitOutput
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
      return match ? { hash: match[1], message: match[2] } : null;
    })
    .filter(Boolean);
} catch (error) {
  console.error('Error getting git commits:', error.message);
  commits = [];
}

console.log(`Found ${commits.length} commits since ${lastTag || 'beginning'}`);

// Read existing CHANGELOG.md or create new one
const changelogPath = join(rootDir, 'CHANGELOG.md');
let changelogContent = '';
try {
  changelogContent = readFileSync(changelogPath, 'utf8');
} catch (error) {
  changelogContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
}

// Generate new changelog entry
const today = new Date().toISOString().split('T')[0];
let newEntry = `## [${newVersion}] - ${today}\n\n`;

if (commits.length > 0) {
  newEntry += '### Changes\n\n';
  commits.forEach(commit => {
    newEntry += `- ${commit.message} (${commit.hash})\n`;
  });
} else {
  newEntry += '### Changes\n\n';
  newEntry += '- Initial release\n';
}

newEntry += '\n';

// Insert new entry after the header (after first occurrence of ##)
const lines = changelogContent.split('\n');
let insertIndex = lines.findIndex((line, i) => i > 0 && line.startsWith('## '));
if (insertIndex === -1) {
  // No previous releases, append after header
  insertIndex = lines.findIndex(line => line.trim() === '') + 1;
  if (insertIndex === 0) insertIndex = lines.length;
}

lines.splice(insertIndex, 0, newEntry);
const newChangelogContent = lines.join('\n');

// Update package.json version
packageJson.version = newVersion;

// Write files
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
writeFileSync(changelogPath, newChangelogContent, 'utf8');

console.log('\n✅ Release preparation complete!');
console.log('\nFiles updated:');
console.log(`  - package.json (version: ${newVersion})`);
console.log(`  - CHANGELOG.md`);
console.log('\nNext steps:');
console.log('  1. Review and edit CHANGELOG.md as needed');
console.log('  2. Commit the changes:');
console.log(`     git add package.json CHANGELOG.md`);
console.log(`     git commit -m "release v${newVersion}"`);
console.log('  3. Push to master:');
console.log('     git push origin master');
console.log('\nThe GitHub Action will automatically deploy and tag the release.');
