// Faz os testes antigos devolverem o código de saída certo: 1 se houver alguma linha «FALHA» ou se não houver nenhuma «OK».
// (Os testes novos já fazem isto através de fim() em comum.js.) Cada teste antigo começa com: require('./_saida');
let oks = 0, falhas = 0;
const original = console.log;
console.log = (...a) => {
  const s = String(a[0]);
  if (s.startsWith('FALHA')) falhas++; else if (s.startsWith('OK')) oks++;
  original(...a);
};
process.on('exit', () => {
  if (falhas) process.exitCode = 1;
  else if (!oks) { original('FALHA: o teste não produziu nenhuma verificação OK'); process.exitCode = 1; }
});
