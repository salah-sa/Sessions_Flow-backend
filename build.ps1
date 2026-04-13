# SessionFlow Build Script
# Prerequisites: Node.js 18+, .NET 9 SDK, Windows 10/11 x64
param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$NoPack
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SessionFlow Build Script v1.0.0" -ForegroundColor Cyan
Write-Host "  Company: 3C" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Check Prerequisites ---
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = (node --version 2>&1).ToString().TrimStart('v')
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 18) {
        Write-Host "ERROR: Node.js 18+ is required. Found: v$nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Node.js: v$nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check .NET SDK
try {
    $dotnetVersion = (dotnet --version 2>&1).ToString()
    $dotnetMajor = [int]($dotnetVersion.Split('.')[0])
    if ($dotnetMajor -lt 9) {
        Write-Host "ERROR: .NET 9 SDK is required. Found: $dotnetVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "  .NET SDK: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: .NET SDK is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""

# --- Build Frontend ---
if (-not $SkipFrontend) {
    Write-Host "[2/7] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "$PSScriptRoot\sessionflow-ui"
    try {
        npm install --legacy-peer-deps 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: npm install failed." -ForegroundColor Red
            exit 1
        }
        Write-Host "  npm install completed." -ForegroundColor Green

        Write-Host "[3/7] Building React frontend..." -ForegroundColor Yellow
        npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: npm run build failed." -ForegroundColor Red
            exit 1
        }
        Write-Host "  Frontend build completed." -ForegroundColor Green
    } finally {
        Pop-Location
    }

    # Copy build output to wwwroot
    Write-Host "[4/7] Copying frontend build to wwwroot..." -ForegroundColor Yellow
    $wwwroot = "$PSScriptRoot\SessionFlow.Desktop\wwwroot"
    if (Test-Path $wwwroot) {
        Remove-Item "$wwwroot\*" -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null
    }
    Copy-Item "$PSScriptRoot\sessionflow-ui\dist\*" -Destination $wwwroot -Recurse -Force
    $fileCount = (Get-ChildItem $wwwroot -Recurse -File).Count
    Write-Host "  Copied $fileCount files to wwwroot." -ForegroundColor Green
} else {
    Write-Host "[2-4/7] Skipping frontend build (--SkipFrontend)." -ForegroundColor DarkGray
}

Write-Host ""

# --- Build Backend ---
if (-not $SkipBackend) {
    Write-Host "[5/7] Building .NET application..." -ForegroundColor Yellow
    Push-Location "$PSScriptRoot\SessionFlow.Desktop"
    try {
        dotnet restore 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: dotnet restore failed." -ForegroundColor Red
            exit 1
        }

        Write-Host "[6/7] Publishing self-contained executable..." -ForegroundColor Yellow
        $outputDir = "$PSScriptRoot\dist\SessionFlow"
        if (Test-Path $outputDir) {
            Remove-Item $outputDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $outputDir 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: dotnet publish failed." -ForegroundColor Red
            exit 1
        }
        Write-Host "  Published to: $outputDir" -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[5-6/7] Skipping backend build (--SkipBackend)." -ForegroundColor DarkGray
}

# --- Package ---
if (-not $NoPack) {
    Write-Host "[7/7] Creating distribution package..." -ForegroundColor Yellow
    $outputDir = "$PSScriptRoot\dist\SessionFlow"
    Copy-Item "$PSScriptRoot\README.md" -Destination "$outputDir\" -Force -ErrorAction SilentlyContinue
    $zipPath = "$PSScriptRoot\SessionFlow-v1.0.0.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Compress-Archive -Path "$outputDir\*" -DestinationPath $zipPath -Force
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host "  Package: $zipPath ($zipSize MB)" -ForegroundColor Green
} else {
    Write-Host "[7/7] Skipping package (--NoPack)." -ForegroundColor DarkGray
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE" -ForegroundColor Green
Write-Host "  Time: $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor Cyan
Write-Host "  Output: dist\SessionFlow\SessionFlow.Desktop.exe" -ForegroundColor Cyan
Write-Host "  Package: SessionFlow-v1.0.0.zip" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
