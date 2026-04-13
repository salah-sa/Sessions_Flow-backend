@echo off
setlocal

echo ==========================================
echo   SessionFlow Production Build Script
echo ==========================================

:: 1. Force kill existing app instances to release file/port locks
echo [1/5] Cleaning up existing sessions...
taskkill /F /IM SessionFlow.Desktop.exe /T 2>nul
timeout /t 2 /nobreak >nul

:: 2. Build Frontend (sessionflow-ui)
echo [2/5] Building React Frontend (sessionflow-ui)...
pushd "sessionflow-ui"
if not exist "node_modules" (
    echo   - node_modules not found, running npm install...
    call npm install
)
call npm run build
if %errorlevel% neq 0 (
    echo   ! ERROR: Frontend build failed.
    popd
    pause
    exit /b %errorlevel%
)
popd

:: 3. Prepare wwwroot in Desktop Project
echo [3/5] Cleaning SessionFlow.Desktop\wwwroot...
if not exist "SessionFlow.Desktop\wwwroot" mkdir "SessionFlow.Desktop\wwwroot"
powershell -Command "Remove-Item -Path 'SessionFlow.Desktop\wwwroot\*' -Recurse -Force -ErrorAction SilentlyContinue"

:: 4. Sync Assets from Frontend dist to Backend wwwroot
echo [4/5] Syncing assets from sessionflow-ui\dist...
if not exist "sessionflow-ui\dist" (
    echo   ! ERROR: Frontend dist folder is missing.
    pause
    exit /b 1
)
xcopy /E /I /Y "sessionflow-ui\dist\*" "SessionFlow.Desktop\wwwroot\"
if %errorlevel% neq 0 (
    echo   ! ERROR: Asset sync failed.
    pause
    exit /b %errorlevel%
)

:: 5. Build Desktop Backend (Release mode)
echo [5/5] Building .NET Desktop Application (Release)...
pushd "SessionFlow.Desktop"
dotnet build -c Release
if %errorlevel% neq 0 (
    echo   ! ERROR: Backend build failed.
    popd
    pause
    exit /b %errorlevel%
)
popd

:: 6. Direct Sync to Output Folders (Fix for 404/Missing Assets)
echo [6/6] Finalizing UI assets in Output folders...
set "DEST_RELEASE=SessionFlow.Desktop\bin\Release\net9.0-windows\win-x64\wwwroot"
if exist "SessionFlow.Desktop\bin\Release\net9.0-windows\win-x64" (
    if not exist "%DEST_RELEASE%" mkdir "%DEST_RELEASE%"
    xcopy /E /I /Y "sessionflow-ui\dist\*" "%DEST_RELEASE%\"
)

set "DEST_DEBUG=SessionFlow.Desktop\bin\Debug\net9.0-windows\win-x64\wwwroot"
if exist "SessionFlow.Desktop\bin\Debug\net9.0-windows\win-x64" (
    if not exist "%DEST_DEBUG%" mkdir "%DEST_DEBUG%"
    xcopy /E /I /Y "sessionflow-ui\dist\*" "%DEST_DEBUG%\"
)

echo.
echo ==========================================
echo   BUILD COMPLETED SUCCESSFULLY!
echo ==========================================
echo.

set /p RUN_APP="Do you want to run the application now? (y/n): "
if /i "%RUN_APP%"=="y" (
    echo Launching SessionFlow...
    start "" "SessionFlow.Desktop\bin\Release\net9.0-windows\win-x64\SessionFlow.Desktop.exe"
)

pause
endlocal
