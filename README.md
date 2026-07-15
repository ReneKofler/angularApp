# YouTrack Local Docker + MCP Setup

This repository provides a minimal local setup for JetBrains YouTrack running in Docker plus a Python MCP server for querying the instance.

## Prerequisites

- Docker Desktop or Docker Engine
- Python 3.11+ installed and available as `python` or `py`
- Git (already initialized for this repository)

## Start YouTrack locally

1. Open a terminal in this repository.
2. Start the container:

```powershell
docker compose up -d
```

3. Open YouTrack in your browser:

```text
http://localhost:8080
```

4. Stop the service when you are done:

```powershell
docker compose down
```

## Persistent data

The compose file creates two named volumes for persisted data and logs:

- `youtrack_data`
- `youtrack_logs`

## Configure local MCP integration

1. Copy `.env.example` to `.env`.
2. Open `.env` and set the following values:

```text
YOUTRACK_BASE_URL=http://localhost:8080
YOUTRACK_TOKEN=<your-youtrack-api-token>
```

3. Optional: if your local instance is not on `localhost:8080`, update `YOUTRACK_BASE_URL` accordingly.

> Do not commit `.env`. This repository already ignores `.env` and `.venv`.

## Install and run the MCP server

From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python youtrack_mcp_server.py
```

### Use the helper script instead

```powershell
.\start-youtrack-mcp.ps1
```

Available options:

- `-SkipInstall` — skip virtual environment creation and dependency install
- `-NoRun` — perform setup only and do not start the MCP server

## MCP tools included

The local MCP server exposes the following tools for querying YouTrack:

- `search_issues(query, max_results=10)` — search issues by text
- `get_issue(issue_id)` — fetch issue details by readable ID
- `create_issue(project_short_name, summary, description)` — create a new YouTrack issue
- `list_projects()` — list available YouTrack projects

## Usage notes

- `YOUTRACK_TOKEN` must be a valid YouTrack API token, not the wizard setup token.
- The MCP server communicates with YouTrack using the base URL from `.env`.
- If you change ports in `docker-compose.yml`, update `YOUTRACK_BASE_URL` accordingly.

## Back up and restore tickets

Export all tickets and relationships from the `DEMO` project:

```powershell
.venv\Scripts\python.exe youtrack_ticket_backup.py export
```

The version-controlled backup is written to
`backups/youtrack-demo-tickets.json`. After setting up a fresh YouTrack instance
and creating a `DEMO` project with the standard fields, restore it with:

```powershell
.venv\Scripts\python.exe youtrack_ticket_backup.py import
```

The import is repeatable: tickets with matching summaries and existing links are
skipped. To restore into another project, pass `--project PROJECT_SHORT_NAME`.

## Project files

- `docker-compose.yml` — runs a local YouTrack container with persistent volumes
- `youtrack_mcp_server.py` — Python MCP tool implementation for YouTrack
- `start-youtrack-mcp.ps1` — helper script to create a venv, install dependencies, and launch the MCP server
- `requirements.txt` — Python dependencies for the MCP server
- `.env.example` — example YouTrack configuration for local use

