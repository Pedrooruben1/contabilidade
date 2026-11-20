#!/bin/sh
# Autoteste do executor: garante que o executar-todos.sh nunca dá um falso «tudo OK».
# Cria testes falsos (uns bons, vários maus) e confirma que o executor aprova só os bons.
# Uso (a partir da pasta do projeto):  sh testes/autoteste_executor.sh
cd "$(dirname "$0")/.." || exit 1
RAIZ=$(pwd)
# A pasta temporária tem de existir e ser gravável; se não, o autoteste pára em vez de escrever noutro sítio.
D=$(mktemp -d 2>/dev/null)
if [ -z "$D" ] || [ ! -d "$D" ] || [ ! -w "$D" ]; then
  echo "ERRO: não foi possível criar uma pasta temporária gravável (TMPDIR=${TMPDIR:-/tmp}). O autoteste não correu." >&2
  exit 2
fi
printf "console.log('OK   passa');\n" > "$D/bom.js"
printf "console.log('OK   x');\nconsole.log('FALHA isto falhou');\n" > "$D/falha_visivel_codigo0.js"
printf "console.log('OK   x');\nprocess.exitCode = 1;\n" > "$D/codigo1_sem_texto.js"
printf "console.log('começou');\nthrow new Error('rebentou');\n" > "$D/excecao.js"
printf "// não faz nada e termina bem\n" > "$D/silencioso.js"
printf "Promise.reject(new Error('promessa rejeitada'));\n" > "$D/promessa_rejeitada.js"
printf "console.log('OK   x');\nconsole.log('erros JS: [\"TypeError\"]');\n" > "$D/erros_js.js"
printf "require('%s/testes/anteriores/_saida.js');\nconsole.log('OK   a');\nconsole.log('FALHA b');\n" "$RAIZ" > "$D/antigo_com_falha.js"
printf "require('%s/testes/anteriores/_saida.js');\nconsole.log('OK   a');\n" "$RAIZ" > "$D/antigo_bom.js"
printf "require('%s/testes/anteriores/_saida.js');\n" "$RAIZ" > "$D/antigo_sem_nada.js"
printf "setTimeout(() => {}, 600000);\n" > "$D/bloqueia.js"
# Todos os testes falsos têm de ter sido criados; se algum faltar, o autoteste não pode dar resultados fiáveis.
for F in bom falha_visivel_codigo0 codigo1_sem_texto excecao silencioso promessa_rejeitada erros_js antigo_com_falha antigo_bom antigo_sem_nada bloqueia; do
  if [ ! -s "$D/$F.js" ]; then echo "ERRO: não foi possível criar o teste falso $F.js em $D. O autoteste não correu." >&2; rm -rf "$D"; exit 2; fi
done

CERTOS=0; TOTAL=0
verificar() { # $1 = ficheiro, $2 = esperado (0 = aprovado, 1 = reprovado)
  TOTAL=$((TOTAL+1))
  TESTES="$D/$1" SEM_SERVIDOR=1 TEMPO_MAX=3 sh testes/executar-todos.sh > /dev/null 2>&1
  R=$?; if [ "$R" -ne 0 ]; then R=1; fi
  if [ "$R" = "$2" ]; then
    CERTOS=$((CERTOS+1))
    if [ "$2" = "0" ]; then ESTADO="aprovou"; else ESTADO="reprovou"; fi
    echo "OK   $1: executor $ESTADO"
  else
    echo "FALHA $1: o executor devia ter dado $2 mas deu $R"
  fi
}
verificar bom.js 0
verificar falha_visivel_codigo0.js 1
verificar codigo1_sem_texto.js 1
verificar excecao.js 1
verificar silencioso.js 1
verificar promessa_rejeitada.js 1
verificar erros_js.js 1
verificar antigo_com_falha.js 1
verificar antigo_bom.js 0
verificar antigo_sem_nada.js 1
verificar bloqueia.js 1
echo "resumo: $CERTOS/$TOTAL comportamentos do executor corretos"
rm -rf "$D"
[ "$CERTOS" = "$TOTAL" ]
