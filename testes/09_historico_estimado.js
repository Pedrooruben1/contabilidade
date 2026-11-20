// Saldos históricos estimados: contas sem movimentos, só com movimentos futuros, primeiro movimento ao receber uma transferência,
// e o que acontece quando o utilizador altera o saldo inicial de uma conta.
const { chromium, R, fim, novo, semear, igual, vazio } = require('./comum');
(async () => {
  const b = await chromium.launch(); const todos = [];
  const mk = async (db, hoje = '2026-11-06T12:00:00', opt = {}) => { const q = await novo(b, opt); await q.ctx.clock.setFixedTime(new Date(hoje)); await semear(q, db); todos.push(q); return q; };
  const p2 = n => String(n).padStart(2, '0');
  const E = []; let n = 0; const add = (date, kind, amount, accountId, destId = null, category = 'outros') => E.push({ id: 'e' + n++, date, kind, amount, accountId, destId, category, note: '', goalId: null, recId: null });
  for (let m = 1; m <= 10; m++) { add(`2026-${p2(m)}-10`, 'expense', 300 + m, 'A', null, 'alimentacao'); add(`2026-${p2(m)}-12`, 'income', 1500, 'A'); add(`2026-${p2(m)}-15`, 'transfer', 100, 'A', 'B'); }
  // A: primeiro movimento a 10/01/2026. B (poupança): o primeiro movimento é RECEBER uma transferência, a 15/01/2026. C (dinheiro): nunca teve movimentos.
  const db = () => JSON.parse(JSON.stringify({ accounts: [{ id: 'A', name: 'Conta ordenado', kind: 'ordem', opening: 1000 }, { id: 'B', name: 'Poupança casa', kind: 'poupanca', opening: 500 }, { id: 'C', name: 'Carteira vazia', kind: 'carteira', opening: 40 }], entries: E, budgets: [], goals: [], recurring: [], invest: [] }));
  const modelo = (q, accs, mode, anchor, extra = {}) => q.evaluate(([a, m, an, ex]) => { const r = anCompute({ db, today: today(), mode: m, anchor: an, accs: a ? new Set(a) : null, cats: null, win: 7, ...ex }); return { series: r.series.map(p => [p.d, p.bal, p.est]), estInit: r.estInit, estFinal: r.estFinal, init: r.init, final: r.final, estNames: r.estNames, inc: r.inc, expAll: r.expAll, trIn: r.trIn, trOut: r.trOut, byCat: r.byCat }; }, [accs, mode, anchor, extra]);
  const abrir = async (q, mode = 'month') => { await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-nav'); await q.click(`[data-an="mode:${mode}"]`); };
  const escolher = async (q, ids) => { await q.click('[data-an=accs]'); for (const id of ids) await q.check(`[data-an-acc="${id}"]`); await q.click('[data-act=cancel]'); };
  const banner = q => q.$$eval('.alert.info', x => x.map(e => e.textContent).join(' | '));

  // ---------- 1) conta sem movimentos nenhuns ----------
  let q = await mk(db());
  let m = await modelo(q, ['C'], 'month', '2026-10-15');
  R('conta sem movimentos: o saldo é sempre o saldo inicial (40,00 €), sem inventar movimentos', m.series.every(p => p[1] === 4000) && m.final === 4000 && m.init === 4000);
  R('conta sem movimentos: TODOS os dias anteriores a hoje são estimados', m.series.every(p => p[2] === true) && m.estInit === true);
  m = await modelo(q, ['C'], 'month', '2026-11-06');
  R('conta sem movimentos: o dia de hoje é o saldo real (não estimado) e os dias anteriores sim', m.series.slice(0, -1).every(p => p[2]) && m.series[m.series.length - 1][2] === false && m.estFinal === false && m.estInit === true);
  await abrir(q, 'month'); await escolher(q, ['C']); await q.click('[data-an=prev]');
  R('conta sem movimentos (outubro): aviso «Saldos estimados» com o nome da conta', (await banner(q)).includes('Saldos estimados') && (await banner(q)).includes('Carteira vazia'));
  R('conta sem movimentos: o saldo inicial e o final do mês dizem «estimado»', (await q.$$eval('.an-card', cs => cs.filter(c => /Saldo (inicial|final)/.test(c.textContent) && c.textContent.includes('estimado')).length)) === 2);
  R('conta sem movimentos: o gráfico tem zona tracejada e a legenda «estimado»', !!(await q.$('#an-bal rect[fill="url(#anh)"]')) && await q.isVisible('.an-leg .dash'));
  await q.evaluate(() => { AN.sel = { start: '2026-10-10', end: '2026-10-10' }; render(true); }); R('conta sem movimentos: o tooltip de um dia antigo diz «(estimado)»', (await q.textContent('#an-tip')).includes('estimado'));
  await q.click('[data-an=today]'); R('conta sem movimentos, mês atual: «Saldo final» (hoje) NÃO diz estimado', !(await q.$$eval('.an-card', cs => cs.find(c => c.textContent.includes('Saldo final')).textContent.includes('estimado'))));
  // todas as contas juntas: uma conta vazia impede de confirmar o histórico
  m = await modelo(q, null, 'month', '2026-10-15'); R('todas as contas, uma delas sem movimentos: o histórico antes de hoje continua estimado', m.series.every(p => p[2]) && m.estNames.length === 1 && m.estNames[0] === 'Carteira vazia', JSON.stringify(m.estNames));
  m = await modelo(q, ['A', 'B'], 'month', '2026-10-15'); R('sem a conta vazia (A + B): outubro tem histórico confirmado, sem estimativa', m.series.every(p => !p[2]) && m.estNames.length === 0 && !m.estInit);

  // ---------- 2) primeiro movimento de cada conta: a fronteira entre estimado e calculado ----------
  m = await modelo(q, ['A'], 'month', '2026-01-20'); const f = d => m.series.find(p => p[0] === d);
  R('conta A (1.º movimento a 10/01): 9/01 estimado, 10/01 já calculado', f('2026-01-09')[2] === true && f('2026-01-10')[2] === false);
  R('conta A: antes do 1.º movimento o saldo é o saldo inicial (1000,00 €)', f('2026-01-01')[1] === 100000 && f('2026-01-09')[1] === 100000);
  m = await modelo(q, ['B'], 'month', '2026-01-20'); const g = d => m.series.find(p => p[0] === d);
  R('conta B (o 1.º movimento é RECEBER uma transferência a 15/01): 14/01 estimado, 15/01 calculado', g('2026-01-14')[2] === true && g('2026-01-15')[2] === false && g('2026-01-15')[1] === 60000, JSON.stringify([g('2026-01-14'), g('2026-01-15')]));
  m = await modelo(q, ['A', 'B'], 'month', '2026-01-20'); const h = d => m.series.find(p => p[0] === d);
  R('A + B juntas: estimado até ao 1.º movimento da conta MAIS TARDIA (14/01), confirmado a partir de 15/01', h('2026-01-14')[2] === true && h('2026-01-15')[2] === false && h('2026-01-10')[2] === true);
  await abrir(q, 'month'); await q.evaluate(() => { AN.accs = null; AN.anchor = today(); render(true); }); await escolher(q, ['A', 'B']); for (let i = 0; i < 10; i++) await q.click('[data-an=prev]');
  R('janeiro (UI): aviso de estimativa visível, com as contas em causa', (await q.textContent('#view')).includes('Saldos estimados') && (await banner(q)).includes('Conta ordenado'));
  await q.click('[data-an=next]'); await q.click('[data-an=next]'); R('março (UI), com ambas as contas já com movimentos: sem aviso, sem zona tracejada e sem «estimado» nos cartões', !(await q.textContent('#view')).includes('Saldos estimados') && !(await q.$('#an-bal rect[fill="url(#anh)"]')) && (await q.$$('.an-card .warnt')).length === 0);
  await q.evaluate(() => { AN.accs = null; AN.anchor = today(); render(true); }); // repõe

  // ---------- 3) conta só com movimentos FUTUROS ----------
  const dF = () => ({ ...vazio(), accounts: [{ id: 'D', name: 'Conta futura', kind: 'ordem', opening: 200 }, { id: 'A', name: 'Outra', kind: 'ordem', opening: 10 }], entries: [{ id: 'f1', date: '2026-12-01', kind: 'expense', amount: 50, accountId: 'D', destId: null, category: 'outros', note: '' }, { id: 'o1', date: '2026-01-05', kind: 'income', amount: 5, accountId: 'A', destId: null, category: 'outros', note: '' }] });
  q = await mk(dF()); m = await modelo(q, ['D'], 'month', '2026-11-06');
  R('só movimentos futuros: hoje ainda não conta, saldo = 200,00 € e histórico estimado', m.final === 20000 && m.series.slice(0, -1).every(p => p[2]) && m.series[m.series.length - 1][2] === false);
  q = await mk(dF(), '2026-12-01T12:00:00'); m = await modelo(q, ['D'], 'month', '2026-12-01');
  R('no dia do movimento (01/12): esse dia já é calculado (saldo 150,00 €) e os anteriores continuam estimados', m.series[m.series.length - 1][1] === 15000 && m.series[m.series.length - 1][2] === false && m.estInit === true);
  q = await mk(dF(), '2026-12-03T12:00:00'); m = await modelo(q, ['D'], 'month', '2026-12-03');
  R('depois do movimento: 30/11 estimado (200,00 €), 01/12 em diante calculado (150,00 €)', m.series.find(p => p[0] === '2026-11-30') === undefined && m.series.find(p => p[0] === '2026-12-01')[2] === false && m.series.find(p => p[0] === '2026-12-02')[1] === 15000 && m.estInit === true);

  // ---------- 4) alterar o saldo inicial de uma conta ----------
  q = await mk(db()); await abrir(q, 'month'); await q.evaluate(() => { AN.accs = null; render(true); });
  const antes = {}; for (const [k, a] of [['A', ['A']], ['C', ['C']], ['todas', null]]) antes[k] = await modelo(q, a, 'year', '2026-06-15');
  const movAntes = await q.evaluate(() => JSON.stringify(db.entries)), contaAntes = await q.evaluate(() => JSON.stringify(db.accounts.filter(a => a.id !== 'A')));
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.click('[data-edit-account="A"]'); await q.fill('[name=amount]', '1234,56'); await q.click('[data-act=save]');
  const dep = {}; for (const [k, a] of [['A', ['A']], ['C', ['C']], ['todas', null]]) dep[k] = await modelo(q, a, 'year', '2026-06-15');
  const d = 23456;
  R('alterar o saldo inicial de A (1000 → 1234,56): TODOS os dias do histórico sobem exatamente +234,56 €', dep.A.series.length === antes.A.series.length && dep.A.series.every((p, i) => p[1] === antes.A.series[i][1] + d), '');
  R('…e o saldo de A em Contas e o «Saldo final» da Análise coincidem com o novo valor', await q.evaluate(() => { const a = db.accounts.find(x => x.id === 'A'); return Math.round(balance(a) * 100); }) === antes.A.final + d && dep.A.final === antes.A.final + d);
  R('…a conta A e as outras contas e o conjunto «todas» sobem também +234,56 €', dep.todas.series.every((p, i) => p[1] === antes.todas.series[i][1] + d) && igual(dep.C.series, antes.C.series));
  R('…as marcas «estimado» NÃO mudam (dependem só das datas dos movimentos)', igual(dep.A.series.map(p => p[2]), antes.A.series.map(p => p[2])) && igual(dep.todas.series.map(p => p[2]), antes.todas.series.map(p => p[2])) && dep.A.estInit === antes.A.estInit && dep.A.estFinal === antes.A.estFinal);
  R('…receitas, despesas, transferências e categorias ficam iguais', ['inc', 'expAll', 'trIn', 'trOut', 'byCat'].every(k => igual(dep.A[k], antes.A[k])));
  R('…nenhum movimento foi alterado, e as outras contas ficaram como estavam', (await q.evaluate(() => JSON.stringify(db.entries))) === movAntes && (await q.evaluate(() => JSON.stringify(db.accounts.filter(a => a.id !== 'A')))) === contaAntes);
  await abrir(q, 'month'); await escolher(q, ['A']); for (let i = 0; i < 10; i++) await q.click('[data-an=prev]'); R('…depois da alteração, janeiro continua a avisar que parte do histórico é estimada', (await q.textContent('#view')).includes('Saldos estimados'));
  // conta sem movimentos: alterar o saldo inicial desloca o histórico mas continua tudo estimado
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.click('[data-edit-account="C"]'); await q.fill('[name=amount]', '-80'); await q.click('[data-act=save]');
  const c2 = await modelo(q, ['C'], 'month', '2026-10-15'); R('conta vazia com saldo inicial negativo (-80,00 €, cartão): histórico = -80,00 € e continua estimado', c2.series.every(p => p[1] === -8000 && (p[0] === '2026-11-06' ? true : p[2])) && c2.estInit === true);
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.click('[data-edit-account="A"]'); await q.fill('[name=amount]', '1000'); await q.click('[data-act=save]');
  const rep = await modelo(q, ['A'], 'year', '2026-06-15'); R('repor o saldo inicial (1000) devolve exatamente o histórico original', igual(rep.series, antes.A.series));

  // ---------- 5) o texto que explica a limitação está sempre visível ----------
  await abrir(q, 'year'); R('a nota sob o gráfico diz que o saldo é calculado a partir do saldo inicial e dos movimentos registados', (await q.textContent('.an-foot')).includes('saldo inicial das contas e dos movimentos registados'));
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
