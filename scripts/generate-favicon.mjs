import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG favicon design matching the logo
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="50%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg-gradient)"/>
  <g transform="translate(96, 96) scale(1.2)">
    <path d="M247.15 23.95c-23.63-23.63-64.1-21.94-90.84 4.82L118 76.82 77.82 36.64C70.87 29.69 59.27 29.69 52.32 36.64C45.36 43.6 45.36 55.2 52.32 62.14L85.68 95.5 30.18 151c-1.01 1.01-1.01 2.65 0 3.66l-8.84 26.52c-2.69 8.06 2.02 16.79 10.4 18.43L71.26 207l7.03 7.03-28.04 28.04c-6.96 6.96-6.96 18.56 0 25.52 3.48 3.48 8.04 5.22 12.6 5.22s9.12-1.74 12.6-5.22l28.04-28.04 7.03 7.03 7.39 39.52c1.64 8.38 10.37 13.09 18.43 10.4l26.52-8.84c1.01 1.01 2.65 1.01 3.66 0l55.5-55.5 33.36 33.36c3.48 3.48 8.04 5.22 12.6 5.22s9.12-1.74 12.6-5.22c6.96-6.96 6.96-18.56 0-25.52l-40.18-40.18 48.05-48.05c26.76-26.76 28.45-67.21 4.82-90.84z" fill="white"/>
  </g>
  <circle cx="432" cy="80" r="56" fill="#4ade80"/>
</svg>`;

async function generateFavicons() {
  console.log('Generating favicons...');

  // Create base buffer from SVG
  const svgBuffer = Buffer.from(faviconSvg);

  // Generate different sizes
  const sizes = [16, 32, 48, 64, 128, 180, 192, 512];

  for (const size of sizes) {
    const outputPath = join(publicDir, `favicon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Created: favicon-${size}x${size}.png`);
  }

  // Create standard favicon.ico (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.png'));
  console.log('Created: favicon.png');

  // Create apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Created: apple-touch-icon.png');

  // Create android icons
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'android-chrome-192x192.png'));
  console.log('Created: android-chrome-192x192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'android-chrome-512x512.png'));
  console.log('Created: android-chrome-512x512.png');

  // Create web manifest
  const manifest = {
    name: 'eSIMFly',
    short_name: 'eSIMFly',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    theme_color: '#6366f1',
    background_color: '#ffffff',
    display: 'standalone'
  };

  writeFileSync(
    join(publicDir, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Created: site.webmanifest');

  console.log('\nAll favicons generated successfully!');
}

generateFavicons().catch(console.error);
