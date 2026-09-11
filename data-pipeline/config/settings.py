"""Shared paths and Earth Engine configuration for the pipeline."""
import os
from pathlib import Path

# Anchored to this file, so the scripts run from any working directory
# instead of only from inside data-pipeline/.
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = ROOT_DIR / 'output'
PROFILE_DIR = ROOT_DIR / 'earthstories-frontend' / 'public' / 'data'

# Overridable so contributors can use their own Earth Engine project.
EE_PROJECT = os.environ.get('EE_PROJECT', 'earth-stories-hackathon')

# Year ranges per product, kept in one place rather than inline in each script.
NDVI_YEARS = range(2001, 2025)
TEMPERATURE_YEARS = range(2001, 2025)
LAND_COVER_YEARS = range(2001, 2024)
WATER_YEARS = range(2001, 2023)

BASELINE_START = '2000-01-01'
BASELINE_END = '2010-12-31'
