@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo 没有检测到 Node.js，需要先安装一次（一次性，5分钟左右）。
  echo 请打开浏览器访问：https://nodejs.org/zh-cn/ 下载安装"LTS"版本，
  echo 安装完成后重新双击本文件即可。
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo 第一次运行，正在安装依赖，请耐心等待1-2分钟...
  call npm install
)

echo 正在启动演示，浏览器会在几秒后自动打开...
start "" cmd /c "timeout /t 6 >nul && start http://localhost:3000"
call npm run dev

pause
