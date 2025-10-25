import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

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

// Convert SVG to PNG using sharp
async function svgToPng(svgString, size, filename) {
  const buffer = Buffer.from(svgString);
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(filename);
}

// Ensure the icons directory exists
const iconsDir = join(dirname(__dirname), 'public', 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  // Generate regular icons
  console.log('Generating PWA icons...');
  for (const size of iconSizes) {
    const svg = createSVGIcon(size, false);
    const filename = join(iconsDir, `icon-${size}x${size}.png`);
    await svgToPng(svg, size, filename);
    console.log(`✓ Created icon-${size}x${size}.png`);
  }

  // Generate maskable icons
  for (const size of maskableIconSizes) {
    const svg = createSVGIcon(size, true);
    const filename = join(iconsDir, `icon-maskable-${size}x${size}.png`);
    await svgToPng(svg, size, filename);
    console.log(`✓ Created icon-maskable-${size}x${size}.png`);
  }

  // Also create a simple favicon.svg and .png
  const faviconSvg = createSVGIcon(32, false);
  const faviconSvgPath = join(dirname(__dirname), 'public', 'favicon.svg');
  writeFileSync(faviconSvgPath, faviconSvg);
  console.log('✓ Created favicon.svg');

  const faviconPngPath = join(dirname(__dirname), 'public', 'favicon.png');
  await svgToPng(faviconSvg, 32, faviconPngPath);
  console.log('✓ Created favicon.png');
}

async function updateManifest() {
  // Update the manifest to use PNG icons
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
        "src": `/icons/icon-${size}x${size}.png`,
        "sizes": `${size}x${size}`,
        "type": "image/png",
        "purpose": "any"
      })),
      ...maskableIconSizes.map(size => ({
        "src": `/icons/icon-maskable-${size}x${size}.png`,
        "sizes": `${size}x${size}`,
        "type": "image/png",
        "purpose": "maskable"
      }))
    ]
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ Updated manifest.json with PNG icons');

  console.log('\n🎉 PWA icons generated successfully!');
}

// Run the generation
await generateIcons();
await updateManifest();
