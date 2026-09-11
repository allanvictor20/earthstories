"""Tests for the satellite event detector."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build_city_profile import detect_events  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def temps(**by_year):
    return {year: {'anomaly_celsius': value} for year, value in by_year.items()}


def landcover(urban=None, forest=None):
    years = set(urban or {}) | set(forest or {})
    return {
        year: {
            'urban_pct': (urban or {}).get(year),
            'forest_pct': (forest or {}).get(year),
        }
        for year in years
    }


def types_in(events):
    return {event['type'] for event in events}


def flat(start, end, value):
    return {str(year): value for year in range(start, end)}


def test_detects_hot_year_above_absolute_threshold():
    events = detect_events(temps(**{'2015': 1.8, '2016': 0.2}), {})
    assert [e['year'] for e in events] == [2015]
    assert events[0]['type'] == 'heat'


def test_absolute_heat_rule_excludes_the_threshold_itself():
    # A high-variance record, so 1.5 is not exceptional for this city either
    # and only the absolute `> 1.5` rule could fire.
    record = {str(year): (-2.5 if year % 2 else 2.5) for year in range(2001, 2021)}
    record['2015'] = 1.5
    assert 2015 not in [e['year'] for e in detect_events(temps(**record), {})]


def test_detects_a_hot_year_that_is_exceptional_for_this_city():
    # Cairo never exceeds +1.5°C, so an absolute-only rule found nothing there.
    record = {str(year): 0.0 for year in range(2001, 2021)}
    record['2015'] = 0.9
    events = detect_events(temps(**record), {})
    assert [e['year'] for e in events] == [2015]


def test_detects_water_loss_and_gain_relative_to_the_citys_own_range():
    water = flat(2001, 2021, 200.0)
    water['2011'] = 150.0   # a big drop
    water['2012'] = 200.0   # and a big recovery
    assert {'drought', 'flood'} <= types_in(detect_events({}, water))


def test_water_years_compare_numerically_not_as_strings():
    # The old code guarded on `year > '2003'`, a string comparison that only
    # worked by accident for 4-digit years.
    water = flat(2001, 2021, 200.0)
    water['2002'] = 150.0
    events = [e for e in detect_events({}, water) if e['type'] == 'drought']
    assert [e['year'] for e in events] == [2002]


def test_skips_water_year_with_missing_neighbour():
    assert detect_events({}, {'2010': 200.0, '2012': 100.0}) == []


def test_ignores_rounding_noise_in_a_near_flat_record():
    water = flat(2001, 2021, 200.0)
    water['2011'] = 200.001
    assert detect_events({}, water) == []


def test_detects_greening_and_browning_against_trailing_mean():
    ndvi = flat(2001, 2021, 0.50)
    ndvi['2010'] = 0.60
    ndvi['2015'] = 0.40
    found = types_in(detect_events({}, {}, ndvi))
    assert 'greening' in found
    assert 'browning' in found


def test_needs_a_full_window_before_flagging_ndvi():
    assert detect_events({}, {}, {'2001': 0.5, '2002': 0.9}) == []


def test_scales_to_a_low_variance_city():
    """A desert city's small shifts should still register."""
    # Cairo-like: NDVI around 0.21 with tiny year-to-year movement.
    ndvi = {str(year): 0.21 for year in range(2001, 2021)}
    ndvi['2015'] = 0.19
    assert 'browning' in types_in(detect_events({}, {}, ndvi))


def test_detects_rapid_urban_growth_and_forest_loss():
    lc = landcover(
        urban={**flat(2001, 2021, 0), **{str(y): 8.0 + 0.1 * y for y in range(2001, 2021)}},
        forest={str(y): 20.0 for y in range(2001, 2021)},
    )
    lc['2015']['urban_pct'] = lc['2014']['urban_pct'] + 3.0
    lc['2015']['forest_pct'] = 16.0
    found = types_in(detect_events({}, {}, {}, lc))
    assert 'urban_growth' in found
    assert 'forest_loss' in found


def test_steady_growth_is_a_trend_not_a_series_of_events():
    """A city that builds a little more every year should not be all events."""
    urban = {str(year): 27.0 + 0.25 * (year - 2001) for year in range(2001, 2023)}
    events = detect_events({}, {}, {}, landcover(urban=urban))
    assert [e for e in events if e['type'] == 'urban_growth'] == []


def test_ignores_null_readings():
    lc = landcover(urban={'2010': None, '2011': 10.0})
    assert detect_events(temps(**{'2010': None}), {'2010': None}, {'2010': None}, lc) == []


def test_events_are_sorted_and_deduplicated():
    record = flat(2001, 2021, 0.0)
    record['2018'] = 2.5
    record['2012'] = 1.9
    events = detect_events(temps(**record), {})
    years = [e['year'] for e in events]
    assert years == sorted(years)
    assert len({(e['year'], e['type']) for e in events}) == len(events)


def test_every_city_profile_gets_at_least_one_event():
    """Regression: Cairo previously produced an empty Chapter 4."""
    profiles = sorted((REPO_ROOT / 'earthstories-frontend' / 'public' / 'data').glob('*.json'))
    assert profiles, 'no built city profiles found'
    for path in profiles:
        profile = json.loads(path.read_text())
        assert profile['events'], f'{path.stem} has no detected events'
        for event in profile['events']:
            assert {'year', 'type', 'description'} <= set(event)
