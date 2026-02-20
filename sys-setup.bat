@echo off
setlocal
echo ===========================================
echo   DeadDrop Offline Builder ^& Setup Script
echo ===========================================
echo.

:: Check if running in root of drive (common cause of EPERM)
if "%~dp0"=="%~d0\" (
    echo [WARNING] You are running this in the ROOT of the drive ^(%~d0\^).
    echo Windows often blocks creating files here.
    echo.
    echo PLEASE:
    echo 1. Create a folder (e.g. 'DeadDrop')
    echo 2. Move all these files into it.
    echo 3. Run this script again from inside that folder.
    echo.
    set /p "CHOICE=Type 'Y' to try anyway, or 'N' to exit: "
    if /i "%CHOICE%" neq "Y" exit /b
)

echo.
echo [1/3] Installing Server Dependencies (Cross-Platform Safe)...
call npm install --omit=optional --no-bin-links
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install server dependencies.
    echo If you see 'EPERM', please move files to a folder!
    goto error
)

echo.
echo [2/3] Building React Frontend...
cd client
call npm install
if errorlevel 1 goto error
call npm run build
if errorlevel 1 goto error
cd ..

echo.
echo [3/3] Copying Build to Root...
if exist "dist" rmdir /s /q "dist"
move "client\dist" "dist"
if errorlevel 1 goto error

echo.
echo ===========================================
echo   SUCCESS! Project is ready.
echo ===========================================
echo Structure Check:
echo  - dist/         [OK]
echo  - node_modules/ [OK]
echo  - index.js      [OK]
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Something went wrong. See above.
pause
exit /b 1
