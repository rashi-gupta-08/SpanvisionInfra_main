$ErrorActionPreference = 'Continue'
$speechRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location -LiteralPath (Join-Path $speechRoot 'spanvision-speech-workspace\src-tauri')
$env:CARGO_TARGET_DIR = 'D:\CAD\spanvision-speech-build-cache'
$env:CARGO_PROFILE_DEV_DEBUG = '0'
$env:CARGO_PROFILE_TEST_DEBUG = '0'
Remove-Item -LiteralPath (Join-Path $PSScriptRoot 'native-results.json') -ErrorAction SilentlyContinue
cargo test --locked --lib -j 1 *> (Join-Path $PSScriptRoot 'cargo-tests.log')
$speechTests = $LASTEXITCODE
$speechSmoke = $null
if ($speechTests -eq 0) {
    cargo test --locked --lib -j 1 local_ -- --ignored --nocapture *> (Join-Path $PSScriptRoot 'native-smoke.log')
    $speechSmoke = $LASTEXITCODE
}
@{ testsExitCode = $speechTests; smokeExitCode = $speechSmoke; completed = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'native-results.json')
