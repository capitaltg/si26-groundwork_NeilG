# Site Search Report Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a print-formatted report to the Site Search page — subject property, date generated, sources reviewed, disclaimer, plus the existing map and facility table — triggered by an "Export Report" button that calls `window.print()`.

**Architecture:** Print CSS on the existing Site Search page (not a separate route): a `@media print` stylesheet hides interactive chrome (nav, form, buttons, Leaflet controls) and reveals a print-only block. No PDF library, no new backend endpoint, no new route.

**Tech Stack:** React 19 + TypeScript + Vite frontend only. No backend changes.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-site-search-report-export-design.md` — read it before starting if anything below is unclear.
- No backend changes in this feature at all.
- No new frontend dependency — plain CSS + `window.print()`.
- No frontend test harness exists in this repo (established in the prior map feature's plan) — verification is `npm run build` (type-check) plus manual browser verification. There is no browser automation tool available in this session either, so manual verification means careful code/CSS reasoning plus asking the user to do a real Cmd+P check afterward, same as the map feature's final wiring task.
- `frontend/src/index.css` exists but is **not currently imported anywhere** — verified by checking `main.tsx`, which only imports `bootstrap/dist/css/bootstrap.css`. This plan revives `index.css` by adding the import, rather than creating a new CSS file.
- The report must reflect the search that was actually submitted, not the live (possibly since-edited) form state — this is why `useSiteSearch` needs a `lastSearch` field (Task 1), not just reading the page's `address`/`state`/`radius` `useState` values directly.

---

### Task 1: Track the submitted search in `useSiteSearch`

**Files:**
- Modify: `frontend/src/hooks/useSiteSearch.ts` (entire file — small enough to replace wholesale)

**Interfaces:**
- Produces: a new exported type `SubmittedSearch { address: string; state: string; radius: number }`, and the hook's return object gains `lastSearch: SubmittedSearch | null` — consumed by `SiteSearchPage.tsx` in Task 2 to build the report's subject line.

- [ ] **Step 1: Replace the hook file**

Replace `frontend/src/hooks/useSiteSearch.ts` in full:

```typescript
import { useState } from "react";
import type { SiteSearchFacility } from "../types";

interface SiteSearchParams {
  address?: string;
  state?: string;
  radius: number;
  limit: number;
}

export interface SubmittedSearch {
  address: string;
  state: string;
  radius: number;
}

export function useSiteSearch() {
  const [facilities, setFacilities] = useState<SiteSearchFacility[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [lastSearch, setLastSearch] = useState<SubmittedSearch | null>(null);

  function search({ address, state, radius, limit }: SiteSearchParams) {
    setLoading(true);
    setError(null);
    setSearched(true);
    setLastSearch({ address: address ?? "", state: state ?? "", radius });
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

  return { facilities, latitude, longitude, loading, error, searched, lastSearch, search };
}
```

- [ ] **Step 2: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors. Adding a field to a hook's return object is backward-compatible — `SiteSearchPage.tsx` (unchanged in this task) destructures the hook's return value without requesting `lastSearch` today, which is fine; TypeScript does not require every field of a returned object to be destructured. If the build fails, it indicates a mistake in the replacement code above, not an expected/acceptable failure.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSiteSearch.ts
git commit -m "Track the submitted search params in useSiteSearch"
```

---

### Task 2: Print CSS, Export Report button, and print-only report block

**Files:**
- Modify: `frontend/src/main.tsx` (add the `index.css` import)
- Modify: `frontend/src/index.css` (currently empty and unimported — add print rules)
- Modify: `frontend/src/pages/SiteSearchPage.tsx` (wrap interactive chrome in `.no-print`, add the print-only report block, add the Export Report button)

**Interfaces:**
- Consumes: `lastSearch: SubmittedSearch | null` from `useSiteSearch()` (Task 1).

- [ ] **Step 1: Import `index.css` in `main.tsx`**

In `frontend/src/main.tsx`, add the import right after the bootstrap import:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
```

- [ ] **Step 2: Add print rules to `index.css`**

Replace the (currently empty) `frontend/src/index.css` with:

```css
.print-only {
  display: none;
}

@media print {
  .no-print,
  .navbar {
    display: none !important;
  }
  .print-only {
    display: block;
  }
  .leaflet-control-zoom,
  .leaflet-control-attribution {
    display: none;
  }
  .leaflet-container,
  table {
    break-inside: avoid;
  }
}
```

- [ ] **Step 3: Update `SiteSearchPage.tsx`**

Replace `frontend/src/pages/SiteSearchPage.tsx` in full:

```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useSiteSearch } from "../hooks/useSiteSearch";
import { PROGRAM_LABELS, PROGRAM_TOOLTIPS } from "../constants/programLabels";
import SiteSearchMap from "../components/SiteSearchMap";

function ComplianceBadge({
  status,
  significantViolation,
}: {
  status: string | null;
  significantViolation: boolean;
}) {
  if (significantViolation) {
    return <span className="badge bg-danger">⚠ Significant Violation</span>;
  }
  if (status && status !== "No Violation Identified") {
    return <span className="badge bg-warning text-dark">{status}</span>;
  }
  return <span className="badge bg-success">{status ?? "No Violation Identified"}</span>;
}

function SiteSearchPage() {
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState(1);
  const [limit, setLimit] = useState(100);
  const { facilities, latitude, longitude, loading, error, searched, lastSearch, search } =
    useSiteSearch();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim() && !state.trim()) return;
    search({ address: address.trim(), state: state.trim().toUpperCase(), radius, limit });
  }

  return (
    <div>
      <div className="no-print">
        <h1>Site Search</h1>
        <p>
          Find EPA-regulated facilities near a property — or across a whole state —
          spanning every environmental program, not just TRI reporters.
        </p>
        <form onSubmit={handleSubmit} className="d-flex gap-2 mb-2 flex-wrap align-items-center">
          <input
            className="form-control"
            style={{ maxWidth: "20rem" }}
            placeholder="Street address, city, state, zip"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <select
            className="form-select"
            style={{ maxWidth: "10rem" }}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value={0.25}>0.25 miles</option>
            <option value={0.5}>0.5 miles</option>
            <option value={1}>1 mile</option>
            <option value={3}>3 miles</option>
            <option value={5}>5 miles</option>
          </select>
          <span>or</span>
          <input
            className="form-control"
            style={{ maxWidth: "6rem" }}
            placeholder="State (e.g. MD)"
            maxLength={2}
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
          />
          <span>Show up to</span>
          <select
            className="form-select"
            style={{ maxWidth: "8rem" }}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Enter an address to search a specific radius, or just a state to search broadly
          (no radius needed).
        </p>
      </div>

      {loading && <p>Searching...</p>}
      {error && <p className="text-danger">Error: {error}</p>}
      {!loading && !error && searched && facilities.length === 0 && (
        <p>No regulated facilities found for that search.</p>
      )}
      {!loading && !error && facilities.length > 0 && lastSearch && (
        <>
          <div className="print-only">
            <h1>Environmental Site Search Report</h1>
            <p>
              {lastSearch.address
                ? `Address: ${lastSearch.address}, Radius: ${lastSearch.radius} miles`
                : `State-wide search: ${lastSearch.state}`}
            </p>
            <p>Date generated: {new Date().toLocaleDateString()}</p>
            <h2>Sources Reviewed</h2>
            <ul>
              <li>EPA ECHO (Enforcement and Compliance History Online)</li>
              <li>EPA FRS (Facility Registry Service — Superfund/SEMS)</li>
              <li>EPA Brownfields (ArcGIS FRS_INTERESTS layer)</li>
              {lastSearch.address && <li>US Census Geocoder</li>}
            </ul>
            <p>
              This report is a summary generated from public EPA/Census data available at
              the time of generation. It is not a professional environmental opinion and
              does not replace a qualified assessor's review.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary mb-2 no-print"
            onClick={() => window.print()}
          >
            Export Report
          </button>

          <SiteSearchMap
            latitude={latitude}
            longitude={longitude}
            radius={radius}
            facilities={facilities}
          />

          <table className="table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>City</th>
                <th>State</th>
                <th>Programs</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility) => (
                <tr key={facility.registry_id}>
                  <td>{facility.name}</td>
                  <td>{facility.city}</td>
                  <td>{facility.state}</td>
                  <td>
                    {facility.programs.map((program) => (
                      <span
                        key={program}
                        className="badge bg-secondary me-1"
                        title={PROGRAM_TOOLTIPS[program] ?? program}
                      >
                        {PROGRAM_LABELS[program] ?? program}
                      </span>
                    ))}
                  </td>
                  <td>
                    <ComplianceBadge
                      status={facility.compliance_status}
                      significantViolation={facility.significant_violation}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default SiteSearchPage;
```

Note the two previously-separate conditional blocks for the map and the table (each independently gated on `{!loading && !error && facilities.length > 0 && (...)}`) are merged into one `<>...</>` fragment under a single condition (`... && lastSearch &&`), with the print-only block and the Export button added inside the same fragment. This is deliberate: it's what lets the Export button, the print-only report header, and the results always appear/disappear together, and it directly implements the spec's "Export Report button rendered inside the same conditional block as the existing table/map" requirement. The `&& lastSearch` clause is required both logically (no report content without knowing what was searched) and for TypeScript (`lastSearch` is `SubmittedSearch | null`; without this check, `lastSearch.address` inside the block would be a type error).

- [ ] **Step 4: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 5: Manually verify in the browser**

Start both servers (if not already running):
```bash
cd /Users/neilgomes/Desktop/Groundwork && uvicorn main:app --reload &
cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run dev
```

Open the frontend URL Vite prints, navigate to Site Search, and check:
- Run an address search (e.g. "1600 Pennsylvania Ave, Washington, DC", radius 5 miles) with results. Confirm an "Export Report" button appears above the map.
- Open the browser's print preview (Cmd+P on Mac, Ctrl+P on Windows/Linux — or click "Export Report", which calls `window.print()` directly). Confirm: the page title/intro/search form are NOT visible in the print preview; a "Environmental Site Search Report" heading IS visible, with the subject line reading "Address: 1600 Pennsylvania Ave, Washington, DC, Radius: 5 miles", a "Date generated" line with today's date, a "Sources Reviewed" list including "US Census Geocoder", and the disclaimer paragraph; the map and facility table are still visible below that; Leaflet's zoom controls and attribution are not visible.
- Run a state-only search (e.g. state "MD"). Confirm the print preview's subject line instead reads "State-wide search: MD", and the Sources Reviewed list does NOT include "US Census Geocoder".
- Cancel out of print preview without actually saving a PDF (this step is about confirming the layout is correct, not producing a file).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/main.tsx frontend/src/index.css frontend/src/pages/SiteSearchPage.tsx
git commit -m "Add print-formatted report export to Site Search page"
```
