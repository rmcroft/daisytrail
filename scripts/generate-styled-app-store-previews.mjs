import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const previewRoot = path.join(rootDir, 'app-store-previews');
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

const colors = {
  background: '#f8faf3',
  headline: '#075d43',
  accent: '#266399',
  text: '#41534a',
  frame: '#10251f',
  screenStroke: '#ffffff',
  meadow: '#dceee3',
  field: '#eef6e7',
  sky: '#dbeaf4',
  trail: '#c99b5f',
  badge: '#f2c84b'
};

const previews = [
  {
    sourceName: '01-leader-dashboard',
    title: 'Run troop night with confidence',
    kicker: 'Daisy Trail',
    subtitle: 'Check-ins, badge work, and event wrap-up in one clean view.'
  },
  {
    sourceName: '02-parent-rsvp',
    title: 'Make RSVPs simple for families',
    kicker: 'Daisy Trail',
    subtitle: 'Parents can answer quickly and keep troop leaders in sync.'
  },
  {
    sourceName: '03-badge-progress',
    title: 'Track badge progress clearly',
    kicker: 'Daisy Trail',
    subtitle: "See what's started, completed, and ready to award."
  }
];

const devices = [
  {
    slug: 'iphone-6-7',
    width: 1242,
    height: 2688,
    sourceSuffix: '1242x2688',
    titleSize: 84,
    subtitleSize: 42,
    kickerSize: 30,
    titleY: 230,
    subtitleY: 380,
    lineHeight: 100,
    subtitleLineHeight: 54,
    device: { x: 146, y: 660, width: 950, height: 1860, radius: 94, bezel: 22 }
  },
  {
    slug: 'ipad-12-9',
    width: 2048,
    height: 2732,
    sourceSuffix: '2048x2732',
    titleSize: 98,
    subtitleSize: 44,
    kickerSize: 34,
    titleY: 210,
    subtitleY: 360,
    lineHeight: 112,
    subtitleLineHeight: 58,
    device: { x: 214, y: 560, width: 1620, height: 2056, radius: 72, bezel: 24 }
  }
];

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function textBlock(lines, x, y, size, lineHeight, color, weight = 700) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`
    )
    .join('');
}

function backgroundSvg(device, preview) {
  const titleLines = wrapText(preview.title, device.slug === 'iphone-6-7' ? 28 : 34);
  const subtitleLines = wrapText(preview.subtitle, device.slug === 'iphone-6-7' ? 44 : 58);
  const center = device.width / 2;

  return Buffer.from(`
    <svg width="${device.width}" height="${device.height}" viewBox="0 0 ${device.width} ${device.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${colors.background}"/>
      <rect width="100%" height="${device.height * 0.34}" fill="${colors.sky}" opacity="0.42"/>
      <path d="M0 ${device.height * 0.36} C ${device.width * 0.18} ${device.height * 0.3}, ${device.width * 0.34} ${device.height * 0.45}, ${device.width * 0.55} ${device.height * 0.37} S ${device.width * 0.86} ${device.height * 0.25}, ${device.width} ${device.height * 0.34} L ${device.width} ${device.height} L 0 ${device.height} Z" fill="${colors.field}"/>
      <path d="M0 ${device.height * 0.48} C ${device.width * 0.24} ${device.height * 0.42}, ${device.width * 0.36} ${device.height * 0.58}, ${device.width * 0.62} ${device.height * 0.5} S ${device.width * 0.88} ${device.height * 0.44}, ${device.width} ${device.height * 0.55} L ${device.width} ${device.height} L 0 ${device.height} Z" fill="${colors.meadow}" opacity="0.82"/>
      <path d="M${device.width * 0.08} ${device.height * 0.9} C ${device.width * 0.28} ${device.height * 0.78}, ${device.width * 0.5} ${device.height * 0.72}, ${device.width * 0.43} ${device.height * 0.58} S ${device.width * 0.67} ${device.height * 0.38}, ${device.width * 0.9} ${device.height * 0.29}" fill="none" stroke="${colors.trail}" stroke-width="${Math.max(10, device.width * 0.012)}" stroke-linecap="round" opacity="0.24"/>
      <path d="M${device.width * 0.08} ${device.height * 0.9} C ${device.width * 0.28} ${device.height * 0.78}, ${device.width * 0.5} ${device.height * 0.72}, ${device.width * 0.43} ${device.height * 0.58} S ${device.width * 0.67} ${device.height * 0.38}, ${device.width * 0.9} ${device.height * 0.29}" fill="none" stroke="#ffffff" stroke-width="${Math.max(3, device.width * 0.004)}" stroke-linecap="round" stroke-dasharray="1 ${Math.max(26, device.width * 0.03)}" opacity="0.72"/>
      <g opacity="0.24">
        <path d="M${device.width * 0.09} ${device.height * 0.18} q${device.width * 0.055} -${device.width * 0.045} ${device.width * 0.11} 0 q-${device.width * 0.055} ${device.width * 0.05} -${device.width * 0.11} 0Z" fill="${colors.headline}"/>
        <path d="M${device.width * 0.86} ${device.height * 0.66} q${device.width * 0.05} -${device.width * 0.04} ${device.width * 0.1} 0 q-${device.width * 0.05} ${device.width * 0.048} -${device.width * 0.1} 0Z" fill="${colors.headline}"/>
      </g>
      <g opacity="0.22">
        <path d="M${device.width * 0.84} ${device.height * 0.13} l${device.width * 0.055} ${device.width * 0.032} l0 ${device.width * 0.064} l-${device.width * 0.055} ${device.width * 0.032} l-${device.width * 0.055} -${device.width * 0.032} l0 -${device.width * 0.064} Z" fill="${colors.badge}"/>
        <path d="M${device.width * 0.13} ${device.height * 0.72} l${device.width * 0.048} ${device.width * 0.028} l0 ${device.width * 0.056} l-${device.width * 0.048} ${device.width * 0.028} l-${device.width * 0.048} -${device.width * 0.028} l0 -${device.width * 0.056} Z" fill="${colors.badge}"/>
      </g>
      <text x="${center}" y="${device.titleY - 90}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${device.kickerSize}" font-weight="800" fill="${colors.accent}">${escapeXml(preview.kicker)}</text>
      ${textBlock(titleLines, center, device.titleY, device.titleSize, device.lineHeight, colors.headline, 800)}
      ${textBlock(subtitleLines, center, device.subtitleY + (titleLines.length - 1) * device.lineHeight, device.subtitleSize, device.subtitleLineHeight, colors.text, 500)}
    </svg>
  `);
}

function frameSvg(frame) {
  const inner = {
    x: frame.x + frame.bezel,
    y: frame.y + frame.bezel,
    width: frame.width - frame.bezel * 2,
    height: frame.height - frame.bezel * 2,
    radius: Math.max(24, frame.radius - frame.bezel)
  };

  return Buffer.from(`
    <svg width="${frame.width + 120}" height="${frame.height + 120}" viewBox="0 0 ${frame.width + 120} ${frame.height + 120}" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="34" stdDeviation="34" flood-color="#19382f" flood-opacity="0.18"/>
      </filter>
      <rect x="60" y="42" width="${frame.width}" height="${frame.height}" rx="${frame.radius}" fill="${colors.frame}" filter="url(#shadow)"/>
      <rect x="${60 + frame.bezel}" y="${42 + frame.bezel}" width="${inner.width}" height="${inner.height}" rx="${inner.radius}" fill="${colors.screenStroke}"/>
    </svg>
  `);
}

async function roundedImage(inputPath, width, height, radius) {
  const image = await sharp(inputPath)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const mask = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/>
    </svg>
  `);

  return sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function renderPreview(device, preview, index) {
  const frame = device.device;
  const inner = {
    x: frame.x + frame.bezel,
    y: frame.y + frame.bezel,
    width: frame.width - frame.bezel * 2,
    height: frame.height - frame.bezel * 2,
    radius: Math.max(24, frame.radius - frame.bezel)
  };
  const sourcePath = path.join(previewRoot, device.slug, `${preview.sourceName}-${device.sourceSuffix}.png`);
  const outputDir = path.join(previewRoot, device.slug, 'styled');
  const outputPath = path.join(outputDir, `${String(index + 1).padStart(2, '0')}-${preview.sourceName.replace(/^\d+-/, '')}-${device.sourceSuffix}.png`);
  const screen = await roundedImage(sourcePath, inner.width, inner.height, inner.radius);

  await mkdir(outputDir, { recursive: true });
  await sharp(backgroundSvg(device, preview))
    .composite([
      { input: frameSvg(frame), left: frame.x - 60, top: frame.y - 42 },
      { input: screen, left: inner.x, top: inner.y }
    ])
    .png()
    .toFile(outputPath);

  console.log(outputPath);
}

for (const device of devices) {
  for (const [index, preview] of previews.entries()) {
    await renderPreview(device, preview, index);
  }
}
