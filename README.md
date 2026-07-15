# YouTrack Local Docker Setup

This workspace contains a minimal Docker Compose configuration to run JetBrains YouTrack locally.

## Run YouTrack

1. Open a terminal in this repository.
2. Start the container:

```bash
docker compose up -d
```

3. Open YouTrack in your browser:

```text
http://localhost:8080
```

## Stop YouTrack

```bash
docker compose down
```

## Data Persistence

The compose file creates two named volumes for persisted data and logs:

- `youtrack_data`
- `youtrack_logs`

## Notes

- The image used is `jetbrains/youtrack:2026.2.17548`.
- If you already have a service bound to port `8080`, change the port mapping in `docker-compose.yml`.

## Local MCP integration

This repository also includes a minimal MCP server for querying the running YouTrack instance.

1. Create a Python virtual environment and install dependencies:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and update `YOUTRACK_BASE_URL` or add `YOUTRACK_TOKEN` if needed.

3. Start the MCP server:

```powershell
python youtrack_mcp_server.py
```

### Or use the helper script

```powershell
.\start-youtrack-mcp.ps1
```

Additional options:

```powershell
.\start-youtrack-mcp.ps1 -SkipInstall
.\start-youtrack-mcp.ps1 -NoRun
```

4. To connect from Claude for Desktop, use the sample config in `claude_desktop_config.sample.json` and replace the path with your local file path.

### Provided MCP tools

- `search_issues(query, max_results=10)` — search YouTrack issues by query text
- `get_issue(issue_id)` — fetch issue details by readable ID
- `list_projects()` — list available YouTrack projects
