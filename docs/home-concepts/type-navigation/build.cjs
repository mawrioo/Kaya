const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../kaya-header/index.html'),'utf8');
const first = source.match(/<article class="concept[^"]*">[\s\S]*?<\/article>/)?.[0];
if (!first) throw new Error('Expected existing Kaya header');
const families = [
  ['Manrope','Manrope','Clean and understated.'],
  ['Outfit','Outfit','Softer, with more personality.'],
  ['Plus Jakarta Sans','PlusJakartaSans','Confident and compact.'],
];
const fonts = families.map(([family,file])=>`@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${fs.readFileSync(path.join(__dirname,'fonts',file+'.ttf')).toString('base64')}) format('truetype');font-weight:100 900;font-style:normal;font-display:block}`).join('\n');
const variants = families.map(([family,file,description],index)=>first
  .replace(/<article class="concept[^"]*">/, '<article class="concept">')
  .replace(/<div class="caption">[\s\S]*?<\/div>/,`<div class="caption"><div><h2>${String.fromCharCode(65+index)} · ${family}</h2><p>${description}</p></div></div>`)
  .replace('class="phone refined header-1 action-concept card-action"',`class="phone refined header-1 action-concept card-action type-option type-${index+1}"`)
  .replace('<span class="brand">Kaya</span>',`<span class="brand" style="font-family:'${family}',sans-serif">Kaya</span>`)).join('');
const toggle = '<div class="theme" aria-label="Preview theme"><button data-theme="light" aria-pressed="true">Light</button><button data-theme="dark" aria-pressed="false">Dark</button></div>';
const css = fs.readFileSync(path.join(__dirname,'type-navigation.css'),'utf8');
const extraScript = `<script>document.querySelectorAll('.phone').forEach(phone=>{phone.querySelectorAll('.bottom button[data-preview]').forEach(button=>button.addEventListener('click',()=>{phone.querySelectorAll('.bottom button[aria-current]').forEach(item=>item.removeAttribute('aria-current'));button.setAttribute('aria-current','page')}))});</script>`;
const html = source
  .replace(/<div class="concepts">[\s\S]*?<\/article><\/div><p class="footnote">/,`<div class="concepts">${variants}</div><p class="footnote">`)
  .replace('Kaya, with a lighter header.','A fresh face for Kaya.')
  .replace('A small wordmark. Signature balance. Separate wallets.','Three wordmarks. Even-baseline numbers. A cleaner active tab.')
  .replace('active tab.</p></div></div>','active tab.</p></div>'+toggle+'</div>')
  .replace('Try More and the eye controls.','Try the bottom tabs, More and the eye controls.')
  .replace('Other actions show a preview message.','Tab selection previews the new active style; page content stays illustrative. Other actions show a preview message.')
  .replace('Kaya — compact wordmark mockup','Kaya — wordmark and navigation concepts')
  .replace('</style>',fonts+'\n'+css+'</style>')
  .replace('</body>',extraScript+'</body>');
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log('Built three embedded-font concepts with lining numerals and updated active navigation.');
