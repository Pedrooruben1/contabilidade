require('./_saida');
const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const errs = []; const R = (n, ok, x='') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const q = await c.newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept());
  const U = 'http://localhost:8780/index.html';
  const d = (m, day) => { const x = new Date(); x.setMonth(x.getMonth() + m, day); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  await q.goto(U);
  const A = 'a1', S = 'a2';
  const seed = { accounts: [{ id: A, name: 'Banco', kind: 'ordem', opening: 1000 }, { id: S, name: 'Poup', kind: 'poupanca', opening: 0 }, { id: 'a3', name: 'Corretora', kind: 'investimento', opening: 0 }],
    entries: [
      { id: 'e1', date: d(-5, 10), kind: 'income', amount: 1500, accountId: A, category: 'outros', note: 'Sal' },
      { id: 'e2', date: d(-4, 10), kind: 'income', amount: 1500, accountId: A, category: 'outros', note: 'Sal' }, // meses 3,2,1 sem movimentos
      { id: 'e3', date: d(0, 1), kind: 'income', amount: 1000, accountId: A, category: 'outros', note: 'Sal' },
      { id: 'e4', date: d(0, 1), kind: 'expense', amount: 200, accountId: A, category: 'alimentacao', note: '' },
      { id: 'e5', date: d(0, 1), kind: 'transfer', amount: 300, accountId: A, destId: S, category: 'outros', note: '' },
      { id: 'e6', date: d(0, 1), kind: 'transfer', amount: 100, accountId: A, destId: 'a3', category: 'outros', note: '', goalId: 'g1' }],
    budgets: [], goals: [{ id: 'g1', name: 'G', target: 1000, saved: 0, deadline: '', created: d(0,1), base: 0 }],
    recurring: [{ id: 'r1', name: 'Ginásio', kind: 'expense', amount: 30, accountId: A, destId: null, category: 'desporto', freq: 'monthly', next: d(-3, 15), day: 15, active: true }], invest: [] };
  await q.evaluate(s => localStorage.setItem('poupanca-v2', JSON.stringify(s)), seed);
  const read = () => q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')));
  await q.reload(); await q.waitForSelector('.hero');
  let st = await read(); const n1 = st.entries.filter(e => e.recId === 'r1').length;
  R('recorrente em atraso cria movimentos', n1 >= 3, 'n=' + n1);
  for (let i = 0; i < 3; i++) { await q.reload(); await q.waitForSelector('.hero'); }
  st = await read(); R('sem duplicados após reabrir 3x', st.entries.filter(e => e.recId === 'r1').length === n1);
  const keys = st.entries.filter(e => e.recId === 'r1').map(e => e.date); R('datas únicas', new Set(keys).size === keys.length, keys.join(','));
  // taxa de poupança
  const exp = st.entries.filter(e=>e.kind==='expense'&&e.date.startsWith(d(0,1).slice(0,7))).reduce((s,e)=>s+e.amount,0);
  await q.evaluate(() => localStorage.setItem('poupanca-privacy', '0')); await q.reload(); await q.waitForSelector('.hero'); // v24: o modo privado também esconde a taxa
  const txt = await q.textContent('.card:has(b:text("Taxa de poupança"))'); const expected = ((1000 - exp) / 1000 * 100);
  console.log('   taxa mostrada:', txt.slice(0, 60), '| esperada ~', expected.toFixed(1));
  R('transferências/goal não entram na taxa', txt.includes(String(Math.round(expected*10)/10).replace('.', ',')));
  console.log('   disponível:', await q.textContent('.hero b'), '(esperado', 1000+1500+1500+1000-200-300-100-exp+300, ')');
  await q.screenshot({ path: '/tmp/poupanca-testes/tmp-chart.png', fullPage: true });
  // backup roundtrip
  await q.click('[data-tab=accounts]'); await q.click('#defs');
  const [dl] = await Promise.all([q.waitForEvent('download'), q.click('[data-act=export]')]);
  await dl.saveAs('/tmp/poupanca-testes/bk.json');
  const before = await read();
  await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('poupanca-v2')); d.entries = d.entries.slice(0, 2); d.accounts.pop(); localStorage.setItem('poupanca-v2', JSON.stringify(d)); });
  await q.reload(); await q.click('[data-tab=accounts]');
  await q.setInputFiles('#file', '/tmp/poupanca-testes/bk.json'); await q.waitForTimeout(300);
  const after = await read(); R('importação recupera tudo', JSON.stringify(after.entries.map(e=>e.id).sort()) === JSON.stringify(before.entries.map(e=>e.id).sort()) && after.accounts.length === 3);
  // PIN
  await q.click('[data-tab=accounts]'); await q.click('#defs'); await q.click('[data-act=pin-set]');
  const type = async s => { for (const ch of s) await q.click(`[data-pin="${ch}"]`); await q.waitForTimeout(400); };
  await type('123456'); await type('123456'); 
  R('PIN guardado', !!(await q.evaluate(() => localStorage.getItem('poupanca-pin'))));
  await q.reload(); R('pede PIN ao abrir', await q.isVisible('#lock'));
  await type('111111'); R('PIN errado rejeitado', await q.isVisible('#lock') && (await q.textContent('.lockmsg')).includes('errado'));
  await type('123456'); R('PIN certo desbloqueia', !(await q.isVisible('#lock')));
  await q.screenshot({ path: '/tmp/poupanca-testes/tmp-pin.png' });
  await q.reload(); for (let i = 0; i < 5; i++) await type('000000'); await type('123456');
  R('bloqueio após 5 tentativas', await q.isVisible('#lock'), (await q.textContent('.lockmsg')));
  console.log('erros', errs); await b.close();
})();
