const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
  try{
    const page=await browser.newPage({viewport:{width:1330,height:1100},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https?:/,route=>route.abort());
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    const fontsLoaded=await page.evaluate(()=>['Manrope','Outfit','Plus Jakarta Sans'].map(font=>[font,document.fonts.check(`600 24px "${font}"`)]));
    fontsLoaded.forEach(([name,loaded])=>assert.ok(loaded,name+' should load'));
    assert.equal(await page.locator('.phone').count(),3);
    assert.equal(await page.locator('.wallet').count(),18);
    assert.equal(await page.locator('.phone .record-card,.phone .record-nav,.phone .add,.phone [data-breakdown]').count(),0);
    const geometry=await page.locator('.phone').evaluateAll(phones=>phones.map(phone=>({
      last:phone.querySelector('.wallet:last-child').getBoundingClientRect().bottom,
      barTop:phone.querySelector('.bottom').getBoundingClientRect().top,
      barHeight:phone.querySelector('.bottom').getBoundingClientRect().height,
      overflow:phone.querySelector('main').scrollWidth>phone.querySelector('main').clientWidth,
      numeric:getComputedStyle(phone.querySelector('.hero-amount strong')).fontVariantNumeric,
      numberFamily:getComputedStyle(phone.querySelector('.hero-amount strong')).fontFamily,
      activeBackground:getComputedStyle(phone.querySelector('.bottom [aria-current]')).backgroundColor,
    })));
    geometry.forEach(g=>{assert.ok(g.last<g.barTop);assert.equal(g.barHeight,52);assert.equal(g.overflow,false);assert.match(g.numeric,/lining-nums/);assert.match(g.numeric,/tabular-nums/);assert.match(g.numberFamily,/Inter/);assert.equal(g.activeBackground,'rgba(0, 0, 0, 0)')});
    for(const theme of ['light','dark']){
      await page.locator(`[data-theme="${theme}"]`).click();
      await page.screenshot({path:path.join(__dirname,`${theme}-comparison.png`),fullPage:true});
      for(let index=0;index<3;index++)await page.locator('.phone').nth(index).screenshot({path:path.join(__dirname,`${theme}-font-${index+1}.png`)});
    }
    for(const phone of await page.locator('.phone').all()){
      const walletTab=phone.locator('.bottom button').nth(2);
      await walletTab.click();assert.equal(await walletTab.getAttribute('aria-current'),'page');
      assert.equal(await phone.locator('.bottom [aria-current]').count(),1);
      await phone.locator('.toast').evaluate(toast=>toast.hidden=true);
      await phone.locator('[data-more]').click();await page.keyboard.press('Escape');
      assert.equal(await phone.locator('.more').isVisible(),false);
      await phone.locator('[data-hide]').first().click();assert.equal(await phone.locator('.hero-amount strong').textContent(),'••••••••');
      await phone.locator('[data-hide]').first().click();
    }
    await page.screenshot({path:path.join(__dirname,'dark-selected-wallets.png'),fullPage:true});
    await page.setViewportSize({width:430,height:960});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    const result={fontsLoaded,geometry,checks:'3 fonts × 2 themes; 6 wallets visible; no Record/Add/Breakdown; transparent selected tab; interactive selection/More/Escape/privacy; no page errors or phone overflow.'};
    fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log(result.checks);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
