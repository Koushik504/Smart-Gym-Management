param([switch]$DatabaseOnly)

$ErrorActionPreference = 'Stop'
$projectRoot = Join-Path $PSScriptRoot 'smart-gym'
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) {
    throw 'Smart Gym configuration is missing. See smart-gym/README.md.'
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $projectRoot 'scripts/provision-local.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Configured MySQL connection is unavailable.' }
if ($DatabaseOnly) { return }

try {
    $running = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/login' -UseBasicParsing -TimeoutSec 3
    if ($running.StatusCode -eq 200) {
        Write-Host 'Smart Gym is already running: http://127.0.0.1:3100'
        return
    }
} catch { }

Write-Host 'Starting Smart Gym: http://127.0.0.1:3100'
Push-Location $projectRoot
try { & npm.cmd run dev }
finally { Pop-Location }
