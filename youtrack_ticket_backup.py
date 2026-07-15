import argparse
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


DEFAULT_BACKUP = Path("backups/youtrack-demo-tickets.json")
ISSUE_FIELDS = (
    "idReadable,summary,description,customFields(name,$type,value(name,login,fullName)),"
    "links(id,direction,linkType(name),issues(idReadable))"
)


class YouTrackClient:
    def __init__(self) -> None:
        load_dotenv()
        self.base_url = os.getenv("YOUTRACK_BASE_URL", "http://localhost:8080").rstrip("/")
        token = os.getenv("YOUTRACK_TOKEN", "").strip()
        if not token:
            raise SystemExit("YOUTRACK_TOKEN is missing. Configure it in .env first.")
        self.headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, path: str, data: Any | None = None) -> Any:
        body = json.dumps(data).encode("utf-8") if data is not None else None
        request = urllib.request.Request(
            self.base_url + path,
            data=body,
            headers=self.headers,
            method=method,
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read()
            return json.loads(content) if content else {}


def field_value(field: dict[str, Any]) -> Any:
    value = field.get("value")
    if isinstance(value, dict):
        return value.get("name") or value.get("login")
    if isinstance(value, list):
        return [item.get("name") or item.get("login") for item in value]
    return value


def export_tickets(client: YouTrackClient, project: str, output: Path) -> None:
    params = urllib.parse.urlencode(
        {"query": f"project: {project}", "$top": 1000, "fields": ISSUE_FIELDS}
    )
    issues = client.request("GET", f"/api/issues?{params}")
    exported = []

    for issue in sorted(issues, key=lambda item: item["idReadable"]):
        fields = {
            field["name"]: field_value(field)
            for field in issue.get("customFields", [])
            if field.get("name") in {"Type", "Priority", "State", "Subsystem"}
            and field_value(field) not in (None, [], "")
        }
        links = []
        for link in issue.get("links", []):
            if link.get("direction") not in {"OUTWARD", "BOTH"}:
                continue
            for target in link.get("issues", []):
                links.append(
                    {
                        "type": link["linkType"]["name"],
                        "direction": link["direction"],
                        "target": target["idReadable"],
                    }
                )
        exported.append(
            {
                "key": issue["idReadable"],
                "summary": issue["summary"],
                "description": issue.get("description") or "",
                "fields": fields,
                "links": links,
            }
        )

    backup = {
        "formatVersion": 1,
        "project": project,
        "issues": exported,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(backup, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Exported {len(exported)} tickets to {output}")


def custom_fields(values: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    types = {
        "Type": "SingleEnumIssueCustomField",
        "Priority": "SingleEnumIssueCustomField",
        "State": "StateIssueCustomField",
        "Subsystem": "SingleOwnedIssueCustomField",
    }
    for name, field_type in types.items():
        if values.get(name):
            result.append(
                {"name": name, "$type": field_type, "value": {"name": values[name]}}
            )
    return result


def import_tickets(client: YouTrackClient, backup_path: Path, project: str | None) -> None:
    backup = json.loads(backup_path.read_text(encoding="utf-8"))
    target_project = project or backup["project"]
    params = urllib.parse.urlencode(
        {
            "query": f"project: {target_project}",
            "$top": 1000,
            "fields": "id,idReadable,summary",
        }
    )
    existing = client.request("GET", f"/api/issues?{params}")
    by_summary = {issue["summary"]: issue for issue in existing}
    key_map: dict[str, dict[str, Any]] = {}
    created = 0

    for saved in backup["issues"]:
        issue = by_summary.get(saved["summary"])
        if issue is None:
            issue = client.request(
                "POST",
                "/api/issues?fields=id,idReadable,summary",
                {
                    "project": {"shortName": target_project},
                    "summary": saved["summary"],
                    "description": saved.get("description", ""),
                    "customFields": custom_fields(saved.get("fields", {})),
                },
            )
            by_summary[saved["summary"]] = issue
            created += 1
        key_map[saved["key"]] = issue

    linked = 0
    for saved in backup["issues"]:
        source = key_map[saved["key"]]
        available_links = client.request(
            "GET",
            f"/api/issues/{source['idReadable']}/links?fields=id,direction,linkType(name),issues(idReadable)",
        )
        for saved_link in saved.get("links", []):
            target = key_map.get(saved_link["target"])
            if target is None:
                continue
            link = next(
                (
                    item
                    for item in available_links
                    if item["linkType"]["name"] == saved_link["type"]
                    and item["direction"] == saved_link["direction"]
                ),
                None,
            )
            if link is None:
                continue
            current_targets = {item["idReadable"] for item in link.get("issues", [])}
            if target["idReadable"] in current_targets:
                continue
            client.request(
                "POST",
                f"/api/issues/{source['idReadable']}/links/{link['id']}/issues"
                "?fields=idReadable",
                {"idReadable": target["idReadable"]},
            )
            linked += 1

    print(
        f"Import complete: {created} tickets created, "
        f"{len(backup['issues']) - created} already present, {linked} links restored."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Export or import a YouTrack project backlog.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    export_parser = subparsers.add_parser("export")
    export_parser.add_argument("--project", default="DEMO")
    export_parser.add_argument("--output", type=Path, default=DEFAULT_BACKUP)

    import_parser = subparsers.add_parser("import")
    import_parser.add_argument("--input", type=Path, default=DEFAULT_BACKUP)
    import_parser.add_argument("--project", help="Override the target project short name")

    args = parser.parse_args()
    client = YouTrackClient()
    if args.command == "export":
        export_tickets(client, args.project, args.output)
    else:
        import_tickets(client, args.input, args.project)


if __name__ == "__main__":
    main()
