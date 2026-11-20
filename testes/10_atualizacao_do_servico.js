// Atualização de uma instalação antiga para a nova, sem perda de dados: v20 (a que está publicada) → v21, e v21 → versões futuras.
// Usa um servidor que imita o GitHub Pages (Cache-Control: max-age=600) e onde se troca a versão «publicada» na mesma origem.
const { chromium, fs, path, TMP, R, fim, novo, igual, python } = require('./comum');
const http = require('http'); const crypto = require('crypto');
const RAIZ = path.join(__dirname, '..'), PORTA = 8796, BASE = `http://127.0.0.1:${PORTA}`, UP = path.join(TMP, 'atualizacao');
const VER = fs.readFileSync(path.join(RAIZ, 'app.js'), 'utf8').match(/const VERSION = '(v\d+)'/)[1], NEXT = 'v' + (+VER.slice(1) + 1), CACHE_ATUAL = 'contabilidade-' + VER, CACHE_NEXT = 'contabilidade-' + NEXT;
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
const copiar = (de, para, ficheiros) => { fs.mkdirSync(para, { recursive: true }); for (const f of ficheiros) fs.copyFileSync(path.join(de, f), path.join(para, f)); fs.cpSync(path.join(RAIZ, 'icons'), path.join(para, 'icons'), { recursive: true }); };
const FICHEIROS = ['index.html', 'app.js', 'analise.js', 'style.css', 'sw.js', 'manifest.webmanifest'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  python('cenarios.py', path.join(TMP, 'pacotes.json'));
  fs.rmSync(UP, { recursive: true, force: true }); fs.mkdirSync(UP, { recursive: true });
  // versões «publicáveis»
  copiar(path.join(RAIZ, 'testes', 'versao-anterior-v20'), path.join(UP, 'v20'), ['index.html', 'app.js', 'style.css', 'sw.js', 'manifest.webmanifest']);
  copiar(RAIZ, path.join(UP, 'atual'), FICHEIROS);
  const sw21 = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), app21 = fs.readFileSync(path.join(RAIZ, 'app.js'), 'utf8');
  copiar(RAIZ, path.join(UP, 'seguinte'), FICHEIROS); fs.writeFileSync(path.join(UP, 'seguinte', 'app.js'), app21.replace(`const VERSION = '${VER}'`, `const VERSION = '${NEXT}'`)); fs.writeFileSync(path.join(UP, 'seguinte', 'sw.js'), sw21.replace(`'${CACHE_ATUAL}'`, `'${CACHE_NEXT}'`));
  copiar(RAIZ, path.join(UP, 'atualvelho'), FICHEIROS); fs.writeFileSync(path.join(UP, 'atualvelho', 'sw.js'), sw21.replace(", { cache: 'no-cache' }", '').replace("new Request(f, { cache: 'reload' })", 'f')); // v21 SEM as proteções contra a cache do navegador (controlo negativo)
  // Servidor que imita o GitHub Pages: Cache-Control max-age=600 e validação por ETag. «Publicar» troca a versão servida na MESMA origem.
  let publicada = 'v20'; const publicar = v => { publicada = v; };
  const DATAS = { v20: 'Mon, 02 Nov 2026 16:08:35 GMT', atual: 'Fri, 06 Nov 2026 12:00:00 GMT', atualvelho: 'Fri, 06 Nov 2026 12:00:00 GMT', seguinte: 'Tue, 10 Nov 2026 09:00:00 GMT' };
  const TIPOS = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  const servidor = http.createServer((req, res) => {
    const rel = req.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\//, ''), raiz = path.join(UP, publicada), f = path.join(raiz, rel);
    if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('não existe'); }
    const corpo = fs.readFileSync(f), etag = `"${sha(corpo)}"`, cab = { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag, 'Last-Modified': DATAS[publicada] };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, cab); return res.end(); }
    res.writeHead(200, cab); res.end(corpo);
  });
  await new Promise(r => servidor.listen(PORTA, '127.0.0.1', r)); publicar('v20');
  const b = await chromium.launch(); const todos = [];
  const versao = q => q.evaluate(() => VERSION).catch(() => null);
  const caches = q => q.evaluate(async () => { const o = {}; for (const k of await caches.keys()) { const c = await caches.open(k); o[k] = (await c.keys()).map(r => new URL(r.url).pathname.replace(/^\//, '') || './'); } return o; });
  const esperarCaches = async (q, aguarda, naoAguarda) => { for (let i = 0; i < 40; i++) { const c = await caches(q); if (c[aguarda] && !(naoAguarda && c[naoAguarda])) return c; await sleep(250); } return await caches(q); };
  const pin = async (q, d) => { for (const x of d) await q.click(`[data-pin="${x}"]`); await q.waitForTimeout(450); };
  // «Reabrir» = fechar a app e abrir outra vez (é o que acontece no telemóvel). Um reload() dentro do mesmo separador pode reutilizar ficheiros que o Chromium tem em memória.
  const reabrir = async (q, url = BASE + '/index.html') => { const ctx = q.ctx, errs = q.errs; await q.close(); const n = await ctx.newPage(); n.ctx = ctx; n.errs = errs; n.on('pageerror', e => errs.push(e.message)); n.on('dialog', d => d.accept()); await n.goto(url); await n.waitForFunction(() => document.getElementById('view') !== null); return n; };
  const abrirApp = async (q, url = BASE + '/index.html') => { await q.goto(url); await q.waitForFunction(() => document.getElementById('view') !== null); };
  try {
    // ===== U1: v20 → v21, com dados, PIN, preferências e caches de outras apps =====
    const packs = JSON.parse(fs.readFileSync(path.join(TMP, 'pacotes.json') , 'utf8').toString()); const dados = packs.find(p => p.name === 'aleatorio-1').data;
    dados.budgets = [{ id: 'b1', category: 'lazer', limit: 60 }]; dados.goals = [{ id: 'g1', name: 'Viagem', target: 900, saved: 100, deadline: '2027-06-01', created: '2026-05-01', base: 100 }]; dados.invest = [{ id: 'i1', name: 'ETF', type: 'etf', invested: 100, current: 120 }];
    dados.recurring = [{ id: 'r1', name: 'Ginásio', kind: 'expense', amount: 30, accountId: 'a0', destId: null, category: 'desporto', freq: 'monthly', next: '2027-01-15', day: 15, active: true }];
    let q = await novo(b, { serviceWorkers: 'allow' }); todos.push(q); await q.ctx.clock.setFixedTime(new Date('2026-11-06T12:00:00'));
    await abrirApp(q);
    await q.evaluate(d => { localStorage.setItem('contabilidade-welcome', '1'); localStorage.setItem('contabilidade-privacy', '0'); localStorage.setItem('contabilidade-v2', JSON.stringify(d)); localStorage.setItem('contabilidade-lastbackup', '2026-10-20'); localStorage.setItem('contabilidade-lastacc', 'a1'); localStorage.setItem('contabilidade-tab', 'accounts'); }, dados);
    await q.reload(); await q.waitForSelector('#view *'); await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); await q.click('[data-act=pin-set]'); await pin(q, '482913'); await pin(q, '482913');
    await q.evaluate(() => navigator.serviceWorker.ready); await esperarCaches(q, 'contabilidade-v15');
    await q.evaluate(async () => { for (const n of ['outra-app-v1', 'contabilidade-v3']) { const c = await caches.open(n); await c.put('/x', new Response('conteúdo de ' + n)); } });
    const c0 = await caches(q);
    R('ponto de partida: a instalação é a v20 (cache poupanca-v15), com PIN e dados', (await versao(q)) === 'v20' && !!c0['contabilidade-v15'] && await q.evaluate(() => !!localStorage.getItem('contabilidade-pin')), JSON.stringify(Object.keys(c0)));
    const antes = await q.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
    // publica a v21 e abre a app (navegador com os ficheiros da v20 ainda «frescos» durante 10 minutos)
    publicar('atual'); q = await reabrir(q);
    const v1 = await versao(q), coerente1 = await q.evaluate(() => ({ analise: !!document.querySelector('script[src="analise.js"]'), fn: typeof analysisView === 'function', v: VERSION }));
    console.log(`   (1.ª abertura depois de publicar a v21: a app corre a ${v1}. O service worker que está nos telemóveis (v20) é quem atende este pedido e pode devolver ficheiros guardados durante os 10 minutos do GitHub Pages; a nova versão instala-se em segundo plano)`);
    R('1.ª abertura depois de publicar: a app abre e funciona sem erros (como v20, ou como v21 completa), mesmo que o navegador misture ficheiros de duas versões', q.errs.length === 0 && (v1 === 'v20' || (v1 === VER && coerente1.fn)) && await q.evaluate(() => document.getElementById('view').children.length > 0), JSON.stringify(coerente1) + JSON.stringify(q.errs));
    const c1 = await esperarCaches(q, CACHE_ATUAL, 'contabilidade-v15');
    R('o novo service worker instala-se e ativa-se sozinho (cache da versão nova)', !!c1[CACHE_ATUAL], JSON.stringify(Object.keys(c1)));
    R('as caches antigas da Poupança foram apagadas (poupanca-v15 e poupanca-v3)', !c1['contabilidade-v15'] && !c1['contabilidade-v3'], JSON.stringify(Object.keys(c1)));
    R('a cache de OUTRA app da mesma origem não foi tocada (outra-app-v1)', !!c1['outra-app-v1'] && (await q.evaluate(async () => (await (await caches.open('outra-app-v1')).match('/x')).text())) === 'conteúdo de outra-app-v1');
    R('a cache nova tem TODOS os ficheiros, incluindo analise.js', ['index.html', 'app.js', 'analise.js', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', './'].every(f => c1[CACHE_ATUAL].includes(f)), JSON.stringify(c1[CACHE_ATUAL]));
    // a cache offline guarda exatamente os ficheiros da v21 (nunca cópias velhas do navegador)
    const iguais = await q.evaluate(async ([base, nome]) => { const out = {}; const c = await caches.open(nome); for (const f of ['index.html', 'app.js', 'analise.js', 'style.css']) { const dentro = await c.match(f); if (!dentro) { out[f] = 'em falta'; continue; } const rede = await fetch(f, { cache: 'reload' }); out[f] = (await dentro.text()) === (await rede.text()); } return out; }, [BASE, CACHE_ATUAL]);
    R('os ficheiros guardados na cache offline são exatamente os da v21 publicada', Object.values(iguais).every(v => v === true), JSON.stringify(iguais));
    q = await reabrir(q);
    R('na abertura seguinte a app já é a v21 (com analise.js)', (await versao(q)) === VER && await q.evaluate(() => typeof analysisView === 'function'));
    R('o PIN antigo continua a abrir a app depois da atualização', await q.isVisible('#lock:not([hidden])') && (await pin(q, '482913'), !(await q.isVisible('#lock'))));
    const depois = await q.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
    const difs = Object.keys({ ...antes, ...depois }).filter(k => antes[k] !== depois[k]);
    R('NENHUM dado guardado mudou na atualização (movimentos, contas, orçamentos, objetivos, PIN, preferências, data do backup)', difs.length === 0, difs.length ? 'mudou: ' + difs.join(', ') : `(${Object.keys(antes).length} chaves iguais byte a byte, ${sha(antes['contabilidade-v2'])})`);
    R('os dados continuam todos lá: contas, movimentos, orçamento, objetivo, recorrente e investimento', await q.evaluate(([c, e]) => db.accounts.length === c && db.entries.length === e && db.budgets.length === 1 && db.goals.length === 1 && db.recurring.length === 1 && db.invest.length === 1, [dados.accounts.length, dados.entries.length]));
    await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]'); const defs = await (async () => { await q.click('#defs'); const t = await q.textContent('#sheet'); await q.click('#sheet [data-act=cancel]'); return t; })();
    R(`Contas mostra «Poupança ${VER}» e o lembrete de backup da v20 mantém-se nas Definições (última cópia há 17 dias)`, (await q.textContent('#view')).includes('Poupança ' + VER) && defs.includes('há 17 dias'));
    await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-grid').catch(() => {}); R('a Análise abre com os dados antigos', await q.isVisible('.an-grid') && await q.isVisible('#an-bal svg'));
    const raw1 = await q.evaluate(() => localStorage.getItem('contabilidade-v2')); R('abrir a Análise depois da atualização não alterou os dados guardados', raw1 === antes['contabilidade-v2']);
    // offline depois da atualização
    await q.ctx.setOffline(true); q = await reabrir(q); await pin(q, '482913'); await q.click('[data-tab=entries]'); await q.click('[data-view=analysis]'); await q.waitForSelector('.an-grid').catch(() => {});
    R('sem rede, depois de atualizar: a app abre, pede o PIN e a Análise funciona', await q.isVisible('.an-grid') && (await versao(q)) === VER); await q.ctx.setOffline(false);
    R('sem erros de JavaScript em todo o processo de atualização', q.errs.length === 0, JSON.stringify(q.errs));

    // ===== U2: ficar sem rede no momento da publicação =====
    publicar('v20'); let q2 = await novo(b); todos.push(q2); await abrirApp(q2); await q2.evaluate(d => { localStorage.setItem('contabilidade-welcome', '1'); localStorage.setItem('contabilidade-privacy', '0'); localStorage.setItem('contabilidade-v2', JSON.stringify(d)); }, dados); await q2.reload(); await q2.evaluate(() => navigator.serviceWorker.ready); await esperarCaches(q2, 'contabilidade-v15');
    const raw2 = await q2.evaluate(() => localStorage.getItem('contabilidade-v2')); publicar('atual'); await q2.ctx.setOffline(true); q2 = await reabrir(q2);
    R('publicar uma versão nova com o telemóvel sem rede: a app antiga continua a funcionar e os dados ficam intactos', (await versao(q2)) === 'v20' && (await q2.evaluate(() => localStorage.getItem('contabilidade-v2'))) === raw2);
    await q2.ctx.setOffline(false); q2 = await reabrir(q2); await esperarCaches(q2, CACHE_ATUAL, 'contabilidade-v15'); q2 = await reabrir(q2);
    R('quando volta a haver rede, atualiza-se sozinha para a v21 sem perder dados', (await versao(q2)) === VER && (await q2.evaluate(() => localStorage.getItem('contabilidade-v2'))) === raw2);

    // ===== U3: atualizações futuras (versão atual → seguinte): a primeira abertura já traz a versão nova =====
    publicar('atual'); let q3 = await novo(b); todos.push(q3); await abrirApp(q3); await q3.evaluate(() => navigator.serviceWorker.ready); await esperarCaches(q3, CACHE_ATUAL); q3 = await reabrir(q3); await sleep(300);
    publicar('seguinte'); q3 = await reabrir(q3);
    R(`atualização futura ${VER} → ${NEXT}: a 1.ª abertura depois de publicar já mostra a ${NEXT} (apesar do max-age=600 do servidor)`, (await versao(q3)) === NEXT, 'versão a correr: ' + await versao(q3));
    publicar('atual'); let q5 = await novo(b); todos.push(q5); await abrirApp(q5); await q5.evaluate(() => navigator.serviceWorker.ready); await esperarCaches(q5, CACHE_ATUAL); await q5.reload(); await sleep(300); publicar('seguinte'); await q5.reload(); await q5.waitForFunction(() => document.getElementById('view') !== null);
    console.log(`   (nota: ao carregar no botão de recarregar do próprio separador, o Chromium pode reaproveitar ficheiros que já tem em memória e mostrar ainda a ${await versao(q5)}; ao fechar e abrir a app já aparece a ${NEXT})`);
    // controlo negativo: sem as proteções, a mesma atualização fica presa na versão velha
    publicar('atualvelho'); let q4 = await novo(b); todos.push(q4); await abrirApp(q4); await q4.evaluate(() => navigator.serviceWorker.ready); await esperarCaches(q4, CACHE_ATUAL); q4 = await reabrir(q4); await sleep(300);
    publicar('seguinte'); q4 = await reabrir(q4);
    R('controlo negativo: SEM as proteções, o mesmo cenário ficaria preso na v21 (prova que as proteções fazem falta)', (await versao(q4)) === VER, 'versão a correr: ' + await versao(q4));

    // ===== U4: coerência entre os números da versão =====
    const swTxt = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), appTxt = fs.readFileSync(path.join(RAIZ, 'app.js'), 'utf8'), htmlTxt = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    const ver = (appTxt.match(/const VERSION = '(v\d+)'/) || [])[1], cache = (swTxt.match(/const CACHE = '([^']+)'/) || [])[1];
    R('o nome da cache do service worker acompanha a versão da app', cache === 'contabilidade-' + ver, `(app ${ver}, cache ${cache})`);
    const lista = (swTxt.match(/const FILES = \[([^\]]*)\]/) || [])[1].split(',').map(s => s.trim().replace(/'/g, '')); const refs = [...htmlTxt.matchAll(/(?:href|src)="([^"#:]+)"/g)].map(m => m[1]);
    R('todos os ficheiros que o index.html usa estão na lista da cache offline', refs.every(r => lista.includes(r)), JSON.stringify(refs.filter(r => !lista.includes(r))));
    R('todos os ficheiros da lista da cache existem na pasta do projeto', lista.filter(f => f !== './').every(f => fs.existsSync(path.join(RAIZ, f))), JSON.stringify(lista.filter(f => f !== './' && !fs.existsSync(path.join(RAIZ, f)))));
    R('o service worker só apaga caches que começam por «poupanca-» e nunca guarda erros', swTxt.includes("k.startsWith('contabilidade-')") && swTxt.includes('if (r.ok)'));
  } finally { servidor.close(); }
  fim(todos.flatMap(x => x.errs)); await b.close();
})();
