# Como correr os testes

## Requisitos
- Node.js e Python 3.
- Na pasta do projeto: `npm i playwright axe-core` e `npx playwright install chromium`.

## Correr tudo
```
sh testes/executar-todos.sh
```
O script serve a pasta do projeto em `http://localhost:8780`, corre todos os testes e escreve `TUDO OK` ou `HÁ FALHAS`. Cada teste imprime `OK` ou `FALHA` por verificação. Os ficheiros temporários vão para `/tmp/poupanca-testes`.

### Como o executor decide
Um teste só é aprovado se: o código de saída for 0, não houver linhas «FALHA», não houver erros de JavaScript e houver pelo menos uma verificação «OK». Cada teste tem um limite de 280 s. Antes de começar, o executor confirma que o servidor na porta 8780 serve **esta** pasta (senão recusa, código 2). No fim escreve `TUDO OK` (código 0) ou `HÁ FALHAS` (código 1).

`sh testes/autoteste_executor.sh` prova que o executor reprova os casos maus (exceção, código 1, teste silencioso, promessa rejeitada, erros de JavaScript, teste antigo com falha, bloqueio) e aprova só os bons.

## Os testes de atualização
`10_atualizacao_do_servico.js` usa um servidor Node que imita o GitHub Pages (`Cache-Control: max-age=600` e validação por ETag) e troca a versão «publicada» na mesma origem. Parte dos ficheiros da v20 que estão publicados (`testes/versao-anterior-v20`).

## Correr um só teste
Com o servidor ligado (`python3 -m http.server 8780` na pasta do projeto):
```
node testes/01_oraculo.js
```

## O cálculo independente
`testes/oracle.py` calcula saldos e totais em Python, com `datetime`, `calendar` e inteiros em cêntimos, sem partilhar código com a app. `gen.py` gera dados aleatórios com semente fixa (os resultados são repetíveis) e `cenarios.py` cria os cenários. `01_oraculo.js` e `07_fusos.js` comparam a app com o resultado esperado.

## `verificar_reconstrucao.py`
Verifica, sobre 60 conjuntos de dados, que o saldo histórico reconstruído de hoje é igual ao saldo atual de cada conta.

## `capturas.js`
Tira capturas de ecrã da Análise (claro, escuro, 320 px, modo privado) para `/tmp/poupanca-testes/capturas`.

## `12_correcoes_da_auditoria.js` (v23)
Confirma, uma a uma, as correções do Lote 1 da auditoria (`docs/AUDITORIA_v22.md`): contas ao cêntimo («-0,00 €», aviso de saldo negativo, objetivo a 99%), datas fora de 1900–2200, «Esqueci-me do PIN», importação de ficheiros alterados, separador guardado inválido, modo privado no formulário do objetivo, acessibilidade e hora de verão. Também verifica que o que estava certo continua certo: datas normais, o aviso quando o saldo fica mesmo negativo e os nomes da app Swift.

Controlo negativo: o mesmo teste corrido sobre a v22 reprova (22 verificações FALHA).

## `13_interface_v24.js` (v24)
Verifica a interface da v24:
- Início: os alertas aparecem logo a seguir ao cartão verde, já não há gráficos nem quadro repetido do património, aparece «= igual» e o «+» abre um movimento com o teclado no valor.
- Modo privado: a taxa de poupança fica escondida.
- Definições (⚙️): a cópia de segurança, o modo privado, o PIN e a ajuda estão lá, e importar funciona a partir daí.
- Movimentos: há separadores por mês com totais, os filtros cabem numa linha e o botão «Limpar filtros» funciona.
- Formulário: sem objetivos, não aparece o campo «objetivo».
- Objetivos: o cartão é compacto e «Juntar dinheiro» cria a transferência e soma ao objetivo.
- Ecrã de 320 px: o título e os botões do topo cabem.

## `15_interface_v26.js` (v26)
Verifica o aspeto e as ajudas da v26: ícones desenhados nos separadores, letra Manrope local, cores da marca, «Até X por dia» (previsão ÷ dias que faltam, escondido no modo privado), a semana (dias, pontos, total e dia escolhido, sem agendados), os primeiros passos (contagem, atalhos e «Esconder»), os desenhos nos ecrãs vazios, o ecrã de 320 px e as letras na cache offline.
