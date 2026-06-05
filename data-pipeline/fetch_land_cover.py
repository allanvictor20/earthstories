import ee, json, os
from config.cities import CITIES

ee.Initialize(project='earth-stories-hackathon')
os.makedirs('../output', exist_ok=True)

URBAN_CLASSES  = [13]
FOREST_CLASSES = [1, 2, 3, 4, 5]
WATER_CLASSES  = [17]
GRASS_CLASSES  = [8, 9, 10]

def class_pct(img, classes, bbox):
    mask = img.eq(classes[0])
    for c in classes[1:]:
        mask = mask.Or(img.eq(c))
    total = img.reduceRegion(ee.Reducer.count(), bbox, 500).getInfo().get('LC_Type1', 0)
    count = (img.updateMask(mask)
        .reduceRegion(ee.Reducer.count(), bbox, 500)
        .getInfo().get('LC_Type1', 0))
    return round((count / total) * 100, 2) if total else 0

def fetch_land_cover(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    results = {}
    for year in range(2001, 2024):
        print(f'  {city_key} land cover {year}...')
        img = (ee.ImageCollection('MODIS/061/MCD12Q1')
            .filterDate(f'{year}-01-01', f'{year+1}-01-01')
            .first()
            .select('LC_Type1'))
        results[str(year)] = {
            'urban_pct':     class_pct(img, URBAN_CLASSES,  bbox),
            'forest_pct':    class_pct(img, FOREST_CLASSES, bbox),
            'water_pct':     class_pct(img, WATER_CLASSES,  bbox),
            'grassland_pct': class_pct(img, GRASS_CLASSES,  bbox),
        }
    return results

for city_key, city_data in CITIES.items():
    print(f'\nProcessing {city_data["name"]}...')
    data = fetch_land_cover(city_key, city_data)
    with open(f'../output/landcover_{city_key}.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f'  Saved landcover_{city_key}.json')

print('\nAll land cover done.')