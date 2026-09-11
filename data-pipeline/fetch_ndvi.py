"""MODIS vegetation index (NDVI) per city, per year."""
import ee

from config.runner import initialize_ee, run_for_all_cities
from config.settings import NDVI_YEARS

NDVI_SCALE = 0.0001


def fetch_ndvi_for_city(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    results = {}

    for year in NDVI_YEARS:
        print(f'  {city_key} NDVI {year}...')
        collection = (ee.ImageCollection('MODIS/061/MOD13A3')
                      .filterDate(f'{year}-01-01', f'{year}-12-31')
                      .filterBounds(bbox)
                      .select('NDVI'))
        ndvi_raw = (collection.mean()
                    .reduceRegion(reducer=ee.Reducer.mean(), geometry=bbox,
                                  scale=500, maxPixels=1e9)
                    .getInfo().get('NDVI', None))
        # `if ndvi_raw` discarded a legitimate NDVI of exactly 0 (bare ground,
        # water) as missing data.
        results[str(year)] = round(ndvi_raw * NDVI_SCALE, 4) if ndvi_raw is not None else None

    return results


if __name__ == '__main__':
    initialize_ee()
    run_for_all_cities('ndvi', fetch_ndvi_for_city)
