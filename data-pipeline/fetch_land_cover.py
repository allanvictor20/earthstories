"""MODIS land cover class percentages (urban / forest / water / grassland)."""
import ee

from config.runner import initialize_ee, run_for_all_cities
from config.settings import LAND_COVER_YEARS

URBAN_CLASSES = [13]
FOREST_CLASSES = [1, 2, 3, 4, 5]
WATER_CLASSES = [17]
GRASS_CLASSES = [8, 9, 10]


def class_pct(img, classes, bbox, total):
    mask = img.eq(classes[0])
    for c in classes[1:]:
        mask = mask.Or(img.eq(c))
    count = (img.updateMask(mask)
             .reduceRegion(ee.Reducer.count(), bbox, 500)
             .getInfo().get('LC_Type1', 0))
    return round((count / total) * 100, 2) if total else None


def fetch_land_cover_for_city(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    results = {}

    for year in LAND_COVER_YEARS:
        print(f'  {city_key} land cover {year}...')
        img = (ee.ImageCollection('MODIS/061/MCD12Q1')
               .filterDate(f'{year}-01-01', f'{year + 1}-01-01')
               .first())

        if img.getInfo() is None:
            print(f'    no land cover image for {year}')
            results[str(year)] = {
                'urban_pct': None, 'forest_pct': None,
                'water_pct': None, 'grassland_pct': None,
            }
            continue

        img = img.select('LC_Type1')
        # The pixel total is identical for all four classes; computing it once
        # cuts the Earth Engine round-trips per year from eight to five.
        total = img.reduceRegion(ee.Reducer.count(), bbox, 500).getInfo().get('LC_Type1', 0)

        results[str(year)] = {
            'urban_pct': class_pct(img, URBAN_CLASSES, bbox, total),
            'forest_pct': class_pct(img, FOREST_CLASSES, bbox, total),
            'water_pct': class_pct(img, WATER_CLASSES, bbox, total),
            'grassland_pct': class_pct(img, GRASS_CLASSES, bbox, total),
        }

    return results


if __name__ == '__main__':
    initialize_ee()
    run_for_all_cities('landcover', fetch_land_cover_for_city)
