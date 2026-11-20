# Poupança (PWA)

App pessoal de finanças. Os dados ficam só no telemóvel, sem servidor nem conta.

Versão **v27**: desafio do dia (408 desafios, muda todos os dias), resumo do mês, objetivos prontos, faturas para o IRS e exportação para Excel, sobre o aspeto bem.contado da v26. A descrição completa está em `docs/ALTERACOES.md`.

## Publicar no GitHub Pages
1. Carrega para a raiz do repositório estes ficheiros: `index.html`, `app.js`, `analise.js`, `desafios.js`, `style.css`, `sw.js`, `manifest.webmanifest` e as pastas `icons` e `fonts`.
2. Settings → Pages → Deploy from a branch → `main` / `(root)`.
3. Abre `https://O-TEU-UTILIZADOR.github.io/contabilidade/` no telemóvel.

## Instalar
- **iPhone:** abre o link no Safari → Partilhar → Adicionar ao ecrã principal.
- **Android:** no Chrome, ⋮ → Instalar aplicação.

## Testes
Os testes estão em `testes/` (ver `docs/TESTES.md` e `docs/RESULTADOS.txt`). Não é preciso publicá-los.

## Atualizar a versão publicada
1. No repositório do GitHub, substitui estes ficheiros pelos desta pasta: `index.html`, `app.js`, `analise.js`, `style.css`, `sw.js` e `manifest.webmanifest`, e a pasta `icons`. Acrescenta o ficheiro novo `desafios.js` e, se ainda não a tiveres, a pasta `fonts` (letra Manrope).
2. Espera 1 a 2 minutos, até o GitHub Pages publicar.
3. No telemóvel, fecha a app e volta a abri-la (às vezes é preciso abrir duas vezes). Em Contas, ao fundo, deve aparecer «Poupança v27».
Os dados ficam no telemóvel e não se perdem na atualização. Mesmo assim, exporta uma cópia de segurança antes (⚙️ Definições → Exportar).
