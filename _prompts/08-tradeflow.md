# Build prompt — TradeFlow (site folder: `tradeflow/`)

**Play:** `C:\Claude\idea-prompts\second-order\08-tradie-job-marketplace.md` — PM maintenance triage as a job-origination machine; the tradie marketplace is the business.
**Accent colour:** amber `#d97706` (dark theme: `#fbbf24`).
**Tagline:** "Every triaged request is a job. Every job is the market."
**Perspective switcher** (segmented control): **Property manager view** ↔ **Tradie view**.

## PM view — tabs (demo agency manages ~300 properties, inner-west Sydney)

### 1. Triage inbox (default)
The wedge screen: incoming tenant requests (~25) shown as cards or table: property address, tenant message excerpt (realistic: "hot water's been out since Tuesday…"), AI triage result — trade (Plumbing/Electrical/Locks/Appliances/General), urgency badge, scoped job title, owner approval cap ($ amount), status (New / Scoped / Routed / Scheduled / Done). Filters: trade, urgency, status. Row click → detail: full tenant message, the AI scope ("Replace failed hot water unit anode or unit; approved to $400; tenant available Thu/Fri"), and a **"Route to network"** button → shows 3 matched tradies (rating, distance, typical price for this job type, next available) with a "Book" button → status flips to Scheduled with a toast. This flow must actually work end-to-end.

### 2. Portfolio
Charts: jobs per month by trade (stacked bar, 12 months), avg time-to-fix trend (line), spend by trade (donut). KPI tiles: jobs this month, % auto-routed, median time-to-scheduled, spend MTD.

### 3. Price book
The unique-knowledge screen: cost benchmarks table (~30 rows): job type × suburb, median cost, range (p25–p75 as a small inline bar), jobs sample size, trend arrow. Filters: trade, suburb. SVG heatmap above: trade (rows) × suburb (cols), shade = median cost; hover tooltip; click a cell to filter the table. Callout: "Priced from N real portfolio jobs — hipages sells leads; these are completed-job prices."

## Tradie view — tabs (demo user: a plumber, "inner-west Sydney")

### 1. Job feed
Scoped, pre-approved jobs (~15): job, suburb, approval cap, portfolio (agency name), when, "Accept" button (toast + moves to My schedule list below). Filters: trade (locked to Plumbing with a note), suburb, min job value. Banner: "These are jobs, not leads — scoped and owner-approved before you see them."

### 2. My flow
The subscription-value screen: recurring-flow stats — jobs from portfolios vs one-off (stacked bar by month), revenue through platform (line), repeat-portfolio ratio tile, and a simple ROI card: "Your subscription: $199/mo. Portfolio jobs booked last month: $8,400." 

### Shared last tab: About this play

## Data notes
Inner-west Sydney suburbs (Marrickville, Newtown, Ashfield, Leichhardt, Dulwich Hill, Summer Hill…). Prices realistic AUD. PM-view job counts must reconcile with Portfolio charts and Price book sample sizes.
