import ee, json, os
from config.cities import CITIES

ee.Initialize(project='earth-stories-hackathon')
os.makedirs('../output', exist_ok=True)

def get_baseline(bbox):
    val = (ee.ImageCollection('MODIS/061/MOD11A2')
        .filterDate('2000-01-01', '2010-12-31')
        .filterBounds(bbox)
        .select('LST_Day_1km')
        .mean()
        .reduceRegion(ee.Reducer.mean(), bbox, 1000)
        .getInfo().get('LST_Day_1km', None))
    return (val * 0.02 - 273.15) if val else None

def fetch_temperature(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    baseline_c = get_baseline(bbox)
    print(f'  {city_key} baseline temp: {round(baseline_c, 2) if baseline_c else "N/A"}°C')
    results = {}
    for year in range(2001, 2025):
        print(f'  {city_key} temperature {year}...')
        val = (ee.ImageCollection('MODIS/061/MOD11A2')
            .filterDate(f'{year}-01-01', f'{year}-12-31')
            .filterBounds(bbox)
            .select('LST_Day_1km')
            .mean()
            .reduceRegion(ee.Reducer.mean(), bbox, 1000)
            .getInfo().get('LST_Day_1km', None))
        if val:
            temp_c = val * 0.02 - 273.15
            results[str(year)] = {
                'mean_celsius':    round(temp_c, 2),
                'anomaly_celsius': round(temp_c - baseline_c, 2) if baseline_c else None,
            }
        else:
            results[str(year)] = {'mean_celsius': None, 'anomaly_celsius': None}
    return results

for city_key, city_data in CITIES.items():
    print(f'\nProcessing {city_data["name"]}...')
    data = fetch_temperature(city_key, city_data)
    with open(f'../output/temperature_{city_key}.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f'  Saved temperature_{city_key}.json')

print('\nAll temperature done.')