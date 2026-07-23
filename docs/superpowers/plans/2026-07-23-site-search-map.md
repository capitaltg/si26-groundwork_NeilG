# Site Search Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a map to the Site Search page showing pins for Superfund and Brownfields facilities (which already have precise coordinates), plus a center marker and radius circle for address-based searches.

**Architecture:** Backend attaches `latitude`/`longitude` to Superfund and Brownfields facility records in the existing `/api/site-search` response (ECHO facilities get explicit `null` coordinates, unchanged otherwise). Frontend renders a new `SiteSearchMap` component (React-Leaflet + OpenStreetMap tiles) above the existing results table on the Site Search page.

**Tech Stack:** FastAPI/httpx backend (Python 3.9), React 19 + TypeScript + Vite frontend. New frontend dependencies: `leaflet@1.9.4`, `react-leaflet@5.0.0`, `@types/leaflet@1.9.21` (devDependency).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-site-search-map-design.md` — read it before starting if anything below is unclear.
- ECHO-sourced facilities (TRI/RCRA/CAA/CWA/SDWA) get `latitude: null, longitude: null` — pinning them is explicitly out of scope (needs a separate FRS lookup per facility, deferred as a fast-follow).
- No new backend endpoint — reuse the existing `/api/site-search` response shape, adding two fields per facility.
- **Testing approach:** this repo has zero existing test infrastructure (no `pytest` installed, no `requirements.txt` entry for it; no frontend test runner, no `vitest`/`jest`/`@testing-library` in `package.json`). Introducing a full test framework in either language is out of scope for this feature. Backend logic (pure data transformation, no real network calls once mocked) is tested with Python's stdlib `unittest` — no new dependency required. Frontend changes are verified with `npm run build` (type-checks via `tsc -b`) and manual browser verification per the project's existing convention for UI work — there is no frontend component test harness to write into.
- Marker rendering uses React-Leaflet's `CircleMarker`/`Circle` (SVG-based) exclusively, not the image-based `Marker` — this sidesteps a well-known Leaflet + bundler issue where the default marker icon images 404 under Vite/webpack, and needs no marker icon asset imports.
- Coordinates from FRS/ArcGIS come back as strings or numbers inconsistently; always pass them through a `_to_float` helper (added in Task 1) before storing.

---

### Task 1: Backend — attach coordinates to Superfund/Brownfields facilities

**Files:**
- Modify: `main.py:9-13` (add `_to_float` helper near `_parse_json`)
- Modify: `main.py:315-335` (`add_facility` closure — accept and store `latitude`/`longitude`)
- Modify: `main.py:437-447` (ECHO facility dict — explicit `null` coordinates)
- Modify: `main.py:449-461` (Superfund `add_facility` call — pass coordinates)
- Modify: `main.py:463-473` (Brownfields `add_facility` call — pass coordinates)
- Modify: `frontend/src/types.ts:62-70` (`SiteSearchFacility` — add `latitude`/`longitude` fields)
- Test: `tests/test_site_search.py` (new)
- Test: `tests/__init__.py` (new, empty — makes `tests` an importable package)

**Interfaces:**
- Produces: every facility dict returned by `GET /api/site-search` now has `latitude: float | None` and `longitude: float | None` keys, in addition to the existing `registry_id`, `name`, `city`, `state`, `programs`, `compliance_status`, `significant_violation` keys.

- [ ] **Step 1: Write the failing test**

Create `tests/__init__.py` (empty file).

Create `tests/test_site_search.py`:

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
        if "echo_rest_services.get_facilities" in url:
            return FakeResponse('{"Results": {"QueryID": 1}}')
        if "echo_rest_services.get_qid" in url:
            return FakeResponse(
                '{"Results": {"Facilities": [{"RegistryID": "echo-1", '
                '"FacName": "Echo Facility", "FacCity": "Town", "FacState": "MD"}]}}'
            )
        if "frs_rest_services.get_facilities" in url:
            return FakeResponse(
                '{"Results": {"FRSFacility": [{"RegistryId": "sf-1", '
                '"FacilityName": "Superfund Site", "CityName": "Town", '
                '"StateAbbr": "MD", "Latitude83": "38.9", "Longitude83": "-76.9"}]}}'
            )
        if "FRS_INTERESTS" in url:
            return FakeResponse(
                '{"features": [{"attributes": {"REGISTRY_ID": "bf-1", '
                '"PRIMARY_NAME": "Brownfield Site", "CITY_NAME": "Town", '
                '"STATE_CODE": "MD", "LATITUDE83": 38.8, "LONGITUDE83": -76.8}}]}'
            )
        raise AssertionError(f"Unexpected URL: {url}")


class SiteSearchCoordinatesTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self._real_client = main.httpx.AsyncClient
        main.httpx.AsyncClient = FakeClient

    def tearDown(self):
        main.httpx.AsyncClient = self._real_client

    async def test_superfund_facility_includes_coordinates(self):
        result = await main.site_search(state="MD", radius=1, limit=50)
        facilities = {f["registry_id"]: f for f in result["facilities"]}
        superfund = facilities["sf-1"]
        self.assertEqual(superfund["latitude"], 38.9)
        self.assertEqual(superfund["longitude"], -76.9)

    async def test_brownfields_facility_includes_coordinates(self):
        result = await main.site_search(state="MD", radius=1, limit=50)
        facilities = {f["registry_id"]: f for f in result["facilities"]}
        brownfield = facilities["bf-1"]
        self.assertEqual(brownfield["latitude"], 38.8)
        self.assertEqual(brownfield["longitude"], -76.8)

    async def test_echo_facility_has_null_coordinates(self):
        result = await main.site_search(state="MD", radius=1, limit=50)
        facilities = {f["registry_id"]: f for f in result["facilities"]}
        echo = facilities["echo-1"]
        self.assertIsNone(echo["latitude"])
        self.assertIsNone(echo["longitude"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/neilgomes/Desktop/Groundwork && python3 -m unittest tests.test_site_search -v`
Expected: FAIL — `KeyError: 'latitude'` on all three tests (the facility dicts don't have that key yet).

- [ ] **Step 3: Add the `_to_float` helper**

In `main.py`, right after the existing `_parse_json` function (`main.py:9-13`):

```python
def _to_float(value):
    return float(value) if value is not None else None
```

- [ ] **Step 4: Update `add_facility` to accept and store coordinates**

In `main.py`, replace the `add_facility` closure (`main.py:315-335`):

```python
    def add_facility(
        registry_id,
        name,
        city,
        state_abbr,
        program,
        compliance_status,
        is_concern,
        latitude=None,
        longitude=None,
    ):
        if not registry_id:
            return
        entry = facilities_by_id.setdefault(
            registry_id,
            {
                "registry_id": registry_id,
                "name": name,
                "city": city,
                "state": state_abbr,
                "programs": [],
                "compliance_status": compliance_status,
                "significant_violation": False,
                "latitude": None,
                "longitude": None,
            },
        )
        if program not in entry["programs"]:
            entry["programs"].append(program)
        if is_concern:
            entry["significant_violation"] = True
        if compliance_status and not entry["compliance_status"]:
            entry["compliance_status"] = compliance_status
        if latitude is not None and entry["latitude"] is None:
            entry["latitude"] = latitude
        if longitude is not None and entry["longitude"] is None:
            entry["longitude"] = longitude
```

- [ ] **Step 5: Give ECHO-sourced facilities explicit null coordinates**

In `main.py`, in the ECHO loop (`main.py:437-447`), add the two new keys to the directly-constructed dict:

```python
        facilities_by_id[registry_id] = {
            "registry_id": registry_id,
            "name": row.get("FacName"),
            "city": row.get("FacCity"),
            "state": row.get("FacState"),
            "programs": programs,
            "compliance_status": row.get("FacComplianceStatus"),
            # FacSNCFlg = EPA's own "Significant Noncompliance" designation --
            # the worst violation tier, distinct from a minor/technical one.
            "significant_violation": row.get("FacSNCFlg") == "Y",
            "latitude": None,
            "longitude": None,
        }
```

- [ ] **Step 6: Pass coordinates through the Superfund `add_facility` call**

In `main.py`, in the Superfund loop (`main.py:449-461`):

```python
    for row in superfund_rows:
        # Being an EPA Superfund site is itself a serious environmental
        # concern -- not a "compliance status" in the same sense as ECHO's
        # programs, but treated as significant so it surfaces near the top.
        add_facility(
            registry_id=row.get("RegistryId"),
            name=row.get("FacilityName"),
            city=row.get("CityName"),
            state_abbr=row.get("StateAbbr"),
            program="SUPERFUND",
            compliance_status="EPA Superfund Site",
            is_concern=True,
            latitude=_to_float(row.get("Latitude83")),
            longitude=_to_float(row.get("Longitude83")),
        )
```

- [ ] **Step 7: Pass coordinates through the Brownfields `add_facility` call**

In `main.py`, in the Brownfields loop (`main.py:463-473`):

```python
    for row in brownfields_rows:
        attrs = row.get("attributes", {})
        add_facility(
            registry_id=attrs.get("REGISTRY_ID"),
            name=attrs.get("PRIMARY_NAME"),
            city=attrs.get("CITY_NAME"),
            state_abbr=attrs.get("STATE_CODE"),
            program="BROWNFIELD",
            compliance_status="Brownfields Property",
            is_concern=False,
            latitude=_to_float(attrs.get("LATITUDE83")),
            longitude=_to_float(attrs.get("LONGITUDE83")),
        )
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Users/neilgomes/Desktop/Groundwork && python3 -m unittest tests.test_site_search -v`
Expected: all 3 tests PASS.

- [ ] **Step 9: Update the frontend type to match**

In `frontend/src/types.ts`, replace the `SiteSearchFacility` interface (`frontend/src/types.ts:62-70`):

```typescript
export interface SiteSearchFacility {
  registry_id: string;
  name: string;
  city: string;
  state: string;
  programs: string[];
  compliance_status: string | null;
  significant_violation: boolean;
  latitude: number | null;
  longitude: number | null;
}
```

- [ ] **Step 10: Commit**

```bash
git add main.py tests/__init__.py tests/test_site_search.py frontend/src/types.ts
git commit -m "Attach coordinates to Superfund/Brownfields facilities in site search"
```

---

### Task 2: Frontend — extract shared program label constants

**Files:**
- Create: `frontend/src/constants/programLabels.ts`
- Modify: `frontend/src/pages/SiteSearchPage.tsx:1-23`

**Interfaces:**
- Produces: `PROGRAM_LABELS: Record<string, string>` and `PROGRAM_TOOLTIPS: Record<string, string>`, exported from `frontend/src/constants/programLabels.ts` — consumed by both `SiteSearchPage.tsx` (Task 2) and `SiteSearchMap.tsx` (Task 3).

This is a pure move of existing constants with no behavior change (needed so the new map component can reuse the same labels as the table without duplicating them) — there's no frontend test harness in this repo to write a test against, so this task is verified by a successful build instead of a test.

- [ ] **Step 1: Create the shared constants file**

Create `frontend/src/constants/programLabels.ts`:

```typescript
export const PROGRAM_LABELS: Record<string, string> = {
  TRI: "Toxic Releases",
  RCRA: "Hazardous Waste",
  CAA: "Air Quality",
  CWA: "Water Discharge",
  SDWA: "Drinking Water",
  SUPERFUND: "Superfund Site",
  BROWNFIELD: "Brownfields Property",
};

export const PROGRAM_TOOLTIPS: Record<string, string> = {
  TRI: "Toxics Release Inventory — self-reported chemical releases",
  RCRA: "Resource Conservation and Recovery Act — hazardous waste handling",
  CAA: "Clean Air Act — air emissions permitting and compliance",
  CWA: "Clean Water Act — water discharge permitting and compliance",
  SDWA: "Safe Drinking Water Act — public drinking water systems",
  SUPERFUND: "EPA Superfund program — a known, serious hazardous waste contamination site",
  BROWNFIELD: "Brownfields program — a property being assessed or redeveloped after past contamination",
};
```

- [ ] **Step 2: Import the constants in `SiteSearchPage.tsx` instead of declaring them locally**

In `frontend/src/pages/SiteSearchPage.tsx`, replace lines 1-23:

```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useSiteSearch } from "../hooks/useSiteSearch";
import { PROGRAM_LABELS, PROGRAM_TOOLTIPS } from "../constants/programLabels";
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors (confirms `PROGRAM_LABELS`/`PROGRAM_TOOLTIPS` usages later in the file — the `title={PROGRAM_TOOLTIPS[program] ?? program}` and `{PROGRAM_LABELS[program] ?? program}` calls — still resolve correctly against the imported constants).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/constants/programLabels.ts frontend/src/pages/SiteSearchPage.tsx
git commit -m "Extract program label constants into a shared module"
```

---

### Task 3: Frontend — add Leaflet and create the `SiteSearchMap` component

**Files:**
- Modify: `frontend/package.json` (add `leaflet`, `react-leaflet` dependencies; `@types/leaflet` devDependency)
- Create: `frontend/src/components/SiteSearchMap.tsx`

**Interfaces:**
- Consumes: `SiteSearchFacility` from `frontend/src/types.ts` (Task 1); `PROGRAM_LABELS` from `frontend/src/constants/programLabels.ts` (Task 2).
- Produces: `SiteSearchMap` (default export) — a React component with props `{ latitude: number | null; longitude: number | null; radius: number; facilities: SiteSearchFacility[] }`, consumed by `SiteSearchPage.tsx` (Task 4).

- [ ] **Step 1: Install the map dependencies**

Run:
```bash
cd /Users/neilgomes/Desktop/Groundwork/frontend
npm install leaflet@1.9.4 react-leaflet@5.0.0
npm install --save-dev @types/leaflet@1.9.21
```
Expected: `package.json` now lists `leaflet` and `react-leaflet` under `dependencies`, and `@types/leaflet` under `devDependencies`.

- [ ] **Step 2: Create the map component**

Create `frontend/src/components/SiteSearchMap.tsx`:

```tsx
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteSearchFacility } from "../types";
import { PROGRAM_LABELS } from "../constants/programLabels";

const MILES_TO_METERS = 1609.34;

interface SiteSearchMapProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  facilities: SiteSearchFacility[];
}

function SiteSearchMap({ latitude, longitude, radius, facilities }: SiteSearchMapProps) {
  const pinned = facilities.filter(
    (facility): facility is SiteSearchFacility & { latitude: number; longitude: number } =>
      facility.latitude !== null && facility.longitude !== null
  );

  if (pinned.length === 0 && latitude === null) {
    return null;
  }

  const center: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : [
          pinned.reduce((sum, facility) => sum + facility.latitude, 0) / pinned.length,
          pinned.reduce((sum, facility) => sum + facility.longitude, 0) / pinned.length,
        ];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "400px", width: "100%", marginBottom: "1rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {latitude !== null && longitude !== null && (
        <>
          <CircleMarker
            center={[latitude, longitude]}
            radius={8}
            pathOptions={{ color: "#2c6fbb", fillColor: "#2c6fbb", fillOpacity: 1 }}
          >
            <Popup>Searched address</Popup>
          </CircleMarker>
          <Circle
            center={[latitude, longitude]}
            radius={radius * MILES_TO_METERS}
            pathOptions={{ color: "#2c6fbb", fillOpacity: 0.05 }}
          />
        </>
      )}
      {pinned.map((facility) => (
        <CircleMarker
          key={facility.registry_id}
          center={[facility.latitude, facility.longitude]}
          radius={6}
          pathOptions={{
            color: facility.significant_violation ? "#c0392b" : "#2e8b57",
            fillColor: facility.significant_violation ? "#c0392b" : "#2e8b57",
            fillOpacity: 0.8,
          }}
        >
          <Popup>
            <strong>{facility.name}</strong>
            <br />
            {facility.programs.map((program) => PROGRAM_LABELS[program] ?? program).join(", ")}
            <br />
            {facility.compliance_status ?? "No Violation Identified"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export default SiteSearchMap;
```

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors. (The component isn't wired into any page yet, so this only confirms it type-checks in isolation — Task 4 verifies it renders correctly.)

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/SiteSearchMap.tsx
git commit -m "Add SiteSearchMap component using React-Leaflet"
```

---

### Task 4: Frontend — wire the map into Site Search and verify in the browser

**Files:**
- Modify: `frontend/src/hooks/useSiteSearch.ts` (expose `latitude`/`longitude` from the API response)
- Modify: `frontend/src/pages/SiteSearchPage.tsx` (render `SiteSearchMap` above the results table)

**Interfaces:**
- Consumes: `SiteSearchMap` from `frontend/src/components/SiteSearchMap.tsx` (Task 3).

- [ ] **Step 1: Expose latitude/longitude from `useSiteSearch`**

In `frontend/src/hooks/useSiteSearch.ts`, replace the whole file:

```typescript
import { useState } from "react";
import type { SiteSearchFacility } from "../types";

interface SiteSearchParams {
  address?: string;
  state?: string;
  radius: number;
  limit: number;
}

export function useSiteSearch() {
  const [facilities, setFacilities] = useState<SiteSearchFacility[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  function search({ address, state, radius, limit }: SiteSearchParams) {
    setLoading(true);
    setError(null);
    setSearched(true);
    const params = new URLSearchParams({ radius: String(radius), limit: String(limit) });
    if (address) params.set("address", address);
    if (state) params.set("state", state);
    fetch(`http://127.0.0.1:8000/api/site-search?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFacilities(data.facilities);
        setLatitude(data.latitude);
        setLongitude(data.longitude);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return { facilities, latitude, longitude, loading, error, searched, search };
}
```

- [ ] **Step 2: Render the map on the Site Search page**

In `frontend/src/pages/SiteSearchPage.tsx`:

Replace the hook destructuring line:
```tsx
  const { facilities, loading, error, searched, search } = useSiteSearch();
```
with:
```tsx
  const { facilities, latitude, longitude, loading, error, searched, search } = useSiteSearch();
```

Add the import at the top, alongside the other imports:
```tsx
import SiteSearchMap from "../components/SiteSearchMap";
```

Render the map right after the results-summary conditionals and before the `<table>` block — insert it immediately before the line `{!loading && !error && facilities.length > 0 && (`:
```tsx
      {!loading && !error && facilities.length > 0 && (
        <SiteSearchMap
          latitude={latitude}
          longitude={longitude}
          radius={radius}
          facilities={facilities}
        />
      )}
      {!loading && !error && facilities.length > 0 && (
        <table className="table">
```

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Manually verify in the browser**

Start both servers:
```bash
cd /Users/neilgomes/Desktop/Groundwork && uvicorn main:app --reload &
cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run dev
```

Open the frontend URL Vite prints, navigate to Site Search, and check:
- Address search (e.g. "1600 Pennsylvania Ave, Washington, DC", radius 5 miles): map appears above the table, centered on the address, with a blue center marker, a light-blue radius circle matching the selected radius, and colored pins (red for significant-violation/Superfund, green otherwise) for Superfund/Brownfields results. Clicking a pin shows a popup with the facility's name, programs, and compliance status.
- State search (e.g. state "MD"): map still appears (centered on the average of whatever Superfund/Brownfields pins came back), table unaffected.
- A search that returns zero Superfund/Brownfields facilities (only ECHO results): confirm the map does not render as a blank/broken box — no visible map component at all, table still shows all results as before.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSiteSearch.ts frontend/src/pages/SiteSearchPage.tsx
git commit -m "Render SiteSearchMap on the Site Search page"
```
