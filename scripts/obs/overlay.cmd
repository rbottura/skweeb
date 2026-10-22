@echo off
rem scripts\obs\overlay.cmd — the puppet over the screen you record, by a double click: overlay.ps1 says the rest.
rem Arguments are passed on: overlay.cmd -Source avatar -Screen 1
pwsh -NoProfile -File "%~dp0overlay.ps1" %*
if errorlevel 1 pause
