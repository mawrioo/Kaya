const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../record-actions/index.html'), 'utf8');
let phone = source.match(/<article class="concept[^"]*">[\s\S]*?<\/article>/)?.[0];
if (!phone) throw new Error('Expected existing card concept');
phone = phone
  .replace(/<button class="record-card"[\s\S]*?<\/button>/, '')
  .replace(/<div class="intro no-logo-intro">[\s\S]*?<\/div><\/div>/, '<div class="brand-row"><span class="brand">Kaya</span><span class="date">Thu, 29 Oct 2026</span></div><div class="intro kaya-intro"><div class="welcome"><h3>Good morning, Mario</h3></div></div>');
const variants = ['Light', 'Dark'].map(theme => phone
  .replace(/<article class="concept[^"]*">/, `<article class="concept ${theme === 'Dark' ? 'dark' : ''}">`)
  .replace(/<div class="caption">[\s\S]*?<\/p><\/div><\/div>/, `<div class="caption"><h2>${theme}</h2></div>`)).join('');
const css = `
.board{max-width:940px}.board-header{margin-bottom:22px}.board-header h1{font-size:30px}.caption{height:24px;margin-bottom:12px}.caption h2{font-size:14px}.brand-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0 0}.refined .brand-row .brand{font-size:23px;font-weight:600;letter-spacing:.025em;line-height:1.1}.brand-row .date{font-size:10px;color:var(--muted);margin-left:auto}.kaya-intro{padding:19px 0 19px}.kaya-intro .welcome h3{font-size:23px}.action-concept .next-section{margin-top:21px}.footnote{margin-top:20px}@media(max-width:600px){.board-header h1{font-size:27px}}
`;
const html = source
  .replace(/<div class="concepts">[\s\S]*?<\/article><\/div><p class="footnote">/, `<div class="concepts">${variants}</div><p class="footnote">`)
  .replace(/<div class="theme"[\s\S]*?<\/div>/, '')
  .replace('A more natural way to record.', 'Kaya, with a lighter header.')
  .replace('Two action placements, inspired by your banking references.', 'A small wordmark. Signature balance. Separate wallets.')
  .replace('Try Record, More and the eye controls.', 'Try More and the eye controls.')
  .replace('Kaya — Record action concepts', 'Kaya — compact wordmark mockup')
  .replace('</style>', css + '</style>');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Built light/dark Kaya header mockup, without Record actions.');
