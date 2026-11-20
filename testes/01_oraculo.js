// Compara o cálculo da app (anCompute) com o cálculo INDEPENDENTE em Python (oracle.py), em cêntimos exatos.
const { chromium, fs, path, TMP, R, fim, novo, semear, python } = require('./comum');
const CAMPOS = ['range', 'prev', 'elapsed', 'init', 'final', 'estInit', 'estFinal', 'inc', 'expAll', 'exp', 'trIn', 'trOut', 'save', 'n', 'nInt', 'byCat', 'buckets', 'series', 'winStart', 'winEnd', 'prevAgg'];
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
(async () => {
  const pacotes = path.join(TMP, 'pacotes.json'), esperado = path.join(TMP, 'esperado.json');
  console.log(python('cenarios.py', pacotes).toString().trim()); python('executar_oraculo.py', pacotes, esperado);
  const packs = JSON.parse(fs.readFileSync(pacotes)), exp = JSON.parse(fs.readFileSync(esperado));
  const b = await chromium.launch(); const q = await novo(b); await semear(q, { accounts: [], entries: [], budgets: [], goals: [], recurring: [], invest: [] });
  let totalCen = 0, estimados = 0, comNegativos = 0, futuros = 0;
  for (let i = 0; i < packs.length; i++) {
    const p = packs[i];
    const got = await q.evaluate(([data, today, cens]) => cens.map(c => { const m = anCompute({ db: data, today, mode: c.mode, anchor: c.anchor, accs: c.accs ? new Set(c.accs) : null, cats: c.cats ? new Set(c.cats) : null, win: c.win }); return { ...m, buckets: m.buckets.map(x => ({ inc: x.inc, exp: x.exp, start: x.start, end: x.end })) }; }), [p.data, p.today, p.scenarios]);
    let bad = 0, first = '';
    got.forEach((g, k) => { for (const f of CAMPOS) if (JSON.stringify(canon(g[f])) !== JSON.stringify(canon(exp[i][k][f]))) { bad++; if (!first) first = `cenário ${JSON.stringify(p.scenarios[k])} campo ${f}: app=${JSON.stringify(g[f]).slice(0, 120)} esperado=${JSON.stringify(exp[i][k][f]).slice(0, 120)}`; break; } });
    totalCen += got.length; estimados += got.filter(g => g.estInit || g.series.some(s => s.est)).length; comNegativos += got.filter(g => g.series.some(s => s.bal < 0)).length; futuros += p.scenarios.filter(c => c.anchor > p.today).length;
    R(`${p.name}: ${got.length} cenários iguais ao cálculo independente (cêntimo a cêntimo)`, bad === 0, bad ? `${bad} diferenças. Primeira: ${first}` : '');
  }
  console.log(`   (${totalCen} cenários no total | ${estimados} com saldos estimados | ${comNegativos} com saldos negativos | ${futuros} em períodos futuros)`);
  R('há cenários com saldos estimados, negativos e futuros (a cobertura é real)', estimados > 50 && comNegativos > 50 && futuros > 20);
  // «teste do teste»: um erro de 1 cêntimo (num saldo, num valor da série ou numa categoria) tem de ser detetado
  const alvo = await q.evaluate(([data, today, c]) => anCompute({ db: data, today, mode: c.mode, anchor: c.anchor, accs: null, cats: null, win: 7 }), [packs[0].data, packs[0].today, { mode: 'month', anchor: packs[0].today }]);
  const ref = exp[0].findIndex((e, k) => packs[0].scenarios[k].mode === 'month' && packs[0].scenarios[k].anchor === packs[0].today && !packs[0].scenarios[k].accs && !packs[0].scenarios[k].cats);
  const dif = (m) => CAMPOS.some(f => JSON.stringify(canon(m[f])) !== JSON.stringify(canon(exp[0][ref][f])));
  R('referência de controlo: sem alterações não há diferenças', !dif(alvo));
  const m1 = JSON.parse(JSON.stringify(alvo)); m1.init += 1; R('teste do teste: +1 cêntimo no saldo inicial é detetado', dif(m1));
  const m2 = JSON.parse(JSON.stringify(alvo)); m2.series[m2.series.length - 1].bal -= 1; R('teste do teste: -1 cêntimo num ponto do gráfico é detetado', dif(m2));
  const m3 = JSON.parse(JSON.stringify(alvo)); const k0 = Object.keys(m3.byCat)[0]; m3.byCat[k0] += 1; R('teste do teste: +1 cêntimo numa categoria é detetado', dif(m3));
  const m4 = JSON.parse(JSON.stringify(alvo)); m4.series[0].est = !m4.series[0].est; R('teste do teste: trocar «estimado» por «confirmado» é detetado', dif(m4));
  fim(q.errs); await b.close();
})();
