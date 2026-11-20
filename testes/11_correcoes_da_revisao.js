// Problemas encontrados por uma revisão manual da app (objetivo que perde dinheiro ao editar, avisos, textos e totais incoerentes).
const { chromium, R, fim, novo, semear, igual } = require('./comum');
(async () => {
  const b = await chromium.launch(); const todos = [];
  const base = () => JSON.parse(JSON.stringify({ accounts: [{ id: 'B', name: 'Banco', kind: 'ordem', opening: 2900 }, { id: 'P', name: 'Poupança', kind: 'poupanca', opening: 650 }, { id: 'C', name: 'Carteira', kind: 'carteira', opening: 40.5 }],
    entries: [{ id: 't1', date: '2026-11-05', kind: 'transfer', amount: 150, accountId: 'B', destId: 'P', category: 'outros', note: '', goalId: 'g' }, { id: 'x1', date: '2026-11-02', kind: 'expense', amount: 35, accountId: 'B', destId: null, category: 'alimentacao', note: 'Compras' }, { id: 'x2', date: '2026-11-03', kind: 'expense', amount: 18.5, accountId: 'B', destId: null, category: 'restaurantes', note: 'Jantar' }, { id: 'x3', date: '2026-10-20', kind: 'expense', amount: 530, accountId: 'B', destId: null, category: 'habitacao', note: 'Renda' }],
    budgets: [{ id: 'b1', category: 'alimentacao', limit: 40 }, { id: 'b2', category: 'restaurantes', limit: 15 }], goals: [{ id: 'g', name: 'Viagem Japão', target: 3000, saved: 610, deadline: '2027-11-06', created: '2026-05-01', base: 610 }],
    recurring: [{ id: 'r1', name: 'Ginásio', kind: 'expense', amount: 30, accountId: 'B', destId: null, category: 'desporto', freq: 'monthly', next: '2026-11-16', day: 16, active: true }], invest: [{ id: 'd1', name: 'Crédito do carro', type: 'divida', invested: 0, current: 5000 }, { id: 'i1', name: 'ETF', type: 'etf', invested: 1000, current: 1150.5 }] }));
  const mk = async (db, opt = {}) => { const q = await novo(b, opt); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00')); await semear(q, db); todos.push(q); q.dlg = []; q.dlgResp = true; q.removeAllListeners('dialog'); q.on('dialog', d => { q.dlg.push(d.message()); q.dlgResp ? d.accept() : d.dismiss(); }); return q; };
  const st = (q, k) => q.evaluate(k => JSON.parse(localStorage.getItem('contabilidade-v2'))[k], k);
  const editarObjetivo = async (q, campos) => { await q.click('[data-tab=goals]'); await q.click('[data-edit-goal="g"]'); for (const [n, v] of Object.entries(campos)) await q.fill(`[name=${n}]`, v); await q.click('[data-act=save]'); };

  // 1) O objetivo NÃO perde dinheiro ao baixar (e voltar a subir) o valor pretendido
  let q = await mk(base());
  await editarObjetivo(q, { target: '500' }); let g = (await st(q, 'goals'))[0];
  R('baixar o valor pretendido (3000 → 500) não corta o valor poupado à mão (610 €)', g.saved === 610 && g.target === 500, JSON.stringify({ saved: g.saved, target: g.target }));
  R('com 610 + 150 já acima de 500 €, o cartão mostra «Concluído» e 100%', (await q.textContent('#view')).includes('Concluído') && (await q.textContent('#view')).includes('100%'));
  await editarObjetivo(q, { target: '3000' }); g = (await st(q, 'goals'))[0]; const txt = await q.textContent('#view');
  R('repor o valor pretendido (3000) devolve exatamente o poupado antes: 610 € à mão + 150 € de movimentos = 760 €', g.saved === 610 && txt.includes('760,00'), JSON.stringify({ saved: g.saved }));
  await q.click('[data-tab=goals]'); await q.click('[data-act=new]').catch(() => {}); if (!(await q.isVisible('#sheet-bg'))) await q.click('#add'); await q.fill('[name=name]', 'Já cumprido'); await q.fill('[name=target]', '1000'); await q.fill('[name=saved]', '1200'); await q.click('[data-act=save]');
  R('um objetivo novo guarda o valor que escreveste, mesmo acima do pretendido (1200 de 1000)', (await st(q, 'goals')).find(x => x.name === 'Já cumprido').saved === 1200);

  // 2) Prazo ultrapassado: não pede uma poupança mensal absurda
  q = await mk(base()); await editarObjetivo(q, { deadline: '2026-01-01' }); const t2 = await q.textContent('#view');
  R('prazo ultrapassado: aparece «Prazo ultrapassado» e NÃO aparece «Poupança mensal necessária»', t2.includes('Prazo ultrapassado') && !t2.includes('Poupança mensal necessária'));

  // 3) Formulário do objetivo: explica os dois valores
  q = await mk(base()); await q.click('[data-tab=goals]'); await q.click('[data-edit-goal="g"]'); const f3 = await q.textContent('#sheet');
  R('o formulário do objetivo diz que o valor é «à mão» e mostra os movimentos associados (150,00 €)', /à mão/.test(f3) && /movimentos associados/.test(f3) && f3.includes('150,00'), f3.slice(0, 200).replace(/\s+/g, ' '));
  await q.click('[data-act=cancel]'); await q.click('[data-tab=goals]'); R('o cartão do objetivo continua a mostrar o total (760,00 €)', (await q.textContent('#view')).includes('760,00'));

  // 4) Orçamento total: muda de cor aos 80% e aos 100%
  q = await mk(base()); await q.click('[data-tab=budgets]');
  const barra = () => q.evaluate(() => document.querySelector('#view > .card .bar').className);
  R('orçamento total a 97% (53,50 / 55 €): a barra avisa (laranja)', (await barra()).includes('warn'), await barra());
  await q.evaluate(() => { db.budgets[0].limit = 100; db.budgets[1].limit = 100; render(true); }); R('abaixo de 80% fica normal', !/warn|over/.test(await barra()));
  await q.evaluate(() => { db.budgets[0].limit = 30; db.budgets[1].limit = 10; render(true); }); R('acima de 100% fica vermelha', (await barra()).includes('over'));

  // 5) «Sem dados do período anterior»: diz exatamente que período está vazio
  q = await mk(base()); await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.click('[data-an="mode:month"]'); const desp = await q.evaluate(() => [...document.querySelectorAll('.an-card')].find(c => c.querySelector('span').textContent.trim() === 'Despesas').textContent);
  R('mês a meio com o período anterior vazio: o texto indica o intervalo comparado, em vez de «sem dados»', /sem movimentos de /.test(desp) && !/sem dados do período anterior/.test(desp), desp.replace(/\s+/g, ' ').slice(0, 120));

  // 6) Dívidas: mesmo sinal e cor no Início e no Património
  q = await mk(base()); const divInicio = await q.evaluate(() => document.querySelectorAll('#view .kv').length); // v24: o Início já não repete o quadro do património
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=inv]'); const divPat = await q.evaluate(() => { const d = [...document.querySelectorAll('.kv > div')].find(x => x.querySelector('span').textContent === 'Dívidas').querySelector('b'); return [d.textContent.trim(), d.className]; });
  R('«Dívidas» aparece no Património com sinal «-» e cor vermelha (e o Início já não repete o quadro)', divInicio === 0 && divPat[0].startsWith('-') && divPat[1].includes('neg'), JSON.stringify([divInicio, divPat]));

  // 7) Recorrentes: «A pagar/A receber (30 dias)» inclui os movimentos agendados
  const d7 = base(); d7.entries.push({ id: 'ag1', date: '2026-11-12', kind: 'expense', amount: 25, accountId: 'B', destId: null, category: 'lazer', note: 'Cinema', goalId: null, recId: null }, { id: 'ag2', date: '2026-11-14', kind: 'income', amount: 100, accountId: 'B', destId: null, category: 'outros', note: 'Venda', goalId: null, recId: null }, { id: 'ag3', date: '2027-02-01', kind: 'expense', amount: 999, accountId: 'B', destId: null, category: 'lazer', note: 'Longe', goalId: null, recId: null });
  q = await mk(d7); await q.click('[data-tab=accounts]'); await q.click('[data-seg=rec]'); const t7 = await q.evaluate(() => [...document.querySelectorAll('.kv > div')].map(d => d.textContent.replace(/\s+/g, ' ').trim()));
  R('A pagar (30 dias) = 30 (ginásio) + 25 (agendado) = 55,00 € e A receber = 100,00 €; o agendado de daqui a 3 meses não entra', t7[0].includes('55,00') && t7[1].includes('100,00'), JSON.stringify(t7));
  R('a lista dos próximos 30 dias mostra os movimentos agendados', (await q.textContent('#view')).includes('Cinema') && (await q.textContent('#view')).includes('agendado') && !(await q.textContent('#view')).includes('Longe'));

  // 8) Dinheiro físico ou poupança a ficar negativo: avisa e deixa escolher
  q = await mk(base()); await q.click('[data-tab=entries]'); await q.click('[data-view=list]');
  const transf = async (de, para, valor) => { await q.click('#add'); await q.click('[data-kind=transfer]'); await q.fill('[name=amount]', valor); await q.selectOption('[name=account]', de); await q.selectOption('[name=dest]', para); await q.click('[data-act=save]'); };
  q.dlgResp = false; await transf('C', 'B', '100'); const n1 = (await st(q, 'entries')).length;
  R('transferir 100 € da Carteira (40,50 €): aparece um aviso a dizer que ficaria negativa', q.dlg.length === 1 && /negativ/i.test(q.dlg[0]) && q.dlg[0].includes('Carteira') && q.dlg[0].includes('59,50'), JSON.stringify(q.dlg));
  R('«Cancelar» no aviso não guarda o movimento (o formulário fica aberto)', n1 === 4 && await q.isVisible('#sheet-bg'));
  q.dlgResp = true; await q.click('[data-act=save]'); await q.waitForTimeout(150); R('«OK» no aviso guarda o movimento', (await st(q, 'entries')).length === 5);
  q.dlg.length = 0; await q.click('#add'); await q.fill('[name=amount]', '99999'); await q.selectOption('[name=account]', 'B'); await q.click('[data-act=save]'); await q.waitForTimeout(150);
  R('uma conta à ordem pode ficar a descoberto sem aviso (é um caso normal)', q.dlg.length === 0 && (await st(q, 'entries')).length === 6);
  q.dlg.length = 0; q.dlgResp = false; await q.click('#add'); await q.fill('[name=amount]', '5000'); await q.selectOption('[name=account]', 'P'); await q.click('[data-act=save]'); await q.waitForTimeout(150);
  R('uma poupança que ficaria negativa também avisa', q.dlg.length === 1 && /negativ/i.test(q.dlg[0]) && q.dlg[0].includes('Poupança'), JSON.stringify(q.dlg)); await q.click('[data-act=cancel]');
  q.dlg.length = 0; q.dlgResp = true; await q.click('#add'); await q.fill('[name=amount]', '10'); await q.selectOption('[name=account]', 'C'); await q.click('[data-act=save]'); await q.waitForTimeout(150);
  R('e volta a avisar se um novo movimento a deixar ainda mais negativa (Carteira já em -59,50 €)', q.dlg.length === 1 && /negativ/i.test(q.dlg[0]), JSON.stringify(q.dlg));

  // 9) Apagar: a confirmação diz o quê e avisa que não se desfaz
  q = await mk(base()); q.dlgResp = false; const apagar = async (abrir, esperado) => { q.dlg.length = 0; await abrir(); await q.click('[data-act=delete]'); await q.waitForTimeout(120); const m = q.dlg[0] || ''; await q.click('[data-act=cancel]').catch(() => {}); return esperado.every(x => m.includes(x)) && /desfazer/i.test(m) ? null : m; };
  const falhas = []; const tentar = async (nome, abrir, esp) => { const r = await apagar(abrir, esp); if (r !== null) falhas.push(`${nome}: «${r}»`); };
  await tentar('movimento', async () => { await q.click('[data-tab=entries]'); await q.click('[data-view=list]'); await q.click('[data-edit-entry="x2"]'); }, ['Jantar', '18,50']);
  await tentar('objetivo', async () => { await q.click('[data-tab=goals]'); await q.click('[data-edit-goal="g"]'); }, ['Viagem Japão']);
  await tentar('orçamento', async () => { await q.click('[data-tab=budgets]'); await q.click('[data-edit-budget="b1"]'); }, ['Alimentação']);
  await tentar('recorrente', async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=rec]'); await q.click('[data-edit-rec="r1"]'); }, ['Ginásio']);
  await tentar('investimento', async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=inv]'); await q.click('[data-edit-inv="d1"]'); }, ['Crédito do carro']);
  const d9 = base(); d9.accounts.push({ id: 'V', name: 'Conta vazia', kind: 'ordem', opening: 5 }); q = await mk(d9); q.dlgResp = false;
  await tentar('conta', async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.click('[data-edit-account="V"]'); }, ['Conta vazia']);
  R('a confirmação de apagar diz o que se apaga e que não se pode desfazer (movimento, objetivo, orçamento, recorrente, investimento e conta)', falhas.length === 0, falhas.join(' | '));

  // 10) Mensagens de valor inválido mais claras
  q = await mk(base()); await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('[name=amount]', 'abc'); await q.click('[data-act=save]'); const m1 = await q.textContent('#err');
  await q.fill('[name=amount]', '0'); await q.click('[data-act=save]'); const m2 = await q.textContent('#err'); await q.fill('[name=amount]', '12.5.3'); await q.click('[data-act=save]'); const m3 = await q.textContent('#err');
  R('«abc» e «12.5.3» dizem que o valor não é válido; «0» diz que tem de ser maior que zero', /não é válido/.test(m1) && /não é válido/.test(m3) && /maior que zero/.test(m2) && !/maior que zero/.test(m1), JSON.stringify([m1, m2, m3]));

  // 11) Contas: o texto explica o saldo inicial
  q = await mk(base()); await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); const nota = await q.textContent('#view');
  R('o texto de Contas explica que se edita o «saldo inicial» para acertar o saldo', /saldo inicial/.test(nota.slice(0, 700)) && !/Introduz o saldo atual\./.test(nota));
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
