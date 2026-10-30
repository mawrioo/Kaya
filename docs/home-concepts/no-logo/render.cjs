const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 940, height: 1060 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.phone').count(), 2);
    assert.equal(await page.locator('.phone .brand, .phone header, .phone [data-breakdown]').count(), 0);
    assert.equal(await page.locator('.wallet').count(), 12);
    const geometry = await page.locator('.phone').evaluateAll(phones => phones.map(phone => ({
      last: phone.querySelector('.wallet:last-child').getBoundingClientRect().bottom,
      barTop: phone.querySelector('.bottom').getBoundingClientRect().top,
      barHeight: phone.querySelector('.bottom').getBoundingClientRect().height,
      overflow: phone.querySelector('main').scrollWidth > phone.querySelector('main').clientWidth,
    })));
    geometry.forEach(g => { assert.ok(g.last < g.barTop); assert.equal(g.barHeight, 52); assert.equal(g.overflow, false); });
    await page.screenshot({ path: path.join(__dirname, 'comparison.png'), fullPage: true });
    for (const [index, theme] of ['light', 'dark'].entries()) {
      const phone = page.locator('.phone').nth(index);
      await phone.screenshot({ path: path.join(__dirname, `${theme}.png`) });
      await phone.locator('[data-more]').click();
      await page.keyboard.press('Escape');
      assert.equal(await phone.locator('.more').isVisible(), false);
      await phone.locator('[data-hide]').first().click();
      assert.equal(await phone.locator('.hero-amount strong').textContent(), '••••••••');
      await phone.locator('[data-hide]').first().click();
      await phone.locator('.add').click();
      assert.equal(await phone.locator('.toast').isVisible(), true);
    }
    await page.setViewportSize({ width: 430, height: 960 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('Verified both themes: logo-free header, 6 separate visible wallets, no Breakdown, 52px navigation, no overflow/page errors; More/Escape, privacy and Add preview work.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
