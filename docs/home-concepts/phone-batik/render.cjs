const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
 const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
 try {
  const page = await browser.newPage({ viewport: { width: 940, height: 1150 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const evidence = {};
  for (const theme of ['light', 'dark']) {
   await page.locator(`[data-theme=${theme}]`).click();
   assert.equal(await page.locator('.concept:visible').count(), 2);
   const geometry = await page.locator('.phone').evaluateAll(phones => phones.map(phone => {
    const rect = el => el.getBoundingClientRect();
    const bar = rect(phone.querySelector('.bottom'));
    const add = rect(phone.querySelector('[data-quick-add]'));
    const card = rect(phone.querySelector('.balance'));
    return { width: rect(phone).width, barHeight: bar.height, addHeight: add.height, addWidth: add.width,
     plusSize: rect(phone.querySelector('.plus-mark')).height,
     centreDifference: Math.abs((bar.left + bar.right) / 2 - (add.left + add.right) / 2),
     lastWallet: rect(phone.querySelector('.wallet:last-child')).bottom, barTop: bar.top,
     cardTop: card.top, cardHeight: card.height,
     font: getComputedStyle(phone.querySelector('.brand')).fontFamily,
     amountFont: getComputedStyle(phone.querySelector('.total-money')).fontFamily,
     overflow: phone.querySelector('.phone-scroll').scrollWidth > phone.querySelector('.phone-scroll').clientWidth };
   }));
   geometry.forEach(g => { assert.equal(g.width,390); assert.equal(g.barHeight,52); assert.equal(g.plusSize,40); assert.ok(g.addHeight>=44&&g.addWidth>=44); assert.ok(g.centreDifference<1); assert.ok(g.lastWallet<g.barTop); assert.match(g.amountFont,/Inter/); assert.equal(g.overflow,false); });
   assert.match(geometry[0].font,/Plus Jakarta Sans/); assert.match(geometry[1].font,/Source Serif 4/);
   assert.equal(geometry[0].cardTop,geometry[1].cardTop); assert.equal(geometry[0].cardHeight,geometry[1].cardHeight);
   evidence[theme]=geometry;
   await page.screenshot({ path:path.join(__dirname,`${theme}-comparison.png`),fullPage:true });
   for(const variant of ['current','new']) await page.locator(`[data-variant=${variant}] .phone`).screenshot({path:path.join(__dirname,`${theme}-${variant}.png`)});
  }
  fs.copyFileSync(path.join(__dirname,'light-comparison.png'),path.join(__dirname,'comparison.png'));
  for(const theme of ['light','dark']) fs.copyFileSync(path.join(__dirname,`${theme}-new.png`),path.join(__dirname,`${theme}.png`));
  const current=page.locator('[data-variant=current] .phone');
  const updated=page.locator('[data-variant=new] .phone');
  await current.locator('[data-hide=total]').click();
  for(const phone of [current,updated]) { assert.equal(await phone.locator('[data-money=total]').textContent(),'••••••••'); assert.equal(await phone.locator('[data-hide=total]').getAttribute('aria-pressed'),'true'); }
  await updated.locator('[data-hide=total]').click();
  assert.match(await current.locator('[data-money=total]').textContent(),/99.715.958/);
  await current.locator('[data-hide=wallet-0]').click(); assert.equal(await updated.locator('[data-money=wallet-0]').textContent(),'••••••••');
  await updated.locator('[data-hide=wallet-0]').click();
  await current.locator('[data-quick-add]').click(); assert.match(await current.locator('.preview-message').textContent(),/review/); assert.equal(await current.locator('[data-page=Home]').getAttribute('aria-current'),'page');
  await current.locator('.preview-message button').click();
  await updated.locator('[data-page=Wallets]').click(); assert.equal(await current.locator('[data-page=Wallets]').getAttribute('aria-current'),'page');
  await updated.locator('.preview-message button').click();
  await current.locator('[data-page=Home]').click();
  await current.locator('.preview-message button').click();
  await current.locator('[data-more]').click(); assert.equal(await current.locator('.more').isVisible(),true);
  await page.keyboard.press('Shift+Tab'); assert.equal(await current.locator('.more-grid button').last().evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape'); assert.equal(await current.locator('.more').isVisible(),false); assert.equal(await current.locator('[data-more]').evaluate(el=>el===document.activeElement),true);
  await page.locator('button[data-view=current]').click(); assert.equal(await page.locator('.concept:visible').count(),1); assert.equal(await current.isVisible(),true);
  await page.locator('button[data-view=new]').click(); assert.equal(await page.locator('.concept:visible').count(),1); assert.equal(await updated.isVisible(),true);
  await page.locator('button[data-view=both]').click();
  await current.locator('.phone-scroll').evaluate(el=>el.scrollTop=40);
  await page.waitForFunction(()=>[...document.querySelectorAll('.phone-scroll')].every(el=>el.scrollTop===40));
  await current.locator('.phone-scroll').evaluate(el=>el.scrollTop=0);
  await page.waitForFunction(()=>[...document.querySelectorAll('.phone-scroll')].every(el=>el.scrollTop===0));
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:960});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   for(const phone of [current,updated])assert.equal(await phone.locator('.phone-scroll').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  }
  await page.locator('button[data-view=new]').click();
  await page.setViewportSize({width:390,height:960});
  await page.screenshot({path:path.join(__dirname,'mobile-comparison.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({themes:evidence,checks:['matching card geometry','six wallets clear of navigation','52px navigation and centred 40px plus','real bundled fonts','linked privacy and selected tabs','More focus trap and Escape','Current/New/Compare controls','linked scrolling','320/360/390/430px no overflow','no page errors'],renderer:'headless Chromium --disable-gpu'},null,2));
  console.log('Verified both designs in both themes, matching geometry, preview interactions, comparison controls, focus, linked scrolling and narrow layouts.');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
