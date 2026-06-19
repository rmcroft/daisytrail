import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(rootDir, 'app-store-previews');
const outputPath = path.join(outputDir, 'feature-graphic-1024x500.png');
const screenshotPath = path.join(outputDir, 'iphone-6-7', '01-leader-dashboard-1242x2688.png');
const iconPath = path.join(rootDir, 'src', 'assets', 'app-icon.png');
const require = createRequire(import.meta.url);
const runtimeNodeModules = path.join(
  os.homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
);

function loadPackage(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(runtimeNodeModules, name));
  }
}

const sharp = loadPackage('sharp');
const width = 1024;
const height = 500;
const colors = {
  background: '#f8faf3',
  sky: '#dbeaf4',
  meadow: '#dceee3',
  field: '#eef6e7',
  headline: '#075d43',
  text: '#41534a',
  accent: '#266399',
  trail: '#c99b5f',
  frame: '#10251f'
};

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseSvg() {
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${colors.background}"/>
      <rect width="100%" height="190" fill="${colors.sky}" opacity="0.42"/>
      <path d="M0 220 C140 150, 280 250, 430 190 S730 130, 1024 205 L1024 500 L0 500 Z" fill="${colors.field}"/>
      <path d="M0 315 C190 255, 310 360, 520 305 S810 260, 1024 340 L1024 500 L0 500 Z" fill="${colors.meadow}" opacity="0.88"/>
      <path d="M72 470 C230 390, 405 372, 362 272 S580 148, 820 90" fill="none" stroke="${colors.trail}" stroke-width="13" stroke-linecap="round" opacity="0.24"/>
      <path d="M72 470 C230 390, 405 372, 362 272 S580 148, 820 90" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 28" opacity="0.72"/>
      <path d="M100 112 q54 -44 108 0 q-54 48 -108 0Z" fill="${colors.headline}" opacity="0.18"/>
      <path d="M858 364 q42 -34 84 0 q-42 38 -84 0Z" fill="${colors.headline}" opacity="0.18"/>
      <path d="M848 70 l54 31 l0 62 l-54 31 l-54 -31 l0 -62 Z" fill="#f2c84b" opacity="0.24"/>
      <text x="132" y="122" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="${colors.accent}">${escapeXml('Daisy Trail')}</text>
      <text x="132" y="192" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="${colors.headline}">${escapeXml('Troop tracking')}</text>
      <text x="132" y="252" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="${colors.headline}">${escapeXml('made simple')}</text>
      <text x="132" y="318" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="500" fill="${colors.text}">${escapeXml('Events, RSVPs, check-ins,')}</text>
      <text x="132" y="354" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="500" fill="${colors.text}">${escapeXml('and badge progress in one place.')}</text>
    </svg>
  `);
}

async function roundedImage(inputPath, size, radius) {
  const image = await sharp(inputPath).resize(size, size).png().toBuffer();
  const mask = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/>
    </svg>
  `);
  return sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function framedScreenshot() {
  const frameWidth = 310;
  const frameHeight = 670;
  const bezel = 10;
  const screenWidth = frameWidth - bezel * 2;
  const screenHeight = frameHeight - bezel * 2;
  const screen = await sharp(screenshotPath)
    .resize(screenWidth, screenHeight, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
  const screenMask = Buffer.from(`
    <svg width="${screenWidth}" height="${screenHeight}" viewBox="0 0 ${screenWidth} ${screenHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${screenWidth}" height="${screenHeight}" rx="30" fill="#fff"/>
    </svg>
  `);
  const clippedScreen = await sharp(screen).composite([{ input: screenMask, blend: 'dest-in' }]).png().toBuffer();
  const frame = Buffer.from(`
    <svg width="${frameWidth + 80}" height="${frameHeight + 80}" viewBox="0 0 ${frameWidth + 80} ${frameHeight + 80}" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#19382f" flood-opacity="0.2"/>
      </filter>
      <rect x="40" y="26" width="${frameWidth}" height="${frameHeight}" rx="44" fill="${colors.frame}" filter="url(#shadow)"/>
      <rect x="${40 + bezel}" y="${26 + bezel}" width="${screenWidth}" height="${screenHeight}" rx="32" fill="#fff"/>
    </svg>
  `);
  const fullPhone = await sharp(frame)
    .composite([{ input: clippedScreen, left: 40 + bezel, top: 26 + bezel }])
    .png()
    .toBuffer();

  return sharp(fullPhone)
    .extract({ left: 0, top: 38, width: 374, height })
    .png()
    .toBuffer();
}

await mkdir(outputDir, { recursive: true });
const icon = await roundedImage(iconPath, 76, 18);
const phone = await framedScreenshot();

await sharp(baseSvg())
  .composite([
    { input: icon, left: 132, top: 388 },
    { input: phone, left: 650, top: 0 }
  ])
  .png()
  .toFile(outputPath);

console.log(outputPath);
