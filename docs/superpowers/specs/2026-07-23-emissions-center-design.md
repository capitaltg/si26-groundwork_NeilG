# Emissions Center — Top Emitters Leaderboard

## Problem

Groundwork surfaces TRI releases, ECHO compliance, RCRA/Superfund/Brownfields
data, but nothing from EPA's Greenhouse Gas Reporting Program (GHGRP) — a
completely different, verified-available dataset (large facilities' annual
CO2-equivalent emissions by gas type). A state-wide "who emits the most" view
is a natural, self-contained addition, distinct from every existing feature.

## Verified data source

EPA's Envirofacts `data.epa.gov/dmapservice` service — the same REST pattern
already used for TRI in this app — exposes GHGRP data via the table
`ghg.rlps_ghg_emitter_gas`. Confirmed live via direct query
(`https://data.epa.gov/dmapservice/ghg.rlps_ghg_emitter_gas/state/equals/MD/sort/co2e_emission:desc/1:5/json`)
and supports the same `/field/equals/value/sort/field:desc/start:end/json`
URL-based query pattern as `tri.tri_facility`.

Each row is one (facility, gas type, year) record:

```json
{
  "facility_id": 1000651,
  "facility_name": "Morgantown",
  "city": "NEWBURG",
  "state": "MD",
  "zip": "20664",
  "county": "Charles",
  "latitude": 38.3592,
  "longitude": -76.9767,
  "gas_code": "CO2",
  "gas_name": "Carbon Dioxide",
  "co2e_emission": 7229590.6,
  "year": 2010
}
```

Confirmed global max `year` across the whole dataset (not just one state) is
2023, via an unfiltered query sorted by `year:desc`.

`facility_id` here is GHGRP's own numbering — **not** the same ID system as
`tri_facility_id` (TRI) or the EPA registry ID used elsewhere in this app
(ECHO/FRS). No cross-reference between them exists in this codebase. Linking
a leaderboard row into the existing Facility Detail page is therefore **out
of scope** for this version — it would need new work to resolve GHGRP
facility identities against the TRI/registry ID space, which isn't part of
this feature.

## Scope

A new nav-level page, "Emissions Center," showing a state-wide leaderboard:
pick a state, see facilities ranked by total CO2e emissions (summed across
every gas type they reported) for the most recent year that state has data
for. Modeled directly on the existing Hazard Watch page/hook/endpoint
pattern.

Out of scope: linking rows to Facility Detail (see above), any facility- or
address-level search within Emissions Center, historical year-over-year
trends (this version shows one year — the most recent — per state), any UI
beyond the leaderboard table itself.

## Backend

New endpoint: `GET /api/state/{state_abbr}/ghg-emitters`

1. Query `ghg.rlps_ghg_emitter_gas` filtered to `state_abbr`, sorted by
   `year:desc`, take the first row's `year` — this is "the most recent year
   this state has GHGRP data for," determined dynamically per request so it
   never needs updating as EPA adds new reporting years.
2. Query again filtered to `state_abbr` AND that year.
3. Group the returned rows by `facility_id`, summing `co2e_emission` across
   all `gas_code` values reported by that facility in that year (CO2e is
   designed to be additive across gas types — this is a real, meaningful
   "total emissions" figure, unlike TRI's individual chemicals, which
   aren't directly comparable to each other).
4. Sort the grouped list descending by summed CO2e, return it.

Response shape (list of objects): `facility_id`, `facility_name`, `city`,
`state`, `year`, `total_co2e`, `latitude`, `longitude` (lat/long included
since it's already present in the source data at no extra cost, even though
no map consumes it in this version).

If the state has zero GHGRP records at all (no rows returned by step 1),
return an empty list — same "no results" shape as Hazard Watch already uses.

## Frontend

- New page component, new hook — directly modeled on
  `HazardWatchPage.tsx`/`useHazardWatch.ts`: a state text input, a button,
  and (once results arrive) a table with columns Facility, City, Year,
  Total CO2e (metric tons).
- New nav item, "Emissions Center," alongside the existing Search / Hazard
  Watch / Site Search links in `NavBar.tsx`.
- New route in `App.tsx`.

## Error handling

- Empty state (zero GHGRP facilities in that state): same "no results"
  message pattern already used by Hazard Watch and Site Search.
- Network/API error: same error-message pattern already used throughout
  the app (`error` state + red text).

## Testing

Backend: the new endpoint's grouping/summing logic is pure Python (no I/O)
given a fetched row list — same style as the existing `unittest` coverage
for `site_search`'s coordinate handling. Test with a faked `httpx.AsyncClient`
covering: multiple gas types for one facility summing correctly, multiple
facilities sorting correctly by total, and the "determine most recent year"
step correctly picking the max year from a mixed-year fake response.

Frontend: no test harness exists in this repo (established convention) —
verify via `npm run build` plus manual browser check.
