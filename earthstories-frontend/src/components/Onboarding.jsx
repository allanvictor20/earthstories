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

export default function Onboarding({ onSubmit }) {
  const [cityKey, setCityKey]     = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [error, setError]         = useState('');

  const handleSubmit = () => {
    setError('');
    if (!cityKey || !birthYear) {
      setError('Please select a city and enter your birth year.');
      return;
    }
    const year = parseInt(birthYear);
    if (year < 1970 || year > 2015) {
      setError('Please enter a birth year between 1970 and 2015.');
      return;
    }
    onSubmit({ cityKey, birthYear: year });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1>Earth Stories</h1>
        <p className="tagline">What happened to your home while you were alive?</p>

        <div className="field">
          <label>Your city</label>
          <select value={cityKey} onChange={e => setCityKey(e.target.value)}>
            <option value="">Select a city...</option>
            {AVAILABLE_CITIES.map(c => (
              <option key={c.key} value={c.key}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Your birth year</label>
          <input
            type="number"
            min="1970"
            max="2015"
            placeholder="e.g. 1998"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!cityKey || !birthYear}
        >
          Tell My Story
        </button>
      </div>
    </div>
  );
}