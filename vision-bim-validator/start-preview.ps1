param([int]$Port = 5188)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'viewer/dist/index.html')) {
    Push-Location -LiteralPath 'viewer'
    npm ci
    npm run build
    Pop-Location
}
$env:PYTHONPATH = Join-Path $PSScriptRoot 'src'
python -m uvicorn server.main:app --host 127.0.0.1 --port $Port
