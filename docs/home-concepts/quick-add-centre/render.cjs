const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
  try{
    const page=await browser.newPage({viewport:{width:940,height:1090},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https?:/,route=>route.abort());
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.phone').count(),2);
    assert.equal(await page.locator('.wallet').count(),12);
    for (const add of await page.locator('[data-quick-add]').all()) {
      assert.equal((await add.textContent()).trim(), '');
      assert.equal(await add.getAttribute('aria-label'), 'Quick add transaction');
    }
    const geometry=await page.locator('.phone').evaluateAll(phones=>phones.map(phone=>{
      const bar=phone.querySelector('.bottom').getBoundingClientRect();
      const add=phone.querySelector('[data-quick-add]').getBoundingClientRect();
      return {
        barHeight:bar.height,addHeight:add.height,addWidth:add.width,
        plusSize:phone.querySelector('.plus-mark').getBoundingClientRect().height,
        centreDifference:Math.abs((bar.left+bar.right)/2-(add.left+add.right)/2),
        last:phone.querySelector('.wallet:last-child').getBoundingClientRect().bottom,barTop:bar.top,
        font:getComputedStyle(phone.querySelector('.brand')).fontFamily,
        overflow:phone.querySelector('main').scrollWidth>phone.querySelector('main').clientWidth,
      };
    }));
    geometry.forEach(g=>{assert.equal(g.barHeight,52);assert.equal(g.plusSize,40);assert.ok(g.addHeight>=44);assert.ok(g.addWidth>=44);assert.ok(g.centreDifference<1);assert.ok(g.last<g.barTop);assert.match(g.font,/Plus Jakarta Sans/);assert.equal(g.overflow,false)});
    await page.screenshot({path:path.join(__dirname,'comparison.png'),fullPage:true});
    for(const [index,theme] of ['light','dark'].entries()){
      const phone=page.locator('.phone').nth(index);
      await phone.screenshot({path:path.join(__dirname,`${theme}.png`)});
      await phone.locator('[data-quick-add]').click();
      assert.match(await phone.locator('.toast').textContent(),/describe → review → save/);
      assert.equal(await phone.locator('[data-quick-add]').getAttribute('aria-current'),null);
      assert.equal(await phone.locator('.bottom [aria-current]').textContent(),'Home');
      await phone.locator('.toast').evaluate(toast=>toast.hidden=true);
      const wallets=phone.locator('.bottom button').nth(3);
      await wallets.click();assert.equal(await wallets.getAttribute('aria-current'),'page');
      await phone.locator('.toast').evaluate(toast=>toast.hidden=true);
      await phone.locator('[data-more]').click();await page.keyboard.press('Escape');
      assert.equal(await phone.locator('.more').isVisible(),false);
      await phone.locator('[data-hide]').first().click();assert.equal(await phone.locator('.hero-amount strong').textContent(),'••••••••');
      await phone.locator('[data-hide]').first().click();
    }
    await page.setViewportSize({width:430,height:960});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('Verified: Plus Jakarta Sans in both themes; centred Quick add >=44px within 52px bar; six wallets visible; Quick add preserves selected page; tab selection, More/Escape/privacy; no overflow or page errors.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
