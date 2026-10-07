import { test, expect } from '@playwright/test';

test('previewer serves and renders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') {errors.push(m.text());} });

  await page.goto('file:///home/wyatt/dev/src/github.com/WyattAu/shroom-theme/previewer/dist/index.html');
  await page.waitForTimeout(3000);

  const body = await page.content();
  // count occurrences of the new vs old variable colour anywhere in the DOM
  const newPink = (body.match(/E794D2/gi) || []).length;
  const oldBlue = (body.match(/82AAFF/gi) || []).length;
  const newLine = (body.match(/8C86A3/gi) || []).length;
  console.log('pink #E794D2 occurrences:', newPink);
  console.log('old blue #82AAFF occurrences:', oldBlue);
  console.log('new line-number #8C86A3 occurrences:', newLine);
  console.log('page bytes:', body.length);
  console.log('page errors:', errors.length ? errors.slice(0,3) : 'none');
  expect(body.length).toBeGreaterThan(1000);
});
