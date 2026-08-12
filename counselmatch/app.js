/* CounselMatch — demo application.
   Vanilla JS, no dependencies, no network. All data comes from data.js. */
(function () {
  'use strict';

  var DATA = window.CM_DATA;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MAX_CLAIMS = 3;

  /* ===================================================================== *
   * Small helpers
   * ===================================================================== */

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = String(text); }
    return n;
  }

  /* Paint attributes that reference a CSS custom property are applied as
     inline styles: `fill="var(--x)"` is unreliable as a presentation
     attribute, while `style.fill = "var(--x)"` is not. This is what lets
     every chart follow the theme without re-colouring by hand. */
  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = String(attrs[k]);
        if ((k === 'fill' || k === 'stroke') && v.indexOf('var(') === 0) {
          n.style.setProperty(k, v);
        } else {
          n.setAttribute(k, v);
        }
      });
    }
    return n;
  }

  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

  function fmtInt(n) { return Number(n).toLocaleString('en-AU'); }
  function fmtMoney(n) { return '$' + Number(Math.round(n)).toLocaleString('en-AU'); }
  function fmtK(n) { return '$' + Math.round(n / 1000) + 'k'; }
  function fmtBand(min, max) { return fmtK(min) + ' - ' + fmtK(max); }
  function fmtPct(n) { return (Math.round(n * 10) / 10).toFixed(1) + '%'; }

  function fmtDate(iso) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var p = iso.split('-');
    return Number(p[2]) + ' ' + months[Number(p[1]) - 1] + ' ' + p[0];
  }

  function unique(list) {
    var seen = {}; var out = [];
    list.forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  function median(nums) {
    var s = nums.slice().sort(function (a, b) { return a - b; });
    if (!s.length) { return 0; }
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function fillSelect(select, options, allLabel) {
    clear(select);
    if (allLabel) {
      var o = el('option', null, allLabel);
      o.value = '';
      select.appendChild(o);
    }
    options.forEach(function (v) {
      var opt = el('option', null, v);
      opt.value = v;
      select.appendChild(opt);
    });
  }

  /* Nice axis scale. `integer` forces whole-number steps. */
  function niceScale(min, max, target, integer) {
    if (max === min) { max = min + 1; }
    var span = max - min;
    var raw = span / (target || 5);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = mag * (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10);
    if (integer) { step = Math.max(1, Math.round(step)); }
    var lo = Math.floor(min / step) * step;
    var hi = Math.ceil(max / step) * step;
    var ticks = [];
    for (var v = lo; v <= hi + step / 1000; v += step) {
      ticks.push(Math.round(v * 1000) / 1000);
    }
    return { lo: lo, hi: hi, step: step, ticks: ticks };
  }

  /* ===================================================================== *
   * Mutable demo state (in memory only — a refresh restores the demo)
   * ===================================================================== */

  var state = {
    perspective: 'firm',
    screen: 'roles',
    theme: 'light',
    lastWidth: window.innerWidth,
    openDetail: null,
    roles: {
      practice: '', status: '',
      sort: { key: 'daysOpen', dir: 'desc' }
    },
    market: {
      niche: '', minHit: '0', q: '',
      sort: { key: 'hitRate', dir: 'desc' }
    },
    board: {
      practice: '', pqe: '', fit: 'all', q: '',
      sort: { key: 'posted', dir: 'desc' }
    },
    claimed: [],
    submissions: {},
    invited: {}
  };

  /* ===================================================================== *
   * Theme
   * ===================================================================== */

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('theme-toggle');
    var isDark = theme === 'dark';
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    $('theme-label').textContent = isDark ? 'Light' : 'Dark';
    btn.querySelector('.theme-glyph').textContent = isDark ? '☀' : '☾';
  }

  function initTheme() {
    var stored = null;
    try { stored = window.localStorage.getItem('cm-theme'); } catch (e) { stored = null; }
    if (stored !== 'light' && stored !== 'dark') {
      stored = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(stored);
    $('theme-toggle').addEventListener('click', function () {
      var next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { window.localStorage.setItem('cm-theme', next); } catch (e) { /* private mode */ }
      hideTip();
      /* Charts re-render against the new theme. An open slide-over does not
         need rebuilding — its SVG paints through CSS custom properties, so it
         follows the theme live and keeps the reader's focus where it was. */
      renderScreen();
    });
  }

  /* ===================================================================== *
   * Toasts
   * ===================================================================== */

  function toast(message, variant) {
    var wrap = $('toasts');
    var t = el('div', 'toast' + (variant ? ' ' + variant : ''), message);
    wrap.appendChild(t);
    window.setTimeout(function () {
      if (t.parentNode) { t.parentNode.removeChild(t); }
    }, 3600);
  }

  /* ===================================================================== *
   * Shared chart tooltip
   * ===================================================================== */

  var tipEl = null;

  function tipRow(label, value, keyColour) {
    var row = el('div', 'tip-row');
    if (keyColour) {
      var k = el('span', 'tip-swatch');
      k.style.background = keyColour;
      row.appendChild(k);
    }
    row.appendChild(el('span', 'tip-value', value));
    row.appendChild(el('span', 'tip-label', label));
    return row;
  }

  function showTip(nodes, x, y) {
    if (!tipEl) { tipEl = $('chart-tip'); }
    clear(tipEl);
    nodes.forEach(function (n) { tipEl.appendChild(n); });
    tipEl.hidden = false;
    var box = tipEl.getBoundingClientRect();
    var left = Math.min(Math.max(8, x + 14), Math.max(8, window.innerWidth - box.width - 8));
    var top = y - box.height - 14;
    if (top < 8) { top = y + 20; }
    top = Math.min(top, Math.max(8, window.innerHeight - box.height - 8));
    tipEl.style.left = left + 'px';
    tipEl.style.top = top + 'px';
  }

  function hideTip() {
    if (!tipEl) { tipEl = $('chart-tip'); }
    tipEl.hidden = true;
  }

  function centreOf(node) {
    var r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* An info button that reveals explanatory text on hover and on focus. */
  function infoButton(label, lines) {
    var btn = el('button', 'info-btn', 'i');
    btn.type = 'button';
    btn.setAttribute('aria-label', label + ': ' + lines.join(' '));
    function show(x, y) {
      var nodes = [el('div', 'tip-value', label)];
      lines.forEach(function (l) { nodes.push(el('div', 'tip-label', l)); });
      showTip(nodes, x, y);
    }
    btn.addEventListener('mouseenter', function (e) { show(e.clientX, e.clientY); });
    btn.addEventListener('mousemove', function (e) { show(e.clientX, e.clientY); });
    btn.addEventListener('mouseleave', hideTip);
    btn.addEventListener('focus', function () { var c = centreOf(btn); show(c.x, c.y); });
    btn.addEventListener('blur', hideTip);
    btn.addEventListener('click', function (e) { e.preventDefault(); var c = centreOf(btn); show(c.x, c.y); });
    return btn;
  }

  /* ===================================================================== *
   * Generic sortable table
   * ===================================================================== */

  function emptyState(message, onReset) {
    var box = el('div', 'empty-state');
    box.appendChild(el('p', null, message));
    if (onReset) {
      var btn = el('button', 'btn btn-ghost', 'Reset filters');
      btn.type = 'button';
      btn.addEventListener('click', onReset);
      box.appendChild(btn);
    }
    return box;
  }

  function renderTable(host, cfg) {
    clear(host);
    if (!cfg.rows.length) {
      host.appendChild(emptyState(cfg.emptyMessage || 'No results — reset filters to see everything again.', cfg.onReset));
      return;
    }

    var table = el('table');
    if (cfg.caption) {
      var cap = el('caption', null, cfg.caption);
      table.appendChild(cap);
    }

    var thead = el('thead');
    var hrow = el('tr');
    cfg.columns.forEach(function (col) {
      var th = el('th');
      th.scope = 'col';
      if (col.numeric) { th.classList.add('num'); }
      if (col.sortable === false) {
        th.classList.add('plain');
        th.textContent = col.label;
      } else {
        var active = cfg.sort && cfg.sort.key === col.key;
        if (active) { th.setAttribute('aria-sort', cfg.sort.dir === 'asc' ? 'ascending' : 'descending'); }
        var btn = el('button', 'sort-btn');
        btn.type = 'button';
        btn.appendChild(document.createTextNode(col.label));
        var caret = el('span', 'sort-caret', active ? (cfg.sort.dir === 'asc' ? '▲' : '▼') : '');
        caret.setAttribute('aria-hidden', 'true');
        btn.appendChild(caret);
        btn.addEventListener('click', function () { cfg.onSort(col.key); });
        th.appendChild(btn);
      }
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    var tbody = el('tbody');
    cfg.rows.forEach(function (row) {
      var tr = el('tr');
      if (cfg.onRowClick) {
        tr.classList.add('clickable');
        tr.tabIndex = 0;
        if (cfg.rowLabel) { tr.setAttribute('aria-label', cfg.rowLabel(row)); }
        tr.addEventListener('click', function (e) {
          /* controls inside a row (the claim button) act for themselves */
          if (e.target !== tr && e.target.closest && e.target.closest('button')) { return; }
          cfg.onRowClick(row, tr);
        });
        tr.addEventListener('keydown', function (e) {
          if (e.target !== tr) { return; }
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            cfg.onRowClick(row, tr);
          }
        });
      }
      cfg.columns.forEach(function (col) {
        var td = el('td');
        if (col.numeric) { td.classList.add('num'); }
        if (col.nowrap) { td.classList.add('nowrap'); }
        col.cell(td, row);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    if (cfg.footRow) {
      var tfoot = el('tfoot');
      tfoot.appendChild(cfg.footRow());
      table.appendChild(tfoot);
    }

    host.appendChild(table);
  }

  function sortRows(rows, columns, sort) {
    var col = null;
    columns.forEach(function (c) { if (c.key === sort.key) { col = c; } });
    if (!col) { return rows; }
    var get = col.sortValue || function (r) { return r[col.key]; };
    var dir = sort.dir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var va = get(a); var vb = get(b);
      if (typeof va === 'string' || typeof vb === 'string') {
        return String(va).localeCompare(String(vb)) * dir;
      }
      if (va === vb) { return 0; }
      return (va < vb ? -1 : 1) * dir;
    });
  }

  function makeSortHandler(bucket, defaultDirs, rerender) {
    return function (key) {
      var s = bucket.sort;
      if (s.key === key) {
        s.dir = s.dir === 'asc' ? 'desc' : 'asc';
      } else {
        s.key = key;
        s.dir = defaultDirs[key] || 'asc';
      }
      rerender();
    };
  }

  /* ===================================================================== *
   * Charts
   * ===================================================================== */

  function chartWidth(host, fallback) {
    var w = host.clientWidth;
    if (!w) { w = fallback || 640; }
    return Math.max(260, Math.round(w));
  }

  function axisText(x, y, text, anchor, cls) {
    var t = svgEl('text', {
      x: x, y: y,
      'text-anchor': anchor || 'middle',
      'font-size': 11,
      fill: 'var(--ink-axis)',
      'font-variant-numeric': 'tabular-nums'
    });
    if (cls) { t.setAttribute('class', cls); }
    t.textContent = text;
    return t;
  }

  /* ---------- Scatter: hit-rate vs median days to fill ------------------ */

  function renderScatter(host, rows, allRows) {
    clear(host);
    var W = chartWidth(host, 720);
    var H = W < 520 ? 380 : 430;
    var m = { top: 22, right: 20, bottom: 58, left: 56 };
    var pw = W - m.left - m.right;
    var ph = H - m.top - m.bottom;

    var xScaleDef = niceScale(
      Math.min.apply(null, allRows.map(function (r) { return r.medianDays; })) - 2,
      Math.max.apply(null, allRows.map(function (r) { return r.medianDays; })) + 2,
      W < 520 ? 4 : 7, true
    );
    var yScaleDef = niceScale(
      Math.min.apply(null, allRows.map(function (r) { return r.hitRate; })) - 2,
      Math.max.apply(null, allRows.map(function (r) { return r.hitRate; })) + 2,
      5, true
    );

    function sx(v) { return m.left + ((v - xScaleDef.lo) / (xScaleDef.hi - xScaleDef.lo)) * pw; }
    function sy(v) { return m.top + ph - ((v - yScaleDef.lo) / (yScaleDef.hi - yScaleDef.lo)) * ph; }

    var medDays = median(allRows.map(function (r) { return r.medianDays; }));
    var medHit = median(allRows.map(function (r) { return r.hitRate; }));

    var svg = svgEl('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Scatter chart. Recruiter hit-rate against median days to fill for ' +
        rows.length + ' of ' + allRows.length + ' recruiters. Market medians are ' +
        Math.round(medHit * 10) / 10 + ' per cent and ' + medDays + ' days.'
    });

    /* the "faster and more reliable" quadrant */
    var qx = sx(xScaleDef.lo);
    var qw = Math.max(0, sx(medDays) - qx);
    var qy = sy(yScaleDef.hi);
    var qh = Math.max(0, sy(medHit) - qy);
    svg.appendChild(svgEl('rect', { x: qx, y: qy, width: qw, height: qh, fill: 'var(--quadrant)' }));

    /* gridlines */
    yScaleDef.ticks.forEach(function (t) {
      svg.appendChild(svgEl('line', {
        x1: m.left, y1: sy(t), x2: m.left + pw, y2: sy(t),
        stroke: 'var(--grid)', 'stroke-width': 1
      }));
      svg.appendChild(axisText(m.left - 10, sy(t) + 4, t + '%', 'end'));
    });
    xScaleDef.ticks.forEach(function (t) {
      svg.appendChild(svgEl('line', {
        x1: sx(t), y1: m.top, x2: sx(t), y2: m.top + ph,
        stroke: 'var(--grid)', 'stroke-width': 1
      }));
      svg.appendChild(axisText(sx(t), m.top + ph + 18, t, 'middle'));
    });

    /* axes */
    svg.appendChild(svgEl('line', {
      x1: m.left, y1: m.top + ph, x2: m.left + pw, y2: m.top + ph,
      stroke: 'var(--axis)', 'stroke-width': 1
    }));
    svg.appendChild(svgEl('line', {
      x1: m.left, y1: m.top, x2: m.left, y2: m.top + ph,
      stroke: 'var(--axis)', 'stroke-width': 1
    }));

    /* median reference lines */
    svg.appendChild(svgEl('line', {
      x1: sx(medDays), y1: m.top, x2: sx(medDays), y2: m.top + ph,
      stroke: 'var(--axis)', 'stroke-width': 1
    }));
    svg.appendChild(svgEl('line', {
      x1: m.left, y1: sy(medHit), x2: m.left + pw, y2: sy(medHit),
      stroke: 'var(--axis)', 'stroke-width': 1
    }));
    if (W >= 520) {
      svg.appendChild(axisText(sx(medDays) + 6, m.top + 12, 'median ' + medDays + ' days', 'start'));
      svg.appendChild(axisText(m.left + pw, sy(medHit) - 6, 'median ' + fmtPct(medHit), 'end'));
    }

    /* axis titles */
    var xTitle = axisText(m.left + pw / 2, H - 12, 'Median days to fill a brief', 'middle');
    xTitle.setAttribute('font-size', 12);
    svg.appendChild(xTitle);
    var yTitle = axisText(0, 0, 'Hit-rate (placements ÷ briefs taken)', 'middle');
    yTitle.setAttribute('font-size', 12);
    yTitle.setAttribute('transform', 'translate(16,' + (m.top + ph / 2) + ') rotate(-90)');
    yTitle.setAttribute('x', 0);
    yTitle.setAttribute('y', 0);
    svg.appendChild(yTitle);

    /* dots — one hue; size carries placements.
       Marks are painted first as one layer, hit targets as a second layer on
       top, so an overlapping neighbour can never swallow a dot's hover. */
    var dots = svgEl('g');
    var hits = svgEl('g');
    rows.forEach(function (r) {
      var cx = sx(r.medianDays);
      var cy = sy(r.hitRate);
      var rad = Math.max(6, Math.sqrt(r.placements) * 2.8);

      var dot = svgEl('circle', {
        cx: cx, cy: cy, r: rad,
        fill: 'var(--series-1)', 'fill-opacity': 0.78,
        stroke: 'var(--surface)', 'stroke-width': 2,
        'pointer-events': 'none'
      });
      dots.appendChild(dot);

      var hit = svgEl('circle', {
        cx: cx, cy: cy, r: rad + 12,
        fill: 'transparent', class: 'chart-hit', tabindex: '0', role: 'img',
        'aria-label': r.name + ', ' + r.boutique + '. Hit-rate ' + fmtPct(r.hitRate) +
          ', ' + r.placements + ' placements from ' + r.briefsTaken + ' briefs, median ' +
          r.medianDays + ' days, rating ' + r.rating.toFixed(1) + '.'
      });

      function tipNodes() {
        return [
          el('div', 'tip-value', r.name),
          el('div', 'tip-label', r.boutique),
          tipRow('hit-rate (' + r.placements + ' of ' + r.briefsTaken + ' briefs)', fmtPct(r.hitRate)),
          tipRow('days to fill (median)', String(r.medianDays)),
          tipRow('placements, 12 months', String(r.placements))
        ];
      }
      hit.addEventListener('mouseenter', function (e) { dot.setAttribute('fill-opacity', 1); showTip(tipNodes(), e.clientX, e.clientY); });
      hit.addEventListener('mousemove', function (e) { showTip(tipNodes(), e.clientX, e.clientY); });
      hit.addEventListener('mouseleave', function () { dot.setAttribute('fill-opacity', 0.78); hideTip(); });
      hit.addEventListener('focus', function () {
        dot.setAttribute('fill-opacity', 1);
        var c = centreOf(hit);
        showTip(tipNodes(), c.x, c.y);
      });
      hit.addEventListener('blur', function () { dot.setAttribute('fill-opacity', 0.78); hideTip(); });
      hits.appendChild(hit);
    });
    svg.appendChild(dots);
    svg.appendChild(hits);

    host.appendChild(svg);
  }

  function renderSizeLegend(host) {
    clear(host);
    var samples = [6, 12, 17];
    var svg = svgEl('svg', { width: 150, height: 34, viewBox: '0 0 150 34', 'aria-hidden': 'true' });
    var x = 14;
    samples.forEach(function (n) {
      var r = Math.max(6, Math.sqrt(n) * 2.8);
      svg.appendChild(svgEl('circle', {
        cx: x, cy: 17, r: r,
        fill: 'var(--series-1)', 'fill-opacity': 0.78,
        stroke: 'var(--surface)', 'stroke-width': 2
      }));
      var t = svgEl('text', { x: x, y: 32, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink-axis)' });
      t.textContent = n;
      svg.appendChild(t);
      x += r + 34;
    });
    host.appendChild(svg);
    host.appendChild(el('span', null, 'placements in 12 months'));
  }

  /* ---------- Horizontal bars: hit-rate by niche ------------------------ */

  function renderHBar(host, items, opts) {
    clear(host);
    opts = opts || {};
    if (!items.length) {
      host.appendChild(el('p', 'chart-note', 'No niches to plot.'));
      return;
    }
    var W = chartWidth(host, 520);
    var rowH = 48;
    var m = { top: 8, right: 12, bottom: 34, left: 0 };
    var ph = items.length * rowH;
    var H = m.top + ph + m.bottom;
    var valueSpace = 52;
    var pw = Math.max(80, W - m.left - m.right - valueSpace);
    var scale = niceScale(0, Math.max(100, Math.ceil(Math.max.apply(null, items.map(function (i) { return i.value; })) / 10) * 10), 4, true);
    if (scale.hi < 100) { scale.hi = 100; }

    function sx(v) { return m.left + (v / scale.hi) * pw; }

    var svg = svgEl('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img', 'aria-label': opts.ariaLabel || 'Bar chart'
    });

    /* gridlines behind the bars */
    var gridTicks = [0, 25, 50, 75, 100];
    gridTicks.forEach(function (t) {
      if (t > scale.hi) { return; }
      svg.appendChild(svgEl('line', {
        x1: sx(t), y1: m.top, x2: sx(t), y2: m.top + ph,
        stroke: 'var(--grid)', 'stroke-width': 1
      }));
      svg.appendChild(axisText(sx(t), m.top + ph + 20, t + '%', t === 0 ? 'start' : (t === 100 ? 'end' : 'middle')));
    });

    items.forEach(function (item, i) {
      var top = m.top + i * rowH;
      var barY = top + 22;
      var barH = 20;
      var w = Math.max(2, sx(item.value) - m.left);
      var rad = Math.min(4, w / 2);

      var label = svgEl('text', {
        x: m.left, y: top + 14, 'font-size': 12.5, fill: 'var(--text)', 'font-weight': 550
      });
      label.textContent = item.label;
      svg.appendChild(label);

      if (item.sub) {
        var sub = svgEl('text', {
          x: W - m.right, y: top + 14, 'font-size': 11, fill: 'var(--ink-axis)', 'text-anchor': 'end'
        });
        sub.textContent = item.sub;
        svg.appendChild(sub);
      }

      /* rounded data-end, square at the baseline */
      var d = 'M' + m.left + ',' + barY +
        ' H' + (m.left + w - rad) +
        ' A' + rad + ',' + rad + ' 0 0 1 ' + (m.left + w) + ',' + (barY + rad) +
        ' V' + (barY + barH - rad) +
        ' A' + rad + ',' + rad + ' 0 0 1 ' + (m.left + w - rad) + ',' + (barY + barH) +
        ' H' + m.left + ' Z';
      var bar = svgEl('path', { d: d, fill: 'var(--series-1)' });
      svg.appendChild(bar);

      var val = svgEl('text', {
        x: m.left + w + 8, y: barY + barH - 5,
        'font-size': 12, fill: 'var(--text)', 'font-weight': 620,
        'font-variant-numeric': 'tabular-nums'
      });
      val.textContent = item.valueLabel;
      svg.appendChild(val);

      var hit = svgEl('rect', {
        x: 0, y: top, width: W, height: rowH,
        fill: 'transparent', class: 'chart-hit', tabindex: '0', role: 'img',
        'aria-label': item.label + ': ' + item.valueLabel + (item.detail ? '. ' + item.detail : '')
      });
      function nodes() {
        var out = [el('div', 'tip-value', item.valueLabel), el('div', 'tip-label', item.label)];
        if (item.detail) { out.push(el('div', 'tip-label', item.detail)); }
        return out;
      }
      hit.addEventListener('mouseenter', function (e) { bar.setAttribute('fill-opacity', 0.82); showTip(nodes(), e.clientX, e.clientY); });
      hit.addEventListener('mousemove', function (e) { showTip(nodes(), e.clientX, e.clientY); });
      hit.addEventListener('mouseleave', function () { bar.removeAttribute('fill-opacity'); hideTip(); });
      hit.addEventListener('focus', function () { bar.setAttribute('fill-opacity', 0.82); var c = centreOf(hit); showTip(nodes(), c.x, c.y); });
      hit.addEventListener('blur', function () { bar.removeAttribute('fill-opacity'); hideTip(); });
      svg.appendChild(hit);
    });

    host.appendChild(svg);
  }

  /* ---------- Line: placements by month --------------------------------- */

  function renderLine(host, series) {
    clear(host);
    var W = chartWidth(host, 520);
    var H = 300;
    /* top margin leaves room for the endpoint's direct label above the peak */
    var m = { top: 34, right: 22, bottom: 46, left: 40 };
    var pw = W - m.left - m.right;
    var ph = H - m.top - m.bottom;
    var maxV = Math.max.apply(null, series.map(function (d) { return d.placements; }));
    var scale = niceScale(0, maxV, 3, true);
    scale.lo = 0;

    function sx(i) { return m.left + (series.length === 1 ? pw / 2 : (i / (series.length - 1)) * pw); }
    function sy(v) { return m.top + ph - ((v - scale.lo) / (scale.hi - scale.lo)) * ph; }

    var total = series.reduce(function (s, d) { return s + d.placements; }, 0);
    var svg = svgEl('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Line chart. Placements by month from ' + series[0].month + ' to ' +
        series[series.length - 1].month + ', ' + total + ' placements in total.'
    });

    scale.ticks.forEach(function (t) {
      svg.appendChild(svgEl('line', {
        x1: m.left, y1: sy(t), x2: m.left + pw, y2: sy(t),
        stroke: 'var(--grid)', 'stroke-width': 1
      }));
      svg.appendChild(axisText(m.left - 10, sy(t) + 4, t, 'end'));
    });

    svg.appendChild(svgEl('line', {
      x1: m.left, y1: m.top + ph, x2: m.left + pw, y2: m.top + ph,
      stroke: 'var(--axis)', 'stroke-width': 1
    }));

    /* Step back from the last month so the final label is always present and
       never lands next to its neighbour at narrow widths. */
    var labelEvery = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(pw / 56))));
    for (var li = series.length - 1; li >= 0; li -= labelEvery) {
      svg.appendChild(axisText(
        sx(li), m.top + ph + 18, series[li].month,
        li === series.length - 1 ? 'end' : 'middle'
      ));
    }

    var yTitle = axisText(0, 0, 'Placements', 'middle');
    yTitle.setAttribute('transform', 'translate(12,' + (m.top + ph / 2) + ') rotate(-90)');
    svg.appendChild(yTitle);

    /* area wash then the 2px line */
    var areaD = 'M' + sx(0) + ',' + sy(scale.lo);
    series.forEach(function (d, i) { areaD += ' L' + sx(i) + ',' + sy(d.placements); });
    areaD += ' L' + sx(series.length - 1) + ',' + sy(scale.lo) + ' Z';
    svg.appendChild(svgEl('path', { d: areaD, fill: 'var(--series-1)', 'fill-opacity': 0.10 }));

    var lineD = series.map(function (d, i) { return (i ? 'L' : 'M') + sx(i) + ',' + sy(d.placements); }).join(' ');
    svg.appendChild(svgEl('path', {
      d: lineD, fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    /* endpoint marker + its direct label */
    var last = series.length - 1;
    svg.appendChild(svgEl('circle', {
      cx: sx(last), cy: sy(series[last].placements), r: 5,
      fill: 'var(--series-1)', stroke: 'var(--surface)', 'stroke-width': 2
    }));
    var endLabel = svgEl('text', {
      x: sx(last), y: sy(series[last].placements) - 12,
      'text-anchor': 'end', 'font-size': 12, 'font-weight': 620, fill: 'var(--text)'
    });
    endLabel.textContent = series[last].placements + ' in ' + series[last].month;
    svg.appendChild(endLabel);

    /* crosshair layer */
    var crosshair = svgEl('line', {
      x1: 0, y1: m.top, x2: 0, y2: m.top + ph,
      stroke: 'var(--axis)', 'stroke-width': 1, opacity: 0
    });
    svg.appendChild(crosshair);
    var focusDot = svgEl('circle', {
      cx: 0, cy: 0, r: 5, fill: 'var(--series-1)',
      stroke: 'var(--surface)', 'stroke-width': 2, opacity: 0
    });
    svg.appendChild(focusDot);

    var activeIndex = last;

    function paint(i, clientX, clientY) {
      activeIndex = i;
      var d = series[i];
      crosshair.setAttribute('x1', sx(i));
      crosshair.setAttribute('x2', sx(i));
      crosshair.setAttribute('opacity', 1);
      focusDot.setAttribute('cx', sx(i));
      focusDot.setAttribute('cy', sy(d.placements));
      focusDot.setAttribute('opacity', 1);
      var nodes = [
        el('div', 'tip-value', d.placements + (d.placements === 1 ? ' placement' : ' placements')),
        el('div', 'tip-label', d.month),
        tipRow('fees invoiced', d.fees ? fmtMoney(d.fees) : 'none')
      ];
      if (clientX === undefined) {
        var box = overlay.getBoundingClientRect();
        clientX = box.left + (sx(i) - m.left);
        clientY = box.top + (sy(d.placements) - m.top);
      }
      showTip(nodes, clientX, clientY);
    }

    function unpaint() {
      crosshair.setAttribute('opacity', 0);
      focusDot.setAttribute('opacity', 0);
      hideTip();
    }

    var overlay = svgEl('rect', {
      x: m.left, y: m.top, width: pw, height: ph,
      fill: 'transparent', class: 'chart-hit', tabindex: '0', role: 'img',
      'aria-label': 'Read the monthly figures with the left and right arrow keys. ' +
        total + ' placements across ' + series.length + ' months.'
    });
    overlay.addEventListener('pointermove', function (e) {
      var box = overlay.getBoundingClientRect();
      var rel = (e.clientX - box.left) / (box.width || 1);
      var i = Math.round(rel * (series.length - 1));
      i = Math.max(0, Math.min(series.length - 1, i));
      paint(i, e.clientX, e.clientY);
    });
    overlay.addEventListener('pointerleave', unpaint);
    overlay.addEventListener('focus', function () { paint(activeIndex); });
    overlay.addEventListener('blur', unpaint);
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); paint(Math.min(series.length - 1, activeIndex + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); paint(Math.max(0, activeIndex - 1)); }
      if (e.key === 'Home') { e.preventDefault(); paint(0); }
      if (e.key === 'End') { e.preventDefault(); paint(series.length - 1); }
    });
    svg.appendChild(overlay);

    host.appendChild(svg);
  }

  /* ---------- Stage bar: the role pipeline ------------------------------ */

  function renderStageBar(host, pipeline) {
    clear(host);
    var stages = DATA.STAGES;
    var counts = stages.map(function (s) { return pipeline[s] || 0; });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);

    var wrap = el('div', 'stagebar');
    var chartHost = el('div', 'chart-holder');
    wrap.appendChild(chartHost);

    var legend = el('div', 'stage-legend');
    stages.forEach(function (s, i) {
      var key = el('div', 'stage-key');
      var sw = el('span', 'sw');
      sw.style.background = 'var(--ord-' + (i + 1) + ')';
      key.appendChild(sw);
      key.appendChild(el('span', 'n', counts[i]));
      key.appendChild(el('span', 'l', s));
      legend.appendChild(key);
    });
    wrap.appendChild(legend);
    host.appendChild(wrap);

    /* built after insertion so the holder has a measurable width */
    var W = chartWidth(chartHost, 460);
    var H = 30;
    var gap = 2;
    var usable = W - gap * (stages.length - 1);

    var svg = svgEl('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Pipeline stage bar. ' + stages.map(function (s, i) {
        return counts[i] + ' ' + s.toLowerCase();
      }).join(', ') + '. ' + total + ' candidates in total.'
    });

    if (total === 0) {
      svg.appendChild(svgEl('rect', { x: 0, y: 4, width: W, height: 20, rx: 4, fill: 'var(--grid)' }));
      var t = svgEl('text', { x: W / 2, y: 19, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-axis)' });
      t.textContent = 'No candidates in the pipeline yet';
      svg.appendChild(t);
      chartHost.appendChild(svg);
      return;
    }

    var x = 0;
    counts.forEach(function (c, i) {
      var w = (c / total) * usable;
      if (c > 0 && w < 6) { w = 6; }
      if (w <= 0) { return; }
      var seg = svgEl('rect', {
        x: x, y: 4, width: w, height: 22, rx: 3,
        fill: 'var(--ord-' + (i + 1) + ')'
      });
      svg.appendChild(seg);

      var hit = svgEl('rect', {
        x: x, y: 0, width: w, height: H,
        fill: 'transparent', class: 'chart-hit', tabindex: '0', role: 'img',
        'aria-label': stages[i] + ': ' + c + ' of ' + total + ' candidates.'
      });
      function nodes() {
        return [
          el('div', 'tip-value', c + (c === 1 ? ' candidate' : ' candidates')),
          el('div', 'tip-label', stages[i]),
          el('div', 'tip-label', Math.round((c / total) * 100) + '% of the pipeline')
        ];
      }
      hit.addEventListener('mouseenter', function (e) { seg.setAttribute('fill-opacity', 0.8); showTip(nodes(), e.clientX, e.clientY); });
      hit.addEventListener('mousemove', function (e) { showTip(nodes(), e.clientX, e.clientY); });
      hit.addEventListener('mouseleave', function () { seg.removeAttribute('fill-opacity'); hideTip(); });
      hit.addEventListener('focus', function () { seg.setAttribute('fill-opacity', 0.8); var cc = centreOf(hit); showTip(nodes(), cc.x, cc.y); });
      hit.addEventListener('blur', function () { seg.removeAttribute('fill-opacity'); hideTip(); });
      svg.appendChild(hit);

      x += w + gap;
    });

    chartHost.appendChild(svg);
  }

  /* ===================================================================== *
   * Domain helpers
   * ===================================================================== */

  function recruiterById(id) {
    var out = null;
    DATA.recruiters.forEach(function (r) { if (r.id === id) { out = r; } });
    return out;
  }

  function briefById(id) {
    var out = null;
    DATA.briefs.forEach(function (b) { if (b.id === id) { out = b; } });
    return out;
  }

  function roleById(id) {
    var out = null;
    DATA.roles.forEach(function (r) { if (r.id === id) { out = r; } });
    return out;
  }

  function nicheStat(recruiter, niche) {
    var out = null;
    recruiter.nicheStats.forEach(function (n) { if (n.niche === niche) { out = n; } });
    return out;
  }

  /* Ranking of every recruiter active in a niche, best hit-rate first. */
  function nicheRanking(niche) {
    return DATA.recruiters
      .filter(function (r) { return !!nicheStat(r, niche); })
      .map(function (r) {
        var ns = nicheStat(r, niche);
        return { recruiter: r, hitRate: ns.hitRate, briefs: ns.briefs, placements: ns.placements };
      })
      .sort(function (a, b) { return b.hitRate - a.hitRate; });
  }

  /* "Top 34%" is a silly way to describe coming first in a field of three, and
     "Top 80%" is a euphemism. Say what the position actually is. */
  function percentileLabel(pos, n) {
    if (n <= 1) { return 'Only recruiter'; }
    if (pos === 1) { return 'Best in niche'; }
    var frac = pos / n;
    if (frac <= 0.5) { return 'Top ' + Math.ceil(frac * 100) + '%'; }
    return 'Bottom ' + Math.ceil(((n - pos + 1) / n) * 100) + '%';
  }

  function statusBadgeClass(status) {
    if (status === 'Placed') { return 'badge badge-good'; }
    if (status === 'Offer out') { return 'badge badge-serious'; }
    if (status === 'On hold') { return 'badge badge-warn'; }
    if (status === 'Interviewing') { return 'badge badge-accent'; }
    return 'badge badge-neutral';
  }

  var TRUST_EXPLAINER = [
    'Hit-rate is placements divided by briefs taken, measured over the last twelve months across every firm on CounselMatch — not just yours.',
    'Because the platform sees both sides of each brief, a recruiter cannot pad the number by only counting the searches that worked.',
    'That history is the asset: a firm joining today inherits it, and a recruiter carries it between firms.'
  ];

  /* ===================================================================== *
   * Slide-over
   * ===================================================================== */

  var lastTrigger = null;

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (n) { return n.offsetParent !== null || n.getClientRects().length; });
  }

  function closeDetail() {
    var overlay = $('overlay');
    if (overlay.hidden) { return; }
    overlay.hidden = true;
    state.openDetail = null;
    hideTip();
    if (lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function showDetail(kicker, title, buildBody) {
    var overlay = $('overlay');
    $('slideover-kicker').textContent = kicker;
    $('slideover-title').textContent = title;
    var body = $('slideover-body');
    clear(body);
    overlay.hidden = false;
    buildBody(body);
    var f = focusables($('slideover'));
    if (f.length) { f[0].focus(); }
  }

  function metaGrid(pairs) {
    var grid = el('div', 'meta-grid');
    pairs.forEach(function (p) {
      var item = el('div', 'meta-item');
      item.appendChild(el('div', 'meta-label', p[0]));
      item.appendChild(el('div', 'meta-value', p[1]));
      grid.appendChild(item);
    });
    return grid;
  }

  function sectionTitle(text, explainer) {
    var h = el('h3', 'section-title');
    h.appendChild(document.createTextNode(text));
    if (explainer) { h.appendChild(infoButton(explainer.label, explainer.lines)); }
    return h;
  }

  /* `lastTrigger` is set by the caller (the row that was activated) so focus
     can return to it when the panel closes. */
  function openDetail(type, id) {
    state.openDetail = { type: type, id: id };
    if (type === 'role') { openRoleDetail(id); }
    else if (type === 'recruiter') { openRecruiterDetail(id); }
    else if (type === 'brief') { openBriefDetail(id); }
  }

  function openRoleDetail(id) {
    var role = roleById(id);
    if (!role) { return; }
    showDetail(role.practice, role.title, function (body) {
      body.appendChild(metaGrid([
        ['PQE band', role.pqe],
        ['Location', role.location],
        ['Salary band', fmtBand(role.salaryMin, role.salaryMax)],
        ['Placement fee', role.feePct + '% of base'],
        ['Posted', fmtDate(role.posted)],
        ['Days open', String(role.daysOpen)],
        ['Exclusivity', role.exclusive ? 'Exclusive, 30 days' : 'Open panel'],
        ['Status', role.status]
      ]));

      var noteBlock = el('div', 'detail-block');
      noteBlock.appendChild(sectionTitle('The real brief'));
      noteBlock.appendChild(el('p', 'section-note', role.note));
      body.appendChild(noteBlock);

      var pipeBlock = el('div', 'detail-block');
      pipeBlock.appendChild(sectionTitle('Pipeline — where the ' + role.pipelineTotal + ' candidates sit now'));
      var stageHost = el('div');
      pipeBlock.appendChild(stageHost);
      pipeBlock.appendChild(el('p', 'section-note',
        'Each candidate is counted once, at their current stage, so the five figures add to ' + role.pipelineTotal + '.'));
      body.appendChild(pipeBlock);
      renderStageBar(stageHost, role.pipeline);

      var recBlock = el('div', 'detail-block');
      recBlock.appendChild(sectionTitle('Engaged recruiters, ranked', {
        label: 'How the trust graph ranks them',
        lines: TRUST_EXPLAINER
      }));
      if (!role.recruiters.length) {
        recBlock.appendChild(el('p', 'section-note',
          'No recruiters engaged yet. Invite them from the matched list on Post a role.'));
      } else {
        recBlock.appendChild(el('p', 'section-note',
          'Ranked by hit-rate in ' + role.practice + ' where they work that niche, otherwise by their overall rate.'));
        var ranked = role.recruiters.map(function (rid) {
          var r = recruiterById(rid);
          var ns = nicheStat(r, role.practice);
          return { r: r, ns: ns, key: ns ? ns.hitRate : r.hitRate - 100 };
        }).sort(function (a, b) { return b.key - a.key; });

        var list = el('ul', 'rank-list');
        ranked.forEach(function (entry, i) {
          var li = el('li', 'rank-row');
          var num = el('div', 'match-rank' + (i === 0 ? ' top' : ''), String(i + 1));
          li.appendChild(num);
          var main = el('div', 'rank-main');
          main.appendChild(el('div', 'match-name', entry.r.name));
          main.appendChild(el('div', 'match-why', entry.ns
            ? entry.r.boutique + ' · ' + entry.ns.placements + ' of ' + entry.ns.briefs + ' ' + role.practice + ' briefs filled'
            : entry.r.boutique + ' · no ' + role.practice + ' history on CounselMatch'));
          li.appendChild(main);
          var figs = el('div', 'rank-figs');
          figs.appendChild(el('div', 'big', entry.ns ? fmtPct(entry.ns.hitRate) : fmtPct(entry.r.hitRate)));
          figs.appendChild(el('div', 'small', entry.ns ? 'in niche' : 'overall'));
          figs.appendChild(el('div', 'small', entry.r.medianDays + ' day median'));
          li.appendChild(figs);
          list.appendChild(li);
        });
        recBlock.appendChild(list);
      }
      body.appendChild(recBlock);
    });
  }

  function openRecruiterDetail(id) {
    var r = recruiterById(id);
    if (!r) { return; }
    showDetail(r.boutique + ' · ' + r.city, r.name, function (body) {
      body.appendChild(metaGrid([
        ['Hit-rate', fmtPct(r.hitRate)],
        ['Placements, 12 mo', String(r.placements)],
        ['Briefs taken, 12 mo', String(r.briefsTaken)],
        ['Median days to fill', String(r.medianDays)],
        ['Firm rating', r.rating.toFixed(1) + ' / 5'],
        ['On platform since', String(r.since)]
      ]));

      var block = el('div', 'detail-block');
      block.appendChild(sectionTitle('Hit-rate by niche', {
        label: 'How the trust graph ranks them',
        lines: TRUST_EXPLAINER
      }));
      var host = el('div', 'chart-holder');
      block.appendChild(host);
      block.appendChild(el('p', 'section-note',
        r.placements + ' placements from ' + r.briefsTaken + ' briefs across ' +
        r.nicheStats.length + (r.nicheStats.length === 1 ? ' niche' : ' niches') +
        ' gives the overall rate of ' + fmtPct(r.hitRate) + '.'));
      body.appendChild(block);

      renderHBar(host, r.nicheStats.map(function (n) {
        return {
          label: n.niche,
          value: n.hitRate,
          valueLabel: fmtPct(n.hitRate),
          sub: n.placements + ' of ' + n.briefs + ' briefs',
          detail: n.placements + ' placements from ' + n.briefs + ' briefs taken'
        };
      }), { ariaLabel: 'Hit-rate by niche for ' + r.name });

      var rankBlock = el('div', 'detail-block');
      rankBlock.appendChild(sectionTitle('Where they sit in each niche'));
      var grid = el('div', 'rank-grid');
      r.nicheStats.forEach(function (n) {
        var ranking = nicheRanking(n.niche);
        var pos = 0;
        ranking.forEach(function (entry, i) { if (entry.recruiter.id === r.id) { pos = i + 1; } });
        var card = el('div', 'rank-card');
        card.appendChild(el('div', 'rank-niche', n.niche));
        card.appendChild(el('div', 'rank-pct', '#' + pos + ' of ' + ranking.length));
        card.appendChild(el('div', 'rank-meta',
          percentileLabel(pos, ranking.length) + ' on hit-rate, against a niche median of ' +
          fmtPct(median(ranking.map(function (e) { return e.hitRate; })))));
        grid.appendChild(card);
      });
      rankBlock.appendChild(grid);
      body.appendChild(rankBlock);
    });
  }

  function openBriefDetail(id) {
    var b = briefById(id);
    if (!b) { return; }
    var claimed = state.claimed.indexOf(b.id) !== -1;
    var me = DATA.currentRecruiter;
    var ns = nicheStat(me, b.practice);

    showDetail(b.practice, claimed ? b.firmRevealed : b.firmMasked, function (body) {
      body.appendChild(metaGrid([
        ['PQE band', b.pqe],
        ['Location', b.location],
        ['Salary band', fmtBand(b.salaryMin, b.salaryMax)],
        ['Your fee', b.feePct + '% (' + fmtMoney(b.salaryMin * b.feePct / 100) + ' at the floor)'],
        ['Recruiters competing', String(b.competing + (claimed ? 1 : 0))],
        ['Posted', fmtDate(b.posted) + ' · ' + b.daysOpen + ' days ago']
      ]));

      var briefBlock = el('div', 'detail-block');
      briefBlock.appendChild(sectionTitle('What the panel actually screens for'));
      briefBlock.appendChild(el('p', 'section-note', b.brief));
      body.appendChild(briefBlock);

      var fitBlock = el('div', 'detail-block');
      fitBlock.appendChild(sectionTitle('Your record in this niche', {
        label: 'How the trust graph ranks you',
        lines: TRUST_EXPLAINER
      }));
      if (ns) {
        var ranking = nicheRanking(b.practice);
        var pos = 0;
        ranking.forEach(function (entry, i) { if (entry.recruiter.id === me.id) { pos = i + 1; } });
        fitBlock.appendChild(el('p', 'section-note',
          'You have filled ' + ns.placements + ' of ' + ns.briefs + ' ' + b.practice +
          ' briefs (' + fmtPct(ns.hitRate) + '), which ranks you #' + pos + ' of ' +
          ranking.length + ' recruiters active in this niche.'));
      } else {
        fitBlock.appendChild(el('p', 'section-note',
          'You have no ' + b.practice + ' history on CounselMatch. You can still claim the brief, but firms rank the panel on niche record first.'));
      }
      body.appendChild(fitBlock);

      var actions = el('div', 'form-actions');
      if (claimed) {
        var goBtn = el('button', 'btn btn-primary', 'Open in My briefs');
        goBtn.type = 'button';
        goBtn.addEventListener('click', function () {
          closeDetail();
          setRoute('recruiter', 'briefs');
        });
        actions.appendChild(goBtn);
        var relBtn = el('button', 'btn btn-ghost', 'Release this brief');
        relBtn.type = 'button';
        relBtn.addEventListener('click', function () { releaseBrief(b.id); closeDetail(); });
        actions.appendChild(relBtn);
      } else {
        var claimBtn = el('button', 'btn btn-primary', 'Claim brief');
        claimBtn.type = 'button';
        claimBtn.addEventListener('click', function () {
          if (claimBrief(b.id)) { closeDetail(); }
        });
        actions.appendChild(claimBtn);
        actions.appendChild(el('p', 'field-hint',
          'Claiming reveals the firm and puts you on the clock. ' +
          state.claimed.length + ' of ' + MAX_CLAIMS + ' claims in use.'));
      }
      body.appendChild(actions);
    });
  }

  /* ===================================================================== *
   * Screen: Firm — My roles
   * ===================================================================== */

  var ROLE_COLUMNS = [
    {
      key: 'title', label: 'Role',
      cell: function (td, r) {
        td.appendChild(el('span', 'cell-strong', r.title));
        td.appendChild(el('span', 'cell-sub', r.practice + ' · ' + r.location));
      }
    },
    { key: 'pqe', label: 'PQE', nowrap: true, cell: function (td, r) { td.textContent = r.pqe; } },
    {
      key: 'salaryMin', label: 'Salary band', numeric: true, nowrap: true,
      cell: function (td, r) { td.textContent = fmtBand(r.salaryMin, r.salaryMax); }
    },
    {
      key: 'recruiterCount', label: 'Recruiters', numeric: true,
      sortValue: function (r) { return r.recruiters.length; },
      cell: function (td, r) { td.textContent = r.recruiters.length; }
    },
    {
      key: 'pipelineTotal', label: 'Pipeline', numeric: true,
      cell: function (td, r) { td.textContent = r.pipelineTotal; }
    },
    { key: 'daysOpen', label: 'Days open', numeric: true, cell: function (td, r) { td.textContent = r.daysOpen; } },
    {
      key: 'status', label: 'Status', nowrap: true,
      cell: function (td, r) {
        var b = el('span', statusBadgeClass(r.status), r.status);
        td.appendChild(b);
      }
    }
  ];

  function filteredRoles() {
    return DATA.roles.filter(function (r) {
      if (state.roles.practice && r.practice !== state.roles.practice) { return false; }
      if (state.roles.status && r.status !== state.roles.status) { return false; }
      return true;
    });
  }

  function renderRolesScreen() {
    var rows = sortRows(filteredRoles(), ROLE_COLUMNS, state.roles.sort);
    var active = !!(state.roles.practice || state.roles.status);
    $('roles-reset').hidden = !active;
    $('roles-count').textContent = rows.length + ' of ' + DATA.roles.length + ' roles' + (active ? ' (filtered)' : '');
    $('roles-firm-name').textContent = DATA.FIRM.name;

    /* headline stats always describe the filtered set the reader is looking at */
    var open = rows.filter(function (r) { return r.status !== 'Placed'; }).length;
    var pipeline = rows.reduce(function (s, r) { return s + r.pipelineTotal; }, 0);
    var engaged = unique([].concat.apply([], rows.map(function (r) { return r.recruiters; }))).length;
    var med = rows.length ? median(rows.map(function (r) { return r.daysOpen; })) : 0;

    var host = $('roles-stats');
    clear(host);
    [
      ['Roles shown', String(rows.length), open + ' still open'],
      ['Candidates in pipeline', fmtInt(pipeline), 'across every stage'],
      ['Recruiters engaged', String(engaged), 'distinct boutiques'],
      ['Median days open', String(Math.round(med)), 'from first posting']
    ].forEach(function (s, i) {
      var card = el('div', 'stat' + (i === 0 ? ' stat-accent' : ''));
      card.appendChild(el('div', 'stat-label', s[0]));
      card.appendChild(el('div', 'stat-value', s[1]));
      card.appendChild(el('div', 'stat-note', s[2]));
      host.appendChild(card);
    });

    renderTable($('roles-table'), {
      columns: ROLE_COLUMNS,
      rows: rows,
      sort: state.roles.sort,
      caption: 'Roles posted by ' + DATA.FIRM.name + '. Select a row for its pipeline and recruiter ranking.',
      emptyMessage: 'No results — reset filters to see every role again.',
      onReset: resetRoleFilters,
      onSort: makeSortHandler(state.roles, {
        salaryMin: 'desc', recruiterCount: 'desc', pipelineTotal: 'desc', daysOpen: 'desc'
      }, renderRolesScreen),
      onRowClick: function (row, tr) { lastTrigger = tr; openDetail('role', row.id); },
      rowLabel: function (r) { return 'View details for ' + r.title; }
    });
  }

  function resetRoleFilters() {
    state.roles.practice = '';
    state.roles.status = '';
    $('roles-practice').value = '';
    $('roles-status').value = '';
    renderRolesScreen();
  }

  /* ===================================================================== *
   * Screen: Firm — Recruiter market
   * ===================================================================== */

  var MARKET_COLUMNS = [
    {
      key: 'name', label: 'Recruiter',
      cell: function (td, r) {
        td.appendChild(el('span', 'cell-strong', r.name));
        td.appendChild(el('span', 'cell-sub', r.boutique + ' · ' + r.city));
      }
    },
    {
      key: 'niches', label: 'Niches', sortable: false,
      cell: function (td, r) {
        var chips = el('div', 'niche-chips');
        r.niches.forEach(function (n) { chips.appendChild(el('span', 'chip', n)); });
        td.appendChild(chips);
      }
    },
    {
      key: 'placements', label: 'Placements', numeric: true,
      cell: function (td, r) { td.textContent = r.placements; }
    },
    {
      key: 'briefsTaken', label: 'Briefs taken', numeric: true,
      cell: function (td, r) { td.textContent = r.briefsTaken; }
    },
    {
      key: 'hitRate', label: 'Hit-rate', numeric: true, nowrap: true,
      cell: function (td, r) { td.textContent = fmtPct(r.hitRate); }
    },
    {
      key: 'medianDays', label: 'Median days', numeric: true,
      cell: function (td, r) { td.textContent = r.medianDays; }
    },
    {
      key: 'rating', label: 'Rating', numeric: true, nowrap: true,
      cell: function (td, r) { td.textContent = r.rating.toFixed(1); }
    }
  ];

  function filteredRecruiters() {
    var q = state.market.q.trim().toLowerCase();
    var minHit = Number(state.market.minHit) || 0;
    return DATA.recruiters.filter(function (r) {
      if (state.market.niche && r.niches.indexOf(state.market.niche) === -1) { return false; }
      if (r.hitRate < minHit) { return false; }
      if (q) {
        var hay = (r.name + ' ' + r.boutique + ' ' + r.city + ' ' + r.niches.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });
  }

  function renderMarketScreen() {
    var matched = filteredRecruiters();
    var rows = sortRows(matched, MARKET_COLUMNS, state.market.sort);
    var active = !!(state.market.niche || state.market.minHit !== '0' || state.market.q);
    $('market-reset').hidden = !active;
    $('market-count').textContent = rows.length + ' of ' + DATA.recruiters.length + ' recruiters' + (active ? ' (filtered)' : '');

    var scatterHost = $('market-scatter');
    var legendHost = $('market-size-legend');
    if (matched.length) {
      renderScatter(scatterHost, matched, DATA.recruiters);
      renderSizeLegend(legendHost);
    } else {
      clear(scatterHost);
      clear(legendHost);
      scatterHost.appendChild(emptyState('No recruiters match these filters, so there is nothing to plot.', resetMarketFilters));
    }

    renderTable($('market-table'), {
      columns: MARKET_COLUMNS,
      rows: rows,
      sort: state.market.sort,
      caption: 'Recruiter directory — the same figures the chart plots. Select a row for the niche breakdown.',
      emptyMessage: 'No results — reset filters to see every recruiter again.',
      onReset: resetMarketFilters,
      onSort: makeSortHandler(state.market, {
        placements: 'desc', briefsTaken: 'desc', hitRate: 'desc', rating: 'desc', medianDays: 'asc'
      }, renderMarketScreen),
      onRowClick: function (row, tr) { lastTrigger = tr; openDetail('recruiter', row.id); },
      rowLabel: function (r) { return 'View the record for ' + r.name + ' of ' + r.boutique; }
    });
  }

  function resetMarketFilters() {
    state.market.niche = '';
    state.market.minHit = '0';
    state.market.q = '';
    $('market-niche').value = '';
    $('market-hitrate').value = '0';
    $('market-search').value = '';
    renderMarketScreen();
  }

  /* ===================================================================== *
   * Screen: Firm — Post a role
   * ===================================================================== */

  function matchScore(recruiter, practice) {
    var ns = nicheStat(recruiter, practice);
    var base = ns ? ns.hitRate : recruiter.hitRate * 0.45;
    var speed = Math.max(0, 60 - recruiter.medianDays) * 0.45;
    var rating = (recruiter.rating - 3.8) * 8;
    return { ns: ns, score: Math.round(base + speed + rating) };
  }

  function matchedRecruiters(practice, feePct, exclusive) {
    var scored = DATA.recruiters.map(function (r) {
      var m = matchScore(r, practice);
      var appetite = m.score + (feePct - 21) * 4 + (exclusive ? 6 : 0);
      return { r: r, ns: m.ns, score: m.score, appetite: appetite };
    }).sort(function (a, b) {
      if (b.score !== a.score) { return b.score - a.score; }
      return a.r.medianDays - b.r.medianDays;
    });
    return scored.slice(0, exclusive ? 3 : 6);
  }

  function appetiteBadge(appetite) {
    if (appetite >= 92) { return { cls: 'badge badge-good', text: 'Very likely to accept' }; }
    if (appetite >= 78) { return { cls: 'badge badge-accent', text: 'Likely to accept' }; }
    return { cls: 'badge badge-neutral', text: 'May decline' };
  }

  function renderMatches(role) {
    var results = $('post-results');
    results.hidden = false;
    $('post-results-title').textContent = 'Matched recruiters for ' + role.title;
    $('post-results-sub').textContent = role.exclusive
      ? 'Exclusive briefs go to your top three matches only. Ranked by hit-rate in ' + role.practice + ', then speed and firm rating.'
      : 'Ranked by hit-rate in ' + role.practice + ', then speed and firm rating. Invite as many as you want to compete.';

    var list = $('post-match-list');
    clear(list);
    var matches = matchedRecruiters(role.practice, role.feePct, role.exclusive);

    matches.forEach(function (m, i) {
      var li = el('li', 'match-item');
      li.appendChild(el('div', 'match-rank', String(i + 1)));

      var bodyEl = el('div', 'match-body');
      bodyEl.appendChild(el('div', 'match-name', m.r.name + ' — ' + m.r.boutique));
      bodyEl.appendChild(el('div', 'match-why', m.ns
        ? 'Niche match · ' + fmtPct(m.ns.hitRate) + ' in ' + role.practice + ' (' + m.ns.placements +
          ' of ' + m.ns.briefs + ' briefs) · ' + m.r.medianDays + ' day median · rated ' + m.r.rating.toFixed(1)
        : 'Adjacent · ' + fmtPct(m.r.hitRate) + ' overall, no ' + role.practice + ' history · ' +
          m.r.medianDays + ' day median · rated ' + m.r.rating.toFixed(1)));
      var badge = appetiteBadge(m.appetite);
      var badgeWrap = el('div', 'match-why');
      badgeWrap.appendChild(el('span', badge.cls, badge.text + ' at ' + role.feePct + '%'));
      bodyEl.appendChild(badgeWrap);
      li.appendChild(bodyEl);

      var btn = el('button', 'btn btn-primary btn-sm', 'Invite');
      btn.type = 'button';
      var inviteKey = role.id + ':' + m.r.id;
      if (state.invited[inviteKey]) {
        btn.textContent = 'Invited';
        btn.disabled = true;
      }
      btn.addEventListener('click', function () {
        state.invited[inviteKey] = true;
        if (role.recruiters.indexOf(m.r.id) === -1) { role.recruiters.push(m.r.id); }
        btn.textContent = 'Invited';
        btn.disabled = true;
        toast('Invitation sent to ' + m.r.name + ' at ' + m.r.boutique + '.');
        updateTabBadges();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });

    var foot = $('post-match-foot');
    clear(foot);
    foot.appendChild(document.createTextNode(
      role.title + ' is live in My roles and on the recruiter brief board. '
    ));
    var link = el('button', 'reset-link', 'Open it in My roles');
    link.type = 'button';
    link.addEventListener('click', function () { setRoute('firm', 'roles'); });
    foot.appendChild(link);
  }

  function initPostForm() {
    var practiceSel = $('post-practice');
    var pqeSel = $('post-pqe');
    var locSel = $('post-location');
    var salarySel = $('post-salary');
    var feeInput = $('post-fee');
    var feeOut = $('post-fee-out');

    fillSelect(practiceSel, DATA.NICHES);
    fillSelect(pqeSel, DATA.PQE_BANDS);
    fillSelect(locSel, DATA.LOCATIONS);
    clear(salarySel);
    DATA.SALARY_BANDS.forEach(function (b, i) {
      var o = el('option', null, b.label);
      o.value = String(i);
      salarySel.appendChild(o);
    });
    practiceSel.value = 'Projects & Energy';
    pqeSel.value = '5-8 PQE';
    locSel.value = 'Sydney';
    salarySel.value = '3';

    feeInput.addEventListener('input', function () { feeOut.textContent = feeInput.value + '%'; });

    $('post-reset').addEventListener('click', function () {
      $('post-title').value = '';
      $('post-title-err').hidden = true;
      practiceSel.value = 'Projects & Energy';
      pqeSel.value = '5-8 PQE';
      locSel.value = 'Sydney';
      salarySel.value = '3';
      feeInput.value = '22';
      feeOut.textContent = '22%';
      $('post-exclusive').checked = false;
      $('post-results').hidden = true;
      $('post-title').focus();
    });

    $('post-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var titleInput = $('post-title');
      var title = titleInput.value.trim();
      if (!title) {
        $('post-title-err').hidden = false;
        titleInput.setAttribute('aria-invalid', 'true');
        titleInput.focus();
        return;
      }
      $('post-title-err').hidden = true;
      titleInput.removeAttribute('aria-invalid');

      var band = DATA.SALARY_BANDS[Number(salarySel.value)];
      var feePct = Number(feeInput.value);
      var exclusive = $('post-exclusive').checked;
      var practice = practiceSel.value;

      var role = {
        id: 'ro-new-' + (DATA.roles.length + 1),
        title: title,
        practice: practice,
        pqe: pqeSel.value,
        location: locSel.value,
        salaryMin: band.min,
        salaryMax: band.max,
        feePct: feePct,
        exclusive: exclusive,
        posted: DATA.TODAY,
        status: 'Sourcing',
        recruiters: [],
        pipeline: { Sourced: 0, Screened: 0, Interviewing: 0, Offer: 0, Placed: 0 },
        pipelineTotal: 0,
        daysOpen: 0,
        note: 'Posted today from the CounselMatch brief builder. ' +
          (exclusive ? 'Exclusive to the top three matches for 30 days.' : 'Open panel — any invited recruiter may submit.')
      };
      DATA.roles.unshift(role);

      DATA.briefs.unshift({
        id: 'b-new-' + (DATA.briefs.length + 1),
        firmMasked: DATA.FIRM.descriptor.replace('Sydney', role.location),
        firmRevealed: DATA.FIRM.name,
        practice: practice,
        pqe: role.pqe,
        location: role.location,
        salaryMin: band.min,
        salaryMax: band.max,
        feePct: feePct,
        competing: 0,
        posted: DATA.TODAY,
        daysOpen: 0,
        brief: role.note
      });

      renderMatches(role);
      updateTabBadges();
      toast('Role posted — live in My roles and on the brief board.');
      $('post-results').scrollIntoView({ block: 'nearest' });
    });
  }

  /* ===================================================================== *
   * Screen: Recruiter — Brief board
   * ===================================================================== */

  function briefFit(b) {
    return nicheStat(DATA.currentRecruiter, b.practice) ? 'Strong' : 'Adjacent';
  }

  var BOARD_COLUMNS = [
    {
      key: 'firmMasked', label: 'Firm',
      cell: function (td, b) {
        td.appendChild(el('span', 'cell-strong', b.firmMasked));
        td.appendChild(el('span', 'cell-sub', b.location));
      }
    },
    {
      key: 'practice', label: 'Practice area',
      cell: function (td, b) { td.textContent = b.practice; }
    },
    { key: 'pqe', label: 'PQE', nowrap: true, cell: function (td, b) { td.textContent = b.pqe; } },
    {
      key: 'salaryMin', label: 'Salary band', numeric: true, nowrap: true,
      cell: function (td, b) { td.textContent = fmtBand(b.salaryMin, b.salaryMax); }
    },
    {
      key: 'feePct', label: 'Fee', numeric: true, nowrap: true,
      cell: function (td, b) { td.textContent = b.feePct + '%'; }
    },
    {
      key: 'competing', label: 'Competing', numeric: true,
      cell: function (td, b) { td.textContent = b.competing; }
    },
    {
      key: 'posted', label: 'Posted', numeric: true, nowrap: true,
      sortValue: function (b) { return b.posted; },
      cell: function (td, b) { td.textContent = b.daysOpen === 0 ? 'today' : b.daysOpen + 'd ago'; }
    },
    {
      key: 'fit', label: 'Fit', nowrap: true,
      sortValue: function (b) { return briefFit(b); },
      cell: function (td, b) {
        var f = briefFit(b);
        td.appendChild(el('span', f === 'Strong' ? 'badge badge-accent' : 'badge badge-neutral', f));
      }
    },
    {
      key: 'claim', label: 'Action', sortable: false,
      cell: function (td, b) {
        var btn = el('button', 'btn btn-primary btn-sm', 'Claim brief');
        btn.type = 'button';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          claimBrief(b.id);
        });
        td.appendChild(btn);
      }
    }
  ];

  function openBriefs() {
    return DATA.briefs.filter(function (b) { return state.claimed.indexOf(b.id) === -1; });
  }

  function filteredBriefs() {
    var q = state.board.q.trim().toLowerCase();
    return openBriefs().filter(function (b) {
      if (state.board.practice && b.practice !== state.board.practice) { return false; }
      if (state.board.pqe && b.pqe !== state.board.pqe) { return false; }
      if (state.board.fit === 'fit' && briefFit(b) !== 'Strong') { return false; }
      if (q) {
        var hay = (b.firmMasked + ' ' + b.practice + ' ' + b.location + ' ' + b.pqe).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });
  }

  function renderClaimMeter() {
    var host = $('claim-meter');
    clear(host);
    var pips = el('div', 'claim-pips');
    for (var i = 0; i < MAX_CLAIMS; i++) {
      var pip = el('div', 'claim-pip' + (i < state.claimed.length ? ' on' : ''));
      pips.appendChild(pip);
    }
    host.appendChild(pips);
    var text = el('span', 'claim-text');
    text.appendChild(document.createTextNode(
      state.claimed.length + ' of ' + MAX_CLAIMS + ' active claims in use.'
    ));
    host.appendChild(text);
    if (state.claimed.length) {
      var btn = el('button', 'reset-link', 'Go to My briefs');
      btn.type = 'button';
      btn.addEventListener('click', function () { setRoute('recruiter', 'briefs'); });
      host.appendChild(btn);
    }
  }

  function renderBoardScreen() {
    renderClaimMeter();
    var rows = sortRows(filteredBriefs(), BOARD_COLUMNS, state.board.sort);
    var active = !!(state.board.practice || state.board.pqe || state.board.fit !== 'all' || state.board.q);
    $('board-reset').hidden = !active;
    $('board-count').textContent = rows.length + ' of ' + openBriefs().length + ' open briefs' + (active ? ' (filtered)' : '');

    renderTable($('board-table'), {
      columns: BOARD_COLUMNS,
      rows: rows,
      sort: state.board.sort,
      caption: 'Open briefs across every firm on CounselMatch. Select a row to read what the panel actually screens for.',
      emptyMessage: state.claimed.length === DATA.briefs.length
        ? 'You have claimed every brief on the board.'
        : 'No results — reset filters to see every open brief again.',
      onReset: resetBoardFilters,
      onSort: makeSortHandler(state.board, {
        salaryMin: 'desc', feePct: 'desc', competing: 'desc', posted: 'desc'
      }, renderBoardScreen),
      onRowClick: function (row, tr) { lastTrigger = tr; openDetail('brief', row.id); },
      rowLabel: function (b) { return 'View the ' + b.practice + ' brief from ' + b.firmMasked; }
    });
  }

  function resetBoardFilters() {
    state.board.practice = '';
    state.board.pqe = '';
    state.board.fit = 'all';
    state.board.q = '';
    $('board-practice').value = '';
    $('board-pqe').value = '';
    $('board-fit').value = 'all';
    $('board-search').value = '';
    renderBoardScreen();
  }

  function claimBrief(id) {
    if (state.claimed.indexOf(id) !== -1) { return false; }
    if (state.claimed.length >= MAX_CLAIMS) {
      toast('You are holding ' + MAX_CLAIMS + ' briefs already. Release one in My briefs to take another.', 'warn');
      return false;
    }
    var b = briefById(id);
    state.claimed.push(id);
    toast('Brief claimed — ' + b.firmRevealed + ' revealed in My briefs.');
    updateTabBadges();
    renderScreen();
    return true;
  }

  function releaseBrief(id) {
    var idx = state.claimed.indexOf(id);
    if (idx === -1) { return; }
    state.claimed.splice(idx, 1);
    var b = briefById(id);
    toast('Released the ' + b.practice + ' brief. It is back on the board.');
    updateTabBadges();
    renderScreen();
  }

  /* ===================================================================== *
   * Screen: Recruiter — My briefs
   * ===================================================================== */

  function renderMyBriefsScreen() {
    var host = $('my-briefs-list');
    clear(host);

    if (!state.claimed.length) {
      var box = el('div', 'card');
      box.appendChild(el('h2', 'card-title', 'No briefs claimed yet'));
      box.appendChild(el('p', 'card-sub',
        'Claim up to ' + MAX_CLAIMS + ' briefs from the board. The firm is revealed as soon as you do, and every candidate you submit is recorded against your hit-rate in that niche.'));
      var go = el('button', 'btn btn-primary', 'Go to the brief board');
      go.type = 'button';
      go.style.marginTop = '16px';
      go.addEventListener('click', function () { setRoute('recruiter', 'board'); });
      box.appendChild(go);
      host.appendChild(box);
      return;
    }

    var wrap = el('div', 'brief-cards');
    state.claimed.forEach(function (id) {
      var b = briefById(id);
      if (!b) { return; }
      wrap.appendChild(briefCard(b));
    });
    host.appendChild(wrap);
  }

  function briefCard(b) {
    var card = el('div', 'brief-card');

    var head = el('div', 'brief-card-head');
    var headLeft = el('div');
    headLeft.appendChild(el('h2', null, b.firmRevealed));
    headLeft.appendChild(el('p', 'card-sub', b.practice + ' · ' + b.pqe + ' · ' + b.location));
    head.appendChild(headLeft);

    var headRight = el('div', 'form-actions');
    var release = el('button', 'btn btn-ghost btn-sm', 'Release brief');
    release.type = 'button';
    release.addEventListener('click', function () { releaseBrief(b.id); });
    headRight.appendChild(release);
    head.appendChild(headRight);
    card.appendChild(head);

    var meta = el('div', 'brief-meta');
    [
      ['Salary band', fmtBand(b.salaryMin, b.salaryMax)],
      ['Your fee', b.feePct + '%'],
      ['Fee at the floor', fmtMoney(b.salaryMin * b.feePct / 100)],
      ['Competing', String(b.competing + 1)],
      ['Posted', b.daysOpen === 0 ? 'today' : b.daysOpen + ' days ago']
    ].forEach(function (p) {
      var span = el('span');
      span.appendChild(document.createTextNode(p[0] + ' '));
      span.appendChild(el('b', null, p[1]));
      meta.appendChild(span);
    });
    card.appendChild(meta);

    card.appendChild(el('p', 'brief-body', b.brief));

    var form = el('form', 'submit-form');
    form.appendChild(el('h3', null, 'Submit a candidate'));

    var row1 = el('div', 'form-row');
    var nameField = el('label', 'field');
    nameField.appendChild(el('span', 'field-label', 'Candidate name'));
    var nameInput = el('input');
    nameInput.type = 'text';
    nameInput.autocomplete = 'off';
    nameInput.placeholder = 'e.g. Alexandra Reid';
    nameField.appendChild(nameInput);
    var nameErr = el('span', 'field-error', 'Add a candidate name before submitting.');
    nameErr.hidden = true;
    nameField.appendChild(nameErr);
    row1.appendChild(nameField);

    var pqeField = el('label', 'field');
    pqeField.appendChild(el('span', 'field-label', 'PQE'));
    var pqeSel = el('select');
    fillSelect(pqeSel, DATA.PQE_BANDS);
    pqeSel.value = b.pqe;
    pqeField.appendChild(pqeSel);
    row1.appendChild(pqeField);
    form.appendChild(row1);

    var row2 = el('div', 'form-row');
    var firmField = el('label', 'field');
    firmField.appendChild(el('span', 'field-label', 'Current firm'));
    var firmInput = el('input');
    firmInput.type = 'text';
    firmInput.autocomplete = 'off';
    firmInput.placeholder = 'e.g. Corben Wray';
    firmField.appendChild(firmInput);
    row2.appendChild(firmField);

    var salField = el('label', 'field');
    salField.appendChild(el('span', 'field-label', 'Expected base (AUD)'));
    var salInput = el('input');
    salInput.type = 'number';
    salInput.min = '100000';
    salInput.max = '500000';
    salInput.step = '5000';
    salInput.value = String(b.salaryMin);
    salField.appendChild(salInput);
    row2.appendChild(salField);
    form.appendChild(row2);

    var row3 = el('div', 'form-row');
    var noteField = el('label', 'field field-wide');
    noteField.appendChild(el('span', 'field-label', 'Why they fit the real brief'));
    var noteInput = el('textarea');
    noteInput.placeholder = 'One or two lines the hiring partner will actually read.';
    noteField.appendChild(noteInput);
    row3.appendChild(noteField);
    form.appendChild(row3);

    var actions = el('div', 'form-actions');
    var submit = el('button', 'btn btn-primary', 'Submit candidate');
    submit.type = 'submit';
    actions.appendChild(submit);
    form.appendChild(actions);

    var list = el('ul', 'cand-list');
    function paintList() {
      clear(list);
      var subs = state.submissions[b.id] || [];
      subs.forEach(function (s) {
        var li = el('li', 'cand-item');
        li.appendChild(el('span', 'cand-name', s.name));
        li.appendChild(el('span', 'cand-meta',
          s.pqe + (s.firm ? ' · ' + s.firm : '') + ' · expects ' + fmtMoney(s.salary)));
        li.appendChild(el('span', 'badge badge-accent', 'Submitted'));
        if (s.note) { li.appendChild(el('span', 'cand-meta', s.note)); }
        list.appendChild(li);
      });
      if (subs.length) {
        var count = el('p', 'field-hint',
          subs.length + (subs.length === 1 ? ' candidate' : ' candidates') + ' submitted against this brief.');
        list.appendChild(count);
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      if (!name) {
        nameErr.hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
      }
      nameErr.hidden = true;
      nameInput.removeAttribute('aria-invalid');
      if (!state.submissions[b.id]) { state.submissions[b.id] = []; }
      state.submissions[b.id].push({
        name: name,
        pqe: pqeSel.value,
        firm: firmInput.value.trim(),
        salary: Number(salInput.value) || b.salaryMin,
        note: noteInput.value.trim()
      });
      nameInput.value = '';
      firmInput.value = '';
      noteInput.value = '';
      paintList();
      toast(name + ' submitted to ' + b.firmRevealed + '.');
      nameInput.focus();
    });

    card.appendChild(form);
    card.appendChild(list);
    paintList();
    return card;
  }

  /* ===================================================================== *
   * Screen: Recruiter — My performance
   * ===================================================================== */

  var PERF_COLUMNS = [
    { key: 'month', label: 'Month', sortable: false, cell: function (td, m) { td.textContent = m.month; } },
    {
      key: 'placements', label: 'Placements', numeric: true, sortable: false,
      cell: function (td, m) { td.textContent = m.placements; }
    },
    {
      key: 'fees', label: 'Fees invoiced', numeric: true, sortable: false,
      cell: function (td, m) { td.textContent = m.fees ? fmtMoney(m.fees) : '—'; }
    }
  ];

  function renderPerfScreen() {
    var me = DATA.currentRecruiter;

    var stats = $('perf-stats');
    clear(stats);
    var tiles = [
      { label: 'Fees earned YTD', value: fmtMoney(me.feesYtd), note: 'January to August 2026', hero: true },
      { label: 'Placements, 12 months', value: String(me.placements), note: 'to August 2026' },
      { label: 'Hit-rate', value: fmtPct(me.hitRate), note: me.placements + ' of ' + me.briefsTaken + ' briefs taken' },
      { label: 'Median days to fill', value: String(me.medianDays), note: 'market median is ' + median(DATA.recruiters.map(function (r) { return r.medianDays; })) + ' days' }
    ];
    tiles.forEach(function (t) {
      var card = el('div', 'stat' + (t.hero ? ' stat-hero stat-accent' : ''));
      card.appendChild(el('div', 'stat-label', t.label));
      card.appendChild(el('div', 'stat-value', t.value));
      card.appendChild(el('div', 'stat-note', t.note));
      stats.appendChild(card);
    });

    renderHBar($('perf-bar'), me.nicheStats.map(function (n) {
      return {
        label: n.niche,
        value: n.hitRate,
        valueLabel: fmtPct(n.hitRate),
        sub: n.placements + ' of ' + n.briefs + ' briefs',
        detail: n.placements + ' placements from ' + n.briefs + ' briefs taken'
      };
    }), { ariaLabel: 'Your hit-rate by niche' });

    $('perf-bar-note').textContent =
      me.nicheStats.map(function (n) { return n.placements + '/' + n.briefs; }).join(' + ') +
      ' = ' + me.placements + ' placements from ' + me.briefsTaken + ' briefs, or ' + fmtPct(me.hitRate) + ' overall.';

    renderLine($('perf-line'), me.monthly);
    $('perf-line-note').textContent =
      'The twelve months add to ' + me.placements12moFromMonthly + ' placements — the same figure the directory shows — and ' +
      fmtMoney(me.fees12mo) + ' in fees.';

    var ranks = $('perf-ranks');
    clear(ranks);
    me.nicheStats.forEach(function (n) {
      var ranking = nicheRanking(n.niche);
      var pos = 0;
      ranking.forEach(function (entry, i) { if (entry.recruiter.id === me.id) { pos = i + 1; } });
      var card = el('div', 'rank-card');
      card.appendChild(el('div', 'rank-niche', n.niche));
      card.appendChild(el('div', 'rank-pct', percentileLabel(pos, ranking.length)));
      card.appendChild(el('div', 'rank-meta',
        '#' + pos + ' of ' + ranking.length + ' recruiters active in this niche · your ' +
        fmtPct(n.hitRate) + ' against a niche median of ' +
        fmtPct(median(ranking.map(function (e) { return e.hitRate; })))));
      ranks.appendChild(card);
    });

    renderTable($('perf-table'), {
      columns: PERF_COLUMNS,
      rows: me.monthly,
      sort: { key: 'month', dir: 'asc' },
      caption: 'Monthly record, September 2025 to August 2026.',
      onSort: function () { /* fixed chronological order */ },
      footRow: function () {
        var tr = el('tr');
        var td1 = el('td', 'cell-strong', 'Twelve-month total');
        var td2 = el('td', 'num cell-strong', String(me.placements12moFromMonthly));
        var td3 = el('td', 'num cell-strong', fmtMoney(me.fees12mo));
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        return tr;
      }
    });
  }

  /* ===================================================================== *
   * Tabs & routing
   * ===================================================================== */

  var VIEWS = {
    firm: [
      { id: 'roles', label: 'My roles', panel: 'panel-firm-roles', tab: 'tab-firm-roles', render: renderRolesScreen },
      { id: 'market', label: 'Recruiter market', panel: 'panel-firm-market', tab: 'tab-firm-market', render: renderMarketScreen },
      { id: 'post', label: 'Post a role', panel: 'panel-firm-post', tab: 'tab-firm-post', render: function () { } },
      { id: 'about', label: 'About this play', panel: 'panel-about', tab: 'tab-about', render: function () { } }
    ],
    recruiter: [
      { id: 'board', label: 'Brief board', panel: 'panel-rec-board', tab: 'tab-rec-board', render: renderBoardScreen },
      { id: 'briefs', label: 'My briefs', panel: 'panel-rec-briefs', tab: 'tab-rec-briefs', render: renderMyBriefsScreen },
      { id: 'performance', label: 'My performance', panel: 'panel-rec-perf', tab: 'tab-rec-perf', render: renderPerfScreen },
      { id: 'about', label: 'About this play', panel: 'panel-about', tab: 'tab-about', render: function () { } }
    ]
  };

  var ALL_PANELS = ['panel-firm-roles', 'panel-firm-market', 'panel-firm-post',
    'panel-rec-board', 'panel-rec-briefs', 'panel-rec-perf', 'panel-about'];

  function currentView() {
    var views = VIEWS[state.perspective];
    var found = views[0];
    views.forEach(function (v) { if (v.id === state.screen) { found = v; } });
    return found;
  }

  function badgeFor(view) {
    if (view.id === 'roles') { return String(DATA.roles.length); }
    if (view.id === 'briefs') { return state.claimed.length ? state.claimed.length + '/' + MAX_CLAIMS : null; }
    if (view.id === 'board') { return String(openBriefs().length); }
    return null;
  }

  function renderTabs() {
    var host = $('tablist');
    clear(host);
    var views = VIEWS[state.perspective];
    views.forEach(function (v) {
      var btn = el('button', 'tab');
      btn.type = 'button';
      btn.id = v.tab;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', v.panel);
      var selected = v.id === state.screen;
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.tabIndex = selected ? 0 : -1;
      btn.appendChild(document.createTextNode(v.label));
      var badge = badgeFor(v);
      if (badge) {
        var b = el('span', 'tab-badge', badge);
        b.setAttribute('aria-hidden', 'true');
        btn.appendChild(b);
      }
      btn.addEventListener('click', function () { setRoute(state.perspective, v.id); });
      btn.addEventListener('keydown', function (e) {
        var idx = views.indexOf(v);
        var next = null;
        if (e.key === 'ArrowRight') { next = views[(idx + 1) % views.length]; }
        if (e.key === 'ArrowLeft') { next = views[(idx - 1 + views.length) % views.length]; }
        if (e.key === 'Home') { next = views[0]; }
        if (e.key === 'End') { next = views[views.length - 1]; }
        if (next) {
          e.preventDefault();
          setRoute(state.perspective, next.id);
          var el2 = $(next.tab);
          if (el2) { el2.focus(); }
        }
      });
      host.appendChild(btn);
    });
  }

  function updateTabBadges() {
    renderTabs();
  }

  function renderWhoAmI() {
    var host = $('whoami');
    clear(host);
    if (state.perspective === 'firm') {
      host.appendChild(document.createTextNode('Signed in as '));
      host.appendChild(el('strong', null, DATA.FIRM.name));
      host.appendChild(document.createTextNode(
        ' — ' + DATA.FIRM.team + ' · ABN ' + DATA.FIRM.abn));
    } else {
      var me = DATA.currentRecruiter;
      host.appendChild(document.createTextNode('Signed in as '));
      host.appendChild(el('strong', null, me.name));
      host.appendChild(document.createTextNode(
        ' — ' + me.boutique + ', ' + me.city + ' · on CounselMatch since ' + me.since));
    }
  }

  function renderScreen() {
    var view = currentView();
    ALL_PANELS.forEach(function (pid) {
      var p = $(pid);
      if (p) { p.hidden = pid !== view.panel; }
    });
    var panel = $(view.panel);
    if (panel) { panel.setAttribute('aria-labelledby', view.tab); }
    view.render();
  }

  function render() {
    document.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-perspective') === state.perspective ? 'true' : 'false');
    });
    renderWhoAmI();
    renderTabs();
    renderScreen();
  }

  function setRoute(perspective, screen) {
    var hash = '#/' + perspective + '/' + screen;
    if (window.location.hash === hash) {
      applyRoute();
    } else {
      window.location.hash = hash;
    }
  }

  function applyRoute() {
    var raw = window.location.hash.replace(/^#\/?/, '');
    var parts = raw.split('/');
    var perspective = VIEWS[parts[0]] ? parts[0] : 'firm';
    var views = VIEWS[perspective];
    var screen = views[0].id;
    views.forEach(function (v) { if (v.id === parts[1]) { screen = v.id; } });
    state.perspective = perspective;
    state.screen = screen;
    closeDetail();
    hideTip();
    render();
  }

  /* ===================================================================== *
   * Wiring
   * ===================================================================== */

  function initFilters() {
    fillSelect($('roles-practice'), unique(DATA.roles.map(function (r) { return r.practice; })).sort(), 'All practice areas');
    fillSelect($('roles-status'), unique(DATA.roles.map(function (r) { return r.status; })).sort(), 'Any status');
    $('roles-practice').addEventListener('change', function (e) { state.roles.practice = e.target.value; renderRolesScreen(); });
    $('roles-status').addEventListener('change', function (e) { state.roles.status = e.target.value; renderRolesScreen(); });
    $('roles-reset').addEventListener('click', resetRoleFilters);

    fillSelect($('market-niche'), DATA.NICHES, 'All niches');
    $('market-niche').addEventListener('change', function (e) { state.market.niche = e.target.value; renderMarketScreen(); });
    $('market-hitrate').addEventListener('change', function (e) { state.market.minHit = e.target.value; renderMarketScreen(); });
    $('market-search').addEventListener('input', function (e) { state.market.q = e.target.value; renderMarketScreen(); });
    $('market-reset').addEventListener('click', resetMarketFilters);

    fillSelect($('board-practice'), DATA.NICHES, 'All practice areas');
    fillSelect($('board-pqe'), DATA.PQE_BANDS, 'Any PQE band');
    $('board-practice').addEventListener('change', function (e) { state.board.practice = e.target.value; renderBoardScreen(); });
    $('board-pqe').addEventListener('change', function (e) { state.board.pqe = e.target.value; renderBoardScreen(); });
    $('board-fit').addEventListener('change', function (e) { state.board.fit = e.target.value; renderBoardScreen(); });
    $('board-search').addEventListener('input', function (e) { state.board.q = e.target.value; renderBoardScreen(); });
    $('board-reset').addEventListener('click', resetBoardFilters);
  }

  function initSlideover() {
    $('slideover-close').addEventListener('click', closeDetail);
    $('overlay').addEventListener('mousedown', function (e) {
      if (e.target === $('overlay')) { closeDetail(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('overlay').hidden) {
        e.preventDefault();
        closeDetail();
        return;
      }
      if (e.key === 'Tab' && !$('overlay').hidden) {
        var f = focusables($('slideover'));
        if (!f.length) { return; }
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  function initPerspective() {
    document.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.getAttribute('data-perspective');
        if (p === state.perspective) { return; }
        setRoute(p, VIEWS[p][0].id);
      });
    });
  }

  function initResize() {
    var timer = null;
    window.addEventListener('resize', function () {
      if (window.innerWidth === state.lastWidth) { return; }
      state.lastWidth = window.innerWidth;
      hideTip();
      if (timer) { window.clearTimeout(timer); }
      timer = window.setTimeout(function () { renderScreen(); }, 150);
    });
  }

  function init() {
    initTheme();
    initFilters();
    initPostForm();
    initSlideover();
    initPerspective();
    initResize();
    window.addEventListener('hashchange', applyRoute);
    if (!window.location.hash) {
      window.location.hash = '#/firm/roles';
    }
    applyRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
