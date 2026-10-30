const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const icon = name => renderToStaticMarkup(React.createElement(icons[name], { 'aria-hidden': true, size: 18, strokeWidth: 1.7 }));
const previous = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const fonts = [...previous.matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0]).join('\n');
const wallets = [
  ['BCA', '24.705.000', 'Landmark', '#7896ac'],
  ['Mandiri', '20.000.000', 'Landmark', '#a38d43'],
  ['Bank Jago', '10.000.000', 'Smartphone', '#c17e4d'],
  ['Superbank', '20.000.000', 'Smartphone', '#709170'],
  ['Pluang', '15.000.000', 'PiggyBank', '#8e9b70'],
  ['Deposito', '10.010.958', 'Vault', '#9b81a6'],
];
const rows = wallets.map(([name, value, glyph, color]) => `<div class="wallet" style="--wallet:${color}"><span class="wallet-icon">${icon(glyph)}</span><span class="wallet-name">${name}</span><strong>Rp ${value}</strong><button class="eye" aria-label="Hide ${name} balance" data-hide>${icon('Eye')}</button></div>`).join('');
const brand = '<span class="brand">Kaya</span>';
const add = `<button class="add" data-preview="Quick add">${icon('Plus')}<span>Add</span></button>`;
const date = '<span class="date">Thu, 29 Oct 2026</span>';
const greeting = `<div class="welcome"><h3>Good morning, Mario</h3></div>`;
const headers = [
  `<header>${brand}${date}</header><div class="intro">${greeting}${add}</div>`,
  `<header class="center-brand">${brand}</header><div class="intro personal"><div>${greeting}${date}</div>${add}</div>`,
  `<header>${brand}${add}</header>`,
];
const names = ['Open header', 'Greeting first', 'Card-led header'];
const descriptions = ['No separate bar. Airy and familiar.', 'Your greeting leads; Kaya stays quiet.', 'The balance card holds the welcome.'];
const navigation = `<nav class="bottom" aria-label="Preview navigation">${[['House','Home'],['ArrowLeftRight','Transactions'],['Wallet','Wallets'],['Menu','More']].map(([glyph,label], index)=>`<button ${index===0?'aria-current="page"':''} ${label==='More'?'data-more aria-expanded="false"':`data-preview="${label}"`}>${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>`;
const more = `<div class="scrim" hidden></div><section class="more" hidden aria-label="More pages"><div class="more-heading"><strong>More</strong><button data-close aria-label="Close More">${icon('X')}</button></div><div class="more-grid">${[['Target','Goals'],['Shapes','Categories'],['ChartNoAxesColumnIncreasing','Insights'],['PawPrint','Pet'],['Settings2','Settings']].map(([glyph,label])=>`<button data-preview="${label}">${icon(glyph)}${label}</button>`).join('')}</div></section>`;
const phones = names.map((name,index)=>`<article class="concept"><div class="caption"><span class="number">${String.fromCharCode(65+index)}</span><div><h2>${name}</h2><p>${descriptions[index]}</p></div></div><div class="phone refined header-${index+1}"><main>${headers[index]}<section class="balance">${index===2?`<div class="card-welcome">${greeting}${date}</div>`:''}<div class="balance-label">Total balance<button class="eye" aria-label="Hide total balance" data-hide>${icon('Eye')}</button></div><div class="hero-amount"><span>Rp</span> <strong>99.715.958</strong></div><div class="balance-footer"><span>Across 6 wallets</span></div><div class="kawung" aria-hidden="true">${Array(12).fill('<i></i>').join('')}</div></section><div class="section-heading"><h3>Your wallets</h3><button data-preview="Wallets">Manage ${icon('ArrowUpRight')}</button></div><section class="wallets" aria-label="Wallet balances">${rows}</section><section class="next-section"><h3>This month</h3><button data-preview="Insights">View insights ${icon('ArrowUpRight')}</button></section><p class="continuation">Your monthly overview continues below.</p></main>${more}${navigation}<div class="toast" role="status" hidden></div></div><p class="concept-note">${['Recommended · small wordmark, date and greeting in the page','Centered wordmark · greeting with date below · compact Add','Small wordmark and Add · greeting inside the signature card'][index]}</p></article>`).join('');
const css = fs.readFileSync(path.join(__dirname,'refinement.css'),'utf8');
let template = fs.readFileSync(path.join(__dirname,'../template.html'),'utf8');
template = template.replaceAll("'Source Serif 4'", "'Serif'")
  .replace('/* EMBEDDED_FONTS */',fonts).replace('<!-- PHONES -->',phones)
  .replace('</style>',css+'\n</style>')
  .replace('Kaya — three phone concepts','Kaya — Compact refinement')
  .replace('Three ways forward for Kaya.','Compact Kaya, with your changes.')
  .replace('Same balances. Less scrolling. A smaller 52px bottom navigation.','Signature balance. Separate wallets. Smaller Kaya. Three header choices.')
  .replace('Try More, Breakdown and the eye controls.','Try More, Add and the eye controls.')
  .replace("phone.querySelector('[data-breakdown]').onclick", "if(phone.querySelector('[data-breakdown]'))phone.querySelector('[data-breakdown]').onclick");
fs.writeFileSync(path.join(__dirname,'index.html'),template);
console.log('Built refined standalone preview.');
