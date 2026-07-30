# New Design — Emissions Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Emissions Center to New Design — same data, same functionality, restyled only, per explicit user direction ("same thing same function").

**Architecture:** A new page component (`newDesign/EmissionsCenterPageNew.tsx`) consuming the exact same unmodified `useGhgEmitters` hook as Classic. Wired into `App.tsx` via a new `EmissionsCenterRoute` wrapper, following the identical pattern already established for the other four New Design pages.

**Tech Stack:** React 19 + TypeScript + Vite frontend only. No backend changes, no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-new-design-emissions-center.md` — read it before starting if anything below is unclear.
- **Same functionality, same data — no additions.** Do NOT modify `EmissionsCenterPage.tsx` or `useGhgEmitters.ts` — read-only references only. Do NOT add a bubble map, a proportional bar/magnitude indicator, or any field/data Classic's table doesn't already show. Classic's table has no visual magnitude indicator at all (unlike Hazard Watch, which does) — do not add one here; that would be a functional addition beyond "restyle only."
- **One permitted, minimal exception:** a rank number (`index + 1` in the already-sorted array) may be displayed per row, since it restates the existing backend sort order visually rather than adding new data or computation — this matches the established New Design visual convention (every ranked list in this app's New Design set shows a rank number) without changing functionality.
- No frontend test harness exists in this repo — verification is `npm run build` (type-check) plus manual/reasoned verification. No browser automation tool is available in this session.

---

### Task 1: `EmissionsCenterPageNew` and route wiring

**Files:**
- Create: `frontend/src/newDesign/EmissionsCenterPageNew.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useGhgEmitters(stateAbbr)` (unmodified) returning `{ emitters: GhgEmitter[], loading, error }`; `colors`/`fonts` from `frontend/src/newDesign/theme.ts`.

- [ ] **Step 1: Create the page**

Create `frontend/src/newDesign/EmissionsCenterPageNew.tsx`:

```tsx
import { useState } from "react";
import { useGhgEmitters } from "../hooks/useGhgEmitters";
import { colors, fonts } from "./theme";

function EmissionsCenterPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { emitters, loading, error } = useGhgEmitters(submittedState);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        Emissions Center
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 26px", maxWidth: "56ch" }}>
        Top greenhouse gas emitters by state, from EPA's Greenhouse Gas Reporting Program
        (GHGRP) — total CO2-equivalent emissions across all reported gas types, for the most
        recent year each state has data for.
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
          Search top emitters
        </button>
      </div>

      {loading && <p>Loading emissions data...</p>}
      {error && <p style={{ color: colors.dangerText }}>Error loading emissions data: {error}</p>}
      {!loading && !error && emitters.length === 0 && (
        <p>No GHG emissions data found for "{submittedState}".</p>
      )}
      {!loading && !error && emitters.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden" }}>
          {emitters.map((emitter, i) => (
            <div
              key={emitter.facility_id}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1.6fr 1fr 1fr 1.2fr",
                gap: "16px",
                alignItems: "center",
                padding: "18px 22px",
                borderBottom: i === emitters.length - 1 ? "none" : "1px solid #EEF0E7",
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "22px", color: colors.midGreen }}>
                {i + 1}
              </div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "16px", color: colors.darkGreen }}>
                {emitter.facility_name}
              </div>
              <div style={{ fontSize: "14px", color: colors.mutedText }}>{emitter.city}</div>
              <div style={{ fontSize: "14px", color: colors.mutedText }}>{emitter.year}</div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "15px", color: colors.darkGreen, textAlign: "right" }}>
                {emitter.total_co2e.toLocaleString()} t CO2e
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmissionsCenterPageNew;
```

Note: no proportional bar/magnitude indicator is included here, unlike `HazardWatchPageNew.tsx`'s pattern — Classic's Emissions Center table has no visual magnitude indicator at all, so adding one would be a functional addition beyond the confirmed "restyle only" scope. Only the rank number (permitted per Global Constraints) is added beyond Classic's exact fields.

- [ ] **Step 2: Wire the theme-conditional route in `App.tsx`**

This branch's `App.tsx` currently has four theme-conditional route wrappers (`FacilityDetailRoute`, `SiteSearchRoute`, `SearchRoute`, `HazardWatchRoute`) and one plain Classic-only route for `/emissions-center`. Add the same wrapper pattern for it. Replace `frontend/src/App.tsx` in full:

```tsx
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import EmissionsCenterPage from "./pages/EmissionsCenterPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import SearchPageNew from "./newDesign/SearchPageNew";
import HazardWatchPageNew from "./newDesign/HazardWatchPageNew";
import EmissionsCenterPageNew from "./newDesign/EmissionsCenterPageNew";
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

function EmissionsCenterRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <EmissionsCenterPageNew /> : <EmissionsCenterPage />;
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
          <Route path="/emissions-center" element={<EmissionsCenterRoute />} />
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

With both dev servers running, navigate to Emissions Center:
- With the toggle on **Classic**: confirm it looks and behaves exactly as before this task (plain table, no rank numbers) — critical revertibility check.
- Flip to **New Design**: confirm the ranked row list renders with rank numbers matching the already-sorted order (position 1 has the highest `total_co2e`), all four Classic fields display correctly (name, city, year, total CO2e), and no bar/magnitude indicator or map appears anywhere.
- Confirm a zero-result search shows the "No GHG emissions data found" message.
- Flip back to Classic, confirm it still works exactly as before.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/newDesign/EmissionsCenterPageNew.tsx frontend/src/App.tsx
git commit -m "Add New Design Emissions Center page, wired behind the theme toggle"
```
