#!/usr/bin/env bash
# Inicia o REA Hub apos entrar ou reiniciar o Codespace.
# Atualizacao inicial: bash scripts/rea-hub-mobile.sh --upgrade
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT=3000
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/rea-hub"
LOG="$STATE_DIR/server.log"
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR" || true

is_listening() {
  local code
  code="$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
  [[ "$code" == "200" ]]
}
stop_own_server() {
  local proc pid cwd arg
  for proc in /proc/[0-9]*; do
    pid="${proc##*/}"
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    [[ -r "$proc/cmdline" ]] || continue
    local args=()
    mapfile -d '' -t args < "$proc/cmdline" 2>/dev/null || continue
    [[ ${#args[@]} -ge 2 ]] || continue
    [[ "${args[0]##*/}" == "node" ]] || continue
    arg="${args[1]}"
    [[ "$arg" == "painel/server.mjs" || "$arg" == "$ROOT/painel/server.mjs" ]] || continue
    cwd="$(readlink -f "$proc/cwd" 2>/dev/null || true)"
    [[ "$cwd" == "$ROOT" ]] || continue
    echo "Atualizando processo REA Hub, PID $pid..."
    kill "$pid" 2>/dev/null || true
  done
}

if [[ "${1:-}" == "--upgrade" ]]; then
  stop_own_server
  for _ in 1 2 3 4 5; do
    if ! is_listening; then break; fi
    sleep 1
  done
fi

if is_listening; then
  echo "REA Hub ja esta ativo. Abra o atalho no celular."
  exit 0
fi

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -Eq "[:.]$PORT[[:space:]]"; then
  echo "Porta $PORT ocupada por outro servico. Nada foi encerrado." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado." >&2
  exit 1
fi

umask 077
nohup node "$ROOT/painel/server.mjs" >> "$LOG" 2>&1 < /dev/null &
started=$!
for _ in 1 2 3 4 5 6 7; do
  if is_listening; then
    echo "REA Hub ativo."
    if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
      echo "SEU LINK PARA FAVORITAR: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
    else
      echo "Abra Codespaces > Portas > 3000 > Abrir no navegador."
    fi
    if [[ "${1:-}" == "--upgrade" && -r "$ROOT/.rea-private/secret" ]]; then
      echo "SENHA PRIVADA (guarde somente no seu aparelho): $(cat "$ROOT/.rea-private/secret")"
    fi
    echo "Para consultar a senha privada no Codespace: cat .rea-private/secret"
    echo "Adicione esse endereco a tela inicial do celular e mantenha a porta PRIVATE."
    exit 0
  fi
  if ! kill -0 "$started" 2>/dev/null; then break; fi
  sleep 1
done
echo "Falha ao iniciar. Verifique o arquivo de log privado $LOG" >&2
exit 1
