const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1330, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.wallet').count(), 18);
    const geometry = await page.locator('.phone').evaluateAll(phones => phones.map(phone => ({
      nav: phone.querySelector('.bottom').getBoundingClientRect().height,
      lastRow: phone.querySelector('.wallet:last-child').getBoundingClientRect().bottom,
      barTop: phone.querySelector('.bottom').getBoundingClientRect().top,
      overflow: phone.querySelector('main').scrollWidth > phone.querySelector('main').clientWidth,
    })));
    geometry.forEach(result => { assert.equal(result.nav, 52); assert.ok(result.lastRow < result.barTop); assert.equal(result.overflow, false); });
    for (const theme of ['light', 'dark']) {
      await page.locator(`[data-theme="${theme}"]`).click();
      await page.screenshot({ path: path.join(__dirname, `${theme}-comparison.png`), fullPage: true });
      for (let index = 0; index < 3; index++) {
        await page.locator('.phone').nth(index).screenshot({ path: path.join(__dirname, `${theme}-option-${index + 1}.png`) });
      }
    }
    const first = page.locator('.phone').first();
    await first.locator('[data-more]').click();
    assert.equal(await first.locator('.more').isVisible(), true);
    await page.screenshot({ path: path.join(__dirname, 'dark-more.png'), fullPage: true });
    await page.keyboard.press('Escape');
    assert.equal(await first.locator('.more').isVisible(), false);
    await first.locator('[data-breakdown]').click();
    assert.equal(await first.locator('.breakdown').isVisible(), true);
    await first.locator('[data-breakdown]').click();
    await first.locator('[data-hide]').first().click();
    assert.equal(await first.locator('.hero-amount strong').textContent(), '••••••••');
    await first.locator('[data-hide]').first().click();
    await first.locator('.add').click();
    assert.match(await first.locator('.toast').textContent(), /describe → review → save/);
    await page.setViewportSize({ width: 430, height: 960 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ preview: '390 × 844', bar: '52px', walletsVisible: 6, themes: 2, variants: 3, checks: 'No page errors; no phone content overflow; More/Escape, Breakdown, privacy and Add preview checked. Narrow comparison board scrolls horizontally.' }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
