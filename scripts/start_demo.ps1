# Démarre uniquement l'instance de démonstration isolée, avec des données fictives.
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))

function Invoke-Docker([string[]] $Arguments) {
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Échec Docker (code $LASTEXITCODE) : $($Arguments -join ' ')" }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Installer Docker Desktop puis redémarrer PowerShell.'
}
& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Le moteur Docker Desktop ne répond pas. Vérifier qu’il est démarré.'
}

# Le lanceur 'py' est généralement plus fiable sur Windows que l'alias Store 'python'.
if (Get-Command py -ErrorAction SilentlyContinue) {
  $python = 'py'
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $python = 'python'
} else {
  throw 'Installer Python 3 pour préparer et vérifier la démonstration.'
}

function Invoke-Python([string[]] $Arguments) {
  if ($python -eq 'py') {
    & py -3 @Arguments
  } else {
    & python @Arguments
  }
  if ($LASTEXITCODE -ne 0) { throw "Échec Python (code $LASTEXITCODE) : $($Arguments -join ' ')" }
}

if (-not (Test-Path '.env.demo.maire')) {
  Invoke-Python @('.\scripts\prepare_demo.py', '--target', '.env.demo.maire')
}
Invoke-Python @('.\scripts\check_demo.py', '--env-file', '.env.demo.maire', '--require-env')

$compose = @('compose', '--env-file', '.env.demo.maire', '-f', 'compose.demo.yaml')
Invoke-Docker ($compose + @('up', '-d', '--build', 'postgres'))
Invoke-Docker ($compose + @('--profile', 'maintenance', 'run', '--build', '--rm', 'migrate'))
Invoke-Docker ($compose + @('--profile', 'maintenance', 'run', '--build', '--rm', 'seed'))
Invoke-Docker ($compose + @('up', '-d', '--build', '--wait', '--wait-timeout', '180', 'data', 'api', 'web'))

Write-Host ''
Write-Host 'Contrôle automatique des parcours HTTP et des PDF spécimens...' -ForegroundColor Cyan
try {
  Invoke-Python @('.\scripts\verify_demo.py', '--env-file', '.env.demo.maire')
  Write-Host 'Contrôle d''isolation PostgreSQL (RLS) avec le rôle restreint...' -ForegroundColor Cyan
  Invoke-Docker ($compose + @('exec', '-T', 'data', 'sh', '-c', 'SGAEC_RUN_TENANT_TESTS=1 node --test tests/tenant-isolation.test.mjs'))
} catch {
  Write-Host 'La recette HTTP n''est pas validée. Vérifier les logs avant toute présentation.' -ForegroundColor Red
  Write-Host 'Commande de diagnostic : docker compose --env-file .env.demo.maire -f compose.demo.yaml logs --tail 100 api data web'
  throw
}
Write-Host ''
Write-Host 'SGAEC : recette HTTP et isolation PostgreSQL vérifiées. http://localhost:3000/connexion' -ForegroundColor Green
Write-Host 'Identifiant : demo.admin. Mot de passe privé dans .env.demo.maire.'
Write-Host 'Arrêt sans suppression des données : docker compose --env-file .env.demo.maire -f compose.demo.yaml down'
