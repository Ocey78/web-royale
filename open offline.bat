@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title Web Royale - Offline Launcher

echo [Web Royale] Opening offline build...

rem Prefer the project's existing offline launcher because it can start any
rem local server/runtime required by the packaged browser build.
if exist "offline build opener.bat" (
    call "offline build opener.bat"
    exit /b !errorlevel!
)

if exist "offline\offline build opener.bat" (
    pushd "offline"
    call "offline build opener.bat"
    set "ERR=!errorlevel!"
    popd
    exit /b !ERR!
)

rem Fallbacks for builds that can be opened directly.
if exist "offline\index.html" (
    start "" "%~dp0offline\index.html"
    exit /b 0
)

if exist "dist\index.html" (
    start "" "%~dp0dist\index.html"
    exit /b 0
)

if exist "index.html" (
    start "" "%~dp0index.html"
    exit /b 0
)

echo.
echo ERROR: No Web Royale offline build was found next to this launcher.
echo Copy "open offline.bat" to the root of the full Web Royale build, next to
echo "offline build opener.bat" or the packaged index.html.
echo.
pause
exit /b 1
