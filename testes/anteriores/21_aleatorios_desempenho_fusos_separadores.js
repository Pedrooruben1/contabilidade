require('./_saida');
// BLOCO 3: propriedades/fuzz, desempenho, datas e fusos, dois separadores
const { chromium } = require('playwright');
const U = process.env.APP || 'http://localhost:8780/index.html';
const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (o = {}) => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, ...o }); const q = await c.newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept()); await q.goto(U); await q.evaluate(() => { localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-privacy', '0'); }); await q.reload(); await q.waitForSelector('.hero'); return [c, q]; };

  // A) propriedades com dados aleatórios (semente fixa), modelo independente
  let [c, q] = await mk();
  const res = await q.evaluate(() => {
    let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; const pick = a => a[Math.floor(rnd() * a.length)];
    const kinds = ['ordem', 'poupanca', 'carteira', 'investimento']; const accounts = Array.from({ length: 8 }, (_, i) => ({ id: 'a' + i, name: 'Conta ' + i, kind: kinds[i % 4], opening: Math.round((rnd() * 5000 - 500) * 100) / 100 }));
    const ds = () => { const d = new Date(); d.setDate(d.getDate() - Math.floor(rnd() * 400) + 20); return ymd(d); };
    const cats = Object.keys(CATS); const entries = [];
    for (let i = 0; i < 4000; i++) { const k = pick(['income', 'expense', 'expense', 'transfer']); const a = pick(accounts); let dst = null; if (k === 'transfer') { do { dst = pick(accounts); } while (dst.id === a.id); } entries.push({ id: 'e' + i, date: ds(), kind: k, amount: Math.round(rnd() * 50000) / 100 + 0.01, accountId: a.id, destId: dst ? dst.id : null, category: pick(cats), note: '', goalId: null, recId: null }); }
    const T = today(); const near = (x, y) => Math.abs(x - y) < 1e-6; const out = {};
    db = { accounts, entries, budgets: [], goals: [], recurring: [], invest: [] };
    // modelo independente
    const model = {}; accounts.forEach(a => { model[a.id] = a.opening; }); entries.filter(e => e.date <= T).forEach(e => { if (e.kind === 'transfer') { model[e.accountId] -= e.amount; model[e.destId] += e.amount; } else model[e.accountId] += e.kind === 'income' ? e.amount : -e.amount; });
    out.balances = accounts.every(a => near(balance(a), model[a.id]));
    const tot = accounts.reduce((s, a) => s + model[a.id], 0); out.totalSplit = near(spendable() + savingsTotal() + investedAccounts(), tot);
    const transfersOnly = entries.filter(e => e.kind === 'transfer' && e.date <= T).length; out.transfers = transfersOnly > 100;
    const withoutTransfers = accounts.reduce((s, a) => s + a.opening, 0) + entries.filter(e => e.date <= T && e.kind !== 'transfer').reduce((s, e) => s + (e.kind === 'income' ? e.amount : -e.amount), 0); out.transfersConserveTotal = near(tot, withoutTransfers);
    const ym = curMonth(); out.monthSums = near(sumEntries('expense', ym), entries.filter(e => e.kind === 'expense' && e.date.startsWith(ym) && e.date <= T).reduce((s, e) => s + e.amount, 0));
    // normalize idempotente e ida-e-volta (exportar → importar)
    const n1 = normalize(JSON.parse(JSON.stringify(db))); const n2 = normalize(JSON.parse(JSON.stringify(n1))); out.idempotent = JSON.stringify(n1) === JSON.stringify(n2); out.roundTrip = JSON.stringify(n1.entries.map(e => [e.id, e.date, e.amount, e.accountId, e.destId, e.kind])) === JSON.stringify(entries.map(e => [e.id, e.date, e.amount, e.accountId, e.destId, e.kind]));
    // parseMoney: números com 2 casas escritos de várias maneiras voltam iguais
    let okMoney = true, bad = ''; for (let i = 0; i < 3000; i++) { const cents = Math.floor(rnd() * 10000000); const v = cents / 100; const pt = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, useGrouping: false }).format(v); const grp = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(v); const en = v.toFixed(2); for (const s of [pt, grp, en, String(v).replace('.', ',')]) { const p = parseMoney(s); if (p === null || Math.abs(p - v) > 1e-9) { okMoney = false; bad = s + ' → ' + p + ' (esperado ' + v + ')'; break; } } if (!okMoney) break; }
    out.money = okMoney ? '' : bad; out.moneyOk = okMoney;
    // lixo nunca é aceite
    out.junk = ['', ' ', 'abc', '1,2,3', '1..2', '--5', '1e5', '0x1F', 'Infinity', 'NaN', '1,234', '12,345', '+5', '5-', '١٢٣', '1 2 3 x', '9'.repeat(400) + 'x'].every(s => parseMoney(s) === null || s === '1 2 3 x' && false);
    return out;
  });
  R('saldos de 8 contas com 4000 movimentos = modelo independente', res.balances); R('disponível + poupança + investido = total', res.totalSplit);
  R('transferências conservam o total (>100 testadas)', res.transfers && res.transfersConserveTotal); R('totais do mês = modelo', res.monthSums);
  R('normalize é idempotente e a ida-e-volta não perde nada', res.idempotent && res.roundTrip); R('parseMoney: 12 000 valores em 4 formatos voltam exatamente', res.moneyOk, res.money); R('parseMoney: lixo é sempre recusado', res.junk);
  await c.close();

  // B) fuzz do registo rápido e da importação: nunca rebenta
  [c, q] = await mk();
  const fz = await q.evaluate(() => {
    db = { accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 10 }, { id: 'p', name: 'Poupança', kind: 'poupanca', opening: 0 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] };
    let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; const words = ['gastei', 'café', '12,50', '1.250,50', 'recebi', 'para', 'poupança', 'banco', '€', 'ontem', "mcdonald's", '3', '0', '-5', '1e9', '999999999999999999999', '😀', 'ﷺ', '\u0000', '<b>', '"', '\\', '(', '[', '*', '+', '?', '.', 'x'.repeat(300), 'transferir', 'receita', 'médica', 'passei'];
    let thrown = 0, bad = 0, n = 0; for (let i = 0; i < 6000; i++) { const t = Array.from({ length: Math.floor(rnd() * 8) }, () => words[Math.floor(rnd() * words.length)]).join(rnd() < .5 ? ' ' : ''); n++; try { const r = parseQuick(t); if (r && (!Number.isFinite(r.amount) || r.amount <= 0 || !r.accountId || !CATS[r.category] || !ENTRY[r.kind])) bad++; } catch (e) { thrown++; } }
    // fuzz de importação: ficheiros mutados (tipos trocados) — normalize não rebenta e o resultado desenha-se
    const base = { accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 1 }], entries: [{ id: 'e', date: '2026-01-01', kind: 'expense', amount: 5, accountId: 'a', destId: null, category: 'outros', note: 'x', goalId: null, recId: null }], budgets: [{ id: 'b', category: 'lazer', limit: 5 }], goals: [{ id: 'g', name: 'G', target: 10, saved: 1, deadline: '2026-05-01', created: '2026-01-01', base: 1 }], recurring: [{ id: 'r', name: 'R', kind: 'expense', amount: 5, accountId: 'a', freq: 'monthly', next: '2026-12-01', day: 1, active: true }], invest: [{ id: 'i', name: 'I', type: 'etf', invested: 1, current: 2 }] };
    const vals = [null, undefined, 0, -1, 1e308, NaN, 'x', '', [], {}, [1], true, '2026-02-30', '<img>', 'a'.repeat(1000)];
    const paths = []; const walk = (o, p) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { paths.push([...p, k]); walk(o[k], [...p, k]); } }; walk(base, []);
    let fzThrown = 0, fzRender = 0, fzCount = 0; const saved = db;
    for (let i = 0; i < 1500; i++) { const o = JSON.parse(JSON.stringify(base)); const p = paths[Math.floor(rnd() * paths.length)]; let ref = o; for (let j = 0; j < p.length - 1; j++) ref = ref[p[j]]; ref[p[p.length - 1]] = vals[Math.floor(rnd() * vals.length)]; fzCount++;
      try { const d = validBackup(o) ? normalize(o) : null; if (d) { db = d; for (const t of ['home', 'entries', 'budgets', 'goals', 'accounts']) { tab = t; render(true); } ui.seg = 'rec'; render(true); ui.seg = 'inv'; render(true); ui.seg = 'accounts'; } } catch (e) { fzThrown++; if (fzThrown < 3) console.log('   lixo:', JSON.stringify(p), String(e).slice(0, 80)); } }
    db = saved; tab = 'home'; return { n, thrown, bad, fzCount, fzThrown };
  });
  R(`registo rápido: ${fz.n} frases aleatórias/hostis, nenhuma rebenta e todas dão resultados válidos`, fz.thrown === 0 && fz.bad === 0, `exceções=${fz.thrown} inválidos=${fz.bad}`);
  R(`importação: ${fz.fzCount} ficheiros mutados, nenhum rebenta ao normalizar e desenhar todos os ecrãs`, fz.fzThrown === 0, `exceções=${fz.fzThrown}`);
  await c.close();

  // C) desempenho com 5000 movimentos
  [c, q] = await mk();
  const perf = await q.evaluate(() => {
    let seed = 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; const cats = Object.keys(CATS);
    const accounts = [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 }, { id: 'p', name: 'Poup', kind: 'poupanca', opening: 0 }]; const entries = [];
    for (let i = 0; i < 5000; i++) { const d = new Date(); d.setDate(d.getDate() - Math.floor(rnd() * 700)); entries.push({ id: 'e' + i, date: ymd(d), kind: rnd() < .2 ? 'income' : 'expense', amount: Math.round(rnd() * 9000) / 100 + 1, accountId: 'a', destId: null, category: cats[Math.floor(rnd() * cats.length)], note: 'mov ' + i, goalId: null, recId: null }); }
    db = { accounts, entries, budgets: cats.slice(0, 5).map((c, i) => ({ id: 'b' + i, category: c, limit: 100 })), goals: [], recurring: [], invest: [] }; const t = {};
    for (const x of ['home', 'entries', 'budgets', 'goals', 'accounts']) { tab = x; const s = performance.now(); render(true); t[x] = Math.round(performance.now() - s); }
    ui.f.q = 'mov 12'; let s = performance.now(); filtered(); t.pesquisa = Math.round(performance.now() - s); ui.f.q = ''; s = performance.now(); save(); t.guardar = Math.round(performance.now() - s); s = performance.now(); normalize(JSON.parse(JSON.stringify(db))); t.importar = Math.round(performance.now() - s); t.kb = Math.round(JSON.stringify(db).length / 1024); return t;
  });
  console.log('   tempos (ms) com 5000 movimentos:', JSON.stringify(perf)); R('todos os ecrãs desenham em menos de 400 ms com 5000 movimentos', ['home', 'entries', 'budgets', 'goals', 'accounts', 'pesquisa', 'guardar', 'importar'].every(k => perf[k] < 400)); await c.close();

  // D) datas e fusos: fim de mês/ano, ano bissexto, recorrentes dia 29/30/31, vários fusos
  for (const tz of ['Europe/Lisbon', 'Atlantic/Azores', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Auckland']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: tz }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tz + ': ' + e.message)); await p.goto(U);
    const r = await p.evaluate(() => {
      const out = {}; const mkRec = (next, day, freq) => ({ next, day, freq }); const walk = (start, day, freq, n) => { let r = mkRec(start, day, freq); const a = []; for (let i = 0; i < n; i++) { r.next = advance(r); a.push(r.next); } return a; };
      out.m31 = walk('2026-01-31', 31, 'monthly', 4).join(); out.m30 = walk('2027-01-30', 30, 'monthly', 2).join(); out.m29 = walk('2028-01-29', 29, 'monthly', 2).join(); out.y29 = walk('2028-02-29', 29, 'yearly', 5).join(); out.w = walk('2026-12-28', 1, 'weekly', 2).join(); out.dec = walk('2026-12-15', 15, 'monthly', 2).join();
      out.ymdOk = [new Date(2026, 11, 31, 23, 59), new Date(2028, 1, 29, 0, 1)].map(ymd).join(); out.addM = [addMonthKey('2026-12', 1), addMonthKey('2026-01', -1), addMonthKey('2026-03', -14)].join(); return out; });
    const exp = { m31: '2026-02-28,2026-03-31,2026-04-30,2026-05-31', m30: '2027-02-28,2027-03-30', m29: '2028-02-29,2028-03-29', y29: '2029-02-28,2030-02-28,2031-02-28,2032-02-29,2033-02-28', w: '2027-01-04,2027-01-11', dec: '2027-01-15,2027-02-15', ymdOk: '2026-12-31,2028-02-29', addM: '2027-01,2025-12,2025-01' };
    const bad = Object.keys(exp).filter(k => r[k] !== exp[k]).map(k => `${k}: obtido ${r[k]} esperado ${exp[k]}`); R(`${tz}: recorrentes dia 29/30/31, ano bissexto e viragem de ano/mês`, !bad.length, bad.join(' | ')); await ctx.close();
  }
  // viragem de mês/ano com o relógio fixo: 31/12 23:59 → 01/01
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Lisbon' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.clock.install({ time: new Date('2027-12-31T23:58:00+00:00') });
    await p.goto(U); await p.evaluate(() => { localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 100 }], entries: [{ id: 'e', date: '2027-12-31', kind: 'expense', amount: 10, accountId: 'a', category: 'outros', note: 'dez' }], budgets: [], goals: [], recurring: [{ id: 'r', name: 'Renda', kind: 'expense', amount: 500, accountId: 'a', destId: null, category: 'habitacao', freq: 'monthly', next: '2028-01-01', day: 1, active: true }], invest: [] })); }); await p.reload(); await p.waitForSelector('.hero');
    const before = await p.evaluate(() => ({ today: today(), month: curMonth(), n: db.entries.length, exp: sumEntries('expense', curMonth()) })); await p.clock.fastForward(4 * 60 * 1000); await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); }); await p.reload(); await p.waitForSelector('.hero');
    const after = await p.evaluate(() => ({ today: today(), month: curMonth(), n: db.entries.length, rent: db.entries.filter(e => e.note === 'Renda').map(e => e.date).join(), exp: sumEntries('expense', curMonth()) }));
    R('31/12 → 01/01: muda o mês, cria a renda de 01/01 uma vez e o mês novo começa a zero', before.today === '2027-12-31' && after.today === '2028-01-01' && after.month === '2028-01' && after.rent === '2028-01-01' && after.exp === 500, JSON.stringify({ before, after })); await ctx.close(); }

  // E) dois separadores a escrever (perda de dados?)
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const A = await ctx.newPage(); A.on('dialog', d => d.accept()); await A.goto(U); await A.evaluate(() => { localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-privacy', '0'); }); await A.reload(); await A.waitForSelector('.hero');
    const B = await ctx.newPage(); B.on('dialog', d => d.accept()); await B.goto(U); await B.waitForSelector('.hero');
    const add = async (p, name) => { await p.click('[data-tab=accounts]'); await p.click('[data-seg=accounts]'); await p.click('#add'); await p.fill('[name=name]', name); await p.fill('[name=amount]', '10'); await p.click('[data-act=save]'); };
    await add(A, 'Conta do separador A'); await add(B, 'Conta do separador B'); const names = await A.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')).accounts.map(a => a.name));
    R('dois separadores abertos: as duas contas ficam guardadas (sem perda de dados)', names.includes('Conta do separador A') && names.includes('Conta do separador B'), 'guardado: ' + JSON.stringify(names)); await ctx.close(); }
  console.log('erros JS:', errs); await b.close();
})();
