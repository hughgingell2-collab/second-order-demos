# Build prompt — BriefExchange (site folder: `briefexchange/`)

**Play:** `C:\Claude\idea-prompts\second-order\03-05-legal-bd-exchange.md` — the Legal BD OS (find/win/stay-visible) whose exhaust becomes a legal work exchange.
**Accent colour:** blue `#2563eb` (dark theme: `#60a5fa`).
**Tagline:** "One funnel. Then the market."
**Key mechanic:** a prominent view switcher in the header (segmented control, not a tab): **Firm view** ↔ **Client (GC) view**. Tabs change per view.

## Firm view — tabs

### 1. Signals (default)
The origination feed (~35 rows): signal source (ASX announcement / Federal Court filing / NSW planning portal / AUSTRAC media release / tender portal), company, signal summary ("Announced acquisition of QLD battery portfolio"), inferred legal need (M&A / Planning / Litigation / Regulatory), match score vs firm credentials (0–100 bar), date. Filters: source, practice area. Sortable. Row click → detail: why it matched (3 credential citations from the firm's credentials library), suggested partner, two buttons: "Draft pursuit" (opens a mock generated tender-response outline using those credentials) and "Draft follow-up article" (opens a mock thought-leadership outline — the marketing module). These two panels show the three tools as one funnel.

### 2. Pipeline
Funnel chart (SVG): Signals → Qualified → Pursuits drafted → Submitted → Won, with counts and conversion %. Below: pursuits table (~15 rows: opportunity, client, stage, value estimate, owner) with a stage dropdown filter. A line chart: signals per week by source (8 weeks, one line per source, legend).

### 3. Exchange
The endgame screen: a brief board where GCs have posted work (~12 briefs: title, company, practice area, value band, responses count, closes date, status). The firm sees match scores and can open a brief → detail with scope summary and "Respond via pursuits engine" button (shows the pre-filled response draft). Banner across the top: "The exchange is where the OS is headed — supply side already on-platform."

## Client (GC) view — tabs

### 1. Post a brief
Working form: matter type dropdown, value band, jurisdiction, description, panel-only toggle → on submit, the brief appears at the top of "My briefs" below (client-side only), with a toast confirmation.

### 2. Responses
For one sample posted brief: 4 firm responses ranked by match score, each expandable to show the firm's credential citations and fee estimate; a comparison table of the 4 (fees, team seniority, relevant matters count).

### Shared last tab (both views): About this play

## Data notes
One fictitious mid-size firm perspective ("Calder Reeve"). Credential library entries should read like real matter descriptions. Signal → pursuit → exchange numbers must be one coherent funnel.
