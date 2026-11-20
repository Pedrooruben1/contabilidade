// v24 — interface mais simples: Início curto, um só «+», Definições (⚙️), Movimentos por mês, formulário e objetivos.
const { chromium, R, fim, vazio, novo, semear } = require('./comum.js');
const HOJE = '2026-11-06';
const E = (id, date, kind, amount, accountId, extra = {}) => ({ id, date, kind, amount, accountId, destId: null, category: 'outros', note: '', goalId: null, recId: null, ...extra });
async function pagina(b, opt = {}) { const q = await novo(b, opt); await q.ctx.clock.setFixedTime(new Date(HOJE + 'T12:00:00')); return q; }
const base = () => { const d = vazio(); d.accounts.push({ id: 'o', name: 'Banco', kind: 'ordem', opening: 1000 }, { id: 'p', name: 'Mealheiro', kind: 'poupanca', opening: 200 });
  d.entries.push(E('i1', '2026-10-02', 'income', 1500, 'o', { note: 'Salário' }), E('d1', '2026-10-03', 'expense', 40, 'o', { category: 'alimentacao', note: 'Mercado' }),
    E('i2', '2026-11-02', 'income', 1500, 'o', { note: 'Salário' }), E('d2', '2026-11-03', 'expense', 40, 'o', { category: 'alimentacao', note: 'Mercado' }), E('d3', '2026-11-20', 'expense', 15, 'o', { note: 'Agendado' }));
  return d; };
(async () => {
  const b = await chromium.launch(); const errs = [];

  // ---- Início ----
  {
    const q = await pagina(b); const d = base(); d.goals.push({ id: 'g', name: 'Viagem', target: 1000, saved: 100, deadline: '2027-06-30', created: '2026-10-01', base: 100 }); await semear(q, d);
    const ordem = await q.evaluate(() => [...document.querySelectorAll('#view > *')].map(e => e.classList.contains('hero') ? 'hero' : e.classList.contains('alert') ? 'alerta' : e.classList.contains('qa') ? 'registo' : e.classList.contains('mes') ? 'mes' : e.tagName === 'H2' ? 'h2:' + e.textContent : e.dataset.act || e.className));
    R('Início: os alertas vêm logo a seguir ao cartão verde, antes do registo rápido', ordem[0] === 'hero' && ordem[1] === 'alerta' && ordem.indexOf('registo') > ordem.lastIndexOf('alerta'), ordem.slice(0, 6).join(' > '));
    const t = await q.textContent('#view');
    R('Início: sem gráficos nem «Despesas por categoria» (estão na Análise)', !/Evolução do saldo|Receitas vs\. despesas|Despesas por categoria/.test(t) && (await q.locator('#view svg').count()) === 0);
    R('Início: sem o quadro repetido do património; o cartão verde mostra Poupança e Património líquido', (await q.locator('#view .kv').count()) === 0 && /Poupança: 200,00\s€ · Património líquido: 4120,00\s€/.test(await q.textContent('.hero')), (await q.textContent('.hero')).replace(/\s+/g, ' '));
    R('Início: sem os dois botões grandes de adicionar; o atalho para a Análise continua', (await q.locator('[data-quick]').count()) === 0 && await q.isVisible('[data-act=open-analysis]'));
    R('Início: receitas iguais ao mês anterior dizem «= igual ao mesmo período do mês anterior»', /= igual ao mesmo período do mês anterior/.test(await q.textContent('.mes')));
    R('Início: «+» visível também no Início', await q.isVisible('#add') && await q.isVisible('#defs'));
    await q.click('#add'); await q.waitForSelector('#sheet [name=amount]');
    R('«+» no Início abre «Novo movimento» com o teclado já no valor', (await q.textContent('#sheet h2')) === 'Novo movimento' && await q.evaluate(() => document.activeElement.name === 'amount'));
    await q.click('#sheet [data-act=cancel]');
    errs.push(...q.errs); await q.ctx.close();
  }
  { // modo privado: a taxa de poupança também fica escondida
    const q = await pagina(b); await semear(q, base(), { privacidade: true });
    const mes = await q.textContent('.mes');
    R('modo privado: a taxa de poupança aparece como •••• e sem barra', /Taxa de poupança\s*••••/.test(mes) && (await q.locator('.mes .bar').count()) === 0, mes.replace(/\s+/g, ' ').slice(0, 140));
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- Definições ----
  {
    const q = await pagina(b); await semear(q, base());
    await q.click('[data-tab=accounts]'); const contas = await q.textContent('#view');
    R('Contas já não tem cópia de segurança, segurança nem ajuda; continua a mostrar a versão', !/Cópia de segurança|Definir PIN|Modo privado|boas-vindas/.test(contas) && /Poupança v\d+/.test(contas));
    await q.click('#defs'); const s = await q.textContent('#sheet');
    R('⚙️ abre as Definições com cópia de segurança, modo privado, PIN e ajuda', /Definições/.test(s) && /Cópia de segurança/.test(s) && await q.isVisible('[data-act=export]') && await q.isVisible('[data-act=import]') && await q.isVisible('[data-act=privacy]') && await q.isVisible('[data-act=pin-set]') && await q.isVisible('[data-act=welcome]'));
    await q.click('[data-act=privacy]');
    R('ligar o modo privado nas Definições atualiza o botão e mostra o olho', (await q.textContent('[data-act=privacy]')) === 'Ligado' && await q.isVisible('#eye'));
    await q.click('[data-act=privacy]'); await q.click('#sheet [data-act=cancel]');
    R('«Fechar» fecha as Definições', !(await q.isVisible('#sheet-bg')));
    // importar a partir das Definições: o campo de ficheiro existe fora dos ecrãs
    await q.click('[data-tab=goals]'); await q.click('#defs');
    R('o campo de ficheiro da importação está sempre presente (fora dos ecrãs)', await q.evaluate(() => !!document.getElementById('file') && !document.getElementById('view').contains(document.getElementById('file'))));
    await q.setInputFiles('#file', { name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ accounts: [{ id: 'z', name: 'Importada', kind: 'ordem', opening: 5 }], entries: [] })) }); await q.waitForSelector('#toast.on');
    R('importar a partir das Definições funciona e as Definições passam a mostrar «Desfazer»', await q.evaluate(() => db.accounts[0].name === 'Importada') && await q.isVisible('[data-act=undo-import]'));
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- Movimentos ----
  {
    const q = await pagina(b); await semear(q, base()); await q.click('[data-tab=entries]');
    const cab = await q.evaluate(() => [...document.querySelectorAll('#elist h2.mhead')].map(h => h.textContent.replace(/\s+/g, ' ').trim()));
    R('Movimentos: separadores por mês com o total de cada mês (sem os agendados)', cab.length === 2 && /novembro de 2026/i.test(cab[0]) && /\+1500,00 € · -40,00 €/.test(cab[0]) && /outubro de 2026/i.test(cab[1]), cab.join(' | '));
    R('Movimentos: sem filtros não aparece o cartão de totais de todos os meses', (await q.locator('#elist .kv').count()) === 0);
    const linha = await q.evaluate(() => { const s = [...document.querySelectorAll('.filters select')]; return s.length === 3 && s.every(x => x.offsetTop === s[0].offsetTop); });
    R('Movimentos: os 3 filtros cabem numa só linha', linha);
    await q.selectOption('[data-f=cat]', 'alimentacao');
    R('com um filtro: aparece o cartão de totais, o filtro fica realçado e há «Limpar filtros»', (await q.locator('#elist .kv').count()) === 1 && (await q.getAttribute('[data-f=cat]', 'class')) === 'on' && await q.isVisible('[data-act=clear-filters]'));
    await q.click('[data-act=clear-filters]');
    R('«Limpar filtros» repõe tudo', (await q.inputValue('[data-f=cat]')) === '' && (await q.locator('#elist .kv').count()) === 0 && (await q.locator('#elist .item').count()) === 5);
    // sem objetivos, o formulário não mostra o campo do objetivo
    await q.click('#add'); R('sem objetivos criados, o formulário não mostra o campo «objetivo»', (await q.locator('#sheet [name=goal]').count()) === 0);
    await q.fill('#sheet [name=amount]', '12,5'); await q.click('#sheet [data-act=save]'); await q.waitForSelector('#sheet-bg', { state: 'hidden' });
    R('guardar sem o campo «objetivo» funciona (movimento sem objetivo)', await q.evaluate(() => db.entries.some(e => e.amount === 12.5 && e.goalId === null)));
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- Objetivos ----
  {
    const q = await pagina(b); const d = base(); d.goals.push({ id: 'g', name: 'Viagem', target: 1000, saved: 100, deadline: '2027-06-30', created: '2026-10-01', base: 100 }); await semear(q, d);
    await q.click('[data-tab=goals]'); const c = (await q.textContent('#view .card.goal')).replace(/\s+/g, ' ');
    R('cartão do objetivo compacto: já poupado, falta, poupança mensal e «Juntar dinheiro»', /Já poupado 100,00 € de 1000,00 €/.test(c) && /Faltam 900,00 € até/.test(c) && /Poupança mensal necessária/.test(c) && await q.isVisible('[data-goal-add=g]'), c.slice(0, 160));
    await q.click('[data-goal-add=g]'); await q.waitForSelector('#sheet [name=amount]');
    const f = await q.evaluate(() => ({ kind: form.kind, dest: document.querySelector('#sheet [name=dest]').value, goal: document.querySelector('#sheet [name=goal]').value, foco: document.activeElement.name, label: document.getElementById('goallabel').textContent }));
    R('«Juntar dinheiro» abre uma transferência para a poupança, já associada ao objetivo, com o teclado no valor', f.kind === 'transfer' && f.dest === 'p' && f.goal === 'g' && f.foco === 'amount' && f.label === 'Juntar a um objetivo (opcional)', JSON.stringify(f));
    await q.fill('#sheet [name=amount]', '50'); await q.click('#sheet [data-act=save]'); await q.waitForSelector('#sheet-bg', { state: 'hidden' });
    R('guardar soma ao objetivo (100 → 150) e cria a transferência a sério', /Já poupado 150,00 €/.test((await q.textContent('#view .card.goal')).replace(/\s+/g, ' ')) && await q.evaluate(() => db.entries.some(e => e.kind === 'transfer' && e.amount === 50 && e.destId === 'p' && e.goalId === 'g')));
    await q.click('#view .card.goal .gline'); R('tocar no cartão abre o objetivo para editar', (await q.textContent('#sheet h2')) === 'Editar objetivo');
    await q.click('#sheet [data-act=cancel]');
    errs.push(...q.errs); await q.ctx.close();
  }

  // ---- ecrã estreito ----
  {
    const q = await pagina(b, { viewport: { width: 320, height: 640 } }); await semear(q, base(), { privacidade: true });
    let ok = true, ex = '';
    for (const t of ['home', 'entries', 'budgets', 'goals', 'accounts']) { await q.click(`[data-tab=${t}]`); const m = await q.evaluate(() => { const h = document.getElementById('title'); return { doc: document.documentElement.scrollWidth, cortado: h.scrollWidth > h.clientWidth + 1, txt: h.textContent }; }); if (m.doc > 320 || m.cortado) { ok = false; ex = JSON.stringify(m); } }
    R('a 320 px, com olho + ⚙️ + «+», o título cabe e a página não fica mais larga que o ecrã', ok, ex);
    errs.push(...q.errs); await q.ctx.close();
  }
  await b.close(); fim(errs);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
