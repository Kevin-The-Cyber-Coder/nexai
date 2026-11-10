/** Deterministic art, storyboards and dataset analysis — no external services required. */
import crypto from 'node:crypto';

const PALETTES = {
  Abstract: [['#0b1020', '#1e1b4b', '#4338ca'], ['#22d3ee', '#818cf8', '#f472b6'], ['#34d399', '#60a5fa', '#a78bfa']],
  '3D render': [['#070b18', '#101a3a', '#312e81'], ['#6366f1', '#22d3ee', '#f8fafc'], ['#f59e0b', '#ef4444', '#fde68a']],
  Minimal: [['#f8fafc', '#e2e8f0', '#cbd5e1'], ['#0f172a', '#334155', '#6366f1'], ['#fef3c7', '#fde68a', '#f59e0b']],
  Cinematic: [['#05070f', '#111827', '#1e3a8a'], ['#f97316', '#7c3aed', '#0ea5e9'], ['#facc15', '#dc2626', '#111827']],
  Watercolor: [['#fdf2f8', '#fce7f3', '#fbcfe8'], ['#a5f3fc', '#c7d2fe', '#fbcfe8'], ['#bbf7d0', '#fde68a', '#fca5a5']],
  Neon: [['#05010d', '#1a0033', '#3b0764'], ['#22d3ee', '#e879f9', '#a3e635'], ['#f472b6', '#38bdf8', '#facc15']],
  Editorial: [['#faf7f2', '#efe9df', '#d6cbb8'], ['#1c1917', '#57534e', '#b91c1c'], ['#0f172a', '#e2e8f0', '#0ea5e9']],
  Product: [['#f8fafc', '#eef2ff', '#e0e7ff'], ['#0b1020', '#1e1b4b', '#6366f1'], ['#ecfdf5', '#d1fae5', '#059669']]
};
const SIZES = { '16:9': [1024, 576], '1:1': [768, 768], '4:5': [768, 960], '9:16': [540, 960], '3:2': [1024, 683] };

function hash(str) { return parseInt(crypto.createHash('sha1').update(str).digest('hex').slice(0, 8), 16); }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function generateArt({ prompt = '', style = 'Abstract', aspect = '16:9', seed = 1, variant = 0 }) {
  const [w, h] = SIZES[aspect] || SIZES['16:9'];
  const pal = PALETTES[style] || PALETTES.Abstract;
  const [bg, deep, accent] = pal[Math.floor(rng(hash(prompt + variant))() * pal.length)];
  const r = rng(hash(prompt + style + aspect + seed + variant));
  const id = `g${(hash(prompt + aspect) % 9999)}`;
  const blobs = Array.from({ length: 5 + Math.floor(r() * 4) }, (_, i) => {
    const cx = r() * w, cy = r() * h, rad = (0.12 + r() * 0.3) * Math.min(w, h) * (i === 0 ? 1.4 : 1);
    const colors = [accent, deep, '#ffffff', accent];
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="${colors[Math.floor(r() * colors.length)]}" opacity="${(0.18 + r() * 0.3).toFixed(2)}" filter="url(#${id}b)"/>`;
  }).join('');
  const rings = Array.from({ length: 3 }, (_, i) => {
    const cx = w * (0.25 + r() * 0.5), cy = h * (0.25 + r() * 0.5), rad = (0.1 + r() * 0.28) * Math.min(w, h);
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="none" stroke="${i % 2 ? accent : '#ffffff'}" stroke-width="${(1 + r() * 2).toFixed(1)}" opacity="${(0.15 + r() * 0.25).toFixed(2)}"/>`;
  }).join('');
  const lines = Array.from({ length: 6 }, () => {
    const y = r() * h;
    return `<line x1="0" y1="${y.toFixed(0)}" x2="${w}" y2="${(y + (r() - 0.5) * 80).toFixed(0)}" stroke="#ffffff" stroke-width="0.6" opacity="0.06"/>`;
  }).join('');
  const label = esc(prompt.slice(0, 84)) + (prompt.length > 84 ? '…' : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(prompt)}">
  <defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="0.55" stop-color="${deep}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
    <radialGradient id="${id}b"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="${id}blur"><feGaussianBlur stdDeviation="${(Math.min(w, h) * 0.05).toFixed(0)}"/></filter>
    <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer></filter>
    <linearGradient id="${id}shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${id}bg)"/>
  <g filter="url(#${id}blur)">${blobs}</g>
  <g>${rings}${lines}</g>
  <rect width="${w}" height="${h}" fill="url(#${id}shade)"/>
  <rect width="${w}" height="${h}" filter="url(#${id}grain)" opacity="0.55"/>
  <g font-family="Inter, Segoe UI, system-ui, sans-serif">
    <text x="${w * 0.06}" y="${h * 0.09}" fill="#ffffff" opacity="0.7" font-size="${Math.round(Math.min(w, h) * 0.022)}" letter-spacing="${Math.round(w * 0.004)}">NEXAI · ${esc(style.toUpperCase())}</text>
    <text x="${w * 0.06}" y="${h * 0.9}" fill="#ffffff" opacity="0.92" font-size="${Math.round(Math.min(w, h) * 0.033)}" font-weight="600">${label}</text>
    <text x="${w * 0.06}" y="${h * 0.95}" fill="#ffffff" opacity="0.5" font-size="${Math.round(Math.min(w, h) * 0.02)}">${aspect} · NexAI Image Studio</text>
  </g>
</svg>`;
}

export function storyboard({ prompt = '', style = 'Cinematic', duration = 60 }) {
  const total = Math.max(15, Math.min(180, Number(duration) || 60));
  const count = total <= 20 ? 3 : total <= 45 ? 4 : total <= 75 ? 5 : 7;
  const per = Math.round(total / count);
  const beats = [
    ['Cold open', 'Macro detail, shallow focus', 'Open on a single detail that hints at the problem — no logo, no title.', 'What if the work you dread took four minutes?'],
    ['The friction', 'Handheld, natural light', 'Show the old way: tabs, spreadsheets, waiting. Keep it honest, not cartoonish.', 'Every week, hours disappear into busywork.'],
    ['The turn', 'Slow push in', 'Introduce the product at the moment of relief. One clean screen, one action.', 'Then everything moves at the speed of intent.'],
    ['Proof', 'Split screen, clean cuts', 'Real workflow, real output. Let the interface do the talking.', 'One brief. Every source. Ready to send.'],
    ['Scale', 'Wide, bright', 'Show the team using it together — asynchronous, calm, in control.', 'Not more tools. Fewer handoffs.'],
    ['Close', 'Static, locked off', 'Return to the opening detail, now resolved. End card with one CTA.', 'NexAI. Think smarter. Work faster. Create more.'],
    ['End card', 'Title card', 'Logo, URL, one-line promise. Hold for 3 seconds.', 'Start free at nexai.app']
  ];
  return {
    title: prompt.slice(0, 70) || 'Untitled film',
    style, duration: total,
    scenes: beats.slice(0, count).map(([title, shot, description, voiceover], i) => ({
      id: i + 1, title, shot, description, voiceover,
      seconds: i === count - 1 ? total - per * (count - 1) : per,
      palette: ['#0b1020', '#312e81', '#6366f1', '#22d3ee', '#f8fafc'][i % 5]
    })),
    hook: 'Open on the moment before the work gets easier.',
    cta: 'Start free at nexai.app',
    notes: ['Cut on motion, not on dialogue.', 'Keep captions burned in for short-form.', 'Music: restrained, 90 BPM, duck under voiceover.']
  };
}

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[$,€£%\s]/g, '').replace(/,/g, '');
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
};
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function analyzeDataset(rows = []) {
  const cleanRows = rows.filter(r => r && typeof r === 'object');
  if (!cleanRows.length) return { rows: 0, columns: [], insights: [], charts: [] };
  const columns = Object.keys(cleanRows[0]).slice(0, 40);
  const profile = columns.map(name => {
    const raw = cleanRows.map(r => r[name]);
    const missing = raw.filter(v => v === '' || v === null || v === undefined).length;
    const values = raw.map(num).filter(v => v !== null);
    const numeric = values.length >= Math.max(3, raw.length * 0.6);
    const uniq = new Set(raw.filter(v => v !== '' && v != null).map(String));
    const p = { name, numeric, missing, unique: uniq.size, filled: raw.length - missing };
    if (numeric) {
      const sum = values.reduce((a, b) => a + b, 0);
      p.min = Math.min(...values); p.max = Math.max(...values);
      p.mean = Number((sum / values.length).toFixed(2));
      p.median = Number(median(values).toFixed(2));
      p.sum = Number(sum.toFixed(2));
      const variance = values.reduce((a, b) => a + (b - p.mean) ** 2, 0) / values.length;
      p.stdev = Number(Math.sqrt(variance).toFixed(2));
    } else {
      p.top = [...uniq].slice(0, 5);
    }
    return p;
  });
  const seen = new Set(); let duplicates = 0;
  for (const r of cleanRows) {
    const key = JSON.stringify(r);
    if (seen.has(key)) duplicates++; else seen.add(key);
  }
  const totalMissing = profile.reduce((a, c) => a + c.missing, 0);
  const numericCols = profile.filter(c => c.numeric);
  const primary = numericCols.sort((a, b) => (b.sum || 0) - (a.sum || 0))[0];
  const labelCol = profile.find(c => !c.numeric) || profile[0];

  const charts = [];
  if (primary && labelCol) {
    charts.push({
      type: 'bar', title: `${primary.name} by ${labelCol.name}`,
      labels: cleanRows.slice(0, 12).map((r, i) => String(r[labelCol.name] ?? `Row ${i + 1}`).slice(0, 18)),
      values: cleanRows.slice(0, 12).map(r => num(r[primary.name]) ?? 0)
    });
    const trend = cleanRows.slice(0, 24).map(r => num(r[primary.name]) ?? 0);
    charts.push({ type: 'line', title: `${primary.name} trend`, labels: trend.map((_, i) => `#${i + 1}`), values: trend });
    if (numericCols.length > 1) {
      const second = numericCols.filter(c => c.name !== primary.name).sort((a, b) => (b.sum || 0) - (a.sum || 0))[0];
      if (second) charts.push({ type: 'bar', title: `${second.name} by ${labelCol.name}`, labels: cleanRows.slice(0, 12).map((r, i) => String(r[labelCol.name] ?? `Row ${i + 1}`).slice(0, 18)), values: cleanRows.slice(0, 12).map(r => num(r[second.name]) ?? 0) });
    }
  }

  // Simple linear forecast based on the primary numeric series
  let forecast = null;
  if (primary) {
    const vals = cleanRows.slice(0, 30).map(r => num(r[primary.name])).filter(v => v !== null);
    if (vals.length >= 4) {
      const n = vals.length;
      const xs = vals.map((_, i) => i);
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = vals.reduce((a, b) => a + b, 0) / n;
      const slope = xs.reduce((a, x, i) => a + (x - mx) * (vals[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0 || 1);
      const intercept = my - slope * mx;
      const next = Array.from({ length: 4 }, (_, i) => Number(Math.max(0, intercept + slope * (n + i)).toFixed(2)));
      forecast = { metric: primary.name, basis: 'linear trend', next, direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat', change: Number(((slope / (Math.abs(my) || 1)) * 100).toFixed(1)) };
    }
  }

  const insights = [];
  insights.push(`**${cleanRows.length.toLocaleString()} rows × ${profile.length} columns** analysed. ${duplicates ? `${duplicates} duplicate row${duplicates === 1 ? '' : 's'} detected.` : 'No exact duplicate rows found.'}`);
  if (totalMissing) {
    const worst = [...profile].sort((a, b) => b.missing - a.missing)[0];
    insights.push(`**Missing data:** ${totalMissing} empty cells. **${worst.name}** is the most affected (${worst.missing} missing). Fill or exclude it before modelling.`);
  } else insights.push('**Completeness is excellent:** no missing values across the analysed columns.');
  if (primary) insights.push(`**${primary.name}** averages **${primary.mean.toLocaleString()}** (median ${primary.median.toLocaleString()}), ranging ${primary.min.toLocaleString()}–${primary.max.toLocaleString()}. High variance (σ=${primary.stdev}) means averages hide real segment differences.`);
  if (forecast) insights.push(`**Forecast:** ${forecast.metric} is trending **${forecast.direction}** (${forecast.change > 0 ? '+' : ''}${forecast.change}% per step). Next four periods: **${forecast.next.map(v => v.toLocaleString()).join(', ')}**. Treat this as directional, not a guarantee.`);
  if (numericCols.length > 1) insights.push(`**Next check:** compare ${numericCols.slice(0, 3).map(c => c.name).join(' vs ')} for correlation. A strong relationship is a hypothesis, not a cause.`);
  insights.push('**Data quality actions:** standardise column names, lock a schema, and add validation at ingest so bad rows fail loudly.');

  return {
    rows: cleanRows.length, columns: profile, duplicates, missing: totalMissing,
    numericColumns: numericCols.map(c => c.name), insights, charts, forecast,
    preview: cleanRows.slice(0, 8), generatedAt: new Date().toISOString()
  };
}

export function sampleDataset() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const channels = [
    { channel: 'Organic', base: 4200, growth: 240 },
    { channel: 'Paid', base: 2600, growth: 140 },
    { channel: 'Partners', base: 1500, growth: 210 },
    { channel: 'Referral', base: 900, growth: 120 }
  ];
  const rows = [];
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const c of channels) {
    months.forEach((m, i) => {
      rows.push({
        Month: m,
        Channel: c.channel,
        Visitors: Math.round(c.base + c.growth * i + rand() * 500),
        Signups: Math.round((c.base + c.growth * i) * 0.08 + rand() * 30),
        Revenue: Math.round((c.base + c.growth * i) * (2.4 + rand() * 0.8))
      });
    });
  }
  return rows;
}
