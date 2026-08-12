# Build prompt — StatuteGraph (site folder: `statutegraph/`)

**Play:** `C:\Claude\idea-prompts\second-order\01-precedent-data-layer.md` — the legislation-to-document data layer. "Bloomberg for statutory change impact."
**Accent colour:** indigo `#4f46e5` (dark theme: `#818cf8`).
**Tagline under wordmark:** "The legislation → document impact graph".

## Screens (tabs)

### 1. Impact Feed (default)
Table of recent legislative amendments (~30 rows): columns = Instrument (e.g. "Privacy and Other Legislation Amendment Act 2026 (Cth) sch 2"), Jurisdiction, Practice areas touched, Affected clause patterns (count), Affected document types (count), Severity (Low/Medium/High/Critical badge), Commencement date. Dropdown filters: jurisdiction, practice area, severity. Search box. Sortable. Row click → slide-over showing: what changed (2–3 sentences), list of affected clause patterns (e.g. "Data breach notification clause — 14 template families"), and a mini list of affected document types with counts.

### 2. Graph
An SVG bipartite impact map: left column = 8 selected legislative provisions, right column = 10 document types (Employment agreement, SaaS MSA, Privacy policy, Supply agreement…), curved edges weighted by number of affected clause patterns. A dropdown picks the amendment to visualise; hovering an edge shows a tooltip (provision → doc type, N clauses); clicking a node highlights its edges and dims the rest. Below the graph: two charts — "Amendments by month (last 12 months)" bar chart, and "Affected clause patterns by practice area" donut.

### 3. API Feed
The commercialisation screen: mock developer console. Left: a request builder (dropdowns for endpoint `/impacts`, `/provisions/{id}/documents`, jurisdiction, since-date) with a "Run" button. Right: pretty-printed mock JSON response (syntax highlighted with simple CSS classes) that actually reflects the chosen filters from data.js. Below: three pricing tier cards (Updater seat / Vendor feed / Enterprise graph) with per-call pricing — make the middle "Vendor feed" tier visually primary (it's the second-order business).

### 4. About this play

## Data notes
Amendments should mix real-sounding AU instruments across Cth/NSW/VIC/QLD (privacy, WHS, corporations, environmental planning, employment). Clause-pattern names should sound like real precedent taxonomy. Keep the graph data a strict subset of the feed data so numbers agree.
