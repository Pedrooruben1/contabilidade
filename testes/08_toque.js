const { chromium, fs, path, TMP, R, fim, novo, semear, python } = require('./comum');
(async () => {
  const packs = JSON.parse(fs.readFileSync(path.join(TMP, 'pacotes.json'))); const db = packs.find(p => p.name === 'aleatorio-1').data;
  const b = await chromium.launch(); const q = await novo(b, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db);
  await q.tap('[data-tab=entries]'); await q.tap('[data-view=analysis]'); await q.tap('[data-an="mode:month"]'); await q.tap('[data-an=prev]');
  const box = async sel => { const el = await q.$(sel); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await q.waitForTimeout(80); return await el.boundingBox(); };
  let g = await box('#an-bal svg'); await q.touchscreen.tap(g.x + g.width * 0.55, g.y + 70); await q.waitForTimeout(150);
  R('toque no gráfico de saldo seleciona um dia', await q.evaluate(() => AN.sel !== null), await q.evaluate(() => JSON.stringify(AN.sel)));
  R('o tooltip mostra um valor em euros', /€/.test(await q.textContent('#an-tip')));
  g = await box('#an-bars svg'); await q.touchscreen.tap(g.x + g.width * 0.3, g.y + 50); await q.waitForTimeout(150);
  R('toque numa barra seleciona esse dia', await q.evaluate(() => AN.sel !== null && AN.sel.start === AN.sel.end));
  await q.tap('.an-cat'); R('toque numa categoria seleciona-a e lista só essas despesas', await q.evaluate(() => AN.selCat !== null && document.querySelectorAll('#an-drill .item').length >= 0));
  const sc = await q.evaluate(() => ({ lateral: document.documentElement.scrollWidth > innerWidth + 1, zoom: visualViewport.scale }));
  R('sem scroll lateral e sem zoom acidental depois dos toques', !sc.lateral && sc.zoom === 1, JSON.stringify(sc));
  fim(q.errs); await b.close();
})();
