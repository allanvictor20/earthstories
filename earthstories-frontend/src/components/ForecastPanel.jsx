import { useEffect, useState } from 'react';
import { buildForecast, fetchNasaBaseline } from '../services/climateForecast';
import { displayNumber, formatSigned } from '../utils/metrics';

export default function ForecastPanel({ cityData, targetYear }) {
  const [nasaBaseline, setNasaBaseline] = useState(null);
  const [nasaStatus, setNasaStatus] = useState('loading');
  const forecast = buildForecast(cityData, targetYear);

  useEffect(() => {
    const controller = new AbortController();

    fetchNasaBaseline(cityData, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setNasaBaseline(data);
        setNasaStatus('ready');
      })
      .catch(err => {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        setNasaStatus('unavailable');
      });

    return () => controller.abort();
  }, [cityData]);

  const sourceRange = forecast.temperature?.sourceStart && forecast.temperature?.sourceEnd
    ? `${forecast.temperature.sourceStart}-${forecast.temperature.sourceEnd}`
    : 'available history';
  const warmer = forecast.temperature?.slope > 0;
  const greener = forecast.ndvi?.slope > 0;
  const moreUrban = forecast.urban?.slope > 0;

  return (
    <div className="forecast">
      <div className="forecast__eyebrow">Trend projection · age 50</div>
      <h3 className="forecast__title">Your Next Chapter</h3>
      <p className="forecast__intro">
        If the recent direction continues, this is one possible view of {cityData.city} in {targetYear}.
        It is a scenario, not a certainty.
      </p>

      <div className="forecast__grid">
        <ForecastCard label="Mean temperature" projection={forecast.temperature} unit="°C" />
        <ForecastCard label="Temperature anomaly" projection={forecast.temperatureAnomaly} unit="°C" signed />
        <ForecastCard label="Vegetation index" projection={forecast.ndvi} digits={3} />
        <ForecastCard label="Urban cover" projection={forecast.urban} unit="%" />
      </div>

      <div className="forecast__effects">
        <p className="forecast__effects-title">What this possible future could affect</p>
        <ForecastEffect
          icon="🌡" title="People and health"
          text={warmer
            ? 'More heat can increase heat exposure and the need for shade, water, cooling, and heat-safe work and school days.'
            : 'A cooler trend could reduce some heat pressure, but individual hot years can still happen.'}
        />
        <ForecastEffect
          icon="🌿" title="Plants and wildlife"
          text={greener
            ? 'A stronger vegetation signal could provide more shade and habitat, depending on which plants are growing.'
            : 'A weaker vegetation signal could mean less shade, more exposed soil, and tougher conditions for urban nature.'}
        />
        <ForecastEffect
          icon="🏙" title="The city"
          text={moreUrban
            ? 'More built-up land can store heat and change how rain moves through streets, drains, and waterways.'
            : 'A slower urban trend could leave more room for open land, but planning choices still shape local resilience.'}
        />
        <ForecastEffect
          icon="🌍" title="The wider Earth"
          text="Local land choices connect to larger water, carbon, habitat, and climate systems. This projection is a prompt for choices, not a verdict."
        />
      </div>

      <div className="forecast__source">
        <span className="forecast__source-dot" data-status={nasaStatus} />
        {nasaStatus === 'ready' && nasaBaseline
          ? `NASA POWER baseline: ${displayNumber(nasaBaseline.temperature, 1, '°C')} in ${nasaBaseline.year}`
          : nasaStatus === 'loading'
            ? 'Connecting to NASA POWER baseline...'
            : 'NASA POWER baseline unavailable; local data projection shown'}
      </div>

      <p className="forecast__note">
        Projection is a least-squares fit over {sourceRange} in the city record, shown with a range
        rather than a single number. NASA POWER is used as a live reference point, not as a claim
        about the future.
      </p>
    </div>
  );
}

function ForecastCard({ label, projection, unit = '', digits = 1, signed = false }) {
  if (!projection) {
    return (
      <div className="forecast-card">
        <span className="forecast-card__label">{label}</span>
        <strong className="forecast-card__value">n/a</strong>
        <span className="forecast-card__caveat">Not enough measured years to project.</span>
      </div>
    );
  }

  const format = value => (signed
    ? formatSigned(value, unit, digits)
    : displayNumber(value, digits, unit));

  return (
    <div className="forecast-card">
      <span className="forecast-card__label">{label}</span>
      <strong className="forecast-card__value">{format(projection.value)}</strong>
      <span className="forecast-card__range">
        range {format(projection.value - projection.margin)} to {format(projection.value + projection.margin)}
      </span>
      {!projection.reliable && (
        <span className="forecast-card__caveat">
          The record is too varied year to year to project this confidently.
        </span>
      )}
    </div>
  );
}

function ForecastEffect({ icon, title, text }) {
  return (
    <div className="forecast-effect">
      <span className="forecast-effect__icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
