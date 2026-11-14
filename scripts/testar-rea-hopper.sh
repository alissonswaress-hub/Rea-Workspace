#!/usr/bin/env bash
# Teste educacional do REA com Hopper dentro do GitHub Codespaces.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
mkdir -p build results
TARGET="$(pwd)/build/loja_demo"

echo "=== 1/5: Compilando programa de exemplo ==="
if ! command -v gcc >/dev/null 2>&1; then
  echo "ERRO: compilador gcc nao encontrado. No Codespaces execute: sudo apt-get update && sudo apt-get install -y build-essential"
  exit 2
fi

gcc -std=c11 -O0 -g -fno-inline -fno-omit-frame-pointer -o "$TARGET" exemplos/loja_demo.c

echo "=== 2/5: Validando o programa original ==="
RESULTADO="$("$TARGET")"
echo "$RESULTADO"
test "$RESULTADO" = "total_centavos=4050 lucro_centavos=1950" || {
  echo "ERRO: programa nao produziu o resultado esperado."
  exit 3
}

echo "=== 3/5: Conferindo REA e Hopper ==="
command -v rea >/dev/null 2>&1 || { echo "ERRO: comando rea nao encontrado"; exit 4; }
export HOPPER_LAUNCHER_PATH="${HOPPER_LAUNCHER_PATH:-/opt/hopper/bin/Hopper}"
echo "Hopper: $HOPPER_LAUNCHER_PATH"
if [[ ! -x "$HOPPER_LAUNCHER_PATH" ]]; then
  echo "ERRO: executavel Hopper nao encontrado ou sem permissao de execucao."
  exit 5
fi
rea doctor --provider hopper --json > results/doctor-hopper.json
if ! grep -q '"healthy":true' results/doctor-hopper.json; then
  echo "AVISO: diagnostico Hopper nao marcou healthy=true. Confira results/doctor-hopper.json."
fi

echo "=== 4/5: Analisando binario com REA + Hopper ==="
echo "Pode levar algum tempo. No Linux o Hopper pode requerer configuracao de demo/licenca."
# O REA chama o Hopper na analise; o teste de doctor sozinho nao comprova isso.
if ! rea analyze "$TARGET" --provider hopper --json > results/analise-hopper.json 2> results/analise-hopper-erro.txt; then
  echo "FALHOU: REA nao concluiu a analise do binario."
  echo "As ultimas mensagens foram:"
  tail -n 35 results/analise-hopper-erro.txt || true
  echo "Veja tambem results/analise-hopper.json (se existir)."
  exit 6
fi

echo "=== 5/5: Inspecionando uma funcao real ==="
if ! rea function "$TARGET" calcular_total --provider hopper --json > results/funcao-calcular-total.json 2> results/funcao-erro.txt; then
  echo "AVISO: analise geral funcionou, mas a consulta da funcao falhou."
  tail -n 25 results/funcao-erro.txt || true
  exit 7
fi

echo
echo "TESTE COMPLETO: programa compilado, executado e inspecionado com REA + Hopper."
echo "Relatorios em: $(pwd)/results/"
echo "Arquivos: analise-hopper.json e funcao-calcular-total.json"
