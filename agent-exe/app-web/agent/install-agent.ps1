param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBase,
  [Parameter(Mandatory = $true)]
  [string]$AccountId,
  [string]$EnrollToken = "",
  [string]$ApiKey = "",
  [string]$RtspUrl = "",
  [string]$Vendor = "GENERIC",
  [string]$InstallDir = "C:\StretPOS-Agent"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $InstallDir "logs") -Force | Out-Null

$base = $ApiBase.TrimEnd("/")
$agentUrl = "$base/agent/merchant-proxy-agent.ps1"
$proxyUrl = "$base/agent/rtsp-proxy.mjs"
$agentPath = Join-Path $InstallDir "merchant-proxy-agent.ps1"
$proxyPath = Join-Path $InstallDir "rtsp-proxy.mjs"

Invoke-WebRequest -UseBasicParsing -Uri $agentUrl -OutFile $agentPath -TimeoutSec 20
Invoke-WebRequest -UseBasicParsing -Uri $proxyUrl -OutFile $proxyPath -TimeoutSec 20

$startCmd = @(
  "powershell -ExecutionPolicy Bypass -File `"$agentPath`""
  "-AccountId $AccountId"
  "-ApiBase $base"
) -join " "
if ($EnrollToken) { $startCmd += " -EnrollToken $EnrollToken" }
if ($ApiKey) { $startCmd += " -ApiKey $ApiKey" }
if ($RtspUrl) { $startCmd += " -RtspUrl `"$RtspUrl`"" }
if ($Vendor) { $startCmd += " -Vendor $Vendor" }

$cmdFile = Join-Path $InstallDir "start-agent.cmd"
Set-Content -Path $cmdFile -Value "@echo off`r`n$startCmd`r`n" -Encoding ASCII

$taskName = "StretPOS-MerchantProxy-Agent-$AccountId"
try {
  schtasks /Delete /TN $taskName /F | Out-Null
} catch {}
schtasks /Create /TN $taskName /SC ONLOGON /RL HIGHEST /TR $cmdFile /F | Out-Null

Start-Process -FilePath "cmd.exe" -ArgumentList "/c",$cmdFile -WorkingDirectory $InstallDir -WindowStyle Hidden

Write-Output "Agent installed at $InstallDir"
Write-Output "Scheduled task: $taskName"
