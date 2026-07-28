#!/usr/bin/env pwsh
# MD Viewer installer for Windows
# Usage: irm https://raw.githubusercontent.com/RicSchonfelder/MD-Viewer/master/install.ps1 | iex

$Repo = "RicSchonfelder/MD-Viewer"
$ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"

Write-Host "MD Viewer Installer" -ForegroundColor Magenta
Write-Host "Checking latest version..." -ForegroundColor Cyan

try {
  $release = Invoke-RestMethod -Uri $ApiUrl -Method Get
  $tag = $release.tag_name
  Write-Host "Latest version: $tag" -ForegroundColor Green

  $asset = $release.assets | Where-Object { $_.name -like "*-setup.exe" } | Select-Object -First 1
  if (-not $asset) {
    Write-Host "No Windows installer found in the latest release." -ForegroundColor Red
    exit 1
  }

  $installerPath = Join-Path $env:TEMP "MD-Viewer-$tag-setup.exe"
  Write-Host "Downloading $($asset.name)..." -ForegroundColor Cyan

  $wc = New-Object System.Net.WebClient
  $wc.DownloadFile($asset.browser_download_url, $installerPath)

  Write-Host "Downloaded to: $installerPath" -ForegroundColor Green
  Write-Host "Running installer..." -ForegroundColor Cyan

  Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait

  Write-Host "MD Viewer $tag installed successfully!" -ForegroundColor Green
  Write-Host "You can now open .md files or launch MD Viewer from the Start Menu." -ForegroundColor White
} catch {
  Write-Host "Installation failed: $_" -ForegroundColor Red
  exit 1
}
