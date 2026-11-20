// Regras financeiras obrigatórias, verificadas como propriedades sobre milhares de cenários aleatórios.
const { chromium, fs, path, TMP, R, fim, novo, semear, python, vazio } = require('./comum');
(async () => {
  const pacotes = path.join(TMP, 'pacotes.json'); python('cenarios.py', pacotes);
  const packs = JSON.parse(fs.readFileSync(pacotes));
  const b = await chromium.launch(); const q = await novo(b); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, vazio());
  const res = await q.evaluate(([packs]) => {
    const out = {}; const bad = (k, msg) => { (out[k] = out[k] || { n: 0, ex: '' }).n++; if (!out[k].ex) out[k].ex = msg; }; const cnt = {};
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const run = (data, today, c, over = {}) => anCompute({ db: data, today, mode: c.mode, anchor: c.anchor, accs: c.accs ? new Set(c.accs) : null, cats: c.cats ? new Set(c.cats) : null, win: c.win, ...over });
    for (const p of packs) {
      const ids = p.data.accounts.map(a => a.id); let rng = 7; const rnd = () => (rng = (rng * 1664525 + 1013904223) % 4294967296) / 4294967296;
      for (const c of p.scenarios) {
        cnt.total = (cnt.total || 0) + 1; const tag = `${p.name} ${JSON.stringify(c)}`; const m = run(p.data, p.today, c);
        // 1) saldo final − inicial = receitas − despesas + transferências externas
        if (m.recon !== 0) bad('reconciliação', tag);
        // 2) categorias somam as despesas; barras somam o período
        if (Object.values(m.byCat).reduce((s, v) => s + v, 0) !== m.expAll) bad('categorias=despesas', tag);
        if (m.buckets.length) { if (m.buckets.reduce((s, k) => s + k.inc, 0) !== m.inc) bad('barras receitas', tag); if (m.buckets.reduce((s, k) => s + k.exp, 0) !== m.exp) bad('barras despesas', tag); }
        if (!c.cats && m.exp !== m.expAll) bad('sem filtro: despesas filtradas=totais', tag);
        if (c.cats && m.exp !== c.cats.reduce((s, k) => s + (m.byCat[k] || 0), 0)) bad('filtro: despesas=categorias escolhidas', tag);
        // 3) o filtro de categorias nunca altera saldos nem receitas nem transferências (regra 7)
        if (c.cats) { const n = run(p.data, p.today, { ...c, cats: null }); for (const f of ['init', 'final', 'series', 'inc', 'trIn', 'trOut', 'estInit', 'estFinal', 'expAll', 'byCat']) if (!same(m[f], n[f])) bad('filtro de categorias não altera saldos', tag + ' ' + f); }
        // 4) saldo combinado = soma dos saldos de cada conta (não duplica transferências)
        if (m.series.length && m.accounts.length > 1 && m.accounts.length <= 4) { const singles = m.accounts.map(id => run(p.data, p.today, { ...c, accs: [id], cats: null })); const ok = m.series.every((pt, i) => pt.bal === singles.reduce((s, x) => s + x.series[i].bal, 0)); if (!ok) bad('combinado = soma das contas', tag); cnt.combinados = (cnt.combinados || 0) + 1; }
        // 5) movimentos futuros nunca alteram nada
        const fut = { ...p.data, entries: [...p.data.entries, { id: 'fx', date: '2099-01-01', kind: 'expense', amount: 9999.99, accountId: ids[0], destId: null, category: 'outros' }, { id: 'fy', date: '2026-11-07', kind: 'transfer', amount: 5, accountId: ids[0], destId: ids[1] }, { id: 'fz', date: '2026-11-07', kind: 'income', amount: 7, accountId: ids[1], destId: null, category: 'outros' }] };
        if (p.today < '2026-11-07' && !same(run(fut, p.today, c), m)) bad('futuros não alteram', tag);
      }
      // 6) continuidade: o saldo final de um mês é o saldo inicial do seguinte
      for (const a of [null, [ids[0]], ids.slice(0, 3)]) for (let k = 0; k < 18; k++) {
        const base = new Date(Date.UTC(2024, 0, 15 + k * 33)).toISOString().slice(0, 10), prox = anAddMonths(base.slice(0, 7) + '-01', 1);
        const m1 = run(p.data, p.today, { mode: 'month', anchor: base, accs: a, win: 7 }), m2 = run(p.data, p.today, { mode: 'month', anchor: prox, accs: a, win: 7 });
        if (m1.range.end < p.today && m2.range.start <= p.today && m1.final !== m2.init) bad('continuidade entre meses', `${p.name} ${base}`); cnt.continuidade = (cnt.continuidade || 0) + 1;
      }
      // 7) transferência INTERNA à seleção: não muda saldo combinado, receitas, despesas nem transferências externas; transferência EXTERNA muda só o saldo
      for (let k = 0; k < 40 && ids.length > 3; k++) {
        const S = ids.slice(0, 3), outro = ids[3], dia = anAddDays(p.today, -(1 + Math.floor(rnd() * 25))), valor = Math.round(rnd() * 100000) / 100 + 0.01;
        const c = { mode: 'month', anchor: dia, accs: S, cats: null, win: 7 }, antes = run(p.data, p.today, c);
        const dInt = { ...p.data, entries: [...p.data.entries, { id: 'ti', date: dia, kind: 'transfer', amount: valor, accountId: S[0], destId: S[1], category: 'outros' }] };
        const dep = run(dInt, p.today, c); for (const f of ['init', 'final', 'series', 'inc', 'expAll', 'trIn', 'trOut', 'byCat']) if (!same(antes[f], dep[f])) bad('transferência interna não altera o combinado', `${f} ${valor} ${dia}`);
        if (dep.nInt !== antes.nInt + 1) bad('transferência interna é contada à parte', `${dep.nInt} vs ${antes.nInt}`);
        const dExt = { ...p.data, entries: [...p.data.entries, { id: 'te', date: dia, kind: 'transfer', amount: valor, accountId: S[0], destId: outro, category: 'outros' }] };
        const ext = run(dExt, p.today, c); const cents = Math.round(valor * 100);
        if (ext.trOut !== antes.trOut + cents || ext.inc !== antes.inc || ext.expAll !== antes.expAll || ext.final !== antes.final - cents || ext.recon !== 0) bad('transferência externa: só muda saldo e transferências', `${valor}`);
        cnt.transferencias = (cnt.transferencias || 0) + 1;
      }
    }
    return { out, cnt };
  }, [packs]);
  const nomes = ['reconciliação', 'categorias=despesas', 'barras receitas', 'barras despesas', 'sem filtro: despesas filtradas=totais', 'filtro: despesas=categorias escolhidas', 'filtro de categorias não altera saldos', 'combinado = soma das contas', 'futuros não alteram', 'continuidade entre meses', 'transferência interna não altera o combinado', 'transferência interna é contada à parte', 'transferência externa: só muda saldo e transferências'];
  const rotulo = { 'reconciliação': 'saldo final − inicial = receitas − despesas + transferências externas (regras 1, 2 e 3)', 'categorias=despesas': 'a soma das categorias é igual às despesas', 'barras receitas': 'a soma das barras de receitas é igual às receitas', 'barras despesas': 'a soma das barras de despesas é igual às despesas', 'sem filtro: despesas filtradas=totais': 'sem filtro de categoria, despesas = despesas totais', 'filtro: despesas=categorias escolhidas': 'com filtro, despesas = soma das categorias escolhidas', 'filtro de categorias não altera saldos': 'o filtro de categorias NÃO altera saldos, receitas nem transferências (regra 7)', 'combinado = soma das contas': 'saldo combinado = soma dos saldos de cada conta, dia a dia (regra 3)', 'futuros não alteram': 'movimentos futuros não alteram nada (regra 4)', 'continuidade entre meses': 'saldo final de um mês = saldo inicial do seguinte', 'transferência interna não altera o combinado': 'transferência entre contas escolhidas não altera saldo combinado, receitas, despesas (regras 1 e 3)', 'transferência interna é contada à parte': 'transferência interna é contada à parte', 'transferência externa: só muda saldo e transferências': 'transferência para fora da seleção muda o saldo, mas não é receita nem despesa (regras 1 e 2)' };
  for (const n of nomes) R(`${rotulo[n]}`, !res.out[n], res.out[n] ? `${res.out[n].n} falhas. Ex.: ${res.out[n].ex}` : '');
  console.log('   contagens:', JSON.stringify(res.cnt));
  fim(q.errs); await b.close();
})();
