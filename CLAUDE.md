# GearHub Pro — Professional Gear Database

## Overview
A parametric search dashboard for professional cinema/production equipment.
102 products across 3 categories (Cameras, Lenses, Lighting) sourced from B&H Photo.
Data lives in Google Sheets, fetched as CSV at runtime.

## Architecture
- **Framework:** Vite + React 18
- **State:** Zustand (single store: products, filters, search, active category)
- **Data:** PapaParse fetching Google Sheets CSV export URLs
- **Styling:** Tailwind CSS v4, dark/slate palette
- **Icons:** lucide-react

## Data Source
Google Sheet: https://docs.google.com/spreadsheets/d/1bWQXQGUwzr3N9AWI5RhP2hhW63O9wIxT6kssXdB8mCI/edit

CSV endpoints:
- Lighting: gid=1384386991
- Cameras: gid=1507253955
- Lenses:  gid=1278544833

## Sheet Schema
### Cameras (29 products)
Name, Brand, Price, B&H URL, Image URL, Sensor Type, Max Resolution, Dynamic Range, Lens Mount, Base ISO

### Lenses (41 products)
Name, Brand, Price, B&H URL, Image URL, Focal Length, Aperture (T/F), Mount, Image Circle, Weight

### Lighting (32 products)
Name, Brand, Price, B&H URL, Image URL, Form Factor, CCT Range, Max Power (W), Output (Lux@1m), IP Rating

## Key Decisions
- **Database, not retail.** Only single standalone products — no kits, bundles, sets.
- **N/A handling:** Specs with all N/A values hide the filter entirely. Individual N/A values show as "Unspecified" in checkbox filters and are excluded from range slider min/max.
- **Parametric engine:** Filters are dynamically generated per category from the sheet columns. Numeric columns get range sliders, categorical columns get checkbox groups.

## Sprint Plan
### Sprint 1 — MVP Dashboard (current)
- [x] Data scraping (102 products in Google Sheets)
- [ ] Vite + React scaffold
- [ ] Data service (CSV fetch + parse)
- [ ] Zustand store
- [ ] Parametric FilterSidebar
- [ ] Product list (dark/slate theme)
- [ ] Global search
- [ ] localhost:5173 running

### Sprint 2 — Spec Population
- [ ] Scrape real tech specs from B&H product pages
- [ ] Replace N/A values with actual data
- [ ] Validate spec ranges

### Sprint 3 — Polish
- [ ] Comparison mode
- [ ] URL state persistence (shareable filter URLs)
- [ ] Mobile responsive
- [ ] Export filtered results

## Credentials
- Service account: gearhub-bot@gearhub-492607.iam.gserviceaccount.com
- credentials.json lives in /Users/t/gearhub/ (DO NOT commit)
