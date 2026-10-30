/* Standalone design previews: no app server, API or database. */
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const source = fs.readFileSync(path.join(__dirname, '../navigation-mockups/index.html'), 'utf8');
const fonts = [...source.matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0]).join('\n');
if (!fonts.includes('base64')) throw new Error('Expected existing embedded Kaya fonts');
const icon = name => renderToStaticMarkup(React.createElement(icons[name], { 'aria-hidden': true, size: 18, strokeWidth: 1.7 }));
const wallets = [
  ['BCA', '24.705.000', 'Landmark', '#7896ac'],
  ['Mandiri', '20.000.000', 'Landmark', '#a38d43'],
  ['Bank Jago', '10.000.000', 'Smartphone', '#c17e4d'],
  ['Superbank', '20.000.000', 'Smartphone', '#709170'],
  ['Pluang', '15.000.000', 'PiggyBank', '#8e9b70'],
  ['Deposito', '10.010.958', 'Vault', '#9b81a6'],
];
const names = ['Compact Kaya', 'Personal ledger', 'Signature balance'];
const descriptions = ['Familiar warmth, tighter rhythm.', 'Flat surfaces. Clear comparisons.', 'One confident forest-green card.'];
const rows = wallets.map(([name, value, glyph, color]) => `<div class="wallet" style="--wallet:${color}"><span class="wallet-icon">${icon(glyph)}</span><span class="wallet-name">${name}</span><strong>Rp ${value}</strong><button class="eye" aria-label="Hide ${name} balance" data-hide>${icon('Eye')}</button></div>`).join('');
const navigation = `<nav class="bottom" aria-label="Preview navigation">${[['House', 'Home'], ['ArrowLeftRight', 'Transactions'], ['Wallet', 'Wallets'], ['Menu', 'More']].map(([glyph, label], index) => `<button ${index === 0 ? 'aria-current="page"' : ''} ${label === 'More' ? 'data-more aria-expanded="false"' : 'data-preview="' + label + '"'}>${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>`;
const more = `<div class="scrim" hidden></div><section class="more" hidden aria-label="More pages"><div class="more-heading"><strong>More</strong><button data-close aria-label="Close More">${icon('X')}</button></div><div class="more-grid">${[['Target','Goals'],['Shapes','Categories'],['ChartNoAxesColumnIncreasing','Insights'],['PawPrint','Pet'],['Settings2','Settings']].map(([glyph,label])=>`<button data-preview="${label}">${icon(glyph)}${label}</button>`).join('')}</div></section>`;
const phones = names.map((name, index) => `<article class="concept"><div class="caption"><span class="number">${index + 1}</span><div><h2>${name}</h2><p>${descriptions[index]}</p></div></div><div class="phone option-${index + 1}"><header><span class="brand">Kaya<span class="brand-dot"></span></span><span class="date">29 Oct 2026</span><button class="add" data-preview="Quick add">${icon('Plus')}<span>Add</span></button></header><main><div class="greeting"><span>${icon('Sun')} Good morning, Mario</span>${index===1?'<span class="ledger-date">Thursday</span>':''}</div><section class="balance"><div class="balance-label">Total balance<button class="eye" aria-label="Hide total balance" data-hide>${icon('Eye')}</button></div><div class="hero-amount"><span>Rp</span> <strong>99.715.958</strong></div><div class="balance-footer"><span>Across 6 wallets</span><button data-breakdown aria-expanded="false">Breakdown ${icon('ChevronDown')}</button></div><div class="breakdown" hidden><div class="share">${wallets.map((w,i)=>`<span style="background:${w[3]};flex:${[25,20,10,20,15,10][i]}"></span>`).join('')}</div><p>BCA 25% · Mandiri 20% · Bank Jago 10%<br>Superbank 20% · Pluang 15% · Deposito 10%</p></div>${index===2?'<div class="kawung" aria-hidden="true">'+Array(12).fill('<i></i>').join('')+'</div>':''}</section><div class="section-heading"><h3>Your wallets</h3><button data-preview="Wallets">Manage ${icon('ArrowUpRight')}</button></div><section class="wallets" aria-label="Wallet balances">${rows}</section><section class="next-section"><h3>This month</h3><button data-preview="Insights">View insights ${icon('ArrowUpRight')}</button></section><p class="continuation">Your monthly overview continues below.</p></main>${more}${navigation}<div class="toast" role="status" hidden></div></div><p class="concept-note">${['Sage balance · soft row panel · subtle active tab','Open ledger · fine rules · precise number column','Forest card · corner kawung · orange active mark'][index]}</p></article>`).join('');
let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
html = html.replaceAll("'Source Serif 4'", "'Serif'").replace('/* EMBEDDED_FONTS */', fonts).replace('<!-- PHONES -->', phones);
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Built self-contained index.html with bundled Kaya fonts.');
