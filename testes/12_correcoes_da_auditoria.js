// v23 — correções do Lote 1 da auditoria independente (docs/ALTERACOES.md, secção v23).
// Cada bloco reproduz o problema encontrado na v22 e confirma que deixou de acontecer, sem mudar o resto.
const { chromium, R, fim, vazio, novo, semear } = require('./comum.js');
const HOJE = '2026-11-06';
const lerDb = q => q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')));
async function pagina(b, opt = {}) { const { fuso, relogio = HOJE + 'T12:00:00', ...o } = opt; const q = await novo(b, { ...(fuso ? { timezoneId: fuso } : {}), ...o }); await q.ctx.clock.setFixedTime(new Date(relogio)); q.msgs = []; q.on('dialog', d => q.msgs.push(d.message())); return q; }
const E = (id, date, kind, amount, accountId, extra = {}) => ({ id, date, kind, amount, accountId, destId: null, category: 'outros', note: '', goalId: null, recId: null, ...extra });
(async () => {
  const b = await chromium.launch(); const errs = [];

  // ---- 1) dinheiro ao cêntimo: carteira esvaziada e objetivo pago exatamente ----
  {
    const q = await pagina(b); const d = vazio(); d.accounts.push({ id: 'w', name: 'Carteira', kind: 'carteira', opening: 298.78 });
    [201.1, 16.87, 71.37].forEach((a, i) => d.entries.push(E('e' + i, '2026-11-0' + (i + 1), 'expense', a, 'w')));
    await semear(q, d);
    await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('#sheet [name=amount]', '9,44'); await q.selectOption('#sheet [name=account]', 'w'); await q.click('#sheet [data-act=save]');
    await q.waitForSelector('#sheet-bg', { state: 'hidden' });
    R('esvaziar a carteira ao cêntimo já não dispara o aviso de saldo negativo', !q.msgs.some(m => /saldo negativo/.test(m)), JSON.stringify(q.msgs));
    await q.click('[data-tab=accounts]'); const conta = await q.textContent('[data-edit-account=w] .amt');
    R('o saldo da carteira esvaziada é «0,00 €» (sem sinal)', /^0,00/.test(conta.replace(/\s/g, '')), conta);
    await q.click('[data-tab=home]'); const hero = await q.textContent('.hero b');
    R('«Disponível para gastar» mostra «0,00 €»', /^0,00/.test(hero.replace(/\s/g, '')), hero);
    // o aviso continua a funcionar quando o saldo fica mesmo negativo
    await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('#sheet [name=amount]', '0,01'); await q.selectOption('#sheet [name=account]', 'w'); await q.click('#sheet [data-act=save]');
    R('o aviso de saldo negativo continua a aparecer quando fica mesmo negativo (-0,01 €)', q.msgs.some(m => /saldo negativo \(-0,01/.test(m)), JSON.stringify(q.msgs.slice(-1)));
    errs.push(...q.errs); await q.ctx.close();
  }
  {
    const q = await pagina(b); const d = vazio(); d.accounts.push({ id: 'o', name: 'Banco', kind: 'ordem', opening: 5000 }, { id: 's', name: 'Poupança', kind: 'poupanca', opening: 0 });
    d.goals.push({ id: 'g', name: 'Viagem', target: 178.65, saved: 0, deadline: '', created: '2026-11-01', base: 0 });
    [18.16, 60.69, 99.8].forEach((a, i) => d.entries.push(E('t' + i, '2026-11-0' + (i + 1), 'transfer', a, 'o', { destId: 's', goalId: 'g' })));
    await semear(q, d); await q.click('[data-tab=goals]'); const card = await q.textContent('#view .card');
    R('objetivo pago ao cêntimo (18,16 + 60,69 + 99,80 = 178,65) mostra 100% e «Concluído»', /100%/.test(card) && /Conclu/.test(card), card.replace(/\s+/g, ' ').slice(0, 120));
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- 2) datas fora de 1900–2200 recusadas ao guardar; datas normais aceites ----
  {
    const q = await pagina(b); const d = vazio(); d.accounts.push({ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 });
    d.goals.push({ id: 'g', name: 'Casa', target: 1000, saved: 0, deadline: '', created: '2026-10-01', base: 0 }); await semear(q, d);
    const tentar = async (abrir, campo, valor) => { await abrir(); await q.fill(`#sheet [name=${campo}]`, valor); await q.click('#sheet [data-act=save]'); await q.waitForTimeout(300); const aberta = await q.isVisible('#sheet-bg'); const msg = aberta ? await q.textContent('#err') : ''; if (aberta) await q.click('#sheet [data-act=cancel]'); return { aberta, msg }; };
    const novoMov = async () => { await q.click('[data-tab=entries]'); await q.click('#add'); await q.fill('#sheet [name=amount]', '10'); };
    for (const dt of ['0026-11-05', '1899-12-31', '2206-01-01']) { const r = await tentar(novoMov, 'date', dt); R(`movimento com a data ${dt} é recusado com uma mensagem`, r.aberta && /1900 e 2200/.test(r.msg), r.msg); }
    const ok = await tentar(novoMov, 'date', '2026-11-05'); R('movimento com uma data normal (2026-11-05) continua a gravar', !ok.aberta);
    const meta = await tentar(async () => { await q.click('[data-tab=goals]'); await q.click('[data-edit-goal=g]'); }, 'deadline', '2207-06-30');
    R('prazo de objetivo 2207-06-30 é recusado com uma mensagem', meta.aberta && /1900 e 2200/.test(meta.msg), meta.msg);
    const metaOk = await tentar(async () => { await q.click('[data-tab=goals]'); await q.click('[data-edit-goal=g]'); }, 'deadline', '2027-06-30');
    R('prazo normal (2027-06-30) continua a gravar', !metaOk.aberta && (await lerDb(q)).goals[0].deadline === '2027-06-30');
    const regra = await tentar(async () => { await q.click('[data-tab=accounts]'); await q.click('[data-seg=rec]'); await q.click('[data-act=new]'); await q.fill('#sheet [name=name]', 'Seguro'); await q.fill('#sheet [name=amount]', '480'); }, 'date', '2206-03-01');
    R('regra recorrente com a data 2206-03-01 é recusada (não cria cobranças ao reabrir)', regra.aberta && /1900 e 2200/.test(regra.msg) && (await lerDb(q)).recurring.length === 0, regra.msg);
    R('os campos de data têm limites 1900–2200', await q.evaluate(() => { document.querySelector('[data-tab=entries]').click(); document.getElementById('add').click(); const i = document.querySelector('#sheet [name=date]'); const r = i.min === '1900-01-01' && i.max === '2200-12-31'; document.querySelector('#sheet [data-act=cancel]').click(); return r; }));
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- 3) «Esqueci-me do PIN» apaga mesmo todos os dados ----
  {
    const q = await pagina(b); const d = vazio(); d.accounts.push({ id: 'a', name: 'Conta Secreta', kind: 'ordem', opening: 12345.67 }); await semear(q, d);
    await q.evaluate(async () => { localStorage.setItem('poupanca-before-import', JSON.stringify({ accounts: [{ id: 'x', name: 'Antiga', kind: 'ordem', opening: 1 }] })); localStorage.setItem('poupanca-corrupt-1', '{partido'); localStorage.setItem('poupanca-lastacc', 'a'); localStorage.setItem('poupanca-lastbackup', '2026-10-01'); localStorage.setItem('poupanca-pin', JSON.stringify({ salt: 's', hash: await hashPin('123456', 's') })); });
    await q.reload(); await q.waitForSelector('#lock:not([hidden])'); await q.click('[data-act=pin-forgot]'); await q.waitForLoadState('load'); await q.waitForTimeout(500);
    const chaves = await q.evaluate(() => Object.keys(localStorage).sort());
    R('depois de «Esqueci-me do PIN» só ficam as preferências (modo privado e boas-vindas)', chaves.every(k => ['poupanca-privacy', 'poupanca-welcome'].includes(k)), chaves.join(', '));
    await q.click('[data-tab=accounts]'); await q.click('#defs'); R('as Definições abrem e já não há «Desfazer a última importação» para repor dados antigos sem PIN', (await q.isVisible('[data-act=export]')) && (await q.locator('[data-act=undo-import]').count()) === 0);
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- 4) importação: só valores conhecidos; datas numéricas verificadas ----
  {
    const q = await pagina(b); await semear(q, vazio());
    const f = { accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 }, { id: 'b', name: 'Estranha', kind: 'toString', opening: 50 }, { id: 'c', name: 'Swift', kind: 'Dinheiro físico', opening: 10 }],
      entries: [E('e1', '2026-11-02', 'constructor', 10, 'a'), E('e2', '2026-11-03', 'expense', 20, 'a', { category: 'hasOwnProperty' }), E('e3', '2026-11-04', 'expense', 5, 'a', { category: '__proto__' }), E('e4', '2026-11-04', 'Despesa', 7, 'a', { category: 'Alimentação' }),
        E('n1', 1730000000000, 'expense', 1, 'a'), E('n2', 1e20, 'expense', 1, 'a'), E('n3', 815000000, 'expense', 1, 'a')],
      budgets: [{ id: 'bd', category: 'toString', limit: 100 }], recurring: [{ id: 'r', name: 'R', kind: 'valueOf', amount: 1, accountId: 'a', category: 'outros', freq: 'toString', next: '2026-12-01', day: 1, active: true }], invest: [{ id: 'i', name: 'I', type: 'constructor', invested: 1, current: 1 }] };
    await q.click('[data-tab=accounts]'); await q.setInputFiles('#file', { name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(f)) }); await q.waitForSelector('#toast.on');
    const db = await lerDb(q);
    R('tipos, categorias e frequências desconhecidos passam aos valores por omissão', db.accounts[1].kind === 'ordem' && db.entries[0].kind === 'expense' && db.entries[1].category === 'outros' && db.entries[2].category === 'outros' && db.budgets[0].category === 'outros' && db.recurring[0].kind === 'expense' && db.recurring[0].freq === 'monthly' && db.invest[0].type === 'outro', JSON.stringify([db.accounts[1].kind, db.entries[0].kind, db.entries[1].category, db.entries[2].category, db.budgets[0].category, db.recurring[0].kind, db.recurring[0].freq, db.invest[0].type]));
    R('nomes em português (app Swift) continuam a ser reconhecidos', db.accounts[2].kind === 'carteira' && db.entries[3].kind === 'expense' && db.entries[3].category === 'alimentacao');
    const datas = db.entries.slice(4).map(e => e.date);
    R('datas numéricas impossíveis passam a hoje; a data da app Swift continua certa', datas[0] === HOJE && datas[1] === HOJE && /^2026-10-(29|30)$/.test(datas[2]), JSON.stringify(datas));
    let sinais = '';
    for (const [t, s] of [['home'], ['entries', 'list'], ['entries', 'analysis'], ['budgets'], ['goals'], ['accounts', 'rec'], ['accounts', 'inv']]) { await q.click(`[data-tab=${t}]`); if (t === 'entries') await q.click(`[data-view=${s}]`); if (t === 'accounts') await q.click(`[data-seg=${s}]`); const x = await q.evaluate(() => document.body.innerText); const m = /.*(undefined|NaN|Invalid Date).*/.exec(x); if (m) sinais += `${t}/${s || ''}: ${m[0]} `; }
    R('nenhum ecrã mostra «undefined», «NaN» ou «Invalid Date» depois desta importação', !sinais, sinais);
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- 5) separador guardado inválido ----
  {
    const q = await pagina(b); await semear(q, vazio()); await q.evaluate(() => localStorage.setItem('poupanca-tab', 'invest')); await q.reload(); await q.waitForTimeout(300);
    R('separador guardado inválido abre no Início, sem erros', (await q.evaluate(() => document.getElementById('view').innerText.length)) > 0 && (await q.textContent('#title')) === 'Poupança' && q.errs.length === 0, JSON.stringify(q.errs));
    await q.ctx.close();
  }

  // ---- 6) modo privado no formulário do objetivo ----
  {
    const q = await pagina(b); const d = vazio(); d.accounts.push({ id: 'o', name: 'Banco', kind: 'ordem', opening: 500 }, { id: 'p', name: 'Mealheiro', kind: 'poupanca', opening: 0 });
    d.goals.push({ id: 'g', name: 'Viagem', target: 999.99, saved: 111.11, deadline: '', created: '2026-10-01', base: 111.11 }); d.entries.push(E('t', '2026-11-02', 'transfer', 100.11, 'o', { destId: 'p', goalId: 'g' }));
    await semear(q, d, { privacidade: true }); await q.click('[data-tab=goals]'); await q.click('[data-edit-goal=g]');
    const t = await q.textContent('#sheet');
    R('com o modo privado, o formulário do objetivo esconde os montantes', !/100,11|211,22/.test(t) && /••••/.test(t), t.replace(/\s+/g, ' ').slice(0, 160));
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- 7) acessibilidade: estado escolhido e botões com nome ----
  {
    const q = await pagina(b); const d = vazio(); d.accounts.push({ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 }); d.goals.push({ id: 'g', name: 'Casa', target: 1000, saved: 0, deadline: '', created: '2026-10-01', base: 0 }); await semear(q, d);
    R('o separador ativo tem aria-current="page"', await q.getAttribute('#tabs button.on', 'aria-current') === 'page' && (await q.locator('#tabs [aria-current]').count()) === 1);
    await q.click('[data-tab=accounts]'); R('a secção escolhida de Contas tem aria-pressed', await q.getAttribute('#aseg button.on', 'aria-pressed') === 'true' && (await q.locator('#aseg [aria-pressed=false]').count()) === 2);
    await q.click('[data-tab=entries]'); await q.click('#add'); await q.click('#sheet [data-kind=income]');
    const kseg = await q.evaluate(() => [...document.querySelectorAll('#kseg button')].map(x => x.dataset.kind + ':' + x.getAttribute('aria-pressed')).join(' '));
    R('o tipo de movimento escolhido é anunciado (aria-pressed muda ao tocar)', kseg === 'income:true expense:false transfer:false', kseg);
    await q.click('#sheet [data-act=cancel]'); await q.click('[data-tab=goals]');
    await q.focus('[data-edit-goal=g]'); await q.keyboard.press('Enter'); await q.waitForSelector('#sheet [name=target]');
    R('o nome do objetivo é um botão: abre com o teclado (Enter)', await q.evaluate(() => document.querySelector('[data-edit-goal]').tagName) === 'BUTTON');
    await q.click('#sheet [data-act=cancel]');
    const nomes = await q.evaluate(() => [...document.querySelectorAll('[data-goal-add]')].map(x => x.getAttribute('aria-label')).join(' / '));
    R('o botão «Juntar dinheiro» do objetivo tem nome para leitores de ecrã', /Juntar dinheiro ao objetivo Casa/.test(nomes), nomes);
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- 8) hora de verão: idade da cópia de segurança ----
  {
    const q = await pagina(b, { fuso: 'Europe/Lisbon', relogio: '2026-03-30T12:00:00Z' }); const d = vazio(); d.accounts.push({ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 });
    await semear(q, d); await q.evaluate(() => localStorage.setItem('poupanca-lastbackup', '2026-02-28')); await q.reload(); await q.waitForSelector('#view *');
    await q.click('#defs'); const t = await q.evaluate(() => document.body.innerText); // v24: o estado da cópia está nas Definições
    R('com a mudança de hora pelo meio, 28/02 → 30/03 conta «há 30 dias» e mostra o aviso', /há 30 dias/.test(t) && /A última cópia foi há 30 dias/.test(t), (/[^\n]*última cópia[^\n]*/i.exec(t) || [''])[0]);
    errs.push(...q.errs); await q.ctx.close();
  }
  await b.close(); fim(errs);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
