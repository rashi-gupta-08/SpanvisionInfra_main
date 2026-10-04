@echo off
cd /d "%~dp0"
uv venv --python 3.12 .venv || exit /b 1
uv pip install --python .venv\Scripts\python.exe -r requirements.txt || exit /b 1
echo Ready. Launch STL-3D map workspace with start.bat.
