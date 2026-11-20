require('./_saida');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const q = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await q.clock.install();
  await q.goto('http://localhost:8780/index.html'); await q.evaluate(() => { localStorage.removeItem('poupanca-privacy'); localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-v2', JSON.stringify({ accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 1234.5 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] })); }); await q.reload();
  const hero = () => q.textContent('.hero b'); const bx = await (await q.$('#eye')).boundingBox(); const x = bx.x + 22, y = bx.y + 22;
  for (const ms of [50, 500, 900, 3000, 20000]) {
    await q.mouse.move(x, y); await q.mouse.down(); await q.clock.fastForward(ms); const during = (await hero()).includes('1234,50');
    await q.mouse.up(); await q.clock.fastForward(50); R(`premir ${ms} ms: mostra enquanto premido e esconde logo ao largar`, during && (await hero()).includes('••••'));
  }
  await q.clock.fastForward(20000); R('depois de 20 s continua escondido', (await hero()).includes('••••'));
  await q.focus('#eye'); await q.keyboard.press('Enter'); R('Enter no olho mostra', (await hero()).includes('1234,50')); await q.clock.fastForward(16000); R('e esconde sozinho aos 15 s', (await hero()).includes('••••'));
  await q.keyboard.press('Space'); R('Espaço no olho mostra', (await hero()).includes('1234,50')); await q.keyboard.press('Space'); R('Espaço outra vez esconde', (await hero()).includes('••••'));
  await b.close();
})();
