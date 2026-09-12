import { useState } from 'react';

const AVAILABLE_CITIES = [
  { key: 'kampala',       name: 'Kampala, Uganda' },
  { key: 'nairobi',       name: 'Nairobi, Kenya' },
  { key: 'lagos',         name: 'Lagos, Nigeria' },
  { key: 'accra',         name: 'Accra, Ghana' },
  { key: 'dar_es_salaam', name: 'Dar es Salaam, Tanzania' },
  { key: 'cairo',         name: 'Cairo, Egypt' },
  { key: 'johannesburg',  name: 'Johannesburg, South Africa' },
  { key: 'addis_ababa',   name: 'Addis Ababa, Ethiopia' },
];

const MIN_BIRTH_YEAR = 1970;
// Keeps the range current instead of freezing at a hard-coded 2015.
const MAX_BIRTH_YEAR = new Date().getFullYear() - 8;

export default function Onboarding({ onSubmit }) {
  const [cityKey, setCityKey] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = event => {
    event.preventDefault();
    setError('');

    if (!cityKey || !birthYear) {
      setError('Please select a city and enter your birth year.');
      return;
    }

    const year = Number.parseInt(birthYear, 10);
    if (!Number.isFinite(year) || year < MIN_BIRTH_YEAR || year > MAX_BIRTH_YEAR) {
      setError(`Please enter a birth year between ${MIN_BIRTH_YEAR} and ${MAX_BIRTH_YEAR}.`);
      return;
    }

    onSubmit({ cityKey, birthYear: year });
  };

  return (
    <div className="onboarding">
      {/* A form, so Enter submits and browsers apply native validation. */}
      <form className="onboarding-card" onSubmit={handleSubmit}>
        <h1>Earth Stories</h1>
        <p className="tagline">What happened to your home while you were alive?</p>

        <div className="field">
          <label htmlFor="city-select">Your city</label>
          <select
            id="city-select"
            value={cityKey}
            onChange={e => setCityKey(e.target.value)}
          >
            <option value="">Select a city...</option>
            {AVAILABLE_CITIES.map(c => (
              <option key={c.key} value={c.key}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="birth-year">Your birth year</label>
          <input
            id="birth-year"
            type="number"
            min={MIN_BIRTH_YEAR}
            max={MAX_BIRTH_YEAR}
            placeholder="e.g. 1998"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            aria-describedby={error ? 'onboarding-error' : undefined}
          />
        </div>

        {error && <p className="error" id="onboarding-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="submit-btn"
          disabled={!cityKey || !birthYear}
        >
          Tell My Story
        </button>
      </form>
    </div>
  );
}
