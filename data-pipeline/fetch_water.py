import ee, json, os
from config.cities import CITIES

ee.Initialize(project='earth-stories-hackathon')
os.makedirs('../output', exist_ok=True)

def fetch_water(city_key, city_data):
    bbox = ee.Geometry.Rectangle(city_data['bbox'])
    results = {}
    for year in range(2001, 2023):
        print(f'  {city_key} water {year}...')
        img = (ee.ImageCollection('JRC/GSW1_4/YearlyHistory')
            .filterDate(f'{year}-01-01', f'{year+1}-01-01')
            .first())
        # Check the image exists before calling .eq()
        img_info = img.getInfo()
        if img_info is None:
            print(f'  No image for {year}, skipping...')
            results[str(year)] = None
            continue
        area = (img.eq(3).selfMask()
            .multiply(ee.Image.pixelArea())
            .reduceRegion(reducer=ee.Reducer.sum(), geometry=bbox, scale=30, maxPixels=1e10)
            .getInfo().get('waterClass', 0))
        results[str(year)] = round(area / 1e6, 2)
    return results

for city_key, city_data in CITIES.items():
    print(f'\nProcessing {city_data["name"]}...')
    data = fetch_water(city_key, city_data)
    with open(f'../output/water_{city_key}.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f'  Saved water_{city_key}.json')

print('\nAll water done.')