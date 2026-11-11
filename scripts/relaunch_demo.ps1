# Relance rapide pour le 12 novembre 2026 a 9 h : ne reconstruit ni ne reinitialise la base.
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))

if (-not (Test-Path '.env.demo.maire')) {
  throw 'Configuration absente : lancer scripts/start_demo.ps1 une premiere fois ce soir.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop est introuvable.'
}
& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop est arrete.' }

function Invoke-Docker([string[]] $Arguments) {
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker a echoue : $($Arguments -join ' ')" }
}

$compose = @('compose', '--env-file', '.env.demo.maire', '-f', 'compose.demo.yaml')
Invoke-Docker ($compose + @('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'postgres', 'data', 'api', 'web'))

if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3 '.\scripts\verify_demo.py' '--env-file' '.env.demo.maire'
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python '.\scripts\verify_demo.py' '--env-file' '.env.demo.maire'
} else {
  throw 'Python 3 est requis pour la verification.'
}
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Echec de la recette HTTP. Diagnostic :' -ForegroundColor Red
  Write-Host 'docker compose --env-file .env.demo.maire -f compose.demo.yaml logs --tail 100 data api web'
  throw 'Ne pas engager une demonstration non verifiee.'
}
Invoke-Docker ($compose + @('exec', '-T', 'data', 'sh', '-c', 'SGAEC_RUN_TENANT_TESTS=1 node --test tests/tenant-isolation.test.mjs'))

Write-Host ''
Write-Host 'SGAEC disponible, tests HTTP/PDF/RLS valides : http://localhost:3000/connexion' -ForegroundColor Green
Write-Host 'Compte : demo.admin. Mot de passe : voir .env.demo.maire en prive.'
