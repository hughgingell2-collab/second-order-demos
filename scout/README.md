# OpportunityScout

A personal opportunity radar: a curated catalog of masters programs (AI + AI×law at
Stanford / Harvard / Penn–Wharton / MIT / Oxford / Cambridge), scholarships an Australian
lawyer can win, and startup incubators/accelerators (AU / US / world) — with a weekly
scraper that watches every official page and opens a GitHub issue when anything changes.

**Dashboard:** https://hughgingell2-collab.github.io/second-order-demos/opportunityscout/

## Moving parts

| Path | What it is |
|---|---|
| `scout/opportunities.yaml` | The single source of truth: every opportunity + its official URL. Edit this. |
| `scout/scraper.py` | Fetches each watched URL, extracts deadline-adjacent text + dates, diffs vs last run. |
| `scout/state.json` | Last-run snapshot (hashes, detected dates, errors). Committed by the Action. |
| `scout/report.md` | Written only when changes are detected; becomes the notification issue body. |
| `opportunityscout/` | The dashboard (static page on GitHub Pages). `data.js` is generated — don't hand-edit. |
| `.github/workflows/opportunity-scan.yml` | Weekly cron (Tue ~6am AEST) + manual trigger. |

## Notifications

The Action opens a GitHub issue labelled `opportunity-scout` whenever a watched page
changes or a fetch starts failing. GitHub emails issues to the repo owner by default —
that's the alert channel, no SMTP or third-party service needed. Run it on demand from
the Actions tab ("OpportunityScout weekly scan" → Run workflow).

## Running locally

```bash
pip install -r scout/requirements.txt
python scout/scraper.py            # full scan (~2 min, 1.5s politeness delay per page)
python scout/scraper.py --no-fetch # just regenerate opportunityscout/data.js from the catalog
```

## Editing the catalog

Each entry needs a stable `id`, a display block, and a `url` pointing at the page where
deadlines are actually published (that's what gets scraped). Optional keys:

- `watch: false` — keep it on the dashboard but don't scrape it.
- `deadline` — ISO date (`2026-12-01`) drives the "days left" badge; omit for rolling.
- `deadlineNote` — free text shown in the detail panel (round structure, caveats).

Deadlines were researched August 2026; where a 2026-27 cycle wasn't published yet the
previous cycle's date is listed and flagged in `deadlineNote` — the scraper exists
precisely to catch the moment the new dates appear.

## Caveats

- JS-rendered or bot-blocking pages surface as `fetch error` in the issue and on the
  dashboard rather than silently going stale.
- Date extraction is regex-based (three common formats). It's a change detector, not an
  authority — always confirm on the official page.
