/* BriefExchange — application logic. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var TODAY = '2026-08-13';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------------------------------------------------------------- helpers */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    var p = String(iso).split('-');
    if (p.length !== 3) { return String(iso); }
    return String(Number(p[2])) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }
  function fmtDateShort(iso) {
    var p = String(iso).split('-');
    return String(Number(p[2])) + ' ' + MONTHS[Number(p[1]) - 1];
  }
  function days(iso) { return Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000); }

  function fmtMoney(n) {
    return '$' + Math.round(n).toLocaleString('en-AU');
  }
  function fmtCompact(n) {
    if (n >= 1000000) { return '$' + (n / 1000000).toFixed(n >= 10000000 ? 1 : 2) + 'm'; }
    if (n >= 1000) { return '$' + Math.round(n / 1000) + 'k'; }
    return '$' + n;
  }
  function pct(a, b) { return b === 0 ? '0%' : Math.round((a / b) * 100) + '%'; }

  function fill(select, values, allLabel) {
    var html = allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '';
    values.forEach(function (v) { html += '<option value="' + esc(v) + '">' + esc(v) + '</option>'; });
    select.innerHTML = html;
  }

  /* ---------------------------------------------------------------- theme */

  var themeToggle = $('#theme-toggle');
  var themeLabel = $('#theme-label');
  var themeListeners = [];

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var dark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeToggle.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    themeLabel.textContent = dark ? 'Light' : 'Dark';
    themeListeners.forEach(function (fn) { fn(); });
  }

  function initTheme() {
    var stored = null;
    try { stored = window.localStorage.getItem('bx-theme'); } catch (e) { stored = null; }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light'));
    themeToggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { window.localStorage.setItem('bx-theme', next); } catch (e) { /* storage unavailable */ }
    });
  }

  /* ---------------------------------------------------------------- tooltip */

  var tooltipEl = $('#tooltip');

  function showTooltip(html, x, y) {
    tooltipEl.innerHTML = html;
    tooltipEl.hidden = false;
    var r = tooltipEl.getBoundingClientRect();
    var left = x + 14;
    var top = y - r.height - 12;
    if (left + r.width > window.innerWidth - 8) { left = x - r.width - 14; }
    if (left < 8) { left = 8; }
    if (top < 8) { top = y + 18; }
    tooltipEl.style.left = Math.round(left) + 'px';
    tooltipEl.style.top = Math.round(top) + 'px';
  }
  function hideTooltip() { tooltipEl.hidden = true; }

  /* ---------------------------------------------------------------- toasts */

  var toastStack = $('#toast-stack');
  function toast(title, body) {
    var node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = '<strong>' + esc(title) + '</strong><span>' + esc(body) + '</span>';
    toastStack.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) { node.parentNode.removeChild(node); }
    }, 5200);
  }

  /* ---------------------------------------------------------------- derived data */

  var qualifiedSignals = SIGNALS.filter(function (s) { return s.score >= QUALIFY_THRESHOLD; });
  var submittedPursuits = PURSUITS.filter(function (p) {
    return p.stage === 'Submitted' || p.stage === 'Won' || p.stage === 'Lost';
  });
  var wonPursuits = PURSUITS.filter(function (p) { return p.stage === 'Won'; });

  var FUNNEL = [
    { label: 'Signals', count: SIGNALS.length, note: 'matched to the credentials library' },
    { label: 'Qualified', count: qualifiedSignals.length, note: 'match score 70 or above' },
    { label: 'Pursuits drafted', count: PURSUITS.length, note: 'drafted by the pursuits engine' },
    { label: 'Submitted', count: submittedPursuits.length, note: 'lodged with the client' },
    { label: 'Won', count: wonPursuits.length, note: 'instructed' }
  ];

  var credById = {};
  CREDENTIALS.forEach(function (c) { credById[c.id] = c; });

  var weeklyGrid = (function () {
    var starts = WEEK_STARTS.map(days);
    var grid = {};
    SOURCES.forEach(function (s) { grid[s] = WEEK_STARTS.map(function () { return 0; }); });
    SIGNALS.forEach(function (s) {
      var d = days(s.date), idx = -1;
      for (var k = starts.length - 1; k >= 0; k--) { if (d >= starts[k]) { idx = k; break; } }
      if (idx >= 0 && grid[s.source]) { grid[s.source][idx] += 1; }
    });
    return grid;
  })();

  var myBriefs = MY_BRIEFS.slice();
  var nextBriefNumber = 2050;

  /* ---------------------------------------------------------------- slide-over */

  var overlay = $('#overlay');
  var slideover = $('#slideover');
  var slideBody = $('#slideover-body');
  var slideTitle = $('#slideover-title');
  var slideEyebrow = $('#slideover-eyebrow');
  var lastFocused = null;
  var slideOpen = false;

  function focusables() {
    return $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', slideover)
      .filter(function (n) { return !n.disabled && !n.hidden; });
  }

  function openSlide(eyebrow, title, html) {
    if (!slideOpen) { lastFocused = document.activeElement; }
    slideEyebrow.textContent = eyebrow;
    slideTitle.textContent = title;
    slideBody.innerHTML = html;
    slideBody.scrollTop = 0;
    overlay.hidden = false;
    slideover.hidden = false;
    slideOpen = true;
    var f = focusables();
    if (f.length) { f[0].focus(); }
  }

  function updateSlide(eyebrow, title, html) {
    slideEyebrow.textContent = eyebrow;
    slideTitle.textContent = title;
    slideBody.innerHTML = html;
    slideBody.scrollTop = 0;
    var f = focusables();
    if (f.length) { f[0].focus(); }
  }

  function closeSlide() {
    if (!slideOpen) { return; }
    overlay.hidden = true;
    slideover.hidden = true;
    slideBody.innerHTML = '';
    slideOpen = false;
    if (lastFocused && document.contains(lastFocused)) { lastFocused.focus(); }
    lastFocused = null;
  }

  overlay.addEventListener('click', closeSlide);
  $('#slideover-close').addEventListener('click', closeSlide);

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && slideOpen) { ev.preventDefault(); closeSlide(); return; }
    if (ev.key !== 'Tab' || !slideOpen) { return; }
    var f = focusables();
    if (!f.length) { return; }
    var first = f[0], last = f[f.length - 1];
    var inside = slideover.contains(document.activeElement);
    if (!inside) {
      ev.preventDefault();
      (ev.shiftKey ? last : first).focus();
    } else if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault(); last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault(); first.focus();
    }
  });

  /* ---------------------------------------------------------------- sortable table */

  function Table(tableEl, config) {
    this.table = tableEl;
    this.tbody = $('tbody', tableEl);
    this.tfoot = $('tfoot', tableEl);
    this.config = config;
    this.sortKey = config.sortKey || null;
    this.sortDir = config.sortDir || 'asc';
    this.rows = [];
    var self = this;

    $$('thead th', tableEl).forEach(function (th) {
      var key = th.getAttribute('data-key');
      var btn = $('button', th);
      if (!key || !btn) { return; }
      btn.addEventListener('click', function () {
        if (self.sortKey === key) {
          self.sortDir = self.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          self.sortKey = key;
          self.sortDir = (config.numericKeys || []).indexOf(key) >= 0 ? 'desc' : 'asc';
        }
        self.render();
      });
    });

    if (config.onRowClick) {
      this.tbody.addEventListener('click', function (ev) {
        var tr = ev.target.closest ? ev.target.closest('tr') : null;
        if (!tr || !self.tbody.contains(tr)) { return; }
        var i = Number(tr.getAttribute('data-i'));
        if (self.rows[i]) { config.onRowClick(self.rows[i]); }
      });
    }
  }

  Table.prototype.setData = function (rows) { this.rows = rows; };

  Table.prototype.sorted = function () {
    var key = this.sortKey, dir = this.sortDir === 'desc' ? -1 : 1;
    var cols = this.config.columns, col = null;
    cols.forEach(function (c) { if (c.key === key) { col = c; } });
    if (!key || !col) { return this.rows.slice(); }
    var val = col.sortValue || function (r) { return r[key]; };
    return this.rows.slice().sort(function (a, b) {
      var x = val(a), y = val(b);
      if (typeof x === 'number' && typeof y === 'number') { return (x - y) * dir; }
      return String(x).localeCompare(String(y), 'en-AU') * dir;
    });
  };

  Table.prototype.render = function () {
    var self = this;
    var rows = this.sorted();
    this.rows = rows;

    $$('thead th', this.table).forEach(function (th) {
      var key = th.getAttribute('data-key');
      var btn = $('button', th);
      if (!key || !btn) { return; }
      var label = btn.getAttribute('data-label');
      if (!label) { label = btn.textContent.replace(/[▲▼]\s*$/, '').trim(); btn.setAttribute('data-label', label); }
      if (key === self.sortKey) {
        th.setAttribute('aria-sort', self.sortDir === 'asc' ? 'ascending' : 'descending');
        btn.innerHTML = esc(label) + ' <span class="sort-arrow" aria-hidden="true">' + (self.sortDir === 'asc' ? '▲' : '▼') + '</span>';
      } else {
        th.removeAttribute('aria-sort');
        btn.textContent = label;
      }
    });

    var html = '';
    rows.forEach(function (r, i) {
      html += '<tr data-i="' + i + '"' + (self.config.onRowClick ? ' class="clickable"' : '') + '>';
      self.config.columns.forEach(function (c) {
        var cls = c.className ? ' class="' + c.className + '"' : '';
        html += '<td' + cls + '>' + c.render(r) + '</td>';
      });
      html += '</tr>';
    });
    this.tbody.innerHTML = html;

    if (this.tfoot && this.config.foot) {
      this.tfoot.innerHTML = rows.length ? this.config.foot(rows) : '';
    }

    var wrap = this.table.parentNode;
    var empty = wrap ? $('.empty-state', wrap) : null;
    if (empty) {
      empty.hidden = rows.length > 0;
      this.table.hidden = rows.length === 0;
    }
  };

  function linkCell(text, sub) {
    return '<button type="button" class="row-btn">' + esc(text) + '</button>' +
      (sub ? '<span class="cell-sub">' + esc(sub) + '</span>' : '');
  }

  /* One hue for the fill, a lighter step of the same ramp for the track; the value
     is direct-labelled beside it so the bar never carries the number alone. */
  function meterCell(score) {
    return '<span class="meter"><span class="meter-track">' +
      '<span class="meter-fill" style="width:' + score + '%"></span></span>' +
      '<span class="meter-value">' + score + '</span></span>';
  }

  /* ---------------------------------------------------------------- match reasoning */

  function credTags(cred, ctx) {
    var tags = [];
    if (cred.practice === ctx.need) { tags.push({ t: 'Practice match · ' + cred.practice, ok: true }); }
    if (cred.jurisdiction === ctx.jurisdiction) { tags.push({ t: 'Jurisdiction match · ' + cred.jurisdiction, ok: true }); }
    if (cred.sector === ctx.sector) { tags.push({ t: 'Sector match · ' + cred.sector, ok: true }); }
    if (cred.partner === ctx.partner) { tags.push({ t: 'Same partner · ' + cred.partner, ok: true }); }
    if (!tags.length) { tags.push({ t: 'Adjacent experience · ' + cred.practice + ', ' + cred.jurisdiction, ok: false }); }
    tags.push({ t: cred.year + ' · ' + cred.sector, ok: false });
    return tags;
  }

  function credListHtml(creds, ctx) {
    var html = '<ul class="cred-list">';
    creds.forEach(function (c) {
      html += '<li class="cred"><span class="cred-id">' + esc(c.id) + ' · ' + esc(c.partner) + '</span>' +
        '<span class="cred-title">' + esc(c.title) + '</span><span class="cred-tags">';
      credTags(c, ctx).forEach(function (t) {
        html += '<span class="badge' + (t.ok ? ' ok' : '') + '">' + esc(t.t) + '</span>';
      });
      html += '</span></li>';
    });
    return html + '</ul>';
  }

  var SENIORS = [
    'Nadia Brekhus, Senior Associate',
    'Owen Marchetti, Senior Associate',
    'Freya Lindqvist, Senior Associate',
    'Sam Okonkwo, Senior Associate'
  ];

  function seedOf(id) {
    var n = 0, s = String(id);
    for (var i = 0; i < s.length; i++) { n = (n * 31 + s.charCodeAt(i)) % 9973; }
    return n;
  }

  var FEE_BASE = { 'M&A': 240000, 'Planning': 180000, 'Litigation': 320000, 'Regulatory': 210000 };

  function feeEstimate(ctx) {
    var base = FEE_BASE[ctx.need] || 200000;
    var v = base + (ctx.score - 60) * 1800;
    return Math.round(v / 5000) * 5000;
  }

  function docBlock(heading, items, note) {
    var html = '<div class="doc-block"><h4>' + esc(heading) + '</h4><ul>';
    items.forEach(function (i) { html += '<li>' + i + '</li>'; });
    html += '</ul>';
    if (note) { html += '<p class="doc-note">' + esc(note) + '</p>'; }
    return html + '</div>';
  }

  function pursuitDoc(ctx) {
    var seed = seedOf(ctx.id);
    var others = [];
    ctx.creds.forEach(function (c) {
      if (c.partner !== ctx.partner && others.indexOf(c.partner) < 0) { others.push(c.partner); }
    });
    var fee = feeEstimate(ctx);
    var html = '<div class="doc">';
    html += '<span class="doc-kicker">Generated draft · pursuits engine</span>';
    html += '<h4>' + esc(FIRM.name) + ' — response to ' + esc(ctx.company) + '</h4>';

    html += docBlock('1. Executive summary', [
      esc(FIRM.name) + ' proposes to act for <strong>' + esc(ctx.company) + '</strong> on ' + esc(ctx.headline) +
      '. The team below has run ' + ctx.creds.length + ' directly comparable matters in ' + esc(ctx.need) +
      ', including ' + ctx.creds.filter(function (c) { return c.jurisdiction === ctx.jurisdiction; }).length +
      ' in ' + esc(ctx.jurisdiction) + '.',
      'Match score against our credentials library: <strong>' + ctx.score + '/100</strong>. ' +
      (ctx.score >= QUALIFY_THRESHOLD ? 'Above the pursuit threshold — recommended.' : 'Below the pursuit threshold — relationship value only.')
    ]);

    html += docBlock('2. Understanding of the mandate', [
      esc(ctx.detail),
      'Jurisdiction: <strong>' + esc(ctx.jurisdiction) + '</strong>. Practice: <strong>' + esc(ctx.need) + '</strong>.',
      'Critical path assumption: instructions confirmed within 10 business days of ' + esc(fmtDate(ctx.date)) + '.',
      'Conflicts: a preliminary search returns no adverse party on the current client list.'
    ]);

    var credItems = ctx.creds.map(function (c) {
      return '<strong>' + esc(c.id) + '</strong> — ' + esc(c.title) + ' <em>(' + esc(c.partner) + ', ' + c.year + ')</em>';
    });
    html += docBlock('3. Directly relevant experience', credItems,
      'Pulled automatically from the credentials library; each entry is already client-cleared for use in proposals.');

    var team = ['<strong>' + esc(ctx.partner) + '</strong> — lead partner, ' + esc(ctx.need)];
    others.slice(0, 2).forEach(function (p) { team.push(esc(p) + ' — supporting partner'); });
    team.push(esc(SENIORS[seed % SENIORS.length]) + ' — day-to-day contact');
    html += docBlock('4. Proposed team', team);

    html += docBlock('5. Fee approach', [
      'Indicative total: <strong>' + esc(fmtMoney(fee)) + '</strong> (excl. GST and disbursements).',
      'Structure: fixed fee by phase, with a 10% variation allowance and monthly reporting against phase budget.',
      'Rate card discount of 8% applied on the assumption of a three-year relationship.'
    ]);

    html += docBlock('6. Value adds', [
      'Fortnightly written update to the board or general counsel, no charge.',
      'Secondee available at 0.4 FTE for the first quarter.',
      'Access to the ' + esc(ctx.sector) + ' regulatory tracker maintained by the firm.'
    ]);

    html += '</div>';
    return html;
  }

  function articleDoc(ctx) {
    var seed = seedOf(ctx.id);
    var reach = 820 + (seed % 640);
    var html = '<div class="doc">';
    html += '<span class="doc-kicker">Generated outline · marketing engine</span>';
    html += '<h4>' + esc(ctx.need) + ' watch: what ' + esc(ctx.company) + '’s move means for ' + esc(String(ctx.sector).toLowerCase()) + ' boards</h4>';

    html += docBlock('Angle', [
      'The signal (' + esc(ctx.headline) + ') is the third of its kind in the ' + esc(String(ctx.sector).toLowerCase()) +
      ' sector this quarter. The article reads the pattern, not the single event.',
      'Written for in-house readers who will face the same question in the next 6–12 months, not for other lawyers.'
    ]);

    html += docBlock('Proposed structure', [
      '1. What actually happened, in four sentences.',
      '2. Why ' + esc(ctx.jurisdiction) + ' makes this harder than it looks — the ' + esc(ctx.need).toLowerCase() + ' angle.',
      '3. Three questions a board should ask before it is in the same position.',
      '4. What we would do differently, drawing on ' + esc(ctx.creds[0].id) + ' without naming the client.'
    ]);

    html += docBlock('Distribution', [
      'Firm LinkedIn plus ' + esc(ctx.partner) + '’s profile — estimated reach ' + reach.toLocaleString('en-AU') + '.',
      'Client alert to the ' + esc(String(ctx.sector).toLowerCase()) + ' list (1,240 in-house subscribers).',
      'Syndication to the BriefExchange in-house counsel network — the same audience that becomes the demand side of the exchange.'
    ], 'Publish within five business days of ' + fmtDate(ctx.date) + ' while the signal is still live.');

    html += docBlock('Call to action', [
      'Offer a 30-minute briefing on ' + esc(ctx.need).toLowerCase() + ' readiness. Leads route straight back into the origination feed as warm signals.'
    ]);

    html += '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- signals tab */

  var signalCtx = null;

  function signalToCtx(s) {
    return {
      id: s.id, company: s.company, need: s.need, jurisdiction: s.jurisdiction, sector: s.sector,
      score: s.score, partner: s.partner, date: s.date, detail: s.detail,
      headline: s.summary.charAt(0).toLowerCase() + s.summary.slice(1),
      creds: s.creds.map(function (id) { return credById[id]; })
    };
  }

  function signalDetailHtml(s) {
    var ctx = signalToCtx(s);
    var qualified = s.score >= QUALIFY_THRESHOLD;
    var pursuit = s.pursuit ? PURSUITS.filter(function (p) { return p.id === s.pursuit; })[0] : null;

    var html = '<div class="so-section so-meta">';
    html += '<div><span class="k">Source</span><span class="v">' + esc(s.source) + '</span></div>';
    html += '<div><span class="k">Detected</span><span class="v">' + esc(fmtDate(s.date)) + '</span></div>';
    html += '<div><span class="k">Jurisdiction</span><span class="v">' + esc(s.jurisdiction) + '</span></div>';
    html += '<div><span class="k">Inferred need</span><span class="v">' + esc(s.need) + '</span></div>';
    html += '</div>';

    html += '<div class="so-section"><h3>Signal</h3><p class="so-text"><strong>' + esc(s.summary) + '.</strong> ' + esc(s.detail) + '</p></div>';

    html += '<div class="so-section"><h3>Why it matched</h3>';
    html += '<p class="so-text">Match score <strong>' + s.score + '/100</strong> — ' +
      (qualified ? 'above' : 'below') + ' the ' + QUALIFY_THRESHOLD + '-point pursuit threshold. ' +
      'Scored on three cited credentials from the firm’s library:</p>';
    html += credListHtml(ctx.creds, ctx);
    html += '</div>';

    html += '<div class="so-section"><h3>Suggested partner</h3><p class="so-text"><strong>' + esc(s.partner) +
      '</strong> — named on ' + ctx.creds.filter(function (c) { return c.partner === s.partner; }).length +
      ' of the three cited matters and the firm’s most active ' + esc(s.need) + ' partner in ' + esc(s.jurisdiction) + '.' +
      (pursuit ? ' A pursuit is already open: <strong>' + esc(pursuit.id) + ' — ' + esc(pursuit.opportunity) + '</strong> (' + esc(pursuit.stage) + ').' : '') +
      '</p></div>';

    html += '<div class="so-section so-actions">' +
      '<button type="button" class="btn btn-primary" data-doc="pursuit">Draft pursuit</button>' +
      '<button type="button" class="btn" data-doc="article">Draft follow-up article</button>' +
      '</div>';

    return html;
  }

  function openSignal(s) {
    signalCtx = s;
    openSlide(s.source + ' · ' + fmtDate(s.date), s.company, signalDetailHtml(s));
  }

  slideBody.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-doc]') : null;
    if (t && signalCtx) {
      var kind = t.getAttribute('data-doc');
      if (kind === 'back') { openSignal(signalCtx); return; }
      var ctx = signalToCtx(signalCtx);
      var body = '<div class="so-section"><button type="button" class="back-link" data-doc="back">← Back to signal</button></div>' +
        (kind === 'pursuit' ? pursuitDoc(ctx) : articleDoc(ctx));
      updateSlide(
        (kind === 'pursuit' ? 'Pursuits engine' : 'Marketing engine') + ' · ' + signalCtx.id,
        signalCtx.company,
        body
      );
      return;
    }
    var respond = ev.target.closest ? ev.target.closest('[data-brief-respond]') : null;
    if (respond) {
      var b = BRIEFS.filter(function (x) { return x.id === respond.getAttribute('data-brief-respond'); })[0];
      if (b) { showBriefResponse(b); }
    }
    var briefBack = ev.target.closest ? ev.target.closest('[data-brief-back]') : null;
    if (briefBack) {
      var b2 = BRIEFS.filter(function (x) { return x.id === briefBack.getAttribute('data-brief-back'); })[0];
      if (b2) { openBrief(b2); }
    }
  });

  var signalTable = new Table($('#tbl-signals'), {
    sortKey: 'score', sortDir: 'desc',
    numericKeys: ['score'],
    columns: [
      { key: 'date', className: 'cell-nowrap', render: function (r) { return esc(fmtDate(r.date)); },
        sortValue: function (r) { return days(r.date); } },
      { key: 'source', render: function (r) { return esc(r.source); } },
      { key: 'company', render: function (r) { return linkCell(r.company, r.jurisdiction + ' · ' + r.sector); } },
      { key: 'summary', className: 'col-wide', render: function (r) { return esc(r.summary); } },
      { key: 'need', render: function (r) { return '<span class="badge">' + esc(r.need) + '</span>'; } },
      { key: 'score', className: 'col-num', render: function (r) { return meterCell(r.score); } }
    ],
    onRowClick: openSignal
  });

  function signalFilters() {
    return {
      source: $('#f-sig-source').value,
      need: $('#f-sig-need').value,
      qual: $('#f-sig-qual').value,
      q: $('#f-sig-q').value.trim().toLowerCase()
    };
  }

  function renderSignals() {
    var f = signalFilters();
    var rows = SIGNALS.filter(function (s) {
      if (f.source && s.source !== f.source) { return false; }
      if (f.need && s.need !== f.need) { return false; }
      if (f.qual === 'yes' && s.score < QUALIFY_THRESHOLD) { return false; }
      if (f.qual === 'no' && s.score >= QUALIFY_THRESHOLD) { return false; }
      if (f.q) {
        var hay = (s.company + ' ' + s.summary + ' ' + s.partner + ' ' + s.need + ' ' + s.sector + ' ' + s.jurisdiction).toLowerCase();
        if (hay.indexOf(f.q) < 0) { return false; }
      }
      return true;
    });
    signalTable.setData(rows);
    signalTable.render();
    $('#f-sig-reset').hidden = !(f.source || f.need || f.qual || f.q);
  }

  function renderSignalStats() {
    var avg = Math.round(SIGNALS.reduce(function (a, s) { return a + s.score; }, 0) / SIGNALS.length);
    var top = null, counts = {};
    SIGNALS.forEach(function (s) { counts[s.source] = (counts[s.source] || 0) + 1; });
    Object.keys(counts).forEach(function (k) { if (!top || counts[k] > counts[top]) { top = k; } });
    $('#signal-stats').innerHTML = [
      stat('Matched signals', String(SIGNALS.length), '8 weeks to 16 Aug 2026'),
      stat('Qualified', String(qualifiedSignals.length), pct(qualifiedSignals.length, SIGNALS.length) + ' of feed · score ≥ ' + QUALIFY_THRESHOLD),
      stat('Average match score', String(avg), 'across all sources'),
      stat('Busiest source', String(counts[top]), esc(top))
    ].join('');
  }

  function stat(label, value, note, noteClass) {
    return '<div class="stat"><p class="stat-label">' + esc(label) + '</p>' +
      '<p class="stat-value">' + esc(value) + '</p>' +
      '<p class="stat-note' + (noteClass ? ' ' + noteClass : '') + '">' + note + '</p></div>';
  }

  /* ---------------------------------------------------------------- pipeline tab */

  function renderPipelineStats() {
    var total = PURSUITS.reduce(function (a, p) { return a + p.value; }, 0);
    var won = wonPursuits.reduce(function (a, p) { return a + p.value; }, 0);
    $('#pipeline-stats').innerHTML = [
      stat('Pipeline value', fmtCompact(total), PURSUITS.length + ' pursuits drafted'),
      stat('Won value', fmtCompact(won), wonPursuits.length + ' instructions', 'up'),
      stat('Win rate', pct(wonPursuits.length, submittedPursuits.length), wonPursuits.length + ' of ' + submittedPursuits.length + ' submitted'),
      stat('Signal to win', pct(wonPursuits.length, SIGNALS.length), 'end-to-end conversion')
    ].join('');
  }

  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function renderFunnel() {
    var host = $('#chart-funnel');
    host.innerHTML = '';

    var W = 720, rowH = 46, top = 8, barH = 24;
    var H = top * 2 + FUNNEL.length * rowH;
    var labelRight = 168, plotL = 182, plotR = 556, plotW = plotR - plotL, centre = (plotL + plotR) / 2;
    var max = FUNNEL[0].count;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Funnel from ' + FUNNEL[0].count + ' signals to ' + FUNNEL[FUNNEL.length - 1].count + ' wins.'
    });

    FUNNEL.forEach(function (s, i) {
      var w = Math.max(4, (s.count / max) * plotW);
      var y = top + i * rowH + (rowH - barH) / 2;
      var g = svgEl('g', { class: 'fn-row' });

      var label = svgEl('text', { x: labelRight, y: y + barH / 2 + 4, 'text-anchor': 'end', class: 'mark-label' });
      label.textContent = s.label;
      g.appendChild(label);

      g.appendChild(svgEl('rect', {
        x: centre - w / 2, y: y, width: w, height: barH, rx: 4,
        class: 'fn-bar fn-' + (i + 1)
      }));

      var val = svgEl('text', { x: plotR + 22, y: y + barH / 2 + 4, class: 'mark-label' });
      val.textContent = String(s.count);
      g.appendChild(val);

      var conv = svgEl('text', { x: plotR + 54, y: y + barH / 2 + 4, class: 'mark-sub' });
      conv.textContent = i === 0 ? '100% of feed' : pct(s.count, FUNNEL[i - 1].count) + ' of prior';
      g.appendChild(conv);

      var hit = svgEl('rect', {
        x: 0, y: top + i * rowH, width: W, height: rowH, class: 'fn-hit',
        tabindex: '0', role: 'img',
        'aria-label': s.label + ': ' + s.count + ', ' + (i === 0 ? '100% of feed' : pct(s.count, FUNNEL[i - 1].count) + ' of the previous stage') + '. ' + s.note + '.'
      });
      function tip(ev) {
        var r = hit.getBoundingClientRect();
        showTooltip(
          '<div class="tt-title">' + esc(s.label) + '</div>' +
          '<div class="tt-row"><span class="tt-key">Count</span><span class="tt-val">' + s.count + '</span></div>' +
          '<div class="tt-row"><span class="tt-key">Of previous stage</span><span class="tt-val">' + (i === 0 ? '—' : pct(s.count, FUNNEL[i - 1].count)) + '</span></div>' +
          '<div class="tt-row"><span class="tt-key">Of all signals</span><span class="tt-val">' + pct(s.count, FUNNEL[0].count) + '</span></div>',
          ev && ev.clientX != null ? ev.clientX : r.left + r.width / 2,
          ev && ev.clientY != null ? ev.clientY : r.top + r.height / 2
        );
      }
      hit.addEventListener('mousemove', tip);
      hit.addEventListener('mouseleave', hideTooltip);
      hit.addEventListener('focus', tip);
      hit.addEventListener('blur', hideTooltip);
      g.appendChild(hit);

      svg.appendChild(g);
    });

    host.appendChild(svg);
  }

  function renderWeekly() {
    var host = $('#chart-weekly');
    host.innerHTML = '';

    var W = 720, H = 300, L = 52, R = 16, T = 12, B = 52;
    var plotW = W - L - R, plotH = H - T - B;
    var n = WEEK_STARTS.length;
    var maxY = 0;
    SOURCES.forEach(function (s) { weeklyGrid[s].forEach(function (v) { if (v > maxY) { maxY = v; } }); });
    maxY = Math.max(3, maxY);

    function xFor(i) { return L + (plotW / (n - 1)) * i; }
    function yFor(v) { return T + plotH - (v / maxY) * plotH; }

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Line chart of matched signals per week by source, eight weeks to 16 August 2026. A data table with the same values is available below the chart.'
    });

    for (var v = 0; v <= maxY; v++) {
      svg.appendChild(svgEl('line', { x1: L, y1: yFor(v), x2: L + plotW, y2: yFor(v), class: v === 0 ? 'ax-line' : 'grid-line' }));
      var tick = svgEl('text', { x: L - 10, y: yFor(v) + 4, 'text-anchor': 'end', class: 'ax-text' });
      tick.textContent = String(v);
      svg.appendChild(tick);
    }

    var yTitle = svgEl('text', { x: 14, y: T + plotH / 2, class: 'ax-title', transform: 'rotate(-90 14 ' + (T + plotH / 2) + ')', 'text-anchor': 'middle' });
    yTitle.textContent = 'Signals per week';
    svg.appendChild(yTitle);

    WEEK_STARTS.forEach(function (w, i) {
      var lab = svgEl('text', { x: xFor(i), y: T + plotH + 22, 'text-anchor': 'middle', class: 'ax-text' });
      lab.textContent = fmtDateShort(w);
      svg.appendChild(lab);
    });

    var xTitle = svgEl('text', { x: L + plotW / 2, y: H - 10, 'text-anchor': 'middle', class: 'ax-title' });
    xTitle.textContent = 'Week commencing';
    svg.appendChild(xTitle);

    var crosshair = svgEl('line', { x1: 0, y1: T, x2: 0, y2: T + plotH, class: 'crosshair' });
    crosshair.style.opacity = '0';
    svg.appendChild(crosshair);

    SOURCES.forEach(function (src, si) {
      var pts = weeklyGrid[src].map(function (v, i) { return xFor(i) + ',' + yFor(v); }).join(' ');
      svg.appendChild(svgEl('polyline', { points: pts, class: 'line-mark sr-' + (si + 1) }));
    });

    SOURCES.forEach(function (src, si) {
      weeklyGrid[src].forEach(function (v, i) {
        svg.appendChild(svgEl('circle', { cx: xFor(i), cy: yFor(v), r: 4, class: 'dot-' + (si + 1) + ' dot-ring' }));
      });
    });

    WEEK_STARTS.forEach(function (w, i) {
      var half = plotW / (n - 1) / 2;
      var x0 = Math.max(L, xFor(i) - half);
      var x1 = Math.min(L + plotW, xFor(i) + half);
      var hit = svgEl('rect', { x: x0, y: T, width: Math.max(1, x1 - x0), height: plotH, class: 'week-hit' });
      function tip(ev) {
        crosshair.setAttribute('x1', xFor(i));
        crosshair.setAttribute('x2', xFor(i));
        crosshair.style.opacity = '1';
        var rows = SOURCES.map(function (src, si) {
          return '<div class="tt-row"><span class="tt-key"><span class="tt-swatch" style="background:var(--series-' + (si + 1) + ')"></span>' +
            esc(src) + '</span><span class="tt-val">' + weeklyGrid[src][i] + '</span></div>';
        }).join('');
        var total = SOURCES.reduce(function (a, src) { return a + weeklyGrid[src][i]; }, 0);
        showTooltip('<div class="tt-title">Week commencing ' + esc(fmtDate(w)) + '</div>' + rows +
          '<div class="tt-row"><span class="tt-key">Total</span><span class="tt-val">' + total + '</span></div>',
          ev.clientX, ev.clientY);
      }
      hit.addEventListener('mousemove', tip);
      hit.addEventListener('mouseleave', function () { crosshair.style.opacity = '0'; hideTooltip(); });
      svg.appendChild(hit);
    });

    host.appendChild(svg);

    var legend = $('#legend-weekly');
    legend.innerHTML = SOURCES.map(function (src, si) {
      var total = weeklyGrid[src].reduce(function (a, b) { return a + b; }, 0);
      return '<span class="legend-item"><span class="legend-key" style="background:var(--series-' + (si + 1) + ')"></span>' +
        esc(src) + ' <span class="legend-total">' + total + '</span></span>';
    }).join('');

    var wrap = $('#weekly-table-wrap');
    var head = '<tr><th scope="col">Week commencing</th>' +
      SOURCES.map(function (s) { return '<th scope="col" class="col-num">' + esc(s) + '</th>'; }).join('') +
      '<th scope="col" class="col-num">Total</th></tr>';
    var body = WEEK_STARTS.map(function (w, i) {
      var total = SOURCES.reduce(function (a, s) { return a + weeklyGrid[s][i]; }, 0);
      return '<tr><th scope="row">' + esc(fmtDate(w)) + '</th>' +
        SOURCES.map(function (s) { return '<td class="col-num">' + weeklyGrid[s][i] + '</td>'; }).join('') +
        '<td class="col-num">' + total + '</td></tr>';
    }).join('');
    var foot = '<tr><td>Total</td>' +
      SOURCES.map(function (s) {
        return '<td class="col-num">' + weeklyGrid[s].reduce(function (a, b) { return a + b; }, 0) + '</td>';
      }).join('') + '<td class="col-num">' + SIGNALS.length + '</td></tr>';
    wrap.innerHTML = '<table class="data-table"><caption class="sr-only">Matched signals per week by source.</caption>' +
      '<thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table>';
  }

  function renderPipelineCharts() { renderFunnel(); renderWeekly(); }

  var pursuitTable = new Table($('#tbl-pursuits'), {
    sortKey: 'value', sortDir: 'desc',
    numericKeys: ['value'],
    columns: [
      { key: 'opportunity', className: 'col-wide', render: function (r) { return '<span class="cell-strong">' + esc(r.opportunity) + '</span><span class="cell-sub">' + esc(r.id) + ' · from signal ' + esc(r.signal) + '</span>'; } },
      { key: 'client', render: function (r) { return esc(r.client); } },
      { key: 'practice', render: function (r) { return '<span class="badge">' + esc(r.practice) + '</span>'; } },
      { key: 'stage', render: function (r) { return '<span class="badge ' + stageClass(r.stage) + '">' + esc(r.stage) + '</span>'; } },
      { key: 'value', className: 'col-num cell-nowrap', render: function (r) { return esc(fmtMoney(r.value)); } },
      { key: 'owner', render: function (r) { return esc(r.owner); } }
    ],
    foot: function (rows) {
      var total = rows.reduce(function (a, r) { return a + r.value; }, 0);
      return '<tr><td colspan="4">' + rows.length + ' pursuit' + (rows.length === 1 ? '' : 's') + ' shown</td>' +
        '<td class="col-num">' + esc(fmtMoney(total)) + '</td><td></td></tr>';
    }
  });

  function stageClass(stage) {
    if (stage === 'Won') { return 'good'; }
    if (stage === 'Lost') { return 'crit'; }
    if (stage === 'Submitted') { return 'ok'; }
    if (stage === 'In review') { return 'warn'; }
    return '';
  }

  function renderPursuits() {
    var stage = $('#f-pur-stage').value;
    var practice = $('#f-pur-practice').value;
    var owner = $('#f-pur-owner').value;
    var rows = PURSUITS.filter(function (p) {
      if (stage && p.stage !== stage) { return false; }
      if (practice && p.practice !== practice) { return false; }
      if (owner && p.owner !== owner) { return false; }
      return true;
    });
    pursuitTable.setData(rows);
    pursuitTable.render();
    $('#f-pur-reset').hidden = !(stage || practice || owner);
  }

  /* ---------------------------------------------------------------- exchange tab */

  function briefCtx(b) {
    var creds = CREDENTIALS.filter(function (c) { return c.practice === b.practice; }).slice(0, 3);
    while (creds.length < 3) {
      CREDENTIALS.forEach(function (c) { if (creds.length < 3 && creds.indexOf(c) < 0) { creds.push(c); } });
    }
    return {
      id: b.id, company: b.company, need: b.practice, jurisdiction: b.jurisdiction,
      sector: 'Cross-sector', score: b.score, partner: creds[0].partner, date: b.closes,
      detail: b.scope, headline: b.title.charAt(0).toLowerCase() + b.title.slice(1), creds: creds
    };
  }

  function briefDetailHtml(b) {
    var ctx = briefCtx(b);
    var html = '<div class="so-section so-meta">';
    html += '<div><span class="k">Posted by</span><span class="v">' + esc(b.company) + '</span></div>';
    html += '<div><span class="k">Value band</span><span class="v">' + esc(b.band) + '</span></div>';
    html += '<div><span class="k">Closes</span><span class="v">' + esc(fmtDate(b.closes)) + '</span></div>';
    html += '<div><span class="k">Responses so far</span><span class="v">' + b.responses + '</span></div>';
    html += '<div><span class="k">Jurisdiction</span><span class="v">' + esc(b.jurisdiction) + '</span></div>';
    html += '<div><span class="k">Status</span><span class="v">' + esc(b.status) + '</span></div>';
    html += '</div>';

    html += '<div class="so-section"><h3>Scope</h3><p class="so-text">' + esc(b.scope) + '</p></div>';

    html += '<div class="so-section"><h3>What the client asked for</h3><ul class="cite-list">' +
      b.requirements.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>';

    html += '<div class="so-section"><h3>Your match — ' + b.score + '/100</h3>' +
      '<p class="so-text">Scored against the same credentials library the pursuits engine uses. Three closest matters:</p>' +
      credListHtml(ctx.creds, ctx) + '</div>';

    html += '<div class="so-section so-actions">' +
      '<button type="button" class="btn btn-primary" data-brief-respond="' + esc(b.id) + '">Respond via pursuits engine</button>' +
      '</div>';
    return html;
  }

  function openBrief(b) {
    openSlide(b.id + ' · ' + b.practice, b.title, briefDetailHtml(b));
  }

  function showBriefResponse(b) {
    var body = '<div class="so-section"><button type="button" class="back-link" data-brief-back="' + esc(b.id) + '">← Back to brief</button></div>' +
      pursuitDoc(briefCtx(b));
    updateSlide('Pursuits engine · pre-filled response', b.title, body);
  }

  var briefTable = new Table($('#tbl-briefs'), {
    sortKey: 'score', sortDir: 'desc',
    numericKeys: ['score', 'responses'],
    columns: [
      { key: 'title', className: 'col-wide', render: function (r) { return linkCell(r.title, r.id + ' · ' + r.jurisdiction); } },
      { key: 'company', render: function (r) { return esc(r.company); } },
      { key: 'practice', render: function (r) { return '<span class="badge">' + esc(r.practice) + '</span>'; } },
      { key: 'band', className: 'cell-nowrap', render: function (r) { return esc(r.band); },
        sortValue: function (r) { return VALUE_BANDS.indexOf(r.band); } },
      { key: 'responses', className: 'col-num', render: function (r) { return String(r.responses); } },
      { key: 'closes', className: 'cell-nowrap', render: function (r) { return esc(fmtDate(r.closes)); },
        sortValue: function (r) { return days(r.closes); } },
      { key: 'status', render: function (r) { return '<span class="badge ' + briefStatusClass(r.status) + '">' + esc(r.status) + '</span>'; } },
      { key: 'score', className: 'col-num', render: function (r) { return meterCell(r.score); } }
    ],
    onRowClick: openBrief
  });

  function briefStatusClass(s) {
    if (s === 'Closing soon') { return 'warn'; }
    if (s === 'Awarded') { return ''; }
    if (s === 'Shortlisting') { return 'ok'; }
    return 'good';
  }

  function renderBriefs() {
    var practice = $('#f-bx-practice').value;
    var band = $('#f-bx-band').value;
    var status = $('#f-bx-status').value;
    var q = $('#f-bx-q').value.trim().toLowerCase();
    var rows = BRIEFS.filter(function (b) {
      if (practice && b.practice !== practice) { return false; }
      if (band && b.band !== band) { return false; }
      if (status && b.status !== status) { return false; }
      if (q && (b.title + ' ' + b.company + ' ' + b.id).toLowerCase().indexOf(q) < 0) { return false; }
      return true;
    });
    briefTable.setData(rows);
    briefTable.render();
    $('#f-bx-reset').hidden = !(practice || band || status || q);
  }

  function renderExchangeStats() {
    var responses = BRIEFS.reduce(function (a, b) { return a + b.responses; }, 0);
    var strong = BRIEFS.filter(function (b) { return b.score >= 80; }).length;
    var t = days(TODAY);
    var soon = BRIEFS.filter(function (b) { var d = days(b.closes); return d >= t && d <= t + 7; }).length;
    $('#exchange-stats').innerHTML = [
      stat('Briefs on the board', String(BRIEFS.length), 'posted by in-house teams'),
      stat('Responses lodged', String(responses), 'across all live briefs'),
      stat('Strong matches for you', String(strong), 'match score 80 or above'),
      stat('Closing within 7 days', String(soon), 'as at ' + fmtDate(TODAY))
    ].join('');
  }

  /* ---------------------------------------------------------------- post a brief */

  var myBriefTable = new Table($('#tbl-mybriefs'), {
    sortKey: 'posted', sortDir: 'desc',
    numericKeys: ['responses'],
    columns: [
      { key: 'posted', className: 'cell-nowrap', render: function (r) { return esc(fmtDate(r.posted)); },
        sortValue: function (r) { return days(r.posted); } },
      { key: 'title', className: 'col-wide', render: function (r) {
        return '<span class="cell-strong">' + esc(r.title) + '</span><span class="cell-sub">' + esc(r.id) +
          (r.panelOnly ? ' · panel firms only' : ' · open to the exchange') + '</span>'; } },
      { key: 'matterType', render: function (r) { return esc(r.matterType); } },
      { key: 'band', className: 'cell-nowrap', render: function (r) { return esc(r.band); },
        sortValue: function (r) { return VALUE_BANDS.indexOf(r.band); } },
      { key: 'jurisdiction', render: function (r) { return esc(r.jurisdiction); } },
      { key: 'responses', className: 'col-num', render: function (r) { return String(r.responses); } },
      { key: 'status', render: function (r) { return '<span class="badge ' + briefStatusClass(r.status) + '">' + esc(r.status) + '</span>'; } }
    ]
  });

  function renderMyBriefs() {
    myBriefTable.setData(myBriefs.slice());
    myBriefTable.render();
  }

  function initForm() {
    $('#gc-name').textContent = FIRM.gc.name + ', ' + FIRM.gc.title + ', ' + FIRM.gc.company;
    fill($('#nb-type'), MATTER_TYPES);
    fill($('#nb-band'), VALUE_BANDS);
    fill($('#nb-juris'), JURISDICTIONS);
    $('#nb-juris').value = 'NSW';

    var panel = $('#nb-panel');
    panel.addEventListener('change', function () {
      $('#nb-panel-hint').textContent = panel.checked
        ? 'On: only firms already on your panel will see this brief.'
        : 'Off: any firm on the exchange whose credentials match may respond.';
    });

    $('#brief-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var title = $('#nb-title').value.trim();
      var desc = $('#nb-desc').value.trim();
      var ok = true;

      $('#err-nb-title').hidden = title.length > 0;
      $('#err-nb-desc').hidden = desc.length > 0;
      if (!title) { ok = false; $('#nb-title').focus(); }
      if (!desc) { ok = false; if (title) { $('#nb-desc').focus(); } }
      if (!ok) { return; }

      var id = 'BX-' + nextBriefNumber;
      nextBriefNumber += 1;
      myBriefs.unshift({
        id: id, title: title, matterType: $('#nb-type').value, band: $('#nb-band').value,
        jurisdiction: $('#nb-juris').value, posted: TODAY, responses: 0, status: 'Open',
        panelOnly: panel.checked, description: desc
      });
      myBriefTable.sortKey = 'posted';
      myBriefTable.sortDir = 'desc';
      renderMyBriefs();
      $('#brief-form').reset();
      $('#nb-juris').value = 'NSW';
      $('#nb-panel-hint').textContent = 'Off: any firm on the exchange whose credentials match may respond.';
      toast('Brief posted — ' + id,
        panel.checked
          ? 'Visible to your 4 panel firms. Median first response in this value band: 2.4 days.'
          : 'Matched to 38 firms whose credentials clear this matter type. Median first response: 2.4 days.');
    });

    /* The reset event fires before the controls are cleared, so restore the
       non-default jurisdiction and the hint on the next tick. */
    $('#brief-form').addEventListener('reset', function () {
      $('#err-nb-title').hidden = true;
      $('#err-nb-desc').hidden = true;
      window.setTimeout(function () {
        $('#nb-juris').value = 'NSW';
        $('#nb-panel-hint').textContent = 'Off: any firm on the exchange whose credentials match may respond.';
      }, 0);
    });
  }

  /* ---------------------------------------------------------------- responses tab */

  function renderResponses() {
    var brief = BRIEFS.filter(function (b) { return b.id === RESPONSE_BRIEF_ID; })[0];
    var ranked = BRIEF_RESPONSES.slice().sort(function (a, b) { return b.score - a.score; });

    $('#response-brief').innerHTML =
      '<div><span class="badge ok">' + esc(brief.id) + '</span> <span class="badge">' + esc(brief.practice) + '</span></div>' +
      '<h2>' + esc(brief.title) + '</h2>' +
      '<p class="lede">' + esc(brief.scope) + '</p>' +
      '<div class="brief-meta so-meta">' +
      '<div><span class="k">Value band</span><span class="v">' + esc(brief.band) + '</span></div>' +
      '<div><span class="k">Jurisdiction</span><span class="v">' + esc(brief.jurisdiction) + '</span></div>' +
      '<div><span class="k">Closes</span><span class="v">' + esc(fmtDate(brief.closes)) + '</span></div>' +
      '<div><span class="k">Responses</span><span class="v">' + brief.responses + '</span></div>' +
      '</div>';

    $('#response-list').innerHTML = ranked.map(function (r, i) {
      var id = 'resp-' + i;
      return '<div class="response' + (i === 0 ? ' top' : '') + '">' +
        '<button type="button" class="response-summary" aria-expanded="false" aria-controls="' + id + '">' +
        '<span class="response-rank">' + (i + 1) + '</span>' +
        '<span class="response-firm">' + esc(r.firm) + (i === 0 ? ' <span class="badge ok">Best match</span>' : '') + '</span>' +
        '<span class="response-fig"><span class="k">Match</span>' + r.score + '/100</span>' +
        '<span class="response-fig"><span class="k">Fee estimate</span>' + esc(fmtMoney(r.fee)) + '</span>' +
        '<span class="response-fig"><span class="k">Relevant matters</span>' + r.matters + '</span>' +
        '<span class="chev" aria-hidden="true">▾</span>' +
        '</button>' +
        '<div class="response-detail" id="' + id + '" hidden>' +
        '<div><h3 class="stat-label">Credential citations</h3><ul class="cite-list">' +
        r.citations.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') +
        '</ul></div>' +
        '<div class="so-meta">' +
        '<div><span class="k">Fee basis</span><span class="v">' + esc(r.feeBasis) + '</span></div>' +
        '<div><span class="k">Team seniority</span><span class="v">' + esc(r.seniority) + '</span></div>' +
        '<div><span class="k">Lodged</span><span class="v">' + esc(fmtDate(r.lodged)) + '</span></div>' +
        '</div>' +
        '<p class="hint">' + esc(r.note) + '</p>' +
        '</div></div>';
    }).join('');

    compareTable.setData(BRIEF_RESPONSES.slice());
    compareTable.render();
  }

  var compareTable = new Table($('#tbl-compare'), {
    sortKey: 'score', sortDir: 'desc',
    numericKeys: ['score', 'fee', 'matters'],
    columns: [
      { key: 'firm', render: function (r) { return '<span class="cell-strong">' + esc(r.firm) + '</span>'; } },
      { key: 'score', className: 'col-num', render: function (r) { return meterCell(r.score); } },
      { key: 'fee', className: 'col-num cell-nowrap', render: function (r) { return esc(fmtMoney(r.fee)); } },
      { key: 'feeBasis', className: 'col-wide', render: function (r) { return esc(r.feeBasis); } },
      { key: 'seniority', className: 'col-wide', render: function (r) { return esc(r.seniority); } },
      { key: 'matters', className: 'col-num', render: function (r) { return String(r.matters); } }
    ]
  });

  $('#response-list').addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.response-summary') : null;
    if (!btn) { return; }
    var panelEl = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panelEl) { return; }
    var open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    panelEl.hidden = open;
  });

  /* ---------------------------------------------------------------- routing */

  var VIEWS = {
    firm: {
      label: 'Firm view',
      tabs: [
        { id: 'signals', label: 'Signals' },
        { id: 'pipeline', label: 'Pipeline' },
        { id: 'exchange', label: 'Exchange' },
        { id: 'about', label: 'About this play' }
      ]
    },
    client: {
      label: 'Client (GC) view',
      tabs: [
        { id: 'post', label: 'Post a brief' },
        { id: 'responses', label: 'Responses' },
        { id: 'about', label: 'About this play' }
      ]
    }
  };

  var state = { view: 'firm', tab: 'signals' };
  var tablist = $('#tablist');

  function tabsFor(view) { return VIEWS[view].tabs; }

  function hasTab(view, tab) {
    return tabsFor(view).some(function (t) { return t.id === tab; });
  }

  function parseHash() {
    var raw = String(location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(function (p) { return p.length > 0; });
    var view = parts[0] && VIEWS[parts[0]] ? parts[0] : 'firm';
    var tab = parts[1] && hasTab(view, parts[1]) ? parts[1] : tabsFor(view)[0].id;
    return { view: view, tab: tab };
  }

  function setRoute(view, tab, replace) {
    var hash = '#' + view + '/' + tab;
    if (location.hash === hash) { applyRoute(); return; }
    if (replace) { location.replace(hash); } else { location.hash = hash; }
  }

  function renderTabs() {
    tablist.innerHTML = tabsFor(state.view).map(function (t) {
      return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" ' +
        'aria-controls="panel-' + t.id + '" aria-selected="' + (t.id === state.tab ? 'true' : 'false') + '" ' +
        'tabindex="' + (t.id === state.tab ? '0' : '-1') + '" data-tab="' + t.id + '">' + esc(t.label) + '</button>';
    }).join('');
  }

  tablist.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('[data-tab]') : null;
    if (btn) { setRoute(state.view, btn.getAttribute('data-tab')); }
  });

  tablist.addEventListener('keydown', function (ev) {
    var keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (keys.indexOf(ev.key) < 0) { return; }
    var tabs = tabsFor(state.view);
    var i = tabs.map(function (t) { return t.id; }).indexOf(state.tab);
    var next = i;
    if (ev.key === 'ArrowLeft') { next = (i - 1 + tabs.length) % tabs.length; }
    if (ev.key === 'ArrowRight') { next = (i + 1) % tabs.length; }
    if (ev.key === 'Home') { next = 0; }
    if (ev.key === 'End') { next = tabs.length - 1; }
    ev.preventDefault();
    setRoute(state.view, tabs[next].id);
  });

  $$('.seg-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var view = btn.getAttribute('data-view');
      if (view === state.view) { return; }
      var tab = state.tab === 'about' ? 'about' : tabsFor(view)[0].id;
      setRoute(view, tab);
    });
  });

  function applyRoute() {
    var r = parseHash();
    state.view = r.view;
    state.tab = r.tab;

    closeSlide();
    hideTooltip();

    $$('.seg-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === state.view ? 'true' : 'false');
    });

    /* Rebuilding the tablist drops focus; put it back on the selected tab so
       arrow-key navigation keeps working. */
    var hadTabFocus = tablist.contains(document.activeElement);
    renderTabs();
    if (hadTabFocus) {
      var active = document.getElementById('tab-' + state.tab);
      if (active) { active.focus(); }
    }

    $$('.panel').forEach(function (p) { p.hidden = true; });
    var panel = document.getElementById('panel-' + state.tab);
    if (panel) { panel.hidden = false; }

    if (state.tab === 'pipeline') { renderPipelineCharts(); }
    if (state.tab === 'signals') { renderSignals(); }
    if (state.tab === 'exchange') { renderBriefs(); }
    if (state.tab === 'responses') { renderResponses(); }
    if (state.tab === 'post') { renderMyBriefs(); }
  }

  window.addEventListener('hashchange', applyRoute);

  /* ---------------------------------------------------------------- wiring */

  function bindFilters() {
    fill($('#f-sig-source'), SOURCES, 'All sources');
    fill($('#f-sig-need'), PRACTICE_AREAS, 'All practice areas');
    ['#f-sig-source', '#f-sig-need', '#f-sig-qual', '#f-sig-q'].forEach(function (sel) {
      $(sel).addEventListener('input', renderSignals);
    });
    function resetSignals() {
      $('#f-sig-source').value = '';
      $('#f-sig-need').value = '';
      $('#f-sig-qual').value = '';
      $('#f-sig-q').value = '';
      renderSignals();
    }
    $('#f-sig-reset').addEventListener('click', resetSignals);
    $('.empty-state .linkish', $('#panel-signals')).addEventListener('click', resetSignals);

    fill($('#f-pur-stage'), PURSUIT_STAGES, 'All stages');
    fill($('#f-pur-practice'), PRACTICE_AREAS, 'All practice areas');
    var owners = [];
    PURSUITS.forEach(function (p) { if (owners.indexOf(p.owner) < 0) { owners.push(p.owner); } });
    owners.sort();
    fill($('#f-pur-owner'), owners, 'All partners');
    ['#f-pur-stage', '#f-pur-practice', '#f-pur-owner'].forEach(function (sel) {
      $(sel).addEventListener('input', renderPursuits);
    });
    function resetPursuits() {
      $('#f-pur-stage').value = '';
      $('#f-pur-practice').value = '';
      $('#f-pur-owner').value = '';
      renderPursuits();
    }
    $('#f-pur-reset').addEventListener('click', resetPursuits);
    $('.empty-state .linkish', $('#panel-pipeline')).addEventListener('click', resetPursuits);

    fill($('#f-bx-practice'), PRACTICE_AREAS, 'All practice areas');
    fill($('#f-bx-band'), VALUE_BANDS, 'All value bands');
    fill($('#f-bx-status'), BRIEF_STATUSES, 'All statuses');
    ['#f-bx-practice', '#f-bx-band', '#f-bx-status', '#f-bx-q'].forEach(function (sel) {
      $(sel).addEventListener('input', renderBriefs);
    });
    function resetBriefs() {
      $('#f-bx-practice').value = '';
      $('#f-bx-band').value = '';
      $('#f-bx-status').value = '';
      $('#f-bx-q').value = '';
      renderBriefs();
    }
    $('#f-bx-reset').addEventListener('click', resetBriefs);
    $('.empty-state .linkish', $('#panel-exchange')).addEventListener('click', resetBriefs);
  }

  function bindWeeklyTableToggle() {
    var btn = $('#toggle-weekly-table');
    var wrap = $('#weekly-table-wrap');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      btn.textContent = open ? 'Show data table' : 'Hide data table';
      wrap.hidden = open;
    });
  }

  function init() {
    initTheme();
    bindFilters();
    bindWeeklyTableToggle();
    initForm();

    renderSignalStats();
    renderSignals();
    renderPipelineStats();
    renderPursuits();
    renderExchangeStats();
    renderBriefs();
    renderMyBriefs();
    renderResponses();

    themeListeners.push(function () {
      if (state.tab === 'pipeline') { renderPipelineCharts(); }
    });

    /* Normalise the hash (so a bare or bad hash becomes #view/tab) without
       adding a history entry, then paint. */
    var r = parseHash();
    var want = '#' + r.view + '/' + r.tab;
    if (location.hash !== want) { location.replace(want); }
    applyRoute();
  }

  init();
})();
