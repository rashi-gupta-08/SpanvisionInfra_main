@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" exit /b 1
".venv\Scripts\python.exe" packaging\prepare.py || exit /b 1
".venv\Scripts\python.exe" -m PyInstaller packaging\stl.spec --noconfirm || exit /b 1
if not defined SPANVISION_STL_ISCC (
 echo Set SPANVISION_STL_ISCC to an Inno Setup compiler.
 exit /b 1
)
"%SPANVISION_STL_ISCC%" packaging\stl.iss
