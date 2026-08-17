# OpportunityScout

A personal opportunity radar for an Australian lawyer pivoting into AI (and building
TerraCheck). Five curated categories — further study, startup programs & funding,
pitch events (Sydney), pitch events (San Francisco), other opportunities — with a
weekly scraper that watches every official page, emails alerts via GitHub issues,
and a one-click applied / not-interested feedback loop.

**Dashboard:** https://hughgingell2-collab.github.io/second-order-demos/opportunityscout/

## Moving parts

| Path | What it is |
|---|---|
| `scout/opportunities.yaml` | The catalog: 5 categories, ~10 entries each, 2-sentence blurb + 1-sentence prepare + official URL. Edit this. |
| `scout/status.yaml` | Your application record: `applied` and `notInterested` id lists. Updated by the feedback bot or by hand. |
| `scout/scraper.py` | Fetches each watched URL, extracts deadline/apply text + dates, diffs vs last run. |
| `scout/feedback.py` | Records a `scout: <action> <id>` issue title into `status.yaml`. |
| `scout/state.json` | Last-run scrape snapshot. Committed by the Action. |
| `scout/report.md` | Written only when changes are detected; becomes the alert issue. |
| `opportunityscout/` | The dashboard (GitHub Pages). `data.js` is generated — don't hand-edit. |
| `.github/workflows/opportunity-scan.yml` | Weekly scan (Tue ~6am AEST) + manual trigger. |
| `.github/workflows/scout-feedback.yml` | Listens for feedback issues, updates `status.yaml`, closes the issue. |

## The feedback loop ("buttons in the email")

Each alert issue (and each dashboard detail panel) carries two links per opportunity:

- **✅ I applied** → opens a pre-filled issue titled `scout: applied <id>`
- **🚫 Not interested** → opens a pre-filled issue titled `scout: hide <id>`

Press *Submit new issue* and the feedback workflow records it in `scout/status.yaml`,
regenerates the dashboard (applied badge / dimmed row), comments, and closes the
issue. Hidden items stop appearing in future alert emails. Also supported by hand:
`scout: unhide <id>` and `scout: unapplied <id>`. Only issues opened by the repo
owner are processed.

`status.yaml` was seeded from the "Prototypes Legal Business V2" doc (Google Drive):
Antler residency = applied (TerraCheck).

## Running locally

```bash
pip install -r scout/requirements.txt
python scout/scraper.py            # full scan (~2 min; use --delay to tune politeness)
python scout/scraper.py --no-fetch # regenerate opportunityscout/data.js only
python scout/feedback.py "scout: applied y-combinator"   # record feedback manually
```

## Editing the catalog

Each entry: stable `id`, `name`, `category` (must match a key in `categories`),
`blurb` (≤2 sentences), `prepare` (1 sentence, optional), `deadline` (ISO date or
null), `deadlineNote`, `cadence` (for rolling/recurring), `sub` (small tag),
`url` (the page where dates are published — that's what gets scraped),
`watch: false` to list without scraping.

Dates researched August 2026; entries whose next cycle isn't announced carry an
"expected" note — the scraper exists precisely to catch the real dates appearing.

## Caveats

- JS-rendered or bot-blocking pages surface as `fetch error` rather than silently going stale.
- Date extraction is regex-based; it's a change detector, not an authority — confirm on the official page.
- The catalog is a curated shortlist for this profile, not a directory of everything.
