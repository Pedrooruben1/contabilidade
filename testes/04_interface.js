// Interface da Análise: seletor, períodos, filtros, gráficos interativos, vista diária, estimativas, privacidade, ecrã pequeno e acessibilidade.
const { chromium, fs, path, TMP, R, fim, novo, semear, python, igual, vazio } = require('./comum');
let axeSrc = null; try { axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) {}
(async () => {
  const pacotes = path.join(TMP, 'pacotes.json'); python('cenarios.py', pacotes);
  const packs = JSON.parse(fs.readFileSync(pacotes)), P = n => JSON.parse(JSON.stringify(packs.find(p => p.name === n).data));
  const b = await chromium.launch(); const todos = [];
  const mk = async (db, opt = {}, semOpt = {}) => { const q = await novo(b, opt); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db, semOpt); todos.push(q); return q; };
  const abrir = async q => { await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-nav'); };
  const lbl = q => q.textContent('.an-nav .lbl').then(t => t.trim()); const modo = (q, m) => q.click(`[data-an="mode:${m}"]`);
  const cartao = (q, rot) => q.evaluate(rot => { const c = [...document.querySelectorAll('.an-card')].find(x => x.querySelector('span').textContent.trim() === rot); return c ? c.querySelector('b').textContent.trim() : null; }, rot);
  const dados = P('aleatorio-3');

  // A) estrutura e integração
  let q = await mk(dados);
  R('a barra de baixo continua a ter só os 5 separadores', (await q.$$('#tabs button')).length === 5);
  R('atalho «Ver análise completa» no Início', await q.isVisible('[data-act=open-analysis]'));
  await q.click('[data-act=open-analysis]'); await q.waitForSelector('.an-nav');
  R('o atalho abre Movimentos → Análise', await q.evaluate(() => ui.view === 'analysis' && tab === 'entries'));
  await q.click('[data-view=list]'); R('«Movimentos» mantém a lista (pesquisa, filtros e movimentos)', await q.isVisible('#q') && await q.isVisible('[data-f=month]') && (await q.$$('#elist .item')).length > 20);
  await q.fill('#q', 'zzzz'); await q.click('[data-view=analysis]'); await q.click('[data-view=list]'); R('a pesquisa da lista mantém-se ao alternar de vista', (await q.inputValue('#q')) === 'zzzz');
  await q.fill('#q', ''); await q.click('[data-view=analysis]');
  R('períodos: Dia, Semana, Mês, Ano', igual(await q.$$eval('.an-modes button', bs => bs.map(x => x.textContent.trim())), ['Dia', 'Semana', 'Mês', 'Ano']));

  // B) períodos e setas
  await modo(q, 'month'); R('mês atual: novembro de 2026', (await lbl(q)) === 'novembro de 2026'); R('«seguinte» desativado no período atual', await q.isDisabled('[data-an=next]'));
  await q.click('[data-an=prev]'); R('seta anterior: outubro de 2026', (await lbl(q)) === 'outubro de 2026'); R('aparece «Voltar a hoje»', await q.isVisible('[data-an=today]'));
  for (let i = 0; i < 9; i++) await q.click('[data-an=prev]'); R('9 setas atrás: janeiro de 2026', (await lbl(q)) === 'janeiro de 2026'); await q.click('[data-an=prev]'); R('virada de ano: dezembro de 2025', (await lbl(q)) === 'dezembro de 2025');
  await q.click('[data-an=next]'); R('seta seguinte: janeiro de 2026', (await lbl(q)) === 'janeiro de 2026'); await q.click('[data-an=today]'); R('«Voltar a hoje»', (await lbl(q)) === 'novembro de 2026' && !(await q.isVisible('[data-an=today]')));
  const gama = () => q.evaluate(() => [AN.model.range.start, AN.model.range.end]);
  await modo(q, 'week'); R('semana começa à segunda-feira: 2 a 8 de novembro de 2026 (hoje é sexta, 6 nov)', igual(await gama(), ['2026-11-02', '2026-11-08']), JSON.stringify(await gama())); await q.click('[data-an=prev]'); R('semana anterior atravessa meses: 26 out a 1 nov 2026', igual(await gama(), ['2026-10-26', '2026-11-01']), JSON.stringify(await gama()));
  const semAno = await q.evaluate(() => { const r = anRange('week', '2025-01-02'); const p = anShift('week', '2025-01-02', -1); return [r.start, r.end, anRange('week', p).start]; }); R('semana que atravessa o ano: 30 dez 2024 a 5 jan 2025', igual(semAno, ['2024-12-30', '2025-01-05', '2024-12-23']), JSON.stringify(semAno));
  await modo(q, 'year'); R('ano atual: 2026', (await lbl(q)) === '2026'); await q.click('[data-an=prev]'); R('ano anterior: 2025', (await lbl(q)) === '2025'); await q.click('[data-an=today]');
  await modo(q, 'day'); R('dia: sexta-feira, 6 de novembro de 2026', (await lbl(q)) === 'sexta-feira, 6 de novembro de 2026', await lbl(q)); await q.click('[data-an=prev]'); R('dia anterior: quinta-feira, 5 de novembro de 2026', (await lbl(q)) === 'quinta-feira, 5 de novembro de 2026');
  await q.click('[data-an=today]'); await modo(q, 'month');

  // C) filtros de contas e categorias
  await q.click('[data-an=accs]'); const nomes = await q.$$eval('.chk .nm', x => x.map(e => e.textContent.trim())); R('lista de contas com caixas de seleção (nenhuma escolhida = todas)', nomes.length === 6 && (await q.$$('.chk input:checked')).length === 0);
  const ids = await q.$$eval('[data-an-acc]', x => x.map(e => e.dataset.anAcc)); for (const id of ids.slice(2)) await q.check(`[data-an-acc="${id}"]`);
  const exp5 = await q.evaluate(ids => { const m = anCompute({ db, today: today(), mode: 'month', anchor: today(), accs: new Set(ids.slice(2)), cats: null, win: 7 }); return anEur(m.final); }, ids);
  await q.click('[data-act=cancel]'); R('várias contas: o resumo atualiza-se (saldo final de 4 contas)', (await cartao(q, 'Saldo final')) === exp5, exp5); R('o botão mostra «4 contas»', (await q.textContent('[data-an=accs]')).includes('4 contas'));
  R('«Limpar filtros» aparece', await q.isVisible('[data-an=clear]')); await q.click('[data-an=clear]'); R('«Limpar filtros» repõe tudo', !(await q.isVisible('[data-an=clear]')) && (await q.textContent('[data-an=accs]')).includes('Todas as contas'));
  await q.click('[data-an=accs]'); await q.click('[data-an="accs:spend"]'); R('atalho «Disponível» marca só contas à ordem e dinheiro', await q.evaluate(() => [...AN.accs].every(id => ['ordem', 'carteira'].includes(db.accounts.find(a => a.id === id).kind)))); await q.click('[data-act=cancel]'); await q.click('[data-an=clear]');
  const saldoAntes = [await cartao(q, 'Saldo inicial'), await cartao(q, 'Saldo final')], serieAntes = await q.evaluate(() => JSON.stringify(AN.model.series));
  await q.click('[data-an=cats]'); await q.check('[data-an-cat="alimentacao"]'); await q.click('[data-act=cancel]');
  R('filtro por categoria: o saldo inicial e final da conta NÃO mudam', igual([await cartao(q, 'Saldo inicial'), await cartao(q, 'Saldo final')], saldoAntes)); R('filtro por categoria: o gráfico de saldo NÃO muda', (await q.evaluate(() => JSON.stringify(AN.model.series))) === serieAntes);
  R('filtro por categoria: receitas/resultado/taxa escondidos e aviso presente', (await cartao(q, 'Receitas')) === null && (await cartao(q, 'Resultado líquido')) === null && (await q.$$eval('.alert.info', x => x.map(e => e.textContent).join(' '))).includes('saldo real não depende'));
  R('filtro por categoria: «Despesas (categorias escolhidas)» = categoria na lista', (await cartao(q, 'Despesas (categorias escolhidas)')) !== null && (await q.$$('.an-cat')).length <= 1);
  await q.click('[data-an=cats]'); await q.uncheck('[data-an-cat="alimentacao"]'); R('desmarcar a única categoria volta a «todas»', (await q.textContent('[data-an=cats]')).includes('Todas as categorias')); await q.click('[data-act=cancel]');

  // D) gráficos: tocar, arrastar, teclado, movimentos por baixo
  await modo(q, 'month'); await q.click('[data-an=prev]'); await q.click('[data-an=prev]'); // setembro: período completo
  const box = async sel => { const el = await q.$(sel); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await q.waitForTimeout(60); return await el.boundingBox(); }; let g = await box('#an-bal svg');
  const modelo = () => q.evaluate(() => ({ s: AN.model.series.map(p => [p.d, p.bal, p.est]), range: AN.model.range }));
  let mdl = await modelo(); const alvo = Math.floor(mdl.s.length * 0.5); const px = g.x + (8 + (alvo / (mdl.s.length - 1)) * (340 - 16)) / 340 * g.width;
  await q.mouse.click(px, g.y + 60); await q.waitForTimeout(100); const tip = await q.textContent('#an-tip');
  const esperadoTip = await q.evaluate(i => anTipBal(AN.model, i).replace(/<[^>]+>/g, ''), alvo);
  R('tocar num ponto do gráfico mostra a data e o saldo desse dia', tip.trim() === esperadoTip.trim() || tip.includes(mdl.s[alvo][0].slice(8)) , tip.trim().slice(0, 70));
  const diaSel = await q.evaluate(() => AN.sel && AN.sel.start); const esperadoN = await q.evaluate(d => db.entries.filter(e => e.date === d && (AN.model.accounts.includes(e.accountId) || AN.model.accounts.includes(e.destId))).length, diaSel);
  R('os movimentos desse dia aparecem por baixo (mesmo número que nos dados)', (await q.$$('#an-drill .item')).length === esperadoN, `(${esperadoN} movimentos em ${diaSel})`);
  await q.mouse.click(px, g.y + 60); R('tocar outra vez no mesmo ponto limpa a seleção', await q.evaluate(() => AN.sel === null));
  // arrastar
  g = await box('#an-bal svg'); await q.mouse.move(g.x + 20, g.y + 50); await q.mouse.down(); await q.mouse.move(g.x + g.width * 0.7, g.y + 50, { steps: 5 }); const tipDrag = await q.textContent('#an-tip'); await q.mouse.up();
  R('arrastar o dedo pelo gráfico percorre os dias', tipDrag.trim().length > 10 && tipDrag !== tip); R('o saldo de cada dia do gráfico aparece como «subiu»/«desceu» no tooltip', /[▲▼]|sem alteração/.test(tipDrag));
  await q.click('[data-an=clearsel]').catch(() => {});
  // barras
  g = await box('#an-bars svg'); mdl = await q.evaluate(() => ({ nb: AN.model.buckets.length, bk: AN.model.buckets.map(b => [b.start, b.end]) })); const ib = 10; const bx = g.x + (8 + (ib + 0.5) * (324 / mdl.nb)) / 340 * g.width;
  await q.mouse.click(bx, g.y + 40); await q.waitForTimeout(100); const selB = await q.evaluate(() => AN.sel); const nB = await q.evaluate(([s, e]) => db.entries.filter(x => x.date >= s && x.date <= e && x.date <= today() && (AN.model.accounts.includes(x.accountId) || AN.model.accounts.includes(x.destId))).length, [selB.start, selB.end]);
  R('tocar numa barra seleciona esse dia e lista os seus movimentos', selB.start === mdl.bk[ib][0] && (await q.$$('#an-drill .item')).length === nB, `(${selB.start}: ${nB})`);
  R('o ponto do gráfico de saldo acompanha a barra escolhida', (await q.textContent('#an-tip')).includes(String(+selB.start.slice(8)))); await q.click('[data-an=clearsel]');
  // categorias
  const cat0 = await q.$eval('.an-cat', e => e.dataset.an.split(':')[1]); await q.click('.an-cat'); const nC = await q.evaluate(c => db.entries.filter(e => e.kind === 'expense' && e.category === c && e.date >= AN.model.range.start && e.date <= AN.model.range.end && e.date <= today() && AN.model.accounts.includes(e.accountId)).length, cat0);
  R('tocar numa categoria lista só as despesas dessa categoria no período', (await q.$$('#an-drill .item')).length === Math.min(nC, 100), `(${cat0}: ${nC})`); await q.click('.an-cat'); R('tocar outra vez na categoria limpa a seleção', await q.evaluate(() => AN.selCat === null));
  // teclado
  await q.focus('#an-bal'); await q.keyboard.press('ArrowLeft'); await q.waitForTimeout(100); const k1 = await q.evaluate(() => AN.sel && AN.sel.start); await q.keyboard.press('ArrowLeft'); await q.waitForTimeout(100); const k2 = await q.evaluate(() => AN.sel && AN.sel.start);
  R('teclado: as setas ← mudam de dia e o foco mantém-se no gráfico', k1 && k2 && k2 < k1 && await q.evaluate(() => document.activeElement.id === 'an-bal'), `(${k1} → ${k2})`);
  await q.click('[data-an="bstep:1"]'); R('botões ‹ › também mudam de dia', await q.evaluate(() => AN.sel && AN.sel.start) === k1);
  // editar um movimento a partir da lista da análise
  await q.evaluate(() => { const d = AN.model.series.map(p => p.d).find(x => db.entries.some(e => e.date === x && e.kind !== 'transfer' && AN.model.accounts.includes(e.accountId))); AN.sel = { start: d, end: d }; render(true); });
  if (await q.$('#an-drill .item')) { const antes = await q.evaluate(() => AN.model.final); await q.click('#an-drill [data-edit-entry]:not(:has-text("→"))'); await q.fill('[name=amount]', '1,11'); await q.click('[data-act=save]'); await q.waitForSelector('.an-nav');
    R('editar um movimento na lista da análise atualiza os números e mantém a seleção', await q.evaluate(a => AN.sel !== null && AN.model.final !== a, antes)); }

  // E) vista diária: cartões, movimentos do dia, 7 dias e 30 dias
  await q.click('[data-an=today]').catch(() => {}); await modo(q, 'day'); await q.click('[data-an=prev]');
  R('vista diária: cartões do dia e movimentos do dia (lista visível sem tocar em nada)', (await cartao(q, 'Saldo inicial')) !== null && await q.isVisible('#an-drill h2'));
  R('vista diária: gráfico compacto dos últimos 7 dias', (await q.evaluate(() => AN.model.series.length)) === 7 && await q.isVisible('[data-an="win:7"][aria-pressed=true]'));
  await q.click('[data-an="win:30"]'); R('vista diária: expandir para 30 dias', (await q.evaluate(() => AN.model.series.length)) === 30);
  const antesDia = await lbl(q); g = await box('#an-bal svg'); await q.mouse.click(g.x + g.width * 0.5, g.y + 60); R('vista diária: tocar num ponto muda o dia mostrado', (await lbl(q)) !== antesDia, `(${antesDia} → ${await lbl(q)})`);
  R('vista diária: sem gráfico de barras (os movimentos do dia são a lista)', !(await q.$('#an-bars')));

  // F) saldos estimados: identificados; sem estimativa quando há dados
  q = await mk(P('primeiro-movimento-tardio')); await abrir(q); await modo(q, 'year');
  R('contas sem histórico: aviso «Saldos estimados» visível', (await q.textContent('.alert.info')).includes('Saldos estimados') && (await q.textContent('#view')).includes('estimado'));
  R('a legenda mostra «estimado» e o gráfico tem zona tracejada', await q.isVisible('.an-leg .dash') && !!(await q.$('#an-bal rect[fill="url(#anh)"]')));
  await q.evaluate(() => { AN.sel = { start: '2026-02-10', end: '2026-02-10' }; render(true); }); R('o saldo de um dia antigo diz «(estimado)»', (await q.textContent('#an-tip')).includes('estimado'));
  R('o saldo final de hoje nunca é estimado', !(await q.evaluate(() => AN.model.estFinal)));
  await modo(q, 'week'); R('uma semana recente com dados confirmados não mostra aviso', !(await q.textContent('#view')).includes('Saldos estimados') || (await q.evaluate(() => AN.model.estNames.length)) > 0);
  q = await mk(P('aleatorio-1')); await abrir(q); await modo(q, 'month'); R('com histórico completo não há aviso de estimativa', !(await q.textContent('#view')).includes('Saldos estimados'));

  // G) modo privado: gráficos, valores e conclusões completamente escondidos
  q = await mk(dados, {}, { privacidade: true }); await abrir(q);
  const vis = await q.evaluate(() => ({ svg: document.querySelectorAll('#view svg').length, cards: document.querySelectorAll('.an-card').length, tip: !!document.getElementById('an-tip'), euros: /\d[\d\s.,]*\s?€/.test(document.getElementById('view').textContent), lock: !!document.querySelector('.an-lock') }));
  R('modo privado: nenhum gráfico, cartão, valor em euros ou tooltip', vis.svg === 0 && vis.cards === 0 && !vis.tip && !vis.euros && vis.lock, JSON.stringify(vis));
  R('modo privado: os controlos (período e filtros) continuam disponíveis', await q.isVisible('.an-nav') && await q.isVisible('[data-an=accs]'));
  const olho = await (await q.$('#eye')).boundingBox(); await q.mouse.move(olho.x + 20, olho.y + 20); await q.mouse.down(); await q.waitForTimeout(150);
  R('premir o 👁️ mostra a análise', await q.evaluate(() => document.querySelectorAll('.an-card').length > 0 && document.querySelectorAll('#view svg').length > 0)); await q.mouse.up(); await q.waitForTimeout(150);
  R('largar volta a esconder tudo', await q.evaluate(() => document.querySelectorAll('#view svg').length === 0 && document.querySelectorAll('.an-card').length === 0));
  await q.focus('#eye'); await q.keyboard.press('Enter'); R('com teclado (Enter no olho) mostra durante 15 s', await q.evaluate(() => document.querySelectorAll('.an-card').length > 0));

  // H) ecrã pequeno, nomes compridos, alvos de toque
  q = await mk(dados, { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); await abrir(q);
  const folgas = []; for (const m of ['day', 'week', 'month', 'year']) { await modo(q, m); const o = await q.evaluate(() => ({ p: document.documentElement.scrollWidth > innerWidth + 1, v: [...document.querySelectorAll('#view *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('svg')).length })); if (o.p || o.v) folgas.push(`${m}: página=${o.p} elementos=${o.v}`); }
  await q.click('[data-an=accs]'); const so = await q.evaluate(() => { const s = document.getElementById('sheet'); return s.scrollWidth > s.clientWidth + 1; }); if (so) folgas.push('folha de contas com scroll lateral'); await q.click('[data-act=cancel]');
  R('320 px (conta com nome muito comprido): sem scroll lateral em nenhum período nem na lista de contas', folgas.length === 0, folgas.join(' | '));
  const pequenos = await q.evaluate(() => [...document.querySelectorAll('#view button, #tabs button, #add, #eye')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5) && !e.closest('.an-chart'); }).map(e => (e.getAttribute('data-an') || e.textContent.trim().slice(0, 14)) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  R('alvos de toque >= 44 px em toda a Análise', pequenos.length === 0, pequenos.slice(0, 6).join(' | '));

  // I) acessibilidade (axe-core) em claro e escuro, com a análise e com a folha de filtros abertas
  if (axeSrc) for (const esquema of ['light', 'dark']) {
    q = await mk(dados, { colorScheme: esquema, bypassCSP: true }); await abrir(q); const falhas = [];
    const correr = async nome => { await q.waitForTimeout(450); await q.addScriptTag({ content: axeSrc }); const v = await q.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(x => `${x.id}(${x.nodes.length}): ${x.nodes[0].html.slice(0, 70)}`)); v.forEach(x => falhas.push(`${nome}: ${x}`)); };
    for (const m of ['day', 'week', 'month', 'year']) { await modo(q, m); await correr(m); }
    await modo(q, 'month'); await q.click('.an-cat'); await correr('categoria selecionada'); await q.click('[data-an=accs]'); await correr('folha de contas'); await q.click('[data-act=cancel]');
    R(`axe-core (${esquema === 'light' ? 'claro' : 'escuro'}): 0 violações (dia, semana, mês, ano, seleção, folha de filtros)`, falhas.length === 0, falhas.slice(0, 4).join(' || '));
  } else R('axe-core instalado (npm i axe-core)', false);

  // J) estados vazios e ficheiro em falta
  q = await mk({ ...vazio(), accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 }] }); await abrir(q); R('sem movimentos: mensagem clara e sem gráficos', (await q.textContent('#view')).includes('Ainda não há movimentos para analisar') && !(await q.$('#view svg:not(.art)')));
  q = await mk(P('aleatorio-2')); await abrir(q); await modo(q, 'day'); for (let i = 0; i < 1200; i++) await q.evaluate(() => { AN.anchor = anAddDays(AN.anchor, -30); }); await q.evaluate(() => render(true));
  R('período muito antigo (sem movimentos): zeros e aviso, sem erros', (await q.textContent('#view')).includes('Sem movimentos neste período') && q.errs.length === 0);
  const q3 = await novo(b, { serviceWorkers: 'block' }); await q3.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await q3.route('**/analise.js', r => r.abort()); await semear(q3, dados); await q3.click('[data-tab=entries]'); await q3.click('[data-view=analysis]');
  R('se faltar o ficheiro analise.js, a app avisa em vez de partir', (await q3.textContent('#view')).includes('Falta o ficheiro analise.js')); todos.push(q3);
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
