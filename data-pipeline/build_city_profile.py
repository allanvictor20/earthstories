import json, os
from config.cities import CITIES

os.makedirs('../earthstories-frontend/public/data', exist_ok=True)

def detect_events(temp_data, water_data):
    events = []
    for year in sorted(temp_data.keys()):
        anomaly = temp_data[year].get('anomaly_celsius', 0) or 0
        if anomaly > 1.5:
            events.append({'year': int(year), 'type': 'heat',
                'description': f'Unusually hot year (+{anomaly:.1f}°C above baseline)'})
        if year in water_data and year > '2003':
            curr = water_data.get(year)
            prev = water_data.get(str(int(year) - 1))
            if curr is not None and prev is not None:
                change = curr - prev
                if change < -10:
                    events.append({'year': int(year), 'type': 'drought',
                        'description': f'Significant surface water loss ({change:.0f} km²)'})
    return events

for city_key, city_meta in CITIES.items():
    print(f'Building profile: {city_meta["name"]}...')
    with open(f'../output/ndvi_{city_key}.json')        as f: ndvi  = json.load(f)
    with open(f'../output/landcover_{city_key}.json')   as f: lc    = json.load(f)
    with open(f'../output/temperature_{city_key}.json') as f: temp  = json.load(f)
    with open(f'../output/water_{city_key}.json')       as f: water = json.load(f)

    profile = {
        'city':     city_meta['name'],
        'city_key': city_key,
        'lat':      city_meta['lat'],
        'lon':      city_meta['lon'],
        'metrics': {
            'ndvi_mean':           {y: ndvi.get(y) for y in sorted(ndvi)},
            'temperature_anomaly': {y: temp.get(y, {}).get('anomaly_celsius') for y in sorted(temp)},
            'temperature_mean':    {y: temp.get(y, {}).get('mean_celsius')    for y in sorted(temp)},
            'urban_cover_pct':     {y: lc.get(y, {}).get('urban_pct')         for y in sorted(lc)},
            'forest_cover_pct':    {y: lc.get(y, {}).get('forest_pct')        for y in sorted(lc)},
            'surface_water_km2':   {y: water.get(y) for y in sorted(water)},
        },
        'events': detect_events(temp, water),
    }

    out_path = f'../earthstories-frontend/public/data/{city_key}.json'
    with open(out_path, 'w') as f:
        json.dump(profile, f, indent=2)
    print(f'  Saved {city_key}.json')

print('\nAll city profiles built.')