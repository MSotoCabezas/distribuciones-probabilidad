/* Funciones numéricas compartidas */
const SQRT2 = Math.SQRT2, SQRT2PI = Math.sqrt(2 * Math.PI);

function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const erf = x => 1 - erfc(x);

function qnormStd(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239],
        b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1],
        c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
        d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const lo = 0.02425;
  if (p < lo || p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(p < lo ? p : 1 - p));
    const x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    return p < lo ? x : -x;
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const Normal = {
  pdf: (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * SQRT2PI),
  cdf: (x, m, s) => 0.5 * erfc(-(x - m) / (s * SQRT2)),
  sf:  (x, m, s) => 0.5 * erfc((x - m) / (s * SQRT2)),
  hazard(x, m, s) {
    const z = (x - m) / s;
    if (z > 30) return z / (1 - 1 / z ** 2 + 3 / z ** 4) / s;
    return this.pdf(x, m, s) / this.sf(x, m, s);
  },
  quantile: (u, m, s) => m + s * qnormStd(u)
};

/* Utilidades */
const seq = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const fmt = (v, d = 3) => Number(v).toLocaleString('es-CL', { maximumFractionDigits: d });

function niceTicks(a, b, n = 6) {
  const raw = (b - a) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/* Gráfico SVG: opt = {title, xlabel, ylabel, xlim, ylim, series:[{x,y,cls,label}], shade:{x,y}} */
function drawPlot(el, opt) {
  const W = 640, H = 360, M = { l: 58, r: 18, t: 46, b: 50 }, iw = W - M.l - M.r, ih = H - M.t - M.b;
  const [x0, x1] = opt.xlim, [y0, y1] = opt.ylim;
  const sx = x => M.l + (x - x0) / (x1 - x0) * iw;
  const sy = y => M.t + ih - (y - y0) / (y1 - y0) * ih;
  const clamp = y => Math.max(y0 - (y1 - y0), Math.min(y1 + (y1 - y0), y));
  const id = 'clip-' + el.id;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opt.title}">`;
  s += `<defs><clipPath id="${id}"><rect x="${M.l}" y="${M.t}" width="${iw}" height="${ih}"/></clipPath></defs>`;
  s += `<text class="p-title" x="${M.l}" y="24">${opt.title}</text>`;

  niceTicks(x0, x1, 8).forEach(t => {
    s += `<line class="p-grid" x1="${sx(t)}" x2="${sx(t)}" y1="${M.t}" y2="${M.t + ih}"/>`;
    s += `<text class="p-tick" x="${sx(t)}" y="${M.t + ih + 18}" text-anchor="middle">${fmt(t)}</text>`;
  });
  niceTicks(y0, y1, 5).forEach(t => {
    s += `<line class="p-grid" x1="${M.l}" x2="${M.l + iw}" y1="${sy(t)}" y2="${sy(t)}"/>`;
    s += `<text class="p-tick" x="${M.l - 8}" y="${sy(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  });
  s += `<line class="p-axis" x1="${M.l}" x2="${M.l + iw}" y1="${M.t + ih}" y2="${M.t + ih}"/>`;
  s += `<line class="p-axis" x1="${M.l}" x2="${M.l}" y1="${M.t}" y2="${M.t + ih}"/>`;

  s += `<g clip-path="url(#${id})">`;
  if (opt.shade) {
    const { x, y } = opt.shade;
    let d = `M${sx(x[0])},${sy(0)}`;
    x.forEach((xi, i) => d += `L${sx(xi)},${sy(y[i])}`);
    s += `<path class="p-shade" d="${d}L${sx(x[x.length - 1])},${sy(0)}Z"/>`;
  }
  opt.series.forEach(se => {
    let d = '', pen = false;
    se.x.forEach((xi, i) => {
      const yi = se.y[i];
      if (!isFinite(yi)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${sx(xi).toFixed(2)},${sy(clamp(yi)).toFixed(2)}`;
      pen = true;
    });
    s += `<path class="p-line ${se.cls}" d="${d}"/>`;
  });
  s += `</g>`;

  const labeled = opt.series.filter(se => se.label);
  if (labeled.length > 1) labeled.forEach((se, i) => {
    const ly = M.t + 14 + i * 20, lx = M.l + iw - 150;
    s += `<line class="p-line ${se.cls}" x1="${lx}" x2="${lx + 26}" y1="${ly}" y2="${ly}"/>`;
    s += `<text class="p-leg" x="${lx + 34}" y="${ly + 4}">${se.label}</text>`;
  });

  s += `<text class="p-lab" x="${M.l + iw / 2}" y="${H - 8}" text-anchor="middle">${opt.xlabel}</text>`;
  s += `<text class="p-lab" transform="translate(16 ${M.t + ih / 2}) rotate(-90)" text-anchor="middle">${opt.ylabel}</text>`;
  el.innerHTML = s + '</svg>';
}

/* Pestañas de código y fórmulas */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tabs').forEach(box => {
    const btns = box.querySelectorAll('[role=tab]'), panes = box.querySelectorAll('[role=tabpanel]');
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach((x, j) => x.setAttribute('aria-selected', i === j));
      panes.forEach((p, j) => p.hidden = i !== j);
    }));
  });
  if (window.renderMathInElement) renderMathInElement(document.body, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }]
  });
});
