<#
.SYNOPSIS
Sets up the local Python MCP environment and starts the YouTrack MCP server.

.DESCRIPTION
Creates a .venv if needed, installs dependencies from requirements.txt, copies .env.example to .env when missing, and launches youtrack_mcp_server.py.

.PARAMETER SkipInstall
If set, the script skips venv creation and dependency installation and only starts the MCP server.

.PARAMETER NoRun
If set, the script performs setup only and does not start the server.
#>

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$NoRun
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location $scriptDir

function Get-PythonPath {
    $pythonExe = Join-Path $scriptDir '.venv\Scripts\python.exe'
    if (Test-Path $pythonExe) {
        return $pythonExe
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        return $py.Source
    }

    throw 'Python was not found. Install Python 3 and make sure the py launcher is available.'
}

$pythonPath = Get-PythonPath

if (-not $SkipInstall) {
    if (-not (Test-Path '.venv')) {
        Write-Host 'Creating Python virtual environment...' -ForegroundColor Cyan
        & $pythonPath -m venv .venv
    }

    $venvPython = Join-Path $scriptDir '.venv\Scripts\python.exe'
    if (-not (Test-Path $venvPython)) {
        throw 'The virtual environment Python executable was not found after venv creation.'
    }

    Write-Host 'Installing Python dependencies...' -ForegroundColor Cyan
    & $venvPython -m pip install --upgrade pip | Out-Null
    & $venvPython -m pip install -r requirements.txt
} else {
    Write-Host 'Skipping install. Using existing virtual environment.' -ForegroundColor Yellow
    $venvPython = Join-Path $scriptDir '.venv\Scripts\python.exe'
    if (-not (Test-Path $venvPython)) {
        throw 'Skipping install requested, but .venv is missing. Remove -SkipInstall or create the virtual environment manually.'
    }
}

if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Copy-Item '.env.example' '.env'
        Write-Host 'Copied .env.example to .env. Edit .env to configure YOUTRACK_BASE_URL or YOUTRACK_TOKEN as needed.' -ForegroundColor Green
    } else {
        Write-Warning '.env and .env.example were not found. Create a .env file manually if needed.'
    }
}

if ($NoRun) {
    Write-Host 'Setup complete. Server launch skipped because -NoRun was specified.' -ForegroundColor Green
    return
}

Write-Host 'Starting YouTrack MCP server...' -ForegroundColor Cyan
& $venvPython 'youtrack_mcp_server.py'
