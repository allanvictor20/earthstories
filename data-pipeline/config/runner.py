"""Shared driver for the per-city fetch scripts.

Replaces the copy-pasted "for each city -> fetch -> write JSON" loop that each
fetcher carried, and adds two things none of them had: retries on transient
Earth Engine errors, and resume support so an interrupted run does not start
over from the first city.
"""
import json
import time

import ee

from config.cities import CITIES
from config.settings import EE_PROJECT, OUTPUT_DIR

MAX_ATTEMPTS = 3


def initialize_ee():
    """Initialise Earth Engine with the configured project."""
    ee.Initialize(project=EE_PROJECT)


def run_for_all_cities(name, fetch_fn, force=False):
    """
    Run `fetch_fn(city_key, city_meta)` for every city and write
    output/<name>_<city_key>.json.

    Existing files are skipped unless `force` is set, so a re-run after a
    failure only fetches what is missing.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    written, skipped, failed = [], [], []

    for city_key, city_meta in CITIES.items():
        path = OUTPUT_DIR / f'{name}_{city_key}.json'

        if path.exists() and not force:
            print(f'  skip {city_key} ({path.name} already exists)')
            skipped.append(city_key)
            continue

        print(f'\nProcessing {city_meta["name"]} ({name})...')
        data = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                data = fetch_fn(city_key, city_meta)
                break
            except Exception as err:  # noqa: BLE001 - surface any EE/network error
                wait = 2 ** attempt
                print(f'  attempt {attempt + 1}/{MAX_ATTEMPTS} failed for {city_key}: {err}')
                if attempt < MAX_ATTEMPTS - 1:
                    print(f'  retrying in {wait}s...')
                    time.sleep(wait)

        if data is None:
            print(f'  GIVING UP on {city_key}; re-run to retry just this city.')
            failed.append(city_key)
            continue

        path.write_text(json.dumps(data, indent=2))
        print(f'  Saved {path.name}')
        written.append(city_key)

    print(f'\n{name}: {len(written)} written, {len(skipped)} skipped, {len(failed)} failed.')
    if failed:
        print(f'  failed cities: {", ".join(failed)}')
    return {'written': written, 'skipped': skipped, 'failed': failed}
