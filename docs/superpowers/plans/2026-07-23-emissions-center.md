# Emissions Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Emissions Center" page showing a state-wide GHG (greenhouse gas) top-emitters leaderboard, sourced from EPA's GHGRP data — a completely new EPA program/dataset for this app.

**Architecture:** New backend endpoint (`GET /api/state/{state_abbr}/ghg-emitters`) that determines the most recent reporting year for a state, fetches that year's per-(facility, gas type) rows, sums CO2e per facility, and returns a sorted leaderboard. New frontend page/hook/nav entry, directly modeled on the existing Hazard Watch page.

**Tech Stack:** FastAPI/httpx backend (Python 3.9), React 19 + TypeScript + Vite frontend. No new dependencies on either side.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-emissions-center-design.md` — read it before starting if anything below is unclear.
- Data source confirmed live: `https://data.epa.gov/dmapservice/ghg.rlps_ghg_emitter_gas` via the same Envirofacts query pattern already used for TRI in this file (`/field/equals/value/sort/field:desc/start:end/json`). The state field in this table is named `state` (not `state_abbr` — GHGRP's schema differs from TRI's `tri_facility` schema, which does use `state_abbr`. Do not assume the field name carries over from TRI).
- `facility_id` in GHGRP data is its own numbering, unrelated to `tri_facility_id`/EPA registry ID used elsewhere in this app. Leaderboard rows must NOT link to `/facility/:id` (Facility Detail) — there is no cross-reference between the two ID systems in this codebase, and a naive link would point at the wrong (or a nonexistent) facility.
- Determine the most recent year dynamically per request (query sorted by `year:desc`, take the first row's year) rather than hardcoding a year — confirmed via live query that the dataset's max year is currently 2023, but this will change as EPA adds future reporting years.
- Confirmed via live query that a single state+year query stays well-bounded (Texas, the largest industrial state, returned 3809 rows for 2023 alone) — a `1:10000` row cap on the second query is a safe margin, not a truncation risk.
- Backend tests use Python's stdlib `unittest` with a faked `httpx.AsyncClient` (no new dependency), same pattern as `tests/test_site_search.py`.
- No frontend test harness exists in this repo — frontend verification is `npm run build` (type-check) plus manual browser check. No browser automation tool is available in this session either — verification will be code/reasoning-based, and the user should do a real check afterward.

---

### Task 1: Backend `/api/state/{state_abbr}/ghg-emitters` endpoint

**Files:**
- Modify: `main.py` (append new endpoint after `get_hazard_watch`, i.e. after line 186)
- Modify: `frontend/src/types.ts` (add `GhgEmitter` interface)
- Test: `tests/test_ghg_emitters.py` (new)

**Interfaces:**
- Produces: `GET /api/state/{state_abbr}/ghg-emitters` → a JSON array of objects: `{ facility_id: number, facility_name: string, city: string, state: string, year: number, total_co2e: number, latitude: number | null, longitude: number | null }`, sorted by `total_co2e` descending. Empty array if the state has no GHGRP data at all.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_ghg_emitters.py`:

```python
import unittest

import main


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url, params=None):
        if "sort/year:desc/1:1/json" in url:
            if "/state/equals/EMPTY/" in url:
                return FakeResponse("[]")
            return FakeResponse('[{"year": 2023}]')
        if "/year/equals/2023/" in url:
            return FakeResponse(
                "["
                '{"facility_id": 1, "facility_name": "Plant A", "city": "Town", '
                '"state": "MD", "year": 2023, "co2e_emission": 100.0, '
                '"latitude": 38.9, "longitude": -76.9, "gas_code": "CO2"},'
                '{"facility_id": 1, "facility_name": "Plant A", "city": "Town", '
                '"state": "MD", "year": 2023, "co2e_emission": 50.0, '
                '"latitude": 38.9, "longitude": -76.9, "gas_code": "CH4"},'
                '{"facility_id": 2, "facility_name": "Plant B", "city": "Town2", '
                '"state": "MD", "year": 2023, "co2e_emission": 30.0, '
                '"latitude": 39.0, "longitude": -77.0, "gas_code": "CO2"}'
                "]"
            )
        raise AssertionError(f"Unexpected URL: {url}")


class GhgEmittersTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self._real_client = main.httpx.AsyncClient
        main.httpx.AsyncClient = FakeClient

    def tearDown(self):
        main.httpx.AsyncClient = self._real_client

    async def test_sums_multiple_gas_types_per_facility(self):
        result = await main.get_ghg_emitters("MD")
        by_id = {facility["facility_id"]: facility for facility in result}
        self.assertEqual(by_id[1]["total_co2e"], 150.0)

    async def test_sorts_facilities_by_total_descending(self):
        result = await main.get_ghg_emitters("MD")
        self.assertEqual([facility["facility_id"] for facility in result], [1, 2])

    async def test_empty_state_returns_empty_list(self):
        result = await main.get_ghg_emitters("EMPTY")
        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/neilgomes/Desktop/Groundwork && python3 -m unittest tests.test_ghg_emitters -v`
Expected: FAIL — `AttributeError: module 'main' has no attribute 'get_ghg_emitters'` (the endpoint function doesn't exist yet).

- [ ] **Step 3: Add the endpoint to `main.py`**

Append after the `get_hazard_watch` function (after line 186, before the blank lines leading into the Compliance endpoint's docstring):

```python

"""
Emissions Center endpoint
State-wide GHG (greenhouse gas) emissions leaderboard, from EPA's
Greenhouse Gas Reporting Program (GHGRP) -- a separate EPA program/dataset
from TRI, with its own facility_id numbering that does not correspond to
tri_facility_id or the EPA registry ID used elsewhere in this app (no
cross-reference exists here, so leaderboard rows don't link to Facility
Detail).
Each raw row is one (facility, gas type, year) record; co2e_emission is
already expressed in CO2-equivalent, which -- unlike TRI's individual
chemicals -- is specifically designed to be additive across gas types.
Determines the most recent year with data for the given state (rather
than hardcoding a year, so this doesn't need updating as EPA adds new
reporting years), then sums co2e_emission per facility across every gas
type reported that year, sorted worst first.
"""
@app.get("/api/state/{state_abbr}/ghg-emitters")
async def get_ghg_emitters(state_abbr: str):
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        latest_year_resp = await client.get(
            f"https://data.epa.gov/dmapservice/ghg.rlps_ghg_emitter_gas"
            f"/state/equals/{state_abbr}/sort/year:desc/1:1/json"
        )
        latest_year_rows = _parse_json(latest_year_resp)
        if not latest_year_rows:
            return []
        latest_year = latest_year_rows[0]["year"]

        year_resp = await client.get(
            f"https://data.epa.gov/dmapservice/ghg.rlps_ghg_emitter_gas"
            f"/state/equals/{state_abbr}/year/equals/{latest_year}/1:10000/json"
        )
        rows = _parse_json(year_resp)

    totals_by_facility = {}
    for row in rows:
        facility_id = row.get("facility_id")
        if facility_id is None:
            continue
        entry = totals_by_facility.setdefault(
            facility_id,
            {
                "facility_id": facility_id,
                "facility_name": row.get("facility_name"),
                "city": row.get("city"),
                "state": row.get("state"),
                "year": row.get("year"),
                "total_co2e": 0,
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
            },
        )
        entry["total_co2e"] += row.get("co2e_emission") or 0

    emitters = list(totals_by_facility.values())
    emitters.sort(key=lambda facility: facility["total_co2e"], reverse=True)

    return emitters
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/neilgomes/Desktop/Groundwork && python3 -m unittest tests.test_ghg_emitters -v`
Expected: all 3 tests PASS.

- [ ] **Step 5: Add the frontend type**

In `frontend/src/types.ts`, add (anywhere alongside the other interfaces, e.g. after `SiteSearchResult`):

```typescript
export interface GhgEmitter {
  facility_id: number;
  facility_name: string;
  city: string;
  state: string;
  year: number;
  total_co2e: number;
  latitude: number | null;
  longitude: number | null;
}
```

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_ghg_emitters.py frontend/src/types.ts
git commit -m "Add GHG emitters leaderboard endpoint (Emissions Center backend)"
```

---

### Task 2: Frontend Emissions Center page, hook, and nav entry

**Files:**
- Create: `frontend/src/hooks/useGhgEmitters.ts`
- Create: `frontend/src/pages/EmissionsCenterPage.tsx`
- Modify: `frontend/src/components/NavBar.tsx` (add nav link)
- Modify: `frontend/src/App.tsx` (add route)

**Interfaces:**
- Consumes: `GhgEmitter` from `frontend/src/types.ts` (Task 1); `GET /api/state/{state_abbr}/ghg-emitters` (Task 1).
- Produces: `useGhgEmitters(stateAbbr: string) -> { emitters: GhgEmitter[], loading: boolean, error: string | null }`, consumed by `EmissionsCenterPage`.

- [ ] **Step 1: Create the hook**

Create `frontend/src/hooks/useGhgEmitters.ts`:

```typescript
import { useEffect, useState } from "react";
import type { GhgEmitter } from "../types";

export function useGhgEmitters(stateAbbr: string) {
  const [emitters, setEmitters] = useState<GhgEmitter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateAbbr) return;
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/state/${stateAbbr}/ghg-emitters`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setEmitters(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stateAbbr]);

  return { emitters, loading, error };
}
```

- [ ] **Step 2: Create the page**

Create `frontend/src/pages/EmissionsCenterPage.tsx`:

```tsx
import { useState } from "react";
import { useGhgEmitters } from "../hooks/useGhgEmitters";

function EmissionsCenterPage() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { emitters, loading, error } = useGhgEmitters(submittedState);

  return (
    <div>
      <h1>Emissions Center</h1>
      <p>
        Top greenhouse gas emitters by state, from EPA's Greenhouse Gas Reporting
        Program (GHGRP) — total CO2-equivalent emissions across all reported gas
        types, for the most recent year each state has data for.
      </p>
      <div className="d-flex gap-2 mb-3">
        <input
          className="form-control"
          style={{ maxWidth: "6rem" }}
          value={inputValue}
          maxLength={2}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setSubmittedState(inputValue)}
        >
          Search top emitters
        </button>
      </div>
      {loading && <p>Loading emissions data...</p>}
      {error && <p className="text-danger">Error loading emissions data: {error}</p>}
      {!loading && !error && emitters.length === 0 && (
        <p>No GHG emissions data found for "{submittedState}".</p>
      )}
      {!loading && !error && emitters.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>City</th>
              <th>Year</th>
              <th>Total CO2e (metric tons)</th>
            </tr>
          </thead>
          <tbody>
            {emitters.map((emitter) => (
              <tr key={emitter.facility_id}>
                <td>{emitter.facility_name}</td>
                <td>{emitter.city}</td>
                <td>{emitter.year}</td>
                <td>{emitter.total_co2e.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmissionsCenterPage;
```

- [ ] **Step 3: Add the nav link**

In `frontend/src/components/NavBar.tsx`, add a new `Link` inside the existing `navbar-nav` div, after the "Site Search" link:

```tsx
          <Link className="nav-link" to="/site-search">
            Site Search
          </Link>
          <Link className="nav-link" to="/emissions-center">
            Emissions Center
          </Link>
```

- [ ] **Step 4: Add the route**

In `frontend/src/App.tsx`, add the import and route:

```tsx
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import EmissionsCenterPage from "./pages/EmissionsCenterPage";

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/facility/:id" element={<FacilityDetailPage />} />
          <Route path="/hazard-watch" element={<HazardWatchPage />} />
          <Route path="/site-search" element={<SiteSearchPage />} />
          <Route path="/emissions-center" element={<EmissionsCenterPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
```

- [ ] **Step 5: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 6: Manually verify in the browser**

Start both servers (if not already running):
```bash
cd /Users/neilgomes/Desktop/Groundwork && uvicorn main:app --reload &
cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run dev
```

Open the frontend URL Vite prints, click "Emissions Center" in the nav bar, and check:
- The page loads with "MD" pre-filled and shows a table of Maryland facilities ranked by Total CO2e, highest first (e.g. a facility named "Morgantown" or similar large power plant should be near the top based on the data confirmed during design).
- Try a state with no GHGRP data (or an invalid 2-letter code) and confirm the "No GHG emissions data found" message appears instead of an error or crash.
- Confirm no facility name is a clickable link (unlike Hazard Watch) — this is intentional per the design's ID-mismatch constraint, not a missing feature.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useGhgEmitters.ts frontend/src/pages/EmissionsCenterPage.tsx frontend/src/components/NavBar.tsx frontend/src/App.tsx
git commit -m "Add Emissions Center page, hook, and nav entry"
```
