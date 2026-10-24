@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\writer\start.ps1"
if errorlevel 1 pause
