// Contador anónimo da página de instalação (GoatCounter da bem.contado, sem cookies).
// Conta a visita à página (e de onde veio) e os cliques nos botões com data-contar. Só no endereço oficial.
(() => {
  if (location.hostname !== 'poupanca.bemcontadopt.pt') return;
  const URL_CONTADOR = 'https://bemcontadopt.goatcounter.com/count';
  const enviar = params => {
    const q = new URLSearchParams({ ...params, rnd: Math.random().toString(36).slice(2) });
    const url = `${URL_CONTADOR}?${q}`;
    try { if (navigator.sendBeacon && navigator.sendBeacon(url)) return; } catch (e) {}
    try { new Image().src = url; } catch (e) {}
  };
  enviar({ p: '/instalar', t: 'Página de instalação', r: document.referrer || '' });
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-contar]');
    if (el) enviar({ p: '/instalar/' + el.dataset.contar, t: el.dataset.contar, e: 'true' });
  });
})();
