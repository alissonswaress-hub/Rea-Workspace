# Extrai os APKs instalados de um aparelho Android conectado ao computador via USB.
# Requer Android SDK Platform-Tools (adb) e Depuracao USB autorizada no telefone.
param([string]$Package = 'app.befit')
$ErrorActionPreference = 'Stop'
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { throw 'ADB nao encontrado. Instale SDK Platform-Tools oficial da Google.' }
& adb devices
Write-Host "Localizando APKs de $Package no aparelho Android..."
$lines = @(& adb shell pm path $Package)
if ($LASTEXITCODE -ne 0) { throw 'Falha no comando pm path. Confirme USB e app instalado.' }
$paths = @($lines | Where-Object { $_ -match '^package:' })
if ($paths.Count -eq 0) { throw "Nao encontrado: $Package. Confirme que o app esta instalado e seu pacote esta correto." }
$dest = Join-Path (Get-Location) ($Package + '-apks')
New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($line in $paths) {
  $remote = $line.Trim().Substring(8)
  $target = Join-Path $dest (Split-Path -Leaf $remote)
  Write-Host "Copiando $remote"
  & adb pull $remote $target
  if ($LASTEXITCODE -ne 0) { throw "Falha ao copiar $remote" }
}
Write-Host "Arquivos extraidos para $dest"
Write-Host 'Para analisar no REA Hub envie base.apk; preserve os APKs split_config*.apk para referencia.'
Write-Host 'Esses arquivos sao para estudo autorizado. Nao publique arquivos proprietarios no GitHub.'
