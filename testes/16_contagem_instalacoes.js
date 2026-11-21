// v28: contagem anónima de instalações (GoatCounter). Servir a pasta da app em http://localhost:8780 antes de correr.
// O endereço oficial (poupanca.bemcontadopt.pt) é simulado com --host-resolver-rules a apontar para o servidor local,
// e os pedidos ao contador são intercetados: nada sai para a internet.
const { chromium, fs, R, fim } = require('./comum');
const OFICIAL = 'http://poupanca.bemcontadopt.pt:8780/index.html';
const LOCAL = 'http://localhost:8780/index.html';
const GIF = Buffer.from('R0lGODlhAQABAAAAACw=', 'base64');
const STANDALONE = `(() => { const mm = window.matchMedia.bind(window);
  window.matchMedia = q => /display-mode:\\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); })();`;

(async () => {
  const b = await chromium.launch({ args: ['--host-resolver-rules=MAP poupanca.bemcontadopt.pt 127.0.0.1'] });
  const errs = [];
  const contexto = async (standalone) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const hits = [];
    await ctx.route('https://bemcontadopt.goatcounter.com/**', r => { hits.push(r.request().url()); r.fulfill({ status: 200, contentType: 'image/gif', body: GIF }); });
    if (standalone) await ctx.addInitScript(STANDALONE);
    const q = await ctx.newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept());
    return { ctx, q, hits };
  };
  const espera = ms => new Promise(r => setTimeout(r, ms));

  // 1. Endereço oficial, aberta a partir do ecrã principal pela primeira vez: um só sinal «primeira-abertura».
  {
    const { ctx, q, hits } = await contexto(true);
    await q.goto(OFICIAL); await q.waitForSelector('#view'); await espera(600);
    R('oficial + ecrã principal: 1 sinal na primeira abertura', hits.length === 1, JSON.stringify(hits));
    const u = hits[0] ? new URL(hits[0]) : null;
    R('o sinal é o evento /app/primeira-abertura', !!u && u.searchParams.get('p') === '/app/primeira-abertura' && u.searchParams.get('e') === 'true');
    R('o sinal só leva p, t, e e rnd (nenhum dado da app)', !!u && [...u.searchParams.keys()].sort().join(',') === 'e,p,rnd,t', u ? u.search : '');
    R('a marca de contagem fica guardada', await q.evaluate(() => localStorage.getItem('contabilidade-contagem')) === '1');
    await q.reload(); await q.waitForSelector('#view'); await espera(600);
    R('ao reabrir não volta a contar', hits.length === 1, JSON.stringify(hits));
    await ctx.close();
  }

  // 2. Endereço oficial no browser (não instalada): não conta ao abrir; conta «instalada» quando o browser avisa.
  {
    const { ctx, q, hits } = await contexto(false);
    await q.goto(OFICIAL); await q.waitForSelector('#view'); await espera(600);
    R('oficial no browser: nenhum sinal ao abrir', hits.length === 0, JSON.stringify(hits));
    await q.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await espera(600);
    R('evento appinstalled: 1 sinal /app/instalada', hits.length === 1 && new URL(hits[0]).searchParams.get('p') === '/app/instalada', JSON.stringify(hits));
    await ctx.close();
  }

  // 3. Outro endereço (localhost, testes, desenvolvimento): nunca conta, nem guarda a marca.
  {
    const { ctx, q, hits } = await contexto(true);
    await q.goto(LOCAL); await q.waitForSelector('#view'); await espera(600);
    await q.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await espera(400);
    R('localhost: nenhum sinal', hits.length === 0, JSON.stringify(hits));
    R('localhost: não guarda a marca de contagem', await q.evaluate(() => localStorage.getItem('contabilidade-contagem')) === null);
    await ctx.close();
  }

  // 4. Política de segurança: só a imagem do contador é permitida; o código continua a ser só o da app.
  {
    const html = fs.readFileSync('index.html', 'utf8');
    const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
    R('CSP: img-src permite só o contador da bem.contado', /img-src 'self' data: blob: https:\/\/bemcontadopt\.goatcounter\.com;/.test(csp), csp);
    R("CSP: script-src continua 'self'", /script-src 'self';/.test(csp));
    R('CSP: não há connect-src aberto', !/connect-src/.test(csp));
  }

  await b.close();
  fim(errs);
})();
