/* TradeFlow — demo app. Vanilla JS, no build step, no network.
   Everything on screen is derived from data.js at render time, so the
   Portfolio charts and the Price book can never disagree with each other. */

(function () {
  'use strict';

  /* =====================================================================
     1. Small helpers
     ===================================================================== */

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) { for (var k in attrs) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); } }
    return n;
  }

  function money(n) { return '$' + Math.round(n).toLocaleString('en-AU'); }
  function moneyShort(n) {
    if (n >= 100000) return '$' + Math.round(n / 1000) + 'k';
    if (n >= 10000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return '$' + Math.round(n).toLocaleString('en-AU');
  }
  function moneyAxis(n) {
    if (n >= 1000) return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
    return '$' + Math.round(n);
  }
  function pct(n) { return Math.round(n) + '%'; }

  function sum(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return s; }
  function mean(arr) { return arr.length ? sum(arr) / arr.length : null; }

  function quantile(sorted, q) {
    if (!sorted.length) return null;
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function median(values) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    return quantile(s, 0.5);
  }

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function monthLabel(ym) {
    var p = ym.split('-');
    return MONTH_NAMES[parseInt(p[1], 10) - 1] + ' ' + p[0].slice(2);
  }
  function monthLong(ym) {
    var p = ym.split('-');
    return MONTH_NAMES[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function dateTimeLabel(iso) {
    var d = new Date(iso);
    return d.getDate() + ' ' + MONTH_NAMES[d.getMonth()] + ', ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function hoursBetween(aIso, bIso) {
    return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 3600000;
  }
  function durationLabel(hours) {
    if (hours === null || hours === undefined || isNaN(hours)) return '—';
    if (hours < 24) return (hours < 10 ? hours.toFixed(1) : Math.round(hours)) + ' h';
    return (hours / 24).toFixed(1) + ' d';
  }
  function agoLabel(iso) {
    var h = hoursBetween(iso, NOW_ISO);
    if (h < 1) return 'just now';
    if (h < 24) return Math.round(h) + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  /* =====================================================================
     2. Derived data — one ledger, every number comes off it
     ===================================================================== */

  var jobs = JOBS.map(function (r) {
    return { id: r[0], month: r[1], type: r[2], suburb: r[3], cost: r[4], days: r[5] };
  });

  var TYPE_BY_ID = {}, TRADE_BY_ID = {}, TRADIE_BY_ID = {};
  JOB_TYPES.forEach(function (t) { TYPE_BY_ID[t.id] = t; });
  TRADES.forEach(function (t) { TRADE_BY_ID[t.id] = t; });
  TRADIES.forEach(function (t) { TRADIE_BY_ID[t.id] = t; });

  function tradeOf(typeId) { return TYPE_BY_ID[typeId].trade; }
  function tradeLabel(tradeId) { return TRADE_BY_ID[tradeId].label; }
  function typeLabel(typeId) { return TYPE_BY_ID[typeId].label; }
  function tradeIndex(tradeId) {
    for (var i = 0; i < TRADES.length; i++) { if (TRADES[i].id === tradeId) return i; }
    return 0;
  }

  var MONTHS = (function () {
    var seen = {}, out = [];
    jobs.forEach(function (j) { if (!seen[j.month]) { seen[j.month] = 1; out.push(j.month); } });
    return out.sort();
  })();
  var CURRENT_MONTH = MONTHS[MONTHS.length - 1];

  /* Price book: one row per (job type, suburb) that the portfolio has paid for. */
  var PRICE_ROWS = (function () {
    var byKey = {};
    jobs.forEach(function (j) {
      var k = j.type + '|' + j.suburb;
      (byKey[k] || (byKey[k] = [])).push(j);
    });
    var recent = MONTHS.slice(MONTHS.length - 6);
    var prior = MONTHS.slice(0, MONTHS.length - 6);
    return Object.keys(byKey).map(function (k) {
      var group = byKey[k];
      var costs = group.map(function (j) { return j.cost; }).sort(function (a, b) { return a - b; });
      var rec = group.filter(function (j) { return recent.indexOf(j.month) >= 0; }).map(function (j) { return j.cost; });
      var pri = group.filter(function (j) { return prior.indexOf(j.month) >= 0; }).map(function (j) { return j.cost; });
      var trend = 0;
      if (rec.length >= 3 && pri.length >= 3) { trend = (median(rec) - median(pri)) / median(pri) * 100; }
      var typeId = group[0].type;
      return {
        key: k,
        typeId: typeId,
        typeLabel: typeLabel(typeId),
        tradeId: tradeOf(typeId),
        tradeLabel: tradeLabel(tradeOf(typeId)),
        suburb: group[0].suburb,
        n: group.length,
        median: quantile(costs, 0.5),
        p25: quantile(costs, 0.25),
        p75: quantile(costs, 0.75),
        trend: trend,
        jobs: group
      };
    }).sort(function (a, b) {
      return a.typeLabel.localeCompare(b.typeLabel) || a.suburb.localeCompare(b.suburb);
    });
  })();

  var PRICE_MAX_P75 = Math.max.apply(null, PRICE_ROWS.map(function (r) { return r.p75; }));

  function priceRowFor(typeId, suburb) {
    for (var i = 0; i < PRICE_ROWS.length; i++) {
      if (PRICE_ROWS[i].typeId === typeId && PRICE_ROWS[i].suburb === suburb) return PRICE_ROWS[i];
    }
    /* Fallback: price the job type across the whole portfolio. */
    var group = jobs.filter(function (j) { return j.type === typeId; });
    var costs = group.map(function (j) { return j.cost; }).sort(function (a, b) { return a - b; });
    return { typeId: typeId, typeLabel: typeLabel(typeId), suburb: 'portfolio-wide', n: group.length,
      median: quantile(costs, 0.5), p25: quantile(costs, 0.25), p75: quantile(costs, 0.75), trend: 0, jobs: group };
  }

  /* Heatmap: trade x suburb median cost. */
  var HEAT_CELLS = (function () {
    var byKey = {};
    jobs.forEach(function (j) {
      var k = tradeOf(j.type) + '|' + j.suburb;
      (byKey[k] || (byKey[k] = [])).push(j.cost);
    });
    var cells = [];
    TRADES.forEach(function (tr) {
      SUBURBS.forEach(function (sub) {
        var vals = byKey[tr.id + '|' + sub] || [];
        cells.push({ tradeId: tr.id, tradeLabel: tr.label, suburb: sub, n: vals.length, median: vals.length ? median(vals) : null });
      });
    });
    return cells;
  })();
  var HEAT_MIN = Math.min.apply(null, HEAT_CELLS.filter(function (c) { return c.median !== null; }).map(function (c) { return c.median; }));
  var HEAT_MAX = Math.max.apply(null, HEAT_CELLS.filter(function (c) { return c.median !== null; }).map(function (c) { return c.median; }));
  function heatBin(v) {
    if (v === null) return -1;
    var t = (v - HEAT_MIN) / (HEAT_MAX - HEAT_MIN || 1);
    return Math.max(0, Math.min(4, Math.floor(t * 5 - 1e-9)));
  }

  var STATUS_ORDER = ['New', 'Scoped', 'Routed', 'Scheduled', 'Done'];
  var URGENCY_ORDER = ['Emergency', 'High', 'Routine'];

  /* =====================================================================
     3. Theme
     ===================================================================== */

  var STORE_KEY = 'tradeflow.theme';
  function readStore() { try { return window.localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function writeStore(v) { try { window.localStorage.setItem(STORE_KEY, v); } catch (e) { /* private mode */ } }

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('themeToggle');
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    $('themeLabel').textContent = theme === 'dark' ? 'Light' : 'Dark';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function initTheme() {
    var stored = readStore();
    applyTheme(stored === 'dark' || stored === 'light' ? stored : (mq && mq.matches ? 'dark' : 'light'));
    $('themeToggle').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next); writeStore(next); renderActive();
    });
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) {
        if (readStore()) return;
        applyTheme(e.matches ? 'dark' : 'light'); renderActive();
      });
    }
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  /* Palette snapshot taken at render time, so charts follow the theme. */
  function pal() {
    return {
      series: [cssVar('--s1'), cssVar('--s2'), cssVar('--s3'), cssVar('--s4'), cssVar('--s5')],
      muted: cssVar('--s-muted'),
      heat: [cssVar('--h1'), cssVar('--h2'), cssVar('--h3'), cssVar('--h4'), cssVar('--h5')],
      accent: cssVar('--accent-mark'),
      surface: cssVar('--surface'),
      text: cssVar('--text'),
      grid: cssVar('--grid'),
      axis: cssVar('--axis')
    };
  }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  /* Ink that clears contrast on each step of the heat ramp. */
  function heatInk(bin) {
    if (isDark()) return bin >= 3 ? '#111318' : '#ffffff';
    return bin >= 4 ? '#ffffff' : '#1a1a2e';
  }

  /* =====================================================================
     4. Tooltip, toast, slide-over
     ===================================================================== */

  var tipEl = $('chartTip');

  function showTip(evt, title, rows) {
    clear(tipEl);
    tipEl.appendChild(el('div', 'tip-title', title));
    rows.forEach(function (r) {
      var row = el('div', 'tip-row');
      if (r.color) {
        var key = el('span', 'tip-key');
        key.style.background = r.color;
        row.appendChild(key);
      }
      row.appendChild(el('span', 'tip-val', r.value));
      if (r.name) row.appendChild(el('span', 'tip-name', r.name));
      tipEl.appendChild(row);
    });
    tipEl.hidden = false;
    positionTip(evt);
  }
  function positionTip(evt) {
    var pad = 14;
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    tipEl.style.left = Math.max(8, x) + 'px';
    tipEl.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tipEl.hidden = true; }

  function toast(message) {
    var stack = $('toastStack');
    var t = el('div', 'toast', message);
    stack.appendChild(t);
    window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4200);
  }

  var slideoverReturnFocus = null;

  function openSlideover(title, buildBody) {
    var panel = $('slideover'), scrim = $('scrim');
    slideoverReturnFocus = document.activeElement;
    $('slideoverTitle').textContent = title;
    var body = $('slideoverBody');
    clear(body);
    buildBody(body);
    scrim.hidden = false;
    panel.hidden = false;
    document.addEventListener('keydown', slideoverKeydown, true);
    $('slideoverClose').focus();
  }

  function refreshSlideoverBody(title, buildBody) {
    if ($('slideover').hidden) return;
    $('slideoverTitle').textContent = title;
    var body = $('slideoverBody');
    clear(body);
    buildBody(body);
    /* the control that triggered this was just removed — keep focus inside the dialog */
    var items = focusablesIn(body);
    (items.length ? items[0] : $('slideoverClose')).focus();
  }

  function closeSlideover() {
    var panel = $('slideover');
    if (panel.hidden) return;
    panel.hidden = true;
    $('scrim').hidden = true;
    document.removeEventListener('keydown', slideoverKeydown, true);
    clear($('slideoverBody'));
    if (slideoverReturnFocus && document.contains(slideoverReturnFocus)) slideoverReturnFocus.focus();
    slideoverReturnFocus = null;
  }

  function focusablesIn(node) {
    return Array.prototype.filter.call(
      node.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null || n === document.activeElement; }
    );
  }

  function slideoverKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSlideover(); return; }
    if (e.key !== 'Tab') return;
    var panel = $('slideover');
    var items = focusablesIn(panel);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  /* =====================================================================
     5. Chart primitives
     ===================================================================== */

  function chartWidth(container) {
    var w = container.clientWidth || container.parentNode.clientWidth || 640;
    return Math.max(280, Math.round(w));
  }

  function niceScale(maxValue, tickCount) {
    if (!maxValue || maxValue <= 0) return { max: 1, ticks: [0, 1] };
    var raw = maxValue / tickCount;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var max = Math.ceil(maxValue / step) * step;
    var ticks = [];
    for (var v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { max: max, ticks: ticks };
  }

  function roundedTopPath(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) +
      'L' + x + ',' + (y + rr) +
      'Q' + x + ',' + y + ' ' + (x + rr) + ',' + y +
      'L' + (x + w - rr) + ',' + y +
      'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + rr) +
      'L' + (x + w) + ',' + (y + h) + 'Z';
  }

  function emptyChart(container, message) {
    clear(container);
    var p = el('p', 'muted-note', message);
    p.style.padding = '32px 8px';
    p.style.textAlign = 'center';
    container.appendChild(p);
  }

  function axisText(x, y, text, anchor, cls) {
    var t = svg('text', { x: x, y: y, 'text-anchor': anchor || 'middle', class: cls || 'ax-text' });
    t.textContent = text;
    return t;
  }

  /* ---- stacked column chart ---------------------------------------- */
  function stackedBar(container, opts) {
    clear(container);
    var W = chartWidth(container);
    var H = opts.height || 280;
    var m = { top: 14, right: 10, bottom: 34, left: 46 };
    var plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
    var n = opts.labels.length;
    var totals = opts.labels.map(function (_, i) {
      return sum(opts.series.map(function (s) { return s.values[i] || 0; }));
    });
    var scale = niceScale(Math.max.apply(null, totals.concat([0])), 5);
    var y = function (v) { return m.top + plotH - (v / scale.max) * plotH; };
    var band = plotW / n;
    var barW = Math.min(24, Math.max(6, band * 0.6));

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img',
      'aria-label': opts.ariaLabel || 'Stacked column chart' });

    scale.ticks.forEach(function (t) {
      s.appendChild(svg('line', { x1: m.left, x2: m.left + plotW, y1: y(t), y2: y(t), class: t === 0 ? 'axis-line' : 'grid-line' }));
      s.appendChild(axisText(m.left - 8, y(t) + 4, opts.tickFormat ? opts.tickFormat(t) : t.toLocaleString('en-AU'), 'end'));
    });
    if (opts.yTitle) {
      var yt = svg('text', { x: 0, y: 0, class: 'ax-title', transform: 'translate(12,' + (m.top + plotH / 2) + ') rotate(-90)', 'text-anchor': 'middle' });
      yt.textContent = opts.yTitle;
      s.appendChild(yt);
    }

    var labelStep = band < 42 ? 2 : 1;
    opts.labels.forEach(function (lab, i) {
      var cx = m.left + band * i + band / 2;
      if (i % labelStep === 0) s.appendChild(axisText(cx, m.top + plotH + 20, lab, 'middle'));

      /* wash behind the column, lit while the band is hovered */
      var bandBg = svg('rect', { x: m.left + band * i + 1, y: m.top, width: Math.max(1, band - 2), height: plotH, fill: 'transparent', rx: 4 });
      s.appendChild(bandBg);

      var cum = 0, topDrawn = false;
      for (var k = opts.series.length - 1; k >= 0; k--) { if ((opts.series[k].values[i] || 0) > 0) { topDrawn = k; break; } }
      opts.series.forEach(function (ser, k) {
        var v = ser.values[i] || 0;
        if (v <= 0) { return; }
        var y0 = y(cum), y1 = y(cum + v);
        var gap = cum > 0 ? 2 : 0;                    /* 2px surface gap between segments */
        var h = Math.max(1, y0 - y1 - gap);
        var x = cx - barW / 2;
        var node;
        if (k === topDrawn) {
          node = svg('path', { d: roundedTopPath(x, y1, barW, h, 4), fill: ser.color, class: 'mark' });
        } else {
          node = svg('rect', { x: x, y: y1, width: barW, height: h, fill: ser.color, class: 'mark' });
        }
        s.appendChild(node);
        cum += v;
      });

      /* Hit target = the whole band, so the pointer never has to find a 6px segment. */
      var hit = svg('rect', { x: m.left + band * i, y: m.top, width: band, height: plotH, fill: 'transparent' });
      hit.style.cursor = 'default';
      hit.addEventListener('mouseenter', function (e) {
        bandBg.setAttribute('fill', cssVar('--accent-soft') || 'transparent');
        showBandTip(e, i);
      });
      hit.addEventListener('mousemove', positionTip);
      hit.addEventListener('mouseleave', function () {
        bandBg.setAttribute('fill', 'transparent');
        hideTip();
      });
      s.appendChild(hit);
    });

    function showBandTip(e, i) {
      var rows = opts.series.map(function (ser) {
        return { color: ser.color, name: ser.name, value: opts.valueFormat ? opts.valueFormat(ser.values[i] || 0) : String(ser.values[i] || 0) };
      }).reverse();
      if (opts.series.length > 1) {
        rows.push({ color: null, name: 'total', value: opts.valueFormat ? opts.valueFormat(totals[i]) : String(totals[i]) });
      }
      showTip(e, opts.tipTitles ? opts.tipTitles[i] : opts.labels[i], rows);
    }

    container.appendChild(s);
  }

  /* ---- line chart with crosshair ------------------------------------ */
  function lineChart(container, opts) {
    clear(container);
    var p = pal();
    var W = chartWidth(container);
    var H = opts.height || 240;
    var m = { top: 16, right: 58, bottom: 34, left: 52 };
    var plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
    var vals = opts.values;
    var present = vals.filter(function (v) { return v !== null && v !== undefined; });
    if (!present.length) { emptyChart(container, 'No jobs match these filters.'); return; }
    var scale = niceScale(Math.max.apply(null, present), 5);
    var n = vals.length;
    var x = function (i) { return m.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1)); };
    var y = function (v) { return m.top + plotH - (v / scale.max) * plotH; };

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img',
      'aria-label': opts.ariaLabel || 'Line chart' });

    scale.ticks.forEach(function (t) {
      s.appendChild(svg('line', { x1: m.left, x2: m.left + plotW, y1: y(t), y2: y(t), class: t === 0 ? 'axis-line' : 'grid-line' }));
      s.appendChild(axisText(m.left - 8, y(t) + 4, opts.tickFormat ? opts.tickFormat(t) : t.toLocaleString('en-AU'), 'end'));
    });
    if (opts.yTitle) {
      var yt = svg('text', { class: 'ax-title', transform: 'translate(12,' + (m.top + plotH / 2) + ') rotate(-90)', 'text-anchor': 'middle' });
      yt.textContent = opts.yTitle;
      s.appendChild(yt);
    }
    var labelStep = plotW / n < 42 ? 2 : 1;
    opts.labels.forEach(function (lab, i) {
      if (i % labelStep === 0) s.appendChild(axisText(x(i), m.top + plotH + 20, lab, 'middle'));
    });

    /* path, broken across any gaps in the data */
    var d = '', pen = false;
    vals.forEach(function (v, i) {
      if (v === null || v === undefined) { pen = false; return; }
      d += (pen ? 'L' : 'M') + x(i) + ',' + y(v);
      pen = true;
    });
    s.appendChild(svg('path', { d: d, fill: 'none', stroke: opts.color || p.accent, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    var lastIdx = -1;
    for (var i = vals.length - 1; i >= 0; i--) { if (vals[i] !== null && vals[i] !== undefined) { lastIdx = i; break; } }
    if (lastIdx >= 0) {
      s.appendChild(svg('circle', { cx: x(lastIdx), cy: y(vals[lastIdx]), r: 5, fill: opts.color || p.accent, stroke: p.surface, 'stroke-width': 2 }));
      var endLab = axisText(Math.min(W - 4, x(lastIdx) + 10), y(vals[lastIdx]) + 4, opts.valueFormat(vals[lastIdx]), 'start', 'val-label');
      s.appendChild(endLab);
    }

    /* crosshair layer */
    var cross = svg('line', { x1: 0, x2: 0, y1: m.top, y2: m.top + plotH, class: 'axis-line' });
    cross.style.display = 'none';
    s.appendChild(cross);
    var dot = svg('circle', { r: 5, fill: opts.color || p.accent, stroke: p.surface, 'stroke-width': 2 });
    dot.style.display = 'none';
    s.appendChild(dot);

    var hit = svg('rect', { x: m.left, y: m.top, width: plotW, height: plotH, fill: 'transparent' });
    hit.addEventListener('mousemove', function (e) {
      var box = s.getBoundingClientRect();
      var rel = (e.clientX - box.left) / box.width * W;
      var idx = Math.max(0, Math.min(n - 1, Math.round((rel - m.left) / (plotW / (n - 1 || 1)))));
      if (vals[idx] === null || vals[idx] === undefined) { cross.style.display = 'none'; dot.style.display = 'none'; hideTip(); return; }
      cross.setAttribute('x1', x(idx)); cross.setAttribute('x2', x(idx));
      cross.style.display = '';
      dot.setAttribute('cx', x(idx)); dot.setAttribute('cy', y(vals[idx]));
      dot.style.display = '';
      showTip(e, opts.tipTitles ? opts.tipTitles[idx] : opts.labels[idx],
        [{ color: opts.color || p.accent, name: opts.seriesName, value: opts.valueFormat(vals[idx]) }]);
    });
    hit.addEventListener('mouseleave', function () { cross.style.display = 'none'; dot.style.display = 'none'; hideTip(); });
    s.appendChild(hit);

    container.appendChild(s);
  }

  /* ---- donut --------------------------------------------------------- */
  function donut(container, opts) {
    clear(container);
    var p = pal();
    var W = chartWidth(container);
    var H = opts.height || 240;
    var cx = W / 2, cy = H / 2 + 4;
    var R = Math.min(W, H) / 2 - 16;
    var r = R * 0.62;
    var total = sum(opts.slices.map(function (s) { return s.value; }));
    if (!total) { emptyChart(container, 'No spend matches these filters.'); return; }

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img',
      'aria-label': opts.ariaLabel || 'Donut chart' });

    var gapAngle = 2 / ((R + r) / 2);          /* a 2px surface gap at the mid radius */
    var a0 = -Math.PI / 2;
    opts.slices.forEach(function (sl) {
      var frac = sl.value / total;
      var a1 = a0 + frac * Math.PI * 2;
      var sa = a0 + gapAngle / 2, ea = a1 - gapAngle / 2;
      if (ea > sa) {
        var large = (ea - sa) > Math.PI ? 1 : 0;
        var d = 'M' + (cx + R * Math.cos(sa)) + ',' + (cy + R * Math.sin(sa)) +
          'A' + R + ',' + R + ' 0 ' + large + ' 1 ' + (cx + R * Math.cos(ea)) + ',' + (cy + R * Math.sin(ea)) +
          'L' + (cx + r * Math.cos(ea)) + ',' + (cy + r * Math.sin(ea)) +
          'A' + r + ',' + r + ' 0 ' + large + ' 0 ' + (cx + r * Math.cos(sa)) + ',' + (cy + r * Math.sin(sa)) + 'Z';
        var arc = svg('path', { d: d, fill: sl.color, class: 'mark' });
        arc.addEventListener('mouseenter', function (e) {
          showTip(e, sl.name, [{ color: sl.color, name: pct(frac * 100) + ' of spend', value: money(sl.value) }]);
        });
        arc.addEventListener('mousemove', positionTip);
        arc.addEventListener('mouseleave', hideTip);
        s.appendChild(arc);
      }
      a0 = a1;
    });

    var t1 = axisText(cx, cy - 2, opts.centerValue, 'middle', 'val-label');
    t1.setAttribute('style', 'font-size:19px');
    s.appendChild(t1);
    s.appendChild(axisText(cx, cy + 16, opts.centerLabel, 'middle'));

    container.appendChild(s);
  }

  /* ---- heatmap ------------------------------------------------------- */
  function heatmap(container, opts) {
    clear(container);
    var p = pal();
    var W = chartWidth(container);
    var cols = opts.cols, rows = opts.rows;
    var m = { top: 26, right: 8, bottom: 8, left: Math.min(92, Math.max(56, W * 0.18)) };
    var cellW = (W - m.left - m.right) / cols.length;
    var cellH = Math.max(34, Math.min(48, cellW * 0.62));
    var H = m.top + rows.length * cellH + m.bottom;
    var shortCol = cellW < 78;
    var shortRow = m.left < 78;
    var compactValue = cellW < 62;

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'grid',
      'aria-label': opts.ariaLabel || 'Heatmap' });

    cols.forEach(function (c, ci) {
      s.appendChild(axisText(m.left + cellW * ci + cellW / 2, 16, shortCol ? c.slice(0, 6) : c, 'middle'));
    });
    rows.forEach(function (rname, ri) {
      var shown = (shortRow && rname.length > 6) ? rname.slice(0, 5) + '.' : rname;
      s.appendChild(axisText(m.left - 8, m.top + cellH * ri + cellH / 2 + 4, shown, 'end'));
    });

    var cellNodes = [];
    rows.forEach(function (rname, ri) {
      var rowG = svg('g', { role: 'row' });
      cols.forEach(function (cname, ci) {
        var cell = opts.cellAt(ri, ci);
        var bin = heatBin(cell.median);
        var g = svg('g', { role: 'gridcell', tabindex: '-1', class: 'heat-cell',
          'aria-label': rname + ', ' + cname + ', ' + (cell.median === null ? 'no data' : 'median ' + money(cell.median) + ' from ' + cell.n + ' jobs') + '. Press Enter to filter the table.' });
        var x = m.left + cellW * ci + 1, yy = m.top + cellH * ri + 1;   /* 2px surface gap between cells */
        var w = cellW - 2, h = cellH - 2;
        var rect = svg('rect', { x: x, y: yy, width: w, height: h, rx: 4,
          fill: cell.median === null ? p.grid : p.heat[bin] });
        if (opts.isSelected && opts.isSelected(ri, ci)) rect.setAttribute('class', 'heat-cell-sel');
        g.appendChild(rect);
        if (cell.median !== null) {
          var lab = axisText(x + w / 2, yy + h / 2 + 4,
            compactValue ? String(Math.round(cell.median)) : moneyShort(cell.median), 'middle', 'heat-label');
          lab.setAttribute('fill', heatInk(bin));
          g.appendChild(lab);
        }
        g.addEventListener('mouseenter', function (e) {
          showTip(e, rname + ' · ' + cname, cell.median === null
            ? [{ color: null, name: 'no completed jobs', value: '—' }]
            : [{ color: p.heat[bin], name: 'median of ' + cell.n + ' jobs', value: money(cell.median) }]);
        });
        g.addEventListener('mousemove', positionTip);
        g.addEventListener('mouseleave', hideTip);
        g.addEventListener('focus', function () {
          var box = g.getBoundingClientRect();
          showTip({ clientX: box.left + box.width / 2, clientY: box.top },
            rname + ' · ' + cname,
            cell.median === null
              ? [{ color: null, name: 'no completed jobs', value: '—' }]
              : [{ color: p.heat[bin], name: 'median of ' + cell.n + ' jobs', value: money(cell.median) }]);
        });
        g.addEventListener('blur', hideTip);
        g.addEventListener('click', function () { opts.onSelect(ri, ci); });
        g.addEventListener('keydown', function (e) { onHeatKey(e, ri, ci); });
        cellNodes.push(g);
        rowG.appendChild(g);
      });
      s.appendChild(rowG);
    });

    /* roving tabindex: the grid is one tab stop, arrows move between cells */
    var st = opts.state || { idx: 0, refocus: false };
    var focusIdx = Math.max(0, Math.min(cellNodes.length - 1, st.idx || 0));
    if (cellNodes.length) cellNodes[focusIdx].setAttribute('tabindex', '0');
    function moveFocus(next) {
      if (next < 0 || next >= cellNodes.length) return;
      cellNodes[focusIdx].setAttribute('tabindex', '-1');
      focusIdx = next;
      st.idx = next;
      cellNodes[focusIdx].setAttribute('tabindex', '0');
      cellNodes[focusIdx].focus();
    }
    if (st.refocus && cellNodes.length) { st.refocus = false; cellNodes[focusIdx].focus(); }
    function onHeatKey(e, ri, ci) {
      var idx = ri * cols.length + ci, handled = true;
      if (e.key === 'ArrowRight') moveFocus(ci < cols.length - 1 ? idx + 1 : idx);
      else if (e.key === 'ArrowLeft') moveFocus(ci > 0 ? idx - 1 : idx);
      else if (e.key === 'ArrowDown') moveFocus(ri < rows.length - 1 ? idx + cols.length : idx);
      else if (e.key === 'ArrowUp') moveFocus(ri > 0 ? idx - cols.length : idx);
      else if (e.key === 'Home') moveFocus(ri * cols.length);
      else if (e.key === 'End') moveFocus(ri * cols.length + cols.length - 1);
      else if (e.key === 'Enter' || e.key === ' ') { st.idx = ri * cols.length + ci; st.refocus = true; opts.onSelect(ri, ci); }
      else handled = false;
      if (handled) e.preventDefault();
    }

    container.appendChild(s);
  }

  /* ---- legends and chart data tables --------------------------------- */
  function renderLegend(node, items, opts) {
    clear(node);
    items.forEach(function (it) {
      var wrap = el('span', 'legend-item' + (it.muted ? ' is-muted' : ''));
      var key = el('span', 'legend-key' + (opts && opts.line ? ' line-key' : ''));
      key.style.background = it.color;
      wrap.appendChild(key);
      wrap.appendChild(document.createTextNode(it.name));
      if (it.value) wrap.appendChild(el('span', 'legend-value', it.value));
      node.appendChild(wrap);
    });
  }

  function renderDataTable(node, headers, rows, numericFrom) {
    clear(node);
    var table = el('table', 'data-table');
    var thead = el('thead'), htr = el('tr');
    headers.forEach(function (h, i) {
      var th = el('th', (numericFrom !== undefined && i >= numericFrom) ? 'num' : '', h);
      th.setAttribute('scope', 'col');
      htr.appendChild(th);
    });
    thead.appendChild(htr); table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      r.forEach(function (c, i) { tr.appendChild(el('td', (numericFrom !== undefined && i >= numericFrom) ? 'num' : '', c)); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    node.appendChild(table);
  }

  /* =====================================================================
     6. Sorting helper
     ===================================================================== */

  var sorts = {
    triage: { key: 'received', dir: -1 },
    price: { key: 'n', dir: -1 },
    feed: { key: 'cap', dir: -1 }
  };

  function attachSort(tableId, name, rerender) {
    var table = $(tableId);
    Array.prototype.forEach.call(table.querySelectorAll('.th-sort'), function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        var st = sorts[name];
        if (st.key === key) { st.dir = -st.dir; } else { st.key = key; st.dir = 1; }
        rerender();
      });
    });
  }

  function paintSortHeaders(tableId, name) {
    var table = $(tableId);
    var st = sorts[name];
    Array.prototype.forEach.call(table.querySelectorAll('.th-sort'), function (btn) {
      var th = btn.closest('th');
      var active = btn.getAttribute('data-key') === st.key;
      btn.setAttribute('data-active', active ? 'true' : 'false');
      th.setAttribute('aria-sort', active ? (st.dir === 1 ? 'ascending' : 'descending') : 'none');
      var caret = btn.querySelector('.sort-caret');
      if (caret) btn.removeChild(caret);
      if (active) {
        var c = el('span', 'sort-caret', st.dir === 1 ? '▲' : '▼');
        c.setAttribute('aria-hidden', 'true');
        btn.appendChild(c);
      }
    });
  }

  function sortRows(rows, name, accessors) {
    var st = sorts[name];
    var get = accessors[st.key] || function (r) { return r[st.key]; };
    return rows.slice().sort(function (a, b) {
      var av = get(a), bv = get(b);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * st.dir;
      return (av < bv ? -1 : av > bv ? 1 : 0) * st.dir;
    });
  }

  /* =====================================================================
     7. Filters plumbing
     ===================================================================== */

  var filters = {
    triage: { trade: '', urgency: '', status: '', q: '' },
    port: { trade: '', suburb: '' },
    price: { trade: '', suburb: '', q: '' },
    feed: { suburb: '', minValue: '', q: '' }
  };

  function fillSelect(select, options, allLabel) {
    clear(select);
    var o = el('option', '', allLabel);
    o.value = '';
    select.appendChild(o);
    options.forEach(function (opt) {
      var n = el('option', '', opt.label);
      n.value = opt.value;
      select.appendChild(n);
    });
  }

  function tradeOptions() { return TRADES.map(function (t) { return { value: t.id, label: t.label }; }); }
  function suburbOptions() { return SUBURBS.map(function (s) { return { value: s, label: s }; }); }

  function anyActive(f) {
    return Object.keys(f).some(function (k) { return f[k] !== ''; });
  }

  /* =====================================================================
     8. PM · Triage inbox
     ===================================================================== */

  function requestTrade(r) { return tradeOf(r.type); }

  function filteredRequests() {
    var f = filters.triage;
    var q = f.q.trim().toLowerCase();
    return REQUESTS.filter(function (r) {
      if (f.trade && requestTrade(r) !== f.trade) return false;
      if (f.urgency && r.urgency !== f.urgency) return false;
      if (f.status && r.status !== f.status) return false;
      if (q) {
        var hay = (r.address + ' ' + r.suburb + ' ' + r.tenant + ' ' + r.title + ' ' + r.message + ' ' + r.id).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function urgencyBadge(u) {
    var span = el('span', 'urg urg-' + u.toLowerCase());
    var icon = el('span', 'urg-icon', u === 'Emergency' ? '▲' : u === 'High' ? '◆' : '●');
    icon.setAttribute('aria-hidden', 'true');
    span.appendChild(icon);
    span.appendChild(document.createTextNode(u));
    return span;
  }

  function statusPill(s) { return el('span', 'pill pill-' + s.toLowerCase(), s); }

  function excerpt(text, len) {
    if (text.length <= len) return text;
    return text.slice(0, len).replace(/\s+\S*$/, '') + '…';
  }

  function renderTriage() {
    var f = filters.triage;
    $('fTriageReset').hidden = !anyActive(f);

    var rows = sortRows(filteredRequests(), 'triage', {
      trade: function (r) { return tradeLabel(requestTrade(r)); },
      urgency: function (r) { return URGENCY_ORDER.indexOf(r.urgency); },
      status: function (r) { return STATUS_ORDER.indexOf(r.status); },
      address: function (r) { return r.address + ', ' + r.suburb; }
    });
    paintSortHeaders('triageTable', 'triage');

    var body = $('triageBody');
    clear(body);
    $('triageCount').textContent = rows.length + ' of ' + REQUESTS.length + ' requests' +
      (anyActive(f) ? ' (filtered)' : '') + ' · ' +
      REQUESTS.filter(function (r) { return r.status === 'New'; }).length + ' still untouched';
    $('triageEmpty').hidden = rows.length > 0;
    $('triageTable').parentNode.hidden = rows.length === 0;

    var p = pal();
    rows.forEach(function (r) {
      var tr = el('tr');
      tr.setAttribute('data-id', r.id);

      var tdWhen = el('td');
      tdWhen.appendChild(document.createTextNode(dateTimeLabel(r.received)));
      tdWhen.appendChild(el('span', 'sub', agoLabel(r.received)));
      tr.appendChild(tdWhen);

      var tdAddr = el('td', 'cell-strong');
      tdAddr.appendChild(document.createTextNode(r.address));
      tdAddr.appendChild(el('span', 'sub', r.suburb + ' · ' + r.tenant));
      tr.appendChild(tdAddr);

      var tdTitle = el('td');
      tdTitle.appendChild(document.createTextNode(r.title));
      tdTitle.appendChild(el('span', 'sub', '“' + excerpt(r.message, 70) + '”'));
      tr.appendChild(tdTitle);

      var tdTrade = el('td');
      var sw = el('span', 'swatch');
      sw.style.background = p.series[tradeIndex(requestTrade(r))];
      sw.setAttribute('aria-hidden', 'true');
      tdTrade.appendChild(sw);
      tdTrade.appendChild(document.createTextNode(tradeLabel(requestTrade(r))));
      tr.appendChild(tdTrade);

      var tdUrg = el('td');
      tdUrg.appendChild(urgencyBadge(r.urgency));
      tr.appendChild(tdUrg);

      tr.appendChild(el('td', 'num', money(r.cap)));

      var tdStatus = el('td');
      tdStatus.appendChild(statusPill(r.status));
      tr.appendChild(tdStatus);

      var tdAct = el('td');
      var btn = el('button', 'btn btn-secondary btn-small', r.status === 'New' || r.status === 'Scoped' ? 'Open & route' : 'Open');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open request ' + r.id + ' — ' + r.title);
      btn.addEventListener('click', function (e) { e.stopPropagation(); openRequest(r); });
      tdAct.appendChild(btn);
      tr.appendChild(tdAct);

      tr.addEventListener('click', function () { openRequest(r); });
      body.appendChild(tr);
    });
  }

  /* --- matching ------------------------------------------------------- */
  function matchesFor(req) {
    var trade = requestTrade(req);
    var row = priceRowFor(req.type, req.suburb);
    return TRADIES.filter(function (t) { return t.trade === trade; }).map(function (t) {
      var dist = SUBURB_DISTANCE[t.base][req.suburb] + t.offset;
      return {
        tradie: t,
        distance: dist,
        price: Math.round(row.median * t.priceIndex / 5) * 5,
        priceRow: row,
        score: t.rating * 2 - dist * 0.22 + Math.min(t.jobsDone, 150) / 400
      };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function openRequest(req) {
    openSlideover(req.id + ' · ' + req.address, function (body) { buildRequestBody(body, req, false); });
  }
  function refreshRequest(req, showMatches) {
    refreshSlideoverBody(req.id + ' · ' + req.address, function (body) { buildRequestBody(body, req, showMatches); });
  }

  function buildRequestBody(body, req, showMatches) {
    var meta = el('div', 'so-meta');
    meta.appendChild(urgencyBadge(req.urgency));
    meta.appendChild(statusPill(req.status));
    var tradePill = el('span', 'pill', tradeLabel(requestTrade(req)));
    meta.appendChild(tradePill);
    body.appendChild(meta);

    var s1 = el('section', 'so-section');
    s1.appendChild(el('h3', '', 'Tenant message'));
    var quote = el('div', 'so-quote', '“' + req.message + '”');
    s1.appendChild(quote);
    s1.appendChild(el('p', 'muted-note', '— ' + req.tenant + ', ' + dateTimeLabel(req.received) + ' (' + agoLabel(req.received) + ')'));
    body.appendChild(s1);

    var s2 = el('section', 'so-section');
    s2.appendChild(el('h3', '', 'AI scope'));
    var scope = el('div', 'so-scope');
    scope.appendChild(el('strong', '', req.title));
    scope.appendChild(document.createElement('br'));
    scope.appendChild(document.createTextNode(req.scope));
    s2.appendChild(scope);
    if (!req.auto) s2.appendChild(el('p', 'muted-note', 'Scope edited by the property manager before routing.'));
    body.appendChild(s2);

    var row = priceRowFor(req.type, req.suburb);
    var s3 = el('section', 'so-section');
    s3.appendChild(el('h3', '', 'Job facts'));
    var facts = el('dl', 'so-facts');
    [
      ['Owner approved to', money(req.cap)],
      ['Job type', typeLabel(req.type)],
      ['Portfolio median', money(row.median) + ' (n=' + row.n + ')'],
      ['Tenant available', req.avail]
    ].forEach(function (f) {
      var d = el('div', 'so-fact');
      d.appendChild(el('dt', '', f[0]));
      d.appendChild(el('dd', '', f[1]));
      facts.appendChild(d);
    });
    s3.appendChild(facts);
    body.appendChild(s3);

    var s4 = el('section', 'so-section');
    s4.appendChild(el('h3', '', 'Network'));

    if (req.status === 'Scheduled' || req.status === 'Done') {
      var t = TRADIE_BY_ID[req.assigned];
      var card = el('div', 'match is-booked');
      var top = el('div', 'match-top');
      top.appendChild(el('span', 'match-name', t ? t.name : 'Assigned'));
      top.appendChild(el('span', 'match-rating', t ? '★ ' + t.rating.toFixed(1) + ' · ' + t.jobsDone + ' jobs' : ''));
      card.appendChild(top);
      var facts2 = el('div', 'match-facts');
      facts2.appendChild(el('span', '', req.status === 'Done' ? 'Completed' : 'Scheduled'));
      facts2.appendChild(el('span', '', req.scheduledAt ? dateTimeLabel(req.scheduledAt) : '—'));
      if (t) facts2.appendChild(el('span', '', t.next));
      card.appendChild(facts2);
      var flag = el('p', 'booked-flag', req.status === 'Done'
        ? '✓ Job completed and invoiced — its price is in the price book.'
        : '✓ Booked. The tenant and the owner have both been notified.');
      card.appendChild(flag);
      if (req.status === 'Done' && req.ledgerId) {
        var lj = null;
        for (var i = 0; i < jobs.length; i++) { if (jobs[i].id === req.ledgerId) { lj = jobs[i]; break; } }
        if (lj) card.appendChild(el('p', 'muted-note', 'Ledger ' + lj.id + ' · invoiced ' + money(lj.cost) + ' · ' + lj.days + ' days end to end.'));
      }
      s4.appendChild(card);
    } else if (!showMatches) {
      s4.appendChild(el('p', 'muted-note', 'Three vetted businesses cover ' + req.suburb + ' for ' + tradeLabel(requestTrade(req)).toLowerCase() +
        '. Routing sends them the scope above — not a lead, the job.'));
      var routeBtn = el('button', 'btn btn-primary', 'Route to network');
      routeBtn.type = 'button';
      routeBtn.style.marginTop = '8px';
      routeBtn.addEventListener('click', function () {
        if (req.status === 'New' || req.status === 'Scoped') { req.status = 'Routed'; }
        refreshRequest(req, true);
        renderTriage();
        toast(req.id + ' routed to 3 matched ' + tradeLabel(requestTrade(req)).toLowerCase() + ' businesses.');
      });
      s4.appendChild(routeBtn);
    } else {
      s4.appendChild(el('p', 'muted-note', 'Matched on trade, distance from ' + req.suburb + ', rating and price against the portfolio median.'));
      var list = el('ul', 'match-list');
      matchesFor(req).forEach(function (m, idx) {
        var li = el('li', 'match');
        var top2 = el('div', 'match-top');
        top2.appendChild(el('span', 'match-name', m.tradie.name));
        top2.appendChild(el('span', 'match-rating', '★ ' + m.tradie.rating.toFixed(1) + ' · ' + m.tradie.jobsDone + ' jobs'));
        if (idx === 0) {
          var best = el('span', 'pill pill-routed', 'Best match');
          top2.appendChild(best);
        }
        li.appendChild(top2);

        var mf = el('div', 'match-facts');
        var f1 = el('span'); f1.appendChild(el('b', '', m.distance.toFixed(1) + ' km')); f1.appendChild(document.createTextNode(' away'));
        var f2 = el('span'); f2.appendChild(el('b', '', money(m.price))); f2.appendChild(document.createTextNode(' typical for this job'));
        var f3 = el('span'); f3.appendChild(document.createTextNode('Next available ')); f3.appendChild(el('b', '', m.tradie.next));
        mf.appendChild(f1); mf.appendChild(f2); mf.appendChild(f3);
        li.appendChild(mf);
        li.appendChild(el('p', 'muted-note', m.tradie.note));

        var actions = el('div', 'match-actions');
        var bookBtn = el('button', 'btn ' + (idx === 0 ? 'btn-primary' : 'btn-secondary'), 'Book ' + m.tradie.name.split(' ')[0]);
        bookBtn.type = 'button';
        bookBtn.setAttribute('aria-label', 'Book ' + m.tradie.name + ' for ' + req.title);
        bookBtn.addEventListener('click', function () { bookJob(req, m); });
        actions.appendChild(bookBtn);
        if (m.price > req.cap) {
          actions.appendChild(el('span', 'muted-note', 'Above the $' + req.cap + ' cap — needs an owner call.'));
        }
        li.appendChild(actions);
        list.appendChild(li);
      });
      s4.appendChild(list);
    }
    body.appendChild(s4);
  }

  function bookJob(req, match) {
    req.status = 'Scheduled';
    req.assigned = match.tradie.id;
    req.scheduledAt = NOW_ISO;
    refreshRequest(req, false);
    renderTriage();
    if (route.tab === 'portfolio') renderPortfolio();   /* tiles recompute when next shown otherwise */
    toast('Booked — ' + match.tradie.name + ' scheduled for ' + req.address + ', ' + req.suburb + '. Tenant and owner notified.');
  }

  /* =====================================================================
     9. PM · Portfolio
     ===================================================================== */

  function portfolioJobs() {
    var f = filters.port;
    return jobs.filter(function (j) {
      if (f.trade && tradeOf(j.type) !== f.trade) return false;
      if (f.suburb && j.suburb !== f.suburb) return false;
      return true;
    });
  }
  function portfolioRequests() {
    var f = filters.port;
    return REQUESTS.filter(function (r) {
      if (f.trade && requestTrade(r) !== f.trade) return false;
      if (f.suburb && r.suburb !== f.suburb) return false;
      return true;
    });
  }

  function kpiTile(label, value, sub) {
    var d = el('div', 'kpi');
    d.appendChild(el('div', 'kpi-label', label));
    d.appendChild(el('div', 'kpi-value', value));
    d.appendChild(el('div', 'kpi-sub', sub));
    return d;
  }

  function renderPortfolio() {
    var f = filters.port;
    $('fPortReset').hidden = !anyActive(f);
    $('reconcileNote').textContent = jobs.length.toLocaleString('en-AU') + ' completed jobs price all ' +
      PRICE_ROWS.length + ' rows of it.';

    var fj = portfolioJobs();
    var fr = portfolioRequests();
    var monthJobs = fj.filter(function (j) { return j.month === CURRENT_MONTH; });

    /* --- KPI tiles --- */
    var kpis = $('portKpis');
    clear(kpis);
    kpis.appendChild(kpiTile('Jobs this month', String(monthJobs.length + fr.length),
      monthJobs.length + ' completed · ' + fr.length + ' in triage'));

    var routedPlus = fr.filter(function (r) { return STATUS_ORDER.indexOf(r.status) >= 2; });
    var autoRouted = routedPlus.filter(function (r) { return r.auto; });
    kpis.appendChild(kpiTile('Auto-routed',
      routedPlus.length ? pct(autoRouted.length / routedPlus.length * 100) : '—',
      routedPlus.length ? autoRouted.length + ' of ' + routedPlus.length + ' routed without a rewrite' : 'nothing routed yet'));

    var sched = fr.filter(function (r) { return r.scheduledAt; })
      .map(function (r) { return hoursBetween(r.received, r.scheduledAt); });
    kpis.appendChild(kpiTile('Median time to scheduled', sched.length ? durationLabel(median(sched)) : '—',
      sched.length ? 'across ' + sched.length + ' scheduled or completed' : 'nothing scheduled yet'));

    kpis.appendChild(kpiTile('Spend month to date', moneyShort(sum(monthJobs.map(function (j) { return j.cost; }))),
      monthLong(CURRENT_MONTH) + ', to 13 Aug'));

    /* --- chart 1: jobs per month by trade (stacked) --- */
    var p = pal();
    var tradesShown = f.trade ? TRADES.filter(function (t) { return t.id === f.trade; }) : TRADES;
    var series = tradesShown.map(function (t) {
      return {
        name: t.label,
        color: p.series[tradeIndex(t.id)],
        values: MONTHS.map(function (mn) {
          return fj.filter(function (j) { return j.month === mn && tradeOf(j.type) === t.id; }).length;
        })
      };
    });
    $('jobsChartSub').textContent = fj.length.toLocaleString('en-AU') + ' completed jobs · ' +
      monthLong(MONTHS[0]) + ' – ' + monthLong(CURRENT_MONTH) + ' (August is month to date).';

    if (!fj.length) {
      emptyChart($('chartJobs'), 'No completed jobs match these filters.');
      clear($('legendJobs'));
      renderDataTable($('dtJobs'), ['Month'], [], 1);
    } else {
      stackedBar($('chartJobs'), {
        labels: MONTHS.map(monthLabel),
        tipTitles: MONTHS.map(monthLong),
        series: series,
        height: 300,
        yTitle: 'Jobs completed',
        valueFormat: function (v) { return v + (v === 1 ? ' job' : ' jobs'); },
        ariaLabel: 'Stacked columns: jobs completed each month, split by trade'
      });
      /* a single series needs no legend box — the card title already names it */
      if (series.length > 1) {
        renderLegend($('legendJobs'), series.map(function (s) {
          return { color: s.color, name: s.name, value: String(sum(s.values)) };
        }));
      } else {
        clear($('legendJobs'));
      }
      renderDataTable($('dtJobs'),
        ['Month'].concat(series.map(function (s) { return s.name; })).concat(['Total']),
        MONTHS.map(function (mn, i) {
          var vals = series.map(function (s) { return s.values[i]; });
          return [monthLong(mn)].concat(vals.map(String)).concat([String(sum(vals))]);
        }), 1);
    }

    /* --- chart 2: average time to fix --- */
    var dayVals = MONTHS.map(function (mn) {
      var v = fj.filter(function (j) { return j.month === mn; }).map(function (j) { return j.days; });
      return v.length ? Math.round(mean(v) * 10) / 10 : null;
    });
    lineChart($('chartDays'), {
      labels: MONTHS.map(monthLabel),
      tipTitles: MONTHS.map(monthLong),
      values: dayVals,
      color: p.accent,
      height: 250,
      yTitle: 'Days',
      seriesName: 'avg days to fix',
      valueFormat: function (v) { return v.toFixed(1) + ' d'; },
      tickFormat: function (t) { return t.toFixed(1); },
      ariaLabel: 'Line chart: average days from request to completed job, by month'
    });
    renderDataTable($('dtDays'), ['Month', 'Avg days to fix', 'Jobs'],
      MONTHS.map(function (mn, i) {
        var cnt = fj.filter(function (j) { return j.month === mn; }).length;
        return [monthLong(mn), dayVals[i] === null ? '—' : dayVals[i].toFixed(1), String(cnt)];
      }), 1);

    /* --- chart 3: spend by trade (donut; trade filter highlights) --- */
    var spendBase = jobs.filter(function (j) { return !f.suburb || j.suburb === f.suburb; });
    var slices = TRADES.map(function (t) {
      var v = sum(spendBase.filter(function (j) { return tradeOf(j.type) === t.id; }).map(function (j) { return j.cost; }));
      var dim = f.trade && f.trade !== t.id;
      return { name: t.label, value: v, color: dim ? p.muted : p.series[tradeIndex(t.id)], muted: dim };
    });
    var spendTotal = sum(slices.map(function (s) { return s.value; }));
    $('donutSub').textContent = f.trade
      ? 'Twelve months of invoices. The trade filter highlights ' + tradeLabel(f.trade) + ' — the whole is the point, so nothing is removed.'
      : 'Twelve months of completed-job invoices' + (f.suburb ? ', ' + f.suburb + ' only.' : '.');
    donut($('chartSpend'), {
      slices: slices, height: 250,
      centerValue: moneyShort(spendTotal), centerLabel: 'total spend',
      ariaLabel: 'Donut chart: share of maintenance spend by trade'
    });
    renderLegend($('legendSpend'), slices.map(function (s) {
      return { color: s.color, name: s.name, value: money(s.value), muted: s.muted };
    }));
    renderDataTable($('dtSpend'), ['Trade', 'Spend', 'Share', 'Jobs'],
      TRADES.map(function (t) {
        var g = spendBase.filter(function (j) { return tradeOf(j.type) === t.id; });
        var v = sum(g.map(function (j) { return j.cost; }));
        return [t.label, money(v), spendTotal ? pct(v / spendTotal * 100) : '—', String(g.length)];
      }), 1);
  }

  /* =====================================================================
     10. PM · Price book
     ===================================================================== */

  var expandedPriceKey = null;
  var refocusPriceKey = null;
  var heatState = { idx: 0, refocus: false };

  function filteredPriceRows() {
    var f = filters.price;
    var q = f.q.trim().toLowerCase();
    return PRICE_ROWS.filter(function (r) {
      if (f.trade && r.tradeId !== f.trade) return false;
      if (f.suburb && r.suburb !== f.suburb) return false;
      if (q && (r.typeLabel + ' ' + r.suburb + ' ' + r.tradeLabel).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function trendCell(t) {
    var cls = Math.abs(t) < 3 ? 'trend-flat' : t > 0 ? 'trend-up' : 'trend-down';
    var arrow = Math.abs(t) < 3 ? '▬' : t > 0 ? '▲' : '▼';
    var span = el('span', 'trend ' + cls);
    var a = el('span', '', arrow);
    a.setAttribute('aria-hidden', 'true');
    span.appendChild(a);
    span.appendChild(document.createTextNode(' ' + (t > 0 ? '+' : '') + t.toFixed(0) + '%'));
    span.title = 'Median of the last 6 months vs the 6 before it';
    return span;
  }

  function rangeCell(row) {
    var wrap = el('div', 'range-bar');
    var track = el('div', 'range-track');
    var fill = el('div', 'range-fill');
    var left = (row.p25 / PRICE_MAX_P75) * 100;
    var width = ((row.p75 - row.p25) / PRICE_MAX_P75) * 100;
    fill.style.left = left + '%';
    fill.style.width = Math.max(1.5, width) + '%';
    var med = el('div', 'range-med');
    med.style.left = (row.median / PRICE_MAX_P75) * 100 + '%';
    track.appendChild(fill);
    track.appendChild(med);
    wrap.appendChild(track);
    wrap.appendChild(el('span', 'range-text', money(row.p25) + '–' + money(row.p75)));
    wrap.title = 'p25 ' + money(row.p25) + ' · median ' + money(row.median) + ' · p75 ' + money(row.p75) +
      ' (scaled against the dearest job type in the book)';
    return wrap;
  }

  function renderPriceBook() {
    var f = filters.price;
    $('fPriceReset').hidden = !anyActive(f);
    $('priceBookN').textContent = jobs.length.toLocaleString('en-AU');

    /* heatmap */
    heatmap($('chartHeat'), {
      rows: TRADES.map(function (t) { return t.label; }),
      cols: SUBURBS,
      state: heatState,
      cellAt: function (ri, ci) {
        return HEAT_CELLS[ri * SUBURBS.length + ci];
      },
      isSelected: function (ri, ci) {
        return filters.price.trade === TRADES[ri].id && filters.price.suburb === SUBURBS[ci];
      },
      onSelect: function (ri, ci) {
        var t = TRADES[ri].id, s = SUBURBS[ci];
        if (filters.price.trade === t && filters.price.suburb === s) {
          filters.price.trade = ''; filters.price.suburb = '';
        } else {
          filters.price.trade = t; filters.price.suburb = s;
        }
        $('fPriceTrade').value = filters.price.trade;
        $('fPriceSuburb').value = filters.price.suburb;
        expandedPriceKey = null;
        renderPriceBook();
      },
      ariaLabel: 'Heatmap: median completed-job cost by trade and suburb. Select a cell to filter the table below.'
    });

    var p = pal();
    var binEdge = function (i) { return HEAT_MIN + (HEAT_MAX - HEAT_MIN) * i / 5; };
    renderLegend($('legendHeat'), [0, 1, 2, 3, 4].map(function (i) {
      return { color: p.heat[i], name: moneyShort(binEdge(i)) + '–' + moneyShort(binEdge(i + 1)) };
    }));
    renderDataTable($('dtHeat'), ['Trade'].concat(SUBURBS),
      TRADES.map(function (t, ri) {
        return [t.label].concat(SUBURBS.map(function (s, ci) {
          var c = HEAT_CELLS[ri * SUBURBS.length + ci];
          return c.median === null ? '—' : money(c.median) + ' (n=' + c.n + ')';
        }));
      }), 1);

    /* table */
    var rows = sortRows(filteredPriceRows(), 'price', {});
    paintSortHeaders('priceTable', 'price');
    var body = $('priceBody');
    clear(body);

    var shown = sum(rows.map(function (r) { return r.n; }));
    $('priceCount').textContent = rows.length + ' of ' + PRICE_ROWS.length + ' priced rows' +
      (anyActive(f) ? ' (filtered)' : '') + ' · ' + shown.toLocaleString('en-AU') + ' of ' +
      jobs.length.toLocaleString('en-AU') + ' completed jobs in view';
    $('priceEmpty').hidden = rows.length > 0;
    $('priceTable').parentNode.hidden = rows.length === 0;

    rows.forEach(function (r) {
      var tr = el('tr');
      if (expandedPriceKey === r.key) tr.className = 'is-open';

      var tdType = el('td', 'cell-strong');
      tdType.appendChild(document.createTextNode(r.typeLabel));
      tr.appendChild(tdType);

      var tdTrade = el('td');
      var sw = el('span', 'swatch');
      sw.style.background = p.series[tradeIndex(r.tradeId)];
      sw.setAttribute('aria-hidden', 'true');
      tdTrade.appendChild(sw);
      tdTrade.appendChild(document.createTextNode(r.tradeLabel));
      tr.appendChild(tdTrade);

      tr.appendChild(el('td', '', r.suburb));
      tr.appendChild(el('td', 'num cell-strong', money(r.median)));

      var tdRange = el('td', 'col-range');
      tdRange.appendChild(rangeCell(r));
      tr.appendChild(tdRange);

      tr.appendChild(el('td', 'num', String(r.n)));

      var tdTrend = el('td', 'num');
      tdTrend.appendChild(trendCell(r.trend));
      tr.appendChild(tdTrend);

      var tdAct = el('td');
      var btn = el('button', 'btn btn-secondary btn-small', expandedPriceKey === r.key ? 'Hide' : 'Details');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', expandedPriceKey === r.key ? 'true' : 'false');
      btn.setAttribute('aria-label', 'Details for ' + r.typeLabel + ' in ' + r.suburb);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        expandedPriceKey = expandedPriceKey === r.key ? null : r.key;
        refocusPriceKey = r.key;
        renderPriceBook();
      });
      tdAct.appendChild(btn);
      tr.appendChild(tdAct);
      if (refocusPriceKey === r.key) { refocusPriceKey = null; window.setTimeout(function () { btn.focus(); }, 0); }

      tr.addEventListener('click', function () {
        expandedPriceKey = expandedPriceKey === r.key ? null : r.key;
        renderPriceBook();
      });
      body.appendChild(tr);

      if (expandedPriceKey === r.key) body.appendChild(priceDetailRow(r));
    });
  }

  function priceDetailRow(r) {
    var tr = el('tr', 'detail-row');
    var td = el('td');
    td.setAttribute('colspan', '8');
    var grid = el('div', 'detail-grid');

    var b1 = el('div', 'detail-block');
    b1.appendChild(el('h4', '', 'Distribution'));
    var costs = r.jobs.map(function (j) { return j.cost; }).sort(function (a, b) { return a - b; });
    b1.appendChild(el('p', '', 'Cheapest ' + money(costs[0]) + ' · p25 ' + money(r.p25) + ' · median ' +
      money(r.median) + ' · p75 ' + money(r.p75) + ' · dearest ' + money(costs[costs.length - 1])));
    b1.appendChild(el('p', 'muted-note', 'From ' + r.n + ' completed jobs across ' + MONTHS.length + ' months.'));
    grid.appendChild(b1);

    var b2 = el('div', 'detail-block');
    b2.appendChild(el('h4', '', 'Recent jobs'));
    var ul = el('ul', 'mini-list');
    r.jobs.slice().sort(function (a, b) { return a.month < b.month ? 1 : -1; }).slice(0, 5).forEach(function (j) {
      ul.appendChild(el('li', '', monthLong(j.month) + ' · ' + money(j.cost) + ' · ' + j.days + ' days · ' + j.id));
    });
    b2.appendChild(ul);
    grid.appendChild(b2);

    var b3 = el('div', 'detail-block');
    b3.appendChild(el('h4', '', 'Movement'));
    b3.appendChild(el('p', '', (r.trend > 0 ? 'Up ' : r.trend < 0 ? 'Down ' : 'Flat, ') +
      Math.abs(r.trend).toFixed(0) + '% on the median of the previous six months.'));
    var covering = TRADIES.filter(function (t) { return t.trade === r.tradeId; }).length;
    b3.appendChild(el('p', 'muted-note', covering + ' vetted businesses in the network cover ' +
      r.tradeLabel.toLowerCase() + ' work in ' + r.suburb + '.'));
    grid.appendChild(b3);

    td.appendChild(grid);
    tr.appendChild(td);
    return tr;
  }

  /* =====================================================================
     11. Tradie · Job feed
     ===================================================================== */

  var VALUE_BANDS = [
    { value: '200', label: '$200 and up' },
    { value: '400', label: '$400 and up' },
    { value: '600', label: '$600 and up' },
    { value: '800', label: '$800 and up' }
  ];

  /* "Thu 14 Aug, am" / "Today, ASAP" sorts by the day it lands on, not alphabetically. */
  function whenRank(j) {
    if (/today/i.test(j.when)) return 13;
    if (/tomorrow/i.test(j.when)) return 14;
    var m = j.when.match(/(\d+)\s+Aug/);
    return m ? parseInt(m[1], 10) : 99;
  }

  function filteredFeed() {
    var f = filters.feed;
    var q = f.q.trim().toLowerCase();
    return TRADIE_FEED.filter(function (j) {
      if (j.accepted) return false;
      if (f.suburb && j.suburb !== f.suburb) return false;
      if (f.minValue && j.cap < parseInt(f.minValue, 10)) return false;
      if (q && (j.title + ' ' + j.agency + ' ' + j.suburb + ' ' + j.detail).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderFeed() {
    var f = filters.feed;
    $('fFeedReset').hidden = !anyActive(f);

    var agencies = {};
    TRADIE_FEED.forEach(function (j) { agencies[j.agency] = 1; });
    var open = TRADIE_FEED.filter(function (j) { return !j.accepted; });
    $('feedLede').textContent = open.length + ' scoped, owner-approved ' + TRADIE_PROFILE.tradeLabel.toLowerCase() +
      ' jobs are open to you right now across ' + Object.keys(agencies).length + ' inner-west portfolios. ' +
      'You are seeing them because you subscribe, not because you bid.';

    var rows = sortRows(filteredFeed(), 'feed', { when: whenRank });
    paintSortHeaders('feedTable', 'feed');

    var body = $('feedBody');
    clear(body);
    $('feedCount').textContent = rows.length + ' of ' + open.length + ' open jobs' + (anyActive(f) ? ' (filtered)' : '') +
      ' · ' + money(sum(open.map(function (j) { return j.cap; }))) + ' of approved work on the board';
    $('feedEmpty').hidden = rows.length > 0;
    $('feedTable').parentNode.hidden = rows.length === 0;

    rows.forEach(function (j) {
      var tr = el('tr');
      var tdTitle = el('td', 'cell-strong');
      tdTitle.appendChild(document.createTextNode(j.title));
      tdTitle.appendChild(el('span', 'sub', excerpt(j.detail, 64)));
      tr.appendChild(tdTitle);
      tr.appendChild(el('td', '', j.suburb));

      var tdAgency = el('td');
      tdAgency.appendChild(document.createTextNode(j.agency));
      tdAgency.appendChild(el('span', 'sub', 'posted ' + agoLabel(j.posted)));
      tr.appendChild(tdAgency);

      tr.appendChild(el('td', '', j.when));
      tr.appendChild(el('td', 'num cell-strong', money(j.cap)));

      var tdAct = el('td');
      var view = el('button', 'btn btn-secondary btn-small', 'View');
      view.type = 'button';
      view.setAttribute('aria-label', 'View job ' + j.title);
      view.addEventListener('click', function (e) { e.stopPropagation(); openFeedJob(j); });
      var accept = el('button', 'btn btn-primary btn-small', 'Accept');
      accept.type = 'button';
      accept.style.marginLeft = '6px';
      accept.setAttribute('aria-label', 'Accept job ' + j.title);
      accept.addEventListener('click', function (e) { e.stopPropagation(); acceptJob(j); });
      tdAct.appendChild(view);
      tdAct.appendChild(accept);
      tr.appendChild(tdAct);

      tr.addEventListener('click', function () { openFeedJob(j); });
      body.appendChild(tr);
    });

    renderSchedule();
  }

  function renderSchedule() {
    var list = $('scheduleList');
    clear(list);
    var accepted = TRADIE_FEED.filter(function (j) { return j.accepted; });
    $('scheduleEmpty').hidden = accepted.length > 0;
    accepted.forEach(function (j) {
      var li = el('li', 'schedule-item');
      li.appendChild(el('span', 'si-title', j.title));
      li.appendChild(el('span', 'si-meta', j.suburb + ' · ' + j.agency + ' · ' + j.when));
      li.appendChild(el('span', 'si-value', money(j.cap)));
      list.appendChild(li);
    });
    if (accepted.length) {
      var li2 = el('li', 'schedule-item');
      li2.appendChild(el('span', 'si-title', 'Accepted this session'));
      li2.appendChild(el('span', 'si-meta', accepted.length + (accepted.length === 1 ? ' job' : ' jobs')));
      li2.appendChild(el('span', 'si-value', money(sum(accepted.map(function (j) { return j.cap; })))));
      list.appendChild(li2);
    }
  }

  function acceptJob(j) {
    j.accepted = true;
    renderFeed();
    closeSlideover();
    toast('Accepted — ' + j.title + ' (' + j.suburb + '). ' + j.agency + ' has been notified.');
    /* the button that had focus is gone; land the reader on their schedule instead */
    var list = $('scheduleList');
    list.setAttribute('tabindex', '-1');
    list.focus();
  }

  function openFeedJob(j) {
    openSlideover(j.id + ' · ' + j.title, function (body) {
      var meta = el('div', 'so-meta');
      meta.appendChild(el('span', 'pill pill-routed', 'Owner approved'));
      meta.appendChild(el('span', 'pill', j.suburb));
      body.appendChild(meta);

      var s1 = el('section', 'so-section');
      s1.appendChild(el('h3', '', 'Scope as written by the agency'));
      s1.appendChild(el('div', 'so-scope', j.detail));
      body.appendChild(s1);

      var s2 = el('section', 'so-section');
      s2.appendChild(el('h3', '', 'Job facts'));
      var facts = el('dl', 'so-facts');
      [['Approved to', money(j.cap)], ['Portfolio', j.agency], ['Window', j.when],
       ['Distance', (SUBURB_DISTANCE[TRADIE_PROFILE.base][j.suburb] + 0.4).toFixed(1) + ' km']].forEach(function (f) {
        var d = el('div', 'so-fact');
        d.appendChild(el('dt', '', f[0]));
        d.appendChild(el('dd', '', f[1]));
        facts.appendChild(d);
      });
      s2.appendChild(facts);
      body.appendChild(s2);

      var s3 = el('section', 'so-section');
      s3.appendChild(el('h3', '', 'Accept'));
      s3.appendChild(el('p', 'muted-note', 'Accepting locks the job to you. No quote, no callback, no lead fee — ' +
        'the owner has already approved the spend.'));
      if (j.accepted) {
        s3.appendChild(el('p', 'booked-flag', '✓ Already accepted — it is on your schedule.'));
      } else {
        var btn = el('button', 'btn btn-primary', 'Accept this job');
        btn.type = 'button';
        btn.style.marginTop = '8px';
        btn.addEventListener('click', function () { acceptJob(j); });
        s3.appendChild(btn);
      }
      body.appendChild(s3);
    });
  }

  /* =====================================================================
     12. Tradie · My flow
     ===================================================================== */

  function renderFlow() {
    var p = pal();
    var months = TRADIE_MONTHS.map(function (m) { return m.month; });
    var portfolio = TRADIE_MONTHS.map(function (m) { return m.portfolioJobs; });
    var oneOff = TRADIE_MONTHS.map(function (m) { return m.oneOffJobs; });
    var revenue = TRADIE_MONTHS.map(function (m) { return m.revenue; });

    var last6 = TRADIE_MONTHS.slice(-6);
    var last6Portfolio = sum(last6.map(function (m) { return m.portfolioJobs; }));
    var last6Total = last6Portfolio + sum(last6.map(function (m) { return m.oneOffJobs; }));
    var totalRevenue = sum(revenue);
    var totalPortfolioJobs = sum(portfolio);

    var kpis = $('flowKpis');
    clear(kpis);
    kpis.appendChild(kpiTile('Portfolio jobs, 12 months', String(totalPortfolioJobs),
      'up from ' + portfolio[0] + ' in ' + monthLong(months[0])));
    kpis.appendChild(kpiTile('Repeat-portfolio ratio', pct(last6Portfolio / last6Total * 100),
      last6Portfolio + ' of ' + last6Total + ' jobs in the last 6 months'));
    kpis.appendChild(kpiTile('Revenue through TradeFlow', moneyShort(totalRevenue),
      'invoiced across ' + totalPortfolioJobs + ' portfolio jobs'));
    kpis.appendChild(kpiTile('Average portfolio job', money(totalRevenue / totalPortfolioJobs),
      'no lead fee, no quote written'));

    var series = [
      { name: 'From portfolios', color: p.series[0], values: portfolio },
      { name: 'One-off / own leads', color: p.series[1], values: oneOff }
    ];
    stackedBar($('chartSource'), {
      labels: months.map(monthLabel),
      tipTitles: months.map(monthLong),
      series: series,
      height: 280,
      yTitle: 'Jobs completed',
      valueFormat: function (v) { return v + (v === 1 ? ' job' : ' jobs'); },
      ariaLabel: 'Stacked columns: jobs completed each month, portfolio versus one-off'
    });
    renderLegend($('legendSource'), series.map(function (s) {
      return { color: s.color, name: s.name, value: String(sum(s.values)) };
    }));
    renderDataTable($('dtSource'), ['Month', 'From portfolios', 'One-off', 'Total'],
      TRADIE_MONTHS.map(function (m) {
        return [monthLong(m.month), String(m.portfolioJobs), String(m.oneOffJobs), String(m.portfolioJobs + m.oneOffJobs)];
      }), 1);

    lineChart($('chartRevenue'), {
      labels: months.map(monthLabel),
      tipTitles: months.map(monthLong),
      values: revenue,
      color: p.accent,
      height: 250,
      yTitle: 'AUD invoiced',
      seriesName: 'through TradeFlow',
      valueFormat: function (v) { return money(v); },
      tickFormat: moneyAxis,
      ariaLabel: 'Line chart: revenue invoiced through TradeFlow by month'
    });
    renderDataTable($('dtRevenue'), ['Month', 'Revenue through TradeFlow', 'Portfolio jobs'],
      TRADIE_MONTHS.map(function (m) { return [monthLong(m.month), money(m.revenue), String(m.portfolioJobs)]; }), 1);

    /* ROI card, computed off the last complete month */
    var lastComplete = TRADIE_MONTHS[TRADIE_MONTHS.length - 2];
    var card = $('roiCard');
    clear(card);
    var head = el('div', 'card-head');
    head.appendChild(el('h2', '', 'Is the subscription worth it?'));
    head.appendChild(el('p', 'card-sub', 'Last complete month: ' + monthLong(lastComplete.month) + '.'));
    card.appendChild(head);
    var grid = el('div', 'roi-grid');
    [
      ['Your subscription', money(TRADIE_PROFILE.subscription) + '/mo', 'flat, no lead fees'],
      ['Portfolio jobs booked', money(lastComplete.revenue), lastComplete.portfolioJobs + ' jobs in ' + monthLong(lastComplete.month)],
      ['Return on the fee', Math.round(lastComplete.revenue / TRADIE_PROFILE.subscription) + '×', 'invoiced per dollar of subscription'],
      ['Quotes written', '0', 'the scope arrives with the job']
    ].forEach(function (r) {
      var b = el('div');
      b.appendChild(el('div', 'roi-label', r[0]));
      b.appendChild(el('div', 'roi-figure', r[1]));
      b.appendChild(el('div', 'kpi-sub', r[2]));
      grid.appendChild(b);
    });
    card.appendChild(grid);
  }

  /* =====================================================================
     13. Tabs and routing
     ===================================================================== */

  var VIEWS = {
    pm: [
      { id: 'triage', label: 'Triage inbox' },
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'pricebook', label: 'Price book' },
      { id: 'about', label: 'About this play' }
    ],
    tradie: [
      { id: 'feed', label: 'Job feed' },
      { id: 'flow', label: 'My flow' },
      { id: 'about', label: 'About this play' }
    ]
  };

  var route = { view: 'pm', tab: 'triage' };

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var parts = h.split('/');
    var view = parts[0], tab = parts[1];
    if (!VIEWS[view]) { view = 'pm'; tab = null; }
    var valid = VIEWS[view].some(function (t) { return t.id === tab; });
    if (!valid) tab = VIEWS[view][0].id;
    return { view: view, tab: tab };
  }

  function applyRoute(r) {
    route = r;
    /* perspective control */
    $('segPm').setAttribute('aria-pressed', r.view === 'pm' ? 'true' : 'false');
    $('segTradie').setAttribute('aria-pressed', r.view === 'tradie' ? 'true' : 'false');

    $('contextLine').textContent = r.view === 'pm'
      ? AGENCY.name + ' · ' + AGENCY.properties + ' properties under management · ' + AGENCY.region + ' · viewing as ' + AGENCY.pm + ', property manager'
      : TRADIE_PROFILE.name + ' · ' + TRADIE_PROFILE.tradeLabel + ' · ' + TRADIE_PROFILE.region + ' · ★ ' +
        TRADIE_PROFILE.rating.toFixed(1) + ' · member since ' + TRADIE_PROFILE.memberSince;

    /* tabs */
    var list = $('tabList');
    clear(list);
    VIEWS[r.view].forEach(function (t) {
      var b = el('button', 'tab', t.label);
      b.type = 'button';
      b.id = 'tab-' + t.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', t.id === r.tab ? 'true' : 'false');
      b.setAttribute('aria-controls', 'panel-' + t.id);
      b.setAttribute('tabindex', t.id === r.tab ? '0' : '-1');
      b.addEventListener('click', function () { go(r.view, t.id); });
      b.addEventListener('keydown', tabKeydown);
      list.appendChild(b);
    });

    /* panels */
    ['triage', 'portfolio', 'pricebook', 'feed', 'flow', 'about'].forEach(function (id) {
      $('panel-' + id).hidden = id !== r.tab;
    });

    closeSlideover();
    hideTip();
    renderActive();
  }

  function tabKeydown(e) {
    var buttons = Array.prototype.slice.call($('tabList').querySelectorAll('.tab'));
    var i = buttons.indexOf(e.currentTarget);
    var next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next >= 0) { e.preventDefault(); buttons[next].focus(); buttons[next].click(); }
  }

  function go(view, tab) {
    location.hash = '#' + view + '/' + tab;
  }

  function renderActive() {
    if (route.tab === 'triage') renderTriage();
    else if (route.tab === 'portfolio') renderPortfolio();
    else if (route.tab === 'pricebook') renderPriceBook();
    else if (route.tab === 'feed') renderFeed();
    else if (route.tab === 'flow') renderFlow();
  }

  /* =====================================================================
     14. Wiring
     ===================================================================== */

  function bindSelect(id, onChange) {
    $(id).addEventListener('change', function () { onChange(this.value); });
  }
  function bindSearch(id, onInput) {
    $(id).addEventListener('input', function () { onInput(this.value); });
  }

  function resetFilters(name) {
    var f = filters[name];
    Object.keys(f).forEach(function (k) { f[k] = ''; });
    if (name === 'triage') {
      $('fTriageTrade').value = ''; $('fTriageUrgency').value = ''; $('fTriageStatus').value = ''; $('fTriageSearch').value = '';
      renderTriage();
    } else if (name === 'port') {
      $('fPortTrade').value = ''; $('fPortSuburb').value = '';
      renderPortfolio();
    } else if (name === 'price') {
      $('fPriceTrade').value = ''; $('fPriceSuburb').value = ''; $('fPriceSearch').value = '';
      expandedPriceKey = null;
      renderPriceBook();
    } else if (name === 'feed') {
      $('fFeedSuburb').value = ''; $('fFeedValue').value = ''; $('fFeedSearch').value = '';
      renderFeed();
    }
  }

  function init() {
    initTheme();

    /* selects */
    fillSelect($('fTriageTrade'), tradeOptions(), 'All trades');
    fillSelect($('fTriageUrgency'), URGENCY_ORDER.map(function (u) { return { value: u, label: u }; }), 'All urgencies');
    fillSelect($('fTriageStatus'), STATUS_ORDER.map(function (s) { return { value: s, label: s }; }), 'All statuses');
    fillSelect($('fPortTrade'), tradeOptions(), 'All trades');
    fillSelect($('fPortSuburb'), suburbOptions(), 'All suburbs');
    fillSelect($('fPriceTrade'), tradeOptions(), 'All trades');
    fillSelect($('fPriceSuburb'), suburbOptions(), 'All suburbs');
    fillSelect($('fFeedSuburb'), suburbOptions(), 'All suburbs');
    fillSelect($('fFeedValue'), VALUE_BANDS, 'Any value');

    /* trade filter on the tradie feed is locked to the licensed trade */
    var feedTrade = $('fFeedTrade');
    clear(feedTrade);
    TRADES.forEach(function (t) {
      var o = el('option', '', t.label + (t.id === TRADIE_PROFILE.trade ? ' (your trade)' : ''));
      o.value = t.id;
      if (t.id !== TRADIE_PROFILE.trade) o.disabled = true;
      feedTrade.appendChild(o);
    });
    feedTrade.value = TRADIE_PROFILE.trade;
    feedTrade.setAttribute('aria-describedby', 'tradeLockNote');

    bindSelect('fTriageTrade', function (v) { filters.triage.trade = v; renderTriage(); });
    bindSelect('fTriageUrgency', function (v) { filters.triage.urgency = v; renderTriage(); });
    bindSelect('fTriageStatus', function (v) { filters.triage.status = v; renderTriage(); });
    bindSearch('fTriageSearch', function (v) { filters.triage.q = v; renderTriage(); });

    bindSelect('fPortTrade', function (v) { filters.port.trade = v; renderPortfolio(); });
    bindSelect('fPortSuburb', function (v) { filters.port.suburb = v; renderPortfolio(); });

    bindSelect('fPriceTrade', function (v) { filters.price.trade = v; expandedPriceKey = null; renderPriceBook(); });
    bindSelect('fPriceSuburb', function (v) { filters.price.suburb = v; expandedPriceKey = null; renderPriceBook(); });
    bindSearch('fPriceSearch', function (v) { filters.price.q = v; renderPriceBook(); });

    bindSelect('fFeedSuburb', function (v) { filters.feed.suburb = v; renderFeed(); });
    bindSelect('fFeedValue', function (v) { filters.feed.minValue = v; renderFeed(); });
    bindSearch('fFeedSearch', function (v) { filters.feed.q = v; renderFeed(); });

    $('fTriageReset').addEventListener('click', function () { resetFilters('triage'); });
    $('fPortReset').addEventListener('click', function () { resetFilters('port'); });
    $('fPriceReset').addEventListener('click', function () { resetFilters('price'); });
    $('fFeedReset').addEventListener('click', function () { resetFilters('feed'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'), function (b) {
      b.addEventListener('click', function () { resetFilters(b.getAttribute('data-reset')); });
    });

    attachSort('triageTable', 'triage', renderTriage);
    attachSort('priceTable', 'price', renderPriceBook);
    attachSort('feedTable', 'feed', renderFeed);

    /* perspective switcher */
    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-view');
        go(v, VIEWS[v][0].id);
      });
    });

    /* slide-over */
    $('slideoverClose').addEventListener('click', closeSlideover);
    $('scrim').addEventListener('click', closeSlideover);

    /* chart data tables render eagerly, but re-measure charts on open */
    Array.prototype.forEach.call(document.querySelectorAll('.disclosure'), function (d) {
      d.addEventListener('toggle', function () { hideTip(); });
    });

    /* routing */
    window.addEventListener('hashchange', function () { applyRoute(parseHash()); });

    /* responsive re-render of charts */
    var lastW = window.innerWidth, t = null;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      hideTip();
      if (t) window.clearTimeout(t);
      t = window.setTimeout(renderActive, 150);
    });

    if (!location.hash) { location.replace('#pm/triage'); }
    applyRoute(parseHash());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
