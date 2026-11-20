const { chromium, fs, path, TMP, novo, semear } = require('./comum');
(async () => {
  // dados realistas: ordenado, renda, supermercado, restaurantes, poupança mensal
  const e = []; let id = 0; const add = (date, kind, amount, accountId, category, note, destId = null) => e.push({ id: 'r' + id++, date, kind, amount, accountId, destId, category: category || 'outros', note: note || '', goalId: null, recId: null });
  for (let m = 5; m >= 0; m--) { const d0 = new Date(2026, 10 - m, 1); const pad = n => String(n).padStart(2, '0'); const Y = d0.getFullYear(), M = pad(d0.getMonth() + 1);
    if (m === 0 && true) { } add(`${Y}-${M}-01`, 'income', 1650, 'a', 'outros', 'Ordenado'); add(`${Y}-${M}-02`, 'expense', 520, 'a', 'habitacao', 'Renda'); add(`${Y}-${M}-03`, 'transfer', 250, 'a', 'outros', '', 'p');
    for (const [dd, v, c, n] of [[2, 62.4, 'alimentacao', 'Supermercado'], [4, 18.5, 'restaurantes', 'Jantar'], [5, 40, 'transportes', 'Gasolina']]) add(`${Y}-${M}-${pad(dd)}`, 'expense', v, 'a', c, n);
    if (m > 0) for (const [dd, v, c, n] of [[8, 71.2, 'alimentacao', 'Supermercado'], [11, 25, 'lazer', 'Cinema'], [14, 12.99, 'subscricoes', 'Streaming'], [17, 55.8, 'alimentacao', 'Supermercado'], [20, 34, 'restaurantes', 'Almoço'], [23, 45, 'transportes', 'Passe'], [26, 80.3, 'compras', 'Roupa'], [28, 15, 'saude', 'Farmácia']]) add(`${Y}-${M}-${pad(dd)}`, 'expense', v, dd % 2 ? 'a' : 'c', c, n); }
  const db = { accounts: [{ id: 'a', name: 'Conta ordenado', kind: 'ordem', opening: 900 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 1500 }, { id: 'c', name: 'Carteira', kind: 'carteira', opening: 40 }], entries: e, budgets: [], goals: [], recurring: [], invest: [] };
  const b = await chromium.launch(); const out = path.join(TMP, 'capturas'); fs.mkdirSync(out, { recursive: true });
  const shot = async (nome, opt, passos, cheio = true) => { const q = await novo(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...opt }); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db, { privacidade: opt.priv }); await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-nav'); await passos(q); await q.waitForTimeout(450); await q.screenshot({ path: path.join(out, nome + '.png'), fullPage: cheio }); await q.ctx.close(); };
  await shot('01_mes_claro', {}, async q => {});
  await shot('02_mes_escuro', { colorScheme: 'dark' }, async q => {});
  await shot('03_ano_categoria', {}, async q => { await q.click('[data-an="mode:year"]'); await q.click('.an-cat'); });
  await shot('04_dia', {}, async q => { await q.click('[data-an="mode:day"]'); await q.click('[data-an=prev]'); });
  await shot('05_filtros', {}, async q => { await q.click('[data-an=accs]'); await q.check('[data-an-acc="a"]'); }, false);
  await shot('06_privado', { priv: true }, async q => {}, false);
  await shot('07_320px', { viewport: { width: 320, height: 640 } }, async q => { await q.click('[data-an="mode:week"]'); });
  await b.close(); console.log(fs.readdirSync(out).join('\n'));
})();
