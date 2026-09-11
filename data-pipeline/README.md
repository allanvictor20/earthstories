# Data pipeline

Pulls NASA satellite records for each city out of Google Earth Engine and
assembles the JSON profiles the frontend reads.

## Setup

```bash
python -m venv earthstories-env
source earthstories-env/bin/activate        # Windows: earthstories-env\Scripts\activate
pip install -r data-pipeline/requirements.txt
earthengine authenticate
```

Set `EE_PROJECT` if you are not using the default Earth Engine project:

```bash
export EE_PROJECT=your-ee-project
```

## Running

Scripts resolve paths from their own location, so they run from anywhere:

```bash
python data-pipeline/fetch_ndvi.py
python data-pipeline/fetch_land_cover.py
python data-pipeline/fetch_temperature.py
python data-pipeline/fetch_water.py
python data-pipeline/build_city_profile.py
```

Each fetch script:

- **resumes** — a city whose `output/<name>_<city>.json` already exists is
  skipped, so an interrupted run only fetches what is missing;
- **retries** — transient Earth Engine errors are retried three times with
  exponential backoff before that city is reported as failed.

Delete the relevant file in `output/` to force a refetch.

`build_city_profile.py` reads everything in `output/` and writes
`earthstories-frontend/public/data/<city>.json`.

## Why `output/` is committed

The raw per-metric JSON in `output/` is checked in deliberately: fetching it
requires Earth Engine credentials and takes hours, so committing it means the
profile builder — and its tests — run for anyone who clones the repo.

## Event detection

`detect_events()` flags years where the record shifted noticeably. Thresholds
are **relative to each city's own variability** (2 standard deviations, with a
relative floor), because absolute cutoffs do not transfer: Cairo's NDVI varies
by about ±0.005 across the entire record while Kampala's varies by ±0.03.
Steadily-trending metrics such as urban cover additionally require twice the
city's median annual change, so a city that builds a little more every year
reports a trend rather than twenty separate "events".

Detected types: `heat`, `drought`, `flood`, `greening`, `browning`,
`urban_growth`, `forest_loss`.

## Tests

```bash
cd data-pipeline && python -m pytest tests/ -v
```
