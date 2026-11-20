// O resultado não pode depender do fuso horário nem da hora de verão.
const { chromium, fs, path, TMP, R, fim, novo, semear, python, igual, vazio } = require('./comum');
const FUSOS = ['Europe/Lisbon', 'Atlantic/Azores', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Auckland', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Kolkata'];
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
(async () => {
  const pacotes = path.join(TMP, 'pacotes.json'), esperado = path.join(TMP, 'esperado.json'); python('cenarios.py', pacotes); python('executar_oraculo.py', pacotes, esperado);
  const packs = JSON.parse(fs.readFileSync(pacotes)), exp = JSON.parse(fs.readFileSync(esperado)), idx = ['aleatorio-2', 'bissexto-2024', 'primeiro-movimento-tardio'].map(n => packs.findIndex(p => p.name === n));
  const b = await chromium.launch(); const todos = [];
  for (const tz of FUSOS) {
    const q = await novo(b, { timezoneId: tz }); todos.push(q); await q.goto(require('./comum').APP);
    let bad = 0, n = 0;
    for (const i of idx) { const got = await q.evaluate(([data, today, cens]) => cens.map(c => anCompute({ db: data, today, mode: c.mode, anchor: c.anchor, accs: c.accs ? new Set(c.accs) : null, cats: c.cats ? new Set(c.cats) : null, win: c.win })), [packs[i].data, packs[i].today, packs[i].scenarios]);
      got.forEach((g, k) => { n++; for (const f of ['range', 'prev', 'init', 'final', 'inc', 'expAll', 'exp', 'trIn', 'trOut', 'series', 'byCat', 'prevAgg']) if (JSON.stringify(canon(g[f])) !== JSON.stringify(canon(exp[i][k][f]))) { bad++; break; } }); }
    R(`${tz}: ${n} cenários iguais ao cálculo independente`, bad === 0, bad ? `${bad} diferenças` : '');
  }
  // instantes críticos: mudança da hora de verão e viragem de dia/ano, com o relógio da app fixado
  const criticos = [['Europe/Lisbon', '2026-03-29T00:30:00+00:00', '2026-03-29'], ['Europe/Lisbon', '2026-03-29T01:30:00+00:00', '2026-03-29'], ['Europe/Lisbon', '2026-10-25T00:30:00+00:00', '2026-10-25'], ['Europe/Lisbon', '2026-10-25T01:30:00+00:00', '2026-10-25'],
    ['Europe/Lisbon', '2026-12-31T23:59:30+00:00', '2026-12-31'], ['Europe/Lisbon', '2027-01-01T00:00:30+00:00', '2027-01-01'], ['America/Los_Angeles', '2026-11-01T08:30:00+00:00', '2026-11-01'], ['Pacific/Auckland', '2026-09-26T12:30:00+00:00', '2026-09-27'], ['Pacific/Kiritimati', '2026-11-06T10:30:00+00:00', '2026-11-07']];
  for (const [tz, inst, esperadoDia] of criticos) {
    const q = await novo(b, { timezoneId: tz }); todos.push(q); await q.ctx.clock.setFixedTime(new Date(inst)); await semear(q, { ...vazio(), accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 10 }], entries: [{ id: 'e', date: esperadoDia, kind: 'expense', amount: 5, accountId: 'a', category: 'outros', note: 'x' }] });
    await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.click('[data-an="mode:day"]');
    const r = await q.evaluate(() => ({ hoje: today(), ancora: AN.anchor, intervalo: AN.model.range, saldo: AN.model.final, desp: AN.model.expAll }));
    R(`${tz} em ${inst.slice(0, 16)}Z: o «dia de hoje» da Análise é ${esperadoDia} e inclui o movimento desse dia`, r.hoje === esperadoDia && r.ancora === esperadoDia && r.desp === 500 && r.saldo === 500, JSON.stringify(r));
  }
  // intervalos de calendário: vários anos e todos os dias de transição, sem saltos nem repetições de dias
  const q = await novo(b, { timezoneId: 'Europe/Lisbon' }); todos.push(q); await q.goto(require('./comum').APP);
  const cal = await q.evaluate(() => { const bad = []; let d = '2019-12-25'; const vistos = new Set(); for (let i = 0; i < 3300; i++) { const nx = anAddDays(d, 1); if (anNum(nx) - anNum(d) !== 1) bad.push('salto ' + d); if (vistos.has(d)) bad.push('repetido ' + d); vistos.add(d); const w = anRange('week', d); if (anNum(w.end) - anNum(w.start) !== 6 || (((anNum(w.start) + 3) % 7) + 7) % 7 !== 0) bad.push('semana ' + d); const m = anRange('month', d); const dias = new Date(+d.slice(0, 4), +d.slice(5, 7), 0).getDate(); if (anNum(m.end) - anNum(m.start) + 1 !== dias) bad.push('mês ' + d); const y = anRange('year', d); const ano = +d.slice(0, 4); if (anNum(y.end) - anNum(y.start) + 1 !== ((ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0 ? 366 : 365)) bad.push('ano ' + d); d = nx; } return bad; });
  R('3300 dias seguidos (2019 a 2028, com 2020 e 2024 bissextos): sem saltos, semanas de 7 dias a começar à segunda, meses e anos com o número certo de dias', cal.length === 0, cal.slice(0, 3).join(' | '));
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
