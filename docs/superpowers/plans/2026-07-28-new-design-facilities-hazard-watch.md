# New Design — Facilities + Hazard Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the last two pages of the 4-page New Design set — Facilities (browse) and Hazard Watch — completing the full mockup port.

**Architecture:** Two new page components (`newDesign/SearchPageNew.tsx`, `newDesign/HazardWatchPageNew.tsx`), each consuming the exact same unmodified hook as its Classic counterpart. Wired into `App.tsx` via two new route wrapper components, following the exact same pattern already established for `FacilityDetailRoute`/`SiteSearchRoute`.

**Tech Stack:** React 19 + TypeScript + Vite frontend only. No backend changes, no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-new-design-facilities-hazard-watch.md` — read it before starting if anything below is unclear.
- **Revertibility remains the top priority.** Do NOT modify `SearchPage.tsx`, `HazardWatchPage.tsx`, `useFacilitySearch.ts`, or `useHazardWatch.ts` anywhere in this plan — read-only references only.
- Facilities cards show only `facility_name` and `city_name, state_abbr` — no program badges, no compliance dot. This is a deliberate scope decision (the browse endpoint doesn't return that data), not an oversight to "fix" by adding extra fetches.
- No frontend test harness exists in this repo — verification is `npm run build` (type-check) plus manual/reasoned verification. No browser automation tool is available in this session.
- These two tasks are sequential (not parallel) because both modify `App.tsx` — Task 2 must start from Task 1's already-updated file to avoid edit conflicts.

---

### Task 1: `SearchPageNew` (Facilities) and route wiring

**Files:**
- Create: `frontend/src/newDesign/SearchPageNew.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useFacilitySearch(stateAbbr)` (unmodified) returning `{ facilities: FacilitySearchResult[], loading, error }`; `colors`/`fonts` from `frontend/src/newDesign/theme.ts`.

- [ ] **Step 1: Create the page**

Create `frontend/src/newDesign/SearchPageNew.tsx`:

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useFacilitySearch } from "../hooks/useFacilitySearch";
import { colors, fonts } from "./theme";

function SearchPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { facilities, loading, error } = useFacilitySearch(submittedState);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        TRI Facilities
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 22px", maxWidth: "54ch" }}>
        Browse Toxics Release Inventory reporters by state. Select a facility for its full release
        history and compliance record.
      </p>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "26px" }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          style={{
            width: "88px",
            padding: "12px 16px",
            border: "1.5px solid #E1E4D8",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 700,
            textAlign: "center",
            background: colors.cardBackground,
            color: colors.darkGreen,
            outline: "none",
            letterSpacing: "0.1em",
          }}
        />
        <button
          type="button"
          onClick={() => setSubmittedState(inputValue)}
          style={{
            padding: "12px 24px",
            border: "none",
            borderRadius: "14px",
            background: colors.darkGreen,
            color: colors.background,
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Search facilities
        </button>
        <span style={{ fontSize: "14px", color: colors.mutedText }}>
          state code · showing {facilities.length} facilities
        </span>
      </div>

      {loading && <p>Loading facilities...</p>}
      {error && <p style={{ color: colors.dangerText }}>Error loading facilities: {error}</p>}
      {!loading && !error && facilities.length === 0 && (
        <p>No facilities found for "{submittedState}".</p>
      )}
      {!loading && !error && facilities.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "16px" }}>
          {facilities.map((facility) => (
            <Link
              key={facility.tri_facility_id}
              to={`/facility/${facility.tri_facility_id}`}
              style={{
                display: "block",
                background: colors.cardBackground,
                border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: "20px",
                padding: "18px 20px",
                textDecoration: "none",
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "18px", color: colors.darkGreen }}>
                {facility.facility_name}
              </div>
              <div style={{ fontSize: "13px", color: colors.mutedText, marginTop: "3px" }}>
                {facility.city_name}, {facility.state_abbr}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPageNew;
```

- [ ] **Step 2: Wire the theme-conditional route in `App.tsx`**

This branch's `App.tsx` currently has `FacilityDetailRoute` and `SiteSearchRoute` wrapper components. Add the same pattern for `/` (the Facilities/Search page). Replace `frontend/src/App.tsx` in full:

```tsx
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import SearchPageNew from "./newDesign/SearchPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <FacilityDetailPageNew /> : <FacilityDetailPage />;
}

function SiteSearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SiteSearchPageNew /> : <SiteSearchPage />;
}

function SearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SearchPageNew /> : <SearchPage />;
}

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchRoute />} />
          <Route path="/facility/:id" element={<FacilityDetailRoute />} />
          <Route path="/hazard-watch" element={<HazardWatchPage />} />
          <Route path="/site-search" element={<SiteSearchRoute />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
```

(Task 2 will add the `/hazard-watch` route wrapper on top of this — the line above stays `<HazardWatchPage />` unconditionally until then.)

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Manually verify both themes in the browser**

With both dev servers running, navigate to `/` (the home page):
- With the toggle on **Classic**: confirm it looks and behaves exactly as before this task (list-group of links, "TRI Facility Explorer" title) — critical revertibility check.
- Flip to **New Design**: confirm the "showing N facilities" count updates after a search, the card grid renders name + city/state only (no program badges), and clicking a card navigates to Facility Detail correctly.
- Confirm a zero-result search shows the "No facilities found" message, not a broken/empty grid.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/newDesign/SearchPageNew.tsx frontend/src/App.tsx
git commit -m "Add New Design Facilities page, wired behind the theme toggle"
```

---

### Task 2: `HazardWatchPageNew` and route wiring

**Files:**
- Create: `frontend/src/newDesign/HazardWatchPageNew.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useHazardWatch(stateAbbr)` (unmodified) returning `{ rows: HazardWatchRow[], loading, error }`; `colors`/`fonts` from `frontend/src/newDesign/theme.ts`.

- [ ] **Step 1: Create the page**

Create `frontend/src/newDesign/HazardWatchPageNew.tsx`:

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useHazardWatch } from "../hooks/useHazardWatch";
import { colors, fonts } from "./theme";

function HazardWatchPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { rows, loading, error } = useHazardWatch(submittedState);

  const maxRelease = Math.max(...rows.map((r) => r.total_release), 1);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: colors.dangerBg,
          color: colors.dangerText,
          padding: "6px 14px",
          borderRadius: "999px",
          fontSize: "12.5px",
          fontWeight: 700,
          marginBottom: "14px",
        }}
      >
        ⚠ Persistent Bioaccumulative Toxics
      </div>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        Hazard Watch
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 26px", maxWidth: "56ch" }}>
        Every release of an EPA-designated PBT chemical in {submittedState} — the substances that
        don't break down and accumulate up the food chain. Worst offenders first.
      </p>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "26px" }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          style={{
            width: "88px",
            padding: "12px 16px",
            border: "1.5px solid #E1E4D8",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 700,
            textAlign: "center",
            background: colors.cardBackground,
            color: colors.darkGreen,
            outline: "none",
            letterSpacing: "0.1em",
          }}
        />
        <button
          type="button"
          onClick={() => setSubmittedState(inputValue)}
          style={{
            padding: "12px 24px",
            border: "none",
            borderRadius: "14px",
            background: colors.darkGreen,
            color: colors.background,
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Search hazardous releases
        </button>
      </div>

      {loading && <p>Loading hazardous releases...</p>}
      {error && <p style={{ color: colors.dangerText }}>Error loading hazardous releases: {error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p>No hazardous releases found for "{submittedState}".</p>
      )}
      {!loading && !error && rows.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden" }}>
          {rows.map((row, i) => (
            <div
              key={`${row.facility_id}-${row.chem_id}-${row.year}`}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1.4fr 1fr 1.4fr",
                gap: "16px",
                alignItems: "center",
                padding: "18px 22px",
                borderBottom: i === rows.length - 1 ? "none" : "1px solid #EEF0E7",
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "22px", color: colors.dangerDot }}>
                {i + 1}
              </div>
              <div>
                <Link
                  to={`/facility/${row.facility_id}`}
                  style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "16px", color: colors.darkGreen, textDecoration: "none" }}
                >
                  {row.facility_name}
                </Link>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: colors.warningText,
                    background: colors.warningBg,
                    display: "inline-block",
                    padding: "2px 9px",
                    borderRadius: "99px",
                    marginTop: "5px",
                    fontWeight: 600,
                  }}
                >
                  {row.chemical}
                </div>
              </div>
              <div style={{ fontSize: "13px", color: colors.mutedText }}>
                Reporting year
                <br />
                <b style={{ color: colors.bodyText, fontSize: "15px" }}>{row.year}</b>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.mutedText, marginBottom: "6px" }}>
                  total release
                  <b style={{ color: colors.darkGreen, fontSize: "14px" }}>{row.total_release.toLocaleString()} lbs</b>
                </div>
                <div style={{ height: "9px", background: "#F0E3E1", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.round((row.total_release / maxRelease) * 100)}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, #E7A08F, ${colors.dangerDot})`,
                      borderRadius: "99px",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HazardWatchPageNew;
```

- [ ] **Step 2: Wire the theme-conditional route in `App.tsx`**

This branch's `App.tsx` (after Task 1) has `FacilityDetailRoute`, `SiteSearchRoute`, and `SearchRoute` wrappers, with `/hazard-watch` still unconditionally rendering `<HazardWatchPage />`. Add the same wrapper pattern for it. Replace `frontend/src/App.tsx` in full:

```tsx
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import SearchPageNew from "./newDesign/SearchPageNew";
import HazardWatchPageNew from "./newDesign/HazardWatchPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <FacilityDetailPageNew /> : <FacilityDetailPage />;
}

function SiteSearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SiteSearchPageNew /> : <SiteSearchPage />;
}

function SearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SearchPageNew /> : <SearchPage />;
}

function HazardWatchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <HazardWatchPageNew /> : <HazardWatchPage />;
}

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchRoute />} />
          <Route path="/facility/:id" element={<FacilityDetailRoute />} />
          <Route path="/hazard-watch" element={<HazardWatchRoute />} />
          <Route path="/site-search" element={<SiteSearchRoute />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
```

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Manually verify both themes in the browser**

With both dev servers running, navigate to Hazard Watch:
- With the toggle on **Classic**: confirm it looks and behaves exactly as before this task (plain table) — critical revertibility check.
- Flip to **New Design**: confirm the ranked row list renders, each row's bar width is proportional to its release amount relative to the largest release in the current results (the top-ranked row's bar should be the widest, roughly full-width), clicking a facility name navigates to Facility Detail correctly, and the eyebrow tag/intro copy render correctly with the searched state interpolated.
- Confirm a zero-result search shows the "No hazardous releases found" message.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/newDesign/HazardWatchPageNew.tsx frontend/src/App.tsx
git commit -m "Add New Design Hazard Watch page, wired behind the theme toggle"
```
