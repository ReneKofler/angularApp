# Local YouTrack

This repository runs YouTrack 2026.2 locally with Docker. YouTrack provides its
own remote MCP server, so no custom MCP implementation is needed.

## Prerequisites

- Docker Desktop or Docker Engine
- Python 3.11+ only when using the backup/restore script

## Run YouTrack

Start the service:

```powershell
docker compose up -d
```

Open <http://localhost:8080> and complete the YouTrack setup. Stop the service
without deleting its data with:

```powershell
docker compose down
```

The `youtrack_data` and `youtrack_logs` Docker volumes persist data and logs.

## Connect Codex to YouTrack

YouTrack 2026.2 exposes a built-in MCP endpoint at:

```text
http://localhost:8080/mcp
```

In Codex, open **Settings > MCP servers**, add a **Streamable HTTP** server with
that URL, and complete authentication. Restart the Codex extension after saving
the connection.

For authentication details and the tools exposed by YouTrack, see the
[YouTrack remote MCP documentation](https://www.jetbrains.com/help/youtrack/cloud/model-context-protocol-server.html).

## Back up and restore tickets

The optional backup script uses the YouTrack REST API. Create its environment:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set a permanent YouTrack token in `.env`:

```text
YOUTRACK_BASE_URL=http://localhost:8080
YOUTRACK_TOKEN=<your-youtrack-token>
```

Export the `DEMO` project:

```powershell
.\.venv\Scripts\python.exe .\youtrack_ticket_backup.py export
```

Restore it into a fresh `DEMO` project:

```powershell
.\.venv\Scripts\python.exe .\youtrack_ticket_backup.py import
```

Use `--project PROJECT_SHORT_NAME` to target another project. Imports are
repeatable: matching ticket summaries and existing links are skipped.

## Project files

- `docker-compose.yml` runs YouTrack with persistent Docker volumes.
- `youtrack_ticket_backup.py` exports and restores issues through the REST API.
- `backups/youtrack-demo-tickets.json` is the version-controlled ticket backup.
- `.env.example` documents configuration for the backup script.
- `requirements.txt` contains the backup script's Python dependency.
