/* PBS08 online labs: shared helpers (no external libraries). */
(function (g) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const PBS = {};

  /* ---------------------------------------------------------------- DOM */
  function append(el, kids) {
    for (const k of kids) {
      if (k === null || k === undefined || k === false) continue;
      if (Array.isArray(k)) append(el, k);
      else if (k instanceof Node) el.appendChild(k);
      else el.appendChild(document.createTextNode(String(k)));
    }
  }
  PBS.h = function (tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    append(el, kids);
    return el;
  };
  PBS.s = function (tag, props, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    append(el, kids);
    return el;
  };
  PBS.$ = (sel, root) => (root || document).querySelector(sel);
  PBS.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------------------------------------------------------------- numbers */
  PBS.f = function (x, d) {
    if (d === undefined) d = 2;
    if (!isFinite(x)) return '–';
    const s = Math.abs(x).toFixed(d);
    return (x < 0 && Number(s) !== 0 ? '−' : '') + s;
  };
  PBS.pct = (p, d) => PBS.f(p * 100, d === undefined ? 0 : d) + '%';
  PBS.ord = function (n) { // 1st, 2nd, 3rd, 11th ...
    const k = Math.round(n), a = k % 100;
    const suf = (a >= 11 && a <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th');
    return k + suf;
  };

  /* ---------------------------------------------------------------- random numbers */
  PBS.rng = function (seed) {
    let a = (seed >>> 0) || 1, spare = null;
    const u = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const n = () => {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let x, y, r;
      do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || r === 0);
      const m = Math.sqrt(-2 * Math.log(r) / r);
      spare = y * m; return x * m;
    };
    return { u, n, int: (k) => Math.floor(u() * k), pick: (arr) => arr[Math.floor(u() * arr.length)] };
  };

  /* ---------------------------------------------------------------- statistics */
  PBS.mean = (a) => { let s = 0; for (const v of a) s += v; return s / a.length; };
  PBS.sd = (a) => { const m = PBS.mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(s / (a.length - 1)); };
  PBS.quantile = function (sorted, p) {
    const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  };
  PBS.corr = function (x, y) {
    const n = x.length; let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxy / Math.sqrt(sxx * syy);
  };
  PBS.normPdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  PBS.normCdf = function (z) { // Hart-style erfc approximation, abs error < 1e-7
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z > 0 ? 1 - p : p;
  };
  PBS.normInv = function (p) { // Acklam's algorithm with one Halley refinement
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let x;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const e = PBS.normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  };

  /* least squares: X is an array of rows, y an array. Returns {beta, se, singular, resid, fitted, sigma} */
  PBS.ols = function (X, y) {
    const n = X.length, p = X[0].length, W = 2 * p + 1;
    const A = Array.from({ length: p }, (_, i) => { const r = new Array(W).fill(0); r[p + 1 + i] = 1; return r; });
    for (let i = 0; i < n; i++) {
      const r = X[i];
      for (let a = 0; a < p; a++) { A[a][p] += r[a] * y[i]; for (let b = 0; b < p; b++) A[a][b] += r[a] * r[b]; }
    }
    const scale = A.map((row, i) => Math.abs(row[i]) || 1);
    for (let c = 0; c < p; c++) {
      let piv = c;
      for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (Math.abs(A[piv][c]) < 1e-9 * scale[c]) return { beta: null, singular: true };
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let r = 0; r < p; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        if (f !== 0) for (let k = 0; k < W; k++) if (k !== c) A[r][k] -= f * A[c][k];
        A[r][c] = 0;
      }
    }
    const beta = A.map((row, i) => row[p] / row[i]);
    const fitted = X.map((r) => r.reduce((s, v, k) => s + v * beta[k], 0));
    const resid = y.map((v, i) => v - fitted[i]);
    let rss = 0; for (const e of resid) rss += e * e;
    const sigma = Math.sqrt(rss / Math.max(1, n - p));
    const se = A.map((row, i) => sigma * Math.sqrt(Math.max(0, row[p + 1 + i] / row[i])));
    return { beta, se, singular: false, fitted, resid, sigma };
  };

  /* ---------------------------------------------------------------- charts */
  PBS.chart = function (host, o) {
    let W = o.w || 760, H = o.h || 420;
    const m = Object.assign({ l: 58, r: 18, t: 16, b: 50 }, o.m || {});
    if (window.innerWidth < 700 && W > 400) { // phone: build the chart in roughly screen pixels so text stays readable
      const k = 400 / W; H = Math.round(H * k * 1.3); W = 400; m.l = Math.min(m.l, 72); m.r = Math.min(m.r, 14);
    }
    const svg = PBS.s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'chart' });
    host.appendChild(svg);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = (v) => m.l + (v - o.xd[0]) / (o.xd[1] - o.xd[0]) * iw;
    const y = (v) => m.t + ih - (v - o.yd[0]) / (o.yd[1] - o.yd[0]) * ih;
    const xinv = (px) => o.xd[0] + (px - m.l) / iw * (o.xd[1] - o.xd[0]);
    const yinv = (py) => o.yd[0] + (m.t + ih - py) / ih * (o.yd[1] - o.yd[0]);
    const back = PBS.s('g'), front = PBS.s('g');
    svg.append(back, front);
    const xf = o.xfmt || ((v) => String(v)), yf = o.yfmt || ((v) => String(v));
    if (o.xt !== false) {
      for (const t of (o.xt || [])) {
        back.append(PBS.s('line', { class: 'grid', x1: x(t), x2: x(t), y1: m.t, y2: m.t + ih }));
        back.append(PBS.s('text', { class: 'tick', x: x(t), y: m.t + ih + 20, 'text-anchor': 'middle', text: xf(t) }));
      }
    }
    for (const t of (o.yt || [])) {
      back.append(PBS.s('line', { class: 'grid', x1: m.l, x2: m.l + iw, y1: y(t), y2: y(t) }));
      back.append(PBS.s('text', { class: 'tick', x: m.l - 8, y: y(t) + 4.5, 'text-anchor': 'end', text: yf(t) }));
    }
    back.append(PBS.s('line', { class: 'axis', x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }));
    if (o.yaxis !== false) back.append(PBS.s('line', { class: 'axis', x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih }));
    if (o.xlabel) back.append(PBS.s('text', { class: 'axl', x: m.l + iw / 2, y: H - 8, 'text-anchor': 'middle', text: o.xlabel }));
    if (o.ylabel) back.append(PBS.s('text', { class: 'axl', transform: `translate(16 ${m.t + ih / 2}) rotate(-90)`, 'text-anchor': 'middle', text: o.ylabel }));
    const clip = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = PBS.s('defs', {}, PBS.s('clipPath', { id: clip }, PBS.s('rect', { x: m.l, y: m.t, width: iw, height: ih })));
    svg.insertBefore(defs, back);
    const api = {
      svg, W, H, m, iw, ih, x, y, xinv, yinv, clip: `url(#${clip})`, back, front,
      layer(clear) { if (clear !== false) PBS.clear(front); return front; },
      pointer(evt) {
        const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { px: p.x, py: p.y, x: xinv(p.x), y: yinv(p.y) };
      },
    };
    return api;
  };
  PBS.ticks = function (a, b, step) { const r = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) r.push(Math.round(v * 1e9) / 1e9); return r; };

  /* ---------------------------------------------------------------- controls */
  PBS.slider = function (o) {
    const id = o.id || 'sl' + Math.random().toString(36).slice(2, 7);
    const out = PBS.h('output', { for: id }, '');
    const input = PBS.h('input', { type: 'range', id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    const fmt = o.fmt || ((v) => String(v));
    const upd = () => { out.textContent = fmt(Number(input.value)); };
    input.addEventListener('input', () => { upd(); if (o.onInput) o.onInput(Number(input.value)); });
    upd();
    const wrap = PBS.h('div', { class: 'ctl' }, PBS.h('label', { for: id }, PBS.h('span', {}, o.label), out), input, o.hint ? PBS.h('div', { class: 'hint' }, o.hint) : null);
    wrap.get = () => Number(input.value);
    wrap.set = (v) => { input.value = v; upd(); };
    wrap.input = input;
    return wrap;
  };
  PBS.seg = function (o) {
    let cur = o.value;
    const box = PBS.h('div', { class: 'seg', role: 'group', 'aria-label': o.label || '' });
    const btns = o.options.map((op) => {
      const b = PBS.h('button', { type: 'button', 'aria-pressed': String(op.v === cur) }, op.label);
      b.addEventListener('click', () => { cur = op.v; sync(); if (o.onChange) o.onChange(cur); });
      box.appendChild(b); return b;
    });
    function sync() { btns.forEach((b, i) => b.setAttribute('aria-pressed', String(o.options[i].v === cur))); }
    box.get = () => cur; box.set = (v) => { cur = v; sync(); };
    return box;
  };
  PBS.toggle = function (o) {
    const id = o.id || 'tg' + Math.random().toString(36).slice(2, 7);
    const input = PBS.h('input', { type: 'checkbox', id });
    input.checked = !!o.value;
    input.addEventListener('change', () => o.onChange && o.onChange(input.checked));
    const wrap = PBS.h('label', { class: 'toggle', for: id }, input, PBS.h('span', {}, o.label));
    wrap.get = () => input.checked; wrap.set = (v) => { input.checked = v; };
    return wrap;
  };

  /* ---------------------------------------------------------------- guided tasks */
  /* options: [{t, ok, fb}]; the first correct option is revealed after any choice. */
  PBS.task = function (o) {
    const name = 'q' + Math.random().toString(36).slice(2, 8);
    const fb = PBS.h('div', { class: 'fb', hidden: true, 'aria-live': 'polite' });
    const optEls = o.options.map((op, i) => {
      const inp = PBS.h('input', { type: 'radio', name, value: String(i) });
      const lab = PBS.h('label', { class: 'opt' }, inp, PBS.h('span', {}, op.t));
      inp.addEventListener('change', () => {
        optEls.forEach((e, j) => { e.querySelector('input').disabled = true; e.classList.toggle('ok', !!o.options[j].ok); if (j === i && !op.ok) e.classList.add('no'); });
        fb.hidden = false; PBS.clear(fb);
        fb.append(PBS.h('b', {}, op.ok ? 'Yes. ' : 'Not quite. '));
        fb.insertAdjacentHTML('beforeend', op.fb || o.fb || '');
        if (!op.ok && o.fbWrong) fb.insertAdjacentHTML('beforeend', ' ' + o.fbWrong);
        if (o.onAnswer) o.onAnswer(i, !!op.ok);
      });
      return lab;
    });
    return PBS.h('div', { class: 'task' },
      PBS.h('span', { class: 'tag' }, o.tag || 'Predict'),
      PBS.h('h3', {}, o.title),
      o.body ? PBS.h('div', { html: o.body }) : null,
      PBS.h('div', { class: 'opts' }, optEls),
      fb);
  };
  /* a numeric answer: checked with a tolerance */
  PBS.numtask = function (o) {
    const id = 'n' + Math.random().toString(36).slice(2, 8);
    const input = PBS.h('input', { type: 'number', id, step: 'any', style: { font: 'inherit', fontWeight: '800', padding: '6px 10px', width: '8.5em', border: '1.5px solid var(--rose)', borderRadius: '8px', background: 'var(--card)', color: 'var(--ink)' } });
    const fb = PBS.h('div', { class: 'fb', hidden: true, 'aria-live': 'polite' });
    const btn = PBS.h('button', { class: 'btn sm', type: 'button' }, 'Check');
    btn.addEventListener('click', () => {
      const v = parseFloat(input.value);
      if (!isFinite(v)) { fb.hidden = false; fb.textContent = 'Type a number first.'; return; }
      const ok = Math.abs(v - o.answer) <= o.tol;
      fb.hidden = false; PBS.clear(fb);
      fb.append(PBS.h('b', {}, ok ? 'Yes. ' : 'Not quite. '));
      fb.insertAdjacentHTML('beforeend', ok ? o.fbRight : o.fbWrong);
      if (o.onAnswer && !o._done) { o._done = true; o.onAnswer(ok); }
    });
    return PBS.h('div', { class: 'task' },
      PBS.h('span', { class: 'tag' }, o.tag || 'Calculate'),
      PBS.h('h3', {}, o.title),
      o.body ? PBS.h('div', { html: o.body }) : null,
      PBS.h('div', { class: 'row', style: { margin: '10px 0' } }, PBS.h('label', { for: id, class: 'small' }, o.label || 'Your answer'), input, o.unit ? PBS.h('span', { class: 'small' }, o.unit) : null, btn),
      fb);
  };
  PBS.doTask = function (o) {
    return PBS.h('div', { class: 'task' },
      PBS.h('span', { class: 'tag' }, o.tag || 'Try'),
      PBS.h('h3', {}, o.title),
      PBS.h('div', { class: 'do', html: o.doit }),
      o.body ? PBS.h('div', { html: o.body }) : null,
      o.reveal ? PBS.h('details', { class: 'more', style: { marginTop: '8px' } }, PBS.h('summary', {}, o.revealLabel || 'What to notice'), PBS.h('div', { style: { marginTop: '6px' }, html: o.reveal })) : null);
  };
  PBS.card = function (title, body, headExtra) {
    return PBS.h('section', { class: 'card' }, PBS.h('div', { class: 'head' }, PBS.h('span', {}, title), headExtra || null), PBS.h('div', { class: 'body' }, body));
  };

  /* ---------------------------------------------------------------- lab list and page frame */
  PBS.LABS = [
    { id: 'sampling', file: 'lab1_sampling.html', n: 1, title: 'Sampling lab', sub: 'Why small studies mislead', time: '15 min', lecture: 'Lecture 2, slide 5',
      blurb: 'Run hundreds of simulated studies on a small true correlation. See what sample size does to the range of results, to the significant ones, and to the size of the effect that gets published.', tags: ['sample size', 'winner’s curse', 'power'] },
    { id: 'scanner', file: 'lab2_scanner.html', n: 2, title: 'Scanner lab', sub: 'Shift, stretch and ComBat', time: '20 min', lecture: 'Lecture 2, slides 12–16',
      blurb: 'Give a scanner a shift and a stretch, then try to take them out again. Switch the study design from balanced to confounded and watch the group difference you are trying to measure go wrong.', tags: ['site effects', 'harmonisation', 'confounding'] },
    { id: 'fingerprint', file: 'lab3_scanner_fingerprint.html', n: 3, title: 'Scanner fingerprint lab', sub: 'The same real brain on different scanners', time: '25 min', lecture: 'Lecture 2, slides 11–16',
      blurb: 'Scan one real MRI brain on virtual scanners. Change contrast, noise, blur and coil bias, watch a fixed measurement give a different answer for identical brains, then rebuild the shift and stretch of Lab 2 from the images themselves.', tags: ['real MRI template', 'site effects', 'travelling brains'] },
    { id: 'sameaverage', file: 'lab4_same_average.html', n: 4, title: 'Same-average lab', sub: 'Find the hidden patients', time: '15 min', lecture: 'Lecture 2, slides 22–23',
      blurb: 'Build a patient group from deviation scores, region by region. Make two very different groups give the same case–control result, then use individual deviation maps to tell them apart.', tags: ['heterogeneity', 'case–control', 'deviation maps'] },
    { id: 'reader', file: 'lab5_centile_reader.html', n: 5, title: 'Centile reader', sub: 'Z-scores and centiles', time: '15 min', lecture: 'Lecture 2, slides 26–27 and 33',
      blurb: 'Drag a measurement along a reference distribution and read off the z-score and centile. Compare ages, try a skewed reference, count how many regions a healthy brain flags, then take a short quiz.', tags: ['z-score', 'centile', 'multiple regions'] },
    { id: 'brainapp', file: 'lab6_brain_charts_app.html', n: 6, title: 'Brain Charts app', sub: 'Explore the real lifespan charts online', time: '20 min', lecture: 'Lecture 2, slides 28–30',
      blurb: 'A guided visit to the Brain Charts web app, which hosts the lifespan reference charts from the Bethlehem et al. (2022) paper. Predict the shape of the curves first, then check what the real charts show.', tags: ['lifespan charts', 'centiles', 'external web app'] },
    { id: 'casebook', file: 'lab7_case_conference.html', n: 7, title: 'Case conference lab', sub: 'Read the deviation maps of eight people', time: '30 min', lecture: 'Lecture 2, slides 22–23 and 31–34',
      blurb: 'Eight fictional cases on a real MRI brain with simulated tissue loss. Read each deviation map, flip between scan and map, change the flag threshold, and try to spot a real pattern among random healthy maps.', tags: ['deviation maps', 'real MRI template', 'chance flags'] },
    { id: 'flagging', file: 'lab8_flagging.html', n: 8, title: 'Flagging lab', sub: 'Thresholds, sensitivity and prevalence', time: '20 min', lecture: 'Preview for Lecture 6',
      blurb: 'Choose a centile cut-off for flagging people, then see who is caught, who is missed and who is flagged by mistake. Change how common the condition is and watch the meaning of a flag change.', tags: ['sensitivity', 'specificity', 'positive predictive value'] },
  ];
  PBS.frame = function (id, root) {
    const i = PBS.LABS.findIndex((l) => l.id === id), lab = PBS.LABS[i];
    const prev = PBS.LABS[i - 1], next = PBS.LABS[i + 1];
    const bar = PBS.h('div', { class: 'topbar' },
      PBS.h('div', { class: 'crumbs' }, PBS.h('a', { href: 'index.html' }, 'PBS08 online labs'), PBS.h('span', {}, 'Lab ' + lab.n + ' of ' + PBS.LABS.length)),
      PBS.h('div', {}, PBS.h('span', { class: 'pill' }, lab.lecture + ' · about ' + lab.time)));
    root.prepend(bar);
    const nav = PBS.h('div', { class: 'pagenav' },
      prev ? PBS.h('a', { href: prev.file }, '← ' + prev.title) : PBS.h('a', { href: 'index.html' }, '← All labs'),
      next ? PBS.h('a', { href: next.file }, next.title + ' →') : PBS.h('a', { href: 'index.html' }, 'All labs →'));
    root.append(nav);
    document.title = lab.title + ' – PBS08';
  };
  PBS.takeaway = function (items) {
    return PBS.h('div', { class: 'takeaway' }, PBS.h('h2', {}, 'Take-home'), PBS.h('ul', {}, items.map((t) => PBS.h('li', { html: t }))));
  };

  g.PBS = PBS;
})(window);
