# Build prompt — CounselMatch (site folder: `counselmatch/`)

**Play:** `C:\Claude\idea-prompts\second-order\07-talent-marketplace.md` — Paraform for lawyers: firms post roles, vetted recruiters compete; the trust graph is the moat.
**Accent colour:** violet `#7c3aed` (dark theme: `#a78bfa`).
**Tagline:** "Roles meet the recruiters who actually deliver."
**Perspective switcher** (segmented control): **Firm view** ↔ **Recruiter view**.

## Firm view — tabs

### 1. My roles (default)
Roles the firm has posted (~10): title (e.g. "Senior Associate — Projects & Energy"), practice area, PQE band, location, salary band, recruiters engaged, candidates in pipeline, days open, status. Filters: practice area, status. Sortable. Row click → role detail: pipeline stages as a horizontal stage bar (Sourced → Screened → Interviewing → Offer → Placed) with candidate counts, and the engaged recruiters ranked by their niche hit-rate with a "trust graph" explainer tooltip.

### 2. Recruiter market
The trust-graph screen: recruiter directory (~18 recruiters): name, boutique, niches, placements (12 mo), hit-rate % (placements/briefs taken), median days-to-fill, rating. Filters: niche, min hit-rate slider or dropdown. Sortable. Scatter chart (SVG): hit-rate (y) vs median days-to-fill (x), dot size = placements, hover tooltip names the recruiter — the visual argument that performance data separates the market.

### 3. Post a role
Working form (practice area, PQE, location, salary band, fee %, exclusivity toggle) → on submit shows "matched recruiters" ranked by niche fit + hit-rate, each with an invite button (toast on click), then the role appears in My roles.

## Recruiter view — tabs

### 1. Brief board
Open roles across firms (~15): firm (anonymised as "Top-tier — Sydney" style until claimed), practice area, PQE, fee %, competing recruiters count, posted date. Filters + sort. "Claim brief" button (max 3 active — enforce it with a friendly limit message) → moves to My briefs with a candidate-submission mock form.

### 2. My performance
The recruiter's own trust-graph stats: hit-rate by niche (bar), placements timeline (line), where they rank per niche (percentile badges), fees earned YTD tile.

### Shared last tab: About this play

## Data notes
PQE bands, AUD salary bands ($120k–$400k), fee % 18–25. Recruiter stats must be consistent between the scatter, directory and recruiter view.
