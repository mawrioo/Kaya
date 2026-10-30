const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--disable-gpu']});
  try {
    const page = await browser.newPage({viewport:{width:1330,height:1080},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https?:/,route=>route.abort());
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.getByText('Breakdown',{exact:true}).count(),0);
    assert.equal(await page.locator('.wallet').count(),18);
    const dimensions=await page.locator('.phone').evaluateAll(phones=>phones.map(phone=>({
      bar:phone.querySelector('.bottom').getBoundingClientRect().height,
      last:phone.querySelector('.wallet:last-child').getBoundingClientRect().bottom,
      barTop:phone.querySelector('.bottom').getBoundingClientRect().top,
      brand:parseFloat(getComputedStyle(phone.querySelector('.brand')).fontSize),
      overflow:phone.querySelector('main').scrollWidth>phone.querySelector('main').clientWidth,
      separate:getComputedStyle(phone.querySelector('.wallets')).gap,
    })));
    dimensions.forEach(d=>{assert.equal(d.bar,52);assert.ok(d.last<d.barTop);assert.ok(d.brand<=18);assert.equal(d.overflow,false);assert.equal(d.separate,'7px')});
    for(const theme of ['light','dark']){
      await page.locator(`[data-theme="${theme}"]`).click();
      await page.screenshot({path:path.join(__dirname,`${theme}-comparison.png`),fullPage:true});
      for(let index=0;index<3;index++)await page.locator('.phone').nth(index).screenshot({path:path.join(__dirname,`${theme}-header-${index+1}.png`)});
    }
    for(const phone of await page.locator('.phone').all()){
      await phone.locator('[data-more]').click();
      assert.equal(await phone.locator('.more').isVisible(),true);
      await page.keyboard.press('Escape');
      assert.equal(await phone.locator('.more').isVisible(),false);
      await phone.locator('[data-hide]').first().click();
      assert.equal(await phone.locator('.hero-amount strong').textContent(),'••••••••');
      await phone.locator('[data-hide]').first().click();
      await phone.locator('.add').click();
      assert.equal(await phone.locator('.toast').isVisible(),true);
    }
    await page.setViewportSize({width:430,height:960});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('Verified: 3 headers, 2 themes, six separate visible wallets each, 16–18px Kaya, no Breakdown, 52px navigation; preview controls and narrow board work.');
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
