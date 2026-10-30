const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const icon = name => renderToStaticMarkup(React.createElement(icons[name], { size: 18, strokeWidth: 1.7, 'aria-hidden': true }));
const fonts = [['Inter', 'Inter.ttf', '100 900'], ['Source Serif 4', 'SourceSerif4.ttf', '200 900'], ['Plus Jakarta Sans', 'PlusJakartaSans.ttf', '200 800']]
 .map(([family, file, weight]) => `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${fs.readFileSync(path.join(__dirname, '../../../frontend/app/fonts', file)).toString('base64')}) format('truetype');font-weight:${weight};font-display:swap}`).join('\n');
// Identical SVG geometry to the current TotalBalanceCard component.
const currentPattern = `<svg class="leaf-pattern" aria-hidden="true" viewBox="0 0 130 170" fill="none"><g stroke="currentColor" stroke-width=".8" transform="rotate(-18 65 85)">${Array.from({ length: 12 }, (_, i) => `<path d="M0 40C0 12 12 0 40 0C40 28 28 40 0 40Z" transform="translate(${i % 3 * 40} ${Math.floor(i / 3) * 40})"/>`).join('')}</g></svg>`;
// Desktop's four-petal, 36px kawung geometry; a background avoids a compositing mask.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><g fill="none" stroke="#dfe8d8" stroke-opacity=".2" stroke-width="1.1"><ellipse cx="18" cy="9" rx="4.6" ry="9"/><ellipse cx="18" cy="27" rx="4.6" ry="9"/><ellipse cx="9" cy="18" rx="9" ry="4.6"/><ellipse cx="27" cy="18" rx="9" ry="4.6"/></g><circle cx="18" cy="18" r="1.7" fill="#dfe8d8" fill-opacity=".2"/></svg>`;
const wallets = [
 ['BCA', '24.705.000', 'Landmark', '#557990', '#dfe5e6'],
 ['Mandiri', '20.000.000', 'Landmark', '#8a7228', '#e9e0c9'],
 ['Bank Jago', '10.000.000', 'Smartphone', '#ad6733', '#edddc8'],
 ['Superbank', '20.000.000', 'Smartphone', '#557253', '#dce3d4'],
 ['Pluang', '15.000.000', 'TrendingUp', '#52795b', '#dce3d4'],
 ['Deposito', '10.010.958', 'Vault', '#7e6c89', '#e5dce6'],
];
const eye = (label, target) => `<button type="button" class="eye" aria-label="Hide ${label} balance" aria-pressed="false" data-hide="${target}">${icon('Eye')}</button>`;
const phone = (variant, title, description) => `<article class="concept" data-variant="${variant}" aria-labelledby="${variant}-title">
 <div class="concept-heading"><h2 id="${variant}-title">${title}</h2><p>${description}</p></div>
 <div class="phone" aria-label="${title} phone preview"><div class="phone-scroll" tabindex="0" aria-label="${title} scrollable Home preview">
  <header class="brand-row"><span class="brand">Kaya</span><time datetime="2026-10-30">Fri, 30 Oct 2026</time></header>
  <h3 class="greeting">Good morning, Mario</h3>
  <section class="balance" aria-label="Total balance">
   ${variant === 'current' ? currentPattern : '<div class="batik-pattern" aria-hidden="true"></div>'}
   <h4>Total balance</h4>
   <div class="hero-amount"><span class="total-money" data-money="total" data-value="99.715.958"><span class="currency">Rp</span> <strong>99.715.958</strong></span>${eye('total', 'total')}</div>
   <p class="balance-caption">Across 6 wallets</p>
  </section>
  <div class="section-heading"><h4>Your wallets</h4><button type="button" data-preview="Manage wallets">Manage ${icon('ArrowRight')}</button></div>
  <ul class="wallets" aria-label="Wallet balances">${wallets.map(([name, amount, glyph, ink, soft], i) => `<li class="wallet"><button type="button" class="wallet-name" data-preview="${name} transactions"><span class="wallet-icon" style="--wallet-ink:${ink};--wallet-soft:${soft}">${icon(glyph)}</span><span>${name}</span></button><span class="wallet-amount" data-money="wallet-${i}" data-value="${amount}">Rp ${amount}</span>${eye(name, `wallet-${i}`)}</li>`).join('')}</ul>
  <section class="month-summary" aria-label="October overview"><div><h4>October 2026</h4><button type="button" data-preview="Insights" aria-label="Open October insights">${icon('ArrowUpRight')}</button></div><p>Month so far</p><dl><div><dt>Money in</dt><dd>Rp 5.000.000</dd></div><div><dt>Money out</dt><dd>Rp 284.042</dd></div></dl></section>
 </div>
 <nav class="bottom" aria-label="${title} phone navigation">${[['House', 'Home'], ['ArrowLeftRight', 'Transactions'], ['Plus', 'Quick add'], ['Wallet', 'Wallets'], ['Menu', 'More']].map(([glyph, name]) => `<button type="button" ${name === 'Home' ? 'aria-current="page"' : ''} ${name === 'Quick add' ? 'class="centre-add" data-quick-add aria-label="Quick add transaction"' : name === 'More' ? 'data-more aria-haspopup="dialog" aria-expanded="false"' : `data-page="${name}"`}>${name === 'Quick add' ? `<span class="plus-mark">${icon(glyph)}</span>` : `${icon(glyph)}<span>${name}</span>`}</button>`).join('')}</nav>
 <div class="scrim" hidden></div>
 <section class="more" role="dialog" aria-modal="true" aria-label="More pages" hidden><div class="more-heading"><h4>More</h4><button type="button" data-close aria-label="Close More">${icon('X')}</button></div><div class="more-grid">${[['Target', 'Goals'], ['Shapes', 'Categories'], ['ChartNoAxesColumn', 'Insights'], ['PawPrint', 'Pet'], ['Settings2', 'Settings']].map(([glyph, name]) => `<button type="button" data-preview="${name}">${icon(glyph)}${name}</button>`).join('')}</div></section>
 <div class="preview-message" role="status" hidden><span></span><button type="button" aria-label="Dismiss preview message">${icon('X')}</button></div>
 </div>
 </article>`;
const css = fs.readFileSync(path.join(__dirname, 'comparison.css'), 'utf8').replace('KAWUNG_TILE', encodeURIComponent(tile));
const script = fs.readFileSync(path.join(__dirname, 'preview.js'), 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kaya | Current and batik phone comparison</title><style>${fonts}\n${css}</style></head><body data-view="both"><main class="board"><header class="board-header"><h1>Kaya, side by side.</h1><p>The same compact Home. Two takes on its signature.</p></header><div class="toolbar"><div class="control-group" role="group" aria-label="Preview theme"><button type="button" data-theme="light" aria-pressed="true">Light</button><button type="button" data-theme="dark" aria-pressed="false">Dark</button></div><div class="control-group" role="group" aria-label="Compare phone designs"><button type="button" data-view="both" aria-pressed="true">Compare</button><button type="button" data-view="current" aria-pressed="false">Current</button><button type="button" data-view="new" aria-pressed="false">New batik</button></div></div><p id="view-status" class="sr-only" aria-live="polite">Showing both designs</p><div class="concepts">${phone('current','Current','Plus Jakarta Sans · quiet leaf pattern')}${phone('new','New batik','Desktop serif · four-petal kawung')}</div><p class="comparison-note">Illustrative balances. Scroll, hide balances or select a tab to compare both together. Quick add and menu actions are previews. Phone safe-area padding depends on the device.</p></main><script>${script}</script></body></html>`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Built self-contained Current / New batik comparison with shared content and theme controls.');
