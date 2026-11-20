require('./_saida');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const mk = async () => { const q = await (await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Lisbon' })).newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept()); return q; };
  const U = 'http://localhost:8780/index.html';
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  const E = () => ({ accounts: [], entries: [], budgets: [], goals: [], recurring: [], invest: [] });
  const seed = async (q, data) => { await q.goto(U); await q.evaluate(d => { localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify(d)); }, data); await q.reload(); await q.waitForSelector('.hero'); };
  const st = q => q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')));
  const A = [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 0 }];
  const inMonth = n => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), Math.min(Math.max(+day(0).slice(8), 1) + n, 28))); };

  // movimentos futuros fora dos totais do mês e dos orçamentos
  let q = await mk(); const fut = day(3), same = new Date().getMonth() === new Date(Date.now() + 3 * 864e5).getMonth();
  await seed(q, { ...E(), accounts: A, budgets: [{ id: 'b', category: 'alimentacao', limit: 100 }], entries: [
    { id: 'i', date: day(0), kind: 'income', amount: 1000, accountId: 'a', category: 'outros', note: '' },
    { id: 'e1', date: day(0), kind: 'expense', amount: 50, accountId: 'a', category: 'alimentacao', note: 'Hoje' },
    { id: 'e2', date: fut, kind: 'expense', amount: 400, accountId: 'a', category: 'alimentacao', note: 'Futuro' }] });
  const txt = await q.textContent('#view');
  R('despesas do mês não incluem o agendado (50, não 450)', txt.includes('50,00') && !txt.includes('450,00'));
  R('taxa de poupança ignora o agendado (95%)', txt.includes('95%'), (txt.match(/Taxa de poupança\s*([\d,%-]+)/) || [])[1]);
  await q.click('[data-tab=budgets]'); R('orçamento ignora o agendado (50 / 100)', (await q.textContent('#view')).includes('50,00') && !(await q.textContent('#view')).includes('450'));

  // percentagem: 99,6 % não aparece como 100 %
  q = await mk(); await seed(q, { ...E(), accounts: A, budgets: [{ id: 'b', category: 'alimentacao', limit: 1000 }], entries: [{ id: 'e', date: day(0), kind: 'expense', amount: 996, accountId: 'a', category: 'alimentacao', note: '' }] });
  await q.click('[data-tab=budgets]'); const t1 = await q.textContent('#view'); R('99,6 % mostra 99 %', t1.includes('99%') && !t1.includes('100%'), (t1.match(/\d+% ·[^A-Z]*\w+/) || [])[0]);
  await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('poupanca-v2')); d.entries[0].amount = 1000; localStorage.setItem('poupanca-v2', JSON.stringify(d)); }); await q.reload(); await q.click('[data-tab=budgets]');
  R('100 % exato mostra 100 % Excedido', (await q.textContent('#view')).includes('100%'));

  // mesmo dia: o último registado aparece em cima
  q = await mk(); await seed(q, { ...E(), accounts: A }); await q.click('[data-tab=entries]');
  for (const [n, v] of [['Primeiro', '1'], ['Segundo', '2'], ['Terceiro', '3']]) { await q.click('#add'); await q.fill('[name=amount]', v); await q.fill('[name=note]', n); await q.click('[data-act=save]'); }
  R('ordem no mesmo dia: Terceiro, Segundo, Primeiro', JSON.stringify((await q.$$eval('#elist .item .grow > div:first-child', els => els.map(e => e.textContent.trim())))) === JSON.stringify(['Terceiro', 'Segundo', 'Primeiro']));

  // recorrente: recuar a data não duplica
  q = await mk(); await seed(q, { ...E(), accounts: A, recurring: [{ id: 'r', name: 'Ginásio', kind: 'expense', amount: 30, accountId: 'a', destId: null, category: 'desporto', freq: 'monthly', next: day(-65), day: new Date(Date.now() - 65 * 864e5).getDate(), active: true }] });
  const n1 = (await st(q)).entries.length; await q.reload(); R('reabrir não duplica', (await st(q)).entries.length === n1, 'n=' + n1);
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=rec]'); await q.click('[data-edit-rec=r]'); await q.fill('[name=date]', day(-65)); await q.click('[data-act=save]');
  const ds = (await st(q)).entries.map(e => e.date); R('editar a data para trás não duplica', new Set(ds).size === ds.length && ds.length === n1, ds.join(','));

  // objetivo ignora movimentos futuros
  q = await mk(); await seed(q, { ...E(), accounts: A, goals: [{ id: 'g', name: 'G', target: 1000, saved: 100, deadline: '', created: day(-5), base: 100 }], entries: [{ id: 'e', date: day(10), kind: 'transfer', amount: 400, accountId: 'a', destId: 'p', category: 'outros', note: '', goalId: 'g' }] });
  await q.click('[data-tab=goals]'); R('objetivo ignora transferência agendada (100, não 500)', (await q.textContent('#view')).includes('100,00') && !(await q.textContent('#view')).includes('500,00'));

  // previsão com transferência agendada para a Poupança
  q = await mk(); const eom = (() => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)); })();
  await seed(q, { ...E(), accounts: A, entries: eom > day(0) ? [{ id: 't', date: eom, kind: 'transfer', amount: 300, accountId: 'a', destId: 'p', category: 'outros', note: '' }] : [] });
  if (eom > day(0)) { const t = await q.textContent('#view'); R('previsão desconta a transferência agendada para a Poupança (700)', t.match(/Previsão do saldo no fim do mês\s*([\d\s.,]+)\s*€/)?.[1].replace(/\s/g, '') === '700,00', t.match(/Previsão do saldo no fim do mês\s*([\d\s.,]+)/)?.[1]); } else console.log('   (hoje é o último dia do mês; teste da previsão saltado)');

  // pesquisa com ponto dos milhares + plural no registo rápido + orçamento duplicado
  q = await mk(); await seed(q, { ...E(), accounts: A, entries: [{ id: 'e', date: day(0), kind: 'expense', amount: 1600, accountId: 'a', category: 'habitacao', note: 'Renda' }], budgets: [{ id: 'b1', category: 'lazer', limit: 50 }] });
  await q.click('[data-tab=entries]'); await q.fill('#q', '1.600'); R('pesquisa "1.600" acha 1600', (await q.$$('#elist .item')).length === 1);
  await q.click('[data-tab=home]'); await q.fill('#qa', '3 cafés 6'); await q.press('#qa', 'Enter'); await q.waitForSelector('[name=category]'); R('«cafés» (plural) → Cafés e pequenos-almoços', (await q.inputValue('[name=category]')) === 'cafes'); await q.click('[data-act=cancel]');
  await q.click('[data-tab=budgets]'); await q.click('#add'); await q.selectOption('[name=category]', 'lazer'); await q.fill('[name=amount]', '80'); await q.click('[data-act=save]');
  R('novo orçamento numa categoria que já existe avisa', (await q.textContent('#err')).includes('Já existe') && (await st(q)).budgets.length === 1 && (await st(q)).budgets[0].limit === 50);
  console.log('erros JS:', errs); await b.close();
})();
