import ee, json, os
from config.cities import CITIES

ee.Initialize(project='earth-stories-hackathon')
os.makedirs('../output', exist_ok=True)

def fetch_ndvi_for_city(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    results = {}
    for year in range(2001, 2025):
        print(f'  {city_key} NDVI {year}...')
        collection = (ee.ImageCollection('MODIS/061/MOD13A3')
            .filterDate(f'{year}-01-01', f'{year}-12-31')
            .filterBounds(bbox)
            .select('NDVI'))
        ndvi_raw = (collection.mean()
            .reduceRegion(reducer=ee.Reducer.mean(), geometry=bbox, scale=500, maxPixels=1e9)
            .getInfo().get('NDVI', None))
        results[str(year)] = round(ndvi_raw * 0.0001, 4) if ndvi_raw else None
    return results

for city_key, city_data in CITIES.items():
    print(f'\nProcessing {city_data["name"]}...')
    data = fetch_ndvi_for_city(city_key, city_data)
    with open(f'../output/ndvi_{city_key}.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f'  Saved ndvi_{city_key}.json')

print('\nAll NDVI done.')