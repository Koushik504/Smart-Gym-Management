$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$workspaceRoot = Split-Path $projectRoot -Parent
$configuredEnv = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $configuredEnv) {
    $configuredLine = Get-Content -LiteralPath $configuredEnv | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
    if ($configuredLine) {
        $configuredUrl = [uri]($configuredLine.Substring('DATABASE_URL='.Length).Trim().Trim('"'))
        $configuredPort = if ($configuredUrl.Port -gt 0) { $configuredUrl.Port } else { 3306 }
        if ($configuredPort -ne 3308) {
            $configuredProbe = [System.Net.Sockets.TcpClient]::new()
            try { $configuredProbe.Connect($configuredUrl.Host, $configuredPort) }
            catch { throw "Configured MySQL is unavailable on port $configuredPort. Start your configured MySQL service; existing configuration was preserved." }
            finally { $configuredProbe.Dispose() }
            Write-Host "Using configured MySQL on port $configuredPort. Existing configuration preserved; workspace port-3308 provisioner skipped."
            return
        }
    }
}
$dataPath = Join-Path $workspaceRoot '.local\smartgym-mysql'
$serverPath = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
if (!(Test-Path -LiteralPath $serverPath)) { throw 'Install MySQL 8 or configure your own DATABASE_URL; see README.md.' }
if (!(Test-Path -LiteralPath (Join-Path $dataPath 'auto.cnf'))) {
    New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
    & $serverPath --no-defaults --initialize-insecure "--datadir=$dataPath" --console
    if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed' }
}
$probe = [System.Net.Sockets.TcpClient]::new()
try { $probe.Connect('127.0.0.1',3308); $running = $true } catch { $running = $false } finally { $probe.Dispose() }
if (!$running) {
    $argsList = @('--no-defaults','--basedir="C:/Program Files/MySQL/MySQL Server 8.0"',('--datadir="'+$dataPath+'"'),'--bind-address=127.0.0.1','--port=3308','--mysqlx=OFF','--log-bin-trust-function-creators=1','--console')
    $process = Start-Process -FilePath $serverPath -ArgumentList $argsList -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dataPath 'console.out.log') -RedirectStandardError (Join-Path $dataPath 'console.err.log') -PassThru
    $ready = $false
    for ($attempt=0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 500
        if ($process.HasExited) { throw 'Smart Gym MySQL exited; inspect .local/smartgym-mysql/console.err.log' }
        $probe = [System.Net.Sockets.TcpClient]::new()
        try { $probe.Connect('127.0.0.1',3308); $ready=$true; break } catch {} finally { $probe.Dispose() }
    }
    if (!$ready) { throw 'Smart Gym MySQL did not become ready on port 3308' }
}
$pythonPath = Join-Path $workspaceRoot '.venv\Scripts\python.exe'
if (Test-Path -LiteralPath $pythonPath) {
    & $pythonPath (Join-Path $PSScriptRoot 'provision-local.py')
    if ($LASTEXITCODE -ne 0) { throw 'Local account configuration failed' }
} else { Write-Host 'MySQL is ready. Configure accounts using MySQL Workbench as documented in README.md.' }
Write-Host 'Smart Gym MySQL ready at 127.0.0.1:3308. Existing databases/services are unchanged.'
