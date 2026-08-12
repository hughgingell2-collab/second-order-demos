# Second-Order Demos — Shared Build Spec

Every site in this repo is a **static, self-contained, single-folder demo** of one second-order play from `C:\Claude\idea-prompts\second-order\`. These are product mockups with fictitious data, deployed together on GitHub Pages under one hub.

## Hard rules (stack)

- Plain HTML + CSS + vanilla JS. **No frameworks, no build step, no CDN links, no external fonts, no network requests of any kind.** Everything works offline from `file://` and from a subdirectory path (all asset links relative: `styles.css`, not `/styles.css`).
- File structure per site folder: `index.html`, `styles.css`, `app.js`, `data.js` (all mock data lives in `data.js` as plain JS objects/arrays — no fetch/JSON files).
- All JS must pass `node --check app.js` and `node --check data.js`.
- No console errors or warnings on load or during any interaction.

## Design tokens (every site uses these)

- Font: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Base 16px, line-height 1.5. Numbers in tables: `font-variant-numeric: tabular-nums`.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px. Border radius: 8px cards, 6px controls. Max content width 1200px, centred.
- Light + dark theme. Implement with CSS custom properties on `:root` / `[data-theme="dark"]`, default from `prefers-color-scheme`, plus a visible toggle button in the header (persist choice in `localStorage`).
- Light: background `#fafafa`, surface `#ffffff`, text `#1a1a2e`, muted text `#6b7280`, border `#e5e7eb`.
- Dark: background `#111318`, surface `#1b1e26`, text `#e8eaf0`, muted `#9aa1ad`, border `#2a2f3a`.
- Each site has its own accent colour (given in its build prompt) used for the header mark, active tab, primary buttons, and chart highlights. Ensure WCAG AA contrast on text and controls in both themes.

## Required page anatomy

1. **Header bar**: product wordmark (text logo, accent colour), nav tabs for the site's screens, theme toggle. Sticky.
2. **Main screens as tabs** (client-side, no page reloads; the active tab persists via `location.hash` so refresh keeps your place). 2–4 screens per site, defined in the site's build prompt.
3. **"About this play" screen** (last tab): 3–4 short paragraphs summarising the second-order thesis from the source doc — first-order wedge, what it accrues, the two parties it connects, endgame. Written in plain English for a reader who hasn't seen the doc.
4. **Footer**: "Demo — all data is fictitious. Part of the second-order plays series." plus a link `../index.html` labelled "← All demos".

## Required interaction patterns

- **Dropdown filters** (`<select>`) wherever a list/table can be sliced (jurisdiction, practice area, trade, suburb, etc.). Filters combine (AND) and a "Reset filters" link appears when any filter is active.
- **Sortable tables**: click a column header to sort, click again to reverse; show ▲/▼ on the active column. Headers are `<button>`s inside `<th>` for keyboard access.
- **Search box** on any table with more than ~15 rows (simple substring match).
- **Charts: hand-rolled inline SVG** — bar, line, donut, or heatmap as specified per site. Before writing any chart code, load the `dataviz` skill (Skill tool) and follow it for colour, axis, and legend decisions. Charts must re-render on theme change and use `currentColor`/CSS variables so they respect the theme. Every chart needs a visible title and, where non-obvious, an axis label. Tooltips on hover (a positioned div, not `<title>` only).
- **Detail panels**: clicking a table row opens a slide-over or expandable detail (no `alert()` anywhere).
- Empty states: if filters produce zero rows, show a friendly "No results — reset filters" message, never a blank table.

## Mock data rules

- Realistic Australian flavour: real jurisdictions (Cth/NSW/VIC/QLD…), plausible fictitious firm/company/person names (never real firms or people), suburbs, ABNs-shaped numbers, dollar figures in AUD. Dates cluster around July–August 2026.
- Enough volume to make sorting/filtering meaningful: 20–60 rows for main tables, not 5.
- Data must be internally consistent (totals in charts match table sums where a reader could check).

## Accessibility & polish

- Keyboard operable: tabs, sorts, dropdowns, detail panels (Escape closes). Visible focus rings.
- `aria-selected` on tabs, `aria-sort` on sorted columns, `role="dialog"` + focus trap on slide-overs.
- Responsive to 375px: tables get horizontal scroll in a wrapper (page body never scrolls sideways), header collapses gracefully, tap targets ≥ 40px.
- No layout shift on tab switch; transitions ≤ 200ms; respect `prefers-reduced-motion`.

## Self-QA checklist before finishing (do all of these)

1. `node --check` on every JS file.
2. Walk every tab, every dropdown option, every sortable column, both themes — confirm no dead controls, no unstyled states.
3. Verify chart totals match the underlying `data.js` numbers.
4. Verify at 375px width (mentally trace the CSS: what wraps, what scrolls).
5. Verify no absolute paths, no external URLs anywhere in the code (`grep -n "http" *.html *.js *.css` should only hit code comments or the footer link to the repo hub if any).
