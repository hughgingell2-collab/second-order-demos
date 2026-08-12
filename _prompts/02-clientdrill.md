# Build prompt — ClientDrill (site folder: `clientdrill/`)

**Play:** `C:\Claude\idea-prompts\second-order\02-training-as-marketing.md` — white-label crisis drills as the law firm's BD channel.
**Accent colour:** crimson `#dc2626` (dark theme: `#f87171`).
**Tagline:** "Your clients drill. You get the call."
**Perspective:** the demo user is a BD director at fictitious firm "Harwood Kelly" — everything is firm-side.

## Screens (tabs)

### 1. Campaigns (default)
Cards/table of drill campaigns the firm has sent to clients (~15): campaign name, scenario type (EPA raid / WHS incident / Cyber breach / ASIC investigation / Insolvency), client company, invitees, completion %, avg score, weakest step, status (Draft/Live/Closed). Dropdown filters: scenario type, status. Sortable. Row click → detail panel: per-invitee completion, step-by-step failure rates (mini horizontal bar chart), and the generated BD signal ("6 of 9 failed the legal-privilege step → suggested partner call re privilege protocols").

### 2. Drill Builder
Interactive form: scenario dropdown, industry dropdown, difficulty, branding preview panel that live-updates (firm name/colour on a mock drill intro card), client picker, toggle options (leaderboard, CPD points, debrief call CTA). A "Preview drill" button opens a working 3-step mini drill player in a modal: an EPA-raid scenario where each step presents a situation + 3 response options, gives instant right/wrong feedback with a one-line legal rationale, and ends with a score screen. This player must actually work — it is the heart of the demo.

### 3. Signals
The unique-knowledge screen: an inbox of BD signals derived from drill results (~20 rows): client, signal ("Failed privilege step", "Asked about dawn-raid protocol", "GC completed drill twice"), inferred concern, suggested action, priority badge, owner. Filters: priority, client. A "risk heatmap" SVG above the table: clients (rows) × risk areas (columns: Environmental, WHS, Cyber, Regulatory, Insolvency), cell shade = drill engagement intensity; hovering a cell shows the tooltip; clicking filters the signal table below.

### 4. About this play

## Data notes
~10 fictitious client companies (manufacturers, miners, developers, tech). Engagement numbers must reconcile between Campaigns and the heatmap.
