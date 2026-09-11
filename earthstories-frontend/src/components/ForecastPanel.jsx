import { useEffect, useState } from 'react';
import { buildForecast, fetchNasaBaseline } from '../services/climateForecast';

const formatValue = (value, digits = 1) => value == null ? 'n/a' : value.toFixed(digits);

export default function ForecastPanel({ cityData, targetYear }) {
  const [nasaBaseline, setNasaBaseline] = useState(null);
  const [nasaStatus, setNasaStatus] = useState('loading');
  const forecast = buildForecast(cityData, targetYear);

  useEffect(() => {
    let active = true;
    fetchNasaBaseline(cityData)
      .then(data => {
        if (active) {
          setNasaBaseline(data);
          setNasaStatus('ready');
        }
      })
      .catch(() => {
        if (active) setNasaStatus('unavailable');
      });
    return () => { active = false; };
  }, [cityData]);

  const sourceRange = forecast.temperature?.sourceStart && forecast.temperature?.sourceEnd
    ? `${forecast.temperature.sourceStart}-${forecast.temperature.sourceEnd}`
    : 'available history';
  const warmer = forecast.temperature?.slope > 0;
  const greener = forecast.ndvi?.slope > 0;
  const moreUrban = forecast.urban?.slope > 0;

  return (
    <div style={styles.panel}>
      <div style={styles.eyebrow}>Trend projection · age 50</div>
      <h3 style={styles.title}>Your Next Chapter</h3>
      <p style={styles.intro}>
        If the recent direction continues, this is one possible view of {cityData.city} in {targetYear}.
        It is a scenario, not a certainty.
      </p>

      <div style={styles.grid}>
        <ForecastCard label="Mean temperature" value={`${formatValue(forecast.temperature?.value)}°C`} />
        <ForecastCard label="Temperature anomaly" value={`${forecast.temperatureAnomaly?.value >= 0 ? '+' : ''}${formatValue(forecast.temperatureAnomaly?.value)}°C`} />
        <ForecastCard label="Vegetation index" value={formatValue(forecast.ndvi?.value, 3)} />
        <ForecastCard label="Urban cover" value={`${formatValue(forecast.urban?.value)}%`} />
      </div>

      <div style={styles.futureEffects}>
        <p style={styles.effectsTitle}>What this possible future could affect</p>
        <ForecastEffect icon="🌡" title="People and health" text={warmer ? 'More heat can increase heat exposure and the need for shade, water, cooling, and heat-safe work and school days.' : 'A cooler trend could reduce some heat pressure, but individual hot years can still happen.'} />
        <ForecastEffect icon="🌿" title="Plants and wildlife" text={greener ? 'A stronger vegetation signal could provide more shade and habitat, depending on which plants are growing.' : 'A weaker vegetation signal could mean less shade, more exposed soil, and tougher conditions for urban nature.'} />
        <ForecastEffect icon="🏙" title="The city" text={moreUrban ? 'More built-up land can store heat and change how rain moves through streets, drains, and waterways.' : 'A slower urban trend could leave more room for open land, but planning choices still shape local resilience.'} />
        <ForecastEffect icon="🌍" title="The wider Earth" text="Local land choices connect to larger water, carbon, habitat, and climate systems. This projection is a prompt for choices, not a verdict." />
      </div>

      <div style={styles.sourceRow}>
        <span style={styles.sourceDot} data-status={nasaStatus} />
        {nasaStatus === 'ready'
          ? `NASA POWER baseline: ${formatValue(nasaBaseline.temperature)}°C in ${nasaBaseline.year}`
          : nasaStatus === 'loading'
            ? 'Connecting to NASA POWER baseline...'
            : 'NASA POWER baseline unavailable; local data projection shown'}
      </div>
      <p style={styles.note}>
        Projection uses a linear continuation of {sourceRange} in the city record. NASA POWER is used as a live reference point, not as a claim about the future.
      </p>
    </div>
  );
}

function ForecastCard({ label, value }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardLabel}>{label}</span>
      <strong style={styles.cardValue}>{value}</strong>
    </div>
  );
}

function ForecastEffect({ icon, title, text }) {
  return (
    <div style={styles.effect}>
      <span style={styles.effectIcon}>{icon}</span>
      <div><strong style={styles.effectTitle}>{title}</strong><p style={styles.effectText}>{text}</p></div>
    </div>
  );
}

const styles = {
  panel: {
    background: 'linear-gradient(145deg, rgba(20,35,39,0.96), rgba(27,54,48,0.94))',
    border: '1px solid rgba(126,203,143,0.35)',
    borderRadius: 10,
    padding: '16px 18px',
    margin: '8px 0',
    color: '#e5f4e7',
  },
  eyebrow: { color: '#8bd39b', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' },
  title: { margin: '5px 0 7px', fontSize: 22, color: '#f4fff3' },
  intro: { margin: '0 0 14px', color: '#bdd8c2', fontSize: 12, lineHeight: 1.55 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 },
  card: { background: 'rgba(255,255,255,0.07)', borderRadius: 7, padding: '9px 10px' },
  cardLabel: { display: 'block', color: '#9cbca3', fontSize: 10, lineHeight: 1.25, marginBottom: 4 },
  cardValue: { color: '#f4fff3', fontSize: 16 },
  sourceRow: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 13, color: '#c4e4ca', fontSize: 10 },
  sourceDot: { width: 7, height: 7, borderRadius: '50%', background: '#f2b84b', flexShrink: 0 },
  note: { margin: '10px 0 0', color: '#87a68f', fontSize: 10, lineHeight: 1.45, fontStyle: 'italic' },
  futureEffects: { marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(139,211,155,0.18)' },
  effectsTitle: { margin: '0 0 8px', color: '#d6eed8', fontSize: 11, fontWeight: 700 },
  effect: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 8px', marginTop: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 6 },
  effectIcon: { fontSize: 16, lineHeight: 1 },
  effectTitle: { display: 'block', color: '#d6eed8', fontSize: 10, marginBottom: 2 },
  effectText: { margin: 0, color: '#a8c0ad', fontSize: 10, lineHeight: 1.35 },
};
