require('./_saida');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; const R=(n,ok,x='')=>console.log(ok?'OK  ':'FALHA',n,x);
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const q = await c.newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept());
  await q.goto('http://localhost:8780/index.html');
  await q.evaluate(() => localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 10 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] })));
  await q.reload(); await q.waitForSelector('.hero');
  R('nunca: alerta vermelho na home', (await q.textContent('.alert.neg')).includes('Nunca'));
  await q.click('[data-tab=accounts]'); await q.click('#defs'); R('nunca: estado nas Definições', (await q.textContent('#sheet .alert.neg')).includes('Nunca'));
  await q.click('[data-act=export]'); await q.waitForTimeout(300);
  R('após exportar: verde', (await q.textContent('#sheet .alert.pos')).includes('hoje'));
  await q.click('#sheet [data-act=cancel]'); await q.click('[data-tab=home]'); R('home sem alerta de backup', !(await q.$('.alert.neg, .alert.warn')));
  await q.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 31); localStorage.setItem('poupanca-lastbackup', d.toISOString().slice(0, 10)); });
  await q.reload(); await q.waitForSelector('.hero'); R('31 dias: laranja', (await q.textContent('.alert.warn')).includes('31 dias'));
  await q.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 10); localStorage.setItem('poupanca-lastbackup', d.toISOString().slice(0, 10)); });
  await q.reload(); await q.waitForSelector('.hero'); R('10 dias: sem aviso', !(await q.$('.alert.warn, .alert.neg')));
  // abrir só o menu não atualiza; cancelar a partilha não atualiza
  await q.evaluate(() => { navigator.canShare = () => true; navigator.share = () => Promise.reject(new DOMException('x', 'AbortError')); });
  await q.click('[data-tab=accounts]'); const before = await q.evaluate(() => localStorage.getItem('poupanca-lastbackup'));
  await q.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 10); localStorage.setItem('poupanca-lastbackup', d.toISOString().slice(0, 10)); });
  await q.click('#defs'); await q.click('[data-act=export]'); await q.waitForTimeout(300);
  R('cancelar partilha não atualiza a data', before === await q.evaluate(() => localStorage.getItem('poupanca-lastbackup')));
  console.log('erros', errs); await b.close();
})();
