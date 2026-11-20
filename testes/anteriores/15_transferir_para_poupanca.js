require('./_saida');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[]; const R=(n,ok,x='')=>console.log(ok?'OK  ':'FALHA',n,x);
  const q = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto('http://localhost:8780/index.html');
  await q.evaluate(() => { localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 0 }, { id: 'c', name: 'Carteira', kind: 'carteira', opening: 20 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] })); });
  await q.reload();
  const cases = [
    ['transferir 100 para poupança', { kind: 'transfer', amount: '100', dest: 'p', acc: 'a', note: '' }],
    ['quero transferir 100 para a poupança', { kind: 'transfer', amount: '100', dest: 'p' }],
    ['Transferir para poupança 250', { kind: 'transfer', amount: '250', dest: 'p' }],
    ['transferência 80 para poupança', { kind: 'transfer', amount: '80', dest: 'p' }],
    ['passar 50 para a poupança', { kind: 'transfer', amount: '50', dest: 'p' }],
    ['guardei 30 na poupança', { kind: 'transfer', amount: '30' }],
    ['100 para poupança', { kind: 'transfer', amount: '100', dest: 'p' }],
    ['transferi 50 da Carteira para o Banco', { kind: 'transfer', acc: 'c', dest: 'a' }],
    ['receber 100 salário', { kind: 'income', amount: '100' }],
    ['recebimento 40 reembolso', { kind: 'income', amount: '40' }],
    ['12,50 café', { kind: 'expense', category: 'cafes' }],
    ['5 euros pastelaria na Carteira', { kind: 'expense', acc: 'c' }],
    ['gastei 30 no supermercado', { kind: 'expense', category: 'alimentacao' }],
  ];
  for (const [txt, exp] of cases) {
    await q.click('[data-tab=home]'); await q.fill('#qa', txt); await q.press('#qa', 'Enter'); await q.waitForSelector('#sheet [name=amount]');
    const got = await q.evaluate(() => ({ kind: document.querySelector('#kseg .on').dataset.kind, amount: document.querySelector('[name=amount]').value, acc: document.querySelector('[name=account]').value, dest: document.querySelector('[name=dest]').value, category: document.querySelector('[name=category]').value, note: document.querySelector('[name=note]').value }));
    const bad = Object.entries(exp).filter(([k, v]) => got[k] !== v); R(`"${txt}"`, !bad.length, bad.length ? 'esperado ' + JSON.stringify(exp) + ' obtido ' + JSON.stringify(got) : `→ ${got.kind} ${got.amount} dest=${got.dest || '-'}`);
    await q.click('[data-act=cancel]');
  }
  // guardar uma transferência e confirmar que não é despesa nem muda a taxa
  await q.click('[data-tab=home]'); await q.fill('#qa', 'transferir 100 para poupança'); await q.click('[data-act=qa]'); await q.click('[data-act=save]');
  const st = await q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')).entries[0]);
  R('guardada como transferência Banco → Poupança', st.kind === 'transfer' && st.accountId === 'a' && st.destId === 'p' && st.amount === 100, JSON.stringify(st));
  console.log('despesas do mês na app:', (await q.textContent('.mgrid > div:nth-child(2) b')) || '', '| erros', errs); await b.close();
})();
