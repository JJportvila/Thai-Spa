param(
  [Parameter(Mandatory = $true)]
  [string]$AccountId,
  [Parameter(Mandatory = $true)]
  [string]$ApiBase,
  [string]$ApiKey = "",
  [string]$EnrollToken = "",
  [string]$RtspUrl = "",
  [string]$Vendor = "GENERIC",
  [int]$HeartbeatSeconds = 30
)

$ErrorActionPreference = "Continue"
$agentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$proxyScript = Join-Path $agentRoot "rtsp-proxy.mjs"
$outDir = Join-Path $agentRoot "logs"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$rtspOut = Join-Path $outDir "rtsp-proxy.out.log"
$rtspErr = Join-Path $outDir "rtsp-proxy.err.log"
$tunnelOut = Join-Path $outDir "tunnel.out.log"
$tunnelErr = Join-Path $outDir "tunnel.err.log"

function Ensure-Command([string]$name, [string]$installHint) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "$name not found. $installHint" }
}

function Ensure-RtspProxy {
  $existing = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "node.exe" -and $_.CommandLine -like "*rtsp-proxy.mjs*"
  }
  if ($existing) { return }
  Start-Process -FilePath "node" `
    -ArgumentList $proxyScript `
    -WorkingDirectory $agentRoot `
    -RedirectStandardOutput $rtspOut `
    -RedirectStandardError $rtspErr `
    -WindowStyle Hidden | Out-Null
}

function Start-Tunnel {
  $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cloudflared) {
    return @{
      Process = (Start-Process -FilePath $cloudflared.Source `
        -ArgumentList "tunnel","--url","http://127.0.0.1:9194","--no-autoupdate" `
        -WorkingDirectory $agentRoot `
        -RedirectStandardOutput $tunnelOut `
        -RedirectStandardError $tunnelErr `
        -PassThru `
        -WindowStyle Hidden)
      Pattern = "https://[a-z0-9-]+\.trycloudflare\.com"
    }
  }
  return @{
    Process = (Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c","npx -y localtunnel --port 9194 --subdomain bright-comics-shop" `
      -WorkingDirectory $agentRoot `
      -RedirectStandardOutput $tunnelOut `
      -RedirectStandardError $tunnelErr `
      -PassThru `
      -WindowStyle Hidden)
    Pattern = "https://[a-z0-9-]+\.loca\.lt"
  }
}

function Find-TunnelUrl([string]$pattern, [int]$timeoutSec = 45) {
  for ($i = 0; $i -lt $timeoutSec; $i++) {
    Start-Sleep -Seconds 1
    $scan = @()
    if (Test-Path $tunnelOut) { $scan += $tunnelOut }
    if (Test-Path $tunnelErr) { $scan += $tunnelErr }
    if ($scan.Count -eq 0) { continue }
    $m = Select-String -Path $scan -Pattern $pattern | Select-Object -Last 1
    if ($m) { return $m.Matches[0].Value }
  }
  return ""
}

function Push-ProxyStatus([string]$mode, [string]$url) {
  $api = "$($ApiBase.TrimEnd('/'))/api/merchant-proxy"
  $payload = @{
    mode = $mode
    accountId = $AccountId.ToUpper()
    proxyUrl = $url
    rtspUrl = $RtspUrl
    source = "NVR"
    vendor = $Vendor
    host = $env:COMPUTERNAME
    agentId = "$env:COMPUTERNAME-$PID"
  } | ConvertTo-Json -Depth 5

  $headers = @{ "Content-Type" = "application/json" }
  if ($ApiKey) { $headers["x-api-key"] = $ApiKey }
  elseif ($EnrollToken) { $headers["x-enroll-token"] = $EnrollToken }
  else { throw "Missing ApiKey or EnrollToken" }

  Invoke-RestMethod -Method Post -Uri $api -Headers $headers -Body $payload -TimeoutSec 12 | Out-Null
}

Ensure-Command "node" "Please install Node.js LTS"
Ensure-Command "ffmpeg" "Please install ffmpeg and ensure it is in PATH"

while ($true) {
  try {
    Ensure-RtspProxy
    if (Test-Path $tunnelOut) { Remove-Item $tunnelOut -Force -ErrorAction SilentlyContinue }
    if (Test-Path $tunnelErr) { Remove-Item $tunnelErr -Force -ErrorAction SilentlyContinue }

    $started = Start-Tunnel
    $proc = $started.Process
    $url = Find-TunnelUrl -pattern $started.Pattern
    if (-not $url) {
      if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
      Start-Sleep -Seconds 2
      continue
    }

    Push-ProxyStatus -mode "register" -url $url
    while (-not $proc.HasExited) {
      Start-Sleep -Seconds ([Math]::Max(10, $HeartbeatSeconds))
      Push-ProxyStatus -mode "heartbeat" -url $url
    }
  } catch {
    Start-Sleep -Seconds 3
  }
}
