/* StatuteGraph — demo application logic.
   Vanilla JS, no dependencies, no network. All data comes from data.js. */

(function () {
  'use strict';

  var D = window.SG_DATA;
  // XML namespace identifier required by createElementNS — never fetched.
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ============================== Small helpers ============================== */

  function $(id) { return document.getElementById(id); }

  function el(tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (textContent !== undefined && textContent !== null) { node.textContent = String(textContent); }
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
    }
    return node;
  }

  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

  function formatDate(iso) {
    var p = iso.split('-');
    return String(Number(p[2])) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  function monthLabel(key) {
    var p = key.split('-');
    return MONTHS[Number(p[1]) - 1] + ' ' + p[0].slice(2);
  }

  function monthLong(key) {
    var p = key.split('-');
    return MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  function truncate(str, max) {
    return str.length <= max ? str : str.slice(0, Math.max(0, max - 1)).replace(/[\s—·-]+$/, '') + '…';
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function severityRank(s) { return D.SEVERITIES.indexOf(s); }

  function last12Months(today) {
    var p = today.split('-');
    var y = Number(p[0]);
    var m = Number(p[1]);
    var out = [];
    for (var i = 11; i >= 0; i--) {
      var mm = m - i;
      var yy = y;
      while (mm <= 0) { mm += 12; yy -= 1; }
      out.push(yy + '-' + String(mm).padStart(2, '0'));
    }
    return out;
  }

  /* ============================== Tooltip ============================== */

  var tooltipEl = $('tooltip');

  function showTip(value, label, x, y) {
    clear(tooltipEl);
    tooltipEl.appendChild(el('span', 'tip-value', value));
    if (label) { tooltipEl.appendChild(el('span', 'tip-label', label)); }
    tooltipEl.hidden = false;
    positionTip(x, y);
  }

  function positionTip(x, y) {
    var rect = tooltipEl.getBoundingClientRect();
    var left = x + 14;
    var top = y + 16;
    if (left + rect.width > window.innerWidth - 8) { left = Math.max(8, x - rect.width - 14); }
    if (top + rect.height > window.innerHeight - 8) { top = Math.max(8, y - rect.height - 16); }
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  function hideTip() { tooltipEl.hidden = true; }

  // Attach hover + keyboard-focus tooltips to any element.
  function bindTip(node, getValue, getLabel) {
    node.addEventListener('pointerenter', function (e) { showTip(getValue(), getLabel(), e.clientX, e.clientY); });
    node.addEventListener('pointermove', function (e) { positionTip(e.clientX, e.clientY); });
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('focus', function () {
      var r = node.getBoundingClientRect();
      showTip(getValue(), getLabel(), r.left + r.width / 2, r.top + r.height / 2);
    });
    node.addEventListener('blur', hideTip);
  }

  /* ============================== Theme ============================== */

  var THEME_KEY = 'statutegraph-theme';
  var themeToggle = $('theme-toggle');
  var themeLabel = $('theme-label');

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
    themeToggle.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (persist) {
      try { window.localStorage.setItem(THEME_KEY, theme); } catch (err) { /* storage unavailable */ }
    }
    renderAllCharts();
  }

  function initTheme() {
    var stored = null;
    try { stored = window.localStorage.getItem(THEME_KEY); } catch (err) { stored = null; }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = (stored === 'dark' || stored === 'light') ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
    themeToggle.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  themeToggle.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });

  /* ============================== Tabs ============================== */

  var TAB_NAMES = ['feed', 'graph', 'api', 'about'];
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  function showTab(name, focusTab) {
    if (TAB_NAMES.indexOf(name) === -1) { name = 'feed'; }
    tabButtons.forEach(function (btn) {
      var active = btn.dataset.tab === name;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
      var panel = $('panel-' + btn.dataset.tab);
      panel.hidden = !active;
      if (active && focusTab) { btn.focus(); }
    });
    hideTip();
  }

  function tabFromHash() {
    var hash = window.location.hash.replace('#', '');
    return TAB_NAMES.indexOf(hash) === -1 ? 'feed' : hash;
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.hash = btn.dataset.tab;
      showTab(btn.dataset.tab, false);
    });
    btn.addEventListener('keydown', function (e) {
      var i = tabButtons.indexOf(btn);
      var next = null;
      if (e.key === 'ArrowRight') { next = (i + 1) % tabButtons.length; }
      else if (e.key === 'ArrowLeft') { next = (i - 1 + tabButtons.length) % tabButtons.length; }
      else if (e.key === 'Home') { next = 0; }
      else if (e.key === 'End') { next = tabButtons.length - 1; }
      if (next !== null) {
        e.preventDefault();
        window.location.hash = tabButtons[next].dataset.tab;
        showTab(tabButtons[next].dataset.tab, true);
      }
    });
  });

  window.addEventListener('hashchange', function () { showTab(tabFromHash(), false); });

  /* ============================== Impact feed ============================== */

  var feedState = {
    q: '',
    jurisdiction: '',
    practice: '',
    severity: '',
    sortKey: 'commencement',
    sortDir: 'desc'
  };

  var feedBody = $('feed-body');
  var feedTable = $('feed-table');
  var feedEmpty = $('feed-empty');
  var resetBtn = $('reset-filters');

  function fillSelect(select, values) {
    values.forEach(function (v) {
      var opt = el('option', null, v);
      opt.value = v;
      select.appendChild(opt);
    });
  }

  fillSelect($('filter-jurisdiction'), D.JURISDICTIONS);
  fillSelect($('filter-practice'), D.PRACTICE_AREAS);
  fillSelect($('filter-severity'), D.SEVERITIES.slice().reverse());

  function filtersActive() {
    return !!(feedState.q || feedState.jurisdiction || feedState.practice || feedState.severity);
  }

  function matchesFilters(a) {
    if (feedState.jurisdiction && a.jurisdiction !== feedState.jurisdiction) { return false; }
    if (feedState.severity && a.severity !== feedState.severity) { return false; }
    if (feedState.practice && a.practiceAreas.indexOf(feedState.practice) === -1) { return false; }
    if (feedState.q) {
      var haystack = [a.instrument, a.shortAct, a.jurisdiction, a.severity, a.id]
        .concat(a.practiceAreas)
        .concat(a.clausePatterns.map(function (c) { return c.name; }))
        .join(' ')
        .toLowerCase();
      if (haystack.indexOf(feedState.q.toLowerCase()) === -1) { return false; }
    }
    return true;
  }

  function sortValue(a, key) {
    if (key === 'severity') { return severityRank(a.severity); }
    if (key === 'practiceAreas') { return a.practiceAreas.join(', ').toLowerCase(); }
    if (key === 'clausePatternCount' || key === 'docTypeCount') { return a[key]; }
    if (key === 'commencement') { return a.commencement; }
    return String(a[key]).toLowerCase();
  }

  function getFeedRows() {
    var rows = D.AMENDMENTS.filter(matchesFilters);
    var dir = feedState.sortDir === 'asc' ? 1 : -1;
    rows.sort(function (x, y) {
      var vx = sortValue(x, feedState.sortKey);
      var vy = sortValue(y, feedState.sortKey);
      if (vx < vy) { return -1 * dir; }
      if (vx > vy) { return 1 * dir; }
      return x.id < y.id ? -1 : 1;
    });
    return rows;
  }

  function severityBadge(severity) {
    var badge = el('span', 'badge');
    badge.dataset.severity = severity;
    badge.appendChild(el('span', 'badge-dot'));
    badge.appendChild(el('span', null, severity));
    return badge;
  }

  function renderFeed() {
    var rows = getFeedRows();
    clear(feedBody);

    rows.forEach(function (a) {
      var tr = el('tr');
      tr.dataset.id = a.id;

      var tdName = el('td');
      var btn = el('button', 'row-button', a.instrument);
      btn.type = 'button';
      btn.setAttribute('aria-haspopup', 'dialog');
      tdName.appendChild(btn);
      tdName.appendChild(el('span', 'row-meta', a.id + ' · ' + a.shortAct));
      tr.appendChild(tdName);

      tr.appendChild(el('td', null, a.jurisdiction));

      var tdAreas = el('td');
      var list = el('div', 'pill-list');
      a.practiceAreas.forEach(function (p) { list.appendChild(el('span', 'pill', p)); });
      tdAreas.appendChild(list);
      tr.appendChild(tdAreas);

      tr.appendChild(el('td', 'num', a.clausePatternCount));
      tr.appendChild(el('td', 'num', a.docTypeCount));

      var tdSev = el('td');
      tdSev.appendChild(severityBadge(a.severity));
      tr.appendChild(tdSev);

      tr.appendChild(el('td', 'date-cell', formatDate(a.commencement)));

      tr.addEventListener('click', function () { openDetail(a, btn); });
      btn.addEventListener('click', function (e) { e.stopPropagation(); openDetail(a, btn); });

      feedBody.appendChild(tr);
    });

    var none = rows.length === 0;
    feedTable.hidden = none;
    feedEmpty.hidden = !none;
    resetBtn.hidden = !filtersActive();

    updateStats(rows);
    updateSortIndicators();
  }

  function updateStats(rows) {
    var patterns = rows.reduce(function (s, a) { return s + a.clausePatternCount; }, 0);
    var families = rows.reduce(function (s, a) { return s + a.templateFamilies; }, 0);
    var critical = rows.filter(function (a) { return a.severity === 'High' || a.severity === 'Critical'; }).length;
    $('stat-amendments').textContent = rows.length + ' of ' + D.AMENDMENTS.length;
    $('stat-patterns').textContent = String(patterns);
    $('stat-families').textContent = String(families);
    $('stat-critical').textContent = String(critical);
  }

  function updateSortIndicators() {
    Array.prototype.forEach.call(feedTable.querySelectorAll('thead th'), function (th) {
      var button = th.querySelector('.th-button');
      var arrow = th.querySelector('.sort-arrow');
      if (button.dataset.sort === feedState.sortKey) {
        th.setAttribute('aria-sort', feedState.sortDir === 'asc' ? 'ascending' : 'descending');
        arrow.textContent = feedState.sortDir === 'asc' ? '▲' : '▼';
      } else {
        th.setAttribute('aria-sort', 'none');
        arrow.textContent = '';
      }
    });
  }

  Array.prototype.forEach.call(feedTable.querySelectorAll('.th-button'), function (button) {
    button.addEventListener('click', function () {
      var key = button.dataset.sort;
      if (feedState.sortKey === key) {
        feedState.sortDir = feedState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        feedState.sortKey = key;
        // Numbers, dates and severity are most useful highest-first.
        feedState.sortDir = (key === 'instrument' || key === 'jurisdiction' || key === 'practiceAreas') ? 'asc' : 'desc';
      }
      renderFeed();
    });
  });

  $('feed-search').addEventListener('input', function (e) {
    feedState.q = e.target.value.trim();
    renderFeed();
  });
  $('filter-jurisdiction').addEventListener('change', function (e) { feedState.jurisdiction = e.target.value; renderFeed(); });
  $('filter-practice').addEventListener('change', function (e) { feedState.practice = e.target.value; renderFeed(); });
  $('filter-severity').addEventListener('change', function (e) { feedState.severity = e.target.value; renderFeed(); });

  function resetFilters() {
    feedState.q = '';
    feedState.jurisdiction = '';
    feedState.practice = '';
    feedState.severity = '';
    $('feed-search').value = '';
    $('filter-jurisdiction').value = '';
    $('filter-practice').value = '';
    $('filter-severity').value = '';
    renderFeed();
    $('feed-search').focus();
  }

  resetBtn.addEventListener('click', resetFilters);
  $('empty-reset').addEventListener('click', resetFilters);

  /* ============================== Slide-over detail ============================== */

  var slideover = $('slideover');
  var overlay = $('overlay');
  var slideBody = $('slideover-body');
  var lastTrigger = null;

  function openDetail(a, trigger) {
    lastTrigger = trigger || null;

    $('slideover-eyebrow').textContent = a.jurisdiction + ' · ' + a.severity + ' impact · commences ' + formatDate(a.commencement);
    $('slideover-title').textContent = a.instrument;

    clear(slideBody);

    // Meta pills
    var meta = el('div', 'detail-meta');
    meta.appendChild(el('span', 'pill', a.id));
    meta.appendChild(el('span', 'pill', plural(a.clausePatternCount, 'clause pattern')));
    meta.appendChild(el('span', 'pill', plural(a.docTypeCount, 'document type')));
    meta.appendChild(el('span', 'pill', plural(a.templateFamilies, 'template family', 'template families')));
    slideBody.appendChild(meta);

    // What changed
    var s1 = el('section', 'detail-section');
    s1.appendChild(el('h3', null, 'What changed'));
    s1.appendChild(el('p', 'detail-summary', a.summary));
    slideBody.appendChild(s1);

    // Affected clause patterns
    var s2 = el('section', 'detail-section');
    s2.appendChild(el('h3', null, 'Affected clause patterns (' + a.clausePatternCount + ')'));
    var ul = el('ul', 'detail-list');
    a.clausePatterns.forEach(function (c) {
      var li = el('li');
      li.appendChild(el('span', 'detail-name', c.name + ' — ' + plural(c.templateFamilies, 'template family', 'template families')));
      li.appendChild(el('span', 'detail-note', c.provisionLabel + ' · ' + c.practiceArea + ' · ' + plural(c.docTypes.length, 'document type')));
      ul.appendChild(li);
    });
    s2.appendChild(ul);
    slideBody.appendChild(s2);

    // Affected document types
    var s3 = el('section', 'detail-section');
    s3.appendChild(el('h3', null, 'Affected document types (' + a.docTypeCount + ')'));
    var max = a.docTypeImpacts.reduce(function (m, d) { return Math.max(m, d.clausePatterns); }, 1);
    a.docTypeImpacts.forEach(function (d) {
      var row = el('div', 'bar-row');
      var left = el('div');
      left.appendChild(el('div', 'bar-row-label', d.docType));
      var track = el('div', 'bar-row-track');
      var fill = el('div', 'bar-row-fill');
      fill.style.width = Math.round((d.clausePatterns / max) * 100) + '%';
      track.appendChild(fill);
      left.appendChild(track);
      row.appendChild(left);
      row.appendChild(el('div', 'bar-row-value', d.clausePatterns));
      s3.appendChild(row);
    });
    slideBody.appendChild(s3);

    overlay.hidden = false;
    slideover.hidden = false;

    var row = feedBody.querySelector('tr[data-id="' + a.id + '"]');
    Array.prototype.forEach.call(feedBody.querySelectorAll('tr'), function (r) { r.classList.remove('is-open'); });
    if (row) { row.classList.add('is-open'); }

    $('slideover-close').focus();
    document.addEventListener('keydown', onSlideKeydown, true);
  }

  function closeDetail() {
    if (slideover.hidden) { return; }
    slideover.hidden = true;
    overlay.hidden = true;
    document.removeEventListener('keydown', onSlideKeydown, true);
    Array.prototype.forEach.call(feedBody.querySelectorAll('tr'), function (r) { r.classList.remove('is-open'); });
    if (lastTrigger && document.contains(lastTrigger)) { lastTrigger.focus(); }
    lastTrigger = null;
  }

  function focusableIn(container) {
    return Array.prototype.filter.call(
      container.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (node) { return !node.disabled && node.offsetParent !== null; }
    );
  }

  function onSlideKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDetail();
      return;
    }
    if (e.key !== 'Tab') { return; }
    var items = focusableIn(slideover);
    if (!items.length) { return; }
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!slideover.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  }

  $('slideover-close').addEventListener('click', closeDetail);
  overlay.addEventListener('click', closeDetail);

  /* ============================== Graph tab ============================== */

  var graphSelect = $('graph-select');
  var graphSvg = $('graph-svg');
  var graphClear = $('graph-clear');
  var graphState = { selection: 'top8', activeNode: null };

  (function populateGraphSelect() {
    var top = el('option', null, 'Top 8 provisions — whole corpus (last 12 months)');
    top.value = 'top8';
    graphSelect.appendChild(top);
    D.AMENDMENTS.slice()
      .sort(function (a, b) { return a.commencement < b.commencement ? 1 : -1; })
      .forEach(function (a) {
        var opt = el('option', null, a.instrument);
        opt.value = a.id;
        graphSelect.appendChild(opt);
      });
  }());

  function graphModel() {
    var provisions;
    var title;
    if (graphState.selection === 'top8') {
      provisions = D.PROVISIONS.slice().sort(function (a, b) {
        if (b.weight !== a.weight) { return b.weight - a.weight; }
        if (b.clausePatterns.length !== a.clausePatterns.length) { return b.clausePatterns.length - a.clausePatterns.length; }
        return a.label < b.label ? -1 : 1;
      }).slice(0, 8);
      title = 'Top 8 provisions by affected clause patterns — whole corpus';
    } else {
      var amendment = D.AMENDMENTS.filter(function (a) { return a.id === graphState.selection; })[0];
      provisions = D.PROVISIONS.filter(function (p) { return p.amendmentId === amendment.id; });
      title = amendment.instrument;
    }
    var docTotals = {};
    provisions.forEach(function (p) {
      p.edges.forEach(function (e) { docTotals[e.docType] = (docTotals[e.docType] || 0) + e.weight; });
    });
    return { provisions: provisions, docTotals: docTotals, title: title };
  }

  function renderGraph() {
    var model = graphModel();
    var provisions = model.provisions;
    clear(graphSvg);

    $('graph-title').textContent = model.title;

    var W = 900;
    var H = 560;
    var leftX = 24;
    var leftW = 244;
    var rightW = 236;
    var rightX = W - 24 - rightW;
    var topY = 62;
    var bottomY = H - 24;

    graphSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    // Column headings
    var h1 = svgEl('text', { x: leftX, y: 36, class: 'column-heading' });
    h1.textContent = 'Legislative provisions';
    graphSvg.appendChild(h1);
    var h2 = svgEl('text', { x: rightX, y: 36, class: 'column-heading' });
    h2.textContent = 'Precedent document types';
    graphSvg.appendChild(h2);

    // Left node geometry
    var lCount = provisions.length;
    var lHeight = 46;
    var lSpan = bottomY - topY;
    var lStep = lCount > 1 ? Math.min(70, (lSpan - lHeight) / (lCount - 1)) : 0;
    var lStart = topY + (lSpan - (lHeight + lStep * (lCount - 1))) / 2;

    var docs = D.DOC_TYPES;
    var rCount = docs.length;
    var rHeight = 38;
    var rStep = (lSpan - rHeight) / (rCount - 1);
    var rStart = topY;

    var leftPos = provisions.map(function (p, i) {
      var y = lStart + i * lStep;
      return { y: y, cy: y + lHeight / 2, item: p };
    });
    var rightPos = docs.map(function (d, i) {
      var y = rStart + i * rStep;
      return { y: y, cy: y + rHeight / 2, docType: d, total: model.docTotals[d] || 0 };
    });

    var edgeLayer = svgEl('g', { class: 'edge-layer' });
    var hitLayer = svgEl('g', { class: 'edge-hit-layer' });
    var nodeLayer = svgEl('g', { class: 'node-layer' });
    graphSvg.appendChild(edgeLayer);
    graphSvg.appendChild(hitLayer);
    graphSvg.appendChild(nodeLayer);

    var edgeRecords = [];

    leftPos.forEach(function (lp) {
      lp.item.edges.forEach(function (e) {
        var rp = rightPos.filter(function (r) { return r.docType === e.docType; })[0];
        if (!rp) { return; }
        var x1 = leftX + leftW;
        var x2 = rightX;
        var dx = (x2 - x1) * 0.45;
        var d = 'M ' + x1 + ' ' + lp.cy + ' C ' + (x1 + dx) + ' ' + lp.cy + ', ' + (x2 - dx) + ' ' + rp.cy + ', ' + x2 + ' ' + rp.cy;

        var path = svgEl('path', { class: 'edge', d: d, 'stroke-width': Math.min(6, 1 + e.weight * 1.4) });
        edgeLayer.appendChild(path);

        var hit = svgEl('path', { class: 'edge-hit', d: d });
        hitLayer.appendChild(hit);

        var record = { path: path, hit: hit, provisionId: lp.item.id, docType: e.docType, weight: e.weight, label: lp.item.label };
        edgeRecords.push(record);

        bindTip(hit,
          function () { return plural(record.weight, 'clause pattern'); },
          function () { return record.label + ' → ' + record.docType; });
      });
    });

    function applyHighlight() {
      var active = graphState.activeNode;
      edgeRecords.forEach(function (r) {
        r.path.classList.remove('is-hot', 'is-dim');
        if (!active) { return; }
        var connected = (active.kind === 'provision' && r.provisionId === active.key) ||
                        (active.kind === 'doc' && r.docType === active.key);
        r.path.classList.add(connected ? 'is-hot' : 'is-dim');
      });
      Array.prototype.forEach.call(nodeLayer.querySelectorAll('.node-group'), function (g) {
        g.classList.remove('is-active', 'is-dim');
        g.setAttribute('aria-pressed', 'false');
        if (!active) { return; }
        var kind = g.dataset.kind;
        var key = g.dataset.key;
        if (kind === active.kind && key === active.key) {
          g.classList.add('is-active');
          g.setAttribute('aria-pressed', 'true');
          return;
        }
        var connected = edgeRecords.some(function (r) {
          if (active.kind === 'provision' && r.provisionId !== active.key) { return false; }
          if (active.kind === 'doc' && r.docType !== active.key) { return false; }
          return (kind === 'provision' && r.provisionId === key) || (kind === 'doc' && r.docType === key);
        });
        if (!connected) { g.classList.add('is-dim'); }
      });
      graphClear.hidden = !active;
    }

    function makeNode(opts) {
      var g = svgEl('g', { class: 'node-group', transform: 'translate(' + opts.x + ',' + opts.y + ')' });
      g.dataset.kind = opts.kind;
      g.dataset.key = opts.key;
      var rect = svgEl('rect', { class: 'node-rect', x: 0, y: 0, width: opts.w, height: opts.h, rx: 6 });
      g.appendChild(rect);
      var t1 = svgEl('text', { class: 'node-text', x: 12, y: opts.h === 46 ? 20 : 17 });
      t1.textContent = opts.line1;
      g.appendChild(t1);
      var t2 = svgEl('text', { class: 'node-sub', x: 12, y: opts.h === 46 ? 35 : 30 });
      t2.textContent = opts.line2;
      g.appendChild(t2);

      if (opts.interactive) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-pressed', 'false');
        var toggle = function () {
          var active = graphState.activeNode;
          if (active && active.kind === opts.kind && active.key === opts.key) {
            graphState.activeNode = null;
          } else {
            graphState.activeNode = { kind: opts.kind, key: opts.key };
          }
          applyHighlight();
        };
        g.addEventListener('click', toggle);
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(); }
        });
        bindTip(g, function () { return opts.tipValue; }, function () { return opts.tipLabel; });
      } else {
        g.classList.add('is-dim');
      }
      nodeLayer.appendChild(g);
    }

    leftPos.forEach(function (lp) {
      var p = lp.item;
      makeNode({
        kind: 'provision', key: p.id,
        x: leftX, y: lp.y, w: leftW, h: 46,
        // Widths measured against the 244px node box at 11px / 10px type,
        // so a label never overflows or gets clipped by its own mark.
        line1: truncate(p.label, 38),
        line2: truncate(p.heading, 40),
        interactive: true,
        tipValue: plural(p.clausePatterns.length, 'clause pattern'),
        tipLabel: p.label + ' — ' + p.heading
      });
    });

    rightPos.forEach(function (rp) {
      makeNode({
        kind: 'doc', key: rp.docType,
        x: rightX, y: rp.y, w: rightW, h: 38,
        line1: truncate(rp.docType, 34),
        line2: rp.total ? plural(rp.total, 'clause pattern') : 'not affected by this selection',
        interactive: rp.total > 0,
        tipValue: plural(rp.total, 'clause pattern'),
        tipLabel: rp.docType
      });
    });

    applyHighlight();
    renderGraphTable(edgeRecords);
  }

  function renderGraphTable(edgeRecords) {
    var body = $('graph-edge-table');
    clear(body);
    var sorted = edgeRecords.slice().sort(function (a, b) {
      if (a.label !== b.label) { return a.label < b.label ? -1 : 1; }
      return b.weight - a.weight;
    });
    sorted.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', null, r.label));
      tr.appendChild(el('td', null, r.docType));
      tr.appendChild(el('td', 'num', r.weight));
      body.appendChild(tr);
    });
    var total = sorted.reduce(function (s, r) { return s + r.weight; }, 0);
    $('graph-edge-total').textContent = sorted.length + ' edges · ' + total + ' clause-pattern links in this view';
  }

  graphSelect.addEventListener('change', function (e) {
    graphState.selection = e.target.value;
    graphState.activeNode = null;
    renderGraph();
  });

  graphClear.addEventListener('click', function () {
    graphState.activeNode = null;
    renderGraph();
    graphSelect.focus();
  });

  /* ============================== Bar chart: amendments by month ============================== */

  function monthCounts() {
    var keys = last12Months(D.TODAY);
    var counts = {};
    keys.forEach(function (k) { counts[k] = 0; });
    D.AMENDMENTS.forEach(function (a) {
      var k = a.commencement.slice(0, 7);
      if (counts[k] !== undefined) { counts[k] += 1; }
    });
    return keys.map(function (k) { return { key: k, count: counts[k] }; });
  }

  function renderBarChart() {
    var svg = $('bar-svg');
    clear(svg);

    var data = monthCounts();
    var W = 620;
    var H = 300;
    var m = { top: 28, right: 16, bottom: 54, left: 46 };
    var plotW = W - m.left - m.right;
    var plotH = H - m.top - m.bottom;
    var maxValue = data.reduce(function (mx, d) { return Math.max(mx, d.count); }, 0);
    var yMax = Math.max(2, maxValue);
    var band = plotW / data.length;
    var barW = Math.min(24, band - 14);
    var radius = 4;

    function yOf(v) { return m.top + plotH - (v / yMax) * plotH; }

    // Gridlines + y ticks (solid hairlines, one step off surface)
    for (var t = 0; t <= yMax; t++) {
      var y = yOf(t);
      svg.appendChild(svgEl('line', { class: 'grid-line', x1: m.left, y1: y, x2: m.left + plotW, y2: y }));
      var tick = svgEl('text', { class: 'axis-text', x: m.left - 8, y: y + 4, 'text-anchor': 'end' });
      tick.textContent = String(t);
      svg.appendChild(tick);
    }

    // Baseline
    svg.appendChild(svgEl('line', { class: 'axis-line', x1: m.left, y1: yOf(0), x2: m.left + plotW, y2: yOf(0) }));

    // Y axis label
    var yTitle = svgEl('text', {
      class: 'axis-title',
      x: 0, y: 0,
      transform: 'translate(14,' + (m.top + plotH / 2) + ') rotate(-90)',
      'text-anchor': 'middle'
    });
    yTitle.textContent = 'Amendments commencing';
    svg.appendChild(yTitle);

    data.forEach(function (d) {
      var i = data.indexOf(d);
      var cx = m.left + band * i + band / 2;
      var x = cx - barW / 2;
      var y = yOf(d.count);
      var h = yOf(0) - y;

      var g = svgEl('g', { class: 'bar-group' });

      if (h > 0) {
        var r = Math.min(radius, barW / 2, h);
        var path = 'M ' + x + ' ' + (y + h) +
          ' L ' + x + ' ' + (y + r) +
          ' Q ' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
          ' L ' + (x + barW - r) + ' ' + y +
          ' Q ' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + r) +
          ' L ' + (x + barW) + ' ' + (y + h) + ' Z';
        g.appendChild(svgEl('path', { class: 'bar-mark', d: path }));
      }

      // Hit target spans the whole band, not just the painted bar.
      var hit = svgEl('rect', { class: 'bar-hit', x: m.left + band * i, y: m.top, width: band, height: plotH });
      g.appendChild(hit);

      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'img');
      g.setAttribute('aria-label', monthLong(d.key) + ': ' + plural(d.count, 'amendment'));
      bindTip(g,
        function () { return plural(d.count, 'amendment'); },
        function () { return monthLong(d.key) + ' commencements'; });

      // Direct-label the extreme only; the axis and the table carry the rest.
      if (d.count === maxValue && maxValue > 0) {
        var label = svgEl('text', { class: 'bar-label', x: cx, y: y - 8, 'text-anchor': 'middle' });
        label.textContent = String(d.count);
        g.appendChild(label);
      }

      var xLabel = svgEl('text', { class: 'axis-text', x: cx, y: yOf(0) + 20, 'text-anchor': 'middle' });
      xLabel.textContent = monthLabel(d.key);
      svg.appendChild(xLabel);

      svg.appendChild(g);
    });

    var xTitle = svgEl('text', { class: 'axis-title', x: m.left + plotW / 2, y: H - 12, 'text-anchor': 'middle' });
    xTitle.textContent = 'Month of commencement';
    svg.appendChild(xTitle);

    // Table view
    var body = $('bar-table');
    clear(body);
    data.forEach(function (d) {
      var tr = el('tr');
      tr.appendChild(el('td', null, monthLong(d.key)));
      tr.appendChild(el('td', 'num', d.count));
      body.appendChild(tr);
    });
    var total = data.reduce(function (s, d) { return s + d.count; }, 0);
    $('bar-total').textContent = 'Total: ' + total + ' amendments';
  }

  /* ============================== Donut: clause patterns by practice area ============================== */

  function practiceAreaCounts() {
    var counts = {};
    D.PRACTICE_AREAS.forEach(function (p) { counts[p] = 0; });
    D.AMENDMENTS.forEach(function (a) {
      a.clausePatterns.forEach(function (c) { counts[c.practiceArea] += 1; });
    });
    // Colour follows the entity (fixed practice-area order), never the rank.
    return D.PRACTICE_AREAS.map(function (p, i) {
      return { area: p, count: counts[p], slot: i + 1 };
    });
  }

  function polar(cx, cy, r, angle) {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function arcPath(cx, cy, rOuter, rInner, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    var p0 = polar(cx, cy, rOuter, a0);
    var p1 = polar(cx, cy, rOuter, a1);
    var p2 = polar(cx, cy, rInner, a1);
    var p3 = polar(cx, cy, rInner, a0);
    return 'M ' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) +
      ' A ' + rOuter + ' ' + rOuter + ' 0 ' + large + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) +
      ' L ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2) +
      ' A ' + rInner + ' ' + rInner + ' 0 ' + large + ' 0 ' + p3[0].toFixed(2) + ' ' + p3[1].toFixed(2) +
      ' Z';
  }

  function renderDonut() {
    var svg = $('donut-svg');
    clear(svg);

    var data = practiceAreaCounts();
    var total = data.reduce(function (s, d) { return s + d.count; }, 0);
    var cx = 130;
    var cy = 130;
    var rOuter = 100;
    var rInner = 62;
    var rMid = (rOuter + rInner) / 2;
    var gap = 2 / rMid; // a 2px surface gap between segments, in radians
    var angle = -Math.PI / 2;

    data.forEach(function (d) {
      var span = (d.count / total) * Math.PI * 2;
      var a0 = angle + gap / 2;
      var a1 = angle + span - gap / 2;
      angle += span;
      if (a1 <= a0) { return; }

      var seg = svgEl('path', {
        class: 'donut-seg s-' + d.slot,
        d: arcPath(cx, cy, rOuter, rInner, a0, a1),
        tabindex: '0',
        role: 'img',
        'aria-label': d.area + ': ' + plural(d.count, 'clause pattern') +
          ' (' + Math.round((d.count / total) * 100) + '%)'
      });
      bindTip(seg,
        function () { return plural(d.count, 'clause pattern'); },
        function () { return d.area + ' · ' + Math.round((d.count / total) * 100) + '% of the corpus'; });
      svg.appendChild(seg);
    });

    var value = svgEl('text', { class: 'donut-centre-value', x: cx, y: cy + 2, 'text-anchor': 'middle' });
    value.textContent = String(total);
    svg.appendChild(value);
    var label = svgEl('text', { class: 'donut-centre-label', x: cx, y: cy + 22, 'text-anchor': 'middle' });
    label.textContent = 'clause patterns';
    svg.appendChild(label);

    // Legend doubles as the table view: name, count and share are all visible.
    var legend = $('donut-legend');
    clear(legend);
    data.forEach(function (d) {
      var li = el('li');
      li.appendChild(el('span', 'swatch sw-' + d.slot));
      li.appendChild(el('span', 'legend-name', d.area));
      li.appendChild(el('span', 'legend-value', d.count));
      li.appendChild(el('span', 'legend-share', Math.round((d.count / total) * 100) + '%'));
      legend.appendChild(li);
    });
  }

  function renderAllCharts() {
    renderGraph();
    renderBarChart();
    renderDonut();
  }

  /* ============================== API console ============================== */

  var apiEndpoint = $('api-endpoint');
  var apiJurisdiction = $('api-jurisdiction');
  var apiSince = $('api-since');
  var apiSeverity = $('api-severity');
  var apiProvision = $('api-provision');

  fillSelect(apiJurisdiction, D.JURISDICTIONS);

  (function populateProvisions() {
    D.JURISDICTIONS.forEach(function (j) {
      var group = document.createElement('optgroup');
      group.label = j;
      D.PROVISIONS.filter(function (p) { return p.jurisdiction === j; })
        .sort(function (a, b) { return b.weight - a.weight; })
        .forEach(function (p) {
          var opt = el('option', null, p.label + ' — ' + truncate(p.heading, 40));
          opt.value = p.id;
          group.appendChild(opt);
        });
      if (group.children.length) { apiProvision.appendChild(group); }
    });
    apiProvision.value = 'cth-privacy-act-1988-s-26wk';
  }());

  function setFieldEnabled(wrapperId, control, enabled) {
    control.disabled = !enabled;
    $(wrapperId).classList.toggle('is-disabled', !enabled);
  }

  function syncApiFields() {
    var isImpacts = apiEndpoint.value === 'impacts';
    setFieldEnabled('field-jurisdiction', apiJurisdiction, isImpacts);
    setFieldEnabled('field-since', apiSince, isImpacts);
    setFieldEnabled('field-severity', apiSeverity, isImpacts);
    setFieldEnabled('field-provision', apiProvision, !isImpacts);
  }

  function buildImpactsResponse() {
    var minRank = severityRank(apiSeverity.value);
    var rows = D.AMENDMENTS.filter(function (a) {
      if (apiJurisdiction.value && a.jurisdiction !== apiJurisdiction.value) { return false; }
      if (a.commencement < apiSince.value) { return false; }
      return severityRank(a.severity) >= minRank;
    }).sort(function (a, b) { return a.commencement < b.commencement ? 1 : -1; });

    var page = rows.slice(0, 3);
    var query = ['since=' + apiSince.value, 'min_severity=' + apiSeverity.value.toLowerCase()];
    if (apiJurisdiction.value) { query.unshift('jurisdiction=' + apiJurisdiction.value); }

    return {
      requestLine: 'GET /v1/impacts?' + query.join('&'),
      body: {
        object: 'list',
        generated_at: D.TODAY + 'T09:12:44+10:00',
        query: {
          jurisdiction: apiJurisdiction.value || null,
          since: apiSince.value,
          min_severity: apiSeverity.value.toLowerCase()
        },
        count: rows.length,
        returned: page.length,
        has_more: rows.length > page.length,
        data: page.map(function (a) {
          return {
            id: a.id,
            instrument: a.instrument,
            jurisdiction: a.jurisdiction,
            severity: a.severity.toLowerCase(),
            commencement: a.commencement,
            practice_areas: a.practiceAreas,
            affected_clause_patterns: a.clausePatternCount,
            affected_document_types: a.docTypeCount,
            affected_template_families: a.templateFamilies,
            provisions: a.provisions.map(function (p) {
              return { id: p.id, cite: p.cite, clause_patterns: p.clausePatterns.length };
            })
          };
        })
      }
    };
  }

  function buildDocumentsResponse() {
    var provision = D.PROVISIONS.filter(function (p) { return p.id === apiProvision.value; })[0] || D.PROVISIONS[0];
    var byDoc = {};
    provision.clausePatterns.forEach(function (c) {
      c.docTypes.forEach(function (dt) {
        if (!byDoc[dt]) { byDoc[dt] = { clausePatterns: 0, families: 0, names: [] }; }
        byDoc[dt].clausePatterns += 1;
        byDoc[dt].families += c.templateFamilies;
        byDoc[dt].names.push(c.name);
      });
    });
    var docs = D.DOC_TYPES.filter(function (dt) { return byDoc[dt]; }).map(function (dt) {
      return {
        document_type: dt,
        clause_patterns: byDoc[dt].clausePatterns,
        template_families: byDoc[dt].families,
        patterns: byDoc[dt].names
      };
    }).sort(function (a, b) { return b.clause_patterns - a.clause_patterns; });

    return {
      requestLine: 'GET /v1/provisions/' + provision.id + '/documents',
      body: {
        object: 'provision_impact',
        generated_at: D.TODAY + 'T09:12:44+10:00',
        provision: {
          id: provision.id,
          cite: provision.cite,
          heading: provision.heading,
          instrument: provision.instrument,
          jurisdiction: provision.jurisdiction,
          severity: provision.severity.toLowerCase(),
          amendment_id: provision.amendmentId
        },
        totals: {
          document_types: docs.length,
          clause_patterns: provision.clausePatterns.length,
          template_families: provision.clausePatterns.reduce(function (s, c) { return s + c.templateFamilies; }, 0)
        },
        data: docs
      }
    };
  }

  function jsonSpan(cls, text) { return el('span', cls, text); }

  function appendJson(frag, value, indent) {
    var pad = '  '.repeat(indent);
    var pad2 = '  '.repeat(indent + 1);
    if (value === null) { frag.appendChild(jsonSpan('j-null', 'null')); return; }
    if (Array.isArray(value)) {
      if (!value.length) { frag.appendChild(jsonSpan('j-punc', '[]')); return; }
      frag.appendChild(jsonSpan('j-punc', '['));
      value.forEach(function (v, i) {
        frag.appendChild(document.createTextNode('\n' + pad2));
        appendJson(frag, v, indent + 1);
        if (i < value.length - 1) { frag.appendChild(jsonSpan('j-punc', ',')); }
      });
      frag.appendChild(document.createTextNode('\n' + pad));
      frag.appendChild(jsonSpan('j-punc', ']'));
      return;
    }
    if (typeof value === 'object') {
      var keys = Object.keys(value);
      if (!keys.length) { frag.appendChild(jsonSpan('j-punc', '{}')); return; }
      frag.appendChild(jsonSpan('j-punc', '{'));
      keys.forEach(function (k, i) {
        frag.appendChild(document.createTextNode('\n' + pad2));
        frag.appendChild(jsonSpan('j-key', JSON.stringify(k)));
        frag.appendChild(jsonSpan('j-punc', ': '));
        appendJson(frag, value[k], indent + 1);
        if (i < keys.length - 1) { frag.appendChild(jsonSpan('j-punc', ',')); }
      });
      frag.appendChild(document.createTextNode('\n' + pad));
      frag.appendChild(jsonSpan('j-punc', '}'));
      return;
    }
    if (typeof value === 'number') { frag.appendChild(jsonSpan('j-num', String(value))); return; }
    if (typeof value === 'boolean') { frag.appendChild(jsonSpan('j-bool', String(value))); return; }
    frag.appendChild(jsonSpan('j-str', JSON.stringify(value)));
  }

  function runRequest() {
    var result = apiEndpoint.value === 'impacts' ? buildImpactsResponse() : buildDocumentsResponse();
    $('api-request-line').textContent = result.requestLine;

    var empty = result.body.data && result.body.data.length === 0;
    var status = $('api-status');
    status.textContent = empty ? '200 OK · empty set' : '200 OK';

    var pre = $('api-json');
    clear(pre);
    var frag = document.createDocumentFragment();
    appendJson(frag, result.body, 0);
    pre.appendChild(frag);
  }

  apiEndpoint.addEventListener('change', function () { syncApiFields(); runRequest(); });
  [apiJurisdiction, apiSince, apiSeverity, apiProvision].forEach(function (control) {
    control.addEventListener('change', runRequest);
  });
  $('api-run').addEventListener('click', runRequest);

  /* ============================== Pricing ============================== */

  function renderPricing() {
    var grid = $('pricing-grid');
    clear(grid);
    D.PRICING.forEach(function (tier) {
      var card = el('div', 'tier' + (tier.primary ? ' is-primary' : ''));
      card.appendChild(el('span', 'tier-flag' + (tier.primary ? '' : ' is-quiet'), tier.role));
      card.appendChild(el('h3', 'tier-name', tier.name));

      var price = el('div', 'tier-price');
      price.appendChild(el('span', 'tier-amount', tier.price));
      price.appendChild(el('span', 'tier-unit', tier.unit));
      card.appendChild(price);

      card.appendChild(el('p', 'tier-calls', tier.callPrice));

      var ul = el('ul', 'tier-features');
      tier.features.forEach(function (f) {
        var li = el('li');
        li.appendChild(el('span', 'tick', '✓'));
        li.appendChild(el('span', null, f));
        ul.appendChild(li);
      });
      card.appendChild(ul);
      grid.appendChild(card);
    });
  }

  /* ============================== Boot ============================== */

  initTheme();
  renderFeed();
  renderAllCharts();
  syncApiFields();
  runRequest();
  renderPricing();
  showTab(tabFromHash(), false);

  window.addEventListener('scroll', hideTip, { passive: true });
}());
