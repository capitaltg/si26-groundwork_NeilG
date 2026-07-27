# New Design — Site Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Site Search page to New Design (page 2 of 4), including a restyled map with 3-tier marker coloring, and extract a shared badge-styling module so this and the already-shipped Facility Detail port stop duplicating color literals.

**Architecture:** A new shared `newDesign/badge.ts` module centralizes badge color tokens (not derivation logic — each page keeps its own domain-specific tier logic). A new `newDesign/SiteSearchMapNew.tsx` component mirrors `SiteSearchMap.tsx`'s proven Leaflet/`fitBounds` pattern with 3-tier coloring. A new `newDesign/SiteSearchPageNew.tsx` consumes the exact same `useSiteSearch()` hook as Classic. `App.tsx`'s `/site-search` route becomes theme-conditional, following the same `FacilityDetailRoute` pattern already established.

**Tech Stack:** React 19 + TypeScript + Vite frontend only. No backend changes, no new dependencies (Leaflet/react-leaflet already installed).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-new-design-site-search.md` — read it before starting if anything below is unclear.
- **Revertibility remains the top priority.** Do NOT modify `SiteSearchPage.tsx`, `SiteSearchMap.tsx`, `useSiteSearch.ts`, or `constants/programLabels.ts` anywhere in this plan — read-only references only. Classic mode must stay byte-identical to what exists today.
- Export Report (the print button/behavior) is explicitly **out of scope** — New Design's Site Search page will not include it. Do not attempt to replicate it.
- `FacilityDetailPageNew.tsx` (already shipped, on this same branch) IS allowed to be modified in this plan — it's New Design's own file, not a Classic one — specifically to adopt the new shared `badge.ts` module instead of its current inline color literals.
- No frontend test harness exists in this repo — verification is `npm run build` (type-check) plus manual/reasoned verification. No browser automation tool is available in this session.
- Reuse `PROGRAM_LABELS` from `frontend/src/constants/programLabels.ts` as-is (already shared/exported) — do not redefine program labels in New Design.

---

### Task 1: Shared badge styling module + refactor Facility Detail to use it

**Files:**
- Create: `frontend/src/newDesign/badge.ts`
- Modify: `frontend/src/newDesign/FacilityDetailPageNew.tsx` (refactor only — no behavior change)

**Interfaces:**
- Produces: `BadgeTier = "critical" | "warning" | "clean" | "unknown"` and `badgeStyle(tier: BadgeTier) -> { bg: string; color: string; dot: string }`, exported from `frontend/src/newDesign/badge.ts` — consumed by `FacilityDetailPageNew.tsx` (this task) and `SiteSearchPageNew.tsx`/`SiteSearchMapNew.tsx` (Tasks 2-3).

- [ ] **Step 1: Create the shared badge module**

Create `frontend/src/newDesign/badge.ts`:

```typescript
import { colors } from "./theme";

export type BadgeTier = "critical" | "warning" | "clean" | "unknown";

export interface BadgeColors {
  bg: string;
  color: string;
  dot: string;
}

export function badgeStyle(tier: BadgeTier): BadgeColors {
  switch (tier) {
    case "critical":
      return { bg: colors.dangerBg, color: colors.dangerText, dot: colors.dangerDot };
    case "warning":
      return { bg: colors.warningBg, color: colors.warningText, dot: colors.warningDot };
    case "unknown":
      return { bg: colors.neutralBg, color: colors.neutralText, dot: colors.mutedText };
    case "clean":
      return { bg: colors.neutralBg, color: colors.neutralText, dot: colors.successGreen };
  }
}
```

- [ ] **Step 2: Refactor `FacilityDetailPageNew.tsx`'s `deriveBadge` to use it**

In `frontend/src/newDesign/FacilityDetailPageNew.tsx`, this is a pure refactor — the function must return the exact same `label` strings and the exact same `bg`/`color`/`dot` values as before for every input, just sourced from `badgeStyle()` instead of repeated inline literals. Add the import and replace the `Badge` interface/`deriveBadge` function:

```tsx
import { badgeStyle } from "./badge";
import type { BadgeTier } from "./badge";
```

Replace the existing `interface Badge { ... }` and `function deriveBadge(...)` block with:

```typescript
interface Badge {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

function deriveBadge(programs: ComplianceProgram[]): Badge {
  let tier: BadgeTier;
  let label: string;

  if (programs.length === 0) {
    tier = "unknown";
    label = "No Compliance Data";
  } else if (programs.some((p) => p.status === "Significant Violation")) {
    tier = "critical";
    label = "Significant Violation";
  } else {
    const nonClean = programs.find((p) => p.status !== "No Violation Identified");
    if (nonClean) {
      tier = "warning";
      label = nonClean.status ?? "Status Unknown";
    } else {
      tier = "clean";
      label = "No Violation Identified";
    }
  }

  return { label, ...badgeStyle(tier) };
}
```

This produces identical output to the pre-refactor version for every case (verify this in Step 4 below) — only the color literals are now sourced from the shared module.

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Verify no behavior change (reasoning, no test harness in this repo)**

Trace through all four tiers and confirm the output is byte-identical to the pre-refactor function:
- `programs: []` → `{ label: "No Compliance Data", bg: colors.neutralBg, color: colors.neutralText, dot: colors.mutedText }` — matches pre-refactor.
- A program with `status: "Significant Violation"` present → `{ label: "Significant Violation", bg: colors.dangerBg, color: colors.dangerText, dot: colors.dangerDot }` — matches pre-refactor.
- A program with `status: "Violation Identified"` (no Significant Violation present) → `{ label: "Violation Identified", bg: colors.warningBg, color: colors.warningText, dot: colors.warningDot }` — matches pre-refactor.
- A program with `status: null` mixed with otherwise-clean programs → `{ label: "Status Unknown", bg: colors.warningBg, color: colors.warningText, dot: colors.warningDot }` — matches pre-refactor (this was the null-status fix from the prior review round; confirm it still holds after this refactor).
- All programs `status: "No Violation Identified"` → `{ label: "No Violation Identified", bg: colors.neutralBg, color: colors.neutralText, dot: colors.successGreen }` — matches pre-refactor.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/newDesign/badge.ts frontend/src/newDesign/FacilityDetailPageNew.tsx
git commit -m "Extract shared badge styling module, refactor Facility Detail to use it"
```

---

### Task 2: `SiteSearchMapNew` component

**Files:**
- Create: `frontend/src/newDesign/SiteSearchMapNew.tsx`

**Interfaces:**
- Consumes: `SiteSearchFacility` from `frontend/src/types.ts` (unmodified); `badgeStyle`/`BadgeTier` from `frontend/src/newDesign/badge.ts` (Task 1).
- Produces: `SiteSearchMapNew` (default export) — props `{ latitude: number | null; longitude: number | null; radius: number; facilities: SiteSearchFacility[] }` (same prop shape as Classic's `SiteSearchMap`, for drop-in familiarity) — consumed by `SiteSearchPageNew.tsx` (Task 3).

This component mirrors `frontend/src/components/SiteSearchMap.tsx`'s structure closely (same `fitBounds`/memoization pattern — read that file for the exact pattern being followed) but is a **new, separate file** — `SiteSearchMap.tsx` itself is never modified.

- [ ] **Step 1: Create the map component**

Create `frontend/src/newDesign/SiteSearchMapNew.tsx`:

```tsx
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteSearchFacility } from "../types";
import { PROGRAM_LABELS } from "../constants/programLabels";
import { badgeStyle } from "./badge";
import type { BadgeTier } from "./badge";

const MILES_TO_METERS = 1609.34;
const SINGLE_PIN_FALLBACK_MILES = 2;

interface SiteSearchMapNewProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  facilities: SiteSearchFacility[];
}

function tierFor(facility: SiteSearchFacility): BadgeTier {
  if (facility.significant_violation) return "critical";
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") return "warning";
  return "clean";
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function SiteSearchMapNew({ latitude, longitude, radius, facilities }: SiteSearchMapNewProps) {
  const pinned = useMemo(
    () =>
      facilities.filter(
        (facility): facility is SiteSearchFacility & { latitude: number; longitude: number } =>
          facility.latitude !== null && facility.longitude !== null
      ),
    [facilities]
  );

  const pinnedKey = useMemo(
    () => pinned.map((facility) => `${facility.registry_id}:${facility.latitude}:${facility.longitude}`).join("|"),
    [pinned]
  );

  const center: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : pinned.length > 0
        ? [
            pinned.reduce((sum, facility) => sum + facility.latitude, 0) / pinned.length,
            pinned.reduce((sum, facility) => sum + facility.longitude, 0) / pinned.length,
          ]
        : [0, 0];

  const bounds: LatLngBoundsExpression = useMemo(
    () =>
      latitude !== null && longitude !== null
        ? L.latLng(latitude, longitude).toBounds(radius * MILES_TO_METERS * 2)
        : pinned.length > 1
          ? L.latLngBounds(pinned.map((facility) => [facility.latitude, facility.longitude]))
          : L.latLng(center[0], center[1]).toBounds(SINGLE_PIN_FALLBACK_MILES * MILES_TO_METERS * 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latitude, longitude, radius, pinnedKey]
  );

  if (pinned.length === 0 && latitude === null) {
    return null;
  }

  return (
    <div style={{ position: "relative" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "520px", width: "100%", borderRadius: "24px", overflow: "hidden" }}
      >
        <FitBounds bounds={bounds} />
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
        {pinned.map((facility) => {
          const style = badgeStyle(tierFor(facility));
          return (
            <CircleMarker
              key={facility.registry_id}
              center={[facility.latitude, facility.longitude]}
              radius={6}
              pathOptions={{ color: style.dot, fillColor: style.dot, fillOpacity: 0.85 }}
            >
              <Popup>
                <strong>{facility.name}</strong>
                <br />
                {facility.programs.map((program) => PROGRAM_LABELS[program] ?? program).join(", ")}
                <br />
                {facility.compliance_status ?? "No Violation Identified"}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 500,
          background: "rgba(255,255,255,0.9)",
          borderRadius: "16px",
          padding: "12px 14px",
          fontSize: "12px",
          color: "#3A473D",
          boxShadow: "0 6px 18px -10px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontWeight: 700, color: "#16382B", marginBottom: "8px", fontSize: "11px", letterSpacing: "0.05em" }}>
          LEGEND
        </div>
        {(["critical", "warning", "clean"] as BadgeTier[]).map((tier) => (
          <div key={tier} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: tier === "clean" ? 0 : "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "99px", background: badgeStyle(tier).dot }} />
            {tier === "critical" ? "Violation / Superfund" : tier === "warning" ? "Minor violation" : "No violation"}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SiteSearchMapNew;
```

- [ ] **Step 2: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors. (The component isn't rendered anywhere yet — Task 3 wires it in — so this only confirms it type-checks in isolation.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/newDesign/SiteSearchMapNew.tsx
git commit -m "Add SiteSearchMapNew with 3-tier marker coloring and legend"
```

---

### Task 3: `SiteSearchPageNew` and wiring into the route

**Files:**
- Create: `frontend/src/newDesign/SiteSearchPageNew.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useSiteSearch()` (unmodified hook), `SiteSearchMapNew` (Task 2), `badgeStyle`/`BadgeTier` (Task 1), `PROGRAM_LABELS` from `frontend/src/constants/programLabels.ts` (unmodified).

- [ ] **Step 1: Create the New Design Site Search page**

Create `frontend/src/newDesign/SiteSearchPageNew.tsx`:

```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useSiteSearch } from "../hooks/useSiteSearch";
import { PROGRAM_LABELS } from "../constants/programLabels";
import SiteSearchMapNew from "./SiteSearchMapNew";
import { badgeStyle } from "./badge";
import type { BadgeTier } from "./badge";
import { colors, fonts } from "./theme";
import type { SiteSearchFacility } from "../types";

type Mode = "address" | "state";

function tierFor(facility: SiteSearchFacility): BadgeTier {
  if (facility.significant_violation) return "critical";
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") return "warning";
  return "clean";
}

function labelFor(facility: SiteSearchFacility): string {
  if (facility.significant_violation) return "Significant Violation";
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") {
    return facility.compliance_status;
  }
  return "No Violation Identified";
}

function SiteSearchPageNew() {
  const [mode, setMode] = useState<Mode>("address");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState(1);
  const [limit, setLimit] = useState(100);
  const { facilities, latitude, longitude, loading, error, searched, lastSearch, search } =
    useSiteSearch();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "address" && !address.trim()) return;
    if (mode === "state" && !state.trim()) return;
    search({
      address: mode === "address" ? address.trim() : "",
      state: mode === "state" ? state.trim().toUpperCase() : "",
      radius,
      limit,
    });
  }

  const flaggedCount = facilities.filter((f) => f.significant_violation).length;

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#DCEAD3",
          color: "#256B3A",
          padding: "6px 14px",
          borderRadius: "999px",
          fontSize: "12.5px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        <span style={{ width: "7px", height: "7px", borderRadius: "99px", background: "#2FB673", display: "inline-block" }} />
        ASTM Phase I radius search · live EPA data
      </div>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "40px", fontWeight: 800, color: colors.darkGreen, maxWidth: "18ch" }}>
        Know what's in the ground before you break it.
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", maxWidth: "56ch", margin: "14px 0 24px" }}>
        Search every EPA-regulated facility near a property — across TRI, RCRA, Clean Air &amp;
        Water, Superfund and Brownfields — in one look.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: colors.cardBackground,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "26px",
          padding: "20px",
        }}
      >
        <div style={{ display: "inline-flex", gap: "4px", background: "#EDF1E7", padding: "4px", borderRadius: "999px", marginBottom: "16px" }}>
          {(["address", "state"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "13.5px",
                fontWeight: 700,
                background: mode === m ? "#FFFFFF" : "transparent",
                color: mode === m ? colors.darkGreen : colors.mutedText,
              }}
            >
              {m === "address" ? "Near an address" : "Across a state"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {mode === "address" ? (
            <>
              <div style={{ flex: 1, minWidth: "280px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
                  PROPERTY ADDRESS
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, state, zip"
                  style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "15px", background: "#FAFAF6", color: colors.bodyText, outline: "none" }}
                />
              </div>
              <div style={{ width: "150px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
                  RADIUS
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ width: "100%", padding: "13px 14px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "15px", background: "#FAFAF6", color: colors.bodyText, outline: "none", cursor: "pointer" }}
                >
                  <option value={0.25}>0.25 miles</option>
                  <option value={0.5}>0.5 miles</option>
                  <option value={1}>1 mile</option>
                  <option value={3}>3 miles</option>
                  <option value={5}>5 miles</option>
                </select>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, minWidth: "280px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
                STATE CODE
              </label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                placeholder="MD"
                style={{ width: "110px", padding: "13px 16px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "17px", fontWeight: 700, textAlign: "center", letterSpacing: "0.14em", background: "#FAFAF6", color: colors.darkGreen, outline: "none" }}
              />
              <span style={{ fontSize: "13px", color: colors.mutedText, marginLeft: "12px" }}>
                two-letter code · try MD, VA or PA
              </span>
            </div>
          )}
          <div style={{ minWidth: "140px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
              SHOW UP TO
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: "100%", padding: "13px 14px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "15px", background: "#FAFAF6", color: colors.bodyText, outline: "none", cursor: "pointer" }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>
          <button
            type="submit"
            style={{ padding: "13px 30px", border: "none", borderRadius: "14px", background: colors.darkGreen, color: colors.background, fontSize: "15px", fontWeight: 700, cursor: "pointer" }}
          >
            Search
          </button>
        </div>
      </form>

      {loading && <p style={{ marginTop: "20px" }}>Searching...</p>}
      {error && <p style={{ marginTop: "20px", color: colors.dangerText }}>Error: {error}</p>}
      {!loading && !error && searched && facilities.length === 0 && (
        <div style={{ background: colors.cardBackground, border: "1px dashed #CBD4C2", borderRadius: "20px", padding: "32px 24px", textAlign: "center", marginTop: "24px" }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "17px", color: colors.darkGreen }}>
            No regulated sites found
          </div>
          <div style={{ fontSize: "14px", color: colors.mutedText, marginTop: "7px" }}>
            Widen the radius or try another state code.
          </div>
        </div>
      )}

      {!loading && !error && facilities.length > 0 && lastSearch && (
        <>
          <div style={{ display: "flex", gap: "22px", flexWrap: "wrap", alignItems: "center", margin: "30px 0 22px" }}>
            <div style={{ fontSize: "15px", color: "#4A574D" }}>
              <span style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "26px", color: colors.darkGreen }}>
                {facilities.length}
              </span>{" "}
              regulated sites {lastSearch.address ? `within ${lastSearch.radius} mi` : `in ${lastSearch.state}`}
            </div>
            <div style={{ height: "26px", width: "1px", background: "#D8DCCE" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px", color: "#4A574D" }}>
              <span style={{ width: "11px", height: "11px", borderRadius: "99px", background: colors.dangerDot, display: "inline-block" }} />
              <b style={{ color: colors.dangerText }}>{flaggedCount} flagged</b> for violations or contamination
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "22px", alignItems: "start" }}>
            <SiteSearchMapNew
              latitude={latitude}
              longitude={longitude}
              radius={lastSearch.radius}
              facilities={facilities}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "520px", overflow: "auto", paddingRight: "4px" }}>
              {facilities.map((facility) => {
                const style = badgeStyle(tierFor(facility));
                return (
                  <div
                    key={facility.registry_id}
                    style={{ background: colors.cardBackground, border: `1.5px solid ${colors.cardBorder}`, borderRadius: "20px", padding: "18px 20px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div>
                        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "17px", color: colors.darkGreen }}>
                          {facility.name}
                        </div>
                        <div style={{ fontSize: "13px", color: colors.mutedText, marginTop: "2px" }}>
                          {facility.city}, {facility.state}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          background: style.bg,
                          color: style.color,
                          padding: "6px 13px",
                          borderRadius: "999px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ width: "8px", height: "8px", borderRadius: "99px", background: style.dot, display: "inline-block" }} />
                        {labelFor(facility)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                      {facility.programs.map((program) => (
                        <span
                          key={program}
                          style={{ background: "#EDF1E7", color: "#3C5142", padding: "4px 11px", borderRadius: "99px", fontSize: "11.5px", fontWeight: 600 }}
                        >
                          {PROGRAM_LABELS[program] ?? program}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SiteSearchPageNew;
```

- [ ] **Step 2: Wire the theme-conditional route in `App.tsx`**

This branch's `App.tsx` currently has a `FacilityDetailRoute` wrapper for `/facility/:id`. Add the same pattern for `/site-search`. Replace `frontend/src/App.tsx` in full:

```tsx
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <FacilityDetailPageNew /> : <FacilityDetailPage />;
}

function SiteSearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SiteSearchPageNew /> : <SiteSearchPage />;
}

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
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

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Manually verify both themes in the browser**

With both dev servers running, navigate to Site Search:
- With the toggle on **Classic**: confirm the page looks and behaves exactly as it did before this task (mode-free form, map above table, Export Report button present) — critical revertibility check.
- Flip to **New Design**: confirm mode tabs work (switching between "Near an address" and "Across a state" shows the right fields), the "Show up to" limit selector is present and functional (matching Classic's 50/100/250/500 options), submitting a real search (e.g. address "1600 Pennsylvania Ave, Washington, DC" radius 5, or state "MD") returns results, the map appears beside a scrollable card list (not above a table), map markers use 3 distinct colors matching the legend (red/amber/green), and no "Export Report" button appears anywhere in New Design mode.
- Confirm a zero-result search shows the "No regulated sites found" card, not a broken/empty map.
- Flip back to Classic, confirm it still works exactly as before, including Export Report / print behavior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/newDesign/SiteSearchPageNew.tsx frontend/src/App.tsx
git commit -m "Add New Design Site Search page, wired behind the theme toggle"
```
