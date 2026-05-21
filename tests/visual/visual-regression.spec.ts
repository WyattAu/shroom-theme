import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const themesDir = path.resolve(__dirname, '..', '..', 'themes');
const pagesDir = path.resolve(__dirname, 'pages');
const refsDir = path.resolve(__dirname, 'references');
const baselineDir = path.resolve(__dirname, 'baseline');
const diffsDir = path.resolve(__dirname, 'diffs');

const DIFF_THRESHOLD = 0.02; // 2% pixel diff threshold (accounts for cross-environment rendering variance)

const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));

fs.mkdirSync(refsDir, { recursive: true });
fs.mkdirSync(diffsDir, { recursive: true });

const hasBaseline = fs.existsSync(baselineDir);

for (const file of themeFiles) {
  const slug = file.replace('.json', '');

  test(`visual regression: ${slug}`, async ({ page }) => {
    const htmlPath = path.join(pagesDir, `${slug}.html`);
    expect(fs.existsSync(htmlPath), `HTML page not found: ${htmlPath}`).toBeTruthy();

    await page.goto(`file://${htmlPath}`);
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: false });
    const refPath = path.join(refsDir, `${slug}.png`);
    const diffPath = path.join(diffsDir, `${slug}.png`);

    // Parse the new screenshot
    const newImg = PNG.sync.read(screenshot);

    // Determine baseline source:
    // 1. CI baseline directory (downloaded from previous run's artifact)
    // 2. Local references directory (committed to git)
    const baselinePath = hasBaseline
      ? path.join(baselineDir, `${slug}.png`)
      : refPath;

    if (!fs.existsSync(baselinePath)) {
      // No baseline - save current as reference and pass
      fs.writeFileSync(refPath, screenshot);
      return;
    }

    // Load baseline
    const refBuffer = fs.readFileSync(baselinePath);
    const refImg = PNG.sync.read(refBuffer);

    // Dimension change = fundamental change, update reference
    if (refImg.width !== newImg.width || refImg.height !== newImg.height) {
      fs.writeFileSync(diffPath, screenshot);
      fs.writeFileSync(refPath, screenshot);
      return;
    }

    // Pixel-level comparison using pixelmatch
    const diffImg = new PNG({ width: newImg.width, height: newImg.height });
    const numDiffPixels = pixelmatch(
      refImg.data,
      newImg.data,
      diffImg.data,
      newImg.width,
      newImg.height,
      { threshold: 0.1 }
    );

    const totalPixels = newImg.width * newImg.height;
    const diffPercent = numDiffPixels / totalPixels;

    if (diffPercent >= DIFF_THRESHOLD) {
      fs.writeFileSync(diffPath, PNG.sync.write(diffImg));
    } else if (fs.existsSync(diffPath)) {
      fs.unlinkSync(diffPath);
    }

    expect(
      diffPercent,
      `Visual regression for ${slug}: ${(diffPercent * 100).toFixed(3)}% pixels differ (${numDiffPixels}/${totalPixels}), threshold: ${DIFF_THRESHOLD * 100}%`
    ).toBeLessThan(DIFF_THRESHOLD);
  });
}
