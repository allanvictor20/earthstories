"""Assemble the per-city JSON profiles the frontend consumes."""
import json

from config.cities import CITIES
from config.settings import OUTPUT_DIR, PROFILE_DIR

# Detection tuning.
#
# Absolute thresholds do not transfer between cities: Cairo's NDVI varies by
# about +/-0.005 across the whole record while Kampala's varies by +/-0.03, so a
# fixed 0.05 cutoff fires constantly in one city and never in the other. Events
# are therefore defined relative to each city's OWN variability: a year is an
# event when it departs from that city's normal by more than SIGMA_MULTIPLIER
# standard deviations. A small relative floor stops a near-flat record from
# flagging rounding noise.
SIGMA_MULTIPLIER = 2.0
RELATIVE_FLOOR = 0.01             # change must also be >=1% of the level
HEAT_ANOMALY_C = 1.5              # absolute °C, kept as a climatological rule
TRAILING_WINDOW = 5               # years used for the NDVI rolling mean


def _numeric(mapping):
    """{'2001': 0.68, '2002': None} -> {2001: 0.68} (int years, no nulls)."""
    out = {}
    for year, value in (mapping or {}).items():
        try:
            year_int = int(year)
        except (TypeError, ValueError):
            continue
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            out[year_int] = float(value)
    return out


def _nested(mapping, field):
    return {year: entry.get(field) for year, entry in (mapping or {}).items()
            if isinstance(entry, dict)}


def _stdev(values):
    values = list(values)
    if len(values) < 3:
        return 0.0
    mean = sum(values) / len(values)
    return (sum((v - mean) ** 2 for v in values) / (len(values) - 1)) ** 0.5


def _mean(values):
    values = list(values)
    return sum(values) / len(values) if values else 0.0


def _year_on_year(series):
    """[(year, change)] for consecutive years present in the series."""
    return [(year, series[year] - series[year - 1])
            for year in sorted(series) if year - 1 in series]


def _is_outlier(change, all_changes, level):
    """True when `change` is large for this city and not just rounding noise."""
    sigma = _stdev(all_changes)
    if sigma == 0:
        return False
    return (abs(change) >= SIGMA_MULTIPLIER * sigma
            and abs(change) >= RELATIVE_FLOOR * abs(level))


def _median(values):
    values = sorted(values)
    if not values:
        return 0.0
    mid = len(values) // 2
    if len(values) % 2:
        return values[mid]
    return (values[mid - 1] + values[mid]) / 2


def _is_trend_outlier(change, all_changes, level):
    """
    Stricter test for steadily-trending metrics such as urban cover.

    A city that builds a little more every year has many years above 2 sigma
    simply because the growth accelerates; calling nine of them "rapid growth"
    describes the trend, not an event. Requiring twice the city's median annual
    change keeps only the years that genuinely stand out.
    """
    if not _is_outlier(change, all_changes, level):
        return False
    typical = _median([abs(c) for c in all_changes])
    return typical == 0 or abs(change) >= 2 * typical


def detect_events(temp_data, water_data, ndvi_data=None, landcover_data=None):
    """
    Find years where the record shifted noticeably for THIS city.

    Covers heat, drought and — new here — water recovery, greening/browning,
    rapid urbanisation and forest loss, so Chapter 4 has more than a single
    event to work with in most cities.
    """
    events = []

    anomalies = _numeric(_nested(temp_data, 'anomaly_celsius'))
    water = _numeric(water_data)
    ndvi = _numeric(ndvi_data)
    urban = _numeric(_nested(landcover_data, 'urban_pct'))
    forest = _numeric(_nested(landcover_data, 'forest_pct'))

    # ── Heat: an absolute climatological threshold, plus years that are
    # exceptional against this city's own spread of anomalies.
    anomaly_values = list(anomalies.values())
    anomaly_mean = _mean(anomaly_values)
    anomaly_sigma = _stdev(anomaly_values)
    for year, anomaly in sorted(anomalies.items()):
        exceptional = (anomaly_sigma > 0
                       and anomaly - anomaly_mean >= SIGMA_MULTIPLIER * anomaly_sigma)
        if anomaly > HEAT_ANOMALY_C or exceptional:
            events.append({
                'year': year, 'type': 'heat',
                'description': f'Unusually hot year ({anomaly:+.1f}°C against the local baseline)',
            })

    # ── Surface water. Previously compared year strings ("2004" > "2003"),
    # which worked only by accident for 4-digit years.
    water_changes = _year_on_year(water)
    water_level = _mean(water.values())
    for year, change in water_changes:
        if not _is_outlier(change, [c for _, c in water_changes], water_level):
            continue
        if change < 0:
            events.append({
                'year': year, 'type': 'drought',
                'description': f'Marked surface water loss ({change:.1f} km²)',
            })
        else:
            events.append({
                'year': year, 'type': 'flood',
                'description': f'Surface water rose sharply (+{change:.1f} km²)',
            })

    # ── Vegetation, measured against its own trailing mean.
    ndvi_level = _mean(ndvi.values())
    deviations = []
    for year, value in sorted(ndvi.items()):
        window = [ndvi[y] for y in range(year - TRAILING_WINDOW, year) if y in ndvi]
        if len(window) < TRAILING_WINDOW:
            continue
        deviations.append((year, value - _mean(window)))

    for year, shift in deviations:
        if not _is_outlier(shift, [d for _, d in deviations], ndvi_level):
            continue
        if shift > 0:
            events.append({
                'year': year, 'type': 'greening',
                'description': f'Vegetation rose above its recent average ({shift:+.3f} NDVI)',
            })
        else:
            events.append({
                'year': year, 'type': 'browning',
                'description': f'Vegetation fell below its recent average ({shift:+.3f} NDVI)',
            })

    # ── Built-up land and forest cover.
    urban_changes = _year_on_year(urban)
    urban_level = _mean(urban.values())
    for year, change in urban_changes:
        if change > 0 and _is_trend_outlier(change, [c for _, c in urban_changes], urban_level):
            events.append({
                'year': year, 'type': 'urban_growth',
                'description': f'Rapid growth in built-up land (+{change:.1f} percentage points)',
            })

    forest_changes = _year_on_year(forest)
    forest_level = _mean(forest.values())
    for year, change in forest_changes:
        if change < 0 and _is_trend_outlier(change, [c for _, c in forest_changes], forest_level):
            events.append({
                'year': year, 'type': 'forest_loss',
                'description': f'Notable loss of forest cover ({change:.1f} percentage points)',
            })

    # Deduplicate (a year can qualify under both the absolute and relative
    # heat rules) and order for the timeline.
    seen = set()
    unique = []
    for event in sorted(events, key=lambda e: (e['year'], e['type'])):
        marker = (event['year'], event['type'])
        if marker in seen:
            continue
        seen.add(marker)
        unique.append(event)
    return unique


def load(prefix, city_key):
    path = OUTPUT_DIR / f'{prefix}_{city_key}.json'
    if not path.exists():
        raise FileNotFoundError(
            f'{path} is missing. Run the fetch scripts first '
            f'(see data-pipeline/README or the project README).'
        )
    return json.loads(path.read_text())


def build_profile(city_key, city_meta):
    ndvi = load('ndvi', city_key)
    landcover = load('landcover', city_key)
    temp = load('temperature', city_key)
    water = load('water', city_key)

    def series(source, field=None):
        return {
            year: (source[year].get(field) if field else source[year])
            for year in sorted(source)
        }

    return {
        'city': city_meta['name'],
        'city_key': city_key,
        'lat': city_meta['lat'],
        'lon': city_meta['lon'],
        'metrics': {
            'ndvi_mean': series(ndvi),
            'temperature_anomaly': series(temp, 'anomaly_celsius'),
            'temperature_mean': series(temp, 'mean_celsius'),
            'urban_cover_pct': series(landcover, 'urban_pct'),
            'forest_cover_pct': series(landcover, 'forest_pct'),
            'surface_water_km2': series(water),
        },
        'events': detect_events(temp, water, ndvi, landcover),
    }


def main():
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    for city_key, city_meta in CITIES.items():
        print(f'Building profile: {city_meta["name"]}...')
        profile = build_profile(city_key, city_meta)
        out_path = PROFILE_DIR / f'{city_key}.json'
        out_path.write_text(json.dumps(profile, indent=2))
        print(f'  Saved {out_path.name} ({len(profile["events"])} events)')

    print('\nAll city profiles built.')


if __name__ == '__main__':
    main()
