import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const themesDir = path.resolve(__dirname, '..', '..', 'themes');
const pagesDir = path.resolve(__dirname, 'pages');
const refsDir = path.resolve(__dirname, 'references');
const diffsDir = path.resolve(__dirname, 'diffs');

const DIFF_THRESHOLD = 0.01; // 1% pixel variance threshold

const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));

fs.mkdirSync(refsDir, { recursive: true });
fs.mkdirSync(diffsDir, { recursive: true });

for (const file of themeFiles) {
  const slug = file.replace('.json', '');

  test(`visual regression: ${slug}`, async ({ page }) => {
    const htmlPath = path.join(pagesDir, `${slug}.html`);
    expect(fs.existsSync(htmlPath), `HTML page not found: ${htmlPath}`).toBeTruthy();

    await page.goto(`file://${htmlPath}`);
    await page.setViewportSize({ width: 1280, height: 720 });

    // Wait for fonts and rendering to settle
    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });

    const refPath = path.join(refsDir, `${slug}.png`);
    const diffPath = path.join(diffsDir, `${slug}.png`);

    if (!fs.existsSync(refPath)) {
      // No reference image exists yet - save as reference
      fs.writeFileSync(refPath, screenshot);
      console.log(`Created reference image: ${slug}.png`);
      // Pass by default when creating initial reference
      return;
    }

    // Compare with reference
    const refImage = fs.readFileSync(refPath);

    // If images are identical, pass immediately
    if (Buffer.compare(screenshot, refImage) === 0) {
      // Clean up any old diff
      if (fs.existsSync(diffPath)) {
        fs.unlinkSync(diffPath);
      }
      return;
    }

    // Images differ - compute diff percentage
    const diffPercent = await computePixelDiff(refImage, screenshot, diffPath);

    expect(
      diffPercent,
      `Visual regression detected for ${slug}: ${diffPercent.toFixed(4)}% pixels differ (threshold: ${DIFF_THRESHOLD * 100}%)`
    ).toBeLessThan(DIFF_THRESHOLD);
  });
}

/**
 * Compute pixel-level diff between two PNG buffers.
 * Returns the percentage of pixels that differ (0.0 to 1.0).
 * Optionally saves a diff image.
 */
async function computePixelDiff(
  refBuffer: Buffer,
  newBuffer: Buffer,
  diffOutputPath: string
): Promise<number> {
  // Simple byte-level comparison for PNG data
  // For production, use pixelmatch or similar - here we use buffer comparison
  if (refBuffer.length !== newBuffer.length) {
    // Different sizes mean significant changes
    fs.writeFileSync(diffOutputPath, newBuffer);
    return 1.0;
  }

  let diffPixels = 0;
  const totalPixels = refBuffer.length;

  for (let i = 0; i < totalPixels; i++) {
    if (refBuffer[i] !== newBuffer[i]) {
      diffPixels++;
    }
  }

  const diffPercent = diffPixels / totalPixels;

  if (diffPercent >= DIFF_THRESHOLD) {
    fs.writeFileSync(diffOutputPath, newBuffer);
  } else if (fs.existsSync(diffOutputPath)) {
    fs.unlinkSync(diffOutputPath);
  }

  return diffPercent;
}
