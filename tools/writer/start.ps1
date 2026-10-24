param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$taskState = Join-Path $taskRoot '.writer'
New-Item -ItemType Directory -Path $taskState -Force | Out-Null

function Read-WriterStatus([int]$Port) {
    try {
        return Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/status" -TimeoutSec 3
    } catch { return $null }
}

$taskPort = 4317
$taskStateFile = Join-Path $taskState 'server.json'
if (Test-Path -LiteralPath $taskStateFile) {
    try {
        $taskSaved = Get-Content -LiteralPath $taskStateFile -Raw | ConvertFrom-Json
        $taskExisting = Read-WriterStatus ([int]$taskSaved.port)
        if ($taskExisting.root -eq $taskRoot) {
            $taskUrl = "http://127.0.0.1:$($taskSaved.port)"
            if (-not $NoBrowser) { Start-Process $taskUrl }
            Write-Output $taskUrl
            exit 0
        }
    } catch { }
}

while ($taskPort -le 4327) {
    $taskClient = New-Object Net.Sockets.TcpClient
    try {
        $taskConnect = $taskClient.ConnectAsync('127.0.0.1', $taskPort)
        $taskBusy = $taskConnect.Wait(250) -and $taskClient.Connected
    } catch { $taskBusy = $false }
    finally { $taskClient.Dispose() }
    if (-not $taskBusy) { break }
    $taskExisting = Read-WriterStatus $taskPort
    if ($taskExisting.root -eq $taskRoot) {
        $taskUrl = "http://127.0.0.1:$taskPort"
        if (-not $NoBrowser) { Start-Process $taskUrl }
        Write-Output $taskUrl
        exit 0
    }
    $taskPort++
}
if ($taskPort -gt 4327) { throw 'Ports 4317-4327 are busy.' }

$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskServer = Join-Path $PSScriptRoot 'server.mjs'
$taskArguments = @(('"{0}"' -f $taskServer), '--port', [string]$taskPort)
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskArguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskState 'server.out.log') -RedirectStandardError (Join-Path $taskState 'server.err.log')
for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
    Start-Sleep -Milliseconds 400
    $taskExisting = Read-WriterStatus $taskPort
    if ($taskExisting.root -eq $taskRoot) {
        $taskUrl = "http://127.0.0.1:$taskPort"
        if (-not $NoBrowser) { Start-Process $taskUrl }
        Write-Output $taskUrl
        exit 0
    }
    if ($taskProcess.HasExited) { break }
}
throw ('Writer did not start. Check ' + (Join-Path $taskState 'server.err.log'))
