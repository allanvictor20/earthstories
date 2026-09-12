# 🌍 Earth Stories
### NASA Space Apps Challenge 2026

> *What happened to your home while you were alive?*

Earth Stories is a scroll-driven, AI-narrated environmental documentary that takes your city and birth year, then shows you exactly what NASA satellites recorded about your home across your lifetime.

---

## 🛰 How It Works

1. Enter your city and birth year
2. Earth Stories pulls pre-processed NASA satellite data for your city
3. An AI narrator writes a personalised 6-chapter documentary
4. Scroll through chapters while a live satellite map updates alongside your story
5. Download a shareable card of your Earth Story

---

## 📁 Project Structure

```
earthstories/
├── earthstories-frontend/     # React + Vite web app
│   ├── api/
│   │   └── narrate.js         # Serverless proxy — keeps the AI key server-side
│   ├── public/data/           # Pre-processed city JSON profiles
│   └── src/
│       ├── components/        # UI components
│       │   ├── Onboarding.jsx     # City + birth year input
│       │   ├── MapLayer.jsx       # NASA GIBS satellite map + year scrubber
│       │   ├── StoryEngine.jsx    # Scroll-driven chapter renderer
│       │   ├── DataVizPanel.jsx   # NDVI, temperature, events, summary charts
│       │   ├── ForecastPanel.jsx  # Trend projection to age 50
│       │   ├── ChapterImage.jsx   # Ground-level illustration per chapter
│       │   ├── ShareButton.jsx    # PNG card download
│       │   ├── VoiceToggle.jsx    # Voice narration toggle
│       │   └── ErrorBoundary.jsx  # Keeps one bad render from blanking the page
│       ├── hooks/
│       │   ├── useChapterState.js   # Scroll state machine
│       │   └── useVoiceNarration.js # Web Speech API
│       ├── services/
│       │   ├── narration.js       # AI narration engine (via the proxy)
│       │   ├── illustration.js    # Data-driven scene prompts + image URLs
│       │   └── climateForecast.js # Least-squares projection + NASA POWER
│       └── utils/
│           ├── metrics.js         # Shared metric-series helpers
│           └── shareCard.js       # Canvas share card
│
├── data-pipeline/             # Python — NASA data via Google Earth Engine
│   ├── config/
│   │   ├── cities.py          # City bounding boxes
│   │   ├── settings.py        # Paths, EE project, year ranges
│   │   └── runner.py          # Shared driver: retry + resume
│   ├── fetch_ndvi.py          # MODIS vegetation index
│   ├── fetch_land_cover.py    # Urban/forest/water land cover
│   ├── fetch_temperature.py   # Land surface temperature anomaly
│   ├── fetch_water.py         # Surface water extent
│   ├── build_city_profile.py  # Assembles final city JSON + event detection
│   └── tests/                 # pytest suite for event detection
│
└── output/                    # Raw JSON output from the pipeline (committed)
```

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

### 1. Configure the API key

Copy `.env.example` to `earthstories-frontend/.env` and fill in your Groq key:

```bash
cp .env.example earthstories-frontend/.env
```

```
GROQ_API_KEY=your_groq_api_key_here
```

> ⚠️ **Do not prefix this with `VITE_`.** Vite inlines every `VITE_*` variable
> into the client bundle, which would publish the key to every visitor. The key
> is read only by `api/narrate.js`, which the dev server also mounts at
> `/api/narrate` so local development uses the same server-side path as production.

### 2. Start the frontend

```bash
cd earthstories-frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 3. Other commands

```bash
npm run lint     # ESLint
npm test         # Vitest unit tests
npm run build    # Production build
```

### Data pipeline (optional — data is already pre-processed)

See [`data-pipeline/README.md`](data-pipeline/README.md) for setup, Earth Engine
authentication, and how the resumable fetch scripts work.

```bash
python -m venv earthstories-env
source earthstories-env/bin/activate       # Windows: earthstories-env\Scripts\activate
pip install -r data-pipeline/requirements.txt

python data-pipeline/fetch_ndvi.py
python data-pipeline/fetch_land_cover.py
python data-pipeline/fetch_temperature.py
python data-pipeline/fetch_water.py
python data-pipeline/build_city_profile.py
```

---

## 🌐 Deploying

The app is a static Vite build plus one serverless function.

- **Root directory:** `earthstories-frontend`
- **Build command:** `npm run build` → **Output:** `dist`
- **Environment variable:** `GROQ_API_KEY` (server-side, no `VITE_` prefix)

`api/narrate.js` follows the Vercel/Netlify function convention and is picked up
automatically from that root.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Maps | Leaflet + NASA GIBS WMTS |
| Scroll Engine | Scrollama.js |
| Charts | Recharts |
| AI Narration | Groq (Llama 3.1), proxied server-side |
| Voice | Web Speech API |
| Share Card | Canvas API |
| Tests | Vitest (frontend) + pytest (pipeline) |
| Data Pipeline | Python + Google Earth Engine |
| Satellite Data | NASA MODIS, VIIRS, JRC Water, NASA POWER |

---

## 🛰 NASA Data Sources

- **MODIS/061/MOD13A3** — Vegetation Index (NDVI)
- **MODIS/061/MCD12Q1** — Land Cover Classification
- **MODIS/061/MOD11A2** — Land Surface Temperature
- **JRC/GSW1_4/YearlyHistory** — Surface Water History
- **NASA GIBS WMTS** — Satellite tile imagery
- **NASA POWER** — Live temperature/precipitation reference in the forecast panel

---

## 🖼 Chapter illustrations

Each chapter carries a ground-level illustration of the reader's own city,
generated from that city's measurements — the street, the trees, the roofs — so
that a change in the data is something you can see rather than a number you have
to interpret. The scene prompt is built from the **metrics**, not from the
narrator's prose, so the picture tracks the record: the street gets more
built-up and less green exactly as the satellites measured.

- **Provider:** [Pollinations.ai](https://github.com/pollinations/pollinations)
  — open source, no API key, no signup. It runs FLUX behind a plain URL.
- **Swapping providers:** everything lives in `src/services/illustration.js`.
  Only `buildImageUrl()` needs to change to move to, say, a Cloudflare Workers
  AI function (`@cf/black-forest-labs/flux-1-schnell`, 10k free Neurons/day).
- **Deterministic:** the seed is derived from city + birth year + chapter, so a
  given Earth Story always produces the same pictures.
- **Metered connections:** much of the intended audience pays for mobile data by
  the megabyte, so images are 768×512, lazily loaded, and offered behind a tap
  when the browser reports `saveData` or a 2G/3G connection.
- **Always labelled:** every illustration is captioned as a picture drawn from
  the measurements, not a photograph of that street. The satellite imagery on
  the map beside the story is the real NASA record; these are not.

---

## 📊 A note on the forecast

Chapter 6 projects each metric with an ordinary least-squares fit over the
trailing ten years and shows a **range**, not a single number. Where the record
is too scattered to support a projection (low R²), the panel says so instead of
printing a falsely precise figure. It is a scenario, not a prediction.

---

## 👥 Team

Built for NASA Space Apps Challenge 2026.

---

## 📄 License

MIT
