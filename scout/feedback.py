#!/usr/bin/env python3
"""Record feedback from a 'scout: <action> <id>' issue into scout/status.yaml.

Usage: python scout/feedback.py "<issue title>"
       e.g. python scout/feedback.py "scout: applied antler-au"

Actions: applied | hide | unhide | unapplied
Exits 0 with a one-line result message; exits 1 if the title isn't a valid
feedback command or the id is unknown.
"""

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "scout" / "opportunities.yaml"
STATUS_PATH = ROOT / "scout" / "status.yaml"

VALID_ACTIONS = {"applied", "hide", "unhide", "unapplied"}


def main():
    if len(sys.argv) != 2:
        print("usage: feedback.py '<issue title>'", file=sys.stderr)
        sys.exit(1)
    m = re.match(r"^\s*scout\s*:\s*(\w+)\s+([\w-]+)\s*$", sys.argv[1], re.I)
    if not m:
        print(f"Not a scout feedback title: {sys.argv[1]!r}", file=sys.stderr)
        sys.exit(1)
    action, item_id = m.group(1).lower(), m.group(2)
    if action not in VALID_ACTIONS:
        print(f"Unknown action {action!r} (valid: {sorted(VALID_ACTIONS)})", file=sys.stderr)
        sys.exit(1)

    catalog = yaml.safe_load(CATALOG_PATH.read_text(encoding="utf-8")) or {}
    known = {o["id"] for o in catalog.get("opportunities", [])}
    if item_id not in known:
        print(f"Unknown opportunity id {item_id!r}", file=sys.stderr)
        sys.exit(1)

    status = {}
    if STATUS_PATH.exists():
        status = yaml.safe_load(STATUS_PATH.read_text(encoding="utf-8")) or {}
    applied = set(status.get("applied") or [])
    hidden = set(status.get("notInterested") or [])

    if action == "applied":
        applied.add(item_id)
        msg = f"Recorded: applied to {item_id}."
    elif action == "unapplied":
        applied.discard(item_id)
        msg = f"Recorded: {item_id} no longer marked applied."
    elif action == "hide":
        hidden.add(item_id)
        msg = f"Recorded: {item_id} hidden from future alerts."
    else:  # unhide
        hidden.discard(item_id)
        msg = f"Recorded: {item_id} un-hidden."

    STATUS_PATH.write_text(
        "# Your application record — updated by scout/feedback.py (via scout-feedback\n"
        "# issues) or by hand. 'applied' shows a badge; 'notInterested' hides the\n"
        "# opportunity from alert emails and dims it on the dashboard.\n"
        + yaml.safe_dump(
            {"applied": sorted(applied), "notInterested": sorted(hidden)},
            default_flow_style=False, allow_unicode=True,
        ),
        encoding="utf-8",
    )
    print(msg)


if __name__ == "__main__":
    main()
