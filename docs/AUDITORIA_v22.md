# Auditoria independente — Poupança v22

> **Nota (v23):** os achados M1, M2, M4, B5, B6, B9, B10 a/c/d e B11 foram corrigidos na v23 (ver `docs/ALTERACOES.md`). Os outros esperam decisão.

**Data:** 9 de novembro de 2026  ·  **Alvo:** v22 exata (`app.js`, `analise.js`, `sw.js`, `style.css`, `index.html`, `manifest.webmanifest`, ícones; impressões digitais em `evidencias/00_hashes_alvo.txt`)  ·  **Âmbito:** só auditoria, **não alterei nada na app**.

---

## 1. Veredicto

A v22 está **sólida**. Não encontrei nenhum problema grave: em uso normal não há perda de dados guardados, saldos errados ao cêntimo, falhas de segurança exploráveis à distância nem erros JavaScript.

Encontrei **5 problemas de gravidade média** e **14 de gravidade baixa**. Os mais importantes:

| # | Problema | Quem é afetado |
|---|---|---|
| M1 | Contas fora da Análise sem arredondamento ao cêntimo: aparece «-0,00 €», o aviso de saldo negativo dispara sem razão e objetivos cumpridos ficam a «99%» | Qualquer utilizador, com frequência (ver números abaixo) |
| M2 | Datas fora de 1900–2200 (ex.: ano «0026» por engano) são aceites e depois trocadas em silêncio por «hoje»; numa regra recorrente isso cria logo uma cobrança e muda o mês da regra | Quem se engana no ano |
| M3 | Uma regra recorrente com data antiga cria todos os movimentos em atraso de uma vez (ex.: 1138), sem perguntar e sem forma prática de desfazer | Quem se engana no ano de uma regra |
| M4 | «Esqueci-me do PIN» não apaga tudo: quem não sabe o PIN recupera os dados antigos com «Desfazer a última importação» | Quem já importou uma cópia por cima de dados |
| M5 | No iPhone, usar a app num separador do Safari **sem a instalar** pode levar o Safari a apagar os dados se ela ficar 7 dias de uso do Safari sem ser aberta (regra do Safari, não testável aqui) | Amigos que só abram o link no Safari |

Nenhuma das correções propostas obriga a mudar o formato dos dados nem das cópias de segurança.

---

## 2. Como foi feita

Não confiei nos testes anteriores: reli o código todo à mão e escrevi testes novos, dirigidos aos pontos fracos que a leitura sugeriu.

| Técnica | O que foi feito | Resultado |
|---|---|---|
| Leitura linha a linha | `app.js` (894 linhas), `analise.js` (370), `sw.js`, `style.css`, `index.html`, manifesto | Lista de suspeitas, todas testadas a seguir |
| Análise estática | ESLint (regras estritas, os dois scripts juntos) e html-validate | 0 erros; só avisos de estilo |
| Testes na app real (Chromium) | 9 scripts Playwright com relógio fixo, contra uma cópia exata da v22 | 33 comportamentos problemáticos confirmados e 25 verificações que passaram (mais 1 falha do axe que era um artefacto do teste, ver secção 5) |
| Referência independente | Saldos calculados por fora em cêntimos inteiros | 60 saldos de contas + 36 saldos da Análise batem certo |
| Testes aleatórios | 12 cenários aleatórios e 400 toques ao acaso com invariantes | Sem erros, «NaN» nem ecrãs vazios |
| Ataques | Nomes com HTML/JS, ficheiros de importação adulterados, armazenamento cheio, duas janelas, PIN | Ver achados |
| Acessibilidade | axe-core 4.10 (WCAG 2.2 AA + boas práticas) em 32 estados, claro e escuro (mais 8 medições repetidas sem animação), e teste de teclado | 0 violações automáticas reais; falhas de teclado e de leitor de ecrã encontradas à mão |
| PWA / offline | Service worker sem rede, nova versão publicada, critérios de instalação do Chrome | Tudo correto |
| Desempenho | 2 000 a 20 000 movimentos, com o processador normal e 4× mais lento (aproximação de um telemóvel) | Ver B13 |

**Legenda:** ✅ verificado na app real · 🔎 deduzido do código (não testado) · ⚠️ não verificável neste ambiente.

---

## 3. Achados de gravidade média

### M1 — Contas sem arredondamento ao cêntimo fora da Análise ✅

**Onde:** `app.js:123-131` (`balance`), `app.js:186-191` (`goalInfo`, compara `remaining === 0`), `app.js:598-606` (`avisoNegativo`).

**O que acontece:** o computador guarda números decimais em binário e alguns (como 0,10) não têm valor exato. Ao somar e subtrair muitos movimentos ficam restos minúsculos, da ordem de 0,00000000000003 €. A Análise não tem este problema porque conta em cêntimos inteiros. O Início, as Contas, os Objetivos e o aviso de saldo negativo fazem as contas com os decimais diretamente e não arredondam antes de comparar ou de mostrar.

**Verificado na app** (`evidencias/10_flutuante_ui.txt`, `capturas/`):
- Carteira com 298,78 € e despesas de 201,10 + 16,87 + 71,37 + 9,44 € (soma exata 298,78 €):
  - ao registar a última despesa aparece o aviso «*«Carteira» ficaria com saldo negativo (-0,00 €)… Guardar mesmo assim?*» (F1);
  - a lista de Contas mostra **-0,00 €** (F2);
  - «Disponível para gastar» e «Património líquido» mostram **-0,00 €** (F3, `capturas/F3_disponivel_menos_zero.png`);
  - a Análise, com os mesmos dados, mostra corretamente 0,00 €.
- Objetivo de 178,65 € com transferências de 18,16 + 60,69 + 99,80 € (soma exata): o cartão mostra **99%**, «Falta poupar 0,00 €» e **nunca** «Concluído ✅» (F4, `capturas/F4_objetivo_99.png`). Com os mesmos movimentos por outra ordem já mostra 100% e «Concluído», o que prova que é um erro de arredondamento e não de lógica.

**Frequência** (simulação com a mesma aritmética da app, `evidencias/10a_flutuante_busca.txt`):
- em 200 000 casos de «esvaziar uma conta com 2 a 4 despesas», **37%** acabam ligeiramente negativos;
- em 100 000 objetivos financiados por 3 transferências exatas, **15%** ficam a 99%.

**Correção sugerida (pequena):** fazer estas contas em cêntimos inteiros, como na Análise, ou arredondar ao cêntimo antes de comparar e de mostrar, tratando «-0» como 0. Os dados guardados não mudam.

### M2 — Datas fora de 1900–2200 trocadas em silêncio por «hoje» ✅

**Onde:** `app.js:620` (o formulário só verifica o formato AAAA-MM-DD), `app.js:644` (prazo do objetivo sem verificação) e `app.js:66-75` / `85` (ao abrir, a app limita as datas a 1900–2200 e troca as outras por «hoje» ou apaga-as).

**Verificado** (`evidencias/15_verificacoes_extra.txt`, `evidencias/16_ultimos.txt`):
- movimentos com 0026-11-05, 1899-12-31 e 2206-01-01 são aceites e gravados. Depois de reabrir a app e gravar outra coisa qualquer, **os três passam a 2026-11-06** (o dia da reabertura), sem aviso;
- o prazo 2207-06-30 de um objetivo **desaparece**;
- uma regra anual de 480 € com o ano mal escrito (2206-03-01): ao reabrir, **cria logo uma cobrança de 480 € nesse dia**, e a regra passa de março para novembro (próxima data 2027-11-01).

**Probabilidade:** no iPhone, a roda do seletor de datas torna o engano raro. Num computador é fácil: no Chrome, escrever «26» no campo do ano dá «0026».

**Correção sugerida (pequena):** aplicar no `saveForm` a mesma regra de 1900–2200 que a app aplica ao abrir, com uma mensagem clara, e pôr `min`/`max` nos campos de data.

### M3 — Regra recorrente com data antiga cria centenas de movimentos de uma vez ✅

**Onde:** `app.js:157-170` (`applyRecurring`: até 400 por passagem, e repete sempre que se volta à app) e `app.js:584` (o formulário diz «datas passadas são criadas já», mas não diz quantos).

**Verificado** (`evidencias/12_comportamento.txt`):
- regra semanal de 30 € com o ano escrito como 2005: **1138 movimentos**, e o saldo da conta passa de 5 000 € para **−29 140 €**;
- regra mensal desde 2005: 262 movimentos; regra semanal desde há um ano: 52;
- apagar a regra **não apaga** os movimentos criados (como o aviso diz), e não há apagar vários de uma vez nem desfazer. Na prática, só se resolve repondo uma cópia de segurança.

**Correção sugerida:** se uma regra for criar mais do que, por exemplo, 3 movimentos em atraso, perguntar antes: «Isto cria 1138 movimentos desde 15/01/2005. Criar todos · Só a partir de hoje · Cancelar». Como opção, ao apagar uma regra, oferecer apagar também os movimentos que ela criou.

### M4 — «Esqueci-me do PIN» deixa dados recuperáveis sem PIN ✅

**Onde:** `app.js:766` (apaga só `poupanca-v2`, `poupanca-v1`, o PIN e o bloqueio), `app.js:706` (cópia «antes da importação») e `app.js:413` (botão «Desfazer a última importação»).

**Verificado** (`evidencias/11_importacao_e_estado.txt`, `evidencias/11_I4_dados_recuperados_sem_pin.png`): com dados, uma importação feita antes e PIN definido, no ecrã de bloqueio toca-se em «Esqueci-me do PIN» e confirma-se. A app abre sem PIN e vazia, mas em Contas aparece «Desfazer a última importação». Ao tocar, **voltam os dados antigos**: a conta «Conta Secreta», o saldo de 12 246,67 € e o movimento «Consulta confidencial». A confirmação promete «apagar TODOS os dados deste telemóvel», o que não é verdade.

**Condição:** só acontece se alguma vez se importou uma cópia por cima de dados existentes (essa cópia fica guardada até à importação seguinte). As cópias de «dados danificados», se existirem, também ficam.

**Correção sugerida (pequena):** nesse botão, apagar todas as chaves `poupanca-*`.

### M5 — Safari sem instalar: o iPhone pode apagar os dados ⚠️

A app guarda tudo no armazenamento local do navegador. A [política de prevenção de rastreio da WebKit](https://webkit.org/tracking-prevention/) apaga esse armazenamento quando o site não é usado durante **7 dias de utilização do Safari**. As web apps **adicionadas ao ecrã principal estão isentas** ([anúncio da WebKit, 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). Quem usar a Poupança só num separador do Safari, sem a instalar, pode perder tudo. As boas-vindas sugerem instalar, mas não explicam este risco.

Não é testável neste ambiente (não há Safari) e a regra pode ter mudado desde 2020, mas a documentação da WebKit continua a descrevê-la.

**Correção sugerida:** no iPhone, quando a app não estiver instalada (`navigator.standalone === false`), mostrar um aviso fixo do tipo «Instala no ecrã principal para não perderes os dados» e lembrar a cópia de segurança.

---

## 4. Achados de gravidade baixa

| # | Problema | Onde | Evidência |
|---|---|---|---|
| B1 | **Mudar de app com um formulário aberto apaga o que se escreveu** (modo privado ligado, que é o padrão). Ex.: a meio de registar uma despesa, ir ao banco ver o valor. Tocar fora da folha também a fecha sem perguntar. | `app.js:807`, `735` | ✅ R3 |
| B2 | **«Desfazer a última importação» fica disponível para sempre.** Se for tocado meses depois e confirmado, apaga tudo o que se registou desde a importação, sem forma de voltar atrás. | `app.js:413`, `713-718` | ✅ V2 |
| B3 | **Aviso «Dados danificados»:** fecha-se ao mudar de app. Depois de se gravar algo novo, a cópia danificada continua guardada mas a app deixa de ter botão para a exportar. | `app.js:24-30`, `724-729`, `886` | ✅ V3 |
| B4 | **Armazenamento cheio:** o movimento aparece na lista mas perde-se ao reabrir. Só há um aviso de 3,5 s e o formulário fecha como se tivesse gravado. | `app.js:42`, `652` | ✅ I5 |
| B5 | **Importação de ficheiros adulterados:** valores como «toString», «constructor», «hasOwnProperty» ou «__proto__» passam como tipo, categoria ou frequência. Aparecem «undefined», «NaN €» e «NaN%» na Análise e nos Orçamentos, e uma conta com tipo «toString» fica fora de todos os totais. Datas numéricas não são verificadas («56822-07-09», «NaN-NaN-NaN» → «Invalid Date»). Só acontece com ficheiros editados à mão ou vindos de outro sítio. | `app.js:60`, `75`, `79`; `analise.js:101` | ✅ I1, I2 |
| B6 | **Separador guardado inválido deixa o ecrã em branco ao abrir** (erro «Cannot read properties of undefined»). Tocar num separador recupera. Só acontece se o valor guardado for inválido, por exemplo numa versão futura que mude os separadores. | `app.js:272`, `278` | ✅ I3 |
| B7 | **Duas janelas ao mesmo tempo** (ex.: Android com a app instalada e um separador do Chrome): guardar um formulário de algo apagado na outra janela dá um erro sem mensagem (contas) ou parece guardar mas perde a edição (movimentos). | `app.js:614`, `632` | ✅ R2, R2b |
| B8 | **O limite de 5 tentativas de PIN recomeça ao reabrir a app:** 12 PINs errados seguidos sem espera. Com 1 milhão de combinações continua impraticável adivinhar à mão, mas o bloqueio de 30 s quase não trava. | `app.js:841-842`, `874-875` | ✅ V6 |
| B9 | **Modo privado:** o formulário «Editar objetivo» mostra montantes em claro («há +100,11 € de movimentos… o cartão mostra 211,22 €»), porque usa `fmtEur` em vez de `eur`. | `app.js:575` | ✅ P2 |
| B10 | **Acessibilidade (teclado e leitores de ecrã):** (a) o «Nome ✎» do objetivo não é um botão, por isso não se alcança com o teclado nem é anunciado; (b) ao abrir um formulário o foco não entra nele, o Tab sai para o fundo e, ao fechar, o foco volta ao início da página; (c) não se anuncia qual separador, secção de Contas ou tipo de movimento (Despesa/Receita/Transferência) está escolhido; (d) os botões «-»/«+» do objetivo são lidos como «hífen»/«mais»; (e) 🔎 a tecla Esc não fecha os formulários; (f) 🔎 os tamanhos de letra são fixos, por isso o tamanho de texto do iPhone não se aplica (o zoom com dois dedos funciona). | `app.js:392`, `514-521`, `277`, `404`, `550`, `398` | ✅ R6, R6b, R6c, V4 |
| B11 | **Hora de verão:** de 28/02 a 30/03 a app diz «há 29 dias» em vez de 30, por isso o aviso laranja da cópia de segurança aparece um dia mais tarde. | `app.js:209` (`Math.floor`) | ✅ R4 |
| B12 | **«Saldos estimados» permanente:** com uma conta que nunca teve movimentos (ex.: uma poupança parada), a Análise mostra sempre o aviso e o gráfico todo tracejado, mesmo com 300 dias de histórico. | `analise.js:76-77` | ✅ V5 |
| B13 | **Muitos movimentos:** a lista desenha todos os movimentos de uma vez e cada tecla na pesquisa redesenha-a. Com o processador 4× mais lento: 2 000 movimentos → 0,5 s a abrir; 5 000 → 1,2 s; 20 000 → 6,4 s a abrir e 5,1 s por tecla. Além disso, 20 000 movimentos ocupam 3,2 MB, perto do limite de cerca de 5 MB do iPhone (a cópia «antes da importação» duplica o espaço usado). A Análise e o Início continuam rápidos (≤ 0,25 s). | `app.js:350-356`, `778` | ✅ D1 |
| B14 | 🔎 **iPhones antigos (iOS 15 e 16.0–16.1):** `color-mix()` não tem alternativa, por isso o cabeçalho e a barra de separadores perdem a cor de fundo (ficam só desfocados). Em iOS anterior ao 15.5 o `inert` não existe e o fundo continua focável com o PIN no ecrã (visualmente tapado). | `style.css:6`, `10`, `26`, `184` | Deduzido do código |

**Notas informativas (sem problema real):**
- **Registo rápido:** interpretou bem 27 de 30 frases comuns. As 3 falhas: «receita médica 15» fica em «Outros» e não em Saúde; «devolveram 15 da zara» fica como despesa; «café 1,20 e pastel 1,40» fica com 1,20 €. O utilizador confirma sempre antes de guardar. (`evidencias/14_registo_rapido.json`)
- **Modo privado:** esconde todos os montantes nos 8 ecrãs (verificado no texto e nos atributos), mas mantém as proporções (taxa de poupança, % de objetivos e orçamentos) e os gráficos do Início. A Análise esconde os gráficos; o Início não. É uma decisão de design. As confirmações de apagar mostram o valor, mas são pedidas pelo utilizador.
- **Sem limite máximo de valor:** 99 999 999 999 999 999 999 € é aceite sem aviso.
- **Qualidade do código:** ESLint sem erros. Há uma função não usada (`sign`, `app.js:183`), o `buttons()` fecha um `</div>` a mais (o navegador ignora-o) e o html-validate só dá avisos de estilo (`<!doctype` em minúsculas, botões sem `type`, irrelevante porque não há formulários `<form>`).
- **Cópias de segurança:** são JSON legível. Quem tiver o ficheiro vê tudo, por isso convém guardá-lo num sítio privado.
- 🔎 **Gráfico «Evolução do saldo» do Início:** usa o saldo inicial atual para todos os meses, como estimativa, mas ao contrário da Análise não o indica.

---

## 5. O que está bem (verificado)

- **Saldos certos ao cêntimo:** 60 saldos de contas em 12 cenários aleatórios e 36 saldos finais da Análise (por conta e por ano) batem certo com um cálculo independente em cêntimos. Nunca apareceu o aviso «não bate certo» da Análise.
- **Robustez:** 400 toques aleatórios sem erros JavaScript, ecrãs vazios, «NaN» ou dados ilegíveis, e a consola fica limpa ao abrir.
- **Segurança:**
  - nomes com `<img onerror>` e `<script>` em contas, movimentos, objetivos, regras e investimentos não injetam nada em nenhum ecrã ou formulário;
  - a app não faz pedidos a outros sites;
  - a política de segurança (CSP) bloqueia pedidos e imagens externas;
  - o PIN usa PBKDF2 com 150 000 iterações e sal.
- **Offline e atualizações:**
  - o service worker guarda os 9 ficheiros;
  - a app abre sem rede, mesmo com links com parâmetros;
  - uma versão nova publicada aparece logo ao reabrir;
  - só se apagam as caches antigas da Poupança, e as de outros sites do mesmo domínio ficam.
- **Instalação:** o Chrome não aponta nenhum erro de instalação nem de manifesto. O ícone «maskable» tem margem de segurança suficiente.
- **Acessibilidade automática:** 0 violações do axe (WCAG 2.2 AA) em 32 estados, modo claro e escuro, incluindo o ecrã do PIN e os formulários. Na primeira passagem apareceu uma falha de contraste na Análise, mas era um artefacto do meu teste: medi durante a animação de entrada de 0,25 s. Repetido sem animação, fica limpo.
- **Olho com teclado:** Enter mostra e volta a esconder os valores, e sair da app volta a escondê-los.

---

## 6. O que não foi possível verificar ⚠️

- iPhone e Android reais. Este ambiente só tem o Chromium: não há Safari/WebKit, e o WebKit não pôde ser instalado.
- A imagem do seletor de apps no iOS (cortina de privacidade), VoiceOver e TalkBack.
- A publicação real no GitHub Pages (o domínio github.io está bloqueado aqui; a atualização foi testada com um servidor local).
- A regra dos 7 dias do Safari (M5) e o limite exato de armazenamento do iPhone.
- O «4× mais lento» é só uma aproximação de um telemóvel médio.

---

## 7. Proposta de correções (por lotes)

**Lote 1 — rápido e seguro** (não muda o comportamento nem os dados): M1 (cêntimos), M2 (datas), M4 (limpar tudo no «Esqueci-me do PIN»), B9 (`eur`), B11 (`Math.round`), B6 (validar o separador), B5 (`Object.hasOwn` e verificação das datas numéricas), B10 a/c/d (papéis e atributos de acessibilidade).

**Lote 2 — muda comportamento, precisa da tua decisão:**
- M3: perguntar antes de criar muitos movimentos em atraso;
- M5: aviso de instalação no iPhone;
- B1: guardar o rascunho em vez de o perder;
- B2: «desfazer» só durante pouco tempo e com cópia antes de repor;
- B3: botão permanente para exportar a cópia danificada;
- B4: não fechar o formulário se não gravou;
- B7, B8, B12.

**Lote 3 — só se for preciso:** B13 (lista por páginas), B14 (cores alternativas para iPhones antigos), B10 b/e (foco nos formulários, tecla Esc).

---

## 8. Anexos

As capturas, as evidências e os scripts da auditoria estão no ficheiro `auditoria-v22.zip` entregue com o relatório.
