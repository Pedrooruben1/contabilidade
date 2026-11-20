require('./_saida');
const { chromium } = require('playwright'); const fs = require('fs');
const S = '/tmp/poupanca-testes';
(async () => {
  const b = await chromium.launch(); const errs = []; const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const U = 'http://localhost:8780/index.html';
  let dialogs = [], accept = true;
  const mk = async () => { const q = await (await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); }); return q; };
  const raw = (q, k) => q.evaluate(k => localStorage.getItem(k), k);
  const setRaw = async (q, v) => { await q.goto(U); await q.evaluate(v => { localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-privacy', '0'); localStorage.setItem('poupanca-v2', v); }, v); await q.reload(); await q.waitForTimeout(300); };

  // 1) dados danificados
  for (const bad of ['{"accounts":[{"id":1', '{}', 'null', '[]', '"texto"', '{"accounts":5}']) {
    const q = await mk(); await setRaw(q, bad);
    const corrupt = await q.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('poupanca-corrupt-')).map(k => localStorage.getItem(k)));
    R(`dados «${bad.slice(0, 22)}»: avisa e guarda cópia`, (await q.isVisible('#sheet-bg')) && (await q.textContent('#sheet')).includes('Dados danificados') && corrupt.includes(bad));
  }
  let q = await mk(); const badRaw = '{"accounts":[{"id":"a","name":"Banco","kind":"ordem","opening":1000'; await setRaw(q, badRaw);
  R('aviso: os dados originais ainda estão guardados antes de qualquer escrita', (await raw(q, 'poupanca-v2')) === badRaw);
  const [dl] = await Promise.all([q.waitForEvent('download'), q.click('[data-act=export-corrupt]')]); const p = S + '/corrupto.json'; await dl.saveAs(p);
  R('«Exportar os dados danificados» descarrega o conteúdo original', fs.readFileSync(p, 'utf8') === badRaw);
  await q.click('[data-act=welcome-close]'); await q.click('[data-tab=accounts]'); await q.click('#add'); await q.fill('[name=name]', 'Nova'); await q.fill('[name=amount]', '5'); await q.click('[data-act=save]');
  const after = await q.evaluate(() => ({ v2: JSON.parse(localStorage.getItem('poupanca-v2')).accounts.length, corrupt: Object.keys(localStorage).filter(k => k.startsWith('poupanca-corrupt-')).map(k => localStorage.getItem(k)) }));
  R('criar uma conta nova não perde a cópia dos dados danificados', after.v2 === 1 && after.corrupt.includes(badRaw));
  await q.reload(); R('depois de reabrir não volta a avisar', !(await q.isVisible('#sheet-bg')));
  // sem falsos alarmes
  q = await mk(); await q.goto(U); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(300);
  R('primeira abertura: só as boas-vindas, sem aviso de danificados', (await q.textContent('#sheet')).includes('Bem-vindo') && !(await q.textContent('#sheet')).includes('danificados'));
  q = await mk(); await setRaw(q, JSON.stringify({ accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 1 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] })); R('dados válidos: sem aviso', !(await q.isVisible('#sheet-bg')));
  // com PIN
  q = await mk(); await setRaw(q, JSON.stringify({ accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 1 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] }));
  await q.click('[data-tab=accounts]'); await q.click('#defs'); await q.click('[data-act=pin-set]'); for (let i = 0; i < 2; i++) { for (const d of '123456') await q.click(`[data-pin="${d}"]`); await q.waitForTimeout(350); }
  await q.evaluate(() => localStorage.setItem('poupanca-v2', '{lixo')); await q.reload(); await q.waitForSelector('#lock:not([hidden])');
  R('com PIN: primeiro pede o PIN', !(await q.isVisible('#sheet-bg'))); for (const d of '123456') await q.click(`[data-pin="${d}"]`); await q.waitForTimeout(500);
  R('com PIN: depois de desbloquear, avisa dos dados danificados', await q.isVisible('#sheet-bg') && (await q.textContent('#sheet')).includes('Dados danificados'));

  // 2) importar ficheiros inválidos
  const valid = { accounts: [{ id: 'a', name: 'Banco', kind: 'ordem', opening: 100 }], entries: [{ id: 'e', date: '2026-01-02', kind: 'expense', amount: 5, accountId: 'a', category: 'outros', note: 'x' }], budgets: [], goals: [], recurring: [], invest: [] };
  q = await mk(); const mine = { accounts: [{ id: 'z', name: 'Minha', kind: 'ordem', opening: 7 }], entries: [], budgets: [], goals: [], recurring: [], invest: [] }; await setRaw(q, JSON.stringify(mine));
  await q.click('[data-tab=accounts]'); await q.click('[data-seg=accounts]');
  const tryFile = async (name, content) => { fs.writeFileSync(S + '/' + name, content); dialogs = []; await q.setInputFiles('#file', S + '/' + name); await q.waitForTimeout(250); return { toast: (await q.textContent('#toast')).trim(), asked: dialogs.length, db: JSON.parse(await raw(q, 'poupanca-v2')).accounts.map(a => a.id).join() }; };
  for (const [n, c] of [['{}', '{}'], ['[]', '[]'], ['"x"', '"x"'], ['{"accounts":5}', '{"accounts":5}'], ['vazio com listas', '{"accounts":[],"entries":[],"budgets":[],"goals":[]}'], ['só movimentos', '{"entries":[{"id":"e","amount":5}]}'], ['não é JSON', 'isto não é json'], ['outro formato', '{"name":"x","items":[1,2,3]}'], ['movimentos sem contas', '{"accounts":[],"entries":[{"id":"e","amount":5}]}']]) {
    const r = await tryFile('imp.json', c); R(`rejeita «${n}» sem pedir confirmação e sem apagar nada`, r.asked === 0 && r.db === 'z' && r.toast.length > 0, r.toast);
  }
  // 3) cancelar e escolher o mesmo ficheiro outra vez
  fs.writeFileSync(S + '/ok.json', JSON.stringify(valid)); accept = false; dialogs = [];
  await q.setInputFiles('#file', S + '/ok.json'); await q.waitForTimeout(250);
  R('cancelar não altera os dados', (await raw(q, 'poupanca-v2')).includes('"z"') && dialogs.length === 1, dialogs[0]);
  R('o campo do ficheiro fica limpo (permite escolher o mesmo ficheiro)', await q.evaluate(() => document.getElementById('file').value === ''));
  accept = true; dialogs = []; await q.setInputFiles('#file', S + '/ok.json'); await q.waitForTimeout(300);
  R('escolher o mesmo ficheiro outra vez importa', JSON.parse(await raw(q, 'poupanca-v2')).accounts[0].id === 'a', dialogs[0]);
  R('a confirmação mostra contas, movimentos, orçamentos e objetivos', /1 conta\(s\), 1 movimento\(s\), 0 orçamento\(s\) e 0 objetivo\(s\)/.test(dialogs[0]));
  // desfazer
  await q.click('[data-tab=home]'); await q.click('[data-tab=accounts]'); await q.click('#defs'); R('botão «Desfazer a última importação» aparece (Definições)', await q.isVisible('[data-act=undo-import]'));
  await q.click('[data-act=undo-import]'); await q.waitForTimeout(250);
  R('desfazer repõe os dados de antes da importação', JSON.parse(await raw(q, 'poupanca-v2')).accounts[0].id === 'z' && !(await q.isVisible('[data-act=undo-import]')));
  console.log('erros JS:', errs); await b.close();
})();
