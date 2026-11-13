/* N2 network lab: graph helpers (no external libraries). Works in the browser and in Node for testing. */
(function (g) {
  'use strict';
  const NET = {};

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  NET.rng = rng;

  /* adjacency as array of Sets */
  const empty = (n) => Array.from({ length: n }, () => new Set());
  const addE = (A, i, j) => { A[i].add(j); A[j].add(i); };
  NET.edges = function (A) { const E = []; A.forEach((s, i) => s.forEach((j) => { if (i < j) E.push([i, j]); })); return E; };

  /* Watts–Strogatz: ring of n nodes, each linked to k nearest neighbours, each link rewired with probability p.
     The same seed gives the same sequence of coin flips for every p, so moving the slider changes the network smoothly. */
  NET.wattsStrogatz = function (n, k, p, seed) {
    const r = rng(seed), A = empty(n);
    for (let i = 0; i < n; i++) for (let d = 1; d <= k / 2; d++) addE(A, i, (i + d) % n);
    for (let d = 1; d <= k / 2; d++) {
      for (let i = 0; i < n; i++) {
        const j = (i + d) % n, coin = r(), target = r();
        if (coin < p && A[i].has(j)) {
          const free = []; for (let m = 0; m < n; m++) if (m !== i && !A[i].has(m)) free.push(m);
          if (!free.length) continue;
          const m = free[Math.floor(target * free.length)];
          A[i].delete(j); A[j].delete(i); addE(A, i, m);
        }
      }
    }
    return A;
  };

  /* Barabási–Albert style growth (preferential attachment): a few highly connected hubs emerge. */
  NET.hubNetwork = function (n, m, seed) {
    const r = rng(seed), A = empty(n), stubs = [];
    for (let i = 0; i <= m; i++) for (let j = i + 1; j <= m; j++) { addE(A, i, j); stubs.push(i, j); }
    for (let v = m + 1; v < n; v++) {
      const chosen = new Set();
      while (chosen.size < m) chosen.add(stubs[Math.floor(r() * stubs.length)]);
      chosen.forEach((u) => { addE(A, v, u); stubs.push(v, u); });
    }
    return A;
  };

  /* shortest path lengths from s (BFS), ignoring removed nodes */
  function bfs(A, s, gone) {
    const n = A.length, d = new Array(n).fill(-1); d[s] = 0; const q = [s];
    for (let h = 0; h < q.length; h++) { const v = q[h]; A[v].forEach((u) => { if (d[u] < 0 && !(gone && gone[u])) { d[u] = d[v] + 1; q.push(u); } }); }
    return d;
  }

  /* average local clustering: for each node, the share of pairs of its neighbours that are themselves linked */
  NET.clustering = function (A) {
    let s = 0;
    for (let i = 0; i < A.length; i++) {
      const nb = [...A[i]], k = nb.length; if (k < 2) continue;
      let t = 0; for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) if (A[nb[a]].has(nb[b])) t++;
      s += t / (k * (k - 1) / 2);
    }
    return s / A.length;
  };
  /* characteristic path length: mean shortest path over all connected pairs */
  NET.pathLength = function (A) {
    let s = 0, c = 0;
    for (let i = 0; i < A.length; i++) { const d = bfs(A, i); for (let j = i + 1; j < A.length; j++) if (d[j] > 0) { s += d[j]; c++; } }
    return c ? s / c : Infinity;
  };
  /* global efficiency: mean of 1/distance over all pairs of surviving nodes (pairs that cannot reach each other count as 0) */
  NET.efficiency = function (A, gone) {
    const n = A.length; let s = 0, alive = 0;
    for (let i = 0; i < n; i++) { if (gone && gone[i]) continue; alive++; const d = bfs(A, i, gone); for (let j = i + 1; j < n; j++) if (d[j] > 0) s += 1 / d[j]; }
    return alive > 1 ? s / (alive * (alive - 1) / 2) : 0;
  };
  NET.largestPiece = function (A, gone) {
    const n = A.length, seen = new Array(n).fill(false); let best = 0;
    for (let i = 0; i < n; i++) {
      if (seen[i] || (gone && gone[i])) continue;
      const d = bfs(A, i, gone); let c = 0; d.forEach((x, j) => { if (x >= 0) { seen[j] = true; c++; } }); best = Math.max(best, c);
    }
    return best;
  };
  NET.degree = (A) => A.map((s) => s.size);

  /* simple force layout, fixed seed so the picture is the same for everyone */
  NET.layout = function (A, seed, iters) {
    const r = rng(seed), n = A.length, E = NET.edges(A);
    const P = Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; return [Math.cos(a) * (0.5 + 0.4 * r()), Math.sin(a) * (0.5 + 0.4 * r())]; });
    const k = 1.6 / Math.sqrt(n);
    for (let it = 0; it < (iters || 400); it++) {
      const F = P.map(() => [0, 0]), temp = 0.08 * (1 - it / (iters || 400)) + 0.002;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d2 = dx * dx + dy * dy + 1e-6, f = k * k / d2;
        F[i][0] += dx * f; F[i][1] += dy * f; F[j][0] -= dx * f; F[j][1] -= dy * f;
      }
      for (const [i, j] of E) {
        const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d = Math.sqrt(dx * dx + dy * dy) + 1e-6, f = d / k;
        F[i][0] -= dx * f; F[i][1] -= dy * f; F[j][0] += dx * f; F[j][1] += dy * f;
      }
      for (let i = 0; i < n; i++) {
        F[i][0] -= P[i][0] * 0.05; F[i][1] -= P[i][1] * 0.05; // gentle pull to the centre
        const m = Math.hypot(F[i][0], F[i][1]) + 1e-9, step = Math.min(m, temp);
        P[i][0] += F[i][0] / m * step; P[i][1] += F[i][1] / m * step;
      }
    }
    let mx = 0; for (const p of P) mx = Math.max(mx, Math.abs(p[0]), Math.abs(p[1]));
    return P.map(([x, y]) => [x / mx, y / mx]);
  };

  g.NET = NET;
  if (typeof module !== 'undefined') module.exports = NET;
})(typeof window !== 'undefined' ? window : globalThis);
