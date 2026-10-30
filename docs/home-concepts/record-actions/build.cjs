/* Reference-inspired action placements; standalone sample-data previews. */
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const icon = name => renderToStaticMarkup(React.createElement(icons[name], { 'aria-hidden': true, size: 18, strokeWidth: 1.7 }));
const source = fs.readFileSync(path.join(__dirname, '../no-logo/index.html'), 'utf8');
let phone = source.match(/<article class="concept[^"]*">[\s\S]*?<\/article>/)?.[0];
if (!phone) throw new Error('Expected logo-free phone concept');
phone = phone.replace(/<button class="add"[\s\S]*?<\/button>/, '');
const eye = phone.match(/<div class="balance-label">Total balance(<button[\s\S]*?<\/button>)<\/div>/)?.[1];
if (!eye) throw new Error('Expected balance privacy button');
phone = phone
  .replace(/<div class="balance-label">Total balance<button[\s\S]*?<\/button><\/div>/, '<div class="balance-label">Total balance</div>')
  .replace('<strong>99.715.958</strong></div>', `<strong>99.715.958</strong>${eye}</div>`)
  .replace('class="phone refined header-1"', 'class="phone refined header-1 action-concept"');
const record = `<button class="record-card" data-preview="Quick add">${icon('ReceiptText')}<span>Record transaction</span>${icon('ArrowRight')}</button>`;
const fiveNav = `<nav class="bottom five-nav" aria-label="Preview navigation">${[['House','Home'],['ArrowLeftRight','Transactions'],['ReceiptText','Record'],['Wallet','Wallets'],['Menu','More']].map(([glyph,label],index)=>`<button ${index===0?'aria-current="page"':''} ${label==='More'?'data-more aria-expanded="false"':`data-preview="${label==='Record'?'Quick add':label}"`} ${label==='Record'?'class="record-nav"':''}>${label==='Record'?'<span class="record-mark">':''}${icon(glyph)}${label==='Record'?'</span>':''}<span>${label}</span></button>`).join('')}</nav>`;
const variants = [
  phone.replace('class="phone refined header-1 action-concept"','class="phone refined header-1 action-concept card-action"')
    .replace('<div class="kawung"',record+'<div class="kawung"'),
  phone.replace('class="phone refined header-1 action-concept"','class="phone refined header-1 action-concept nav-action"')
    .replace(/<nav class="bottom"[\s\S]*?<\/nav>/,fiveNav),
].map((html,index)=>html.replace(/<div class="caption">[\s\S]*?<\/div>/,`<div class="caption"><div><h2>${index===0?'A · Record inside the card':'B · Record in the navigation'}</h2><p>${index===0?'One place to check and record your money.':'A persistent action within thumb reach.'}</p></div></div>`)).join('');
const toggle = '<div class="theme" aria-label="Preview theme"><button data-theme="light" aria-pressed="true">Light</button><button data-theme="dark" aria-pressed="false">Dark</button></div>';
const css = fs.readFileSync(path.join(__dirname,'actions.css'),'utf8');
const html = source
  .replace(/<div class="concepts">[\s\S]*?<\/article><\/div><p class="footnote">/,`<div class="concepts">${variants}</div><p class="footnote">`)
  .replace('A simpler start. No logo.','A more natural way to record.')
  .replace('Greeting and date. One clear Add action. Your money, straight ahead.','Two action placements, inspired by your banking references.')
  .replace('references.</p></div></div>','references.</p></div>'+toggle+'</div>')
  .replace('Try More, Add and the eye controls.','Try Record, More and the eye controls.')
  .replace('Kaya — logo-free phone concept','Kaya — Record action concepts')
  .replace('</style>',css+'\n</style>');
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log('Built two Record-action concepts, with light/dark toggle.');
