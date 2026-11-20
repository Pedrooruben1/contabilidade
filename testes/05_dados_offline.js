// Dados intactos (a Análise nunca grava nem altera nada), formato das cópias de segurança e funcionamento offline.
const { chromium, fs, path, TMP, R, fim, novo, semear, python, igual, vazio } = require('./comum');
const crypto = require('crypto'); const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
(async () => {
  const pacotes = path.join(TMP, 'pacotes.json'); python('cenarios.py', pacotes);
  const packs = JSON.parse(fs.readFileSync(pacotes)), dados = packs.find(p => p.name === 'aleatorio-3').data; dados.budgets = [{ id: 'b1', category: 'lazer', limit: 50 }]; dados.goals = [{ id: 'g1', name: 'Viagem', target: 1000, saved: 100, deadline: '', created: '2026-01-01', base: 100 }];
  dados.recurring = [{ id: 'r1', name: 'Ginásio', kind: 'expense', amount: 30, accountId: 'a0', destId: null, category: 'desporto', freq: 'monthly', next: '2026-12-15', day: 15, active: true }];
  const b = await chromium.launch(); const todos = [];
  const mk = async (db, opt = {}) => { const q = await novo(b, opt); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db); todos.push(q); return q; };

  // 1) usar a Análise intensivamente não altera os dados nem grava nada
  let q = await mk(dados);
  await q.evaluate(() => { window.__w = []; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__w.push(k); return o.call(this, k, v); }; });
  const antes = await q.evaluate(() => ({ raw: localStorage.getItem('contabilidade-v2'), db: JSON.stringify(db) }));
  await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]');
  for (const m of ['day', 'week', 'month', 'year']) { await q.click(`[data-an="mode:${m}"]`); for (let i = 0; i < 3; i++) await q.click('[data-an=prev]'); await q.click('[data-an=today]'); }
  await q.click('[data-an=accs]'); await q.check('[data-an-acc="a0"]'); await q.check('[data-an-acc="a1"]'); await q.click('[data-act=cancel]'); await q.click('[data-an=cats]'); await q.check('[data-an-cat="lazer"]'); await q.click('[data-act=cancel]');
  await q.evaluate(() => { for (let i = 0; i < 40; i++) { AN.sel = { start: anAddDays(AN.anchor, -i), end: anAddDays(AN.anchor, -i) }; render(true); } AN.selCat = 'lazer'; render(true); });
  await q.click('.an-cat').catch(() => {}); await q.click('[data-an=clear]'); await q.click('[data-view=list]'); await q.click('[data-view=analysis]');
  const depois = await q.evaluate(() => ({ raw: localStorage.getItem('contabilidade-v2'), db: JSON.stringify(db), writes: window.__w }));
  R('após uma sessão intensa de análise, os dados guardados são idênticos, byte a byte', depois.raw === antes.raw, `(${sha(antes.raw)} = ${sha(depois.raw)})`);
  R('a base de dados em memória também fica igual', depois.db === antes.db);
  R('a Análise nunca gravou os dados (nenhuma escrita em poupanca-v2)', !depois.writes.includes('contabilidade-v2'), JSON.stringify([...new Set(depois.writes)]));
  const exp1 = await q.evaluate(() => { const o = db; return JSON.stringify(Object.keys(o)); }); R('formato das cópias de segurança inalterado (as mesmas 6 listas)', exp1 === JSON.stringify(['accounts', 'entries', 'budgets', 'goals', 'recurring', 'invest']), exp1);
  R('contas, movimentos, orçamentos, objetivos e recorrentes mantêm-se', await q.evaluate(([n, e]) => db.accounts.length === n && db.entries.length === e && db.budgets.length === 1 && db.goals.length === 1 && db.recurring.length === 1, [dados.accounts.length, dados.entries.length]));
  // cópia de segurança antes e depois: exportar e importar devolve os mesmos dados
  const bk = await q.evaluate(() => JSON.stringify(db)); const ficheiro = path.join(TMP, 'copia.json'); fs.writeFileSync(ficheiro, bk);
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.setInputFiles('#file', ficheiro); await q.waitForTimeout(500);
  R('importar uma cópia de segurança devolve exatamente os mesmos dados', await q.evaluate(b => JSON.stringify(db.entries.map(e => [e.id, e.date, e.amount, e.accountId, e.destId, e.kind])) === JSON.stringify(JSON.parse(b).entries.map(e => [e.id, e.date, e.amount, e.accountId, e.destId, e.kind])), bk));
  R('a versão aparece em Contas', (await q.textContent('#view')).includes('Poupança ' + require('fs').readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8').match(/const VERSION = '(v\d+)'/)[1]));
  // dados de uma cópia da versão anterior (sem nada da análise) abrem e analisam-se sem alterações
  const velha = { accounts: dados.accounts, entries: dados.entries, budgets: [], goals: [], recurring: [], invest: [] };
  q = await mk(velha); const r0 = await q.evaluate(() => localStorage.getItem('contabilidade-v2')); await q.click('[data-act=open-analysis]'); await q.waitForSelector('.an-grid');
  R('dados da versão anterior: a Análise abre e não altera a cópia guardada', (await q.evaluate(() => localStorage.getItem('contabilidade-v2'))) === r0);

  // 2) offline: depois da primeira visita, a Análise funciona sem rede
  const o = await novo(b); await o.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(o, dados); todos.push(o);
  await o.evaluate(() => navigator.serviceWorker.ready); await o.waitForTimeout(800);
  const cache = await o.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k[0]); return (await c.keys()).map(r => new URL(r.url).pathname.split('/').pop() || './'); });
  R('o ficheiro analise.js está na cache offline', cache.includes('analise.js'), JSON.stringify(cache));
  await o.ctx.setOffline(true); await o.reload(); await o.waitForSelector('.hero');
  await o.click('[data-act=open-analysis]'); await o.waitForSelector('.an-grid'); await o.click('[data-an="mode:year"]'); await o.click('[data-an=prev]');
  R('sem rede: a Análise abre, muda de período e desenha os gráficos', await o.isVisible('#an-bal svg') && await o.isVisible('#an-bars svg'));
  const g = await (async () => { const el = await o.$('#an-bal svg'); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); return await el.boundingBox(); })(); await o.mouse.click(g.x + g.width * 0.5, g.y + 60); await o.waitForTimeout(150);
  R('sem rede: tocar no gráfico mostra os movimentos do dia', await o.evaluate(() => AN.sel !== null));

  // 3) se o servidor não tiver o analise.js, o resto da app continua disponível offline e nunca guarda erros 404
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); await c2.route('**/analise.js', r => r.fulfill({ status: 404, body: 'não existe' })); const p2 = await c2.newPage(); p2.errs = []; p2.on('pageerror', e => p2.errs.push(e.message));
  await p2.goto(process.env.APP || 'http://localhost:8780/index.html'); await p2.evaluate(() => { localStorage.setItem('contabilidade-welcome', '1'); localStorage.setItem('contabilidade-privacy', '0'); }); await p2.reload(); await p2.evaluate(() => navigator.serviceWorker.ready); await p2.waitForTimeout(800);
  const cache2 = await p2.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k[0]); const out = {}; for (const r of await c.keys()) { const res = await c.match(r); out[new URL(r.url).pathname.split('/').pop() || './'] = res.status; } return out; });
  R('analise.js em falta: o service worker instala-se na mesma e guarda os restantes ficheiros', cache2['app.js'] === 200 && cache2['index.html'] === 200 && cache2['style.css'] === 200, JSON.stringify(cache2));
  R('analise.js em falta: nenhum erro 404 fica guardado na cache', !Object.values(cache2).includes(404));
  await c2.setOffline(true); await p2.reload(); await p2.waitForSelector('.hero'); R('analise.js em falta: a app abre offline e o Início funciona', await p2.isVisible('.hero')); await c2.close();
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
