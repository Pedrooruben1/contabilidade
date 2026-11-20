# Ideias para a interface

> **Aplicado na v24:** pontos 1 a 7 e a maior parte dos pormenores do ponto 9 (ver `docs/ALTERACOES.md`).
> **Não aplicado, de propósito:**
> - ponto 8: separador próprio para a Análise, para não mudar a navegação;
> - a escala do gráfico de saldo no mês atual;
> - o aviso «Saldos estimados» com contas paradas, que é uma decisão de lógica e não de aspeto.
>
> Mantive também «As minhas contas» no Início, porque é o que mais se consulta.

Esta opinião baseia-se nas capturas de todos os ecrãs, em modo claro, escuro e privado, com dados realistas: 3 contas, 3 meses de movimentos, orçamentos, objetivos, recorrentes e investimentos.

## Opinião geral
A interface é boa para uma app pessoal: limpa, coerente, com cara de app nativa do iPhone, botões grandes e modo escuro bem feito. O problema principal não é o aspeto, é o **excesso**. O Início tenta mostrar tudo, há números repetidos e há coisas no sítio errado, sobretudo em Contas.

## O que eu mudava, por ordem de impacto

1. **Início mais curto.** Hoje são cerca de 3,5 ecrãs e 16 blocos.
   - Pôr os **Alertas logo a seguir ao cartão verde**: hoje ficam abaixo da dobra, e são o que mais importa (cópia de segurança em atraso, orçamento excedido).
   - Tirar o que está repetido. «Disponível» e «Património líquido» aparecem no cartão verde e outra vez no cartão Património. Os gráficos e as «Despesas por categoria» já existem na Análise, e lá são melhores.
   - Ficar com: cartão verde, registo rápido, um cartão com receitas, despesas e taxa do mês, previsão, alertas, resumo dos objetivos, últimos movimentos e o atalho para a Análise.
2. **Um só «+», sempre no mesmo sítio.** Hoje há o registo rápido, dois botões grandes só no Início («- Adicionar despesa» / «+ Adicionar receita») e um «+» no topo dos outros separadores, mas escondido no Início. Os dois botões ocupam uma linha inteira e repetem o que o «+» e o registo rápido já fazem.
3. **O gráfico «Evolução do saldo» do Início mostra um total que não aparece em mais lado nenhum.** Por exemplo, 6527,88 €: é a soma das contas sem investimentos nem dívidas, diferente do «Disponível» e do «Património líquido». Ou se chama «Total nas contas», ou mostra o Património.
4. **Contas mistura demasiadas coisas:** contas, recorrentes, património, cópia de segurança, modo privado, PIN, ajuda e versão. Eu punha uma roda dentada ⚙️ no topo para as **Definições** (cópia de segurança, modo privado, PIN, ajuda) e passava o parágrafo longo debaixo das contas para a ajuda.
5. **Movimentos:**
   - A lista não está separada por mês.
   - O cartão de totais, por omissão, soma «todos os meses», o que diz pouco.
   - Os filtros ocupam 3 linhas antes do primeiro movimento.

   Eu punha cabeçalhos por mês com o total de cada mês e filtros compactos (um botão «Filtros» ou etiquetas).
6. **Novo movimento:**
   - O teclado não abre sozinho no valor, por isso é sempre preciso mais um toque.
   - O campo «objetivo» aparece em todas as despesas, mesmo sem objetivos criados, e tem um rótulo comprido.

   Eu punha o valor em grande no topo, com o teclado já aberto, e o objetivo só quando há objetivos (ou em «Mais opções»).
7. **Objetivos:**
   - Os cartões são densos: 4 valores, poupança mensal, estado, movimentos associados e ajuste.
   - O «±10 €» é estranho: os passos são fixos e mexe só na parte «à mão», o que se confunde com os movimentos associados.

   Eu deixava no cartão o progresso, «faltam X até DATA (Y por mês)» e o estado, e o resto ao tocar. Trocava o ±10 € por «Juntar dinheiro», que cria uma transferência a sério.
8. **Análise:** é das melhores partes da app, mas está escondida dentro de Movimentos. Como opção, podia ter separador próprio, e os Orçamentos (um ecrã leve) podiam juntar-se aos Objetivos num separador «Planear».
9. **Pormenores:**
   - «▲ 0,00 € vs. mesmo período» quando nada mudou devia dizer «= igual ao mês anterior», como a Análise já faz.
   - O gráfico «Receitas vs. despesas» do Início mostra meses vazios de antes de começares a usar a app.
   - No mês atual, o gráfico de saldo da Análise só ocupa a parte esquerda. Está certo, mas nos primeiros dias do mês parece partido.
   - No modo privado, o Início continua a mostrar percentagens e a forma dos gráficos, que a Análise esconde. Convém escolher uma regra só.
   - «Saldos estimados» aparece sempre que há uma conta sem movimentos (achado B12 da auditoria).

## O que eu não mudava
As cores e o aspeto geral, o cartão verde do topo, a barra de separadores, o registo rápido, as folhas de baixo com os botões sempre visíveis, os •••• do modo privado e o modo escuro.

## Se fosse só 3 coisas
1. Início curto, com os alertas em cima.
2. Definições fora de Contas.
3. Movimentos agrupados por mês.
