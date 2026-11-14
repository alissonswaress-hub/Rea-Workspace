#!/usr/bin/env bash
# Configura as dependencias oficiais para analise estatica de APK no REA.
# Nao baixa APKs de terceiros nem executa aplicativos Android.
set -Eeuo pipefail

JAR_DIR="$HOME/.local/share/rea/android"
JAR="$JAR_DIR/jadx-headless-mcp-0.7.1-all.jar"
URL="https://github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1/jadx-headless-mcp-0.7.1-all.jar"
SHA="6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75"

echo "== REA Android: preparando requisitos =="
if ! command -v java >/dev/null 2>&1 || ! command -v javac >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1 || ! command -v ps >/dev/null 2>&1; then
  echo "Java JDK, curl ou procps ausentes. Instalando via apt-get..."
  sudo -n apt-get update
  sudo -n apt-get install -y openjdk-21-jdk-headless ca-certificates curl procps
fi
java -version
javac -version
mkdir -p "$JAR_DIR"
if [[ ! -f "$JAR" ]]; then
  echo "Baixando JAR conforme documentacao oficial do REA (versao 0.7.1)..."
  curl --fail --location --retry 3 --silent --show-error "$URL" -o "$JAR.tmp"
  mv "$JAR.tmp" "$JAR"
fi
echo "$SHA  $JAR" | sha256sum -c -
export REA_JADX_MCP_JAR="$JAR"

# Salva a configuracao para novos terminais Bash, sem duplicar a linha.
LINE='export REA_JADX_MCP_JAR="$HOME/.local/share/rea/android/jadx-headless-mcp-0.7.1-all.jar"'
if ! grep -qxF "$LINE" "$HOME/.bashrc" 2>/dev/null; then
  printf '\n%s\n' "$LINE" >> "$HOME/.bashrc"
fi

echo "== Diagnostico de JADX (sem APK) =="
rea doctor --provider jadx --json > "$JAR_DIR/diagnostico-jadx.json"
node - "$JAR_DIR/diagnostico-jadx.json" <<'NODE'
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const checks=data.checks||data.scope_checks||[];
const j=checks.find(c=>c.name==='jadx');
console.log(JSON.stringify({healthy:data.healthy,provider_jadx:j||null},null,2));
if(j?.ok!==true && data.healthy!==true){console.error('JADX ainda nao aparece saudavel. Consulte o diagnostico-jadx.json.');process.exitCode=1;}
NODE
echo "Pronto. Abra seu REA Hub no Codespaces e envie um APK obtido legitimamente."
