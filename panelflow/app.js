/* PanelFlow — demo application. Vanilla JS, no dependencies, no network.
   Every number rendered here is derived from PF_DATA at runtime, so the agency
   view and the firm view read from one ledger and cannot disagree. */

(function () {
  'use strict';

  var D = PF_DATA;
  var TODAY = D.AGENCY.today;
  var FIRM = D.FIRMS.filter(function (f) { return f.id === D.FIRM_VIEW_ID; })[0];

  /* ============================ small helpers ============================ */

  function $(id) { return document.getElementById(id); }
  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }
  function mean(arr) { return arr.length ? sum(arr) / arr.length : 0; }
  function median(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-AU'); }
  function fmtCompact(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtRate(n) { return '$' + Math.round(n); }
  function fmtPct(n, dp) { return (n).toFixed(dp === undefined ? 1 : dp) + '%'; }
  function fmtSignedPct(n, dp) {
    var v = (n).toFixed(dp === undefined ? 1 : dp);
    return (n > 0 ? '+' : '') + v + '%';
  }
  function fmtDate(iso) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var p = iso.split('-');
    return Number(p[2]) + ' ' + months[Number(p[1]) - 1] + ' ' + p[0];
  }
  function monthLabel(ym) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var p = ym.split('-');
    return months[Number(p[1]) - 1] + " '" + p[0].slice(2);
  }
  function firmName(id) {
    var f = D.FIRMS.filter(function (x) { return x.id === id; })[0];
    return f ? f.name : id;
  }
  function firmById(id) { return D.FIRMS.filter(function (x) { return x.id === id; })[0]; }

  function truncate(text, maxChars) {
    return text.length <= maxChars ? text : text.slice(0, Math.max(1, maxChars - 1)) + '…';
  }

  /* ============================== state ================================= */

  var state = {
    view: 'agency',
    tab: 'spend',
    dash: { fy: 'FY26', type: 'all' },
    recentFilters: { type: 'all', firm: 'all' },
    bench: { type: 'all', sen: 'all', q: '' },
    lost: { type: 'all', fy: 'all', q: '' },
    sort: {
      recent: { key: 'date', dir: 'desc' },
      bench: { key: 'delta', dir: 'desc' },
      lost: { key: 'delta', dir: 'asc' }
    },
    recent: [],
    lastRecommendation: null,
    seq: 2006
  };

  var VIEWS = {
    agency: [
      { id: 'spend', label: 'Spend dashboard', panel: 'panel-spend' },
      { id: 'allocate', label: 'Allocate a matter', panel: 'panel-allocate' },
      { id: 'benchmarks', label: 'Benchmarks', panel: 'panel-benchmarks' },
      { id: 'about', label: 'About this play', panel: 'panel-about' }
    ],
    firm: [
      { id: 'performance', label: 'Performance', panel: 'panel-performance' },
      { id: 'about', label: 'About this play', panel: 'panel-about' }
    ]
  };

  /* =========================== derivations ============================== */

  function mattersByFY(fy) {
    return D.MATTERS.filter(function (m) { return m.fy === fy; });
  }

  function dashMatters() {
    return D.MATTERS.filter(function (m) {
      if (m.fy !== state.dash.fy) return false;
      if (state.dash.type !== 'all' && m.type !== state.dash.type) return false;
      return true;
    });
  }

  function groupSum(list, keyFn) {
    var out = {};
    list.forEach(function (m) {
      var k = keyFn(m);
      out[k] = (out[k] || 0) + m.value;
    });
    return out;
  }

  function fyMonths(fy) {
    var startYear = fy === 'FY26' ? 2025 : 2024;
    var out = [];
    for (var i = 0; i < 12; i++) {
      var mi = (6 + i) % 12;
      var y = startYear + (6 + i >= 12 ? 1 : 0);
      out.push(y + '-' + String(mi + 1).padStart(2, '0'));
    }
    return out;
  }

  /* Median blended rate a firm quotes for a matter type, from every shortlist
     it appeared on. Falls back to the firm's all-type median. */
  function firmRateFor(firmId, type) {
    var bids = [];
    D.MATTERS.forEach(function (m) {
      var i = m.shortlist.indexOf(firmId);
      if (i >= 0 && m.type === type) bids.push(m.bids[i]);
    });
    if (bids.length) return median(bids);
    var all = [];
    D.MATTERS.forEach(function (m) {
      var i = m.shortlist.indexOf(firmId);
      if (i >= 0) all.push(m.bids[i]);
    });
    return median(all);
  }

  function panelRateFor(type) {
    var bids = [];
    D.MATTERS.forEach(function (m) {
      if (m.type === type) bids = bids.concat(m.bids);
    });
    return median(bids);
  }

  function conflictFor(firmId, type) {
    var c = D.CONFLICTS.filter(function (x) { return x.firmId === firmId && x.type === type; })[0];
    return c ? c.reason : null;
  }

  function mattersWonBy(firmId, type) {
    return D.MATTERS.filter(function (m) {
      return m.firmId === firmId && (!type || m.type === type);
    });
  }

  function shortlistsFor(firmId, type) {
    return D.MATTERS.filter(function (m) {
      return m.shortlist.indexOf(firmId) >= 0 && (!type || m.type === type);
    });
  }

  /* ========================= allocation engine ========================== */

  var WEIGHT_NAMES = { perf: 'Past performance', cap: 'Current capacity', rate: 'Rate vs benchmark', service: 'Panel service record' };

  function weightsFor(params) {
    var w = { perf: 0.35, cap: 0.25, rate: 0.30, service: 0.10 };
    if (params.complexity === 'High') { w.perf += 0.10; w.rate -= 0.07; w.cap -= 0.03; }
    if (params.complexity === 'Low') { w.perf -= 0.07; w.rate += 0.10; w.cap -= 0.03; }
    if (params.band === '$500k+') { w.rate += 0.05; w.perf -= 0.05; }
    if (params.band === 'Under $50k') { w.cap += 0.05; w.perf -= 0.05; }
    if (daysUntil(params.requiredBy) < 45) { w.cap += 0.08; w.perf -= 0.04; w.rate -= 0.04; }
    Object.keys(w).forEach(function (k) { w[k] = Math.max(0.05, w[k]); });
    var t = w.perf + w.cap + w.rate + w.service;
    Object.keys(w).forEach(function (k) { w[k] = w[k] / t; });
    return w;
  }

  function daysUntil(iso) {
    if (!iso) return 90;
    var a = new Date(TODAY + 'T00:00:00');
    var b = new Date(iso + 'T00:00:00');
    if (isNaN(b.getTime())) return 90;
    return Math.round((b - a) / 86400000);
  }

  function scoreFirm(firmId, params) {
    var f = firmById(firmId);
    var rating = D.PERFORMANCE[firmId][params.type];
    var wonHere = mattersWonBy(firmId, params.type).length;
    var rate = firmRateFor(firmId, params.type);
    var panelRate = panelRateFor(params.type);
    var w = weightsFor(params);

    var perf = clamp(rating / 5 * 100, 0, 100);
    var cap = clamp(100 - f.util, 0, 100);
    /* 120 is chosen so the rate leg's spread across the panel (roughly ±15% of the
       panel median → ±18 points) is comparable to the performance and capacity
       legs. A larger multiplier makes the cheapest firm win every matter type and
       turns the other three legs into decoration. */
    var rateScore = clamp(50 + ((panelRate - rate) / panelRate) * 120, 0, 100);
    var service = clamp(f.slaPct, 0, 100);

    var composite = perf * w.perf + cap * w.cap + rateScore * w.rate + service * w.service;

    return {
      firmId: firmId,
      firm: f,
      composite: Math.round(composite * 10) / 10,
      weights: w,
      parts: [
        {
          key: 'perf', name: WEIGHT_NAMES.perf, score: Math.round(perf), weight: w.perf,
          fact: '<b>' + rating.toFixed(1) + ' / 5</b> satisfaction across <b>' + wonHere + '</b> completed ' + esc(params.type) + ' matter' + (wonHere === 1 ? '' : 's')
        },
        {
          key: 'cap', name: WEIGHT_NAMES.cap, score: Math.round(cap), weight: w.cap,
          fact: '<b>' + (100 - f.util) + '% headroom</b> — ' + f.util + '% of declared capacity in use'
        },
        {
          key: 'rate', name: WEIGHT_NAMES.rate, score: Math.round(rateScore), weight: w.rate,
          fact: 'Median blended <b>' + fmtRate(rate) + '/hr</b> vs panel median ' + fmtRate(panelRate) +
                ' (<b>' + fmtSignedPct((rate - panelRate) / panelRate * 100, 0) + '</b>)'
        },
        {
          key: 'service', name: WEIGHT_NAMES.service, score: Math.round(service), weight: w.service,
          fact: '<b>' + f.slaPct + '%</b> acknowledged inside the 48h SLA · median ' + f.respHrs + 'h'
        }
      ],
      rate: rate,
      panelRate: panelRate
    };
  }

  function recommend(params) {
    var ranked = [];
    var blocked = [];
    D.FIRMS.forEach(function (f) {
      var conflict = conflictFor(f.id, params.type);
      if (params.excluded.indexOf(f.id) >= 0) {
        blocked.push({ firm: f, reason: 'Excluded by you at conflict check.' });
        return;
      }
      if (conflict) {
        blocked.push({ firm: f, reason: 'Conflict declared — ' + conflict });
        return;
      }
      ranked.push(scoreFirm(f.id, params));
    });
    ranked.sort(function (a, b) {
      if (b.composite !== a.composite) return b.composite - a.composite;
      if (a.rate !== b.rate) return a.rate - b.rate;
      return a.firm.name.localeCompare(b.firm.name);
    });
    return { ranked: ranked, blocked: blocked, weights: weightsFor(params) };
  }

  /* ============================== theme ================================= */

  function currentTheme() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('panelflow-theme', t); } catch (e) { /* storage blocked */ }
    syncThemeButton();
    renderCharts();
  }

  function syncThemeButton() {
    var dark = currentTheme() === 'dark';
    var btn = $('theme-toggle');
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    $('theme-icon').textContent = dark ? '◑' : '◐';
    $('theme-label').textContent = dark ? 'Light' : 'Dark';
  }

  /* ============================= tooltip ================================ */

  var tip = null;

  function tipShow(evt, html) {
    if (!tip) tip = $('viz-tip');
    tip.innerHTML = html;
    tip.setAttribute('data-open', 'true');
    tipMove(evt);
  }
  function tipMove(evt) {
    if (!tip) return;
    var pad = 12;
    var w = tip.offsetWidth;
    var x = clamp(evt.clientX, w / 2 + pad, window.innerWidth - w / 2 - pad);
    var y = Math.max(tip.offsetHeight + pad, evt.clientY - 14);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function tipHide() {
    if (!tip) tip = $('viz-tip');
    tip.setAttribute('data-open', 'false');
  }
  function tipRows(title, rows) {
    return '<div class="tip-title">' + esc(title) + '</div>' + rows.map(function (r) {
      return '<div class="tip-row"><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></div>';
    }).join('');
  }

  /* ======================== chart infrastructure ======================== */

  var chartRenderers = [];
  function resetCharts() { chartRenderers = []; }
  function registerChart(fn) { chartRenderers.push(fn); fn(); }
  function renderCharts() { chartRenderers.forEach(function (fn) { fn(); }); }

  function hostWidth(host, fallback) {
    var w = host.clientWidth;
    return w > 40 ? w : (fallback || 640);
  }

  function niceTicks(maxValue, count) {
    if (maxValue <= 0) return [0, 1];
    var raw = maxValue / (count - 1);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var ticks = [];
    for (var v = 0; v <= maxValue + step * 0.001; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < maxValue) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  function barPath(x, y, len, h) {
    var r = Math.min(4, Math.max(0, len / 2), h / 2);
    if (len <= 0.5) return '';
    if (r < 1) return 'M' + x + ',' + y + 'h' + len + 'v' + h + 'h' + (-len) + 'Z';
    return 'M' + x + ',' + y +
      'H' + (x + len - r) + 'A' + r + ',' + r + ' 0 0 1 ' + (x + len) + ',' + (y + r) +
      'V' + (y + h - r) + 'A' + r + ',' + r + ' 0 0 1 ' + (x + len - r) + ',' + (y + h) +
      'H' + x + 'Z';
  }

  /* Horizontal bar chart — one series, one hue. */
  function drawHBar(host, opts) {
    var rows = opts.rows;
    var w = hostWidth(host, 620);
    var labelW = clamp(Math.round(w * 0.30), 88, 168);
    var valueW = opts.valueW || 72;
    var plotW = Math.max(40, w - labelW - valueW - 8);
    var rowH = 30, barH = 16;
    var h = rows.length * rowH + 10;
    var maxV = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([0]));
    if (maxV <= 0) maxV = 1;
    var charW = 6.6;
    var maxChars = Math.floor(labelW / charW);

    var parts = ['<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
      '" role="img" aria-label="' + esc(opts.ariaLabel || opts.title || 'Bar chart') + '">'];

    rows.forEach(function (r, i) {
      var y = i * rowH + 5;
      var len = (r.value / maxV) * plotW;
      var color = r.colorVar || opts.colorVar || '--viz-1';
      parts.push('<text x="0" y="' + (y + barH / 2) + '" dominant-baseline="central" font-size="12.5" ' +
        'style="fill:var(--viz-ink)">' + esc(truncate(r.label, maxChars)) + '</text>');
      parts.push('<rect x="' + labelW + '" y="' + y + '" width="' + plotW + '" height="' + barH +
        '" rx="3" style="fill:var(--viz-track);opacity:.45"></rect>');
      var d = barPath(labelW, y, len, barH);
      if (d) parts.push('<path d="' + d + '" style="fill:var(' + color + ')"></path>');
      parts.push('<text x="' + (labelW + plotW + 8) + '" y="' + (y + barH / 2) +
        '" dominant-baseline="central" font-size="12.5" font-weight="600" ' +
        'style="fill:var(--text);font-variant-numeric:tabular-nums">' + esc(r.valueLabel) + '</text>');
      parts.push('<rect data-i="' + i + '" x="0" y="' + (y - 5) + '" width="' + w + '" height="' + rowH +
        '" fill="transparent"></rect>');
    });
    parts.push('</svg>');
    host.innerHTML = parts.join('');
    attachTips(host, rows);
  }

  function attachTips(host, rows) {
    els('[data-i]', host).forEach(function (node) {
      var r = rows[Number(node.getAttribute('data-i'))];
      if (!r || !r.tip) return;
      node.addEventListener('mouseenter', function (e) { tipShow(e, r.tip); });
      node.addEventListener('mousemove', tipMove);
      node.addEventListener('mouseleave', tipHide);
    });
  }

  /* Donut — part-to-whole, five categorical slots, 2px surface gap. */
  function drawDonut(host, opts) {
    var rows = opts.rows;
    var w = hostWidth(host, 240);
    var size = clamp(w, 160, 250);
    var cx = size / 2, cy = size / 2;
    var rOuter = size / 2 - 3;
    var rInner = rOuter * 0.62;
    var rMid = (rOuter + rInner) / 2;
    var total = sum(rows.map(function (r) { return r.value; }));
    var gap = total > 0 ? (2 / rMid) : 0;

    var parts = ['<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size +
      '" role="img" aria-label="' + esc(opts.ariaLabel || 'Donut chart') + '">'];

    if (total <= 0) {
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rMid + '" fill="none" stroke-width="' +
        (rOuter - rInner) + '" style="stroke:var(--viz-track)"></circle>');
    } else {
      var angle = -Math.PI / 2;
      rows.forEach(function (r, i) {
        var span = (r.value / total) * Math.PI * 2;
        var a0 = angle + gap / 2;
        var a1 = angle + span - gap / 2;
        angle += span;
        if (a1 <= a0) return;
        var large = (a1 - a0) > Math.PI ? 1 : 0;
        var p = [
          'M', cx + rOuter * Math.cos(a0), cy + rOuter * Math.sin(a0),
          'A', rOuter, rOuter, 0, large, 1, cx + rOuter * Math.cos(a1), cy + rOuter * Math.sin(a1),
          'L', cx + rInner * Math.cos(a1), cy + rInner * Math.sin(a1),
          'A', rInner, rInner, 0, large, 0, cx + rInner * Math.cos(a0), cy + rInner * Math.sin(a0),
          'Z'
        ].join(' ');
        parts.push('<path data-i="' + i + '" d="' + p + '" style="fill:var(' + r.colorVar + ')"></path>');
      });
    }
    parts.push('<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="20" font-weight="650" ' +
      'style="fill:var(--text)">' + esc(opts.centreValue) + '</text>');
    parts.push('<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="11" ' +
      'style="fill:var(--viz-ink)">' + esc(opts.centreLabel) + '</text>');
    parts.push('</svg>');
    host.innerHTML = parts.join('');
    attachTips(host, rows);
  }

  /* Line chart — one or two series on one axis, optional flat reference. */
  function drawLine(host, opts) {
    var w = hostWidth(host, 640);
    var h = opts.height || (w < 480 ? 200 : 240);
    var padL = opts.padL || 54, padR = 54, padT = 12, padB = 30;
    var labels = opts.xLabels;
    var n = labels.length;
    var plotW = Math.max(40, w - padL - padR);
    var plotH = Math.max(40, h - padT - padB);

    var allVals = [];
    opts.series.forEach(function (s) { allVals = allVals.concat(s.values); });
    var maxV = Math.max.apply(null, allVals.concat([0]));
    var ticks = niceTicks(maxV, 5);
    var top = ticks[ticks.length - 1] || 1;

    function X(i) { return padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW); }
    function Y(v) { return padT + plotH - (v / top) * plotH; }

    var parts = ['<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
      '" role="img" aria-label="' + esc(opts.ariaLabel || 'Line chart') + '">'];

    ticks.forEach(function (t) {
      parts.push('<line x1="' + padL + '" y1="' + Y(t) + '" x2="' + (padL + plotW) + '" y2="' + Y(t) +
        '" style="stroke:var(--viz-grid)" stroke-width="1"></line>');
      parts.push('<text x="' + (padL - 8) + '" y="' + Y(t) + '" text-anchor="end" dominant-baseline="central" ' +
        'font-size="11" style="fill:var(--viz-ink);font-variant-numeric:tabular-nums">' +
        esc(opts.yFormat(t)) + '</text>');
    });
    parts.push('<line x1="' + padL + '" y1="' + Y(0) + '" x2="' + (padL + plotW) + '" y2="' + Y(0) +
      '" style="stroke:var(--viz-axis)" stroke-width="1"></line>');

    var every = n > 8 && w < 560 ? 2 : 1;
    labels.forEach(function (lab, i) {
      if (i % every !== 0 && i !== n - 1) return;
      parts.push('<text x="' + X(i) + '" y="' + (h - 10) + '" text-anchor="middle" font-size="11" ' +
        'style="fill:var(--viz-ink)">' + esc(lab) + '</text>');
    });

    opts.series.forEach(function (s) {
      var pts = s.values.map(function (v, i) { return X(i) + ',' + Y(v); });
      if (s.area) {
        parts.push('<path d="M' + X(0) + ',' + Y(0) + ' L' + pts.join(' L') + ' L' + X(n - 1) + ',' + Y(0) +
          ' Z" style="fill:var(' + s.colorVar + ');opacity:.10"></path>');
      }
      if (s.flat) {
        parts.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke-width="2" stroke-dasharray="6 5" ' +
          'style="stroke:var(' + s.colorVar + ')" stroke-linecap="round"></polyline>');
      } else {
        parts.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke-width="2" ' +
          'stroke-linejoin="round" stroke-linecap="round" style="stroke:var(' + s.colorVar + ')"></polyline>');
      }
    });

    opts.series.forEach(function (s) {
      if (s.flat) return;
      var lastX = X(n - 1), lastY = Y(s.values[n - 1]);
      parts.push('<circle cx="' + lastX + '" cy="' + lastY + '" r="4.5" style="fill:var(' + s.colorVar +
        ');stroke:var(--surface)" stroke-width="2"></circle>');
      parts.push('<text x="' + (lastX + 9) + '" y="' + lastY + '" dominant-baseline="central" font-size="11.5" ' +
        'font-weight="600" style="fill:var(--text);font-variant-numeric:tabular-nums">' +
        esc(opts.pointFormat(s.values[n - 1])) + '</text>');
    });

    parts.push('<line class="ch-cross" x1="0" y1="' + padT + '" x2="0" y2="' + (padT + plotH) +
      '" style="stroke:var(--viz-axis);visibility:hidden" stroke-width="1"></line>');
    parts.push('<rect class="ch-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH +
      '" fill="transparent"></rect>');
    parts.push('</svg>');
    host.innerHTML = parts.join('');

    var svg = el('svg', host);
    var hit = el('.ch-hit', host);
    var cross = el('.ch-cross', host);
    function idxFrom(evt) {
      var rect = svg.getBoundingClientRect();
      var scale = rect.width / w;
      var x = (evt.clientX - rect.left) / (scale || 1);
      var i = Math.round(((x - padL) / plotW) * (n - 1));
      return clamp(i, 0, n - 1);
    }
    hit.addEventListener('mousemove', function (evt) {
      var i = idxFrom(evt);
      cross.setAttribute('x1', X(i));
      cross.setAttribute('x2', X(i));
      cross.style.visibility = 'visible';
      tipShow(evt, tipRows(labels[i], opts.series.map(function (s) {
        return [s.name, opts.pointFormat(s.values[i])];
      })));
    });
    hit.addEventListener('mouseleave', function () {
      cross.style.visibility = 'hidden';
      tipHide();
    });
  }

  /* Dumbbell — two values per row on one shared rate axis. */
  function drawDumbbell(host, opts) {
    var rows = opts.rows;
    var w = hostWidth(host, 640);
    var labelW = clamp(Math.round(w * 0.28), 84, 150);
    var padR = 62;
    var plotW = Math.max(40, w - labelW - padR);
    var rowH = 38;
    var h = rows.length * rowH + 34;

    var vals = [];
    rows.forEach(function (r) { vals.push(r.a, r.b); });
    var lo = Math.floor((Math.min.apply(null, vals) - 12) / 10) * 10;
    var hi = Math.ceil((Math.max.apply(null, vals) + 12) / 10) * 10;
    if (hi <= lo) hi = lo + 100;
    function X(v) { return labelW + ((v - lo) / (hi - lo)) * plotW; }
    var charW = 6.6;
    var maxChars = Math.floor(labelW / charW);

    var parts = ['<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
      '" role="img" aria-label="' + esc(opts.ariaLabel || 'Dumbbell chart') + '">'];

    var step = (hi - lo) / 4;
    for (var t = lo; t <= hi + 0.01; t += step) {
      parts.push('<line x1="' + X(t) + '" y1="6" x2="' + X(t) + '" y2="' + (h - 26) +
        '" style="stroke:var(--viz-grid)" stroke-width="1"></line>');
      parts.push('<text x="' + X(t) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="11" ' +
        'style="fill:var(--viz-ink);font-variant-numeric:tabular-nums">' + esc(fmtRate(t)) + '</text>');
    }

    rows.forEach(function (r, i) {
      var y = 20 + i * rowH;
      parts.push('<text x="0" y="' + y + '" dominant-baseline="central" font-size="12.5" ' +
        'style="fill:var(--viz-ink)">' + esc(truncate(r.label, maxChars)) + '</text>');
      parts.push('<line x1="' + X(Math.min(r.a, r.b)) + '" y1="' + y + '" x2="' + X(Math.max(r.a, r.b)) +
        '" y2="' + y + '" style="stroke:var(--viz-axis)" stroke-width="2" stroke-linecap="round"></line>');
      parts.push('<circle cx="' + X(r.b) + '" cy="' + y + '" r="5" style="fill:var(--viz-2);stroke:var(--surface)" stroke-width="2"></circle>');
      parts.push('<circle cx="' + X(r.a) + '" cy="' + y + '" r="5" style="fill:var(--viz-1);stroke:var(--surface)" stroke-width="2"></circle>');
      var delta = (r.a - r.b) / r.b * 100;
      parts.push('<text x="' + (w - 4) + '" y="' + y + '" text-anchor="end" dominant-baseline="central" ' +
        'font-size="12" font-weight="600" style="fill:var(' + (delta > 0 ? '--bad-text' : '--good-text') +
        ');font-variant-numeric:tabular-nums">' + esc(fmtSignedPct(delta, 1)) + '</text>');
      parts.push('<rect data-i="' + i + '" x="0" y="' + (y - rowH / 2) + '" width="' + w + '" height="' + rowH +
        '" fill="transparent"></rect>');
    });

    parts.push('</svg>');
    host.innerHTML = parts.join('');
    attachTips(host, rows);
  }

  /* ============================== tables ================================ */

  function renderTable(table, cfg) {
    var cols = cfg.columns;
    var head = '<thead><tr>' + cols.map(function (c) {
      var isSorted = cfg.sortKey === c.key;
      var aria = isSorted ? ' aria-sort="' + (cfg.sortDir === 'asc' ? 'ascending' : 'descending') + '"' : '';
      var caret = isSorted ? (cfg.sortDir === 'asc' ? '▲' : '▼') : '';
      var cls = c.align === 'right' ? ' class="num"' : '';
      if (c.sortable === false) {
        return '<th' + cls + ' scope="col">' + esc(c.label) + '</th>';
      }
      return '<th' + cls + ' scope="col"' + aria + '><button type="button" class="sorter" data-key="' +
        esc(c.key) + '"><span>' + esc(c.label) + '</span><span class="sort-caret" aria-hidden="true">' +
        caret + '</span></button></th>';
    }).join('') + '</tr></thead>';

    var body;
    if (!cfg.rows.length) {
      body = '<tbody><tr><td colspan="' + cols.length + '"><div class="empty-state">' +
        '<p><strong>No results</strong></p><p>Nothing matches the current filters.</p>' +
        '<button type="button" class="btn secondary small" data-empty-reset>Reset filters</button>' +
        '</div></td></tr></tbody>';
    } else {
      body = '<tbody>' + cfg.rows.map(function (row, i) {
        var attrs = cfg.onRowClick ? ' class="rowlink" tabindex="0" data-row="' + i + '"' : '';
        if (cfg.rowClass && cfg.rowClass(row)) attrs = ' class="rowlink ' + cfg.rowClass(row) + '" tabindex="0" data-row="' + i + '"';
        return '<tr' + attrs + '>' + cols.map(function (c) {
          return '<td' + (c.align === 'right' ? ' class="num"' : '') + '>' + c.render(row) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
    }

    table.innerHTML = (cfg.caption ? '<caption>' + esc(cfg.caption) + '</caption>' : '') + head + body;

    els('button.sorter', table).forEach(function (btn) {
      btn.addEventListener('click', function () { cfg.onSort(btn.getAttribute('data-key')); });
    });
    var emptyReset = el('[data-empty-reset]', table);
    if (emptyReset && cfg.onReset) emptyReset.addEventListener('click', cfg.onReset);

    if (cfg.onRowClick) {
      els('tr[data-row]', table).forEach(function (tr) {
        var row = cfg.rows[Number(tr.getAttribute('data-row'))];
        tr.addEventListener('click', function () { cfg.onRowClick(row, tr); });
        tr.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cfg.onRowClick(row, tr); }
        });
      });
    }
  }

  function toggleSort(store, key, defaultDir) {
    if (store.key === key) store.dir = store.dir === 'asc' ? 'desc' : 'asc';
    else { store.key = key; store.dir = defaultDir || 'asc'; }
  }

  function sortRows(rows, key, dir, accessors) {
    var get = accessors[key] || function (r) { return r[key]; };
    return rows.slice().sort(function (a, b) {
      var va = get(a), vb = get(b);
      if (typeof va === 'string' && typeof vb === 'string') {
        return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return dir === 'asc' ? va - vb : vb - va;
    });
  }

  function staticTable(columns, rows) {
    return '<table><thead><tr>' + columns.map(function (c) {
      return '<th' + (c.align === 'right' ? ' class="num"' : '') + ' scope="col">' + esc(c.label) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      return '<tr>' + columns.map(function (c) {
        return '<td' + (c.align === 'right' ? ' class="num"' : '') + '>' + c.render(r) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }

  /* ========================= slide-over & toast ========================= */

  var slideoverReturn = null;

  function openSlideover(kicker, title, bodyHTML, returnEl) {
    slideoverReturn = returnEl || document.activeElement;
    $('slideover-kicker').textContent = kicker;
    $('slideover-title').textContent = title;
    $('slideover-body').innerHTML = bodyHTML;
    var ov = $('overlay'), so = $('slideover');
    ov.hidden = false; so.hidden = false;
    window.requestAnimationFrame(function () { ov.classList.add('open'); so.classList.add('open'); });
    $('slideover-close').focus();
    document.addEventListener('keydown', slideoverKeys, true);
  }

  function closeSlideover() {
    var ov = $('overlay'), so = $('slideover');
    if (so.hidden) return;
    ov.classList.remove('open'); so.classList.remove('open');
    document.removeEventListener('keydown', slideoverKeys, true);
    window.setTimeout(function () { ov.hidden = true; so.hidden = true; }, 180);
    if (slideoverReturn && document.contains(slideoverReturn)) slideoverReturn.focus();
    slideoverReturn = null;
  }

  function slideoverKeys(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSlideover(); return; }
    if (e.key !== 'Tab') return;
    var so = $('slideover');
    var focusables = els('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])', so)
      .filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!so.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  function showToast(html) {
    var region = $('toast-region');
    var node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = html;
    region.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 6000);
  }

  /* ============================= routing ================================ */

  function readHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var bits = raw.split('/');
    var view = bits[0] === 'firm' ? 'firm' : 'agency';
    var tabs = VIEWS[view];
    var tab = bits[1] || '';
    var found = tabs.filter(function (t) { return t.id === tab; })[0];
    return { view: view, tab: found ? found.id : tabs[0].id };
  }

  function writeHash() {
    var next = '#' + state.view + '/' + state.tab;
    if (location.hash !== next) location.hash = next;
  }

  function renderTabbar() {
    var tabs = VIEWS[state.view];
    $('tabbar').innerHTML = tabs.map(function (t) {
      var sel = t.id === state.tab;
      return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" aria-controls="' + t.panel +
        '" aria-selected="' + sel + '" tabindex="' + (sel ? '0' : '-1') + '" data-tab="' + t.id + '">' +
        esc(t.label) + '</button>';
    }).join('');
    els('.tab', $('tabbar')).forEach(function (btn) {
      btn.addEventListener('click', function () { go(state.view, btn.getAttribute('data-tab')); });
      btn.addEventListener('keydown', function (e) {
        var ids = tabs.map(function (t) { return t.id; });
        var i = ids.indexOf(btn.getAttribute('data-tab'));
        var next = null;
        if (e.key === 'ArrowRight') next = ids[(i + 1) % ids.length];
        if (e.key === 'ArrowLeft') next = ids[(i - 1 + ids.length) % ids.length];
        if (e.key === 'Home') next = ids[0];
        if (e.key === 'End') next = ids[ids.length - 1];
        if (next) {
          e.preventDefault();
          go(state.view, next);
          var target = $('tab-' + next);
          if (target) target.focus();
        }
      });
    });
  }

  function renderContext() {
    var strip = $('context-strip');
    if (state.view === 'agency') {
      strip.innerHTML = 'Signed in as <strong>' + esc(D.AGENCY.name) + '</strong> · ' +
        esc(D.AGENCY.panelName) + ' · ABN ' + esc(D.AGENCY.abn) +
        ' · <span>' + esc(D.FIRMS.length) + ' panel firms</span>';
    } else {
      strip.innerHTML = 'Signed in as <strong>' + esc(FIRM.name) + '</strong> · ' + esc(FIRM.tier) +
        ' panel firm · ABN ' + esc(FIRM.abn) + ' · ' + esc(FIRM.offices) +
        ' · viewing the ' + esc(D.AGENCY.shortName) + ' panel';
    }
  }

  function go(view, tab) {
    state.view = view;
    state.tab = tab;
    writeHash();
    apply();
  }

  function apply() {
    els('[data-view]', $('perspective')).forEach(function (b) {
      var on = b.getAttribute('data-view') === state.view;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    renderTabbar();
    renderContext();

    var tabs = VIEWS[state.view];
    var active = tabs.filter(function (t) { return t.id === state.tab; })[0] || tabs[0];
    ['panel-spend', 'panel-allocate', 'panel-benchmarks', 'panel-performance', 'panel-about'].forEach(function (id) {
      $(id).hidden = id !== active.panel;
    });
    $(active.panel).setAttribute('aria-labelledby', 'tab-' + active.id);

    resetCharts();
    if (active.id === 'spend') renderSpend();
    if (active.id === 'allocate') renderAllocate();
    if (active.id === 'benchmarks') renderBenchmarks();
    if (active.id === 'performance') renderPerformance();
    if (active.id === 'about') renderAbout();
  }

  /* ====================== screen 1: spend dashboard ===================== */

  function renderSpend() {
    var f = state.dash;
    var list = dashMatters();
    var fyDef = D.FISCAL_YEARS.filter(function (y) { return y.id === f.fy; })[0];
    var typeSuffix = f.type === 'all' ? 'all matter types' : f.type + ' matters';

    /* KPI tiles */
    var total = sum(list.map(function (m) { return m.value; }));
    var count = list.length;
    var avgDays = count ? mean(list.map(function (m) { return m.days; })) : 0;
    var firmsUsed = uniq(list.map(function (m) { return m.firmId; })).length;

    var prior = null;
    if (fyDef && fyDef.prior) {
      var pl = D.MATTERS.filter(function (m) {
        return m.fy === fyDef.prior && (f.type === 'all' || m.type === f.type);
      });
      prior = {
        total: sum(pl.map(function (m) { return m.value; })),
        count: pl.length,
        avgDays: pl.length ? mean(pl.map(function (m) { return m.days; })) : 0,
        firms: uniq(pl.map(function (m) { return m.firmId; })).length
      };
    }

    function deltaBadge(now, then, invert, unit) {
      if (then === null || then === undefined || !then) return '';
      var pct = (now - then) / then * 100;
      var good = invert ? pct < 0 : pct > 0;
      if (Math.abs(pct) < 0.05) return '<span class="badge">no change vs ' + esc(fyDef.prior) + '</span>';
      return '<span class="badge ' + (good ? 'good' : 'bad') + '">' + fmtSignedPct(pct, 1) +
        ' vs ' + esc(fyDef.prior) + '</span>' + (unit || '');
    }

    $('kpi-grid').innerHTML = [
      kpi(f.fy + ' spend', fmtCompact(total), deltaBadge(total, prior && prior.total, false),
        fmtMoney(total) + ' across ' + count + ' matters'),
      kpi('Matters allocated', String(count), deltaBadge(count, prior && prior.count, false),
        typeSuffix + ' in ' + f.fy),
      kpi('Avg days to allocate', avgDays.toFixed(1), deltaBadge(avgDays, prior && prior.avgDays, true),
        'request lodged to firm engaged'),
      kpi('Panel utilisation', firmsUsed + ' of ' + D.FIRMS.length,
        '<span class="badge accent">' + fmtPct(firmsUsed / D.FIRMS.length * 100, 0) + ' of panel</span>',
        'firms with at least one allocation')
    ].join('');

    /* Chart 1 — spend by panel firm */
    var byFirm = groupSum(list, function (m) { return m.firmId; });
    var firmRows = D.FIRMS.map(function (fm) {
      var v = byFirm[fm.id] || 0;
      var n = list.filter(function (m) { return m.firmId === fm.id; }).length;
      return {
        key: fm.id, label: fm.name, value: v, valueLabel: fmtCompact(v),
        tip: tipRows(fm.name, [
          ['Spend', fmtMoney(v)],
          ['Matters', String(n)],
          ['Share of ' + f.fy, total ? fmtPct(v / total * 100, 1) : '0.0%'],
          ['Capacity in use', fm.util + '%']
        ])
      };
    }).sort(function (a, b) { return b.value - a.value; });

    $('s-firms').textContent = 'AUD allocated per firm, ' + f.fy + ', ' + typeSuffix +
      '. Sorted high to low. Total ' + fmtMoney(total) + '.';
    registerChart(function () {
      drawHBar($('chart-firms'), {
        rows: firmRows, colorVar: '--viz-1',
        ariaLabel: 'Spend by panel firm, ' + f.fy + '. ' + firmRows.map(function (r) {
          return r.label + ' ' + fmtMoney(r.value);
        }).join('; ')
      });
    });
    $('dt-firms').innerHTML = staticTable([
      { label: 'Panel firm', render: function (r) { return esc(r.label); } },
      { label: 'Spend', align: 'right', render: function (r) { return fmtMoney(r.value); } },
      { label: 'Share', align: 'right', render: function (r) { return total ? fmtPct(r.value / total * 100, 1) : '—'; } }
    ], firmRows) + '<p class="card-sub" style="margin-top:8px">Total ' + fmtMoney(total) + '.</p>';

    /* Chart 2 — spend by matter type (donut) */
    var vizSlots = ['--viz-c1', '--viz-c2', '--viz-c3', '--viz-c4', '--viz-c5'];
    var byType = groupSum(list, function (m) { return m.type; });
    var typeRows = D.MATTER_TYPES.map(function (t, i) {
      var v = byType[t] || 0;
      var n = list.filter(function (m) { return m.type === t; }).length;
      return {
        key: t, label: t, value: v, colorVar: vizSlots[i],
        tip: tipRows(t, [
          ['Spend', fmtMoney(v)],
          ['Matters', String(n)],
          ['Share', total ? fmtPct(v / total * 100, 1) : '0.0%']
        ])
      };
    }).filter(function (r) { return f.type === 'all' || r.key === f.type; });

    $('s-types').textContent = 'Share of ' + f.fy + ' panel spend by matter type. Total ' + fmtMoney(total) + '.';
    registerChart(function () {
      drawDonut($('chart-types'), {
        rows: typeRows, centreValue: fmtCompact(total), centreLabel: f.fy + ' spend',
        ariaLabel: 'Spend by matter type. ' + typeRows.map(function (r) {
          return r.label + ' ' + fmtMoney(r.value);
        }).join('; ')
      });
    });
    $('key-types').innerHTML = typeRows.map(function (r) {
      return '<li><span class="legend-swatch" style="background:var(' + r.colorVar + ')"></span>' +
        '<span class="k-name">' + esc(r.label) + '</span>' +
        '<span class="k-val">' + fmtCompact(r.value) + '</span>' +
        '<span class="k-pct">' + (total ? fmtPct(r.value / total * 100, 0) : '—') + '</span></li>';
    }).join('') || '<li class="muted">No matters in this slice.</li>';
    $('dt-types').innerHTML = staticTable([
      { label: 'Matter type', render: function (r) { return esc(r.label); } },
      { label: 'Spend', align: 'right', render: function (r) { return fmtMoney(r.value); } },
      { label: 'Share', align: 'right', render: function (r) { return total ? fmtPct(r.value / total * 100, 1) : '—'; } }
    ], typeRows) + '<p class="card-sub" style="margin-top:8px">Total ' + fmtMoney(total) + '.</p>';

    /* Chart 3 — monthly trend */
    var months = fyMonths(f.fy);
    var byMonth = groupSum(list, function (m) { return m.month; });
    var monthValues = months.map(function (mm) { return byMonth[mm] || 0; });
    var monthCounts = months.map(function (mm) {
      return list.filter(function (m) { return m.month === mm; }).length;
    });

    $('s-trend').textContent = 'AUD allocated per month, ' + f.fy + ', ' + typeSuffix +
      '. The twelve months sum to ' + fmtMoney(sum(monthValues)) + '.';
    registerChart(function () {
      drawLine($('chart-trend'), {
        xLabels: months.map(monthLabel),
        series: [{ name: 'Panel spend', values: monthValues, colorVar: '--viz-1', area: true }],
        yFormat: fmtCompact,
        pointFormat: fmtCompact,
        ariaLabel: 'Monthly panel spend for ' + f.fy
      });
    });
    $('dt-trend').innerHTML = staticTable([
      { label: 'Month', render: function (r) { return esc(r.label); } },
      { label: 'Matters', align: 'right', render: function (r) { return String(r.count); } },
      { label: 'Spend', align: 'right', render: function (r) { return fmtMoney(r.value); } }
    ], months.map(function (mm, i) {
      return { label: monthLabel(mm), value: monthValues[i], count: monthCounts[i] };
    })) + '<p class="card-sub" style="margin-top:8px">Total ' + fmtMoney(sum(monthValues)) + '.</p>';

    $('f-reset').hidden = f.fy === 'FY26' && f.type === 'all';
  }

  function kpi(label, value, badge, caption) {
    return '<div class="kpi"><div class="kpi-label">' + esc(label) + '</div>' +
      '<div class="kpi-value">' + esc(value) + '</div>' +
      '<div class="kpi-foot">' + (badge || '') + '<span>' + esc(caption) + '</span></div></div>';
  }

  /* ====================== screen 2: allocate a matter =================== */

  function renderAllocate() {
    renderRecentTable();
    if (state.lastRecommendation) renderRecommendations(state.lastRecommendation);
    else {
      $('rec-region').innerHTML = '';
    }
    $('a-hint').textContent = 'Nine panel firms scored. Conflicts are applied before ranking.';
  }

  function currentParams() {
    return {
      title: $('a-title').value.trim(),
      type: $('a-type').value,
      complexity: $('a-complexity').value,
      band: $('a-band').value,
      requiredBy: $('a-required').value || '2026-10-16',
      excluded: els('#a-exclusions input:checked').map(function (i) { return i.value; })
    };
  }

  function renderRecommendations(payload) {
    var params = payload.params;
    var result = payload.result;
    var w = result.weights;
    var days = daysUntil(params.requiredBy);

    var weightLine = 'Weighting applied for a <b>' + esc(params.complexity.toLowerCase()) +
      '-complexity ' + esc(params.type) + '</b> matter in the <b>' + esc(params.band) + '</b> band, due in ' +
      days + ' days: past performance ' + Math.round(w.perf * 100) + '%, capacity ' + Math.round(w.cap * 100) +
      '%, rate ' + Math.round(w.rate * 100) + '%, service record ' + Math.round(w.service * 100) + '%.';

    var cards = result.ranked.map(function (r, i) {
      return '<div class="rec-card' + (i === 0 ? ' top' : '') + '">' +
        '<div class="rec-head">' +
          '<span class="rec-rank">' + (i + 1) + '</span>' +
          '<div style="min-width:0">' +
            '<div class="rec-name">' + esc(r.firm.name) + '</div>' +
            '<div class="rec-meta">' + esc(r.firm.tier) + ' · ' + esc(r.firm.offices) + ' · ' +
              r.firm.partners + ' partners · <span class="badge good">Conflict check clear</span></div>' +
          '</div>' +
          '<div class="rec-score"><div class="rec-score-value">' + r.composite.toFixed(1) + '</div>' +
            '<div class="rec-score-label">Composite</div></div>' +
        '</div>' +
        '<div class="meter"><i style="width:' + r.composite.toFixed(1) + '%"></i></div>' +
        '<div class="rationale">' + r.parts.map(function (p) {
          return '<div class="rat">' +
            '<div class="rat-top"><span class="rat-name">' + esc(p.name) + '</span>' +
              '<span class="rat-score">' + p.score + '<span class="muted"> / 100 · w ' +
              Math.round(p.weight * 100) + '%</span></span></div>' +
            '<div class="meter thin"><i style="width:' + p.score + '%"></i></div>' +
            '<div class="rat-fact">' + p.fact + '</div>' +
          '</div>';
        }).join('') + '</div>' +
        '<div class="rec-actions">' +
          '<button type="button" class="btn' + (i === 0 ? '' : ' secondary') + '" data-allocate="' + r.firmId + '">' +
            'Allocate to ' + esc(r.firm.name) + '</button>' +
          (i === 0 ? '<span class="muted" style="font-size:0.8125rem">Top recommendation — you can allocate to any firm.</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    var blockedHTML = result.blocked.length ? '<div class="card" style="margin-top:16px">' +
      '<div class="card-head"><h3 class="card-title">Not available for this matter</h3></div>' +
      '<p class="card-sub">Removed before ranking. Conflict status is part of the recommendation, not an afterthought.</p>' +
      result.blocked.map(function (b) {
        return '<div class="rec-card blocked" style="margin-bottom:8px"><div class="rec-head">' +
          '<span class="rec-rank">—</span><div style="min-width:0">' +
          '<div class="rec-name">' + esc(b.firm.name) + '</div>' +
          '<div class="rec-meta">' + esc(b.reason) + '</div></div>' +
          '<div class="rec-score"><span class="badge bad">Blocked</span></div></div></div>';
      }).join('') + '</div>' : '';

    $('rec-region').innerHTML =
      '<div class="card" style="margin-top:24px">' +
        '<div class="card-head"><h3 class="card-title">Recommended panel firms</h3>' +
          '<span class="muted" style="font-size:0.8125rem">' + result.ranked.length + ' of ' + D.FIRMS.length +
          ' firms available</span></div>' +
        '<p class="card-sub">' + esc(params.title || 'Untitled matter') + ' · ' + esc(params.type) +
          ' · ' + esc(params.complexity) + ' complexity · ' + esc(params.band) +
          ' · required by ' + esc(fmtDate(params.requiredBy)) + '</p>' +
        '<div class="rec-list">' + cards + '</div>' +
        '<p class="weights-note">' + weightLine + '</p>' +
      '</div>' + blockedHTML;

    els('[data-allocate]', $('rec-region')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        allocateTo(btn.getAttribute('data-allocate'), payload);
      });
    });
  }

  function allocateTo(firmId, payload) {
    var params = payload.params;
    var entry = payload.result.ranked.filter(function (r) { return r.firmId === firmId; })[0];
    var rank = payload.result.ranked.indexOf(entry) + 1;
    state.seq += 1;
    var rec = {
      id: 'M-' + state.seq,
      title: params.title || ('New ' + params.type + ' matter'),
      type: params.type,
      firmId: firmId,
      complexity: params.complexity,
      band: params.band,
      date: TODAY,
      requiredBy: params.requiredBy,
      excluded: params.excluded.slice(),
      score: entry.composite,
      rank: rank,
      isNew: true
    };
    state.recent.unshift(rec);
    state.lastRecommendation = null;
    $('rec-region').innerHTML = '';
    renderRecentTable(rec.id);
    showToast('<b>' + esc(rec.id) + '</b> allocated to <b>' + esc(firmName(firmId)) +
      '</b> — composite ' + entry.composite.toFixed(1) + ', ranked ' + rank + ' of ' +
      payload.result.ranked.length + '. Added to Recent allocations.');
  }

  function filteredRecent() {
    return state.recent.filter(function (r) {
      if (state.recentFilters.type !== 'all' && r.type !== state.recentFilters.type) return false;
      if (state.recentFilters.firm !== 'all' && r.firmId !== state.recentFilters.firm) return false;
      return true;
    });
  }

  function renderRecentTable(flashId) {
    var s = state.sort.recent;
    var rows = sortRows(filteredRecent(), s.key, s.dir, {
      date: function (r) { return r.date; },
      firm: function (r) { return firmName(r.firmId); },
      score: function (r) { return r.score; },
      title: function (r) { return r.title; },
      type: function (r) { return r.type; },
      id: function (r) { return r.id; }
    });

    $('r-count').textContent = rows.length + ' of ' + state.recent.length + ' allocations';
    $('r-reset').hidden = state.recentFilters.type === 'all' && state.recentFilters.firm === 'all';

    renderTable($('recent-table'), {
      caption: 'Allocations made through PanelFlow this financial year.',
      sortKey: s.key, sortDir: s.dir,
      columns: [
        { key: 'id', label: 'ID', render: function (r) { return '<span class="num">' + esc(r.id) + '</span>' + (r.isNew ? ' <span class="badge accent">New</span>' : ''); } },
        { key: 'title', label: 'Matter', render: function (r) { return esc(r.title); } },
        { key: 'type', label: 'Type', render: function (r) { return esc(r.type); } },
        { key: 'firm', label: 'Allocated to', render: function (r) { return esc(firmName(r.firmId)); } },
        { key: 'complexity', label: 'Complexity', render: function (r) { return esc(r.complexity); } },
        { key: 'band', label: 'Value band', render: function (r) { return esc(r.band); } },
        { key: 'date', label: 'Allocated', render: function (r) { return esc(fmtDate(r.date)); } },
        { key: 'score', label: 'Score', align: 'right', render: function (r) { return r.score.toFixed(1); } }
      ],
      rows: rows,
      onSort: function (key) { toggleSort(s, key, key === 'score' || key === 'date' ? 'desc' : 'asc'); renderRecentTable(); },
      onReset: function () {
        state.recentFilters = { type: 'all', firm: 'all' };
        $('r-type').value = 'all'; $('r-firm').value = 'all';
        renderRecentTable();
      },
      onRowClick: function (r, tr) { openRecentDetail(r, tr); }
    });

    if (flashId) {
      var idx = -1;
      rows.forEach(function (r, i) { if (r.id === flashId) idx = i; });
      if (idx >= 0) {
        var tr = el('tr[data-row="' + idx + '"]', $('recent-table'));
        if (tr) {
          tr.classList.add('flash');
          tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  }

  function openRecentDetail(r, tr) {
    var params = {
      type: r.type, complexity: r.complexity, band: r.band,
      requiredBy: r.requiredBy, excluded: r.excluded || []
    };
    var res = recommend(params);
    var chosen = res.ranked.filter(function (x) { return x.firmId === r.firmId; })[0];
    var rank = chosen ? res.ranked.indexOf(chosen) + 1 : null;

    var body = '<dl class="detail-list">' +
      row('Matter ID', r.id) +
      row('Matter type', r.type) +
      row('Complexity', r.complexity) +
      row('Estimated value', r.band) +
      row('Allocated to', firmName(r.firmId)) +
      row('Allocated on', fmtDate(r.date)) +
      row('Required by', fmtDate(r.requiredBy)) +
      row('Composite score', r.score.toFixed(1) + ' / 100') +
      row('Rank at allocation', rank ? rank + ' of ' + res.ranked.length : '—') +
      row('Firms excluded', (r.excluded && r.excluded.length) ? r.excluded.map(firmName).join(', ') : 'None') +
      '</dl>';

    if (chosen) {
      body += '<h3 style="margin-top:24px;font-size:0.9375rem">Why this firm scored ' + chosen.composite.toFixed(1) + '</h3>' +
        '<div class="rationale">' + chosen.parts.map(function (p) {
          return '<div class="rat"><div class="rat-top"><span class="rat-name">' + esc(p.name) + '</span>' +
            '<span class="rat-score">' + p.score + '</span></div>' +
            '<div class="meter thin"><i style="width:' + p.score + '%"></i></div>' +
            '<div class="rat-fact">' + p.fact + '</div></div>';
        }).join('') + '</div>';
    }
    if (res.blocked.length) {
      body += '<h3 style="margin-top:24px;font-size:0.9375rem">Blocked at conflict check</h3>' +
        '<dl class="detail-list">' + res.blocked.map(function (b) {
          return row(b.firm.name, b.reason);
        }).join('') + '</dl>';
    }
    openSlideover('Allocation record', r.title, body, tr);
  }

  function row(k, v) {
    return '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>';
  }

  /* ======================= screen 3: benchmarks ========================= */

  function benchAggregate() {
    return D.MATTER_TYPES.map(function (t) {
      var rows = D.BENCHMARKS.filter(function (b) { return b.type === t; });
      var totalSample = sum(rows.map(function (b) { return b.sample; }));
      var a = sum(rows.map(function (b) { return b.agencyRate * b.sample; })) / totalSample;
      var b2 = sum(rows.map(function (b) { return b.crossRate * b.sample; })) / totalSample;
      return { label: t, a: Math.round(a * 10) / 10, b: Math.round(b2 * 10) / 10, sample: totalSample };
    });
  }

  function renderBenchmarks() {
    var totalSample = sum(D.BENCHMARKS.map(function (b) { return b.sample; }));
    $('bench-callout').innerHTML = '<h3>Benchmarks built from allocation flow across ' + D.CROSS_AGENCY_COUNT +
      ' agencies — data nobody else holds.</h3>' +
      '<p>' + totalSample.toLocaleString('en-AU') + ' matters of rate evidence, assembled from the allocations that ran ' +
      'through PanelFlow rather than from a survey. Your firms cannot see it, your department could not build it alone, ' +
      'and no incumbent holds it. It is the by-product of running the allocation, not a separate product.</p>';

    var agg = benchAggregate();
    agg.forEach(function (r) {
      r.tip = tipRows(r.label, [
        ['This agency', fmtRate(r.a) + '/hr'],
        ['Cross-agency median', fmtRate(r.b) + '/hr'],
        ['Delta', fmtSignedPct((r.a - r.b) / r.b * 100, 1)],
        ['Sample', r.sample.toLocaleString('en-AU') + ' matters']
      ]);
    });

    $('s-bench').textContent = 'Sample-weighted blended rate across all five seniority levels, ' +
      'AUD per hour. Delta at the right is this agency against the median.';
    registerChart(function () {
      drawDumbbell($('chart-bench'), {
        rows: agg,
        ariaLabel: 'This agency versus cross-agency median blended rate by matter type. ' +
          agg.map(function (r) { return r.label + ': agency ' + fmtRate(r.a) + ', median ' + fmtRate(r.b); }).join('; ')
      });
    });
    $('legend-bench').innerHTML =
      '<span class="legend-item"><span class="legend-swatch" style="background:var(--viz-1);border-radius:999px"></span>' +
        '<b>' + esc(D.AGENCY.shortName) + '</b> blended rate</span>' +
      '<span class="legend-item"><span class="legend-swatch" style="background:var(--viz-2);border-radius:999px"></span>' +
        '<b>Cross-agency median</b> (' + D.CROSS_AGENCY_COUNT + ' agencies)</span>';
    $('dt-bench').innerHTML = staticTable([
      { label: 'Matter type', render: function (r) { return esc(r.label); } },
      { label: 'This agency', align: 'right', render: function (r) { return fmtRate(r.a); } },
      { label: 'Cross-agency median', align: 'right', render: function (r) { return fmtRate(r.b); } },
      { label: 'Delta', align: 'right', render: function (r) { return fmtSignedPct((r.a - r.b) / r.b * 100, 1); } },
      { label: 'Sample', align: 'right', render: function (r) { return r.sample.toLocaleString('en-AU'); } }
    ], agg);

    renderBenchTable();
  }

  function filteredBench() {
    var q = state.bench.q.toLowerCase();
    return D.BENCHMARKS.filter(function (b) {
      if (state.bench.type !== 'all' && b.type !== state.bench.type) return false;
      if (state.bench.sen !== 'all' && b.seniority !== state.bench.sen) return false;
      if (q && (b.type + ' ' + b.seniority).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function benchDelta(b) { return (b.agencyRate - b.crossRate) / b.crossRate * 100; }

  function renderBenchTable() {
    var s = state.sort.bench;
    var rows = sortRows(filteredBench(), s.key, s.dir, {
      type: function (b) { return b.type; },
      seniority: function (b) { return D.SENIORITIES.indexOf(b.seniority); },
      agencyRate: function (b) { return b.agencyRate; },
      crossRate: function (b) { return b.crossRate; },
      delta: benchDelta,
      sample: function (b) { return b.sample; }
    });

    $('b-count').textContent = rows.length + ' of ' + D.BENCHMARKS.length + ' rate lines';
    var active = state.bench.type !== 'all' || state.bench.sen !== 'all' || state.bench.q !== '';
    $('b-reset').hidden = !active;

    renderTable($('bench-table'), {
      caption: 'Blended hourly rates in AUD. Cross-agency median drawn from ' + D.CROSS_AGENCY_COUNT + ' agencies.',
      sortKey: s.key, sortDir: s.dir,
      columns: [
        { key: 'type', label: 'Matter type', render: function (b) { return esc(b.type); } },
        { key: 'seniority', label: 'Seniority', render: function (b) { return esc(b.seniority); } },
        { key: 'agencyRate', label: 'This agency', align: 'right', render: function (b) { return fmtRate(b.agencyRate); } },
        { key: 'crossRate', label: 'Cross-agency median', align: 'right', render: function (b) { return fmtRate(b.crossRate); } },
        {
          key: 'delta', label: 'Delta', align: 'right', render: function (b) {
            var d = benchDelta(b);
            return '<span class="badge ' + (d > 0 ? 'bad' : d < 0 ? 'good' : '') + '">' + fmtSignedPct(d, 1) + '</span>';
          }
        },
        { key: 'sample', label: 'Sample', align: 'right', render: function (b) { return b.sample.toLocaleString('en-AU'); } }
      ],
      rows: rows,
      onSort: function (key) { toggleSort(s, key, key === 'type' || key === 'seniority' ? 'asc' : 'desc'); renderBenchTable(); },
      onReset: resetBench,
      onRowClick: function (b, tr) {
        var d = benchDelta(b);
        var body = '<dl class="detail-list">' +
          row('Matter type', b.type) +
          row('Seniority', b.seniority) +
          row('This agency', fmtRate(b.agencyRate) + '/hr') +
          row('Cross-agency median', fmtRate(b.crossRate) + '/hr') +
          row('Delta', fmtSignedPct(d, 1)) +
          row('Annualised gap at 1,000 hrs', fmtMoney((b.agencyRate - b.crossRate) * 1000)) +
          row('Sample', b.sample.toLocaleString('en-AU') + ' matters') +
          row('Agencies contributing', String(D.CROSS_AGENCY_COUNT)) +
          '</dl><p style="margin-top:16px;font-size:0.875rem" class="muted">' +
          (d > 0
            ? 'This agency pays above the cross-agency median for ' + esc(b.seniority.toLowerCase()) +
              ' time on ' + esc(b.type.toLowerCase()) + ' matters. At the panel’s current volume that gap is ' +
              'the single clearest lever in the next re-tender.'
            : 'This agency is at or below the cross-agency median for this line. Worth holding as a floor in the next re-tender.') +
          '</p>';
        openSlideover('Rate benchmark', b.type + ' · ' + b.seniority, body, tr);
      }
    });
  }

  function resetBench() {
    state.bench = { type: 'all', sen: 'all', q: '' };
    $('b-type').value = 'all'; $('b-sen').value = 'all'; $('b-search').value = '';
    renderBenchTable();
  }

  /* ====================== screen 4: firm performance ==================== */

  function firmWinStats(type) {
    var sl = shortlistsFor(FIRM.id, type);
    var wins = sl.filter(function (m) { return m.firmId === FIRM.id; });
    return { shortlisted: sl.length, won: wins.length, rate: sl.length ? wins.length / sl.length * 100 : 0 };
  }

  function lostMatters() {
    return shortlistsFor(FIRM.id, null).filter(function (m) { return m.firmId !== FIRM.id; }).map(function (m) {
      var mine = m.bids[m.shortlist.indexOf(FIRM.id)];
      var winning = m.rate;
      return {
        matter: m, id: m.id, title: m.title, type: m.type, fy: m.fy,
        mine: mine, winner: m.firmId, winning: winning,
        delta: (winning - mine) / mine * 100
      };
    });
  }

  function rollingShare(months, own, all, window) {
    return months.map(function (mm, i) {
      var lo = Math.max(0, i - window + 1);
      var o = 0, a = 0;
      for (var j = lo; j <= i; j++) { o += own[j]; a += all[j]; }
      return a > 0 ? o / a * 100 : 0;
    });
  }

  function renderPerformance() {
    var panelAvgShare = 100 / D.FIRMS.length;
    var fy = 'FY26';
    var fyList = mattersByFY(fy);
    var fyTotal = sum(fyList.map(function (m) { return m.value; }));
    var mine = fyList.filter(function (m) { return m.firmId === FIRM.id; });
    var mineTotal = sum(mine.map(function (m) { return m.value; }));
    var overall = firmWinStats(null);

    $('perf-intro').textContent = 'You are ' + FIRM.name + ', a ' + FIRM.tier.toLowerCase() +
      ' firm on the ' + D.AGENCY.name + ' panel. This is the demand side you cannot normally see: ' +
      'what you were shortlisted for, what you quoted, and what the winning firm quoted instead.';

    /* KPI row */
    $('firm-kpis').innerHTML = [
      kpi(fy + ' work won', fmtCompact(mineTotal),
        '<span class="badge accent">' + mine.length + ' matters</span>',
        'the ' + FIRM.name + ' bar on the agency dashboard'),
      kpi('Share of panel spend', fmtPct(mineTotal / fyTotal * 100, 1),
        '<span class="badge ' + (mineTotal / fyTotal * 100 >= panelAvgShare ? 'good' : 'bad') + '">' +
          fmtSignedPct(mineTotal / fyTotal * 100 - panelAvgShare, 1) + ' vs panel average</span>',
        'panel average is ' + fmtPct(panelAvgShare, 1) + ' across ' + D.FIRMS.length + ' firms'),
      kpi('Win rate when shortlisted', fmtPct(overall.rate, 0),
        '<span class="badge ' + (overall.rate >= 25 ? 'good' : 'bad') + '">' +
          fmtSignedPct(overall.rate - 25, 0) + ' vs 1-in-4</span>',
        overall.won + ' wins from ' + overall.shortlisted + ' shortlists, FY25–FY26'),
      kpi('Median response time', FIRM.respHrs + 'h',
        '<span class="badge good">fastest on panel</span>',
        FIRM.slaPct + '% inside the 48h SLA')
    ].join('');

    /* Win rate by matter type */
    var winRows = D.MATTER_TYPES.map(function (t) {
      var st = firmWinStats(t);
      return {
        key: t, label: t, value: st.rate, valueLabel: fmtPct(st.rate, 0) + ' (' + st.won + '/' + st.shortlisted + ')',
        won: st.won, shortlisted: st.shortlisted,
        tip: tipRows(t, [
          ['Win rate', fmtPct(st.rate, 1)],
          ['Won', String(st.won)],
          ['Shortlisted', String(st.shortlisted)],
          ['Panel expectation', '25.0% (1 of 4 shortlisted)']
        ])
      };
    }).sort(function (a, b) { return b.value - a.value; });

    $('s-winrate').textContent = 'Share of shortlists you converted, FY25 and FY26 combined. ' +
      'With four firms shortlisted per matter, an average firm converts one in four.';
    registerChart(function () {
      drawHBar($('chart-winrate'), {
        rows: winRows, colorVar: '--viz-1', valueW: 96,
        ariaLabel: 'Win rate by matter type. ' + winRows.map(function (r) {
          return r.label + ' ' + fmtPct(r.value, 0);
        }).join('; ')
      });
    });
    $('legend-winrate').innerHTML =
      '<span class="legend-item"><span class="legend-swatch" style="background:var(--viz-1)"></span>' +
        '<b>Your win rate</b> — value shown as percentage and won / shortlisted</span>';
    $('dt-winrate').innerHTML = staticTable([
      { label: 'Matter type', render: function (r) { return esc(r.label); } },
      { label: 'Shortlisted', align: 'right', render: function (r) { return String(r.shortlisted); } },
      { label: 'Won', align: 'right', render: function (r) { return String(r.won); } },
      { label: 'Win rate', align: 'right', render: function (r) { return fmtPct(r.value, 1); } }
    ], winRows);

    var worst = winRows.slice().sort(function (a, b) { return a.value - b.value; })[0];
    var lost = lostMatters();
    var worstLost = lost.filter(function (l) { return l.type === worst.key; });
    var worstMine = median(worstLost.map(function (l) { return l.mine; }));
    var worstWin = median(worstLost.map(function (l) { return l.winning; }));
    var ratingRank = D.FIRMS.map(function (f) { return { id: f.id, r: D.PERFORMANCE[f.id][worst.key] }; })
      .sort(function (a, b) { return b.r - a.r; })
      .map(function (x) { return x.id; }).indexOf(FIRM.id) + 1;

    var worstGap = (worstMine - worstWin) / worstWin * 100;
    var verdict;
    if (worstGap > 3 && ratingRank <= 4) {
      verdict = 'You are losing this practice area on rate, not on performance.';
    } else if (worstGap > 3) {
      verdict = 'Price is the bigger lever here, but the rating gap is real too — you are behind on both.';
    } else if (ratingRank <= 4) {
      verdict = 'Price is not the explanation here: you are quoting in line and still not converting, which points at ' +
        'capacity and turnaround rather than rate.';
    } else {
      verdict = 'You sit mid-field on both price and rating in this area, which is why you rarely stand out.';
    }
    $('insight-winrate').innerHTML = '<span class="insight-label">What this says</span>' +
      '<strong>' + esc(worst.key) + ' is your weakest conversion at ' + fmtPct(worst.value, 0) + '</strong> (' +
      worst.won + ' of ' + worst.shortlisted + ' shortlists). The agency rates you ' +
      D.PERFORMANCE[FIRM.id][worst.key].toFixed(1) + ' out of 5 on this work — rank ' + ratingRank + ' of ' +
      D.FIRMS.length + ' on the panel. Across the ' + worstLost.length +
      ' you lost, your median quote was ' + fmtRate(worstMine) + '/hr against a winning median of ' +
      fmtRate(worstWin) + '/hr, a gap of ' + fmtSignedPct(worstGap, 0) + '. ' + verdict;

    /* Allocation share trend */
    var months = fyMonths(fy);
    var allMonthly = months.map(function (mm) {
      return sum(fyList.filter(function (m) { return m.month === mm; }).map(function (m) { return m.value; }));
    });
    var ownMonthly = months.map(function (mm) {
      return sum(mine.filter(function (m) { return m.month === mm; }).map(function (m) { return m.value; }));
    });
    var shareSeries = rollingShare(months, ownMonthly, allMonthly, 3);
    var avgSeries = months.map(function () { return panelAvgShare; });

    $('s-share').textContent = 'Your rolling three-month share of allocated panel spend, ' + fy +
      ', against the ' + fmtPct(panelAvgShare, 1) + ' an equal split across ' + D.FIRMS.length + ' firms would give.';
    registerChart(function () {
      drawLine($('chart-share'), {
        xLabels: months.map(monthLabel),
        series: [
          { name: 'Your share (3-month rolling)', values: shareSeries, colorVar: '--viz-1' },
          { name: 'Equal-split panel average', values: avgSeries, colorVar: '--viz-2', flat: true }
        ],
        yFormat: function (v) { return v.toFixed(0) + '%'; },
        pointFormat: function (v) { return v.toFixed(1) + '%'; },
        ariaLabel: 'Rolling three-month allocation share against panel average'
      });
    });
    $('legend-share').innerHTML =
      '<span class="legend-item"><span class="legend-swatch line" style="background:var(--viz-1)"></span>' +
        '<b>Your share</b> (3-month rolling)</span>' +
      '<span class="legend-item"><span class="legend-swatch line" style="background:var(--viz-2)"></span>' +
        '<b>Equal-split panel average</b> (' + fmtPct(panelAvgShare, 1) + ')</span>';
    $('dt-share').innerHTML = staticTable([
      { label: 'Month', render: function (r) { return esc(r.label); } },
      { label: 'Your spend', align: 'right', render: function (r) { return fmtMoney(r.own); } },
      { label: 'Panel spend', align: 'right', render: function (r) { return fmtMoney(r.all); } },
      { label: 'Rolling share', align: 'right', render: function (r) { return fmtPct(r.share, 1); } }
    ], months.map(function (mm, i) {
      return { label: monthLabel(mm), own: ownMonthly[i], all: allMonthly[i], share: shareSeries[i] };
    })) + '<p class="card-sub" style="margin-top:8px">Your ' + fy + ' total ' + fmtMoney(sum(ownMonthly)) +
      ' of ' + fmtMoney(sum(allMonthly)) + ' panel spend — the same two figures the agency dashboard shows.</p>';

    var h1 = mean(shareSeries.slice(0, 6)), h2 = mean(shareSeries.slice(6));
    $('insight-share').innerHTML = '<span class="insight-label">What this says</span>' +
      'Your rolling share averaged <strong>' + fmtPct(h1, 1) + '</strong> over the first half of ' + fy +
      ' and <strong>' + fmtPct(h2, 1) + '</strong> over the second — against an equal-split expectation of ' +
      fmtPct(panelAvgShare, 1) + '. ' +
      (h2 < panelAvgShare
        ? 'You are finishing the year below the line, so the gap is structural rather than a bad quarter.'
        : 'You closed the gap in the second half, so the recent quoting change is working.') +
      ' Across ' + fy + ' you took ' + fmtMoney(sum(ownMonthly)) + ' of ' + fmtMoney(sum(allMonthly)) +
      ' allocated — the exact figures on the agency’s own dashboard.';

    /* Responsiveness */
    var panelResp = mean(D.FIRMS.map(function (f) { return f.respHrs; }));
    var panelSla = mean(D.FIRMS.map(function (f) { return f.slaPct; }));
    var panelDecline = mean(D.FIRMS.map(function (f) { return f.declinePct; }));
    var panelUtil = mean(D.FIRMS.map(function (f) { return f.util; }));
    var bestResp = Math.min.apply(null, D.FIRMS.map(function (f) { return f.respHrs; }));

    var respRows = [
      { metric: 'Median acknowledgement time', you: FIRM.respHrs + 'h', panel: panelResp.toFixed(1) + 'h', good: FIRM.respHrs <= panelResp, note: FIRM.respHrs <= bestResp ? 'you set the panel best' : 'panel best is ' + bestResp + 'h' },
      { metric: 'Requests answered inside 48h SLA', you: FIRM.slaPct + '%', panel: panelSla.toFixed(0) + '%', good: FIRM.slaPct >= panelSla, note: 'panel SLA target 90%' },
      { metric: 'Allocations declined', you: FIRM.declinePct + '%', panel: panelDecline.toFixed(0) + '%', good: FIRM.declinePct <= panelDecline, note: 'lower is better' },
      { metric: 'Declared capacity in use', you: FIRM.util + '%', panel: panelUtil.toFixed(0) + '%', good: FIRM.util <= panelUtil, note: 'headroom counts toward your score' }
    ];
    $('resp-table').innerHTML = staticTable([
      { label: 'Metric', render: function (r) { return esc(r.metric); } },
      { label: 'You', align: 'right', render: function (r) { return '<strong>' + esc(r.you) + '</strong>'; } },
      { label: 'Panel average', align: 'right', render: function (r) { return esc(r.panel); } },
      { label: 'Standing', render: function (r) { return '<span class="badge ' + (r.good ? 'good' : 'warn') + '">' + (r.good ? 'Ahead' : 'Behind') + '</span> <span class="muted">' + esc(r.note) + '</span>'; } }
    ], respRows);

    $('insight-resp').innerHTML = '<span class="insight-label">What this says</span>' +
      'You answer in <strong>' + FIRM.respHrs + ' hours</strong> against a panel average of ' + panelResp.toFixed(1) +
      ', and clear the SLA on ' + FIRM.slaPct + '% of requests against ' + panelSla.toFixed(0) +
      '%. Service is the one leg of the score you already win. Improving it further cannot move your ranking, ' +
      'because it carries only ' + Math.round(weightsFor({ complexity: 'Medium', band: '$150k–$500k', requiredBy: '2026-12-01' }).service * 100) +
      '% of the composite. Rate carries the weight.';

    renderLostTable();
  }

  function filteredLost() {
    var q = state.lost.q.toLowerCase();
    return lostMatters().filter(function (l) {
      if (state.lost.type !== 'all' && l.type !== state.lost.type) return false;
      if (state.lost.fy !== 'all' && l.fy !== state.lost.fy) return false;
      if (q && (l.title + ' ' + l.type + ' ' + firmName(l.winner)).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderLostTable() {
    var s = state.sort.lost;
    var all = lostMatters();
    var rows = sortRows(filteredLost(), s.key, s.dir, {
      title: function (l) { return l.title; },
      type: function (l) { return l.type; },
      fy: function (l) { return l.fy; },
      mine: function (l) { return l.mine; },
      winner: function (l) { return firmName(l.winner); },
      winning: function (l) { return l.winning; },
      delta: function (l) { return l.delta; }
    });

    $('l-count').textContent = rows.length + ' of ' + all.length + ' lost matters';
    var active = state.lost.type !== 'all' || state.lost.fy !== 'all' || state.lost.q !== '';
    $('l-reset').hidden = !active;

    renderTable($('lost-table'), {
      caption: 'Matters where ' + FIRM.name + ' was shortlisted and another firm was allocated the work. ' +
        'Delta is the winning blended rate against yours — negative means the winner was cheaper.',
      sortKey: s.key, sortDir: s.dir,
      columns: [
        { key: 'title', label: 'Matter', render: function (l) { return esc(l.title); } },
        { key: 'type', label: 'Type', render: function (l) { return esc(l.type); } },
        { key: 'fy', label: 'FY', render: function (l) { return esc(l.fy); } },
        { key: 'mine', label: 'Your rate', align: 'right', render: function (l) { return fmtRate(l.mine); } },
        { key: 'winner', label: 'Won by', render: function (l) { return esc(firmName(l.winner)); } },
        { key: 'winning', label: 'Winning rate', align: 'right', render: function (l) { return fmtRate(l.winning); } },
        {
          key: 'delta', label: 'Delta', align: 'right', render: function (l) {
            return '<span class="badge ' + (l.delta < 0 ? 'bad' : 'good') + '">' + fmtSignedPct(l.delta, 1) + '</span>';
          }
        }
      ],
      rows: rows,
      onSort: function (key) {
        var numeric = ['mine', 'winning', 'delta'].indexOf(key) >= 0;
        toggleSort(s, key, key === 'delta' ? 'asc' : (numeric ? 'desc' : 'asc'));
        renderLostTable();
      },
      onReset: resetLost,
      onRowClick: function (l, tr) {
        var m = l.matter;
        var field = m.shortlist.map(function (fid, i) {
          var tag = fid === m.firmId ? ' (won)' : (fid === FIRM.id ? ' (you)' : '');
          return row(firmName(fid) + tag, fmtRate(m.bids[i]) + '/hr');
        }).join('');
        var body = '<dl class="detail-list">' +
          row('Matter ID', m.id) +
          row('Matter type', m.type) +
          row('Complexity', m.complexity) +
          row('Value band', m.band) +
          row('Allocated', fmtDate(m.date)) +
          row('Financial year', m.fy) +
          row('Outcome', m.outcome) +
          '</dl>' +
          '<h3 style="margin-top:24px;font-size:0.9375rem">The field</h3>' +
          '<dl class="detail-list">' + field + '</dl>' +
          '<h3 style="margin-top:24px;font-size:0.9375rem">Performance ratings on ' + esc(m.type) + '</h3>' +
          '<dl class="detail-list">' +
            row('You (' + FIRM.name + ')', D.PERFORMANCE[FIRM.id][m.type].toFixed(1) + ' / 5') +
            row(firmName(m.firmId), D.PERFORMANCE[m.firmId][m.type].toFixed(1) + ' / 5') +
          '</dl>' +
          '<p style="margin-top:16px;font-size:0.875rem" class="muted">' +
          (l.delta < 0
            ? 'The winning firm quoted ' + fmtPct(Math.abs(l.delta), 1) + ' below you'
            : 'The winning firm quoted ' + fmtPct(l.delta, 1) + ' above you') +
          (D.PERFORMANCE[FIRM.id][m.type] >= D.PERFORMANCE[m.firmId][m.type]
            ? ', and the agency rates you at or above them on this matter type.'
            : ', and the agency rates them above you on this matter type.') +
          '</p>';
        openSlideover('Lost matter', m.title, body, tr);
      }
    });

    var byType = D.MATTER_TYPES.map(function (t) {
      var rowsT = all.filter(function (l) { return l.type === t; });
      if (!rowsT.length) return null;
      var mMine = median(rowsT.map(function (l) { return l.mine; }));
      var mWin = median(rowsT.map(function (l) { return l.winning; }));
      return { type: t, n: rowsT.length, mine: mMine, win: mWin, gap: (mMine - mWin) / mWin * 100 };
    }).filter(Boolean).sort(function (a, b) { return b.gap - a.gap; });
    var worst = byType[0];

    $('insight-lost').innerHTML = '<span class="insight-label">What this says</span>' +
      'Across ' + all.length + ' lost matters your widest pricing gap is <strong>' + esc(worst.type) +
      '</strong>: median quote ' + fmtRate(worst.mine) + '/hr against a winning median of ' + fmtRate(worst.win) +
      '/hr, so the winner came in ' + fmtPct(Math.abs((worst.win - worst.mine) / worst.mine * 100), 0) +
      ' under you across ' + worst.n + ' matters. Quoting at that winning median of ' + fmtRate(worst.win) +
      '/hr would have put you at or under the winning rate on ' +
      all.filter(function (l) { return l.type === worst.type && l.winning >= worst.win; }).length +
      ' of the ' + worst.n + '. This is the number no agency will ever tell you directly.';
  }

  function resetLost() {
    state.lost = { type: 'all', fy: 'all', q: '' };
    $('l-type').value = 'all'; $('l-fy').value = 'all'; $('l-search').value = '';
    renderLostTable();
  }

  /* ============================ screen 5: about ========================= */

  function renderAbout() {
    $('about-prose').innerHTML = D.ABOUT.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }

  /* ============================ form plumbing =========================== */

  function fillSelect(sel, values, allLabel, labelFn) {
    var html = allLabel ? '<option value="all">' + esc(allLabel) + '</option>' : '';
    html += values.map(function (v) {
      var value = typeof v === 'object' ? v.value : v;
      var label = typeof v === 'object' ? v.label : (labelFn ? labelFn(v) : v);
      return '<option value="' + esc(value) + '">' + esc(label) + '</option>';
    }).join('');
    sel.innerHTML = html;
  }

  function buildControls() {
    /* Dashboard filters */
    fillSelect($('f-fy'), D.FISCAL_YEARS.map(function (y) { return { value: y.id, label: y.label }; }), null);
    $('f-fy').value = state.dash.fy;
    fillSelect($('f-type'), D.MATTER_TYPES, 'All matter types');
    $('f-type').addEventListener('change', function () { state.dash.type = $('f-type').value; resetCharts(); renderSpend(); });
    $('f-fy').addEventListener('change', function () { state.dash.fy = $('f-fy').value; resetCharts(); renderSpend(); });
    $('f-reset').addEventListener('click', function () {
      state.dash = { fy: 'FY26', type: 'all' };
      $('f-fy').value = 'FY26'; $('f-type').value = 'all';
      resetCharts(); renderSpend();
    });

    /* Allocate form */
    fillSelect($('a-type'), D.MATTER_TYPES, null);
    fillSelect($('a-complexity'), D.COMPLEXITIES, null);
    $('a-complexity').value = 'Medium';
    fillSelect($('a-band'), D.VALUE_BANDS, null);
    $('a-band').value = '$150k–$500k';
    $('a-exclusions').innerHTML = D.FIRMS.map(function (f) {
      return '<label class="chip"><input type="checkbox" value="' + esc(f.id) + '">' +
        '<span>' + esc(f.name) + '</span></label>';
    }).join('');

    $('allocate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var params = currentParams();
      var result = recommend(params);
      if (!result.ranked.length) {
        $('rec-region').innerHTML = '<div class="card" style="margin-top:24px"><div class="empty-state">' +
          '<p><strong>No firms available</strong></p>' +
          '<p>Every panel firm is either excluded by you or conflicted on ' + esc(params.type) + ' matters.</p>' +
          '</div></div>';
        state.lastRecommendation = null;
        return;
      }
      state.lastRecommendation = { params: params, result: result };
      renderRecommendations(state.lastRecommendation);
      $('rec-region').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    $('a-clear').addEventListener('click', function () {
      $('a-title').value = '';
      $('a-type').selectedIndex = 0;
      $('a-complexity').value = 'Medium';
      $('a-band').value = '$150k–$500k';
      $('a-required').value = '2026-10-16';
      els('#a-exclusions input').forEach(function (i) { i.checked = false; });
      state.lastRecommendation = null;
      $('rec-region').innerHTML = '';
    });

    /* Recent allocations filters */
    fillSelect($('r-type'), D.MATTER_TYPES, 'All matter types');
    fillSelect($('r-firm'), D.FIRMS.map(function (f) { return { value: f.id, label: f.name }; }), 'All firms');
    $('r-type').addEventListener('change', function () { state.recentFilters.type = $('r-type').value; renderRecentTable(); });
    $('r-firm').addEventListener('change', function () { state.recentFilters.firm = $('r-firm').value; renderRecentTable(); });
    $('r-reset').addEventListener('click', function () {
      state.recentFilters = { type: 'all', firm: 'all' };
      $('r-type').value = 'all'; $('r-firm').value = 'all';
      renderRecentTable();
    });

    /* Benchmarks filters */
    fillSelect($('b-type'), D.MATTER_TYPES, 'All matter types');
    fillSelect($('b-sen'), D.SENIORITIES, 'All seniorities');
    $('b-type').addEventListener('change', function () { state.bench.type = $('b-type').value; renderBenchTable(); });
    $('b-sen').addEventListener('change', function () { state.bench.sen = $('b-sen').value; renderBenchTable(); });
    $('b-search').addEventListener('input', function () { state.bench.q = $('b-search').value.trim(); renderBenchTable(); });
    $('b-reset').addEventListener('click', resetBench);

    /* Lost matters filters */
    fillSelect($('l-type'), D.MATTER_TYPES, 'All matter types');
    fillSelect($('l-fy'), D.FISCAL_YEARS.map(function (y) { return { value: y.id, label: y.id }; }), 'All years');
    $('l-type').addEventListener('change', function () { state.lost.type = $('l-type').value; renderLostTable(); });
    $('l-fy').addEventListener('change', function () { state.lost.fy = $('l-fy').value; renderLostTable(); });
    $('l-search').addEventListener('input', function () { state.lost.q = $('l-search').value.trim(); renderLostTable(); });
    $('l-reset').addEventListener('click', resetLost);
  }

  function seedRecent() {
    state.recent = D.RECENT_SEED.map(function (r) {
      var params = {
        type: r.type, complexity: r.complexity, band: r.band,
        requiredBy: r.requiredBy, excluded: r.excluded
      };
      var scored = scoreFirm(r.firmId, params);
      var res = recommend(params);
      var entry = res.ranked.filter(function (x) { return x.firmId === r.firmId; })[0];
      return {
        id: r.id, title: r.title, type: r.type, firmId: r.firmId,
        complexity: r.complexity, band: r.band, date: r.date, requiredBy: r.requiredBy,
        excluded: r.excluded, score: (entry || scored).composite,
        rank: entry ? res.ranked.indexOf(entry) + 1 : null, isNew: false
      };
    });
  }

  /* ============================== boot ================================== */

  function debounce(fn, ms) {
    var t = null;
    return function () {
      window.clearTimeout(t);
      t = window.setTimeout(fn, ms);
    };
  }

  function init() {
    syncThemeButton();
    $('theme-toggle').addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (!document.documentElement.getAttribute('data-theme')) { syncThemeButton(); renderCharts(); }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    els('[data-view]', $('perspective')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-view');
        var tab = state.tab === 'about' ? 'about' : VIEWS[v][0].id;
        go(v, tab);
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var other = btn.getAttribute('data-view') === 'agency' ? 'firm' : 'agency';
        go(other, state.tab === 'about' ? 'about' : VIEWS[other][0].id);
        $('persp-' + other).focus();
      });
    });

    $('overlay').addEventListener('click', closeSlideover);
    $('slideover-close').addEventListener('click', closeSlideover);

    buildControls();
    seedRecent();

    window.addEventListener('hashchange', function () {
      var r = readHash();
      var same = r.view === state.view && r.tab === state.tab;
      state.view = r.view; state.tab = r.tab;
      /* rewrite an unrecognised hash back to the resolved one; the guard inside
         writeHash stops this from looping */
      writeHash();
      if (!same) apply();
    });
    window.addEventListener('resize', debounce(renderCharts, 150));

    var initial = readHash();
    state.view = initial.view;
    state.tab = initial.tab;
    writeHash();
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
