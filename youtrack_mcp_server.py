import os
import logging
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)

mcp = FastMCP("youtrack")

YOUTRACK_BASE_URL = os.getenv("YOUTRACK_BASE_URL", "http://localhost:8080").rstrip("/")
YOUTRACK_TOKEN = os.getenv("YOUTRACK_TOKEN", "").strip()

COMMON_ISSUE_FIELDS = (
    "idReadable,summary,project(id,name,shortName),created,updated,"
    "status(name),priority(name),assignee(login,fullName),type(name),tags(name)"
)

HEADERS = {
    "Accept": "application/json",
}

if YOUTRACK_TOKEN:
    HEADERS["Authorization"] = f"Bearer {YOUTRACK_TOKEN}"


async def youtrack_request(
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    json_data: Any | None = None,
) -> dict[str, Any] | None:
    url = f"{YOUTRACK_BASE_URL}{path}"
    logging.info("YouTrack request: %s %s", method, url)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method,
                url,
                headers=HEADERS,
                params=params,
                json=json_data,
                timeout=30.0,
            )
            response.raise_for_status()
            if response.text:
                return response.json()
            return {}
        except httpx.HTTPStatusError as exc:
            logging.error("YouTrack HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return {
                "error": f"YouTrack request failed: {exc.response.status_code} {exc.response.text}"
            }
        except Exception as exc:
            logging.error("YouTrack request failed: %s", exc)
            return {"error": str(exc)}


def format_issue_summary(issue: dict[str, Any]) -> str:
    project = issue.get("project", {})
    assignee = issue.get("assignee") or {}
    status = issue.get("status") or {}
    priority = issue.get("priority") or {}
    issue_type = issue.get("type") or {}
    tags = ", ".join(sorted(tag.get("name", "") for tag in issue.get("tags", [])))

    return (
        f"Issue: {issue.get('idReadable', 'unknown')}\n"
        f"Summary: {issue.get('summary', 'No summary')}\n"
        f"Project: {project.get('shortName') or project.get('name') or 'unknown'}\n"
        f"Type: {issue_type.get('name', 'unknown')}\n"
        f"Status: {status.get('name', 'unknown')}\n"
        f"Priority: {priority.get('name', 'unknown')}\n"
        f"Assignee: {assignee.get('fullName') or assignee.get('login') or 'unassigned'}\n"
        f"Updated: {issue.get('updated', 'unknown')}\n"
        f"Tags: {tags or 'none'}"
    )


def format_issue_detail(issue: dict[str, Any]) -> str:
    summary = format_issue_summary(issue)
    description = issue.get("description") or "No description available."
    return f"{summary}\n\nDescription:\n{description}"


@mcp.tool()
async def search_issues(query: str, max_results: int = 10) -> str:
    """Search issues in YouTrack by query text.

    Args:
        query: YouTrack search query text.
        max_results: Maximum number of issues to return.
    """
    if not query.strip():
        return "Please provide a non-empty search query."

    params = {
        "query": query,
        "$top": max_results,
        "fields": COMMON_ISSUE_FIELDS,
    }
    result = await youtrack_request("GET", "/api/issues", params=params)
    if not result:
        return "No results returned from YouTrack."

    if isinstance(result, dict) and result.get("error"):
        return result["error"]

    if not isinstance(result, list) or len(result) == 0:
        return f"No issues found for query: {query}"

    summaries = [format_issue_summary(issue) for issue in result]
    return "\n\n---\n\n".join(summaries)


@mcp.tool()
async def get_issue(issue_id: str) -> str:
    """Get a detailed YouTrack issue by its readable ID.

    Args:
        issue_id: The YouTrack issue key, for example YT-1.
    """
    if not issue_id.strip():
        return "Please provide a valid issue ID like YT-1."

    params = {"fields": COMMON_ISSUE_FIELDS + ",description"}
    result = await youtrack_request("GET", f"/api/issues/{issue_id}", params=params)
    if not result:
        return f"Issue {issue_id} was not found or YouTrack returned no data."

    if isinstance(result, dict) and result.get("error"):
        return result["error"]

    return format_issue_detail(result)


@mcp.tool()
async def create_issue(project_short_name: str, summary: str, description: str = "") -> str:
    """Create a new YouTrack issue in the given project.

    Args:
        project_short_name: The short name of the project, for example DEMO.
        summary: Issue summary/title.
        description: Optional issue description.
    """
    if not project_short_name.strip():
        return "Please provide a valid project short name, like DEMO."
    if not summary.strip():
        return "Please provide a non-empty summary for the new issue."

    payload = {
        "project": {"shortName": project_short_name},
        "summary": summary,
        "description": description,
    }

    result = await youtrack_request("POST", "/api/issues", json_data=payload)
    if not result:
        return "YouTrack did not return a response when creating the issue."

    if isinstance(result, dict) and result.get("error"):
        return result["error"]

    return f"Created issue {result.get('idReadable', 'unknown')} in project {project_short_name}."


@mcp.tool()
async def list_projects() -> str:
    """List YouTrack projects available in the connected instance."""
    result = await youtrack_request("GET", "/api/admin/projects", params={"fields": "id,name,shortName"})
    if not result:
        return "No projects returned from YouTrack."

    if isinstance(result, dict) and result.get("error"):
        return result["error"]

    if not isinstance(result, list) or len(result) == 0:
        return "No YouTrack projects were found."

    projects = [f"{project.get('shortName') or project.get('name')} ({project.get('id')})" for project in result]
    return "\n".join(projects)


def main() -> None:
    if not YOUTRACK_TOKEN:
        logging.warning(
            "YOUTRACK_TOKEN is not set. Requests will fail if your YouTrack instance requires authentication."
        )
    logging.info("Starting YouTrack MCP server for %s", YOUTRACK_BASE_URL)
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
