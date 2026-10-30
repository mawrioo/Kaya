const phones = [...document.querySelectorAll('.phone')];

function closeMore(phone, restore = true) {
 phone.querySelector('.more').hidden = true;
 phone.querySelector('.scrim').hidden = true;
 phone.querySelector('.phone-scroll').inert = false;
 phone.querySelector('.bottom').inert = false;
 phone.querySelector('[data-more]').setAttribute('aria-expanded', 'false');
 if (restore) phone.querySelector('[data-more]').focus({ preventScroll: true });
}
function message(phone, text) {
 const box = phone.querySelector('.preview-message');
 box.querySelector('span').textContent = text;
 box.hidden = false;
}
document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
 document.body.classList.toggle('dark', button.dataset.theme === 'dark');
 document.querySelectorAll('[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
document.querySelectorAll('button[data-view]').forEach(button => button.addEventListener('click', () => {
 phones.forEach(phone => { closeMore(phone, false); phone.querySelector('.preview-message').hidden = true; });
 document.body.dataset.view = button.dataset.view;
 document.querySelectorAll('button[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
 document.getElementById('view-status').textContent = button.dataset.view === 'both' ? 'Showing both designs' : button.dataset.view === 'current' ? 'Showing current design' : 'Showing new batik design';
}));
phones.forEach(phone => {
 phone.querySelectorAll('[data-hide]').forEach(button => button.addEventListener('click', () => {
  const hidden = button.getAttribute('aria-pressed') !== 'true';
  const key = button.dataset.hide;
  phones.forEach(other => {
   const amount = other.querySelector(`[data-money="${key}"]`);
   const toggle = other.querySelector(`[data-hide="${key}"]`);
   amount.innerHTML = hidden ? '••••••••' : key === 'total' ? `<span class="currency">Rp</span> <strong>${amount.dataset.value}</strong>` : `Rp ${amount.dataset.value}`;
   toggle.setAttribute('aria-pressed', String(hidden));
   toggle.setAttribute('aria-label', toggle.getAttribute('aria-label').replace(hidden ? 'Hide' : 'Show', hidden ? 'Show' : 'Hide'));
  });
 }));
 phone.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
  phones.forEach(other => {
   other.querySelectorAll('[aria-current]').forEach(b => b.removeAttribute('aria-current'));
   other.querySelector(`[data-page="${button.dataset.page}"]`).setAttribute('aria-current', 'page');
  });
  message(phone, `${button.dataset.page} selected. This comparison previews Home only.`);
 }));
 phone.querySelector('[data-quick-add]').addEventListener('click', () => message(phone, 'Quick add: describe your transaction, review, then save.'));
 phone.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => message(phone, `${button.dataset.preview} would open in Kaya.`)));
 phone.querySelector('.preview-message button').addEventListener('click', () => { phone.querySelector('.preview-message').hidden = true; });
 phone.querySelector('[data-more]').addEventListener('click', () => {
  phone.querySelector('.preview-message').hidden = true;
  phone.querySelector('.more').hidden = false;
  phone.querySelector('.scrim').hidden = false;
  phone.querySelector('[data-more]').setAttribute('aria-expanded', 'true');
  phone.querySelector('.phone-scroll').inert = true;
  phone.querySelector('.bottom').inert = true;
  phone.querySelector('[data-close]').focus({ preventScroll: true });
 });
 phone.querySelector('[data-close]').addEventListener('click', () => closeMore(phone));
 phone.querySelector('.scrim').addEventListener('click', () => closeMore(phone));
});

// Keep the same wallet or section aligned without changing the scroll position on theme switches.
let pendingScroll;
phones.forEach(phone => phone.querySelector('.phone-scroll').addEventListener('scroll', event => {
 if (document.body.dataset.view !== 'both') return;
 const top = event.target.scrollTop;
 cancelAnimationFrame(pendingScroll);
 pendingScroll = requestAnimationFrame(() => phones.forEach(other => {
  const scroller = other.querySelector('.phone-scroll');
  if (Math.abs(scroller.scrollTop - top) > 1) scroller.scrollTop = top;
 }));
}, { passive: true }));
document.addEventListener('keydown', event => {
 const panel = [...document.querySelectorAll('.more')].find(el => !el.hidden);
 if (!panel) return;
 if (event.key === 'Escape') { event.preventDefault(); closeMore(panel.closest('.phone')); }
 if (event.key === 'Tab') {
  const items = [...panel.querySelectorAll('button')];
  if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
 }
});
