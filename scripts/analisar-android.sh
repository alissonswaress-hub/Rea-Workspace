#!/usr/bin/env bash
# Analisa um APK autorizado localmente sem executar o aplicativo.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK="${1:-}"
if [[ -z "$APK" || ! -f "$APK" ]]; then
  echo "Uso: bash scripts/analisar-android.sh /caminho/arquivo.apk"
  exit 2
fi
if [[ "${APK,,}" != *.apk ]]; then
  echo "Informe um arquivo .apk. Pacotes .apks/.xapk necessitam separar os APKs originais."
  exit 2
fi
JAR="$HOME/.local/share/rea/android/jadx-headless-mcp-0.7.1-all.jar"
export REA_JADX_MCP_JAR="${REA_JADX_MCP_JAR:-$JAR}"
if [[ ! -f "$REA_JADX_MCP_JAR" ]]; then
  echo "JADX ausente. Execute: bash scripts/preparar-rea-android.sh"
  exit 3
fi
NAME="$(basename "$APK" .apk | tr -cd 'A-Za-z0-9_.-')"
OUT="$ROOT/results/android/${NAME:-apk}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
echo "Arquivo: $APK"
echo "SHA256: $(sha256sum "$APK" | awk '{print $1}')"
echo "Relatorios em: $OUT"
rea doctor --provider jadx --json > "$OUT/diagnostico-jadx.json"
echo "Analisando pacote Android (somente leitura)..."
rea inspect-android-package "$APK" --json > "$OUT/pacote.json"
echo "Pesquisando classes de entrada..."
if ! rea search-android-classes "$APK" MainActivity --json > "$OUT/classes-principais.json" 2> "$OUT/erro-classes.txt"; then
  echo "Classes MainActivity nao identificadas. Veja relatorios; apps Flutter podem expor pouco codigo Java."
fi
echo "CONCLUIDO: inspecao Android realizada. Confira $OUT/pacote.json"
echo "A analise nao recupera servidores, modelos de IA remotos ou o codigo original completo."
