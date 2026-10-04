@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
 echo Create a Python 3.12 .venv and install requirements.txt first.
 exit /b 1
)
".venv\Scripts\python.exe" run_app.py
