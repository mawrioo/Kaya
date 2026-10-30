/* Derive the chosen open-header concept; no app server or database. */
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../compact-refinement/index.html'), 'utf8');
const first = source.match(/<article class="concept">[\s\S]*?<\/article>/)?.[0];
if (!first) throw new Error('Expected prior Compact concept');
const welcome = '<div class="welcome"><h3>Good morning, Mario</h3><span class="date">Thu, 29 Oct 2026</span></div>';
const add = first.match(/<button class="add"[\s\S]*?<\/button>/)?.[0];
if (!add) throw new Error('Expected existing Add control');
const phone = first
  .replace(/<header>[\s\S]*?<\/header><div class="intro">[\s\S]*?<\/button><\/div>/, `<div class="intro no-logo-intro">${welcome}${add}</div>`)
  .replace(/<p class="concept-note">[\s\S]*?<\/p>/, '');
const variants = ['Light', 'Dark'].map(theme => phone
  .replace('<article class="concept">', `<article class="concept ${theme === 'Dark' ? 'dark' : ''}">`)
  .replace(/<div class="caption">[\s\S]*?<\/p><\/div><\/div>/, `<div class="caption"><h2>${theme}</h2></div>`)).join('');
const extraCSS = `
.board{max-width:940px}.concepts{grid-template-columns:repeat(2,390px);gap:28px}.caption{height:24px;margin-bottom:12px}.caption h2{font-size:14px}.board-header{margin-bottom:22px}.board-header h1{font-size:30px}.no-logo-intro{padding:24px 0 22px;align-items:center}.no-logo-intro .welcome h3{font-size:23px}.no-logo-intro .date{display:block;margin:6px 0 0;color:var(--muted);font-size:11px}.refined .next-section{margin-top:24px}.footnote{margin-top:20px}@media(max-width:1300px){.board{padding:28px 40px}}@media(max-width:600px){.board{padding:20px 12px}.board-header h1{font-size:27px}}
`;
const html = source
  .replace(/<div class="concepts">[\s\S]*?<\/article><\/div><p class="footnote">/, `<div class="concepts">${variants}</div><p class="footnote">`)
  .replace(/<div class="theme"[\s\S]*?<\/div>/, '')
  .replace('Compact Kaya, with your changes.', 'A simpler start. No logo.')
  .replace('Signature balance. Separate wallets. Smaller Kaya. Three header choices.', 'Greeting and date. One clear Add action. Your money, straight ahead.')
  .replace('Kaya — Compact refinement', 'Kaya — logo-free phone concept')
  .replace('</style>', extraCSS + '</style>');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Built self-contained light/dark logo-free preview.');
