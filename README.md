# 🌍 Earth Stories
### NASA Space Apps Challenge 2026

> *What happened to your home while you were alive?*

Earth Stories is a scroll-driven, AI-narrated environmental documentary that takes your city and birth year, then shows you exactly what NASA satellites recorded about your home across your lifetime.

---

## 🛰 How It Works

1. Enter your city and birth year
2. Earth Stories pulls pre-processed NASA satellite data for your city
3. An AI narrator writes a personalised 5-chapter documentary
4. Scroll through chapters while a live satellite map updates alongside your story
5. Download a shareable card of your Earth Story

---

## 📁 Project Structure
earthstories/
├── earthstories-frontend/     # React + Vite web app
│   ├── public/data/           # Pre-processed city JSON profiles
│   └── src/
│       ├── components/        # UI components
│       │   ├── Onboarding.jsx     # City + birth year input
│       │   ├── MapLayer.jsx       # NASA GIBS satellite map
│       │   ├── StoryEngine.jsx    # Scroll-driven chapter renderer
│       │   ├── DataVizPanel.jsx   # NDVI + events charts
│       │   ├── ShareButton.jsx    # PNG card download
│       │   └── VoiceToggle.jsx    # Voice narration toggle
│       ├── hooks/
│       │   ├── useChapterState.js # Scroll state machine
│       │   └── useVoiceNarration.js # Web Speech API
│       └── services/
│           └── narration.js       # Groq AI narration engine
│
├── data-pipeline/             # Python — NASA data via Google Earth Engine
│   ├── fetch_ndvi.py          # MODIS vegetation index
│   ├── fetch_land_cover.py    # Urban/forest/water land cover
│   ├── fetch_temperature.py   # Land surface temperature anomaly
│   ├── fetch_water.py         # Surface water extent
│   └── build_city_profile.py  # Assembles final city JSON
│
└── output/                    # Raw JSON output from pipeline

---

## 🌆 Supported Cities

| City | Country |
|------|---------|
| Kampala | Uganda |
| Nairobi | Kenya |
| Lagos | Nigeria |
| Accra | Ghana |
| Dar es Salaam | Tanzania |
| Cairo | Egypt |
| Johannesburg | South Africa |
| Addis Ababa | Ethiopia |

---

## 🚀 Running the App

### Frontend
```bash
cd earthstories-frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Data Pipeline (optional — data already pre-processed)
```bash
# Activate Python environment
earthstories-env\Scripts\activate

# Run pipeline scripts
cd data-pipeline
python fetch_ndvi.py
python fetch_land_cover.py
python fetch_temperature.py
python fetch_water.py
python build_city_profile.py
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Maps | Leaflet + NASA GIBS WMTS |
| Scroll Engine | Scrollama.js |
| Charts | Recharts |
| AI Narration | Groq (Llama 3.1) |
| Voice | Web Speech API |
| Share Card | Canvas API |
| Data Pipeline | Python + Google Earth Engine |
| Satellite Data | NASA MODIS, VIIRS, JRC Water |

---

## 🛰 NASA Data Sources

- **MODIS/006/MOD13A3** — Vegetation Index (NDVI)
- **MODIS/006/MCD12Q1** — Land Cover Classification
- **MODIS/006/MOD11A2** — Land Surface Temperature
- **JRC/GSW1_3/YearlyHistory** — Surface Water History
- **NASA GIBS WMTS** — Satellite tile imagery

---

## 👥 Team

Built for NASA Space Apps Challenge 2026.

---

## 📄 License

MIT