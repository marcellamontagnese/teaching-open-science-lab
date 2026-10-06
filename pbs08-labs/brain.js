/* PBS08 online labs: a small real-MRI engine.
   Loads the cropped ICBM152 2009a nonlinear symmetric T1 template from brain_data.js (an average of 152 healthy young adults,
   Fonov et al. 2009, 2011), and draws slices from it. Simulated tissue loss is painted into the template; nothing here is a patient scan.
   Coordinates are MNI millimetres (x: left to right, y: back to front, z: bottom to top). */
(function (g) {
  'use strict';
  const B = { ready: null, loaded: false, CSF: 75.6, CSFLOW: 68 };
  const VIEWS = {
    ax: { a: 0, b: 1, f: 2, flipA: false, flipB: true, name: 'Axial' },
    cor: { a: 0, b: 2, f: 1, flipA: false, flipB: true, name: 'Coronal' },
    sag: { a: 1, b: 2, f: 0, flipA: true, flipB: true, name: 'Sagittal' },
  };
  B.VIEWS = VIEWS;
  let T, DST, nx, ny, nz, dnx, dny, dnz, org;
  const dims = () => [nx, ny, nz];

  function decode(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
        resolve({ w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data });
      };
      im.onerror = () => reject(new Error('The template image could not be decoded.'));
      im.src = src;
    });
  }
  function unmosaic(m, W, H, cols, sx, sy, sz) {
    const out = new Uint8Array(sx * sy * sz);
    for (let k = 0; k < sz; k++) {
      const r = Math.floor(k / cols), c = k % cols;
      for (let j = 0; j < sy; j++) {
        let src = ((r * sy + j) * W + c * sx) * 4, dst = (k * sy + j) * sx;
        for (let i = 0; i < sx; i++, src += 4) out[dst + i] = m.d[src];
      }
    }
    return out;
  }
  B.load = function () {
    if (B.ready) return B.ready;
    const D = g.BRAIN_DATA;
    if (!D) { B.ready = Promise.reject(new Error('brain_data.js is missing.')); return B.ready; }
    B.ready = Promise.all([decode(D.t1), decode(D.dist)]).then(([a, b]) => {
      nx = D.nx; ny = D.ny; nz = D.nz; dnx = D.dnx; dny = D.dny; dnz = D.dnz; org = D.origin;
      T = unmosaic(a, a.w, a.h, D.cols, nx, ny, nz);
      DST = unmosaic(b, b.w, b.h, D.dcols, dnx, dny, dnz);
      B.loaded = true; B.dims = [nx, ny, nz]; B.origin = org.slice();
      B.range = [0, 1, 2].map((i) => [org[i], org[i] + dims()[i] - 1]);
      return B;
    });
    return B.ready;
  };

  /* ------------------------------------------------------------ blobs: schematic spherical regions
     b = { c:[x,y,z] mm, r: radius mm, z: deviation score, a: atrophy amplitude 0..1 } */
  B.prep = function (list) {
    return list.map((b, i) => {
      const s = b.r / 1.6;
      return { c: b.c, z: b.z, a: b.a || 0, s2: 1 / (2 * s * s), cut: (3.2 * s) * (3.2 * s), i: i + 1, id: b.id };
    });
  };
  B.regionAt = function (blobs, x, y, z, minW) {
    let best = null, bw = minW || 0.3;
    for (const b of blobs) {
      const d2 = (x - b.c[0]) ** 2 + (y - b.c[1]) ** 2 + (z - b.c[2]) ** 2;
      if (d2 > b.cut) continue;
      const w = Math.exp(-d2 * b.s2);
      if (w > bw) { bw = w; best = b; }
    }
    return best;
  };
  B.ventDist = function (x, y, z) { // distance (mm) from the template's lateral ventricles
    return dstAt((x - org[0] - 0.5) / 2, (y - org[1] - 0.5) / 2, (z - org[2] - 0.5) / 2) / 16;
  };
  function dstAt(a, b, c) {
    a = Math.min(Math.max(a, 0), dnx - 1.001); b = Math.min(Math.max(b, 0), dny - 1.001); c = Math.min(Math.max(c, 0), dnz - 1.001);
    const i = a | 0, j = b | 0, k = c | 0, fa = a - i, fb = b - j, fc = c - k, o = (k * dny + j) * dnx + i, sj = dnx, sk = dnx * dny;
    const v00 = DST[o] * (1 - fa) + DST[o + 1] * fa, v10 = DST[o + sj] * (1 - fa) + DST[o + sj + 1] * fa;
    const v01 = DST[o + sk] * (1 - fa) + DST[o + sk + 1] * fa, v11 = DST[o + sk + sj] * (1 - fa) + DST[o + sk + sj + 1] * fa;
    return (v00 * (1 - fb) + v10 * fb) * (1 - fc) + (v01 * (1 - fb) + v11 * fb) * fc;
  }

  /* ------------------------------------------------------------ slices
     view: 'ax' | 'cor' | 'sag'; mm: slice position along the fixed axis.
     o: { scale (pixels per mm, default 1.5), blobs (from prep), vent: { e, z } | null, widen (0..1), plain (skip all simulation) }
     returns { w, h, I (Float32 intensity), M (brain mask), Z (deviation field, if blobs), R (region index), toMm, toPix } */
  B.slice = function (view, mm, o) {
    o = o || {};
    const V = VIEWS[view], sc = o.scale || 1.5, dm = dims();
    const W = Math.round(dm[V.a] * sc), H = Math.round(dm[V.b] * sc);
    const str = [1, nx, nx * ny];
    const fIdx = Math.min(Math.max(Math.round(mm - org[V.f]), 0), dm[V.f] - 1);
    const mmF = fIdx + org[V.f];
    const colU = new Float32Array(W), rowU = new Float32Array(H);
    for (let p = 0; p < W; p++) colU[p] = (V.flipA ? (W - p - 0.5) : (p + 0.5)) / sc - 0.5;
    for (let p = 0; p < H; p++) rowU[p] = (V.flipB ? (H - p - 0.5) : (p + 0.5)) / sc - 0.5;
    const blobs = o.blobs || [], vent = o.vent || null, widen = o.widen || 0, plain = !!o.plain;
    const hasZ = blobs.length > 0 || !!vent, sim = !plain && (hasZ || widen > 0);
    const I = new Float32Array(W * H), M = new Uint8Array(W * H);
    const Z = hasZ ? new Float32Array(W * H) : null, R = hasZ ? new Uint8Array(W * H) : null;
    const base = fIdx * str[V.f], sa = str[V.a], sb = str[V.b], maxA = dm[V.a] - 1, maxB = dm[V.b] - 1;
    const P = [0, 0, 0]; P[V.f] = mmF;
    const idx = [0, 0, 0]; idx[V.f] = fIdx;
    const nb = blobs.length;
    for (let py = 0; py < H; py++) {
      let ub = rowU[py]; ub = ub < 0 ? 0 : (ub > maxB ? maxB : ub);
      const jb = Math.min(ub | 0, maxB - 1 < 0 ? 0 : maxB - 1), fb = ub - jb;
      P[V.b] = rowU[py] + org[V.b];
      for (let px = 0; px < W; px++) {
        let ua = colU[px]; ua = ua < 0 ? 0 : (ua > maxA ? maxA : ua);
        const ia = Math.min(ua | 0, maxA - 1), fa = ua - ia;
        const o00 = base + ia * sa + jb * sb;
        let v = (T[o00] * (1 - fa) + T[o00 + sa] * fa) * (1 - fb) + (T[o00 + sb] * (1 - fa) + T[o00 + sb + sa] * fa) * fb;
        const p = py * W + px;
        M[p] = v > 8 ? 1 : 0;
        if (sim && v > 8) {
          P[V.a] = colU[px] + org[V.a];
          let fl = 0, zb = 0, zbest = 0, rid = 0;
          for (let q = 0; q < nb; q++) {
            const bl = blobs[q];
            const dx = P[0] - bl.c[0], dy = P[1] - bl.c[1], dz = P[2] - bl.c[2], d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > bl.cut) continue;
            const w = Math.exp(-d2 * bl.s2);
            if (bl.a > 0) { const t = bl.a * w; if (t > fl) fl = t; }
            const zz = Math.abs(bl.z) * w;
            if (zz > zbest) { zbest = zz; zb = bl.z * w; rid = bl.i; }
          }
          fl += widen; if (fl > 1) fl = 1;
          if (fl > 0) { let pv = (214 - v) / 48; pv = pv < 0 ? 0 : (pv > 1 ? 1 : pv); if (v > 25) v -= fl * pv * (v - B.CSFLOW); }
          if (Z) { Z[p] = zb; R[p] = rid; }
        }
        I[p] = v;
      }
    }
    // ventricles need 3-D coordinates: second pass (kept separate for clarity)
    if (!plain && vent) {
      for (let py = 0; py < H; py++) {
        P[V.b] = rowU[py] + org[V.b];
        for (let px = 0; px < W; px++) {
          const p = py * W + px; if (!M[p]) continue;
          P[V.a] = colU[px] + org[V.a];
          const dd = B.ventDist(P[0], P[1], P[2]);
          const e = vent.e;
          if (e > 0 && dd > 0) { let w = e - dd + 0.5; w = w < 0 ? 0 : (w > 1 ? 1 : w); if (w > 0) I[p] = I[p] * (1 - w) + B.CSF * w; }
          let wv = 1 - (dd - Math.max(e, 0)) / 3; wv = wv < 0 ? 0 : (wv > 1 ? 1 : wv);
          const zv = vent.z * wv;
          if (Math.abs(zv) > Math.abs(Z[p])) { Z[p] = zv; R[p] = 200; }
        }
      }
    }
    const toMm = (px, py) => { const r = [0, 0, 0]; r[V.f] = mmF; r[V.a] = (V.flipA ? (W - px - 0.5) : (px + 0.5)) / sc - 0.5 + org[V.a]; r[V.b] = (V.flipB ? (H - py - 0.5) : (py + 0.5)) / sc - 0.5 + org[V.b]; return r; };
    const toPix = (pos) => { const ua = pos[V.a] - org[V.a], ub = pos[V.b] - org[V.b]; return { px: (V.flipA ? W - (ua + 0.5) * sc : (ua + 0.5) * sc) - 0.5, py: (V.flipB ? H - (ub + 0.5) * sc : (ub + 0.5) * sc) - 0.5 }; };
    return { w: W, h: H, I, M, Z, R, toMm, toPix, view, mm: mmF };
  };

  /* ------------------------------------------------------------ painting */
  const BLUE = [47, 109, 181], ORANGE = [232, 135, 47];
  B.paint = function (canvas, S, o) {
    o = o || {};
    const lo = o.lo === undefined ? 0 : o.lo, hi = o.hi === undefined ? 235 : o.hi, k = 255 / (hi - lo);
    canvas.width = S.w; canvas.height = S.h;
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(S.w, S.h), d = img.data;
    const ov = o.overlay || 'none', thr = o.thr || 1.96;
    const diff = o.diff; // optional Float32Array of signed differences (for the scanner lab): painted as blue/orange
    for (let p = 0, q = 0; p < S.I.length; p++, q += 4) {
      let gy = (S.I[p] - lo) * k; gy = gy < 0 ? 0 : (gy > 255 ? 255 : gy);
      let r = gy, gg = gy, b = gy;
      if (ov !== 'none' && S.Z && S.M[p]) {
        const z = S.Z[p], az = Math.abs(z);
        let al = 0;
        if (ov === 'all') al = Math.min(1, Math.max(0, (az - 0.4) / 2.2)) * 0.8;
        else if (az >= thr) al = 0.38 + 0.47 * Math.min(1, (az - thr) / 1.5);
        if (al > 0) { const c = z < 0 ? BLUE : ORANGE; r = r * (1 - al) + c[0] * al; gg = gg * (1 - al) + c[1] * al; b = b * (1 - al) + c[2] * al; }
      }
      d[q] = r; d[q + 1] = gg; d[q + 2] = b; d[q + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (o.cross) {
      ctx.save(); ctx.strokeStyle = 'rgba(244,203,201,0.85)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(o.cross.px + 0.5, 0); ctx.lineTo(o.cross.px + 0.5, S.h); ctx.moveTo(0, o.cross.py + 0.5); ctx.lineTo(S.w, o.cross.py + 0.5); ctx.stroke(); ctx.restore();
    }
  };
  B.paintGray = function (canvas, w, h, I, lo, hi) { B.paint(canvas, { w, h, I, M: null, Z: null }, { lo, hi }); };

  /* ------------------------------------------------------------ image helpers for the scanner lab */
  B.blur = function (I, w, h, sigma) {
    if (sigma < 0.05) return I.slice();
    const r = Math.max(1, Math.ceil(sigma * 3)), ker = new Float32Array(2 * r + 1); let s = 0;
    for (let i = -r; i <= r; i++) { ker[i + r] = Math.exp(-i * i / (2 * sigma * sigma)); s += ker[i + r]; }
    for (let i = 0; i < ker.length; i++) ker[i] /= s;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) { let xx = x + i; xx = xx < 0 ? 0 : (xx >= w ? w - 1 : xx); a += I[y * w + xx] * ker[i + r]; } tmp[y * w + x] = a; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) { let yy = y + i; yy = yy < 0 ? 0 : (yy >= h ? h - 1 : yy); a += tmp[yy * w + x] * ker[i + r]; } out[y * w + x] = a; }
    return out;
  };
  g.PBS = g.PBS || {};
  g.PBS.brain = B;
})(window);
