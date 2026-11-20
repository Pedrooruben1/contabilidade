require('./_saida');
// BLOCO 1: instalabilidade, dispositivos, acessibilidade (axe), XSS, quota, SW
const { chromium, devices } = require('playwright'); const fs = require('fs');
const S = '/tmp/poupanca-testes'; const U = 'http://localhost:8780/index.html';
const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
const E = () => ({ accounts: [], entries: [], budgets: [], goals: [], recurring: [], invest: [] });
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const rich = () => ({ accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 2500.5 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 1000 }, { id: 'c', name: 'Carteira', kind: 'carteira', opening: 40 }, { id: 'i', name: 'Corretora', kind: 'investimento', opening: 500 }],
  entries: [{ id: 'e1', date: day(0), kind: 'income', amount: 1500, accountId: 'a', category: 'outros', note: 'Salário' }, { id: 'e2', date: day(0), kind: 'expense', amount: 85, accountId: 'a', category: 'alimentacao', note: 'Supermercado' }, { id: 'e3', date: day(-1), kind: 'expense', amount: 12.5, accountId: 'c', category: 'restaurantes', note: 'Café' }, { id: 'e4', date: day(0), kind: 'transfer', amount: 200, accountId: 'a', destId: 'p', category: 'outros', note: '', goalId: 'g' }, { id: 'e5', date: day(5), kind: 'expense', amount: 30, accountId: 'a', category: 'desporto', note: 'Futuro' }],
  budgets: [{ id: 'b1', category: 'alimentacao', limit: 100 }, { id: 'b2', category: 'restaurantes', limit: 10 }], goals: [{ id: 'g', name: 'Viagem', target: 1000, saved: 100, deadline: day(120), created: day(-30), base: 100 }],
  recurring: [{ id: 'r', name: 'Ginásio', kind: 'expense', amount: 30, accountId: 'a', destId: null, category: 'desporto', freq: 'monthly', next: day(10), day: +day(10).slice(8), active: true }], invest: [{ id: 'v', name: 'ETF Mundo', type: 'etf', invested: 400, current: 450 }, { id: 'd', name: 'Cartão', type: 'divida', invested: 0, current: 120 }] });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mkctx = async (o = {}) => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, ...o }); const q = await c.newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept()); return [c, q]; };
  const seed = async (q, d, priv = '0') => { await q.goto(U); await q.evaluate(([d, pv]) => { localStorage.clear(); if (pv === '0') localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify(d)); }, [d, priv]); await q.reload(); await q.waitForSelector('.hero'); };

  // 3) acessibilidade com axe-core (claro e escuro; vários ecrãs e formulário aberto)
  let c, q;
  const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); const seen = {};
  for (const scheme of ['light', 'dark']) { [c, q] = await mkctx({ colorScheme: scheme, bypassCSP: true }); await seed(q, rich());
    for (const [label, act] of [['início', async () => q.click('[data-tab=home]')], ['movimentos', async () => q.click('[data-tab=entries]')], ['orçamentos', async () => q.click('[data-tab=budgets]')], ['objetivos', async () => q.click('[data-tab=goals]')], ['contas', async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); }], ['recorrentes', async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=rec]'); }], ['património', async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=inv]'); }], ['formulário de movimento', async () => { await q.click('[data-tab=entries]'); await q.click('#add'); }]]) {
      await act(); await q.addScriptTag({ content: axeSrc }); const res = await q.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, ex: v.nodes[0].html.slice(0, 90) })));
      for (const v of res) { const k = v.id; (seen[k] = seen[k] || { ...v, where: new Set() }).where.add(`${label}/${scheme}`); }
      if (label === 'formulário de movimento') await q.click('[data-act=cancel]'); }
    await c.close(); }
  const viol = Object.values(seen); R('axe-core: sem violações graves ou sérias (WCAG A/AA)', !viol.filter(v => ['critical', 'serious'].includes(v.impact)).length, '');
  for (const v of viol) console.log(`   · [${v.impact}] ${v.id}: ${v.help} — em ${[...v.where].slice(0, 4).join(', ')} — ex.: ${v.ex}`);

  // 4) XSS pela interface: texto malicioso em todos os campos de texto
  [c, q] = await mkctx({ bypassCSP: true }); await seed(q, E()); const X = '"><img src=x onerror="window.__x=1"><script>window.__x=2</script>\'';
  await q.click('[data-tab=accounts]'); await q.click('#add'); await q.fill('[name=name]', X); await q.fill('[name=amount]', '10'); await q.click('[data-act=save]');
  await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('[name=amount]', '1'); await q.fill('[name=note]', X); await q.click('[data-act=save]');
  await q.click('[data-tab=goals]'); await q.click('[data-act=new]'); await q.fill('[name=name]', X); await q.fill('[name=target]', '50'); await q.click('[data-act=save]');
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=inv]'); await q.click('[data-act=new]'); await q.fill('[name=name]', X); await q.fill('[name=current]', '5'); await q.click('[data-act=save]');
  await q.click('[data-seg=rec]'); await q.click('[data-act=new]'); await q.fill('[name=name]', X); await q.fill('[name=amount]', '5'); await q.click('[data-act=save]');
  for (const t of ['home', 'entries', 'budgets', 'goals', 'accounts']) { await q.click(`[data-tab=${t}]`); } await q.click('[data-tab=entries]'); await q.click('[data-edit-entry]'); await q.click('[data-act=cancel]'); await q.click('[data-tab=goals]'); await q.click('[data-edit-goal]'); const nm = await q.inputValue('[name=name]'); await q.click('[data-act=cancel]');
  await q.waitForTimeout(300); R('texto malicioso em todos os campos: nada é executado', !(await q.evaluate(() => window.__x)));
  R('o texto malicioso é mostrado como texto (não cria elementos) e volta igual ao editar', !(await q.$('#view img, #view script')) && nm === X);
  await c.close();

  // 5) armazenamento cheio / bloqueado
  [c, q] = await mkctx(); await seed(q, rich()); await q.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('cheio', 'QuotaExceededError'); }; });
  await q.click('[data-tab=accounts]'); await q.click('#add'); await q.fill('[name=name]', 'X'); await q.fill('[name=amount]', '1'); await q.click('[data-act=save]'); await q.waitForTimeout(200);
  R('armazenamento cheio: avisa e a app continua a funcionar', (await q.textContent('#toast')).includes('Não foi possível guardar') && await q.isVisible('#view')); await c.close();
  console.log('erros JS:', errs); await b.close();
})();
