// Desempenho com milhares de movimentos (5 000 e 20 000), em telemóvel simulado com CPU 4x mais lento.
const { chromium, fs, path, TMP, R, fim, novo, semear, python } = require('./comum');
const cp = require('child_process');
(async () => {
  const b = await chromium.launch(); const todos = [];
  for (const N of [5000, 20000]) {
    const f = path.join(TMP, `grande-${N}.json`);
    cp.execFileSync('python3', ['-I', '-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(__dirname)}); from gen import gerar; json.dump(gerar(77, n_entries=${N}, dias_atras=1500, contas=8), open(${JSON.stringify(f)}, 'w'))`]);
    const db = JSON.parse(fs.readFileSync(f)); const q = await novo(b); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db); todos.push(q);
    const cdp = await q.ctx.newCDPSession(q); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // simula um telemóvel bem mais lento que este computador
    await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-grid');
    const t = await q.evaluate(() => {
      const med = a => a.sort((x, y) => x - y)[a.length >> 1], r = { compute: {}, render: {} };
      for (const m of ['day', 'week', 'month', 'year']) { const a = [], rr = []; AN.mode = m; for (let i = 0; i < 9; i++) { let s = performance.now(); anCompute({ db, today: today(), mode: m, anchor: today(), accs: null, cats: null, win: 30 }); a.push(performance.now() - s); s = performance.now(); render(true); rr.push(performance.now() - s); } r.compute[m] = Math.round(med(a)); r.render[m] = Math.round(med(rr)); }
      AN.mode = 'year'; render(true); const c = document.getElementById('an-bal'); const sc = []; for (let i = 0; i < 200; i++) { const rc = c.querySelector('svg').getBoundingClientRect(); const s = performance.now(); anScrub(c, rc.left + rc.width * (i / 200), false); sc.push(performance.now() - s); }
      r.scrub = +(sc.reduce((s, x) => s + x, 0) / sc.length).toFixed(2); r.scrubMax = +Math.max(...sc).toFixed(1); r.nos = document.getElementById('view').getElementsByTagName('*').length; r.pontos = AN.model.series.length;
      const lim = performance.now(); AN.accs = new Set(db.accounts.slice(0, 4).map(a => a.id)); AN.cats = new Set(['lazer', 'saude']); render(true); r.filtrado = Math.round(performance.now() - lim); return r;
    });
    console.log(`   ${N} movimentos (CPU 4x mais lento): cálculo ms ${JSON.stringify(t.compute)} | desenho ms ${JSON.stringify(t.render)} | arrastar ${t.scrub} ms/movimento (máx ${t.scrubMax}) | filtros ${t.filtrado} ms | ${t.nos} elementos | ${t.pontos} pontos no gráfico`);
    const lim = N === 5000 ? { c: 120, r: 300 } : { c: 400, r: 900 };
    R(`${N} movimentos: o cálculo de qualquer período demora menos de ${lim.c} ms`, Object.values(t.compute).every(x => x < lim.c), JSON.stringify(t.compute));
    R(`${N} movimentos: desenhar a Análise demora menos de ${lim.r} ms`, Object.values(t.render).every(x => x < lim.r) && t.filtrado < lim.r, JSON.stringify(t.render));
    R(`${N} movimentos: arrastar o dedo pelo gráfico é fluido (média abaixo de 8 ms, 60 imagens por segundo = 16 ms)`, t.scrub < 8, `(${t.scrub} ms)`);
    R(`${N} movimentos: a página não fica pesada (menos de 3 000 elementos)`, t.nos < 3000, `(${t.nos})`);
  }
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
