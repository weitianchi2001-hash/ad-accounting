@echo off
chcp 65001 >nul
echo ============================================
echo     环宇视野记账系统 - 打包工具
echo ============================================
echo.

cd /d "%~dp0"

:: 1. Ensure frontend is built
echo [1/3] 构建前端...
call npx vite build
if %errorlevel% neq 0 (
    echo 前端构建失败！
    pause
    exit /b 1
)

:: 2. Download Node.js portable if not exists
if not exist "runtime\node.exe" (
    echo [2/3] 下载 Node.js 绿色版...
    mkdir runtime 2>nul
    curl -L -o runtime\node.zip "https://nodejs.org/dist/v24.15.0/node-v24.15.0-win-x64.zip"
    powershell -Command "Expand-Archive -Path runtime\node.zip -DestinationPath runtime\temp -Force"
    copy runtime\temp\node-v24.15.0-win-x64\node.exe runtime\node.exe
    rmdir /s /q runtime\temp
    del runtime\node.zip
) else (
    echo [2/3] Node.js 绿色版已存在，跳过
)

:: 3. Create ZIP package
echo [3/3] 创建打包文件...
set OUTDIR=环宇视野记账系统
rmdir /s /q "%OUTDIR%" 2>nul
mkdir "%OUTDIR%"
mkdir "%OUTDIR%\runtime"

:: Copy essential files
xcopy /e /i /q dist "%OUTDIR%\dist" >nul
xcopy /e /i /q server "%OUTDIR%\server" >nul
copy runtime\node.exe "%OUTDIR%\runtime\" >nul
copy 启动.vbs "%OUTDIR%\" >nul

:: Remove dev artifacts
rmdir /s /q "%OUTDIR%\server\node_modules\.cache" 2>nul

:: Create zip
powershell -Command "Compress-Archive -Path '%OUTDIR%' -DestinationPath '环宇视野记账系统.zip' -Force"
rmdir /s /q "%OUTDIR%"

echo.
echo ============================================
echo     打包完成！文件：环宇视野记账系统.zip
echo     把这个 ZIP 发给别人，解压后双击
echo     启动.vbs 即可使用，无需安装任何东西
echo ============================================
pause
