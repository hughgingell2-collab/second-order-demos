# Second-Order Plays — Demo Series

Six interactive product mockups, one per second-order play from the idea vault (plays 01–08; plays 03–05 roll up into one). Each demo shows the *endgame* product its first-order wedge is designed toward. All data is fictitious.

**Live hub:** https://hughgingell2-collab.github.io/second-order-demos/

| # | Demo | Play | Lens |
|---|---|---|---|
| 01 | [StatuteGraph](statutegraph/) | Legislation-to-document data layer | Data layer |
| 02 | [ClientDrill](clientdrill/) | Training as the firm's marketing channel | Marketing for X |
| 03–05 | [BriefExchange](briefexchange/) | The legal work exchange | Market-making |
| 06 | [PanelFlow](panelflow/) | Panel allocation marketplace | Market-making |
| 07 | [CounselMatch](counselmatch/) | Non-technical talent marketplace | Market-making |
| 08 | [TradeFlow](tradeflow/) | Maintenance-to-tradie matching layer | Market-making |

## Stack

Plain HTML/CSS/vanilla JS per site — no frameworks, no build step, no external requests. Each site is a self-contained folder (`index.html`, `styles.css`, `app.js`, `data.js`). Shared design language defined in [SPEC.md](SPEC.md); per-site build prompts in [`_prompts/`](_prompts/).

Source strategy docs: private `idea-prompts` repo, `second-order/` folder.
