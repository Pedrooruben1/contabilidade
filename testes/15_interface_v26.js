// v26 — identidade bem.contado (cores, Manrope, desenhos de traço à mão) e ajudas no Início:
// «Primeiros passos», «Esta semana» e «Até X por dia até ao fim do mês».
const { chromium, APP, R, fim, vazio, novo, semear } = require('./comum.js');
const HOJE = '2026-11-18'; // quarta-feira; a semana vai de 16 a 22 de novembro
const E = (id, date, kind, amount, accountId, extra = {}) => ({ id, date, kind, amount, accountId, destId: null, category: 'outros', note: '', goalId: null, recId: null, ...extra });
async function pagina(b, opt = {}) { const q = await novo(b, opt); await q.ctx.clock.setFixedTime(new Date(HOJE + 'T12:00:00')); return q; }
const base = () => { const d = vazio(); d.accounts.push({ id: 'o', name: 'Banco', kind: 'ordem', opening: 1000 });
  d.entries.push(E('d1', '2026-11-16', 'expense', 10, 'o', { category: 'cafes' }), E('d2', '2026-11-18', 'expense', 20, 'o', { category: 'alimentacao' }), E('d3', '2026-11-20', 'expense', 15, 'o', { note: 'Agendado' }), E('d4', '2026-11-10', 'expense', 7, 'o'));
  return d; };
const txt = async (q, s) => ((await q.textContent(s)) || '').replace(/\s+/g, ' ').trim();
(async () => {
  const b = await chromium.launch(); const errs = [];

  {
    const q = await pagina(b); await semear(q, base());
    const tabs = await q.$$eval('#tabs button', bs => bs.map(x => ({ svg: !!x.querySelector('svg.tico path'), t: x.textContent.trim() })));
    R('separadores: 5 ícones desenhados (SVG) e os nomes de sempre', tabs.length === 5 && tabs.every(x => x.svg) && tabs.map(x => x.t).join('|') === 'Início|Movimentos|Orçamentos|Objetivos|Contas', JSON.stringify(tabs));
    const fonte = await q.evaluate(async () => { await document.fonts.ready; await document.fonts.load('800 20px Manrope'); return document.fonts.check('800 20px Manrope') && getComputedStyle(document.body).fontFamily.startsWith('Manrope'); });
    R('a letra Manrope vem da própria app (funciona offline) e é a letra do texto', fonte);
    const cores = await q.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, hero: getComputedStyle(document.querySelector('.hero')).backgroundColor }));
    R('cores da marca: fundo creme e cartão principal azul', cores.bg === 'rgb(247, 245, 240)' && cores.hero === 'rgb(23, 50, 77)', JSON.stringify(cores));
    // previsão: 1000 - 37 já gastos - 15 agendado = 948; faltam 13 dias (18 a 30) → 72,92 € por dia (arredondado para baixo)
    const tag = await txt(q, '.hero .tag');
    R('cartão principal: «Até 72,92 € por dia até ao fim do mês» (previsão ÷ dias que faltam, contando com hoje)', /^Até 72,92\s€ por dia até ao fim do mês$/.test(tag), tag);
    R('a previsão explica o valor por dia e quantos dias faltam', /Dá cerca de 72,92\s€ por dia nos 13 dias que faltam/.test(await txt(q, '#view')));
    const ordem = await q.evaluate(() => [...document.querySelectorAll('#view > *')].map(e => e.classList.contains('hero') ? 'hero' : e.classList.contains('alert') ? 'alerta' : e.classList.contains('passos') ? 'passos' : e.classList.contains('qa') ? 'registo' : e.classList.contains('semana') ? 'semana' : e.classList.contains('mes') ? 'mes' : e.tagName));
    R('ordem do Início: cartão, alertas, primeiros passos, registo rápido, semana, mês', ordem[0] === 'hero' && ordem[1] === 'alerta' && ordem.indexOf('passos') > ordem.lastIndexOf('alerta') && ordem.indexOf('registo') > ordem.indexOf('passos') && ordem.indexOf('semana') > ordem.indexOf('registo') && ordem.indexOf('mes') > ordem.indexOf('semana'), ordem.join(' > '));

    // Esta semana
    const dias = await q.$$eval('.dia', ds => ds.map(d => ({ t: d.textContent, hoje: d.classList.contains('hoje'), on: d.getAttribute('aria-pressed'), tem: !!d.querySelector('i.tem') })));
    R('semana: 7 dias de segunda (16) a domingo (22), hoje (18) em destaque', dias.length === 7 && dias[0].t.includes('Seg') && dias[0].t.includes('16') && dias[6].t.includes('22') && dias[2].hoje && dias[2].on === 'true', JSON.stringify(dias.map(d => d.t)));
    R('semana: o ponto marca só os dias com despesas já feitas (o agendado de dia 20 não conta)', dias.map(d => d.tem ? 1 : 0).join('') === '1010000');
    R('semana: total gasto 30,00 € (sem o agendado nem a despesa da semana anterior)', /Gastos: 30,00\s€/.test(await txt(q, '.semana')));
    R('semana: hoje mostra «20,00 € em 1 despesa»', /20,00\s€ em 1 despesa\./.test(await txt(q, '.dsel')), await txt(q, '.dsel'));
    await q.click('.dia[data-day="2026-11-16"]');
    R('semana: tocar em segunda mostra o que se gastou nesse dia', /^Segunda-feira, 16 de novembro: 10,00\s€ em 1 despesa\.$/.test(await txt(q, '.dsel')) && (await q.getAttribute('.dia[data-day="2026-11-16"]', 'aria-pressed')) === 'true', await txt(q, '.dsel'));
    await q.click('.dia[data-day="2026-11-20"]');
    R('semana: um dia futuro diz que ainda não chegou', /ainda não chegou\.$/.test(await txt(q, '.dsel')));

    // Primeiros passos
    R('primeiros passos: 2 de 5 feitos (conta e movimento) e 3 por fazer', /2 de 5/.test(await txt(q, '.passos')) && (await q.$$('.passo')).length === 3 && /Feito: criar a primeira conta, registar um movimento/.test(await txt(q, '.passos')));
    await q.click('.passo[data-passo="orc"]');
    R('primeiros passos: «Definir um orçamento» abre o formulário no separador Orçamentos', (await q.getAttribute('#tabs [aria-current]', 'data-tab')) === 'budgets' && !(await q.$eval('#sheet-bg', e => e.hidden)));
    await q.click('[data-act=cancel]'); await q.click('[data-tab=home]');
    await q.click('[data-act=passos-esconder]');
    R('primeiros passos: «Esconder esta lista» esconde e fica escondida depois de reabrir', !(await q.$('.passos')) && (await q.reload(), await q.waitForSelector('.hero'), !(await q.$('.passos'))));
    errs.push(...q.errs); await q.ctx.close();
  }

  {
    const q = await pagina(b); await semear(q, base(), { privacidade: true });
    const tag = await txt(q, '.hero .tag');
    R('modo privado: o valor por dia fica escondido (••••)', tag.includes('••••') && !/\d,\d\d/.test(tag), tag);
    errs.push(...q.errs); await q.ctx.close();
  }

  {
    const q = await pagina(b); await semear(q, vazio());
    R('sem contas: sem valor por dia e sem semana; os primeiros passos aparecem com 0 de 5', !(await q.$('.hero .tag')) && !(await q.$('.semana')) && /0 de 5/.test(await txt(q, '.passos')));
    await q.click('[data-tab=goals]');
    R('estados vazios com desenho de traço à mão (SVG) em vez de emoji', !!(await q.$('.empty svg.art path')));
    await q.click('[data-tab=home]'); await q.click('.passo[data-passo="conta"]');
    R('primeiros passos: «Criar a primeira conta» abre o formulário da conta em Contas', (await q.getAttribute('#tabs [aria-current]', 'data-tab')) === 'accounts' && !(await q.$eval('#sheet-bg', e => e.hidden)));
    errs.push(...q.errs); await q.ctx.close();
  }

  {
    const q = await pagina(b, { viewport: { width: 320, height: 640 } }); await semear(q, base());
    const ok = await q.evaluate(() => document.documentElement.scrollWidth <= 320 && [...document.querySelectorAll('.dia, #tabs button')].every(x => x.getBoundingClientRect().right <= 320.5));
    R('320 px: a semana e os separadores cabem sem scroll lateral', ok);
    const sobre = await q.$$eval('#tabs button', bs => bs.every(x => x.scrollWidth <= x.clientWidth + 1));
    R('320 px: os nomes dos separadores não se sobrepõem', sobre);
    errs.push(...q.errs); await q.ctx.close();
  }

  {
    const q = await pagina(b); await q.goto(APP);
    const r = await q.evaluate(async () => { const sw = await (await fetch('sw.js')).text(); const fs = ['fonts/manrope-latin-500-normal.woff2', 'fonts/manrope-latin-700-normal.woff2', 'fonts/manrope-latin-800-normal.woff2'];
      const st = await Promise.all(fs.map(f => fetch(f).then(x => x.status))); return { cache: fs.every(f => sw.includes(f)), st }; });
    R('as 3 letras Manrope existem e ficam na cache para funcionar offline', r.cache && r.st.every(s => s === 200), JSON.stringify(r));
    errs.push(...q.errs); await q.ctx.close();
  }
  await b.close(); fim(errs);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
