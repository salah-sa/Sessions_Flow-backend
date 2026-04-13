# SessionFlow Build & Deploy Script
# This script builds the React frontend and deploys it to the WPF shell's wwwroot.

$ErrorActionPreference = "Stop"

$RootPath = Get-Location
$UIPath = Join-Path $RootPath "sessionflow-ui"
$WpfPath = Join-Path $RootPath "SessionFlow.Desktop"
$WwwRoot = Join-Path $WpfPath "wwwroot"

Write-Host "--- Starting SessionFlow Deployment Pipeline ---" -ForegroundColor Cyan

# 1. Build UI
Write-Host "[1/3] Building React Frontend..." -ForegroundColor Yellow
Set-Location $UIPath
npm run build

# 2. Prepare wwwroot
Write-Host "[2/3] Preparing WPF wwwroot..." -ForegroundColor Yellow
if (Test-Path $WwwRoot) {
    Remove-Item -Path "$WwwRoot\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $WwwRoot
}

# 3. Copy Assets
Write-Host "[3/3] Deploying Assets to Wpf Shell..." -ForegroundColor Yellow
$DistPath = Join-Path $UIPath "dist"
Copy-Item -Path "$DistPath\*" -Destination $WwwRoot -Recurse -Force

Write-Host "Deployment Complete! The SessionFlow desktop app is now ready for launch." -ForegroundColor Green
Set-Location $RootPath
