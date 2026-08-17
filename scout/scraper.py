#!/usr/bin/env python3
"""OpportunityScout — scrapes watched opportunity pages, detects deadline changes,
and regenerates the dashboard data file.

Reads:   scout/opportunities.yaml  (curated catalog: categories + opportunities)
         scout/status.yaml         (your record: applied / not-interested ids)
         scout/state.json          (previous scrape state, created on first run)
Writes:  scout/state.json          (updated scrape state)
         scout/report.md           (only when something changed — becomes the alert issue)
         opportunityscout/data.js  (dashboard data: catalog + status + live scrape state)

Usage:   python scout/scraper.py            # scrape everything
         python scout/scraper.py --no-fetch # regenerate data.js only (no network)
"""

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "scout" / "opportunities.yaml"
STATUS_PATH = ROOT / "scout" / "status.yaml"
STATE_PATH = ROOT / "scout" / "state.json"
REPORT_PATH = ROOT / "scout" / "report.md"
DATA_JS_PATH = ROOT / "opportunityscout" / "data.js"

REPO = "hughgingell2-collab/second-order-demos"
DASHBOARD_URL = "https://hughgingell2-collab.github.io/second-order-demos/opportunityscout/"

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0 Safari/537.36 OpportunityScout/1.0 (personal deadline monitor)"
)

# Phrases that mark the text neighbourhood we care about on a page.
SIGNAL_KEYWORDS = [
    "deadline", "applications close", "applications open", "application open",
    "application deadline", "apply by", "closing date", "closes on", "close on",
    "due by", "due date", "round 1", "round 2", "priority date", "final date",
    "applications are open", "applications are closed", "applications are now open",
    "now accepting", "apply now", "next cohort", "next batch", "next intake",
    "submission deadline", "nominations close", "nominations open",
    "register", "rsvp", "tickets", "next event", "upcoming event",
]

WINDOW = 180  # chars either side of a keyword hit to keep as "signal text"

MONTHS = (
    "january|february|march|april|may|june|july|august|september|october|november|december|"
    "jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec"
)
DATE_PATTERNS = [
    re.compile(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({MONTHS})\.?,?\s+(\d{{4}})\b", re.I),
    re.compile(rf"\b({MONTHS})\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(\d{{4}})\b", re.I),
    re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"),
]
MONTH_NUM = {m: i + 1 for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"])}
MONTH_NUM.update({"jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
                  "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12})


def load_yaml(path, default):
    import yaml
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or default


def feedback_link(item_id, action):
    """Prefilled GitHub new-issue URL used as an email 'button'."""
    label = {"applied": "I applied to this", "hide": "Not interested / hide this"}[action]
    title = f"scout: {action} {item_id}"
    body = (
        f"{label}: `{item_id}`.\n\n"
        "Just press **Submit new issue** — the feedback bot will record it, "
        "update the dashboard, and close this issue automatically."
    )
    q = urllib.parse.urlencode({"title": title, "body": body, "labels": "scout-feedback"})
    return f"https://github.com/{REPO}/issues/new?{q}"


def fetch_text(url):
    import requests
    from bs4 import BeautifulSoup
    last_err = None
    for attempt in range(2):
        try:
            resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "noscript", "template"]):
                tag.decompose()
            text = re.sub(r"\s+", " ", soup.get_text(" ")).strip()
            return text, None
        except Exception as exc:  # noqa: BLE001 — any fetch/parse failure is reported, not fatal
            last_err = f"{type(exc).__name__}: {exc}"
            time.sleep(2 * (attempt + 1))
    return None, last_err


def signal_windows(text):
    lower = text.lower()
    spans = []
    for kw in SIGNAL_KEYWORDS:
        start = 0
        while True:
            idx = lower.find(kw, start)
            if idx == -1:
                break
            spans.append((max(0, idx - WINDOW), min(len(text), idx + len(kw) + WINDOW)))
            start = idx + len(kw)
    if not spans:
        return []
    spans.sort()
    merged = [list(spans[0])]
    for s, e in spans[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [text[s:e].strip() for s, e in merged]


def extract_dates(snippets):
    found = set()
    for snip in snippets:
        for pat in DATE_PATTERNS:
            for m in pat.finditer(snip):
                g = m.groups()
                try:
                    if pat.pattern.startswith(r"\b(\d{4})"):
                        y, mo, d = int(g[0]), int(g[1]), int(g[2])
                    elif g[0].isdigit():
                        d, mo, y = int(g[0]), MONTH_NUM[g[1].lower()], int(g[2])
                    else:
                        mo, d, y = MONTH_NUM[g[0].lower()], int(g[1]), int(g[2])
                    datetime(y, mo, d)  # validates
                    found.add(f"{y:04d}-{mo:02d}-{d:02d}")
                except (ValueError, KeyError):
                    continue
    return sorted(found)


def scrape(items, old_state, delay=1.0):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_state, changes, errors = {}, [], []
    for item in items:
        item_id, url = item["id"], item.get("url")
        if not url or item.get("watch") is False:
            continue
        prev = old_state.get(item_id, {})
        text, err = fetch_text(url)
        time.sleep(delay)
        if err:
            new_state[item_id] = {**prev, "lastChecked": now, "error": err}
            errors.append((item, err))
            print(f"  ERROR  {item_id}: {err}", file=sys.stderr)
            continue
        snippets = signal_windows(text)
        dates = extract_dates(snippets)
        sig_hash = hashlib.sha256(" | ".join(snippets).encode()).hexdigest()[:16]
        entry = {"lastChecked": now, "hash": sig_hash, "dates": dates, "error": None}
        prev_hash, prev_dates = prev.get("hash"), prev.get("dates") or []
        if prev_hash is not None and sig_hash != prev_hash:
            new_dates = [d for d in dates if d not in prev_dates]
            gone_dates = [d for d in prev_dates if d not in dates]
            entry["changedAt"] = now
            changes.append((item, new_dates, gone_dates))
            print(f"  CHANGE {item_id}: +{new_dates} -{gone_dates}")
        else:
            if prev.get("changedAt"):
                entry["changedAt"] = prev["changedAt"]
            print(f"  ok     {item_id} ({len(dates)} dates)")
        new_state[item_id] = entry
    return new_state, changes, errors


def write_report(catalog, status, changes, errors):
    """Alert issue body. Skips not-interested items; adds feedback buttons per item."""
    hidden = set(status.get("notInterested") or [])
    applied = set(status.get("applied") or [])
    changes = [c for c in changes if c[0]["id"] not in hidden]
    if not changes:
        if REPORT_PATH.exists():
            REPORT_PATH.unlink()
        return False
    cat_labels = {c["key"]: c["label"] for c in catalog.get("categories", [])}
    lines = ["# OpportunityScout — changes detected", ""]
    lines.append(f"Scan run: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append("")
    for item, new_dates, gone_dates in changes:
        flag = " *(you've applied)*" if item["id"] in applied else ""
        lines.append(f"## {item['name']}{flag}")
        lines.append(f"- Category: {cat_labels.get(item.get('category'), item.get('category'))}")
        lines.append(f"- Page: {item['url']}")
        if new_dates:
            lines.append(f"- **New dates spotted:** {', '.join(new_dates)}")
        if gone_dates:
            lines.append(f"- Dates no longer on page: {', '.join(gone_dates)}")
        if not new_dates and not gone_dates:
            lines.append("- Deadline/apply wording on the page changed (no date change detected) — worth a look.")
        lines.append(f"- [✅ I applied]({feedback_link(item['id'], 'applied')}) · "
                     f"[🚫 Not interested]({feedback_link(item['id'], 'hide')})")
        lines.append("")
    if errors:
        lines.append("## Fetch errors (page may have moved)")
        for item, err in errors:
            lines.append(f"- {item['name']}: `{err}` — {item['url']}")
        lines.append("")
    lines.append(f"_Dashboard: {DASHBOARD_URL}_")
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    return True


def write_data_js(catalog, status, state):
    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "repo": REPO,
        "profile": catalog.get("profile", {}),
        "categories": catalog.get("categories", []),
        "opportunities": catalog.get("opportunities", []),
        "status": {
            "applied": status.get("applied") or [],
            "notInterested": status.get("notInterested") or [],
        },
        "scrapeState": state,
    }
    DATA_JS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_JS_PATH.write_text(
        "// Generated by scout/scraper.py — do not edit by hand.\n"
        "// Edit scout/opportunities.yaml (catalog) or scout/status.yaml (applied/hidden)\n"
        "// and re-run the scraper instead.\n"
        f"window.SCOUT_DATA = {json.dumps(payload, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-fetch", action="store_true",
                    help="skip scraping; regenerate data.js from catalog + existing state only")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests")
    args = ap.parse_args()

    catalog = load_yaml(CATALOG_PATH, {})
    status = load_yaml(STATUS_PATH, {})
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}
    items = catalog.get("opportunities", [])

    if args.no_fetch:
        write_data_js(catalog, status, state)
        print("data.js regenerated (no fetch).")
        return

    watched = [i for i in items if i.get("url") and i.get("watch") is not False]
    print(f"Scanning {len(watched)} of {len(items)} opportunities…")
    new_state, changes, errors = scrape(items, state, delay=args.delay)
    STATE_PATH.write_text(json.dumps(new_state, indent=2), encoding="utf-8")
    write_data_js(catalog, status, new_state)
    had_report = write_report(catalog, status, changes, errors)
    print(f"Done. {len(changes)} change(s), {len(errors)} error(s)."
          + (" Report written." if had_report else ""))


if __name__ == "__main__":
    main()
