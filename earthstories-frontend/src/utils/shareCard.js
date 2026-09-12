// src/utils/shareCard.js
// Module 8 — Shareable Summary Card (Canvas API)
// Drop into: earthstories-frontend/src/utils/shareCard.js
// Call: generateShareCard(cityData, birthYear)

/**
 * Draws a warming-stripe style personalised PNG card (1200x630px)
 * and triggers a browser download.
 */

/**
 * Deterministic PRNG (mulberry32). The starfield used Math.random(), so the
 * same story exported a different card every time; seeding it from the city
 * and birth year makes a given Earth Story reproducible.
 */
function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
export async function generateShareCard(cityData, birthYear) {
  const canvas = document.createElement('canvas');
  canvas.width  = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  const city = cityData.city || 'My City';

  // ── Background ─────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 630);
  bgGrad.addColorStop(0, '#060f1c');
  bgGrad.addColorStop(1, '#0a1628');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // ── Warming stripes (full bleed strip) ────────────────────────────────────
  const tempData = Object.entries(cityData.metrics?.temperature_anomaly || {})
    .map(([y, v]) => ({ year: parseInt(y), val: v ?? 0 }))
    .sort((a, b) => a.year - b.year);

  if (tempData.length > 0) {
    const STRIP_Y = 310;
    const STRIP_H = 120;
    const STRIP_X = 80;
    const STRIP_W = 1040;
    const stripeW = STRIP_W / tempData.length;

    tempData.forEach(({ val }, i) => {
      const t = Math.max(0, Math.min(1, (val + 1.5) / 3));
      // Cool blue → warm red palette
      const r = Math.round(20  + t * 200);
      const g = Math.round(80  - t * 40);
      const b = Math.round(180 - t * 160);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(STRIP_X + i * stripeW, STRIP_Y, Math.ceil(stripeW) + 1, STRIP_H);
    });

    // Border around stripes
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(STRIP_X, STRIP_Y, STRIP_W, STRIP_H);
  }

  // ── Star field (subtle) ───────────────────────────────────────────────────
  ctx.save();
  const random = seededRandom(seedFrom(`${cityData.city_key || city}-${birthYear}`));
  for (let i = 0; i < 60; i++) {
    const x = random() * 1200;
    const y = random() * 280;
    const r = random() * 1.2 + 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${random() * 0.4 + 0.1})`;
    ctx.fill();
  }
  ctx.restore();

  // ── Decorative accent line ────────────────────────────────────────────────
  const accentGrad = ctx.createLinearGradient(80, 0, 1120, 0);
  accentGrad.addColorStop(0, 'rgba(78,195,120,0)');
  accentGrad.addColorStop(0.3, 'rgba(78,195,120,0.8)');
  accentGrad.addColorStop(0.7, 'rgba(100,160,220,0.8)');
  accentGrad.addColorStop(1, 'rgba(100,160,220,0)');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(80, 296, 1040, 2);

  // ── City name ─────────────────────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Georgia, serif';
  ctx.fillText(city, 80, 110);

  // ── Tagline ───────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(180,220,200,0.75)';
  ctx.font = '24px Georgia, serif';
  ctx.fillText(
    `During your ${age} years on Earth · Born ${birthYear}`,
    80, 155
  );

  // ── NASA badge ────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 80, 185, 220, 34, 6);
  ctx.fillStyle = 'rgba(100,180,220,0.9)';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('🛰  NASA EARTH OBSERVATION', 92, 207);

  // ── Key metrics row ───────────────────────────────────────────────────────
  const metrics = buildMetricsSummary(cityData, birthYear);
  const metricY = 465;

  metrics.forEach((m, i) => {
    const x = 80 + i * 265;
    ctx.textAlign = 'left';

    // Icon + label
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '12px monospace';
    ctx.fillText(m.icon + ' ' + m.label.toUpperCase(), x, metricY);

    // Value
    ctx.fillStyle = m.color || '#7ecb8f';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(m.value, x, metricY + 28);

    // Delta
    ctx.fillStyle = 'rgba(180,220,200,0.55)';
    ctx.font = '13px monospace';
    ctx.fillText(m.delta, x, metricY + 50);
  });

  // ── Stripe label ──────────────────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px monospace';
  ctx.fillText('TEMPERATURE ANOMALY (°C above baseline)', 80, 304);
  ctx.textAlign = 'right';
  ctx.fillText('YOUR LIFETIME →', 1120, 304);

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerGrad = ctx.createLinearGradient(0, 585, 0, 630);
  footerGrad.addColorStop(0, 'rgba(0,0,0,0)');
  footerGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, 585, 1200, 45);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px monospace';
  ctx.fillText('Earth Stories  ·  NASA Space Apps Challenge 2026  ·  earthstories.app', 600, 617);

  // ── Download ──────────────────────────────────────────────────────────────
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earth-story-${cityData.city_key || 'my-city'}-${birthYear}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMetricsSummary(cityData, birthYear) {
  const m = cityData.metrics || {};
  const years = Object.keys(m.ndvi_mean || {}).map(Number).sort();
  const lastYear = Math.max(...years);

  const get = (metric, year) => m[metric]?.[String(year)] ?? null;

  const ndviStart = get('ndvi_mean', birthYear);
  const ndviEnd   = get('ndvi_mean', lastYear);
  const tempEnd   = get('temperature_anomaly', lastYear);
  const urbanStart = get('urban_cover_pct', birthYear);
  const urbanEnd   = get('urban_cover_pct', lastYear);

  return [
    {
      icon: '🌿',
      label: 'Vegetation change',
      value: ndviEnd != null ? ndviEnd.toFixed(3) : 'n/a',
      delta: ndviEnd != null && ndviStart != null
        ? `${ndviEnd > ndviStart ? '▲' : '▼'} ${Math.abs((ndviEnd - ndviStart) * 100).toFixed(1)}% since ${birthYear}`
        : '',
      color: ndviEnd > ndviStart ? '#4caf81' : '#ef7070',
    },
    {
      icon: '🌡️',
      label: 'Temp. anomaly now',
      value: tempEnd != null ? `+${tempEnd.toFixed(2)}°C` : 'n/a',
      delta: `above 2000–2010 baseline`,
      color: tempEnd > 1 ? '#ef5350' : '#ffa726',
    },
    {
      icon: '🏙️',
      label: 'Urban growth',
      value: urbanEnd != null ? `${urbanEnd.toFixed(1)}%` : 'n/a',
      delta: urbanEnd != null && urbanStart != null
        ? `▲ ${Math.abs(urbanEnd - urbanStart).toFixed(1)}% since ${birthYear}`
        : 'urban land cover',
      color: '#90caf9',
    },
    {
      icon: '📍',
      label: 'Events detected',
      value: String((cityData.events || []).filter(e => e.year >= birthYear).length),
      delta: 'environmental events',
      color: '#ffcc80',
    },
  ].slice(0, 4);
}

/** Helper to draw a rounded rectangle (filled). */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}