require('./_saida');
const { chromium } = require('playwright'); const fs = require('fs');
const S = '/tmp/poupanca-testes';
(async () => {
  const b = await chromium.launch(); const errs = []; const R = (n, ok, x = '') => console.log(ok ? 'OK  ' : 'FALHA', n, x);
  const U = 'http://localhost:8780/index.html'; let msgs = [];
  const q = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const today = ymd(new Date());
  await q.goto(U); await q.evaluate(() => { localStorage.setItem('poupanca-welcome', '1'); localStorage.setItem('poupanca-privacy', '0'); }); await q.reload();
  const E = (id, date) => ({ id, date, kind: 'expense', amount: 5, accountId: 'a', category: 'outros', note: id });
  const file = { accounts: [{ id: 'a', name: 'B', kind: 'ordem', opening: 100 }], budgets: [], goals: [{ id: 'g', name: 'G', target: 100, saved: 0, deadline: '2026-02-30', created: '2026-13-01' }], recurring: [{ id: 'r', name: 'R', kind: 'expense', amount: 5, accountId: 'a', freq: 'monthly', next: '2026-04-31' }], invest: [],
    entries: [E('fev30', '2026-02-30'), E('mes13', '2026-13-45'), E('mes0', '2026-00-10'), E('dia0', '2026-05-00'), E('abr31', '2026-04-31'), E('bissexto', '2024-02-30'), E('valida', '2024-02-29'), E('normal', '2026-01-15'), E('ano0', '0000-01-01'), E('texto', 'ontem'), E('hora', '2026-03-10T23:00:00Z')] };
  fs.writeFileSync(S + '/datas.json', JSON.stringify(file));
  await q.click('[data-tab=accounts]'); msgs = []; await q.setInputFiles('#file', S + '/datas.json'); await q.waitForTimeout(400);
  const st = await q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2'))); const d = Object.fromEntries(st.entries.map(e => [e.note, e.date]));
  R('30/02/2026 → 28/02/2026 (último dia do mês)', d.fev30 === '2026-02-28', d.fev30);
  R('30/02/2024 → 29/02/2024 (bissexto)', d.bissexto === '2024-02-29', d.bissexto);
  R('31/04 → 30/04', d.abr31 === '2026-04-30', d.abr31);
  R('mês 13, mês 0, dia 0, ano 0 e texto → hoje', [d.mes13, d.mes0, d.dia0, d.ano0, d.texto].every(x => x === today), JSON.stringify([d.mes13, d.mes0, d.dia0, d.ano0, d.texto]));
  R('datas válidas ficam como estão (29/02/2024, 15/01/2026, data com hora)', d.valida === '2024-02-29' && d.normal === '2026-01-15' && d.hora === '2026-03-10', JSON.stringify([d.valida, d.normal, d.hora]));
  R('prazo do objetivo 30/02 → 28/02; data de criação inválida → hoje', st.goals[0].deadline === '2026-02-28' && st.goals[0].created === today, JSON.stringify([st.goals[0].deadline, st.goals[0].created]));
  R('recorrente com próxima data 31/04 → 30/04', st.recurring[0].next >= '2026-04-30' || st.entries.some(e => e.note === 'R'), st.recurring[0].next);
  R('confirmação avisa das datas corrigidas', /data\(s\) impossíveis/.test(msgs[0] || ''), (msgs[0] || '').split('\n').pop());
  R('depois de importar, nenhuma data é inválida', st.entries.every(e => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date); if (!m) return false; const dt = new Date(+m[1], +m[2] - 1, +m[3]); return dt.getMonth() === +m[2] - 1 && dt.getDate() === +m[3]; }));
  // editar um movimento corrigido: o campo da data tem valor
  await q.click('[data-tab=entries]'); await q.click('[data-edit-entry]'); R('editar: o campo da data nunca aparece vazio', (await q.inputValue('[name=date]')) !== '');
  await q.fill('[name=date]', ''); await q.fill('[name=amount]', '5'); await q.click('[data-act=save]');
  R('guardar sem data avisa em vez de usar hoje em silêncio', (await q.textContent('#err')).includes('data válida') && await q.isVisible('#sheet-bg'));
  await q.click('[data-act=cancel]');
  // dados já guardados com datas impossíveis são corrigidos ao abrir
  await q.evaluate(f => { const o = JSON.parse(localStorage.getItem('poupanca-v2')); o.entries[0].date = '2026-02-30'; localStorage.setItem('poupanca-v2', JSON.stringify(o)); }); await q.reload(); await q.waitForTimeout(300);
  R('dados antigos com data impossível são corrigidos ao abrir a app', (await q.evaluate(() => JSON.parse(localStorage.getItem('poupanca-v2')).entries.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)))) && !(await q.evaluate(() => document.getElementById('view').textContent.includes('Invalid'))));
  console.log('erros JS:', errs); await b.close();
})();
