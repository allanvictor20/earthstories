// src/components/DataVizPanel.jsx
// Module 7 — Data Visualisation Panel
// Drop into: earthstories-frontend/src/components/DataVizPanel.jsx

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,22,40,0.92)',
      border: '1px solid rgba(100,180,100,0.3)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      color: '#e0f0e0',
    }}>
      <p style={{ margin: 0, fontWeight: 700, color: '#7ecb8f' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── NDVI Line Chart ───────────────────────────────────────────────────────────
function NdviChart({ cityData, birthYear }) {
  const ndviData = Object.entries(cityData.metrics?.ndvi_mean || {})
    .map(([year, val]) => ({ year: parseInt(year), ndvi: val ?? 0 }))
    .filter(d => d.ndvi > 0)
    .sort((a, b) => a.year - b.year);

  const minVal = Math.min(...ndviData.map(d => d.ndvi));
  const maxVal = Math.max(...ndviData.map(d => d.ndvi));
  const domain = [Math.max(0, minVal - 0.05), Math.min(1, maxVal + 0.05)];

  return (
    <div style={styles.chartPanel}>
      <div style={styles.chartHeader}>
        <span style={styles.chartIcon}>🌿</span>
        <div>
          <p style={styles.chartTitle}>Vegetation Health (NDVI)</p>
          <p style={styles.chartSubtitle}>{cityData.city} · 2001–2024</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={ndviData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E6B3C" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#1E6B3C" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: '#7a9090' }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            domain={domain}
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fontSize: 10, fill: '#7a9090' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={birthYear}
            stroke="#4fc3f7"
            strokeDasharray="4 2"
            label={{ value: 'Born', fill: '#4fc3f7', fontSize: 10, position: 'top' }}
          />
          <Area
            type="monotone"
            dataKey="ndvi"
            name="NDVI"
            stroke="#4caf81"
            strokeWidth={2}
            fill="url(#ndviGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#7ecb8f' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p style={styles.legend}>
        Higher values = more vegetation cover. Blue line marks your birth year.
      </p>
    </div>
  );
}

// ── Temperature Anomaly Chart ────────────────────────────────────────────────
function TempChart({ cityData, birthYear }) {
  const tempData = Object.entries(cityData.metrics?.temperature_anomaly || {})
    .map(([year, val]) => ({ year: parseInt(year), anomaly: val ?? 0 }))
    .sort((a, b) => a.year - b.year);

  const getColor = (val) => {
    if (val > 1.0) return '#e53935';
    if (val > 0.4) return '#ff7043';
    if (val > 0)   return '#ffa726';
    return '#42a5f5';
  };

  return (
    <div style={styles.chartPanel}>
      <div style={styles.chartHeader}>
        <span style={styles.chartIcon}>🌡️</span>
        <div>
          <p style={styles.chartTitle}>Temperature Anomaly</p>
          <p style={styles.chartSubtitle}>{cityData.city} · vs 2000–2010 baseline</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={tempData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e53935" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#e53935" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: '#7a9090' }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#7a9090' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
          <ReferenceLine
            x={birthYear}
            stroke="#4fc3f7"
            strokeDasharray="4 2"
            label={{ value: 'Born', fill: '#4fc3f7', fontSize: 10, position: 'top' }}
          />
          <Area
            type="monotone"
            dataKey="anomaly"
            name="°C above baseline"
            stroke="#ef5350"
            strokeWidth={2}
            fill="url(#tempGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#ef9a9a' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p style={styles.legend}>
        Degrees Celsius above the 2000–2010 average. Positive = warmer than baseline.
      </p>
    </div>
  );
}

// ── Events Timeline ───────────────────────────────────────────────────────────
const EVENT_ICONS = { heat: '🔥', drought: '🏜️', flood: '🌊', default: '📍' };
const EVENT_COLORS = { heat: '#ff7043', drought: '#fbc02d', flood: '#42a5f5', default: '#b0bec5' };

function EventsTimeline({ cityData, birthYear }) {
  const events = (cityData.events || [])
    .filter(e => e.year >= birthYear)
    .sort((a, b) => a.year - b.year);

  if (!events.length) {
    return (
      <div style={styles.chartPanel}>
        <div style={styles.chartHeader}>
          <span style={styles.chartIcon}>📅</span>
          <div>
            <p style={styles.chartTitle}>Events in Your Lifetime</p>
            <p style={styles.chartSubtitle}>{cityData.city} · {birthYear}–present</p>
          </div>
        </div>
        <p style={{ color: '#7a9090', fontSize: 13, padding: '12px 0' }}>
          No significant environmental events detected in the dataset for this period.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.chartPanel}>
      <div style={styles.chartHeader}>
        <span style={styles.chartIcon}>📅</span>
        <div>
          <p style={styles.chartTitle}>Events in Your Lifetime</p>
          <p style={styles.chartSubtitle}>{cityData.city} · {birthYear}–present</p>
        </div>
      </div>
      <div style={styles.timeline}>
        {events.map((event, i) => {
          const color = EVENT_COLORS[event.type] || EVENT_COLORS.default;
          const icon  = EVENT_ICONS[event.type]  || EVENT_ICONS.default;
          return (
            <div key={i} style={styles.timelineRow}>
              <div style={styles.timelineLine}>
                <div style={{ ...styles.timelineDot, background: color }} />
                {i < events.length - 1 && <div style={styles.timelineConnector} />}
              </div>
              <div style={styles.timelineContent}>
                <span style={{ ...styles.eventYear, color }}>{event.year}</span>
                <span style={styles.eventIcon}>{icon}</span>
                <span style={styles.eventDesc}>{event.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary Mini-Charts ───────────────────────────────────────────────────────
function SummaryPanel({ cityData, birthYear }) {
  const years = Object.keys(cityData.metrics?.ndvi_mean || {}).map(Number).sort();
  const firstYear = birthYear;
  const lastYear  = Math.max(...years);

  const getValue = (metric, year) =>
    cityData.metrics?.[metric]?.[String(year)] ?? null;

  const ndviStart  = getValue('ndvi_mean', firstYear);
  const ndviEnd    = getValue('ndvi_mean', lastYear);
  const tempStart  = getValue('temperature_anomaly', firstYear);
  const tempEnd    = getValue('temperature_anomaly', lastYear);
  const urbanStart = getValue('urban_cover_pct', firstYear);
  const urbanEnd   = getValue('urban_cover_pct', lastYear);

  const stats = [
    {
      label: 'Vegetation (NDVI)',
      from: ndviStart?.toFixed(3),
      to:   ndviEnd?.toFixed(3),
      delta: ndviEnd && ndviStart ? ((ndviEnd - ndviStart) * 100).toFixed(1) + '%' : 'n/a',
      positive: ndviEnd > ndviStart,
      icon: '🌿',
    },
    {
      label: 'Temp. Anomaly',
      from: tempStart != null ? `+${tempStart.toFixed(1)}°C` : 'n/a',
      to:   tempEnd   != null ? `+${tempEnd.toFixed(1)}°C`   : 'n/a',
      delta: tempEnd && tempStart ? `+${(tempEnd - tempStart).toFixed(1)}°C` : 'n/a',
      positive: !(tempEnd > tempStart),
      icon: '🌡️',
    },
    {
      label: 'Urban Cover',
      from: urbanStart != null ? `${urbanStart.toFixed(1)}%` : 'n/a',
      to:   urbanEnd   != null ? `${urbanEnd.toFixed(1)}%`   : 'n/a',
      delta: urbanEnd && urbanStart ? `+${(urbanEnd - urbanStart).toFixed(1)}%` : 'n/a',
      positive: null,
      icon: '🏙️',
    },
  ];

  return (
    <div style={styles.chartPanel}>
      <div style={styles.chartHeader}>
        <span style={styles.chartIcon}>📊</span>
        <div>
          <p style={styles.chartTitle}>Your Lifetime at a Glance</p>
          <p style={styles.chartSubtitle}>{cityData.city} · {birthYear}–{lastYear}</p>
        </div>
      </div>
      <div style={styles.summaryGrid}>
        {stats.map((s, i) => (
          <div key={i} style={styles.statCard}>
            <p style={styles.statIcon}>{s.icon}</p>
            <p style={styles.statLabel}>{s.label}</p>
            <div style={styles.statRow}>
              <span style={styles.statVal}>{s.from}</span>
              <span style={styles.statArrow}>→</span>
              <span style={styles.statVal}>{s.to}</span>
            </div>
            <p style={{
              ...styles.statDelta,
              color: s.positive === null ? '#b0bec5'
                   : s.positive ? '#4caf81' : '#ef5350',
            }}>
              {s.delta}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function DataVizPanel({ type, cityData, birthYear, activeYear }) {
  if (!cityData) return null;

  switch (type) {
    case 'ndvi':    return <NdviChart    cityData={cityData} birthYear={birthYear} />;
    case 'temp':    return <TempChart    cityData={cityData} birthYear={birthYear} />;
    case 'events':  return <EventsTimeline cityData={cityData} birthYear={birthYear} />;
    case 'summary': return <SummaryPanel cityData={cityData} birthYear={birthYear} />;
    default:        return null;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  chartPanel: {
    background: 'rgba(8,18,32,0.88)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '14px 16px',
    margin: '8px 0',
    color: '#d0e8d8',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  chartIcon: {
    fontSize: 22,
    lineHeight: 1,
  },
  chartTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: '#c8e6c9',
    letterSpacing: '0.02em',
  },
  chartSubtitle: {
    margin: 0,
    fontSize: 11,
    color: '#607d6b',
  },
  legend: {
    margin: '8px 0 0',
    fontSize: 10,
    color: '#546e60',
    fontStyle: 'italic',
  },
  // Timeline
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    paddingTop: 4,
  },
  timelineRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    minHeight: 40,
  },
  timelineLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 14,
    flexShrink: 0,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 3,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    background: 'rgba(255,255,255,0.1)',
    marginTop: 3,
  },
  timelineContent: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 5,
    paddingBottom: 10,
  },
  eventYear: {
    fontSize: 12,
    fontWeight: 700,
  },
  eventIcon: {
    fontSize: 13,
  },
  eventDesc: {
    fontSize: 12,
    color: '#9db8a8',
    lineHeight: 1.4,
  },
  // Summary grid
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 4,
  },
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: '10px 8px',
    textAlign: 'center',
  },
  statIcon:  { fontSize: 18, margin: '0 0 4px' },
  statLabel: { fontSize: 10, color: '#7a9090', margin: '0 0 6px', lineHeight: 1.3 },
  statRow:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statVal:   { fontSize: 11, color: '#c8e6c9', fontWeight: 600 },
  statArrow: { fontSize: 10, color: '#546e60' },
  statDelta: { fontSize: 11, fontWeight: 700, margin: '4px 0 0' },
};