/* ClientDrill — application logic.
   Vanilla JS, no build step, no network. Everything is derived from data.js so
   the tables, the charts and the totals can never disagree with each other. */
(function () {
  'use strict';

  var D = window.DATA;

  /* =================================================== small utilities */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined && txt !== null) n.textContent = String(txt);
    return n;
  }

  var SVG_NS = 'http://www.w3.org/2000/svg'; /* SVG namespace id, not a network fetch */

  function svg(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }

  function svgText(x, y, str, cls, anchor, styleFill) {
    var t = svg('text', { x: x, y: y, 'text-anchor': anchor || 'start' });
    if (cls) t.setAttribute('class', cls);
    if (styleFill) t.setAttribute('style', 'fill:' + styleFill);
    t.textContent = str;
    return t;
  }

  var NUM = new Intl.NumberFormat('en-AU');
  function n(v) { return NUM.format(v); }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso) {
    var p = String(iso).split('-');
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  function sum(arr) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i];
    return t;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* ============================================ derived data (single source) */

  var CLIENT_BY_ID = {}, SCEN_BY_ID = {}, AREA_LABEL = {};
  D.CLIENTS.forEach(function (c) { CLIENT_BY_ID[c.id] = c; });
  D.SCENARIOS.forEach(function (s) { SCEN_BY_ID[s.id] = s; });
  D.RISK_AREAS.forEach(function (a) { AREA_LABEL[a.id] = a.label; });

  /* Every campaign number the UI shows is computed here from invitees /
     completed / stepFails, so the table, the chart and the heatmap agree. */
  var CAMPAIGNS = D.CAMPAIGNS.map(function (c) {
    var scen = SCEN_BY_ID[c.scenario];
    var fails = D.STEP_FAILS[c.id] || [0, 0, 0, 0, 0];
    var totalFails = sum(fails);
    var steps = scen.steps.map(function (st, i) {
      return {
        name: st.name,
        short: st.short,
        fails: fails[i],
        rate: c.completed ? (fails[i] / c.completed) * 100 : 0
      };
    });

    var weakest = null;
    if (c.completed > 0) {
      weakest = steps[0];
      for (var i = 1; i < steps.length; i++) {
        if (steps[i].fails > weakest.fails) weakest = steps[i];
      }
      if (weakest.fails === 0) weakest = null;
    }

    return {
      id: c.id,
      name: c.name,
      scenarioId: c.scenario,
      scenario: scen.label,
      area: scen.area,
      areaLabel: AREA_LABEL[scen.area],
      owner: scen.owner,
      ownerRole: scen.ownerRole,
      clientId: c.clientId,
      client: CLIENT_BY_ID[c.clientId].name,
      clientShort: CLIENT_BY_ID[c.clientId].short,
      invitees: c.invitees,
      completed: c.completed,
      completion: c.invitees ? (c.completed / c.invitees) * 100 : 0,
      status: c.status,
      sent: c.sent,
      bdAction: c.bdAction,
      steps: steps,
      totalFails: totalFails,
      /* score = share of drill steps passed across the completed cohort */
      avgScore: c.completed ? 100 - (totalFails / (c.completed * 5)) * 100 : null,
      weakest: weakest
    };
  });

  var CAMP_BY_ID = {};
  CAMPAIGNS.forEach(function (c) { CAMP_BY_ID[c.id] = c; });

  /* Per-invitee results, derived deterministically from stepFails so the
     roster's average score is exactly the campaign's avg score. For step s the
     failing rows are those where (i + s*3) mod completed < fails[s] — a
     rotation, so the count per step is exact and failures spread across people. */
  function roster(c) {
    var client = CLIENT_BY_ID[c.clientId];
    var pool = D.PEOPLE, len = pool.length, out = [];
    for (var i = 0; i < c.invitees; i++) {
      var p = pool[(client.rosterStart + i) % len];
      var row = { name: p.name, role: p.role };
      if (i < c.completed) {
        var failed = [];
        for (var s = 0; s < c.steps.length; s++) {
          if (((i + s * 3) % c.completed) < c.steps[s].fails) failed.push(c.steps[s].short);
        }
        row.status = 'Completed';
        row.score = (c.steps.length - failed.length) * (100 / c.steps.length);
        row.failed = failed;
      } else {
        row.status = ((i - c.completed) % 3 === 0) ? 'Started' : 'Not started';
        row.score = null;
        row.failed = [];
      }
      out.push(row);
    }
    return out;
  }

  /* Heatmap matrix: completed drills per client x risk area, summed from the
     same campaign records the Campaigns table renders. */
  var MATRIX = {}, ROW_TOTAL = {}, COL_TOTAL = {}, GRAND_TOTAL = 0, MAX_CELL = 0;
  D.CLIENTS.forEach(function (cl) {
    MATRIX[cl.id] = {};
    ROW_TOTAL[cl.id] = 0;
    D.RISK_AREAS.forEach(function (a) { MATRIX[cl.id][a.id] = 0; });
  });
  D.RISK_AREAS.forEach(function (a) { COL_TOTAL[a.id] = 0; });
  CAMPAIGNS.forEach(function (c) {
    MATRIX[c.clientId][c.area] += c.completed;
    ROW_TOTAL[c.clientId] += c.completed;
    COL_TOTAL[c.area] += c.completed;
    GRAND_TOTAL += c.completed;
  });
  D.CLIENTS.forEach(function (cl) {
    D.RISK_AREAS.forEach(function (a) {
      if (MATRIX[cl.id][a.id] > MAX_CELL) MAX_CELL = MATRIX[cl.id][a.id];
    });
  });

  /* Sequential bins. Colour and the printed number both carry the value, so
     the encoding is never colour-alone. */
  var BINS = [
    { max: 0,        label: '0' },
    { max: 5,        label: '1–5' },
    { max: 10,       label: '6–10' },
    { max: 15,       label: '11–15' },
    { max: 20,       label: '16–20' },
    { max: Infinity, label: '21+' }
  ];
  function binOf(v) {
    for (var i = 0; i < BINS.length; i++) { if (v <= BINS[i].max) return i; }
    return BINS.length - 1;
  }

  /* ==================================================================== theme */

  var root = document.documentElement;
  var themeLabel = $('#theme-label');
  var themeListeners = [];

  function store(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { /* file:// or blocked */ }
  }
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function currentTheme() {
    var stamped = root.getAttribute('data-theme');
    if (stamped) return stamped;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    themeLabel.textContent = mode === 'dark' ? 'Light' : 'Dark';
    $('#theme-toggle').setAttribute('aria-label', 'Switch to ' + (mode === 'dark' ? 'light' : 'dark') + ' theme');
    themeListeners.forEach(function (fn) { fn(mode); });
  }

  (function initTheme() {
    var saved = read('clientdrill-theme');
    applyTheme(saved === 'dark' || saved === 'light' ? saved : currentTheme());
  })();

  $('#theme-toggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store('clientdrill-theme', next);
  });

  /* ================================================================= tooltip */

  var tipNode = $('#tooltip');

  function showTip(x, y, value, label) {
    clear(tipNode);
    tipNode.appendChild(el('span', 'tt-value', value));
    if (label) tipNode.appendChild(el('span', 'tt-label', label));
    tipNode.hidden = false;
    var r = tipNode.getBoundingClientRect();
    var left = Math.min(Math.max(8, x - r.width / 2), window.innerWidth - r.width - 8);
    var top = y - r.height - 12;
    if (top < 8) top = y + 20;
    tipNode.style.left = left + 'px';
    tipNode.style.top = top + 'px';
  }
  function hideTip() { tipNode.hidden = true; }
  window.addEventListener('scroll', hideTip, true);

  /* ============================================================ dialog plumbing */

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var openDialogNode = null, opener = null, onDialogClose = null;

  function focusables(node) {
    return $$(FOCUSABLE, node).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
  }

  function openDialog(node, from, closeFn) {
    openDialogNode = node;
    opener = from || null;
    onDialogClose = closeFn || null;
    node.hidden = false;
    /* if the caller already parked focus somewhere sensible inside, leave it */
    if (node.contains(document.activeElement)) return;
    var f = focusables(node);
    if (f.length) f[0].focus();
    else node.focus();
  }

  function closeDialog() {
    if (!openDialogNode) return;
    var node = openDialogNode, back = opener, fn = onDialogClose;
    openDialogNode = null; opener = null; onDialogClose = null;
    node.hidden = true;
    hideTip();
    if (fn) fn();
    if (back && document.contains(back)) back.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (!openDialogNode) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(openDialogNode);
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !openDialogNode.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* ==================================================================== tabs */

  var TABS = ['campaigns', 'builder', 'signals', 'about'];
  var tabEls = $$('.tab');

  function selectTab(name, pushHash) {
    if (TABS.indexOf(name) === -1) name = TABS[0];
    tabEls.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $('#panel-' + t.getAttribute('data-tab')).hidden = !on;
    });
    if (pushHash && window.location.hash !== '#' + name) {
      window.location.hash = name;
    }
  }

  tabEls.forEach(function (t, idx) {
    t.addEventListener('click', function () { selectTab(t.getAttribute('data-tab'), true); });
    t.addEventListener('keydown', function (e) {
      var delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      var next = tabEls[(idx + delta + tabEls.length) % tabEls.length];
      next.focus();
      selectTab(next.getAttribute('data-tab'), true);
    });
  });

  window.addEventListener('hashchange', function () {
    selectTab(window.location.hash.replace('#', ''), false);
  });

  /* ================================================================== sorting */

  function makeSorter(tableEl, accessors, onSort) {
    var state = { key: null, dir: 1 };
    $$('thead th', tableEl).forEach(function (th) {
      var key = th.getAttribute('data-key');
      var btn = $('button', th);
      if (!key || !btn) return;
      btn.addEventListener('click', function () {
        if (state.key === key) state.dir = -state.dir;
        else { state.key = key; state.dir = 1; }
        $$('thead th', tableEl).forEach(function (o) { o.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
        onSort();
      });
    });
    return {
      apply: function (rows) {
        if (!state.key) return rows;
        var get = accessors[state.key];
        return rows.slice().sort(function (a, b) {
          var va = get(a), vb = get(b);
          if (va === null || va === undefined) va = -Infinity;
          if (vb === null || vb === undefined) vb = -Infinity;
          if (typeof va === 'string' || typeof vb === 'string') {
            return String(va).localeCompare(String(vb), 'en-AU') * state.dir;
          }
          return (va - vb) * state.dir;
        });
      }
    };
  }

  /* ============================================================== CAMPAIGNS */

  var campBody = $('#camp-body');
  var campEmpty = $('#camp-empty');
  var campReset = $('#camp-reset');
  var fScenario = $('#f-scenario');
  var fStatus = $('#f-status');
  var fClient = $('#f-client');
  var fSearch = $('#f-search');

  D.SCENARIOS.forEach(function (s) {
    fScenario.appendChild(new Option(s.label, s.id));
  });
  D.CLIENTS.forEach(function (c) {
    fClient.appendChild(new Option(c.name, c.id));
    $('#f-sig-client').appendChild(new Option(c.name, c.id));
  });

  var campSorter = makeSorter($('#camp-table'), {
    name: function (c) { return c.name; },
    scenario: function (c) { return c.scenario; },
    client: function (c) { return c.client; },
    invitees: function (c) { return c.invitees; },
    completion: function (c) { return c.completion; },
    score: function (c) { return c.avgScore; },
    weakest: function (c) { return c.weakest ? c.weakest.short : ''; },
    status: function (c) { return c.status; }
  }, function () { renderCampaigns(); });

  function campFilters() {
    return {
      scenario: fScenario.value,
      status: fStatus.value,
      client: fClient.value,
      q: fSearch.value.trim().toLowerCase()
    };
  }

  function campFiltered() {
    var f = campFilters();
    return CAMPAIGNS.filter(function (c) {
      if (f.scenario && c.scenarioId !== f.scenario) return false;
      if (f.status && c.status !== f.status) return false;
      if (f.client && c.clientId !== f.client) return false;
      if (f.q) {
        var hay = (c.name + ' ' + c.client + ' ' + c.scenario + ' ' + c.id).toLowerCase();
        if (hay.indexOf(f.q) === -1) return false;
      }
      return true;
    });
  }

  function statTile(label, value, note) {
    var s = el('div', 'stat');
    s.appendChild(el('div', 'stat-label', label));
    s.appendChild(el('div', 'stat-value', value));
    s.appendChild(el('div', 'stat-note', note));
    return s;
  }

  function renderCampStats(rows) {
    var host = $('#camp-stats');
    clear(host);
    var invitees = 0, completed = 0, fails = 0, steps = 0;
    rows.forEach(function (c) {
      invitees += c.invitees;
      completed += c.completed;
      fails += c.totalFails;
      steps += c.completed * c.steps.length;
    });
    var score = steps ? Math.round(100 - (fails / steps) * 100) : 0;
    var live = rows.filter(function (c) { return c.status === 'Live'; }).length;

    host.appendChild(statTile('Campaigns', n(rows.length), live + ' live right now'));
    host.appendChild(statTile('Invitees', n(invitees), 'across ' + new Set(rows.map(function (c) { return c.clientId; })).size + ' client teams'));
    host.appendChild(statTile('Drills completed', n(completed), invitees ? Math.round(completed / invitees * 100) + '% of invitees' : 'none yet'));
    host.appendChild(statTile('Avg score', steps ? score + '%' : '—', 'share of drill steps passed'));
  }

  function badge(kind, label) {
    return el('span', 'badge badge-' + kind, label);
  }

  function meterCell(pct) {
    var wrap = el('div', 'meter');
    wrap.appendChild(el('span', null, Math.round(pct) + '%'));
    var track = el('span', 'meter-track');
    var fill = el('span', 'meter-fill');
    fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  }

  function renderCampaigns() {
    var rows = campSorter.apply(campFiltered());
    var f = campFilters();
    var active = !!(f.scenario || f.status || f.client || f.q);
    campReset.hidden = !active;

    renderCampStats(rows);
    clear(campBody);
    campEmpty.hidden = rows.length > 0;

    rows.forEach(function (c) {
      var tr = el('tr');
      tr.tabIndex = 0;
      tr.setAttribute('data-id', c.id);

      var tdName = el('td');
      tdName.appendChild(el('span', 'cell-primary', c.name));
      tdName.appendChild(el('span', 'cell-sub', c.id + ' · sent ' + fmtDate(c.sent)));
      tr.appendChild(tdName);

      tr.appendChild(el('td', null, c.scenario));

      var tdClient = el('td');
      tdClient.appendChild(el('span', null, c.client));
      tdClient.appendChild(el('span', 'cell-sub', CLIENT_BY_ID[c.clientId].industry + ' · ' + CLIENT_BY_ID[c.clientId].state));
      tr.appendChild(tdClient);

      tr.appendChild(el('td', 'num', n(c.invitees)));

      var tdComp = el('td', 'num');
      tdComp.appendChild(meterCell(c.completion));
      tdComp.appendChild(el('span', 'cell-sub', c.completed + ' of ' + c.invitees));
      tr.appendChild(tdComp);

      tr.appendChild(el('td', 'num', c.avgScore === null ? '—' : Math.round(c.avgScore) + '%'));
      tr.appendChild(el('td', null, c.weakest ? c.weakest.short : '—'));

      var tdStatus = el('td');
      tdStatus.appendChild(badge(c.status.toLowerCase(), c.status));
      tr.appendChild(tdStatus);

      tr.addEventListener('click', function () { openCampaign(c, tr); });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCampaign(c, tr); }
      });

      campBody.appendChild(tr);
    });
  }

  [fScenario, fStatus, fClient].forEach(function (s) { s.addEventListener('change', renderCampaigns); });
  fSearch.addEventListener('input', renderCampaigns);

  function resetCampFilters() {
    fScenario.value = ''; fStatus.value = ''; fClient.value = ''; fSearch.value = '';
    renderCampaigns();
  }
  campReset.addEventListener('click', resetCampFilters);

  /* ------------------------------------- step-failure bar chart (detail panel) */

  function roundedBar(x, y, w, h, r) {
    if (w <= 0) return '';
    var rr = Math.min(r, w, h / 2);
    return 'M' + x + ' ' + y +
      ' H' + (x + w - rr) +
      ' A' + rr + ' ' + rr + ' 0 0 1 ' + (x + w) + ' ' + (y + rr) +
      ' V' + (y + h - rr) +
      ' A' + rr + ' ' + rr + ' 0 0 1 ' + (x + w - rr) + ' ' + (y + h) +
      ' H' + x + ' Z';
  }

  function stepChart(c) {
    var W = 560, PITCH = 34, BAR_H = 16, TOP = 8;
    var X0 = 196, PLOT = 244;
    var lastBottom = TOP + (c.steps.length - 1) * PITCH + BAR_H;
    var H = lastBottom + 8;

    var s = svg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Step failure rate for ' + c.name + '. Weakest step: ' +
        (c.weakest ? c.weakest.short + ', ' + c.weakest.fails + ' of ' + c.completed + ' failed.' : 'none.')
    });

    /* single solid hairline baseline — no gridlines, values are direct-labelled */
    s.appendChild(svg('line', {
      x1: X0, y1: TOP - 4, x2: X0, y2: lastBottom + 4,
      style: 'stroke:var(--chart-axis);stroke-width:1'
    }));

    c.steps.forEach(function (st, i) {
      var top = TOP + i * PITCH;
      var mid = top + BAR_H / 2 + 4;
      var w = (st.rate / 100) * PLOT;
      var isWeak = c.weakest && c.weakest.short === st.short;

      var g = svg('g', { class: 'bar-row' });

      g.appendChild(svgText(X0 - 10, mid, st.short, 'bar-label', 'end'));

      if (w > 0.5) {
        g.appendChild(svg('path', {
          class: 'bar-mark',
          d: roundedBar(X0, top, w, BAR_H, 4),
          style: 'fill:' + (isWeak ? 'var(--chart-emph)' : 'var(--chart-base)')
        }));
      }

      var label = st.fails + ' of ' + c.completed + ' · ' + Math.round(st.rate) + '%';
      g.appendChild(svgText(X0 + PLOT + 8, mid, label, 'bar-value' + (isWeak ? ' is-emph' : ''), 'start'));

      /* hit area is taller than the 16px bar so the pointer never has to be precise */
      var hit = svg('rect', { class: 'bar-hit', x: X0 - 190, y: top - 5, width: W - (X0 - 190), height: BAR_H + 10 });
      hit.addEventListener('pointermove', function (e) {
        showTip(e.clientX, e.clientY, st.fails + ' of ' + c.completed + ' failed',
          st.name + ' · ' + Math.round(st.rate) + '% of the completed cohort');
      });
      hit.addEventListener('pointerleave', hideTip);
      g.appendChild(hit);

      s.appendChild(g);
    });

    return s;
  }

  /* ------------------------------------------------------- campaign detail */

  var detail = $('#detail');
  var overlay = $('#overlay');

  function closeSlideover() { overlay.hidden = true; markSelectedRow(null); }

  function markSelectedRow(id) {
    $$('#camp-body tr, #sig-body tr').forEach(function (tr) {
      if (id && tr.getAttribute('data-id') === id) tr.setAttribute('data-selected', 'true');
      else tr.removeAttribute('data-selected');
    });
  }

  function metaList(pairs) {
    var dl = el('dl', 'detail-meta');
    pairs.forEach(function (p) {
      var d = el('div');
      d.appendChild(el('dt', null, p[0]));
      d.appendChild(el('dd', null, p[1]));
      dl.appendChild(d);
    });
    return dl;
  }

  function openCampaign(c, fromRow) {
    var body = $('#detail-body');
    clear(body);

    $('#detail-kicker').textContent = c.id + ' · ' + c.scenario;
    $('#detail-title').textContent = c.name;

    body.appendChild(metaList([
      ['Client', c.client],
      ['Status', c.status],
      ['Sent', fmtDate(c.sent)],
      ['Firm owner', c.owner],
      ['Invitees', n(c.invitees)],
      ['Completed', n(c.completed) + ' (' + Math.round(c.completion) + '%)'],
      ['Avg score', c.avgScore === null ? '—' : Math.round(c.avgScore) + '%'],
      ['Risk area', c.areaLabel]
    ]));

    if (c.completed === 0) {
      body.appendChild(el('p', 'section-sub', 'This campaign has not been sent yet, so there are no results and no signal.'));
    } else {
      body.appendChild(el('h3', 'section-title', 'Step failure rate'));
      body.appendChild(el('p', 'section-sub', 'Share of the ' + c.completed + ' completed drills that failed each step. The highlighted bar is the weakest step.'));
      var chartWrap = el('div', 'mini-chart-scroll');
      chartWrap.appendChild(stepChart(c));
      body.appendChild(chartWrap);

      body.appendChild(el('h3', 'section-title', 'Generated BD signal'));
      var call = el('div', 'signal-callout');
      call.appendChild(el('h4', null, 'Suggested next step'));
      call.appendChild(el('p', null,
        c.weakest.fails + ' of ' + c.completed + ' failed the ' + c.weakest.name.toLowerCase() +
        ' step → ' + c.bdAction));
      call.appendChild(el('p', null, 'Owner: ' + c.owner + ', ' + c.ownerRole + '.'));
      var line = el('div', 'cta-line');
      var b1 = el('button', 'btn btn-small btn-primary', 'Draft the partner email');
      var b2 = el('button', 'btn btn-small', 'Snooze 30 days');
      var done = el('p', 'section-sub');
      b1.addEventListener('click', function () { done.textContent = 'Draft queued for ' + c.owner + ' — it will appear in the partner’s outbox for review.'; });
      b2.addEventListener('click', function () { done.textContent = 'Snoozed. This signal will resurface on 12 September 2026.'; });
      line.appendChild(b1); line.appendChild(b2);
      call.appendChild(line);
      call.appendChild(done);
      body.appendChild(call);
    }

    body.appendChild(el('h3', 'section-title', 'Invitee completion'));
    body.appendChild(el('p', 'section-sub', 'Scores are the share of the ' + c.steps.length + ' steps passed. The completed scores average exactly the campaign score above.'));

    var scroll = el('div', 'mini-scroll');
    var tbl = el('table', 'data-table compact');
    var thead = el('thead');
    var htr = el('tr');
    ['Invitee', 'Role', 'Status', 'Score'].forEach(function (h, i) {
      var th = el('th', i === 3 ? 'plain num' : 'plain', h);
      th.scope = 'col';
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    tbl.appendChild(thead);

    var tbody = el('tbody');
    roster(c).forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', null, r.name));
      tr.appendChild(el('td', null, r.role));
      var st = el('td');
      st.appendChild(el('span', 'cell-primary', r.status));
      if (r.failed.length) st.appendChild(el('span', 'cell-sub', 'missed: ' + r.failed.join(', ')));
      tr.appendChild(st);
      tr.appendChild(el('td', 'num', r.score === null ? '—' : Math.round(r.score) + '%'));
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    scroll.appendChild(tbl);
    body.appendChild(scroll);

    overlay.hidden = false;
    markSelectedRow(c.id);
    openDialog(detail, fromRow, closeSlideover);
  }

  /* --------------------------------------------------------- signal detail */

  function openSignal(sig, fromRow) {
    var body = $('#detail-body');
    clear(body);
    var camp = CAMP_BY_ID[sig.campaignId];

    $('#detail-kicker').textContent = sig.id + ' · ' + AREA_LABEL[sig.area];
    $('#detail-title').textContent = sig.signal;

    body.appendChild(metaList([
      ['Client', CLIENT_BY_ID[sig.clientId].name],
      ['Priority', sig.priority],
      ['Owner', sig.owner],
      ['Raised', fmtDate(sig.date)],
      ['From campaign', camp ? camp.name : '—'],
      ['Scenario', camp ? camp.scenario : '—']
    ]));

    body.appendChild(el('h3', 'section-title', 'Inferred concern'));
    body.appendChild(el('p', null, sig.concern));

    body.appendChild(el('h3', 'section-title', 'Suggested action'));
    var call = el('div', 'signal-callout');
    call.appendChild(el('h4', null, sig.priority + ' priority'));
    call.appendChild(el('p', null, sig.action));
    var line = el('div', 'cta-line');
    var b1 = el('button', 'btn btn-small btn-primary', 'Assign to ' + sig.owner);
    var msg = el('p', 'section-sub');
    b1.addEventListener('click', function () { msg.textContent = 'Assigned. ' + sig.owner + ' will see this in the Monday BD list.'; });
    line.appendChild(b1);
    call.appendChild(line);
    call.appendChild(msg);
    body.appendChild(call);

    if (camp) {
      body.appendChild(el('h3', 'section-title', 'Where it came from'));
      body.appendChild(el('p', 'section-sub',
        camp.name + ' — ' + camp.completed + ' of ' + camp.invitees + ' completed, average score ' +
        (camp.avgScore === null ? '—' : Math.round(camp.avgScore) + '%') + '.'));
      var chartWrap = el('div', 'mini-chart-scroll');
      chartWrap.appendChild(stepChart(camp));
      body.appendChild(chartWrap);
    }

    overlay.hidden = false;
    markSelectedRow(sig.id);
    openDialog(detail, fromRow, closeSlideover);
  }

  $('#detail-close').addEventListener('click', closeDialog);
  overlay.addEventListener('click', closeDialog);

  /* ================================================================ HEATMAP */

  var hmSelection = null; /* { clientId, area } */

  function renderHeatmap() {
    var host = $('#heatmap');
    clear(host);

    var LABEL_W = 215, X0 = 220, PITCH = 128, CELL_W = 124, ROW_H = 32, ROW_PITCH = 36;
    var TOP = 46, TOTAL_X = 950, W = 960;
    var rows = D.CLIENTS.length;
    var totalsY = TOP + rows * ROW_PITCH + 8;
    var H = totalsY + 34;

    var s = svg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Heatmap of completed drills for ' + rows + ' clients across ' +
        D.RISK_AREAS.length + ' risk areas. ' + GRAND_TOTAL + ' completed drills in total. ' +
        'The same figures are available in the table view.'
    });

    s.appendChild(svgText(0, 30, 'Client', 'hm-label-strong', 'start'));
    D.RISK_AREAS.forEach(function (a, ci) {
      s.appendChild(svgText(X0 + ci * PITCH + CELL_W / 2 + 2, 30, a.label, 'hm-label-strong', 'middle'));
    });
    s.appendChild(svgText(TOTAL_X, 30, 'Total', 'hm-label-strong', 'end'));

    D.CLIENTS.forEach(function (cl, ri) {
      var y = TOP + ri * ROW_PITCH;
      s.appendChild(svgText(LABEL_W - 10, y + 20, cl.short, 'hm-label', 'end'));

      D.RISK_AREAS.forEach(function (a, ci) {
        var v = MATRIX[cl.id][a.id];
        var b = binOf(v);
        var x = X0 + ci * PITCH + 2;
        var selected = hmSelection && hmSelection.clientId === cl.id && hmSelection.area === a.id;

        var g = svg('g', {
          class: 'hm-cell' + (selected ? ' is-selected' : ''),
          tabindex: '0',
          role: 'button',
          'data-cell': cl.id + '|' + a.id,
          'aria-pressed': selected ? 'true' : 'false',
          'aria-label': cl.name + ', ' + a.label + ': ' + v + ' completed drills. Select to filter the signal table.'
        });

        g.appendChild(svg('rect', {
          class: 'hm-fill', x: x, y: y, width: CELL_W, height: ROW_H, rx: 4,
          style: 'fill:var(--hm-' + b + ')'
        }));
        g.appendChild(svg('rect', {
          class: 'hm-focus', x: x - 2, y: y - 2, width: CELL_W + 4, height: ROW_H + 4, rx: 6,
          style: 'fill:none;stroke:var(--text);stroke-width:2'
        }));
        g.appendChild(svgText(x + CELL_W / 2, y + 20, String(v), 'hm-value', 'middle', 'var(--hm-t' + b + ')'));

        function tip(cx, cy) {
          showTip(cx, cy, v + (v === 1 ? ' completed drill' : ' completed drills'), cl.name + ' · ' + a.label);
        }
        g.addEventListener('pointermove', function (e) { tip(e.clientX, e.clientY); });
        g.addEventListener('pointerleave', hideTip);
        g.addEventListener('focus', function () {
          var r = g.getBoundingClientRect();
          tip(r.left + r.width / 2, r.top);
        });
        g.addEventListener('blur', hideTip);
        g.addEventListener('click', function () { toggleCell(cl.id, a.id); });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCell(cl.id, a.id); }
        });

        s.appendChild(g);
      });

      s.appendChild(svgText(TOTAL_X, y + 20, String(ROW_TOTAL[cl.id]), 'hm-total', 'end'));
    });

    s.appendChild(svg('line', {
      x1: 0, y1: totalsY - 6, x2: W, y2: totalsY - 6,
      style: 'stroke:var(--chart-grid);stroke-width:1'
    }));
    s.appendChild(svgText(LABEL_W - 10, totalsY + 16, 'Total', 'hm-label-strong', 'end'));
    D.RISK_AREAS.forEach(function (a, ci) {
      s.appendChild(svgText(X0 + ci * PITCH + CELL_W / 2 + 2, totalsY + 16, String(COL_TOTAL[a.id]), 'hm-total', 'middle'));
    });
    s.appendChild(svgText(TOTAL_X, totalsY + 16, String(GRAND_TOTAL), 'hm-total', 'end'));

    host.appendChild(s);
  }

  function renderHeatLegend() {
    var host = $('#hm-legend');
    clear(host);
    host.appendChild(el('span', 'scale-caption', 'Completed drills (0–' + MAX_CELL + ')'));
    BINS.forEach(function (b, i) {
      var item = el('span', 'scale-item');
      var sw = el('span', 'scale-swatch');
      sw.style.background = 'var(--hm-' + i + ')';
      item.appendChild(sw);
      item.appendChild(el('span', null, b.label));
      host.appendChild(item);
    });
  }

  function renderHeatTable() {
    var head = $('#hm-table-head'), body = $('#hm-table-body'), foot = $('#hm-table-foot');
    clear(head); clear(body); clear(foot);

    var htr = el('tr');
    var th0 = el('th', 'plain', 'Client'); th0.scope = 'col';
    htr.appendChild(th0);
    D.RISK_AREAS.forEach(function (a) {
      var th = el('th', 'plain num', a.label); th.scope = 'col';
      htr.appendChild(th);
    });
    var thT = el('th', 'plain num', 'Total'); thT.scope = 'col';
    htr.appendChild(thT);
    head.appendChild(htr);

    D.CLIENTS.forEach(function (cl) {
      var tr = el('tr');
      var th = el('th', null, cl.name); th.scope = 'row';
      tr.appendChild(th);
      D.RISK_AREAS.forEach(function (a) {
        tr.appendChild(el('td', 'num', String(MATRIX[cl.id][a.id])));
      });
      tr.appendChild(el('td', 'num', String(ROW_TOTAL[cl.id])));
      body.appendChild(tr);
    });

    var ftr = el('tr');
    var fth = el('th', null, 'Total'); fth.scope = 'row';
    ftr.appendChild(fth);
    D.RISK_AREAS.forEach(function (a) {
      ftr.appendChild(el('td', 'num', String(COL_TOTAL[a.id])));
    });
    ftr.appendChild(el('td', 'num', String(GRAND_TOTAL)));
    foot.appendChild(ftr);
  }

  $('#hm-table-toggle').addEventListener('click', function () {
    var t = $('#hm-table');
    var show = t.hidden;
    t.hidden = !show;
    this.setAttribute('aria-expanded', show ? 'true' : 'false');
    this.textContent = show ? 'Hide table' : 'Show as table';
  });

  function toggleCell(clientId, area) {
    if (hmSelection && hmSelection.clientId === clientId && hmSelection.area === area) hmSelection = null;
    else hmSelection = { clientId: clientId, area: area };
    var wasFocused = document.activeElement &&
      document.activeElement.getAttribute &&
      document.activeElement.getAttribute('data-cell') === clientId + '|' + area;
    renderHeatmap();
    renderSignals();
    /* the heatmap is rebuilt, so put focus back on the cell that was operated */
    if (wasFocused) {
      var again = $('[data-cell="' + clientId + '|' + area + '"]');
      if (again && again.focus) again.focus();
    }
  }

  /* ================================================================= SIGNALS */

  var sigBody = $('#sig-body');
  var sigEmpty = $('#sig-empty');
  var sigReset = $('#sig-reset');
  var fPriority = $('#f-priority');
  var fSigClient = $('#f-sig-client');
  var fSigSearch = $('#f-sig-search');

  var PRIO_RANK = { High: 3, Medium: 2, Low: 1 };

  var sigSorter = makeSorter($('#sig-table'), {
    client: function (s) { return CLIENT_BY_ID[s.clientId].name; },
    signal: function (s) { return s.signal; },
    area: function (s) { return AREA_LABEL[s.area]; },
    priority: function (s) { return PRIO_RANK[s.priority]; },
    owner: function (s) { return s.owner; },
    date: function (s) { return s.date; }
  }, function () { renderSignals(); });

  function sigFiltered() {
    var p = fPriority.value, cl = fSigClient.value, q = fSigSearch.value.trim().toLowerCase();
    return D.SIGNALS.filter(function (s) {
      if (p && s.priority !== p) return false;
      if (cl && s.clientId !== cl) return false;
      if (hmSelection && (s.clientId !== hmSelection.clientId || s.area !== hmSelection.area)) return false;
      if (q) {
        var hay = (s.signal + ' ' + s.concern + ' ' + s.action + ' ' + s.owner + ' ' +
          CLIENT_BY_ID[s.clientId].name + ' ' + AREA_LABEL[s.area]).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderSelectionChip() {
    var host = $('#hm-selection');
    clear(host);
    if (!hmSelection) { host.hidden = true; return; }
    host.hidden = false;
    host.appendChild(document.createTextNode('Heatmap cell: '));
    var strong = el('strong', null, CLIENT_BY_ID[hmSelection.clientId].name + ' · ' + AREA_LABEL[hmSelection.area]);
    host.appendChild(strong);
    host.appendChild(document.createTextNode(' (' + MATRIX[hmSelection.clientId][hmSelection.area] + ' completed drills) '));
    var clr = el('button', 'link-btn', 'Clear cell');
    clr.addEventListener('click', function () {
      hmSelection = null; renderHeatmap(); renderSignals();
    });
    host.appendChild(clr);
  }

  function renderSignals() {
    var rows = sigSorter.apply(sigFiltered());
    var active = !!(fPriority.value || fSigClient.value || fSigSearch.value.trim() || hmSelection);
    sigReset.hidden = !active;

    renderSelectionChip();
    clear(sigBody);
    sigEmpty.hidden = rows.length > 0;

    rows.forEach(function (s) {
      var tr = el('tr');
      tr.tabIndex = 0;
      tr.setAttribute('data-id', s.id);

      var tdClient = el('td');
      tdClient.appendChild(el('span', 'cell-primary', CLIENT_BY_ID[s.clientId].name));
      tdClient.appendChild(el('span', 'cell-sub', s.campaignId));
      tr.appendChild(tdClient);

      var tdSig = el('td');
      tdSig.appendChild(el('span', null, s.signal));
      tdSig.appendChild(el('span', 'cell-sub', s.concern));
      tr.appendChild(tdSig);

      tr.appendChild(el('td', null, AREA_LABEL[s.area]));

      var tdP = el('td');
      tdP.appendChild(badge(s.priority.toLowerCase(), s.priority));
      tr.appendChild(tdP);

      tr.appendChild(el('td', null, s.owner));
      tr.appendChild(el('td', null, fmtDate(s.date)));

      tr.addEventListener('click', function () { openSignal(s, tr); });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSignal(s, tr); }
      });

      sigBody.appendChild(tr);
    });
  }

  [fPriority, fSigClient].forEach(function (s) { s.addEventListener('change', renderSignals); });
  fSigSearch.addEventListener('input', renderSignals);

  function resetSigFilters() {
    fPriority.value = ''; fSigClient.value = ''; fSigSearch.value = '';
    hmSelection = null;
    renderHeatmap();
    renderSignals();
  }
  sigReset.addEventListener('click', resetSigFilters);

  $$('[data-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-reset') === 'camp') resetCampFilters();
      else resetSigFilters();
    });
  });

  /* =========================================================== DRILL BUILDER */

  var bScenario = $('#b-scenario'), bIndustry = $('#b-industry'), bDifficulty = $('#b-difficulty');
  var bFirm = $('#b-firm'), bClient = $('#b-client'), bCohort = $('#b-cohort');
  var bLeader = $('#b-leaderboard'), bCpd = $('#b-cpd'), bDebrief = $('#b-debrief');

  D.SCENARIOS.forEach(function (s) { bScenario.appendChild(new Option(s.label, s.id)); });
  D.INDUSTRIES.forEach(function (i) { bIndustry.appendChild(new Option(i, i)); });
  D.DIFFICULTIES.forEach(function (d) { bDifficulty.appendChild(new Option(d.label, d.id)); });
  D.CLIENTS.forEach(function (c) { bClient.appendChild(new Option(c.name, c.id)); });

  var brand = D.BRAND_COLOURS[0];

  (function buildSwatches() {
    var host = $('#b-swatches');
    D.BRAND_COLOURS.forEach(function (col) {
      var b = el('button', 'swatch');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', col.id === brand.id ? 'true' : 'false');
      b.setAttribute('data-colour', col.id);
      var dot = el('span', 'swatch-dot');
      dot.style.background = col.hex;
      b.appendChild(dot);
      b.appendChild(el('span', null, col.label));
      b.addEventListener('click', function () {
        brand = col;
        $$('.swatch', host).forEach(function (o) {
          o.setAttribute('aria-checked', o.getAttribute('data-colour') === col.id ? 'true' : 'false');
        });
        renderPreview();
      });
      host.appendChild(b);
    });
  })();

  var BLURB = {
    epa: 'Two authorised officers arrive unannounced with a warrant. Your team has one hour to get the first decisions right.',
    whs: 'A serious injury on site. Who secures the scene, who notifies the regulator, and what happens in the first interview.',
    cyber: 'Systems are encrypted and a threat actor is in the inbox. Contain it, assess it, and decide what has to be reported.',
    asic: 'A s.19 notice lands. Scope the production, protect privilege, and prepare the person being examined.',
    insolvency: 'Cash is tightening and a customer has failed. Directors face personal exposure — and a narrow safe harbour window.'
  };

  function currentBuild() {
    var scen = SCEN_BY_ID[bScenario.value];
    var diff = D.DIFFICULTIES.filter(function (d) { return d.id === bDifficulty.value; })[0] || D.DIFFICULTIES[1];
    return {
      scenario: scen,
      industry: bIndustry.value,
      difficulty: diff,
      firm: bFirm.value.trim() || 'Your firm',
      client: CLIENT_BY_ID[bClient.value],
      cohort: bCohort.value,
      leaderboard: bLeader.checked,
      cpd: bCpd.checked,
      debrief: bDebrief.checked,
      brand: brand
    };
  }

  function renderPreview() {
    var b = currentBuild();

    $('#preview-band').style.background = b.brand.hex;
    $('#preview-cta').style.background = b.brand.hex;
    $('#preview-firm').textContent = b.firm;
    $('#preview-eyebrow').textContent = AREA_LABEL[b.scenario.area] + ' · ' + b.industry;
    $('#preview-title').textContent = b.scenario.label;
    $('#preview-blurb').textContent = BLURB[b.scenario.id];
    $('#preview-client').textContent = b.client.name;
    $('#preview-cohort').textContent = b.cohort;
    $('#preview-difficulty').textContent = b.difficulty.label;
    $('#preview-time').textContent = b.difficulty.mins + ' min';
    $('#preview-foot').textContent = 'Provided to you by ' + b.firm +
      '. Nothing you enter is shared outside your organisation.';
    $('#b-difficulty-note').textContent = b.difficulty.note + ' · about ' + b.difficulty.mins + ' minutes.';

    var chips = $('#preview-chips');
    clear(chips);
    var on = [];
    if (b.leaderboard) on.push('Cohort leaderboard');
    if (b.cpd) on.push(D.DRILL.cpdPoints + ' CPD points');
    if (b.debrief) on.push('Debrief call with ' + b.firm);
    if (!on.length) on.push('No extras — drill only');
    on.forEach(function (t) { chips.appendChild(el('li', 'chip', t)); });
  }

  $$('#builder-form select, #builder-form input').forEach(function (ctl) {
    ctl.addEventListener('change', renderPreview);
    if (ctl.type === 'text') ctl.addEventListener('input', renderPreview);
  });

  /* nothing is ever posted anywhere — swallow implicit submission (Enter in a
     text field) so the page can never reload and lose state */
  $('#builder-form').addEventListener('submit', function (e) { e.preventDefault(); });

  function resetBuilder() {
    bScenario.value = D.SCENARIOS[0].id;
    bIndustry.value = D.INDUSTRIES[0];
    bDifficulty.value = 'standard';
    bFirm.value = D.FIRM.name;
    bClient.value = D.CLIENTS[0].id;
    bCohort.value = 'Executive team';
    bLeader.checked = true; bCpd.checked = true; bDebrief.checked = true;
    brand = D.BRAND_COLOURS[0];
    $$('#b-swatches .swatch').forEach(function (o) {
      o.setAttribute('aria-checked', o.getAttribute('data-colour') === brand.id ? 'true' : 'false');
    });
    renderPreview();
  }
  $('#b-reset').addEventListener('click', resetBuilder);

  /* ------------------------------------------------------- the drill player */

  var modal = $('#drill-modal');
  var drillBody = $('#drill-body');
  var drillProgress = $('#drill-progress');
  var player = { i: 0, answers: [], build: null };

  var VERDICT = [
    { min: 3, title: 'Clean run', blurb: 'Every decision held up. This is what the firm wants the first hour to look like.' },
    { min: 2, title: 'Mostly sound', blurb: 'One decision would have cost you. It is the kind of thing worth ten minutes with a partner.' },
    { min: 1, title: 'Exposed', blurb: 'Two of the three calls created avoidable exposure. Worth a proper debrief.' },
    { min: 0, title: 'Serious exposure', blurb: 'All three calls went the wrong way. This is exactly the conversation the drill exists to start.' }
  ];

  function renderProgress() {
    clear(drillProgress);
    D.DRILL.steps.forEach(function (_, i) {
      var pip = el('span', 'step-pip' + (i < player.i ? ' is-done' : i === player.i ? ' is-current' : ''));
      drillProgress.appendChild(pip);
    });
  }

  function renderDrillStep() {
    var step = D.DRILL.steps[player.i];
    renderProgress();
    clear(drillBody);

    /* The demo ships one fully written script — the EPA raid. If the builder
       is set to another scenario, say so rather than mislabel the content. */
    if (player.build && player.build.scenario.id !== D.DRILL.scenarioId && player.i === 0) {
      var note = el('p', 'section-sub',
        'Preview plays the ' + SCEN_BY_ID[D.DRILL.scenarioId].label + ' script. The ' +
        player.build.scenario.label + ' library is not included in this demo — everything else ' +
        '(branding, cohort, options) is exactly what you configured.');
      drillBody.appendChild(note);
    }

    var meta = el('div', 'drill-step-meta');
    meta.appendChild(el('span', 'drill-clock', step.clock));
    meta.appendChild(el('span', null, 'Step ' + (player.i + 1) + ' of ' + D.DRILL.steps.length));
    drillBody.appendChild(meta);

    drillBody.appendChild(el('h3', 'drill-heading', step.heading));
    drillBody.appendChild(el('p', 'drill-situation', step.situation));

    var list = el('div', 'option-list');
    var buttons = [];
    step.options.forEach(function (opt, oi) {
      var b = el('button', 'option');
      b.type = 'button';
      b.appendChild(el('span', 'option-key', String.fromCharCode(65 + oi)));
      b.appendChild(el('span', null, opt.text));
      b.addEventListener('click', function () { answer(oi, buttons, list); });
      buttons.push(b);
      list.appendChild(b);
    });
    drillBody.appendChild(list);
  }

  function answer(chosen, buttons, list) {
    var step = D.DRILL.steps[player.i];
    var opt = step.options[chosen];
    var correctIdx = -1;
    step.options.forEach(function (o, i) { if (o.correct) correctIdx = i; });

    player.answers[player.i] = { chosen: chosen, correct: !!opt.correct };

    buttons.forEach(function (b, i) {
      b.disabled = true;
      if (i === chosen) b.classList.add(opt.correct ? 'is-correct' : 'is-wrong');
      else if (i === correctIdx && !opt.correct) b.classList.add('is-correct');
      else b.classList.add('is-dim');
    });

    var fb = el('div', 'feedback ' + (opt.correct ? 'ok' : 'bad'));
    fb.setAttribute('role', 'status');
    var head = el('div', 'feedback-head');
    head.appendChild(el('span', null, opt.correct ? '✓' : '✕'));
    head.appendChild(el('span', null, opt.correct ? 'Right call' : 'Wrong call'));
    fb.appendChild(head);
    fb.appendChild(el('p', 'why', 'Why'));
    fb.appendChild(el('p', null, opt.rationale));
    if (!opt.correct) {
      fb.appendChild(el('p', null, 'The right call was ' + String.fromCharCode(65 + correctIdx) + ': ' +
        step.options[correctIdx].rationale));
    }
    list.insertAdjacentElement('afterend', fb);

    var actions = el('div', 'drill-actions');
    var last = player.i === D.DRILL.steps.length - 1;
    var next = el('button', 'btn btn-primary', last ? 'See your score' : 'Next step');
    next.type = 'button';
    next.addEventListener('click', function () {
      if (last) { renderScore(); }
      else { player.i += 1; renderDrillStep(); focusFirstOption(); }
    });
    actions.appendChild(next);
    drillBody.appendChild(actions);
    next.focus();
  }

  function focusFirstOption() {
    var f = $('.option', drillBody);
    if (f) f.focus();
  }

  function renderScore() {
    var total = D.DRILL.steps.length;
    var score = player.answers.filter(function (a) { return a && a.correct; }).length;
    var v = VERDICT.filter(function (x) { return score >= x.min; })[0];

    player.i = total;
    renderProgress();
    clear(drillBody);

    var wrap = el('div', 'score-wrap');
    var val = el('div', 'score-value');
    val.appendChild(document.createTextNode(String(score)));
    val.appendChild(el('span', 'score-of', ' / ' + total));
    wrap.appendChild(val);
    wrap.appendChild(el('div', 'score-verdict', v.title));
    wrap.appendChild(el('p', 'score-blurb', v.blurb));
    drillBody.appendChild(wrap);

    var recap = el('ul', 'recap');
    D.DRILL.steps.forEach(function (step, i) {
      var a = player.answers[i];
      var li = el('li');
      var mark = el('span', 'recap-mark ' + (a && a.correct ? 'ok' : 'bad'), a && a.correct ? '✓' : '✕');
      li.appendChild(mark);
      var txt = el('div');
      txt.appendChild(el('div', 'recap-title', (i + 1) + '. ' + step.heading));
      var correctIdx = 0;
      step.options.forEach(function (o, oi) { if (o.correct) correctIdx = oi; });
      txt.appendChild(el('div', 'recap-note', a && a.correct
        ? step.options[correctIdx].rationale
        : 'You chose ' + String.fromCharCode(65 + (a ? a.chosen : 0)) + '. ' + step.options[correctIdx].rationale));
      li.appendChild(txt);
      recap.appendChild(li);
    });
    drillBody.appendChild(recap);

    var b = player.build;
    var rewards = el('div', 'reward-row');
    if (b.cpd) {
      var r1 = el('div', 'reward');
      r1.appendChild(el('h4', null, 'CPD'));
      r1.appendChild(el('div', 'reward-big', D.DRILL.cpdPoints + ' points'));
      r1.appendChild(el('p', 'stat-note', 'Certificate issued by ' + b.firm + '.'));
      rewards.appendChild(r1);
    }
    if (b.leaderboard) {
      var r2 = el('div', 'reward');
      r2.appendChild(el('h4', null, b.client.short + ' leaderboard'));
      var lb = el('ul', 'lb');
      var entries = D.DRILL.leaderboard.map(function (x) { return { name: x.name, score: x.score, you: false }; });
      entries.push({ name: 'You', score: score, you: true });
      entries.sort(function (x, y) { return y.score - x.score; });
      entries.forEach(function (x) {
        var li = el('li', x.you ? 'is-you' : null);
        li.appendChild(el('span', null, x.name));
        li.appendChild(el('span', 'lb-score', x.score + ' / ' + total));
        lb.appendChild(li);
      });
      r2.appendChild(lb);
      rewards.appendChild(r2);
    }
    if (rewards.childNodes.length) drillBody.appendChild(rewards);

    if (b.debrief) {
      var cta = el('div', 'debrief-cta');
      var p = el('p');
      p.appendChild(el('strong', null, 'Want to walk through this with a lawyer?'));
      p.appendChild(document.createTextNode(b.drillScen.owner + ', ' + b.drillScen.ownerRole +
        ' at ' + b.firm + ', runs a 30-minute debrief for drill cohorts.'));
      cta.appendChild(p);
      var book = el('button', 'btn btn-primary', 'Book a debrief');
      book.type = 'button';
      book.addEventListener('click', function () {
        clear(cta);
        var done = el('p');
        done.appendChild(el('strong', null, 'Request sent.'));
        done.appendChild(document.createTextNode(' ' + b.drillScen.owner + ' will be in touch to confirm a time — and ' +
          b.firm + '’s BD team sees the request as a signal.'));
        cta.appendChild(done);
      });
      cta.appendChild(book);
      drillBody.appendChild(cta);
    }

    var actions = el('div', 'drill-actions');
    var again = el('button', 'btn', 'Restart drill');
    again.type = 'button';
    again.addEventListener('click', startDrill);
    var close = el('button', 'btn btn-primary', 'Close preview');
    close.type = 'button';
    close.addEventListener('click', closeDialog);
    actions.appendChild(again);
    actions.appendChild(close);
    drillBody.appendChild(actions);
  }

  function startDrill() {
    player.i = 0;
    player.answers = [];
    renderDrillStep();
    focusFirstOption();
  }

  $('#b-preview').addEventListener('click', function () {
    var b = currentBuild();
    b.drillScen = SCEN_BY_ID[D.DRILL.scenarioId];
    player.build = b;

    $('#drill-head').style.background = b.brand.hex;
    $('#drill-firm').textContent = b.firm + ' · ' + b.client.name;
    $('#drill-title').textContent = b.drillScen.label + ' drill';

    modal.hidden = false;
    startDrill();
    openDialog(modal, this, function () { modal.hidden = true; });
  });

  $('#drill-close').addEventListener('click', closeDialog);
  modal.addEventListener('mousedown', function (e) {
    if (e.target === modal) closeDialog();
  });

  /* ================================================================== boot */

  renderCampaigns();
  renderHeatmap();
  renderHeatLegend();
  renderHeatTable();
  renderSignals();
  resetBuilder();
  selectTab(window.location.hash.replace('#', ''), false);

  /* charts are painted with CSS custom properties, but re-render on theme
     change too so nothing can be left holding a stale colour */
  themeListeners.push(function () {
    renderHeatmap();
    renderHeatLegend();
  });
})();
