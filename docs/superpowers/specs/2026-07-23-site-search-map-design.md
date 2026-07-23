# Site Search Map

## Problem

Site Search returns a flat table of nearby EPA-regulated facilities. A real
Phase 1 Environmental Site Assessment cares about a facility's distance and
direction relative to the subject property (e.g. is a Superfund site
upgradient or downgradient, and how close) — a table of city/state names
doesn't convey that. A map view makes spatial relationships obvious at a
glance.

## Scope

Add a map to the Site Search page showing pins for facilities that have
precise coordinates today: **Superfund (FRS)** and **Brownfields (ArcGIS)**
results. ECHO-sourced facilities (TRI, RCRA, CAA, CWA, SDWA) are excluded
from the map in this iteration — ECHO's facility search only returns
`FacLat`, never a matching longitude, so those facilities cannot be pinned
without an additional per-facility FRS lookup. That lookup is an explicitly
deferred fast-follow, not part of this feature. Excluded facilities remain
visible in the existing table, unchanged.

## Approach

React-Leaflet + OpenStreetMap tiles, chosen over two alternatives:

- **Hand-rolled SVG scatter plot** (matching the existing `ReleaseChart`
  style): zero new dependencies, but plots abstract dots with no real
  geographic context (streets, imagery) — undersells the feature for a
  professional due-diligence tool.
- **Static map image API**: no new frontend dependency, but adds another
  external service dependency. Given three separate EPA API reliability
  issues surfaced this session already, adding a fourth external dependency
  for the map itself is an avoidable risk.

React-Leaflet + OpenStreetMap tiles needs no API key, is the standard choice
for this kind of embed, and gives a real interactive (pan/zoom) map.

## Data flow

**Backend (`main.py`, `site_search` / `add_facility`):**

- `add_facility()` gains two new optional parameters, `latitude` and
  `longitude`, stored on the facility dict (`None` if not provided).
- The Superfund loop passes `latitude=row.get("Latitude83")`,
  `longitude=row.get("Longitude83")` (FRS already returns these as
  strings; cast to `float` when present).
- The Brownfields loop passes `latitude=attrs.get("LATITUDE83")`,
  `longitude=attrs.get("LONGITUDE83")` — confirmed present on every
  ArcGIS feature's `attributes` object (verified against a live response).
- The ECHO loop (`facilities_by_id[registry_id] = {...}`) sets
  `latitude=None, longitude=None` explicitly, so every facility in the
  response has consistent shape.

**Frontend:**

- `types.ts`: add `latitude: number | null` and `longitude: number | null`
  to `SiteSearchFacility`.
- New component `SiteSearchMap.tsx`:
  - Renders a Leaflet map (OpenStreetMap tile layer).
  - If the search was address-based (`latitude`/`longitude` present on the
    top-level `SiteSearchResult`), shows a center marker for the searched
    point and a circle for the search radius.
  - Renders one marker per facility with non-null `latitude`/`longitude`.
    Marker color follows the same significant-violation logic as the
    table's compliance badge (red = significant violation/Superfund,
    green = otherwise — Brownfields properties are not violations).
  - Clicking a marker opens a popup with facility name, program badges,
    and compliance status — reusing the same label/tooltip maps
    (`PROGRAM_LABELS`, `PROGRAM_TOOLTIPS`) already defined in
    `SiteSearchPage.tsx` (extract them to a shared location if needed so
    both the table and the map can use them).
- `SiteSearchPage.tsx`: render `<SiteSearchMap />` above the existing
  results table, passing the search result data straight through.

**Map centering when there's no address point (state-only search):** center
on the average coordinates of whatever facilities have pins; if zero
facilities have coordinates (e.g. a state search that only matched ECHO
facilities), don't render the map at all — show the table only, same as
today.

## Error handling

- No facilities with coordinates → omit the map, table still renders as
  today (no broken/empty map box).
- Zero results overall → existing "No regulated facilities found" message,
  unchanged; map is not shown.

## Out of scope

- Pinning ECHO-sourced facilities (needs a separate FRS lookup per
  facility — noted as a fast-follow, not part of this spec).
- Any new backend endpoint — this reuses the existing `/api/site-search`
  response, just with two new fields per facility.
