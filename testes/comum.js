// Utilitários comuns dos testes da Análise. Servir a pasta da app em http://localhost:8780 antes de correr.
const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const APP = process.env.APP || 'http://localhost:8780/index.html';
const TMP = process.env.TESTES_TMP || path.join(os.tmpdir(), 'contabilidade-testes'); fs.mkdirSync(TMP, { recursive: true });
let total = 0, falhas = 0;
const R = (nome, ok, extra = '') => { total++; if (!ok) falhas++; console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${extra ? ' ' + extra : ''}`); };
const fim = errs => { console.log(`resumo: ${total - falhas}/${total} verificações OK${falhas ? ', ' + falhas + ' FALHA(S)' : ''}${errs && errs.length ? ' | erros JS: ' + JSON.stringify(errs) : ''}`); process.exitCode = falhas || (errs && errs.length) ? 1 : 0; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const vazio = () => ({ accounts: [], entries: [], budgets: [], goals: [], recurring: [], invest: [] });
async function novo(browser, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...opt }); const q = await ctx.newPage(); const errs = [];
  q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept()); q.errs = errs; q.ctx = ctx; return q;
}
async function semear(q, db, { privacidade = false } = {}) {
  await q.goto(APP);
  await q.evaluate(([d, pv]) => { localStorage.clear(); localStorage.setItem('contabilidade-welcome', '1'); if (!pv) localStorage.setItem('contabilidade-privacy', '0'); localStorage.setItem('contabilidade-v2', JSON.stringify(d)); }, [db, privacidade]);
  await q.reload(); await q.waitForSelector('.hero');
}
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const python = (script, ...args) => cp.execFileSync('python3', ['-I', path.join(__dirname, script), ...args], { maxBuffer: 1 << 30 });
module.exports = { chromium, fs, path, APP, TMP, R, fim, ymd, dia, vazio, novo, semear, igual, python };
