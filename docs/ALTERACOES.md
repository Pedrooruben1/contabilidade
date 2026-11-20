# Poupança v26: identidade bem.contado e ajudas para quem está a começar

Base: v25. **Os dados não mudam.** A lógica, as contas, os cálculos e o formato das cópias de segurança são os mesmos; mudou o aspeto e há três ajudas novas no Início.

## Aspeto
- Cores da bem.contado: fundo creme, azul (#17324D) no texto, no cartão principal e na barra de separadores, e âmbar (#E09F3E) nos destaques. No modo escuro, fundo azul-escuro e botões em âmbar.
- Letra Manrope, guardada dentro da app (pasta `fonts`), por isso funciona sem internet.
- Traço à mão: sublinhado âmbar por baixo do saldo e dos títulos, um desenho de moedas no cartão principal, ícones desenhados nos separadores e desenhos nos ecrãs vazios e nas boas-vindas.
- Barra de separadores flutuante, com o separador ativo num círculo âmbar, e o «+» em âmbar.
- Ícones novos da app (moedas com um rebento, em azul). No iPhone, para ver o ícone novo pode ser preciso apagar o atalho e voltar a adicioná-lo ao ecrã principal (exporta antes uma cópia de segurança).

## Ajudas novas no Início
- **Primeiros passos:** uma lista com 5 passos (conta, primeiro movimento, orçamento, objetivo e cópia de segurança). Cada passo abre o sítio certo. Desaparece quando está tudo feito ou ao tocar em «Esconder esta lista».
- **Esta semana:** os dias de segunda a domingo, com hoje em âmbar e um ponto nos dias com despesas. Tocar num dia mostra quanto se gastou nesse dia. Os movimentos agendados não contam.
- **Até X por dia até ao fim do mês:** no cartão principal. É a previsão do saldo no fim do mês (contas à ordem e dinheiro, já com recorrentes e agendados) a dividir pelos dias que faltam, contando com hoje. Só aparece quando a previsão é positiva e respeita o modo privado.

## Testes
- Novo `testes/15_interface_v26.js` (22 verificações).
- `testes/04_interface.js`: a verificação «sem gráficos» na Análise vazia passa a ignorar o desenho decorativo (`svg.art`); continua a exigir que não haja gráficos.

# Poupança v25: 9 categorias novas

Base: v24. **Só se acrescentaram categorias.** As 12 categorias antigas continuam iguais, com as mesmas chaves nos dados, por isso os movimentos, os orçamentos e as cópias de segurança antigos ficam como estavam.

## Categorias novas
💈 Cabeleireiro e estética · 🏋️ Ginásio · 👕 Roupa e calçado · ⛽ Automóvel · ☕ Cafés e pequenos-almoços · 🎁 Presentes · 🐶 Animais de estimação · 📚 Educação e formação · 💸 Impostos e taxas

- Aparecem em todo o lado: no formulário do movimento, nos orçamentos, nos filtros de Movimentos e na Análise.
- Para mudar uma despesa antiga, abre-a, escolhe a categoria nova e guarda. Só muda a categoria: valor, data, conta, nota, objetivo e saldos ficam iguais.
- O **Desporto** passou a ter o ícone ⚽, porque o 🏋️ é agora do Ginásio.
- **Registo rápido:** as palavras passam a ir para as categorias novas. Por exemplo, «café» e «pastelaria» vão para Cafés; «gasolina», «portagem» e «estacionamento» para Automóvel; «ginásio» para Ginásio; «roupa», «zara» e «sapatilhas» para Roupa; «prenda» para Presentes; «livro» e «curso» para Educação; «IUC», «IRS» e «comissão» para Impostos; «cabeleireiro» e «unhas» para Cabeleireiro; «veterinário» e «ração» para Animais. «Almoço» e «jantar» continuam em Restaurantes, e «uber» e «metro» em Transportes. Confirmas sempre antes de guardar.
- **Atenção:** se importares uma cópia de segurança desta versão numa versão antiga da app, as despesas das categorias novas aparecem lá como «Outros».

## Testes
- **Teste novo** `testes/14_categorias_novas.js`, com 14 verificações. Muda 9 despesas antigas para as categorias novas pelo formulário e confirma:
  - que não há nenhum erro;
  - que saldos, disponível, total de despesas e objetivo ficam iguais;
  - que só a categoria muda;
  - que a Análise, os filtros e os orçamentos funcionam com as categorias novas;
  - que exportar e importar mantém as categorias;
  - que voltar a uma categoria antiga funciona;
  - que o registo rápido acerta.
- Os testes do registo rápido que esperavam «café → Restaurantes» e «ginásio → Desporto» foram atualizados para as categorias novas.
- Toda a bateria passa (ver `docs/RESULTADOS.txt`). Não testado num telemóvel real.

---

# Histórico: v24 (interface mais simples)

Base: v23 (correções da auditoria). **Só muda a interface.** As contas, as regras financeiras, a Análise, os dados guardados e as cópias de segurança são os mesmos. As ideias que deram origem a estas mudanças estão em `docs/IDEIAS_INTERFACE.md`.

## 1. O que mudou

1. **Início mais curto** (cerca de metade do comprimento):
   - Os **alertas** aparecem logo a seguir ao cartão verde.
   - O cartão verde mostra também a **Poupança** e o **Património líquido**. Saiu o quadro repetido do património, que continua em Contas → Património.
   - Receitas, despesas e taxa de poupança do mês ficam num só cartão. Quando nada mudou face ao mês anterior, aparece «= igual ao mesmo período do mês anterior».
   - Os gráficos e as despesas por categoria saíram do Início: estão na **Análise**, e o atalho «Ver análise completa» subiu.
   - Ficam o registo rápido, a previsão do fim do mês, os objetivos, as contas e os últimos movimentos.
2. **Um só «+», sempre no canto.** No Início abre um movimento novo. Saíram os dois botões grandes «Adicionar despesa» e «Adicionar receita», porque o «+» e o registo rápido fazem o mesmo.
3. **Definições (⚙️)** no topo de todos os ecrãs, com a cópia de segurança (exportar, importar, desfazer), o modo privado, o PIN e a ajuda. O separador Contas fica só com contas, recorrentes e património, e com uma linha a lembrar que, para acertar o saldo de uma conta, se edita o «saldo inicial».
4. **Movimentos por mês.** Cada mês tem um título com as receitas e as despesas desse mês. Os três filtros cabem numa linha, ficam realçados quando estão ativos e há «✕ Limpar filtros». O quadro de totais só aparece quando há filtros.
5. **Novo movimento.** O teclado abre logo no valor, que tem letra maior. O campo «objetivo» só aparece se houver objetivos e tem um rótulo curto.
6. **Objetivos compactos.** Cada cartão mostra «Já poupado X de Y», «Faltam … até … · Poupança mensal necessária», o estado e um botão **«+ Juntar dinheiro»**. Esse botão abre uma transferência para a poupança já associada ao objetivo, por isso o dinheiro muda mesmo de conta. Tocar no cartão abre o objetivo para editar. Saiu o «ajuste manual ±10 €»; o valor poupado «à mão» continua editável dentro do objetivo.
7. **Modo privado.** A taxa de poupança também fica escondida (••••). Como os gráficos saíram do Início, também já não se vê a forma dos gráficos.
8. **Ecrãs estreitos.** A 320 px de largura, o título e os três botões do topo cabem.

## 2. O que não mudou (de propósito)
- Os 5 separadores e a Análise dentro de Movimentos, para não mudar a navegação a que já estás habituado.
- O gráfico de saldo do mês atual na Análise, que continua a mostrar o mês inteiro (está certo).
- As regras financeiras, os dados guardados, as cópias de segurança e o service worker.

## 3. Testes
- **Teste novo:** `testes/13_interface_v24.js`, com 26 verificações da nova interface: ordem do Início, Definições, Movimentos por mês e filtros, formulário, «Juntar dinheiro» e ecrã de 320 px.
- **Testes adaptados ao sítio novo das coisas**, com as mesmas verificações: 03, 10, 11 e 12, e os anteriores 10, 12, 14, 15, 16 e 17. Os botões de cópia de segurança e PIN passaram para as Definições, os cartões do mês do Início juntaram-se num só e o quadro do património ficou só em Contas → Património.
- No teste 16, a verificação da taxa de poupança corre agora com o modo privado desligado, porque na v24 o modo privado também esconde a taxa.
- O teste de acessibilidade (axe) encontrou um problema verdadeiro na primeira versão desta interface: o verde dos totais nos títulos de mês tinha contraste insuficiente sobre o fundo cinzento. Ficou corrigido com um verde mais escuro no modo claro.
- **Verificação que saiu:** «gráfico do Início = Análise», porque o gráfico saiu do Início. A Análise continua verificada nos testes 01, 03 e 09.
- **Verificação que entrou:** «cartão verde do Início = Contas → Património».
- Os resultados da bateria completa estão em `docs/RESULTADOS.txt`. **Não testado** num iPhone ou Android reais.

---

# Histórico: v23 (correções da auditoria independente, Lote 1)

Base: v22. **Só correções.** O aspeto da app, as regras financeiras, a Análise, os dados guardados e o formato das cópias de segurança não mudam. O relatório da auditoria está em `docs/AUDITORIA_v22.md`.

## 1. O que foi corrigido

1. **Contas ao cêntimo fora da Análise** (achado M1). Os saldos, os totais e os objetivos passam a ser somados em cêntimos inteiros, como já fazia a Análise.
   - Deixa de aparecer «-0,00 €».
   - O aviso «ficaria com saldo negativo» só aparece quando o saldo fica mesmo negativo.
   - Um objetivo pago ao cêntimo fica a 100% e «Concluído ✅». Antes podia ficar a 99%: por exemplo, 18,16 + 60,69 + 99,80 = 178,65.
2. **Datas fora de 1900–2200** (M2). Ao guardar, a app recusa-as com a mensagem «confirma o ano». Isto vale para movimentos, regras recorrentes e prazos de objetivos, e os campos de data passam a ter estes limites. Antes eram aceites e, ao reabrir a app, trocadas por «hoje»: numa regra recorrente isso criava logo uma cobrança e mudava o mês da regra.
3. **«Esqueci-me do PIN» apaga mesmo todos os dados** (M4), incluindo a cópia «antes da importação» e as cópias de dados danificados. Antes, quem não sabia o PIN conseguia repor os dados antigos com «Desfazer a última importação». Ficam só as preferências: modo privado e boas-vindas.
4. **Importação de ficheiros alterados** (B5).
   - Tipos de conta, tipos de movimento, categorias, frequências e tipos de investimento desconhecidos passam aos valores por omissão. Isto inclui nomes especiais como «toString» ou «constructor», que antes apareciam como «undefined» ou «NaN €».
   - Datas numéricas impossíveis passam a hoje e contam no aviso de datas corrigidas.
   - Os ficheiros da app Swift continuam a ser lidos como antes.
5. **Separador guardado inválido** (B6): a app abre no Início, em vez de ficar com o ecrã em branco.
6. **Modo privado no formulário «Editar objetivo»** (B9): os montantes ficam escondidos (••••), como no resto da app.
7. **Leitores de ecrã e teclado** (B10 a, c, d).
   - O «Nome ✎» do objetivo passa a ser um botão: alcança-se com o teclado e é anunciado como botão, com o mesmo aspeto de antes.
   - São anunciados o separador ativo, a secção de Contas e o tipo de movimento escolhido (Receita/Despesa/Transferência).
   - Os botões «-»/«+» do objetivo têm nome, por exemplo «Aumentar 10 € no objetivo Viagem».
8. **Hora de verão** (B11): a idade da cópia de segurança conta dias inteiros. De 28/02 a 30/03 são 30 dias, por isso o aviso laranja já não chega um dia atrasado.

## 2. O que não mudou (verificado)

- **Aspeto:** comparei píxel a píxel as capturas de todos os ecrãs (Início, Movimentos, Análise, Orçamentos, Objetivos, Contas, Recorrentes, Património e Novo movimento) em modo claro, modo escuro e modo privado, v22 contra v23. A única diferença é o número da versão no fundo de Contas («Poupança v23»).
- **Valores:** em 12 cenários aleatórios, os saldos de Contas e da Análise continuam iguais a um cálculo independente em cêntimos. 400 toques ao acaso não deram nenhum erro.
- Regras financeiras, Análise, dados guardados, cópias de segurança e service worker.

## 3. Ainda por decidir (Lotes 2 e 3 da auditoria)

Estes pontos mudam comportamento ou aspeto, por isso ficam à espera da tua decisão:
- **M3:** perguntar antes de uma regra recorrente criar muitos movimentos em atraso.
- **M5:** aviso para instalar no ecrã principal do iPhone, porque o Safari pode apagar os dados de sites não instalados.
- **B1:** não perder o que se escreveu num formulário ao mudar de app.
- **B2:** «Desfazer a última importação» só durante pouco tempo.
- **B3:** botão permanente para exportar a cópia de dados danificados.
- **B4:** não fechar o formulário se a gravação falhar.
- **B7:** duas janelas abertas ao mesmo tempo.
- **B8:** limite de tentativas do PIN guardado entre aberturas.
- **B12:** aviso «Saldos estimados» com contas paradas.
- **B13:** lista de Movimentos por páginas.
- **B14:** cores alternativas para iPhones antigos.
- **B10 b, e:** foco nos formulários e tecla Esc.

## 4. Testes

- **Teste novo** `testes/12_correcoes_da_auditoria.js`, com 27 verificações, uma ou mais por correção.
  - Na v22 reprova: 22 verificações FALHA, e para no botão do objetivo, que na v22 não existe. Isto prova que o teste deteta os problemas.
  - Na v23 passa tudo.
- Toda a bateria anterior (`executar-todos.sh`) continua a passar. Ver `docs/RESULTADOS.txt`.
- Os testes da auditoria, repetidos contra a v23, já não encontram nenhum dos problemas corrigidos.
- **Não testado** num iPhone ou Android reais.

---

# Histórico: v22 (Fase 1 da Análise financeira + correções da revisão manual)

Base: Poupança v20 (a que está publicada no GitHub). Nada foi reconstruído: a aplicação, os dados, as cópias de segurança e o design são os mesmos. Acrescentou-se uma Análise dentro de **Movimentos**.

## 1. O que há de novo

- **Movimentos | Análise.** Um seletor no topo de Movimentos. «Movimentos» é a lista de sempre, sem perder nada (pesquisa, filtros, editar, apagar). «Análise» é o novo ecrã.
- **Atalho no Início:** «Ver análise completa». A barra de baixo continua com os mesmos 5 separadores.
- **Períodos:** Dia, Semana (segunda a domingo), Mês e Ano, com setas para andar para trás e para a frente e «Voltar a hoje». A seta para a frente fica desativada no período atual.
- **Filtros combináveis:** várias contas ao mesmo tempo (com atalhos «Disponível», «Poupança», «Investimento») e várias categorias de despesa. «Limpar filtros» repõe tudo. **Não escolher nenhuma = todas.** Os resultados atualizam-se sozinhos.
- **Cartões do período:** saldo inicial, saldo final (e quanto variou), receitas, despesas, resultado líquido, taxa de poupança, média diária de despesas e quanto foi transferido para poupança/investimento. Quase todos mostram a diferença para o período anterior (num período a meio compara o mesmo número de dias, como já fazem os alertas).
- **«Como o saldo mudou»:** saldo inicial + receitas − despesas + transferências recebidas − transferências enviadas = saldo final. Mostra, sem esconder nada, o que explica o saldo.
- **Evolução do saldo:** o saldo no fim de cada dia. Tocar ou arrastar o dedo mostra a data, o saldo e se subiu ou desceu. A linha é verde quando o saldo sobe, vermelha quando desce, e tracejada quando é estimada. Há botões ‹ › e o teclado (setas) para mudar de dia.
- **Receitas e despesas:** barras por dia (semana e mês) ou por mês (ano). Tocar numa barra seleciona esse período.
- **Despesas por categoria:** valor, percentagem do total, barra e comparação com o período anterior. Tocar numa categoria seleciona-a.
- **Movimentos por baixo:** tocar num ponto, numa barra ou numa categoria lista aí os movimentos correspondentes (tocar num movimento abre-o para editar). Tocar outra vez limpa a seleção. A lista de Movimentos não é tocada.
- **Vista diária:** cartões e movimentos do dia escolhido, com um gráfico compacto dos últimos **7 dias** e um botão para expandir para **30 dias**. Tocar num ponto do gráfico muda o dia.

## 2. Regras financeiras (verificadas por testes)

1. As transferências entre contas **não são receita nem despesa**.
2. Uma transferência muda o saldo das duas contas envolvidas.
3. Com várias contas escolhidas, o saldo combinado é a soma das contas e **não duplica** dinheiro transferido entre elas. Uma transferência entre duas contas escolhidas não altera o saldo combinado nem as receitas e despesas. Uma transferência de ou para uma conta fora da seleção muda o saldo, mas continua a não ser receita nem despesa.
4. Movimentos com data futura nunca alteram saldos nem totais (a lista identifica-os como «agendado»).
5. As recorrentes já criam movimentos reais quando chega a data, por isso entram na Análise como movimentos normais, sem duplicações.
6. Todos os cálculos são feitos em **cêntimos inteiros**.
7. **O filtro de categorias nunca altera o saldo real.** Só muda os indicadores de despesas (receitas, resultado e taxa ficam escondidos, com um aviso).
8. Os valores coincidem com os do Início, das Contas, dos Orçamentos e da lista de Movimentos.
9. Movimentos, contas, orçamentos, objetivos e recorrentes antigos ficam intactos, e os saldos atuais não são recalculados.

### Correção de uma incoerência existente (pedida)
O resumo no topo da lista de Movimentos (Receitas, Despesas, Resultado) incluía movimentos com data futura, ao contrário do Início. Agora só conta o que já aconteceu, diz quantos agendados ficaram de fora e marca-os como «agendado».

## 3. Saldos históricos: o que se consegue e o que não se consegue saber

**Verificação feita antes de implementar:** em 60 conjuntos de dados aleatórios (420 séries, cada conta isolada e todas juntas), o saldo reconstruído de hoje é **igual** ao saldo atual da app em todos. A reconstrução é coerente com os dados existentes.

**Limitação, apresentada ao utilizador:** o saldo inicial de uma conta **não tem data**. Antes do primeiro movimento registado de uma conta, a app só conhece esse saldo inicial, por isso:
- esses dias aparecem **tracejados, com a etiqueta «estimado»**, no tooltip e nos cartões (saldo inicial e final);
- aparece o aviso «Saldos estimados», com o nome das contas em causa;
- o saldo de **hoje nunca é estimado** (é o saldo real).

O saldo mostrado é sempre «calculado a partir do saldo inicial e dos movimentos registados». Se alterares o saldo inicial de uma conta, ou editares ou apagares um movimento antigo, o histórico muda (não há registo de alterações). Isto é inerente aos dados e não se resolve sem acrescentar uma data às contas, o que alteraria o formato das cópias de segurança. Por isso não foi feito.

O património manual (investimentos e dívidas escritos à mão) não tem histórico e fica de fora do saldo.

## 4. Privacidade, PIN, offline e cópias de segurança

- **Modo privado:** com os valores escondidos, a Análise esconde **completamente** os gráficos, cartões, valores, tooltips e conclusões, e mostra só os controlos de período e filtros. Mantendo premido o 👁️, a análise aparece (só para ver). Ao largar, esconde-se logo.
- **PIN:** sem alterações. O bloqueio continua a inutilizar todo o resto da app.
- **Offline:** `analise.js` entra na cache offline. Testado sem rede (abrir, mudar de período, tocar nos gráficos).
- **Dados e cópias de segurança:** a Análise só lê. Depois de uma sessão intensa de uso, os dados guardados ficam idênticos byte a byte e não é feita nenhuma escrita no armazenamento dos dados. O formato das cópias de segurança não mudou. O estado da análise (período, filtros) vive só em memória.

## 5. Ficheiros alterados

| Ficheiro | O que mudou |
|---|---|
| `analise.js` (**novo**, 367 linhas) | Todo o código da Análise. Um motor de cálculo puro (`anCompute`), sem tocar na app, e a apresentação e os gráficos (SVG próprio, sem bibliotecas). |
| `app.js` | Versão v22. Correções da revisão manual (secção 8). Seletor Movimentos \| Análise. Atalho no Início. Totais da lista só até hoje e marca «agendado». Aviso se faltar o `analise.js`. |
| `index.html` | Carrega `analise.js` antes de `app.js`. |
| `sw.js` | `analise.js` na cache. Cache `poupanca-v22` (acompanha a versão da app). A instalação guarda cada ficheiro em separado, indo sempre à rede (se um faltar, os outros ficam disponíveis offline). Nunca guarda erros 404. Pede ao navegador que reconfirme cada ficheiro com o servidor (o GitHub Pages deixa guardar 10 minutos). Só apaga caches antigas **da Poupança**, nunca as de outras apps. |
| `style.css` | Bloco novo da Análise. Contorno nas etiquetas dos gráficos para se lerem sobre a linha. |

## 6. Testes

Corridos a partir deste pacote, em Chromium (Playwright), com o executor corrigido (ver a secção 7). **23 testes aprovados, 426 verificações (415 dos testes + 11 do autoteste do executor), 0 falhas.** Resultados completos em `docs/RESULTADOS.txt`. Para repetir: `sh testes/executar-todos.sh`.

| Teste | O que verifica | Resultado |
|---|---|---|
| `01_oraculo` | **2 880 cenários** (16 conjuntos de dados, 4 períodos, filtros de contas e categorias, datas-limite, períodos futuros, anos bissextos, saldos negativos, decimais difíceis, contas sem movimentos, primeiro movimento tardio) comparados **cêntimo a cêntimo** com um cálculo independente em Python. Inclui um «teste do teste»: um erro de 1 cêntimo é detetado. | 22/22 |
| `02_invariantes` | Regras financeiras como propriedades sobre os 2 880 cenários: reconciliação do saldo, categorias = despesas, barras = totais, filtro de categorias não altera saldos, combinado = soma das contas, futuros não alteram nada, continuidade entre meses, transferências internas e externas. | 13/13 |
| `03_consistencia` | Início, Contas, Orçamentos e lista de Movimentos mostram os mesmos valores que a Análise. Recorrentes sem duplicados. | 13/13 |
| `04_interface` | Períodos e setas (virada de ano, semanas), filtros, toque, arrastar e teclado nos gráficos, movimentos por baixo, vista diária 7/30 dias, saldos estimados, modo privado, 320 px com nome de conta muito comprido, alvos de toque, axe-core (claro e escuro), estados vazios. | 67/67 |
| `05_dados_offline` | Dados intactos byte a byte, formato das cópias de segurança, uso offline, ficheiro em falta. | 14/14 |
| `06_desempenho` | 5 000 e 20 000 movimentos com CPU 4× mais lento: cálculo de 5 a 19 ms, desenho de 12 a 35 ms, arrastar o gráfico a menos de 1 ms por movimento. | 8/8 |
| `07_fusos` | 8 fusos horários (incluindo +14 e −11) dão o mesmo resultado. Mudanças de hora de verão, viragem de dia e de ano. 3 300 dias seguidos. | 18/18 |
| `08_toque` | Toque num ecrã tátil simulado (iPhone): ponto do gráfico, barra e categoria, sem scroll lateral nem zoom acidental. | 5/5 |
| `09_historico_estimado` | Saldos estimados: conta sem movimentos, conta só com movimentos futuros, primeiro movimento ao receber uma transferência, fronteira exata entre «estimado» e «calculado», e o efeito de alterar o saldo inicial. | 29/29 |
| `10_atualizacao_do_servico` | Atualização de uma instalação antiga para a nova (v20 → versão atual, e versão atual → seguinte), com dados, PIN, preferências e caches de outras apps, num servidor que imita o GitHub Pages. | 24/24 |
| `11_correcoes_da_revisao` | Cada problema da revisão manual (secção 8): reproduzido primeiro contra o código antigo (falhava) e depois confirmado como corrigido. | 23/23 |
| `autoteste_executor.sh` | O executor não dá falsos sucessos (11 casos). | 11/11 |
| `anteriores/10 a 21` | Todas as funcionalidades das versões anteriores continuam a funcionar (dados danificados, importação, datas, recorrentes, backup, PIN, modo privado, registo rápido, acessibilidade, etc.). | 179 verificações |

### Problemas que os testes apanharam durante o desenvolvimento (já corrigidos)
- Escolher **uma** categoria obrigava a desmarcar as outras 11 (todas vinham marcadas). Agora é só marcar a que queres, e sem nenhuma marcada mostra todas.
- Se faltasse o `analise.js` no servidor, a instalação offline **inteira** falhava e podia guardar um erro 404. Corrigido no `sw.js`.
- Texto sem contraste suficiente numa categoria selecionada (4,47:1, mínimo 4,5:1).
- Um ficheiro em falta já não parte a app: mostra um aviso.

## 7. Auditoria independente: riscos identificados e como foram resolvidos

A auditoria considerou coerente a lógica financeira. Pediu a verificação de três pontos, e nada mais foi alterado (a interface e a lógica financeira ficaram como estavam).

### 7.1 O executor dos testes podia dar falsos sucessos: corrigido
**Problema confirmado:** o `executar-todos.sh` só procurava a palavra «FALHA» e ignorava o código de saída. Os 12 testes antigos nunca definiam código de saída. Medi o executor antigo com 6 testes falsos que deviam reprovar: **aprovou 5** (um teste que rebenta com exceção, um que sai com código 1, um que não faz nada, uma promessa rejeitada e erros de JavaScript).

**Correção:** um teste só é aprovado se o código de saída for 0, não houver nenhuma linha «FALHA», não houver erros de JavaScript e houver pelo menos uma verificação «OK». Há um limite de tempo por teste. Os testes antigos passaram a devolver o código de saída certo (`testes/anteriores/_saida.js`). Antes de começar, o executor confirma que o servidor local serve **esta** pasta (se não servir, recusa com código 2).

**Prova:** `testes/autoteste_executor.sh` cria testes bons e maus e verifica que o executor aprova só os bons: **11/11**. Se não conseguir criar a pasta temporária (ou algum dos testes falsos), pára com uma mensagem e código de saída 2, em vez de continuar (detalhe apontado numa revisão posterior). O executor principal faz o mesmo com a sua pasta temporária.

### 7.2 Saldos estimados: confirmados e mantidos (sem alterações ao código)
O teste `09_historico_estimado` (29/29) confirma:
- **Conta sem movimentos:** o saldo é sempre o saldo inicial, sem inventar movimentos. **Todos os dias anteriores a hoje são estimados** (linha tracejada, «estimado» no tooltip e nos cartões, aviso com o nome da conta). O saldo de hoje não é estimado. Com várias contas, uma conta vazia mantém o histórico estimado.
- **Só movimentos futuros:** contam como «sem movimentos» até chegar o dia, e a partir desse dia o saldo passa a calculado.
- **Primeiro movimento ao receber uma transferência:** conta como primeiro movimento da conta. A fronteira é exata (o dia anterior é estimado, esse dia já é calculado).
- **Alterar o saldo inicial de uma conta (1000 → 1234,56):** todos os dias do histórico sobem exatamente +234,56 € (incluindo os estimados). O saldo em Contas e o da Análise coincidem. As marcas «estimado» **não mudam**, os movimentos e as outras contas ficam intactos, e repor o valor devolve exatamente o histórico original. Um saldo inicial negativo (cartão) comporta-se da mesma forma.
- O aviso e a nota «calculado a partir do saldo inicial das contas e dos movimentos registados» continuam visíveis.

### 7.3 Cache offline e atualização de uma instalação antiga: avaliada e melhorada
**Avaliação:** `poupanca-v16` funcionava (o service worker apaga as caches com outro nome), mas o número era independente da versão da app (v22) e foram encontrados outros riscos:

| Risco | Correção |
|---|---|
| O número da cache e o da app eram independentes (fácil esquecer um). | Cache `poupanca-v22`, e um teste obriga os dois a coincidirem. |
| A limpeza apagava **todas** as caches da origem. No GitHub Pages a origem é partilhada por todos os teus sites. | Só apaga caches que começam por `poupanca-`. Testado: a cache de outra app sobrevive. |
| O GitHub Pages deixa o navegador guardar ficheiros 10 minutos (`max-age=600`). Em atualizações futuras a app ficava presa na versão antiga. Testado. | Os pedidos do service worker pedem reconfirmação ao servidor (`no-cache`). **Controlo negativo:** sem esta proteção, o mesmo cenário (v22 → v22) fica preso na v22. Com ela, a primeira abertura já mostra a v22. |
| A pré-instalação podia guardar cópias velhas do navegador, e offline ficava um `app.js` antigo com um `index.html` novo. | A pré-instalação vai sempre à rede. Testado: a cache offline tem exatamente os ficheiros publicados. |

**Passagem da v20 para a v22, testada** (servidor que imita o GitHub Pages, partindo dos ficheiros v20 que estão mesmo publicados, com dados, PIN, backup, preferências e caches de outras apps):
- Nenhum dado guardado mudou, byte a byte (movimentos, contas, orçamentos, objetivos, recorrentes, investimentos, PIN, data do backup, preferências).
- O PIN antigo continua a funcionar.
- O novo service worker instala-se sozinho; as caches antigas da Poupança são apagadas; a cache de outra app não é tocada; a cache nova tem todos os ficheiros, incluindo `analise.js`.
- Offline, depois de atualizar, a app abre, pede o PIN e a Análise funciona.
- Se a publicação acontecer com o telemóvel sem rede, a app antiga continua a funcionar sem perder dados, e atualiza-se quando houver rede.

**Comportamento a conhecer (testado):** os telemóveis têm hoje o service worker da v20, e é ele quem atende a **primeira abertura depois de publicares a v22**. Pode ainda mostrar a v20 (a app abre inteira e funciona, sem erros). A v22 instala-se em segundo plano, e a **segunda abertura já mostra a v22**. Isto acontece só nesta passagem. A partir da v22, cada atualização aparece logo na primeira abertura. Carregar no botão de recarregar do próprio separador pode ainda mostrar a versão antiga, porque o Chromium reaproveita ficheiros em memória. Fecha e abre a app.

## 8. Revisão manual: problemas encontrados e corrigidos

Uma revisão feita à mão, a usar a app num navegador (registo rápido, objetivos, orçamentos, recorrentes, Análise, modo privado), encontrou **um bug real** e várias incoerências. Cada um foi primeiro **reproduzido** por um teste contra o código anterior (falhava) e depois corrigido (`11_correcoes_da_revisao`: 23/23).

### O bug
**O objetivo perdia dinheiro ao ser editado.** Com 610 € poupados à mão e 150 € de uma transferência associada, baixar o valor pretendido para 500 € cortava o valor guardado para 500 €, e voltar a subir para 3000 € não recuperava os 110 €. **Corrigido:** o valor poupado à mão guarda-se como foi escrito (o cartão limita a 100% por si). Testado: 3000 → 500 → 3000 devolve exatamente os 760 € (610 à mão + 150 de movimentos).

### Incoerências corrigidas
| Problema | Correção |
|---|---|
| Transferir 100 € de uma Carteira com 40,50 € ficava a -59,50 € sem aviso. | Dinheiro físico e poupança que ficariam negativos **avisam** (e deixas escolher). Contas à ordem não avisam (o descoberto é normal). |
| O orçamento **total** ficava sempre verde (97% e uma categoria já a 123%). | A barra do total muda de cor aos 80% e aos 100%, com a percentagem. |
| «Sem dados do período anterior» num mês a meio, apesar de o mês anterior ter movimentos. | Diz exatamente o que se comparou: «sem movimentos de 1/10 a 6/10». |
| O formulário do objetivo mostrava 610 € e o cartão 760 €. | O formulário diz «poupado à mão» e mostra «+150,00 € de movimentos associados». |
| Prazo ultrapassado: «Poupança mensal necessária: 2250 €». | Já não aparece (só «Prazo ultrapassado»). |
| «Introduz o saldo atual» em Contas, mas só se edita o saldo inicial. | O texto explica: ao criar, escreve o saldo de hoje; para o acertar, edita o «saldo inicial» (isto também muda o histórico). |
| Apagar: «Apagar?». | Diz o que se apaga («Apagar o movimento «Jantar» de 18,50 € (6/11)? …») e que não se pode desfazer. |
| Dívidas: «-5000 €» a vermelho no Início e «5000 €» a branco no Património. | Iguais nos dois sítios. |
| Recorrentes: «A pagar (30 dias)» ignorava movimentos agendados que a previsão do Início já conta. | Inclui os movimentos agendados dos próximos 30 dias (e mostra-os na lista, marcados «agendado»). |
| Escrever «abc» no valor dava «Indica um valor maior que zero». | «O valor não é válido. Usa só números, por exemplo 12,50.» (e «maior que zero» só para 0). |

### O que **não** foi alterado (decisão tua)
A revisão fez também sugestões de desenho da app. Nenhuma foi aplicada, para não mexer no que funciona sem a tua decisão: encurtar o Início; tirar as definições (cópia de segurança, segurança, ajuda) de Contas para um ícone de engrenagem; dar à Análise um separador próprio; mostrar o aviso de «Saldos estimados» só uma vez ou só ao tocar na zona tracejada; e simplificar os objetivos para um só mecanismo (manual ou movimentos associados). O aviso de saldos estimados foi mantido porque pediste que os saldos estimados nunca fossem apresentados como exatos.

## 9. Limitações e o que não foi testado

- **Não foi testado num iPhone nem num Android reais.** Tudo correu em Chromium. Convém confirmar no iPhone: tocar e arrastar nos gráficos, o scroll vertical por cima deles, o teclado dos formulários e a leitura com VoiceOver (não testado).
- **Modo privado e toque:** com o dedo no 👁️ só consegues ver a análise. Para tocar nos gráficos, desliga o Modo privado em Contas → Segurança, ou usa Enter no olho com teclado (mostra 15 s).
- Os nomes dos meses nos tooltips e nas etiquetas seguem o idioma do navegador.
- Os movimentos por baixo mostram os 100 primeiros, com «Mostrar mais».

## 10. Como publicar

1. Faz uma cópia de segurança antes (Contas → Exportar), como sempre.
2. No GitHub, em `Pedrooruben1/poupanca`, carrega **todos os ficheiros da raiz deste pacote**: `index.html`, `app.js`, **`analise.js` (novo)**, `style.css`, `sw.js`, `manifest.webmanifest` e a pasta `icons`. As pastas `testes` e `docs` não são necessárias.
3. Passado cerca de 1 minuto, **fecha a app por completo e abre-a de novo, duas vezes** (nesta passagem da v20 para a v22, a primeira abertura ainda pode mostrar a v20; ver a secção 7.3). Em **Contas**, no fim da página, deve dizer **Poupança v22**.
4. A partir desta versão, cada atualização futura aparece logo à primeira abertura. Para isso, **sempre que alterares `app.js`, `analise.js`, `index.html` ou `style.css`, aumenta também o número da versão em `app.js` (`VERSION`) e o nome da cache em `sw.js` (`CACHE`)**. O teste `10_atualizacao_do_servico` verifica que os dois coincidem.

Eu não publiquei nada no teu GitHub.

## 11. Fase 2 (por fazer, como combinado)

- Intervalo personalizado de datas.
- Conclusões automáticas escritas («gastaste mais 15% em alimentação…»), só quando houver dados suficientes para comparar.
- Evolução dos gastos de cada categoria ao longo do tempo.
- Animações discretas adicionais.
