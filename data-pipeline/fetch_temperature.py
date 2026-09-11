"""MODIS land surface temperature and anomaly vs a fixed baseline."""
import ee

from config.runner import initialize_ee, run_for_all_cities
from config.settings import BASELINE_END, BASELINE_START, TEMPERATURE_YEARS

LST_SCALE = 0.02
KELVIN_OFFSET = 273.15


def _mean_lst(bbox, start, end):
    return (ee.ImageCollection('MODIS/061/MOD11A2')
            .filterDate(start, end)
            .filterBounds(bbox)
            .select('LST_Day_1km')
            .mean()
            .reduceRegion(ee.Reducer.mean(), bbox, 1000)
            .getInfo().get('LST_Day_1km', None))


def _to_celsius(value):
    # `if value` treated a raw reading of 0 as missing.
    return None if value is None else value * LST_SCALE - KELVIN_OFFSET


def fetch_temperature_for_city(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    baseline_c = _to_celsius(_mean_lst(bbox, BASELINE_START, BASELINE_END))
    print(f'  {city_key} baseline temp: '
          f'{round(baseline_c, 2) if baseline_c is not None else "N/A"}°C')

    results = {}
    for year in TEMPERATURE_YEARS:
        print(f'  {city_key} temperature {year}...')
        temp_c = _to_celsius(_mean_lst(bbox, f'{year}-01-01', f'{year}-12-31'))

        if temp_c is None:
            results[str(year)] = {'mean_celsius': None, 'anomaly_celsius': None}
            continue

        results[str(year)] = {
            'mean_celsius': round(temp_c, 2),
            'anomaly_celsius': round(temp_c - baseline_c, 2) if baseline_c is not None else None,
        }

    return results


if __name__ == '__main__':
    initialize_ee()
    run_for_all_cities('temperature', fetch_temperature_for_city)
