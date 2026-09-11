"""JRC Global Surface Water — permanent water extent per city, per year."""
import ee

from config.runner import initialize_ee, run_for_all_cities
from config.settings import WATER_YEARS

PERMANENT_WATER_CLASS = 3


def fetch_water_for_city(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    results = {}

    for year in WATER_YEARS:
        print(f'  {city_key} water {year}...')
        img = (ee.ImageCollection('JRC/GSW1_4/YearlyHistory')
               .filterDate(f'{year}-01-01', f'{year + 1}-01-01')
               .first())

        if img.getInfo() is None:
            print(f'    no water image for {year}')
            results[str(year)] = None
            continue

        area = (img.eq(PERMANENT_WATER_CLASS).selfMask()
                .multiply(ee.Image.pixelArea())
                .reduceRegion(reducer=ee.Reducer.sum(), geometry=bbox,
                              scale=30, maxPixels=1e10)
                .getInfo().get('waterClass', 0))
        results[str(year)] = round(area / 1e6, 2) if area is not None else None

    return results


if __name__ == '__main__':
    initialize_ee()
    run_for_all_cities('water', fetch_water_for_city)
