#!/usr/bin/env python3
"""OpportunityScout — scrapes watched opportunity pages, detects deadline changes,
and regenerates the dashboard data file.

Reads:   scout/opportunities.yaml  (curated catalog of opportunities to watch)
         scout/state.json          (previous scrape state, created on first run)
Writes:  scout/state.json          (updated scrape state)
         scout/report.md           (only when something changed — used to open a GitHub issue)
         opportunityscout/data.js  (dashboard data: catalog + live scrape state)

Usage:   python scout/scraper.py            # scrape everything
         python scout/scraper.py --no-fetch # regenerate data.js from catalog + existing state only
"""

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "scout" / "opportunities.yaml"
STATE_PATH = ROOT / "scout" / "state.json"
REPORT_PATH = ROOT / "scout" / "report.md"
DATA_JS_PATH = ROOT / "opportunityscout" / "data.js"

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
MONTH_NUM = {m: i % 12 + 1 for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"] * 1)}
MONTH_NUM.update({"jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
                  "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12})


def load_catalog():
    import yaml
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def iter_items(catalog):
    for section in ("programs", "scholarships", "startupSupport"):
        for item in catalog.get(section) or []:
            yield section, item


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


def scrape(catalog, old_state, delay=1.0):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_state, changes, errors = {}, [], []
    for section, item in iter_items(catalog):
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
        entry = {
            "lastChecked": now,
            "hash": sig_hash,
            "dates": dates,
            "error": None,
        }
        prev_hash, prev_dates = prev.get("hash"), prev.get("dates") or []
        if prev_hash is not None and sig_hash != prev_hash:
            new_dates = [d for d in dates if d not in prev_dates]
            gone_dates = [d for d in prev_dates if d not in dates]
            entry["changedAt"] = now
            changes.append((section, item, new_dates, gone_dates))
            print(f"  CHANGE {item_id}: +{new_dates} -{gone_dates}")
        else:
            if prev.get("changedAt"):
                entry["changedAt"] = prev["changedAt"]
            print(f"  ok     {item_id} ({len(dates)} dates)")
        new_state[item_id] = entry
    return new_state, changes, errors


def write_report(changes, errors):
    if not changes:
        if REPORT_PATH.exists():
            REPORT_PATH.unlink()
        return False
    lines = ["# OpportunityScout — changes detected", ""]
    lines.append(f"Scan run: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append("")
    for section, item, new_dates, gone_dates in changes:
        name = item.get("name") or f"{item.get('university', '')} — {item.get('program', '')}".strip(" —")
        lines.append(f"## {name}")
        lines.append(f"- Section: {section}")
        lines.append(f"- Page: {item['url']}")
        if new_dates:
            lines.append(f"- **New dates spotted:** {', '.join(new_dates)}")
        if gone_dates:
            lines.append(f"- Dates no longer on page: {', '.join(gone_dates)}")
        if not new_dates and not gone_dates:
            lines.append("- Deadline-related wording on the page changed (no date change detected) — worth a look.")
        lines.append("")
    if errors:
        lines.append("## Fetch errors (page may have moved)")
        for item, err in errors:
            name = item.get("name") or item.get("program") or item["id"]
            lines.append(f"- {name}: `{err}` — {item['url']}")
        lines.append("")
    lines.append("_Dashboard: https://hughgingell2-collab.github.io/second-order-demos/opportunityscout/_")
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    return True


def js_str(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def write_data_js(catalog, state):
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "generated": generated,
        "profile": catalog.get("profile", {}),
        "programs": catalog.get("programs", []),
        "scholarships": catalog.get("scholarships", []),
        "startupSupport": catalog.get("startupSupport", []),
        "scrapeState": state,
    }
    DATA_JS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_JS_PATH.write_text(
        "// Generated by scout/scraper.py — do not edit by hand.\n"
        "// Edit scout/opportunities.yaml and re-run the scraper instead.\n"
        f"window.SCOUT_DATA = {js_str(payload)};\n",
        encoding="utf-8",
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-fetch", action="store_true",
                    help="skip scraping; regenerate data.js from catalog + existing state")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests")
    args = ap.parse_args()

    catalog = load_catalog()
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}

    if args.no_fetch:
        write_data_js(catalog, state)
        print("data.js regenerated (no fetch).")
        return

    print(f"Scanning {sum(1 for _ in iter_items(catalog))} opportunities…")
    new_state, changes, errors = scrape(catalog, state, delay=args.delay)
    STATE_PATH.write_text(json.dumps(new_state, indent=2), encoding="utf-8")
    write_data_js(catalog, new_state)
    had_report = write_report(changes, errors)
    print(f"Done. {len(changes)} change(s), {len(errors)} error(s)."
          + (" Report written." if had_report else ""))


if __name__ == "__main__":
    main()
