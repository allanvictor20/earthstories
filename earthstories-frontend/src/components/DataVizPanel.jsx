import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  metricSeries,
  valueAt,
  formatChange,
  formatSigned,
  displayNumber,
} from '../utils/metrics';

function PanelHeader({ icon, title, subtitle }) {
  return (
    <div className="viz__header">
      <span className="viz__icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="viz__title">{title}</p>
        <p className="viz__subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

function InsightsPanel({ cityData, birthYear }) {
  const temperature = metricSeries(cityData, 'temperature_mean');
  const anomaly = metricSeries(cityData, 'temperature_anomaly');
  const vegetation = metricSeries(cityData, 'ndvi_mean');
  const urban = metricSeries(cityData, 'urban_cover_pct');

  const start = temperature[0]?.year;
  const end = temperature.at(-1)?.year;
  const startTemp = valueAt(temperature, birthYear)?.value;
  const endTemp = temperature.at(-1)?.value;
  const warmest = anomaly.reduce((best, p) => (p.value > best.value ? p : best), anomaly[0]);
  const coolest = anomaly.reduce((best, p) => (p.value < best.value ? p : best), anomaly[0]);
  const startGreen = valueAt(vegetation, birthYear)?.value;
  const endGreen = vegetation.at(-1)?.value;
  const startUrban = valueAt(urban, birthYear)?.value;
  const endUrban = urban.at(-1)?.value;

  const insights = [
    { icon: '🌡', title: 'Temperature', text: `${formatChange(endTemp - startTemp, '°C')} in the annual mean between the archive start and latest year.` },
    { icon: '🔥', title: 'Biggest warm year', text: `${warmest?.year ?? 'n/a'} was ${formatSigned(warmest?.value, '°C')} vs the local baseline.` },
    { icon: '🌿', title: 'Green cover', text: `${formatChange((endGreen - startGreen) * 100, ' percentage points')} in the vegetation signal.` },
    { icon: '🏙', title: 'Built-up land', text: `${formatChange(endUrban - startUrban, ' percentage points')} in mapped urban cover.` },
  ];

  return (
    <div className="viz">
      <PanelHeader icon="🔎" title="Read the picture in plain language" subtitle={`${cityData.city} · measured ${start}–${end}`} />
      <p className="viz__explainer">
        The satellite image shows land and water. These four signals translate what the image and the sensor record mean on the ground.
      </p>
      <div className="insight-grid">
        {insights.map(insight => (
          <div className="insight-card" key={insight.title}>
            <span className="insight-card__icon" aria-hidden="true">{insight.icon}</span>
            <div>
              <strong>{insight.title}</strong>
              <p>{insight.text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="viz__legend">
        Warmest year: {warmest?.year ?? 'n/a'} · coolest year: {coolest?.year ?? 'n/a'}. Hover the charts for the exact annual reading.
      </p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="viz-tooltip">
      <p className="viz-tooltip__label">{label}</p>
      {payload.map((p, i) => (
        <p className="viz-tooltip__value" key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  );
};

function NdviChart({ cityData, birthYear }) {
  // Previously filtered on `ndvi > 0`, which silently dropped legitimate
  // zero or negative readings (bare ground, water).
  const series = metricSeries(cityData, 'ndvi_mean');
  const ndviData = series.map(p => ({ year: p.year, ndvi: p.value }));

  if (!ndviData.length) {
    return (
      <div className="viz">
        <PanelHeader icon="🌿" title="Vegetation Health (NDVI)" subtitle={cityData.city} />
        <p className="viz__empty">No vegetation readings available for this city.</p>
      </div>
    );
  }

  const values = ndviData.map(d => d.ndvi);
  const domain = [
    Math.max(-1, Math.min(...values) - 0.05),
    Math.min(1, Math.max(...values) + 0.05),
  ];

  return (
    <div className="viz">
      <PanelHeader
        icon="🌿"
        title="Vegetation Health (NDVI)"
        subtitle={`${cityData.city} · ${ndviData[0].year}–${ndviData.at(-1).year}`}
      />
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={ndviData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E6B3C" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#1E6B3C" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#8fa89a' }} tickLine={false} interval={4} />
          <YAxis
            domain={domain}
            tickFormatter={v => v.toFixed(2)}
            tick={{ fontSize: 10, fill: '#8fa89a' }}
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
            type="monotone" dataKey="ndvi" name="NDVI" stroke="#4caf81" strokeWidth={2}
            fill="url(#ndviGrad)" dot={false} activeDot={{ r: 4, fill: '#7ecb8f' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="viz__legend">Higher values = more vegetation cover. Blue line marks your birth year.</p>
    </div>
  );
}

function TempChart({ cityData, birthYear }) {
  const tempData = metricSeries(cityData, 'temperature_anomaly')
    .map(p => ({ year: p.year, anomaly: p.value }));

  if (!tempData.length) {
    return (
      <div className="viz">
        <PanelHeader icon="🌡️" title="Temperature Anomaly" subtitle={cityData.city} />
        <p className="viz__empty">No temperature readings available for this city.</p>
      </div>
    );
  }

  return (
    <div className="viz">
      <PanelHeader
        icon="🌡️"
        title="Temperature Anomaly"
        subtitle={`${cityData.city} · vs 2000–2010 baseline`}
      />
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={tempData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e53935" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#e53935" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#8fa89a' }} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: '#8fa89a' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
          <ReferenceLine
            x={birthYear}
            stroke="#4fc3f7"
            strokeDasharray="4 2"
            label={{ value: 'Born', fill: '#4fc3f7', fontSize: 10, position: 'top' }}
          />
          <Area
            type="monotone" dataKey="anomaly" name="°C above baseline" stroke="#ef5350"
            strokeWidth={2} fill="url(#tempGrad)" dot={false} activeDot={{ r: 4, fill: '#ef9a9a' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="viz__legend">
        Degrees Celsius above the 2000–2010 average. Positive = warmer than baseline.
      </p>
    </div>
  );
}

const EVENT_ICONS = {
  heat: '🔥', drought: '🏜️', flood: '🌊',
  greening: '🌱', browning: '🍂', urban_growth: '🏗️', forest_loss: '🪓',
  default: '📍',
};
const EVENT_COLORS = {
  heat: '#ff7043', drought: '#fbc02d', flood: '#42a5f5',
  greening: '#66bb6a', browning: '#bf8f4a', urban_growth: '#ab91d9', forest_loss: '#8d6e63',
  default: '#b0bec5',
};

function EventsTimeline({ cityData, birthYear }) {
  const events = (cityData.events || [])
    .filter(e => e.year >= birthYear)
    .sort((a, b) => a.year - b.year);

  const header = (
    <PanelHeader
      icon="📅"
      title="Events in Your Lifetime"
      subtitle={`${cityData.city} · ${birthYear}–present`}
    />
  );

  if (!events.length) {
    return (
      <div className="viz">
        {header}
        <p className="viz__empty">
          No significant environmental events detected in the dataset for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="viz">
      {header}
      <div className="timeline">
        {events.map((event, i) => {
          const color = EVENT_COLORS[event.type] || EVENT_COLORS.default;
          const icon = EVENT_ICONS[event.type] || EVENT_ICONS.default;
          return (
            <div className="timeline__row" key={`${event.year}-${event.type}-${i}`}>
              <div className="timeline__rail">
                <div className="timeline__dot" style={{ background: color }} />
                {i < events.length - 1 && <div className="timeline__connector" />}
              </div>
              <div className="timeline__content">
                <span className="timeline__year" style={{ color }}>{event.year}</span>
                <span className="timeline__icon" aria-hidden="true">{icon}</span>
                <span className="timeline__desc">{event.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryPanel({ cityData, birthYear }) {
  const ndvi = metricSeries(cityData, 'ndvi_mean');
  const years = ndvi.map(p => p.year);
  if (!years.length) return null;

  const firstYear = years.find(year => year >= birthYear) ?? years[0];
  const lastYear = years.at(-1);
  const read = (key, year) => valueAt(metricSeries(cityData, key), year)?.value ?? null;

  const ndviStart = read('ndvi_mean', firstYear);
  const ndviEnd = read('ndvi_mean', lastYear);
  const tempStart = read('temperature_anomaly', firstYear);
  const tempEnd = read('temperature_anomaly', lastYear);
  const urbanStart = read('urban_cover_pct', firstYear);
  const urbanEnd = read('urban_cover_pct', lastYear);

  const stats = [
    {
      label: 'Vegetation (NDVI)',
      from: displayNumber(ndviStart, 3),
      to: displayNumber(ndviEnd, 3),
      delta: formatChange((ndviEnd - ndviStart) * 100, ' pts'),
      tone: ndviEnd > ndviStart ? 'up' : 'down',
      icon: '🌿',
    },
    {
      // These used to hard-code a "+", printing "+-0.4°C" for cooler years.
      label: 'Temp. Anomaly',
      from: formatSigned(tempStart, '°C'),
      to: formatSigned(tempEnd, '°C'),
      delta: formatChange(tempEnd - tempStart, '°C'),
      tone: tempEnd > tempStart ? 'down' : 'up',
      icon: '🌡️',
    },
    {
      label: 'Urban Cover',
      from: displayNumber(urbanStart, 1, '%'),
      to: displayNumber(urbanEnd, 1, '%'),
      delta: formatChange(urbanEnd - urbanStart, '%'),
      tone: 'neutral',
      icon: '🏙️',
    },
  ];

  return (
    <div className="viz">
      <PanelHeader
        icon="📊"
        title="Your Lifetime at a Glance"
        subtitle={`${cityData.city} · ${firstYear}–${lastYear}`}
      />
      <div className="summary-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <p className="stat-card__icon" aria-hidden="true">{s.icon}</p>
            <p className="stat-card__label">{s.label}</p>
            <div className="stat-card__row">
              <span className="stat-card__value">{s.from}</span>
              <span className="stat-card__arrow" aria-hidden="true">→</span>
              <span className="stat-card__value">{s.to}</span>
            </div>
            <p className={`stat-card__delta stat-card__delta--${s.tone}`}>{s.delta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataVizPanel({ type, cityData, birthYear }) {
  if (!cityData) return null;

  switch (type) {
    case 'insights': return <InsightsPanel cityData={cityData} birthYear={birthYear} />;
    case 'ndvi':     return <NdviChart cityData={cityData} birthYear={birthYear} />;
    case 'temp':     return <TempChart cityData={cityData} birthYear={birthYear} />;
    case 'events':   return <EventsTimeline cityData={cityData} birthYear={birthYear} />;
    case 'summary':  return <SummaryPanel cityData={cityData} birthYear={birthYear} />;
    default:         return null;
  }
}
