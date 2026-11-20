#!/bin/sh
# Corre todos os testes da Poupança sobre a pasta do projeto e NUNCA dá um falso «tudo OK».
# Um teste só conta como aprovado se TODAS estas condições se verificarem:
#   1. o código de saída é 0 (uma exceção, uma promessa rejeitada ou um timeout reprovam);
#   2. não aparece nenhuma linha «FALHA»;
#   3. não aparecem erros de JavaScript («erros JS: [...]» com conteúdo);
#   4. aparece pelo menos uma verificação «OK» (um teste que não faz nada reprova).
# Antes de começar, confirma que o servidor local serve MESMO esta pasta (para não testar outra versão por engano).
#
# Requisitos: Node.js, Python 3 e, na pasta do projeto:  npm i playwright axe-core  &&  npx playwright install chromium
# Uso (a partir da pasta do projeto):  sh testes/executar-todos.sh
# Variáveis opcionais (usadas pelo autoteste do executor): TESTES="a.js b.js"  SEM_SERVIDOR=1  TEMPO_MAX=segundos
cd "$(dirname "$0")/.." || exit 1
mkdir -p /tmp/poupanca-testes && [ -w /tmp/poupanca-testes ] || { echo "ERRO: não foi possível criar a pasta temporária /tmp/poupanca-testes. Os testes não correram." >&2; exit 2; }
PORTA=8780
TEMPO_MAX=${TEMPO_MAX:-280}

if [ -z "$SEM_SERVIDOR" ]; then
  python3 -m http.server "$PORTA" > /dev/null 2>&1 &
  SERVIDOR=$!
  trap 'kill $SERVIDOR 2>/dev/null' EXIT
  sleep 1
  python3 - "$PORTA" <<'FIM'
import sys, urllib.request
porta = sys.argv[1]
for f in ['app.js', 'analise.js', 'sw.js', 'index.html', 'style.css']:
    try:
        servido = urllib.request.urlopen(f'http://localhost:{porta}/{f}', timeout=5).read()
    except Exception as e:
        print(f'ERRO: o servidor local não responde para {f} ({e})'); sys.exit(1)
    if servido != open(f, 'rb').read():
        print(f'ERRO: o servidor na porta {porta} não está a servir esta pasta ({f} é diferente). Fecha o outro servidor e tenta de novo.'); sys.exit(1)
FIM
  [ $? -eq 0 ] || exit 2
fi

if [ -z "$TESTES" ]; then TESTES=$(ls testes/[0-9][0-9]_*.js testes/anteriores/*.js 2>/dev/null | grep -v '/_'); fi
if command -v timeout > /dev/null 2>&1; then LIMITE="timeout $TEMPO_MAX"; else LIMITE=""; fi

TOTAL=0; PASSARAM=0; REPROVADOS=""
for t in $TESTES; do
  TOTAL=$((TOTAL+1))
  SAIDA=$($LIMITE node "$t" 2>&1); CODIGO=$?
  echo "=== $t"; echo "$SAIDA"
  OKS=$(echo "$SAIDA" | grep -c '^OK ')
  FALHAS=$(echo "$SAIDA" | grep -c '^FALHA')
  ERROS=$(echo "$SAIDA" | grep -cE 'erros( JS)?: \[.+\]')
  MOTIVO=""
  [ "$CODIGO" -ne 0 ] && MOTIVO="$MOTIVO código de saída $CODIGO;"
  [ "$FALHAS" -gt 0 ] && MOTIVO="$MOTIVO $FALHAS verificação(ões) FALHA;"
  [ "$ERROS" -gt 0 ] && MOTIVO="$MOTIVO erros de JavaScript;"
  [ "$OKS" -eq 0 ] && MOTIVO="$MOTIVO nenhuma verificação OK (o teste não correu?);"
  if [ -n "$MOTIVO" ]; then REPROVADOS="$REPROVADOS
  - $t:$MOTIVO"; echo "-> REPROVADO:$MOTIVO"; else PASSARAM=$((PASSARAM+1)); echo "-> aprovado ($OKS verificações)"; fi
done

echo
echo "RESUMO: $PASSARAM de $TOTAL testes aprovados"
if [ "$PASSARAM" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then echo "TUDO OK"; exit 0; fi
echo "HÁ FALHAS:$REPROVADOS"
exit 1
