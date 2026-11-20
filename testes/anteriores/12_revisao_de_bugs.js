require('./_saida');
const { chromium } = require('playwright'); const fs = require('fs');
const S = '/tmp/poupanca-testes';
(async () => {
  const b = await chromium.launch(); const errs = []; const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const mk = async (tz) => { const q = await (await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: tz || 'Europe/Lisbon' })).newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept()); return q; };
  const U = 'http://localhost:8780/index.html';
  const seed = async (q, data) => { await q.goto(U); await q.evaluate(d => { localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify(d)); }, data); await q.reload(); await q.waitForSelector('.hero'); };
  const E = () => ({ accounts: [], entries: [], budgets: [], goals: [], recurring: [], invest: [] });
  const st = q => q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

  // 1 + minor: parseMoney
  let q = await mk(); await seed(q, E()); await q.click('[data-tab=accounts]');
  const tryAcc = async v => { await q.click('#add'); await q.fill('[name=name]', 'X' + v.length); await q.fill('[name=amount]', v); await q.click('[data-act=save]'); const bad = await q.evaluate(() => document.getElementById('err')?.textContent || ''); if (bad) await q.click('[data-act=cancel]'); return bad ? null : (await st(q)).accounts.at(-1).opening; };
  R('"1.600" = 1600', (await tryAcc('1.600')) === 1600);
  R('"1.600.000" aceite', (await tryAcc('1.600.000')) === 1600000);
  R('"12,50" = 12.5', (await tryAcc('12,50')) === 12.5);
  R('"1.250,50" = 1250.5', (await tryAcc('1.250,50')) === 1250.5);
  R('"0x10" rejeitado', (await tryAcc('0x10')) === null);
  R('"1e3" rejeitado', (await tryAcc('1e3')) === null);
  R('"   " rejeitado', (await tryAcc('   ')) === null);
  R('saldo negativo "-80" aceite (cartão/descoberto)', (await tryAcc('-80')) === -80);
  await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('[name=amount]', '-5'); await q.click('[data-act=save]');
  R('movimento negativo rejeitado', (await q.textContent('#err')).length > 0);

  // 2: reativar recorrente pausada
  q = await mk(); await seed(q, { ...E(), accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }], recurring: [{ id: 'r', name: 'Ginásio', kind: 'expense', amount: 30, accountId: 'a', destId: null, category: 'desporto', freq: 'monthly', next: day(-100), day: new Date(Date.now() - 100 * 864e5).getDate(), active: false }] });
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=rec]'); await q.click('[data-edit-rec=r]'); await q.selectOption('[name=active]', '1'); await q.click('[data-act=save]');
  let d = await st(q); R('reativar não cria cobranças em atraso', d.entries.length === 0, 'movimentos=' + d.entries.length); R('próxima data >= hoje', d.recurring[0].next >= day(0), d.recurring[0].next);

  // 3 + 4 + 7: importação com tipo desconhecido, ids maliciosos e valores em texto
  const evil = { accounts: [{ id: '"><img src=x onerror=window.__pwned=1>', name: '<b>Cartão</b>', kind: 'Cartão de crédito', opening: '100' }, { id: 'b', name: 'Poup', kind: 'Investimento', openingBalance: 0 }],
    entries: [{ id: 'e1', date: '"onclick=a', kind: 'Despesa', amount: '100', accountId: '"><img src=x onerror=window.__pwned=1>', category: 'Alimentação', note: '"><script>window.__pwned=1</script>' }, { id: 'e2', date: '2026-10-01', kind: 'weird', amount: '50', accountId: 'b' }],
    budgets: [{ id: 'x"y', category: 'Zzz', limit: '40' }], goals: [{ id: 'g"', name: 'G', target: '100', saved: '10', deadline: '"onfocus=1' }], recurring: [{ id: 'r"', name: 'R', kind: 'q', amount: '5', accountId: 'b', freq: 'zzz', next: 'lixo' }], invest: [{ id: 'i"', name: 'I', type: 'qq', invested: '1', current: '2' }] };
  fs.writeFileSync(S + '/evil.json', JSON.stringify(evil));
  q = await mk(); await seed(q, E()); await q.click('[data-tab=accounts]'); await q.setInputFiles('#file', S + '/evil.json'); await q.waitForTimeout(400);
  d = await st(q); R('importa tipo de conta desconhecido sem partir a app', d.accounts[0].kind === 'ordem' && d.accounts[1].kind === 'investimento' && await q.isVisible('#view .list, #view .card'));
  R('ids ficam só com caracteres seguros', d.accounts.every(a => /^[A-Za-z0-9_-]+$/.test(a.id)) && d.entries.every(e => /^[A-Za-z0-9_-]+$/.test(e.id) && /^\d{4}-\d{2}-\d{2}$/.test(e.date)));
  R('referências mantêm-se (movimento liga à conta)', d.entries[0].accountId === d.accounts[0].id);
  for (const t of ['home', 'entries', 'budgets', 'goals', 'accounts']) { await q.click(`[data-tab=${t}]`); } await q.click('[data-seg=rec]'); await q.click('[data-seg=inv]');
  await q.click('[data-tab=entries]'); await q.click('[data-edit-entry]'); await q.click('[data-act=cancel]'); await q.click('[data-tab=goals]'); await q.click('[data-edit-goal]'); await q.click('[data-act=cancel]');
  R('nenhum código injetado correu', !(await q.evaluate(() => window.__pwned)));
  await q.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<img src=x onerror="window.__csp=1">')); await q.waitForTimeout(300);
  R('CSP bloqueia scripts injetados', !(await q.evaluate(() => window.__csp)));
  R('valores em texto convertidos (100 + 50, não "10050")', d.entries[0].amount === 100 && d.entries[1].amount === 50 && d.accounts[0].opening === 100 && typeof d.accounts[0].opening === 'number');
  R('tipo de movimento/recorrente/investimento inválidos corrigidos', d.entries[1].kind === 'expense' && d.recurring[0].kind === 'expense' && d.recurring[0].freq === 'monthly' && d.invest[0].type === 'outro');
  // importação que rebenta não deixa a app em branco
  fs.writeFileSync(S + '/lixo.json', '{"accounts": 5}'); const before = await st(q); await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.setInputFiles('#file', S + '/lixo.json'); await q.waitForTimeout(300);
  R('ficheiro estranho não apaga os dados nem deixa em branco', JSON.stringify((await st(q)).accounts.map(a => a.id)) === JSON.stringify(before.accounts.map(a => a.id)) && await q.isVisible('#view .list, #view .card'));

  // 8: datas da app Swift no fuso horário local (Lisboa, verão: 2026-07-01 23:30 UTC = 02/07 00:30)
  const unix = Date.UTC(2026, 6, 1, 23, 30) / 1000; fs.writeFileSync(S + '/swift.json', JSON.stringify({ accounts: [{ id: 'A', name: 'B', kind: 'Banco', openingBalance: 0 }], entries: [{ id: 'E', date: unix - 978307200, kind: 'Despesa', amount: 5, accountID: 'A', category: 'Casa', note: '' }] }));
  q = await mk('Europe/Lisbon'); await seed(q, E()); await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.setInputFiles('#file', S + '/swift.json'); await q.waitForTimeout(300);
  d = await st(q); R('data Swift no dia local (02/07, não 01/07)', d.entries[0].date === '2026-07-02', d.entries[0].date); R('"Casa" → Habitação', d.entries[0].category === 'habitacao');

  // 5 + 6: prazo no dia, movimentos agendados
  q = await mk(); await seed(q, { ...E(), accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 300 }], goals: [{ id: 'g', name: 'G', target: 500, saved: 100, deadline: day(0), created: day(-30), base: 100 }],
    entries: [{ id: 'f', date: day(60), kind: 'expense', amount: 500, accountId: 'a', destId: null, category: 'outros', note: 'Futuro' }] });
  console.log('   disponível:', (await q.textContent('.hero b')).trim());
  R('despesa daqui a 60 dias não desconta já', (await q.textContent('.hero b')).includes('1000,00'));
  R('"Disponível para gastar" não inclui a Poupança', !(await q.textContent('.hero b')).includes('1300'));
  await q.click('[data-tab=goals]'); R('no dia do prazo não diz "Prazo ultrapassado"', !(await q.textContent('#view')).includes('Prazo ultrapassado'));
  await q.click('[data-tab=home]'); R('património mostra Poupança à parte', (await q.textContent('#view')).includes('Poupança') && (await q.textContent('#view')).includes('300,00'));
  R('comparação "mesmo período"', !(await q.textContent('#view')).includes('vs. mês anterior'));

  // 9: pesquisa
  q = await mk(); await seed(q, { ...E(), accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }], entries: [{ id: 'e', date: day(0), kind: 'expense', amount: 12.5, accountId: 'a', category: 'restaurantes', note: 'Café' }, { id: 'f', date: day(0), kind: 'expense', amount: 99, accountId: 'a', category: 'outros', note: 'Outro' }] });
  await q.click('[data-tab=entries]'); const n = async t => { await q.fill('#q', t); return (await q.$$('#elist .item')).length; };
  R('pesquisa "12,50"', (await n('12,50')) === 1); R('pesquisa "12.5"', (await n('12.5')) === 1); R('pesquisa "cafe" acha "Café"', (await n('cafe')) === 1); R('pesquisa "CAFÉ"', (await n('CAFÉ')) === 1);

  // 10: formulário fecha ao sair (modo privado ligado)
  q = await mk(); await seed(q, { ...E(), accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }] }); await q.evaluate(() => localStorage.removeItem('poupanca-privacy')); await q.reload();
  await q.click('[data-tab=accounts]'); await q.click('[data-edit-account=a]'); R('formulário aberto', await q.isVisible('#sheet-bg'));
  await q.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await q.waitForTimeout(100);
  R('formulário fecha ao sair da app (modo privado)', !(await q.isVisible('#sheet-bg')));

  // 11: registo rápido
  q = await mk(); await seed(q, { ...E(), accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'b', name: 'Bar', kind: 'carteira', opening: 5 }] });
  const quick = async t => { await q.click('[data-tab=home]'); await q.fill('#qa', t); await q.press('#qa', 'Enter'); await q.waitForSelector('#sheet [name=amount]'); const g = await q.evaluate(() => ({ kind: document.querySelector('#kseg .on').dataset.kind, amount: document.querySelector('[name=amount]').value, acc: document.querySelector('[name=account]').value, note: document.querySelector('[name=note]').value, category: document.querySelector('[name=category]').value })); await q.click('[data-act=cancel]'); return g; };
  let g = await quick('gastei 15 no barbeiro'); R('«barbeiro» não vai para a conta "Bar"', g.acc === 'a', JSON.stringify(g));
  g = await quick('gastei 15 no bar'); R('«no bar» vai para a conta "Bar"', g.acc === 'b');
  g = await quick('bilhete de entrada cinema 8'); R('«entrada» já não é receita', g.kind === 'expense' && g.category === 'lazer', JSON.stringify(g));
  g = await quick('2 cafés 3,50'); R('«2 cafés 3,50» = 3,50', g.amount === '3,5', g.amount);
  g = await quick('2 cafés 5 euros'); R('«2 cafés 5 euros» = 5', g.amount === '5', g.amount);
  g = await quick('comprei 3 camisolas 60'); R('«3 camisolas 60» = 60', g.amount === '60', g.amount);
  g = await quick('12,50 café'); R('«12,50 café» continua a funcionar', g.amount === '12,5' && g.category === 'cafes');

  // 12: orçamento não apaga outro
  q = await mk(); await seed(q, { ...E(), budgets: [{ id: 'b1', category: 'alimentacao', limit: 100 }, { id: 'b2', category: 'lazer', limit: 50 }] });
  await q.click('[data-tab=budgets]'); await q.click('[data-edit-budget=b2]'); await q.selectOption('[name=category]', 'alimentacao'); await q.click('[data-act=save]');
  R('mudar categoria para uma já existente avisa e não apaga', (await q.textContent('#err')).includes('Já existe') && (await st(q)).budgets.length === 2);
  console.log('erros JS:', errs); await b.close();
})();
