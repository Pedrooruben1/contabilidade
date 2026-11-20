require('./_saida');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[]; const R=(n,ok,x='')=>console.log(ok?'OK  ':'FALHA',n,x);
  const mk = async () => { const q = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.accept(); }); return q; };
  const U = 'http://localhost:8780/index.html';
  // --- 3) boas-vindas na primeira utilização
  let q = await mk(); await q.goto(U);
  R('boas-vindas na 1ª abertura', await q.isVisible('#sheet-bg') && (await q.textContent('#sheet')).includes('Bem-vindo'));
  await q.screenshot({ path: '/tmp/poupanca-testes/tmp-welcome.png' });
  await q.click('[data-act=welcome-close]'); R('fecha com Começar', !(await q.isVisible('#sheet-bg')));
  await q.reload(); R('não volta a aparecer', !(await q.isVisible('#sheet-bg')));
  await q.click('#defs'); await q.click('[data-act=welcome]'); R('reabre em Definições → Ajuda', await q.isVisible('#sheet-bg') && (await q.textContent('#sheet')).includes('Bem-vindo')); await q.click('[data-act=welcome-close]');
  // --- 1) objetivo: despesa retira, transferência soma
  q = await mk(); await q.goto(U);
  await q.evaluate(() => { localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 0 }], entries: [], budgets: [], goals: [{ id: 'g', name: 'Bicicleta', target: 1000, saved: 500, deadline: '', created: '2026-10-01', base: 500 }], recurring: [], invest: [] })); });
  await q.reload();
  const saved = async () => { await q.click('[data-tab=goals]'); return (await q.textContent('#view')).match(/Já poupado\s*([\d\s.,]+)\s*€/)?.[1].trim(); };
  await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('[name=amount]', '100'); await q.selectOption('[name=goal]', 'g');
  console.log('   rótulo (despesa):', await q.textContent('#goallabel'));
  await q.click('[data-act=save]'); R('despesa de 100 associada: 500 → 400', (await saved()) === '400,00', await saved());
  await q.click('[data-tab=entries]'); await q.click('#add'); await q.click('[data-kind=transfer]'); await q.fill('[name=amount]', '50'); await q.selectOption('[name=dest]', 'p'); await q.selectOption('[name=goal]', 'g');
  console.log('   rótulo (transferência):', await q.textContent('#goallabel'));
  await q.click('[data-act=save]'); R('transferência de 50 associada: 400 → 450', (await saved()) === '450,00', await saved());
  console.log('   nota no cartão:', (await q.textContent('#view')).match(/Movimentos associados:[^A-Z]*/)?.[0]);
  await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('[name=amount]', '9999'); await q.selectOption('[name=goal]', 'g'); await q.click('[data-act=save]');
  R('nunca fica negativo', (await saved()) === '0,00', await saved());
  // --- 2) registo rápido
  q = await mk(); await q.goto(U);
  await q.evaluate(() => { localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 0 }, { id: 'c', name: 'Carteira', kind: 'carteira', opening: 20 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] })); });
  await q.reload();
  const cases = [
    ['12,50 café', { kind: 'expense', amount: '12,5', category: 'cafes', note: 'Café' }],
    ['gastei 30 no supermercado', { kind: 'expense', amount: '30', category: 'alimentacao', note: 'Supermercado' }],
    ['recebi 1500 salário', { kind: 'income', amount: '1500', note: 'Salário' }],
    ['uber 8.40', { kind: 'expense', amount: '8,4', category: 'transportes', note: 'Uber' }],
    ['paguei 1.250,50 renda', { kind: 'expense', amount: '1250,5', category: 'habitacao', note: 'Renda' }],
    ['ontem 45 ginásio', { kind: 'expense', amount: '45', category: 'ginasio', note: 'Ginásio' }],
    ['netflix 12€', { kind: 'expense', amount: '12', category: 'subscricoes', note: 'Netflix' }],
    ['transferi 100 para Poupança', { kind: 'transfer', amount: '100', dest: 'p', note: '' }],
    ['transferi 50 da Carteira para o Banco', { kind: 'transfer', amount: '50', acc: 'c', dest: 'a', note: '' }],
    ['5 euros pastelaria na Carteira', { kind: 'expense', amount: '5', acc: 'c', category: 'cafes', note: 'Pastelaria' }],
  ];
  for (const [txt, exp] of cases) {
    await q.click('[data-tab=home]'); await q.fill('#qa', txt); await q.press('#qa', 'Enter'); await q.waitForSelector('#sheet [name=amount]');
    const got = await q.evaluate(() => ({ kind: document.querySelector('#kseg .on').dataset.kind, amount: document.querySelector('[name=amount]').value, acc: document.querySelector('[name=account]').value, dest: document.querySelector('[name=dest]').value, category: document.querySelector('[name=category]').value, note: document.querySelector('[name=note]').value, date: document.querySelector('[name=date]').value }));
    const bad = Object.entries(exp).filter(([k, v]) => got[k] !== v); R(`"${txt}"`, !bad.length, bad.length ? 'esperado ' + JSON.stringify(exp) + ' obtido ' + JSON.stringify(got) : `→ ${got.kind} ${got.amount} ${got.category} "${got.note}"`);
    if (txt.startsWith('ontem')) { const y = new Date(); y.setDate(y.getDate() - 1); R('   "ontem" põe a data de ontem', got.date === `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`); }
    await q.click('[data-act=cancel]');
  }
  await q.click('[data-tab=home]'); await q.fill('#qa', 'café'); await q.click('[data-act=qa]'); await q.waitForTimeout(200);
  R('sem valor: avisa e não abre', !(await q.isVisible('#sheet-bg')) && (await q.textContent('#toast')).includes('Não percebi'));
  await q.fill('#qa', '12,50 café'); await q.click('[data-act=qa]'); await q.click('[data-act=save]');
  const st = await q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')).entries); R('guarda ao confirmar', st.length === 1 && st[0].amount === 12.5 && st[0].category === 'cafes');
  console.log('erros', errs); await b.close();
})();
