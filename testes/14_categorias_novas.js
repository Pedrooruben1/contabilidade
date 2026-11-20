// v25 — 9 categorias novas. Mudar despesas antigas para estas categorias não pode dar erro nem mexer em saldos.
const { chromium, R, fim, vazio, novo, semear } = require('./comum.js');
const NOVAS = { cabeleireiro: 'Cabeleireiro e estética', ginasio: 'Ginásio', roupa: 'Roupa e calçado', automovel: 'Automóvel', cafes: 'Cafés e pequenos-almoços', presentes: 'Presentes', animais: 'Animais de estimação', educacao: 'Educação e formação', impostos: 'Impostos e taxas' };
const ANTIGAS = ['habitacao', 'alimentacao', 'restaurantes', 'transportes', 'compras', 'desporto', 'viagens', 'lazer', 'subscricoes', 'saude', 'investimentos', 'outros'];
(async () => {
  const b = await chromium.launch(); const errs = [];
  const q = await novo(b); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00'));
  // dados «antigos»: 9 despesas em categorias antigas, uma por cada categoria nova que vai receber
  const d = vazio(); d.accounts.push({ id: 'o', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'c', name: 'Carteira', kind: 'carteira', opening: 50 });
  const velhas = ['restaurantes', 'desporto', 'compras', 'transportes', 'restaurantes', 'compras', 'outros', 'lazer', 'outros'];
  Object.keys(NOVAS).forEach((k, i) => d.entries.push({ id: 'e' + i, date: '2026-11-0' + (1 + (i % 5)), kind: 'expense', amount: 10 + i + 0.35, accountId: i % 2 ? 'c' : 'o', destId: null, category: velhas[i], note: 'antiga ' + i, goalId: 'g', recId: null }));
  d.entries.push({ id: 'r', date: '2026-11-02', kind: 'income', amount: 1500, accountId: 'o', destId: null, category: 'outros', note: 'Salário', goalId: null, recId: null });
  d.goals.push({ id: 'g', name: 'Meta', target: 500, saved: 300, deadline: '', created: '2026-10-01', base: 300 });
  d.budgets.push({ id: 'b1', category: 'restaurantes', limit: 100 });
  await semear(q, d);
  R('as categorias antigas continuam todas lá', await q.evaluate(a => a.every(k => CATS[k]), ANTIGAS));
  R('as 9 categorias novas existem com o nome certo', await q.evaluate(n => Object.entries(n).every(([k, v]) => CATS[k] && CATS[k][0] === v), NOVAS));
  const antes = await q.evaluate(() => ({ saldos: db.accounts.map(a => balance(a)), disp: spendable(), meta: goalInfo(db.goals[0]).saved, desp: sumEntries('expense', '2026-11'), raw: JSON.parse(localStorage.getItem('poupanca-v2')) }));
  // mudar cada despesa antiga para uma categoria nova, pelo formulário (como o utilizador faz)
  await q.click('[data-tab=entries]'); let falhas = [];
  for (const [i, k] of Object.keys(NOVAS).entries()) {
    await q.click(`[data-edit-entry=e${i}]`);
    const tem = await q.locator(`#sheet [name=category] option[value=${k}]`).count();
    await q.selectOption('#sheet [name=category]', k); await q.click('#sheet [data-act=save]');
    try { await q.waitForSelector('#sheet-bg', { state: 'hidden', timeout: 3000 }); } catch (e) { falhas.push(k + ': o formulário não fechou'); await q.click('#sheet [data-act=cancel]'); }
    if (!tem) falhas.push(k + ': não aparece na lista');
  }
  R('mudar 9 despesas antigas para as categorias novas grava sem erro', falhas.length === 0 && q.errs.length === 0, falhas.join(' | ') + JSON.stringify(q.errs));
  const depois = await q.evaluate(() => ({ saldos: db.accounts.map(a => balance(a)), disp: spendable(), meta: goalInfo(db.goals[0]).saved, desp: sumEntries('expense', '2026-11'), raw: JSON.parse(localStorage.getItem('poupanca-v2')) }));
  R('as categorias ficaram gravadas', Object.keys(NOVAS).every((k, i) => depois.raw.entries.find(e => e.id === 'e' + i).category === k));
  R('saldos, disponível, total de despesas e objetivo não mudam', JSON.stringify([antes.saldos, antes.disp, antes.desp, antes.meta]) === JSON.stringify([depois.saldos, depois.disp, depois.desp, depois.meta]), JSON.stringify([antes.disp, depois.disp]));
  const so = raw => raw.entries.map(e => JSON.stringify(Object.keys(e).filter(k => k !== 'category').sort().map(k => [k, e[k]]))).sort();
  const dif = so(antes.raw).filter(x => !so(depois.raw).includes(x));
  R('só a categoria mudou (valor, data, conta, nota, objetivo e ids iguais)', dif.length === 0 && antes.raw.entries.length === depois.raw.entries.length, dif.slice(0, 2).join(' || '));
  // os ecrãs mostram as categorias novas, sem «undefined»
  const sinais = []; for (const [t, s] of [['home'], ['entries', 'list'], ['entries', 'analysis'], ['budgets'], ['goals'], ['accounts', 'rec']]) { await q.click(`[data-tab=${t}]`); if (t === 'entries') await q.click(`[data-view=${s}]`); if (t === 'accounts') await q.click(`[data-seg=${s}]`); const x = await q.evaluate(() => document.body.innerText); const m = /.*(undefined|NaN|Invalid Date).*/.exec(x); if (m) sinais.push(t + ': ' + m[0]); }
  R('nenhum ecrã mostra «undefined» ou «NaN»', sinais.length === 0, sinais.join(' | '));
  await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]');
  const an = await q.evaluate(() => [...document.querySelectorAll('.an-cat')].map(x => x.dataset.an.split(':')[1]));
  R('a Análise mostra as despesas nas categorias novas', Object.keys(NOVAS).every(k => an.includes(k)), an.join(','));
  await q.click('[data-an=cats]'); R('o filtro de categorias da Análise tem as 21 categorias', (await q.locator('input[data-an-cat]').count()) === 21); await q.click('#sheet [data-act=cancel]');
  await q.click('[data-view=list]'); await q.selectOption('[data-f=cat]', 'cafes');
  R('o filtro de Movimentos encontra as despesas das categorias novas', (await q.locator('#elist .item').count()) === 1);
  await q.click('[data-act=clear-filters]');
  // orçamento numa categoria nova
  await q.click('[data-tab=budgets]'); await q.click('#add'); await q.selectOption('#sheet [name=category]', 'ginasio'); await q.fill('#sheet [name=amount]', '40'); await q.click('#sheet [data-act=save]'); await q.waitForSelector('#sheet-bg', { state: 'hidden' });
  const orc = await q.textContent('#view'); R('dá para criar um orçamento numa categoria nova e conta o gasto', /Ginásio/.test(orc) && /11,35\s€ \/ 40,00\s€/.test(orc), orc.replace(/\s+/g, ' ').slice(0, 160));
  // cópia de segurança: exportar e importar mantém as categorias novas
  const json = await q.evaluate(() => JSON.stringify(db)); await q.evaluate(() => { localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'x', name: 'X', kind: 'ordem', opening: 1 }], entries: [] })); }); await q.reload(); await q.waitForSelector('#view *');
  await q.setInputFiles('#file', { name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(json) }); await q.waitForSelector('#toast.on');
  R('exportar e importar a cópia mantém as categorias novas', await q.evaluate(n => Object.keys(n).every((k, i) => db.entries.find(e => e.id === 'e' + i).category === k), NOVAS));
  // voltar a pôr uma despesa numa categoria antiga também funciona
  await q.click('[data-tab=entries]'); await q.click('[data-view=list]'); await q.click('[data-edit-entry=e0]'); await q.selectOption('#sheet [name=category]', 'restaurantes'); await q.click('#sheet [data-act=save]'); await q.waitForSelector('#sheet-bg', { state: 'hidden' });
  R('voltar a pôr uma despesa numa categoria antiga também funciona', await q.evaluate(() => db.entries.find(e => e.id === 'e0').category === 'restaurantes'));
  // registo rápido usa as categorias novas
  const rq = await q.evaluate(() => ['café 1,20', 'gasolina 50', 'ginásio 35', 'cabeleireiro 15', 'ração do cão 20', 'livro 12', 'IUC 120', 'prenda 25', 'sapatilhas 60', 'pequeno almoço 4', 'almoço 9', 'uber 7'].map(f => parseQuick(f).category));
  R('o registo rápido reconhece as categorias novas', JSON.stringify(rq) === JSON.stringify(['cafes', 'automovel', 'ginasio', 'cabeleireiro', 'animais', 'educacao', 'impostos', 'presentes', 'roupa', 'cafes', 'restaurantes', 'transportes']), JSON.stringify(rq));
  errs.push(...q.errs); await q.ctx.close(); await b.close(); fim(errs);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
