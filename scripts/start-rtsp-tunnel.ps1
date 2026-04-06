$ErrorActionPreference = "Continue"

$repo = "E:\Github\Stret-POS"
$outDir = Join-Path $repo ".tmp-tunnel"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$rtspOut = Join-Path $outDir "rtsp-proxy.out.log"
$rtspErr = Join-Path $outDir "rtsp-proxy.err.log"
$tunnelOut = Join-Path $outDir "tunnel.out.log"
$tunnelErr = Join-Path $outDir "tunnel.err.log"
$urlFile = Join-Path $outDir "public-url.txt"

function Stop-ByCommandLinePattern([string]$name, [string]$pattern) {
  Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq $name -and $_.CommandLine -like "*$pattern*" } |
    ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
}

function Ensure-RtspProxy {
  $existing = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "node.exe" -and $_.CommandLine -like "*scripts/rtsp-proxy.mjs*"
  }
  if ($existing) { return }
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npm run rtsp-proxy" `
    -WorkingDirectory $repo `
    -RedirectStandardOutput $rtspOut `
    -RedirectStandardError $rtspErr `
    -WindowStyle Hidden | Out-Null
}

function Start-CloudflareTunnel {
  $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
  if (-not $cloudflared) { return $null }
  return Start-Process -FilePath $cloudflared.Source `
    -ArgumentList "tunnel","--url","http://127.0.0.1:9194","--no-autoupdate" `
    -WorkingDirectory $repo `
    -RedirectStandardOutput $tunnelOut `
    -RedirectStandardError $tunnelErr `
    -PassThru `
    -WindowStyle Hidden
}

function Start-LocalTunnelFallback {
  return Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npx -y localtunnel --port 9194 --subdomain bright-comics-shop" `
    -WorkingDirectory $repo `
    -RedirectStandardOutput $tunnelOut `
    -RedirectStandardError $tunnelErr `
    -PassThru `
    -WindowStyle Hidden
}

Stop-ByCommandLinePattern "cloudflared.exe" "tunnel --url http://127.0.0.1:9194"
Stop-ByCommandLinePattern "node.exe" "localtunnel --port 9194"

while ($true) {
  Ensure-RtspProxy
  if (Test-Path $tunnelOut) { Remove-Item $tunnelOut -Force -ErrorAction SilentlyContinue }
  if (Test-Path $tunnelErr) { Remove-Item $tunnelErr -Force -ErrorAction SilentlyContinue }

  $proc = Start-CloudflareTunnel
  $pattern = "https://[a-z0-9-]+\.trycloudflare\.com"
  if (-not $proc) {
    $proc = Start-LocalTunnelFallback
    $pattern = "https://[a-z0-9-]+\.loca\.lt"
  }

  $detected = $false
  for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    if (-not $proc.HasExited) {
      $scanFiles = @()
      if (Test-Path $tunnelOut) { $scanFiles += $tunnelOut }
      if (Test-Path $tunnelErr) { $scanFiles += $tunnelErr }
      $m = $null
      if ($scanFiles.Count -gt 0) {
        $m = Select-String -Path $scanFiles -Pattern $pattern | Select-Object -Last 1
      }
      if ($m) {
        $m.Matches[0].Value | Set-Content -Path $urlFile -Encoding UTF8
        $detected = $true
        break
      }
    }
  }

  if (-not $detected) {
    "" | Set-Content -Path $urlFile -Encoding UTF8
  }

  Wait-Process -Id $proc.Id -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
