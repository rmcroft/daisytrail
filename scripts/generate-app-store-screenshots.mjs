import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const webDir = path.join(rootDir, 'www');
const outputDir = path.join(rootDir, 'app-store-previews');
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

const { chromium } = loadPackage('playwright');
const sharp = loadPackage('sharp');

const devices = [
  {
    slug: 'iphone-6-7',
    width: 1242,
    height: 2688,
    cssWidth: 414,
    cssHeight: 896,
    deviceScaleFactor: 3,
    isMobile: true
  },
  {
    slug: 'ipad-12-9',
    width: 2048,
    height: 2732,
    cssWidth: 1024,
    cssHeight: 1366,
    deviceScaleFactor: 2,
    isMobile: false
  }
];

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8']
]);

const previews = [
  {
    name: 'leader-dashboard',
    login: ['leader@example.com', 'troop123'],
    prepare: async (page) => {
      await page.getByText('Selected Event').waitFor();
    }
  },
  {
    name: 'parent-rsvp',
    login: ['alicia@example.com', 'parent123'],
    prepare: async (page) => {
      await page.getByText('Upcoming Events').waitFor();
    }
  },
  {
    name: 'badge-progress',
    login: ['alicia@example.com', 'parent123'],
    prepare: async (page) => {
      await page.locator('ion-footer ion-segment-button[value="badges"]').click();
      await page.getByText('Junior Trail Adventure').waitFor();
    }
  }
];

function browserLaunchOptions() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return existsSync(chromePath) ? { executablePath: chromePath } : {};
}

function serveStatic() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const requestedPath = path.join(webDir, safePath === '/' ? 'index.html' : safePath);

    try {
      const file = await readFile(requestedPath);
      response.writeHead(200, {
        'Content-Type': contentTypes.get(path.extname(requestedPath)) ?? 'application/octet-stream'
      });
      response.end(file);
    } catch {
      const fallback = await readFile(path.join(webDir, 'index.html'));
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(fallback);
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function login(page, [email, password]) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('ion-input[formcontrolname="email"] input').fill(email);
  await page.locator('ion-input[formcontrolname="password"] input').fill(password);
  await page.getByRole('button', { name: /^Sign In$/ }).click();
  await page.getByText('Daisy Trail').first().waitFor();
}

async function savePreview(page, filePath, device) {
  const png = await page.screenshot({ fullPage: false, scale: 'device' });
  await sharp(png)
    .resize(device.width, device.height, { fit: 'cover', position: 'top' })
    .png()
    .toFile(filePath);
}

await mkdir(outputDir, { recursive: true });
const { server, url: baseUrl } = await serveStatic();
const browser = await chromium.launch(browserLaunchOptions());

try {
  for (const device of devices) {
    const page = await browser.newPage({
      viewport: { width: device.cssWidth, height: device.cssHeight },
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: true
    });

    for (const [index, preview] of previews.entries()) {
      await login(page, preview.login);
      await preview.prepare(page);
      await page.waitForTimeout(700);
      const fileName = `${String(index + 1).padStart(2, '0')}-${preview.name}-${device.width}x${device.height}.png`;
      const filePath = path.join(outputDir, device.slug, fileName);
      await mkdir(path.dirname(filePath), { recursive: true });
      await savePreview(page, filePath, device);
      console.log(filePath);
    }

    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
