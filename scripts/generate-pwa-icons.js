import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableIconSizes = [192, 512];

// Create a simple SVG icon with "AT" text
function createSVGIcon(size, isMaskable = false) {
  // For maskable icons, we need safe area padding (about 20% on each side)
  const padding = isMaskable ? size * 0.2 : size * 0.1;
  const fontSize = (size - padding * 2) * 0.5;

  // Dark background color matching the app theme
  const bgColor = '#0a0a0a';
  // Accent color for the text
  const textColor = '#22c55e'; // Green color for the text

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.1}" />
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-weight="bold"
    font-size="${fontSize}px"
    fill="${textColor}">AT</text>
</svg>`;

  return svg;
}

// Convert SVG to PNG using a data URL approach (creates a bitmap)
async function svgToPng(svgString, size) {
  // Since we can't use external dependencies, we'll save as SVG and let the browser handle it
  // For a real PNG conversion, you'd need a library like sharp or canvas
  // But SVG icons are actually supported by modern browsers for PWAs
  return svgString;
}

// Ensure the icons directory exists
const iconsDir = join(dirname(__dirname), 'public', 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Generate regular icons
console.log('Generating PWA icons...');
for (const size of iconSizes) {
  const svg = createSVGIcon(size, false);
  const filename = join(iconsDir, `icon-${size}x${size}.svg`);
  writeFileSync(filename, svg);
  console.log(`✓ Created icon-${size}x${size}.svg`);
}

// Generate maskable icons
for (const size of maskableIconSizes) {
  const svg = createSVGIcon(size, true);
  const filename = join(iconsDir, `icon-maskable-${size}x${size}.svg`);
  writeFileSync(filename, svg);
  console.log(`✓ Created icon-maskable-${size}x${size}.svg`);
}

// Also create a simple favicon.svg
const faviconSvg = createSVGIcon(32, false);
const faviconPath = join(dirname(__dirname), 'public', 'favicon.svg');
writeFileSync(faviconPath, faviconSvg);
console.log('✓ Created favicon.svg');

// Update the manifest to use SVG icons
const manifestPath = join(dirname(__dirname), 'public', 'manifest.json');
const manifest = {
  "name": "AnythingTracker",
  "short_name": "AnythingTracker",
  "description": "Track Anything, Achieve Everything - Water intake, steps, habits, or any measurable activity",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait",
  "categories": ["health", "lifestyle", "productivity"],
  "icons": [
    ...iconSizes.map(size => ({
      "src": `/icons/icon-${size}x${size}.svg`,
      "sizes": `${size}x${size}`,
      "type": "image/svg+xml",
      "purpose": "any"
    })),
    ...maskableIconSizes.map(size => ({
      "src": `/icons/icon-maskable-${size}x${size}.svg`,
      "sizes": `${size}x${size}`,
      "type": "image/svg+xml",
      "purpose": "maskable"
    }))
  ]
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ Updated manifest.json with SVG icons');

console.log('\n🎉 PWA icons generated successfully!');
console.log('\nNote: These are SVG icons which are supported by modern browsers.');
console.log('For PNG icons, you would need to install and use a package like "sharp" or "canvas".');
console.log('\nTo convert to PNG, you can run:');
console.log('  npm install sharp');
console.log('Then update this script to use sharp for PNG conversion.');
