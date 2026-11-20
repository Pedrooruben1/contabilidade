require('./_saida');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const q = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await q.goto('http://localhost:8780/index.html'); await q.evaluate(() => { localStorage.removeItem('poupanca-privacy'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 1 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] })); }); await q.reload();
  const bx = await (await q.$('#eye')).boundingBox(); R('olho >= 44 px', bx.width >= 44 && bx.height >= 44, Math.round(bx.width) + 'x' + Math.round(bx.height));
  const add = await q.evaluate(() => 0); await q.click('[data-tab=entries]'); const a = await (await q.$('#add')).boundingBox(); R('+ >= 44 px', a.width >= 44 && a.height >= 44, Math.round(a.width) + 'x' + Math.round(a.height));
  R('botões normais com touch-action: manipulation', await q.evaluate(() => getComputedStyle(document.querySelector('nav button')).touchAction === 'manipulation' && getComputedStyle(document.documentElement).touchAction === 'manipulation'));
  await b.close();
})();
