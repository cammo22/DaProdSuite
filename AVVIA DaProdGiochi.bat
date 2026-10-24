@echo off
cd /d "%~dp0"
cargo build -p daprodgiochi --features desktop
if errorlevel 1 (
  pause
  exit /b 1
)
target\debug\daprodgiochi.exe
if errorlevel 1 pause
