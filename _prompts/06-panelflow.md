# Build prompt — PanelFlow (site folder: `panelflow/`)

**Play:** `C:\Claude\idea-prompts\second-order\06-panel-allocation-marketplace.md` — government panel dashboards as the trojan horse for an allocation marketplace.
**Accent colour:** teal `#0d9488` (dark theme: `#2dd4bf`).
**Tagline:** "Reporting is the excuse. Allocation is the market."
**Perspective switcher** (segmented control in header): **Agency view** ↔ **Firm view**.

## Agency view — tabs (demo agency: "NSW Dept of Planning & Infrastructure" — fictitious)

### 1. Spend dashboard (default)
KPI tiles (FY26 spend, matters allocated, avg days to allocate, panel utilisation). Charts: spend by panel firm (horizontal bar, 9 firms), spend by matter type (donut), monthly spend trend (line, 12 months). Filters above charts: FY dropdown, matter type dropdown — charts re-render on change.

### 2. Allocate a matter
The market-making screen — must actually work. Form: matter type dropdown (Property/Planning / Commercial / Employment / Litigation / Construction), complexity, estimated value band, required-by date, conflict-check firm exclusion multi-pick. Submit → ranked recommendation cards for panel firms, each with a composite score bar and a visible rationale breakdown (past performance in this matter type, current capacity, blended rate vs benchmark, conflict status) plus "Allocate" button → confirmation toast and the matter appears in a "Recent allocations" table below.

### 3. Benchmarks
The unique-knowledge screen: cross-agency rate benchmarks. Table (~25 rows): matter type × seniority, this-agency blended rate, cross-agency median, delta % (coloured badge), sample size. Filters: matter type, seniority. Above it: SVG dot-plot or bar comparison of this agency vs cross-agency median by matter type. Callout box: "Benchmarks built from allocation flow across N agencies — data nobody else holds."

## Firm view — tabs (demo firm: one of the panel firms)

### 1. Performance
Why-you-win/lose analytics: win rate by matter type (bar), your rate vs winning rate where you lost (table with delta badges), responsiveness metrics, allocation share trend (line vs panel average). One "insight card" per chart in plain English ("You lose Construction matters on rate, not performance — median winning rate is 8% below yours").

### Shared last tab (both views): About this play

## Data notes
9 fictitious panel firms, consistent across both views (the firm view is one of the 9, and its numbers must match the agency view's charts). Rates in AUD/hr, blended $350–$720.
