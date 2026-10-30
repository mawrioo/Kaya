const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const icon = name => renderToStaticMarkup(React.createElement(icons[name], { 'aria-hidden': true, size: 18, strokeWidth: 1.7 }));
const source = fs.readFileSync(path.join(__dirname, '../type-navigation/index.html'), 'utf8');
const articles = [...source.matchAll(/<article class="concept[^"]*">[\s\S]*?<\/article>/g)];
let phone = articles[2]?.[0];
if (!phone || !phone.includes("font-family:'Plus Jakarta Sans'")) throw new Error('Expected Plus Jakarta Sans concept');
const nav = `<nav class="bottom centre-navigation" aria-label="Preview navigation">${[['House','Home'],['ArrowLeftRight','Transactions'],['Plus','Quick add'],['Wallet','Wallets'],['Menu','More']].map(([glyph,label],index)=>`<button ${index===0?'aria-current="page"':''} ${label==='More'?'data-more aria-expanded="false"':`data-preview="${label==='Quick add'?'Quick add':label}"`} ${label==='Quick add'?'data-quick-add class="centre-add" aria-label="Quick add transaction"':''}>${label==='Quick add'?'<span class="plus-mark">':''}${icon(glyph)}${label==='Quick add'?'</span>':`<span>${label}</span>`}</button>`).join('')}</nav>`;
phone = phone.replace(/<nav class="bottom"[\s\S]*?<\/nav>/, nav);
const variants = ['Light','Dark'].map(theme=>phone
  .replace(/<article class="concept[^"]*">/,`<article class="concept ${theme==='Dark'?'dark':''}">`)
  .replace(/<div class="caption">[\s\S]*?<\/p><\/div><\/div>/,`<div class="caption"><h2>${theme}</h2></div>`)).join('');
const css = `
.board{max-width:940px}.concepts{grid-template-columns:repeat(2,390px);gap:28px}.caption{height:24px;margin-bottom:12px}.caption h2{font-size:14px}.board-header h1{font-size:30px}.footnote{margin-top:20px}.centre-navigation{grid-template-columns:repeat(5,minmax(0,1fr))}.type-option .centre-navigation button{font-size:9px;gap:3px}.type-option .centre-navigation .centre-add{gap:0;padding:0;color:var(--text);font-weight:500;min-height:44px}.plus-mark{display:grid;place-items:center;width:40px;height:40px;background:#c8824a;color:#23190f;border-radius:12px}.plus-mark svg{width:22px;height:22px;stroke-width:1.8}.dark .plus-mark{background:#dda16e;color:#21190f}.type-option .centre-add:active{opacity:.8}.type-option .centre-add:hover .plus-mark{background:#ba703c}.dark .type-option .centre-add:hover .plus-mark{background:#e6b487}@media(max-width:1300px){.board{padding:28px 40px}.concepts{grid-template-columns:repeat(2,390px)}}@media(max-width:600px){.board{padding:20px 12px}.board-header h1{font-size:27px}}
`;
const html = source
  .replace(/<div class="concepts">[\s\S]*?<\/article><\/div><p class="footnote">/,`<div class="concepts">${variants}</div><p class="footnote">`)
  .replace(/<div class="theme"[\s\S]*?<\/div>/,'')
  .replace('A fresh face for Kaya.','Kaya, with Quick add at the centre.')
  .replace('Three wordmarks. Even-baseline numbers. A cleaner active tab.','Plus Jakarta Sans. Straight numbers. One compact action in the bottom bar.')
  .replace('Try the bottom tabs, More and the eye controls.','Try Quick add, the bottom tabs, More and the eye controls.')
  .replace('Kaya — wordmark and navigation concepts','Kaya — Plus Jakarta Sans and centre Quick add')
  .replace("'.bottom button[data-preview]'","'.bottom button[data-preview]:not([data-quick-add])'")
  .replace('</style>',css+'</style>');
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log('Built Plus Jakarta Sans with centred Quick add, light and dark.');
