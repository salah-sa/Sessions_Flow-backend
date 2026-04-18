@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   SessionFlow Desktop Build Pipeline
echo ========================================

:: Step 1: Check for Node Dependencies
echo [1/3] Synchronizing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Dependencies failed to sync.
    pause
    exit /b %errorlevel%
)

:: Step 2: Build Web Assets
echo [2/3] Compiling Zenith assets...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %errorlevel%
)

:: Step 3: Package Executable
echo [3/3] Packaging standalone executable...
call npm run build:exe
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo   SUCCESS: Binary generated in /release
echo ========================================
pause
