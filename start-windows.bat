@echo off
setlocal
set "DIR=%~dp0"
set "NODE_EXE=%DIR%node.exe"
set "INDEX_JS=%DIR%index.js"
set "NODE_MODULES=%DIR%node_modules"

echo Starting DeadDrop Offline...

:: 1. Check for Node.js Binary
if not exist "%NODE_EXE%" (
    echo.
    echo [CRITICAL ERROR] node.exe is MISSING!
    echo Please copy it from C:\Program Files\nodejs\node.exe
    pause
    exit /b 1
)

:: 2. Check for node_modules
if not exist "%NODE_MODULES%" (
    echo.
    echo [CRITICAL ERROR] node_modules IS MISSING!
    echo Please run sys-setup.bat first.
    pause
    exit /b 1
)

:: 3. Run Server
echo Launching Server...
"%NODE_EXE%" "%INDEX_JS%"
pause
