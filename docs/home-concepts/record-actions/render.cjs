const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
  try {
    const page=await browser.newPage({viewport:{width:960,height:1100},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https?:/,route=>route.abort());
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.phone .brand, .phone .add, .phone [data-breakdown]').count(),0);
    assert.equal(await page.locator('.wallet').count(),12);
    assert.equal(await page.locator('.record-card').count(),1);
    assert.equal(await page.locator('.record-nav').count(),1);
    const measurements=await page.locator('.phone').evaluateAll(phones=>phones.map(phone=>({
      last:phone.querySelector('.wallet:last-child').getBoundingClientRect().bottom,
      barTop:phone.querySelector('.bottom').getBoundingClientRect().top,
      barHeight:phone.querySelector('.bottom').getBoundingClientRect().height,
      recordHeight:phone.querySelector('.record-card, .record-nav').getBoundingClientRect().height,
      overflow:phone.querySelector('main').scrollWidth>phone.querySelector('main').clientWidth,
    })));
    measurements.forEach(m=>{assert.ok(m.last<m.barTop);assert.equal(m.barHeight,52);assert.ok(m.recordHeight>=44);assert.equal(m.overflow,false)});
    for(const theme of ['light','dark']){
      await page.locator(`[data-theme="${theme}"]`).click();
      await page.screenshot({path:path.join(__dirname,`${theme}-comparison.png`),fullPage:true});
      for(let index=0;index<2;index++)await page.locator('.phone').nth(index).screenshot({path:path.join(__dirname,`${theme}-${index===0?'card':'navigation'}.png`)});
    }
    for(const phone of await page.locator('.phone').all()){
      await phone.locator('.record-card, .record-nav').click();
      assert.match(await phone.locator('.toast').textContent(),/describe → review → save/);
      await phone.locator('.toast').evaluate(toast=>toast.hidden=true);
      await phone.locator('[data-more]').click();await page.keyboard.press('Escape');
      assert.equal(await phone.locator('.more').isVisible(),false);
      await phone.locator('[data-hide]').first().click();
      assert.equal(await phone.locator('.hero-amount strong').textContent(),'••••••••');
      await phone.locator('[data-hide]').first().click();
    }
    await page.setViewportSize({width:430,height:960});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('Verified both placements and themes: 6 separate wallets visible; no logo, Add or Breakdown; 52px navigation; Record controls >=44px; privacy, More/Escape and Record previews work; no overflow or page errors.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
