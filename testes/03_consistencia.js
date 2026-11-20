// Consistência entre ecrãs: Início, Contas, Orçamentos, Movimentos (lista) e Análise têm de mostrar os mesmos valores.
const { chromium, fs, path, TMP, R, fim, novo, semear, python, igual } = require('./comum');
(async () => {
  const pacotes = path.join(TMP, 'pacotes.json'); python('cenarios.py', pacotes);
  const pack = JSON.parse(fs.readFileSync(pacotes)).find(p => p.name === 'aleatorio-3');
  const db = pack.data; db.budgets = [{ id: 'b1', category: 'alimentacao', limit: 300 }, { id: 'b2', category: 'transportes', limit: 150 }, { id: 'b3', category: 'lazer', limit: 80 }];
  const b = await chromium.launch(); const q = await novo(b); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db);
  const cartao = async rot => q.evaluate(rot => { const c = [...document.querySelectorAll('.an-card')].find(x => x.querySelector('span').textContent.trim() === rot); return c ? c.querySelector('b').textContent.trim() : null; }, rot);
  const abrirAnalise = async () => { await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-grid'); await q.click('[data-an="mode:month"]'); };
  const filtro = async (accs, cats) => { await q.evaluate(([a, c]) => { AN.accs = a ? new Set(a) : null; AN.cats = c ? new Set(c) : null; anResetSel(); render(true); }, [accs, cats]); };

  // Início (cartões do mês) = Análise (mês atual, todas as contas)
  const home = await q.evaluate(() => [...document.querySelectorAll('.mgrid > div')].map(c => ({ t: c.querySelector('.lbl').textContent.replace(/^[^A-Za-zÀ-ú]+/, '').trim(), v: c.querySelector('b').textContent.trim() })));
  const hRec = home.find(x => x.t.startsWith('Receitas')).v, hDes = home.find(x => x.t.startsWith('Despesas')).v;
  await abrirAnalise();
  R('Receitas do mês: Início = Análise', (await cartao('Receitas')) === hRec, `(${hRec})`); R('Despesas do mês: Início = Análise', (await cartao('Despesas')) === hDes, `(${hDes})`);

  // Contas: o saldo de cada conta = Saldo final da Análise filtrada por essa conta (período que inclui hoje)
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]');
  const contas = await q.evaluate(() => [...document.querySelectorAll('[data-edit-account]')].map(b => ({ id: b.dataset.editAccount, txt: b.querySelector('.amt').textContent.trim() })));
  let okContas = true, ex = '';
  for (const c of contas) { await abrirAnalise(); await filtro([c.id], null); const v = await cartao('Saldo final'); if (v !== c.txt) { okContas = false; ex = `${c.id}: Contas=${c.txt} Análise=${v}`; break; } await q.click('[data-tab=accounts]'); }
  R(`Saldo de cada uma das ${contas.length} contas: Contas = Análise (Saldo final)`, okContas, ex);
  await abrirAnalise(); await filtro(null, null);
  const totalApp = await q.evaluate(() => Math.round(db.accounts.reduce((s, a) => s + balance(a), 0) * 100)); const totalAn = await q.evaluate(() => AN.model.final);
  R('Soma dos saldos de todas as contas (balance) = Saldo final combinado da Análise, ao cêntimo', totalApp === totalAn, `(${totalApp} vs ${totalAn})`);

  // Início e Contas → Património: «Disponível» e «Poupança» = Análise por tipo de conta (v24: o quadro do património está em Contas → Património)
  await q.click('[data-tab=home]'); const heroDisp = (await q.textContent('.hero b')).trim(), heroPoup = (await q.evaluate(() => document.querySelector('.hero div strong').textContent)).trim();
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=inv]'); const pat = await q.evaluate(() => [...document.querySelectorAll('.kv > div')].map(d => ({ t: d.querySelector('span').textContent, v: d.querySelector('b').textContent.trim() })));
  R('Início (cartão verde) = Contas → Património: «Disponível» e «Poupança»', heroDisp === pat.find(x => x.t === 'Disponível').v && heroPoup === pat.find(x => x.t === 'Poupança').v, `(${heroDisp} / ${heroPoup})`);
  await abrirAnalise(); await q.click('[data-an=accs]'); await q.click('[data-an="accs:spend"]'); await q.click('[data-act=cancel]'); const disp = await cartao('Saldo final');
  R('«Disponível para gastar» do Início = Saldo final da Análise (contas à ordem + dinheiro)', disp === pat.find(x => x.t === 'Disponível').v, `(${disp})`);
  await q.click('[data-an=accs]'); await q.click('[data-an="accs:save"]'); await q.click('[data-act=cancel]'); const poup = await cartao('Saldo final');
  R('«Poupança» do Início = Saldo final da Análise (contas poupança)', poup === pat.find(x => x.t === 'Poupança').v, `(${poup})`);
  await q.evaluate(() => { AN.accs = null; render(true); });

  // (v24: o gráfico «Evolução do saldo» saiu do Início; fica só o da Análise, verificado pelos testes 01, 03 e 09)

  // Orçamentos: gasto de cada categoria no mês = valor da categoria na Análise
  await q.click('[data-tab=budgets]'); const orc = await q.evaluate(() => [...document.querySelectorAll('[data-edit-budget]')].map(b => ({ id: b.dataset.editBudget, txt: b.textContent })));
  await abrirAnalise(); await filtro(null, null);
  const catTxt = await q.evaluate(() => Object.fromEntries([...document.querySelectorAll('.an-cat')].map(b => [b.dataset.an.split(':')[1], b.querySelector('.between > span:last-child').childNodes[0].textContent.trim()])));
  const map = { b1: 'alimentacao', b2: 'transportes', b3: 'lazer' }; let okOrc = true, exo = '';
  for (const o of orc) { const t = catTxt[map[o.id]] || anZero; const esperado = t || '0,00\u00a0€'; if (!o.txt.includes(esperado + ' /')) { okOrc = false; exo = `${map[o.id]}: orçamento mostra "${o.txt.slice(0, 60)}", análise ${t}`; } }
  R('Gasto de cada categoria com orçamento: Orçamentos = Análise (categorias)', okOrc, exo);

  // Movimentos (lista, mês atual) = Análise (receitas, despesas, resultado) — e os movimentos futuros não entram em nenhum
  await q.click('[data-tab=entries]'); await q.click('[data-view=list]'); await q.selectOption('[data-f=month]', '2026-11'); await q.waitForSelector('#elist .kv');
  const lista = await q.evaluate(() => [...document.querySelectorAll('#elist .kv > div')].map(d => d.querySelector('b').textContent.trim()));
  await q.click('[data-view=analysis]'); await q.waitForSelector('.an-grid');
  R('Totais do mês na lista Movimentos = Análise (receitas, despesas, resultado)', igual(lista, [await cartao('Receitas'), await cartao('Despesas'), await cartao('Resultado líquido')]), `(${lista.join(' | ')})`);
  const fut = await q.evaluate(() => db.entries.filter(e => e.date > today() && e.date.startsWith('2026-11')).length);
  R('há movimentos futuros neste mês (a verificação é real) e não contam em lado nenhum', fut > 0, `(${fut} movimentos agendados)`);
  await q.click('[data-view=list]'); R('a lista identifica os movimentos agendados', (await q.textContent('#elist')).includes('agendado'));

  // Recorrentes: sem duplicações, e entram na Análise como movimentos normais
  const q2 = await novo(b); await q2.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00'));
  await semear(q2, { accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 1000 }], entries: [], budgets: [], goals: [], invest: [], recurring: [{ id: 'r', name: 'Ginásio', kind: 'expense', amount: 30.5, accountId: 'a', destId: null, category: 'desporto', freq: 'monthly', next: '2026-08-15', day: 15, active: true }] });
  for (let i = 0; i < 3; i++) await q2.reload();
  const rec = await q2.evaluate(() => ({ datas: db.entries.filter(e => e.recId).map(e => e.date), m: anCompute({ db, today: today(), mode: 'year', anchor: today(), accs: null, cats: null, win: 7 }) }));
  R('recorrente: 3 movimentos (ago, set, out; o de nov ainda é futuro), sem duplicados depois de reabrir 3 vezes', igual(rec.datas, ['2026-08-15', '2026-09-15', '2026-10-15']), JSON.stringify(rec.datas));
  R('recorrente: a Análise soma exatamente 3 × 30,50 € = 91,50 €', rec.m.expAll === 9150 && rec.m.final === 100000 - 9150, `(${rec.m.expAll})`);
  fim([...q.errs, ...q2.errs]); await b.close();
})();
const anZero = '';
