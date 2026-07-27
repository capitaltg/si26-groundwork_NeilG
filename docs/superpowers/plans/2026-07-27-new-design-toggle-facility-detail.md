# New Design Toggle + Facility Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live, persistent Classic/New Design toggle to the app, and a New Design version of the Facility Detail page (`/facility/:id`) that consumes the same real hooks as the existing page.

**Architecture:** A React context (`DesignThemeContext`) holds the current theme, defaulting to `'classic'`, persisted to `localStorage`. `App.tsx`'s `/facility/:id` route reads this context and conditionally renders the existing, **unmodified** `FacilityDetailPage` or a new `FacilityDetailPageNew`. All other routes are untouched in this plan. A nav bar switch flips the theme instantly, no rebuild.

**Tech Stack:** React 19 + TypeScript + Vite frontend only. No backend changes, no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-new-design-toggle-facility-detail.md` — read it before starting if anything below is unclear.
- **Revertibility is the top priority of this feature.** Default theme is `'classic'`. The existing `FacilityDetailPage.tsx` and every component it uses (`FacilityCard`, `ComplianceSummary`, `ReleaseChart`, `ReleaseTable`) must NOT be modified anywhere in this plan — the New Design page is entirely new, additive files. Flipping the toggle back to Classic must always produce byte-identical behavior to what exists on `main` today.
- No new npm dependencies — Google Fonts are loaded via a `<link>` tag injected at runtime (only while New Design is active), not an installed package.
- No frontend test harness exists in this repo (established convention) — verification is `npm run build` (type-check) plus manual browser verification. No browser automation tool is available in this session — the user will need to do a real toggle check afterward.
- Reuse existing logic rather than reimplementing it: the RCRA label mapping already defined in `frontend/src/components/ComplianceSummary.tsx` (`GENERATOR_STATUS_LABELS`), and the >50% year-over-year spike threshold already implemented in `frontend/src/components/ReleaseChart.tsx`.

---

### Task 1: Theme context, toggle infrastructure, and nav bar switch

**Files:**
- Create: `frontend/src/newDesign/DesignThemeContext.tsx`
- Create: `frontend/src/newDesign/theme.ts`
- Modify: `frontend/src/main.tsx` (wrap app in the new provider)
- Modify: `frontend/src/components/NavBar.tsx` (add the toggle switch)

**Interfaces:**
- Produces: `DesignThemeProvider` (wraps the app), `useDesignTheme() -> { theme: 'classic' | 'new', setTheme: (t: 'classic' | 'new') => void }` — consumed by `App.tsx` (Task 2) and `NavBar.tsx` (this task).
- Produces: named color/font constants from `theme.ts` — consumed by `FacilityDetailPageNew.tsx` and its sub-components (Task 2).

- [ ] **Step 1: Create the visual token module**

Create `frontend/src/newDesign/theme.ts`:

```typescript
export const colors = {
  background: "#F4F3EC",
  cardBackground: "#FFFFFF",
  cardBorder: "#E4E7DC",
  darkGreen: "#16382B",
  midGreen: "#1E7A46",
  successGreen: "#2FB673",
  accentLime: "#C6F24E",
  dangerBg: "#F7D9D3",
  dangerText: "#9B2F24",
  dangerDot: "#C4443A",
  warningBg: "#FBEBC9",
  warningText: "#8A6414",
  warningDot: "#D99B2B",
  neutralBg: "#E7EAE0",
  neutralText: "#5E6B60",
  bodyText: "#1A231D",
  mutedText: "#5E6B60",
};

export const fonts = {
  heading: "'Bricolage Grotesque', system-ui, sans-serif",
  body: "'Hanken Grotesk', system-ui, sans-serif",
};

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";
```

- [ ] **Step 2: Create the theme context**

Create `frontend/src/newDesign/DesignThemeContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { GOOGLE_FONTS_URL } from "./theme";

export type DesignTheme = "classic" | "new";

const STORAGE_KEY = "groundwork:designTheme";
const FONT_LINK_ID = "new-design-fonts";

interface DesignThemeContextValue {
  theme: DesignTheme;
  setTheme: (theme: DesignTheme) => void;
}

const DesignThemeContext = createContext<DesignThemeContextValue | null>(null);

function readStoredTheme(): DesignTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "new" ? "new" : "classic";
}

export function DesignThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DesignTheme>(readStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);

    const existingLink = document.getElementById(FONT_LINK_ID);
    if (theme === "new" && !existingLink) {
      const link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    } else if (theme === "classic" && existingLink) {
      existingLink.remove();
    }
  }, [theme]);

  function setTheme(next: DesignTheme) {
    setThemeState(next);
  }

  return (
    <DesignThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useDesignTheme() {
  const context = useContext(DesignThemeContext);
  if (!context) {
    throw new Error("useDesignTheme must be used within a DesignThemeProvider");
  }
  return context;
}
```

- [ ] **Step 3: Wrap the app in the provider**

In `frontend/src/main.tsx`, add the import and wrap `<App />`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { DesignThemeProvider } from './newDesign/DesignThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DesignThemeProvider>
        <App />
      </DesignThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 4: Add the toggle switch to the nav bar**

This branch's `NavBar.tsx` currently has four nav links: Search, Hazard
Watch, Site Search — no "Emissions Center" link (that page lives only on
the separate, not-yet-merged `feature/emissions-center` branch). Replace
`frontend/src/components/NavBar.tsx` in full, adding only the toggle
switch:

```tsx
import { Link } from "react-router-dom";
import { useDesignTheme } from "../newDesign/DesignThemeContext";

function NavBar() {
  const { theme, setTheme } = useDesignTheme();

  return (
    <nav className="navbar navbar-expand navbar-light bg-light mb-3">
      <div className="container-fluid">
        <span className="navbar-brand">TRI Facility Explorer</span>
        <div className="navbar-nav">
          <Link className="nav-link" to="/">
            Search
          </Link>
          <Link className="nav-link" to="/hazard-watch">
            Hazard Watch
          </Link>
          <Link className="nav-link" to="/site-search">
            Site Search
          </Link>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <span className="small text-muted">Classic</span>
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={theme === "new"}
              onChange={(e) => setTheme(e.target.checked ? "new" : "classic")}
            />
          </div>
          <span className="small text-muted">New Design</span>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
```

- [ ] **Step 5: Verify the build succeeds**

Run: `cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 6: Manually verify the toggle in the browser**

Start both servers if not already running:
```bash
cd /Users/neilgomes/Desktop/Groundwork && uvicorn main:app --reload &
cd /Users/neilgomes/Desktop/Groundwork/frontend && npm run dev
```

Open the frontend URL Vite prints and check:
- A "Classic / New Design" switch appears in the nav bar, defaulting to Classic (unchecked).
- Nothing else about the app looks different yet (no page consumes the theme yet — this task only proves the switch exists, persists, and toggles).
- Flip the switch, refresh the page, confirm it stays on "New Design" (persisted via `localStorage`).
- Flip it back to Classic.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/newDesign/DesignThemeContext.tsx frontend/src/newDesign/theme.ts frontend/src/main.tsx frontend/src/components/NavBar.tsx
git commit -m "Add design theme toggle infrastructure (Classic / New Design)"
```

---

### Task 2: `FacilityDetailPageNew` and wiring into the route

**Files:**
- Create: `frontend/src/newDesign/FacilityDetailPageNew.tsx`
- Modify: `frontend/src/App.tsx` (conditionally render based on theme)

**Interfaces:**
- Consumes: `useDesignTheme()` (Task 1), `useFacilityReleases`, `useFacilityCompliance` (both pre-existing, unmodified), `colors`/`fonts` from `frontend/src/newDesign/theme.ts` (Task 1).
- Does NOT modify: `FacilityDetailPage.tsx`, `FacilityCard.tsx`, `ComplianceSummary.tsx`, `ReleaseChart.tsx`, `ReleaseTable.tsx` — all read-only references for this task.

- [ ] **Step 1: Create the New Design Facility Detail page**

Create `frontend/src/newDesign/FacilityDetailPageNew.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useFacilityReleases } from "../hooks/useFacilityReleases";
import { useFacilityCompliance } from "../hooks/useFacilityCompliance";
import { colors, fonts } from "./theme";
import type { ComplianceProgram } from "../types";

const GENERATOR_STATUS_LABELS: Record<string, string> = {
  VSQG: "Very Small Quantity Generator",
  SQG: "Small Quantity Generator",
  LQG: "Large Quantity Generator",
  TSDF: "Treatment, Storage, and Disposal Facility",
};

const SPIKE_THRESHOLD = 0.5;

interface Badge {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

function deriveBadge(programs: ComplianceProgram[]): Badge {
  const hasSignificant = programs.some((p) => p.status === "Significant Violation");
  if (hasSignificant) {
    return { label: "Significant Violation", bg: colors.dangerBg, color: colors.dangerText, dot: colors.dangerDot };
  }
  const nonClean = programs.find((p) => p.status && p.status !== "No Violation Identified");
  if (nonClean) {
    return { label: nonClean.status as string, bg: colors.warningBg, color: colors.warningText, dot: colors.warningDot };
  }
  return { label: "No Violation Identified", bg: colors.neutralBg, color: colors.neutralText, dot: colors.successGreen };
}

function FacilityDetailPageNew() {
  const { id } = useParams();
  const facilityId = id ?? "";
  const { facility, releases, loading: releasesLoading, error: releasesError } = useFacilityReleases(facilityId);
  const { compliance, loading: complianceLoading, error: complianceError } = useFacilityCompliance(facilityId);
  const [selectedChemical, setSelectedChemical] = useState<string | null>(null);

  const chemicals = useMemo(
    () => Array.from(new Set(releases.map((r) => r.chemical))).sort(),
    [releases]
  );

  const activeChemical = useMemo(() => {
    if (selectedChemical) return selectedChemical;
    if (releases.length === 0) return null;
    const totals: Record<string, number> = {};
    for (const r of releases) {
      totals[r.chemical] = (totals[r.chemical] || 0) + r.air_release + r.water_release + r.land_release;
    }
    return Object.keys(totals).reduce((best, c) => (totals[c] > totals[best] ? c : best));
  }, [releases, selectedChemical]);

  const chartBars = useMemo(() => {
    if (!activeChemical) return [];
    const rows = releases
      .filter((r) => r.chemical === activeChemical)
      .sort((a, b) => a.year - b.year)
      .map((r) => ({ year: r.year, total: r.air_release + r.water_release + r.land_release }));
    const max = Math.max(...rows.map((r) => r.total), 1);
    return rows.map((r, i) => {
      const prev = i > 0 ? rows[i - 1].total : 0;
      const percentChange = prev > 0 ? (r.total - prev) / prev : 0;
      const isSpike = percentChange > SPIKE_THRESHOLD;
      return {
        year: r.year,
        heightPx: Math.max(8, Math.round((r.total / max) * 200)),
        isSpike,
        tag: isSpike ? `+${Math.round(percentChange * 100)}%` : "",
      };
    });
  }, [releases, activeChemical]);

  const latestYearKpis = useMemo(() => {
    if (releases.length === 0) return null;
    const latestYear = Math.max(...releases.map((r) => r.year));
    const latestRows = releases.filter((r) => r.year === latestYear);
    const sum = (key: "air_release" | "water_release" | "land_release") =>
      latestRows.reduce((s, r) => s + (r[key] || 0), 0);
    const hazardousCount = new Set(releases.filter((r) => r.is_hazardous).map((r) => r.chemical)).size;
    return {
      year: latestYear,
      air: sum("air_release"),
      water: sum("water_release"),
      land: sum("land_release"),
      hazardousCount,
    };
  }, [releases]);

  if (releasesLoading || complianceLoading) {
    return <p style={{ fontFamily: fonts.body, padding: "24px" }}>Loading...</p>;
  }

  if (releasesError) {
    return (
      <p style={{ fontFamily: fonts.body, color: colors.dangerText, padding: "24px" }}>
        Error loading facility: {releasesError}
      </p>
    );
  }

  if (!facility || !facility.name) {
    return <p style={{ fontFamily: fonts.body, padding: "24px" }}>Facility not found.</p>;
  }

  const programs = compliance?.programs ?? [];
  const badge = deriveBadge(programs);
  const rcra = compliance?.rcra_generator_status;
  const rcraLine = rcra
    ? `${GENERATOR_STATUS_LABELS[rcra.generator_status ?? ""] ?? rcra.generator_status} — ${
        rcra.active_status ?? "Unknown status"
      } — ${rcra.compliance_status ?? "No compliance data"}`
    : null;

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          background: `linear-gradient(150deg, ${colors.midGreen}, ${colors.darkGreen})`,
          borderRadius: "28px",
          padding: "30px 34px",
          color: "#EAF1E6",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          <div>
            {compliance?.industry && (
              <div style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9FC7AE", fontWeight: 600 }}>
                {compliance.industry}
              </div>
            )}
            <h1 style={{ fontFamily: fonts.heading, fontSize: "34px", fontWeight: 800, marginTop: "8px", color: "#FFFFFF" }}>
              {facility.name}
            </h1>
            <div style={{ fontSize: "15px", color: "#B8CFBE", marginTop: "10px" }}>
              {facility.address} · {facility.city}, {facility.state} {facility.zip}
            </div>
            <div style={{ fontSize: "13.5px", color: "#8FB49B", marginTop: "6px" }}>
              Parent company · {facility.parent_company} &nbsp;|&nbsp; {facility.county} &nbsp;|&nbsp; {facility.latitude}, {facility.longitude}
            </div>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: badge.bg,
              color: badge.color,
              padding: "8px 16px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "99px", background: badge.dot, display: "inline-block" }} />
            {badge.label}
          </div>
        </div>
      </div>

      {latestYearKpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px", marginTop: "18px" }}>
          {[
            { label: "Air", value: latestYearKpis.air, sub: `lbs · ${latestYearKpis.year}` },
            { label: "Water", value: latestYearKpis.water, sub: `lbs · ${latestYearKpis.year}` },
            { label: "Land", value: latestYearKpis.land, sub: `lbs · ${latestYearKpis.year}` },
            {
              label: "PBT chemicals",
              value: latestYearKpis.hazardousCount,
              sub: latestYearKpis.hazardousCount > 0 ? "flagged hazardous" : "none reported",
            },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "20px", padding: "18px 20px" }}>
              <div style={{ fontSize: "12px", color: colors.mutedText, fontWeight: 600 }}>{kpi.label}</div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "27px", color: colors.darkGreen, marginTop: "8px" }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: colors.mutedText, marginTop: "2px" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {activeChemical && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", padding: "26px 28px", marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "21px", fontWeight: 700, color: colors.darkGreen }}>Release history</h3>
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
              {chemicals.map((chem) => (
                <button
                  key={chem}
                  onClick={() => setSelectedChemical(chem)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 15px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: chem === activeChemical ? colors.darkGreen : "#EDF1E7",
                    color: chem === activeChemical ? colors.background : "#3C5142",
                  }}
                >
                  {chem}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", height: "250px", marginTop: "26px" }}>
            {chartBars.map((bar) => (
              <div key={bar.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: bar.isSpike ? "#7A591A" : "transparent", background: bar.isSpike ? colors.warningBg : "transparent", padding: "2px 7px", borderRadius: "99px" }}>
                  {bar.tag}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: `${bar.heightPx}px`,
                    borderRadius: "12px 12px 6px 6px",
                    background: bar.isSpike
                      ? `linear-gradient(180deg, ${colors.accentLime}, #A9CE2E)`
                      : `linear-gradient(180deg, #3FC77F, ${colors.midGreen})`,
                  }}
                />
                <div style={{ fontSize: "12px", color: colors.mutedText, fontWeight: 600 }}>{bar.year}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "12.5px", color: "#8A9488", marginTop: "14px" }}>
            Total on-site releases (air + water + land), lbs per reporting year. Highlighted bars mark year-over-year spikes above 50%.
          </div>
        </div>
      )}

      {releases.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden", marginTop: "18px" }}>
          <div style={{ padding: "24px 28px 6px" }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "21px", fontWeight: 700, color: colors.darkGreen }}>Release records</h3>
            <p style={{ fontSize: "13px", color: "#8A9488", margin: "6px 0 0" }}>
              All reported quantities, in pounds, across every chemical and year on file.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "760px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "62px 2fr 1fr 1fr 1fr 1fr 1fr 1.2fr", gap: "10px", padding: "14px 20px", background: "#F5F8F1", fontSize: "11px", fontWeight: 700, color: colors.mutedText }}>
                <div>YEAR</div>
                <div>CHEMICAL</div>
                <div>AIR</div>
                <div>WATER</div>
                <div>LAND</div>
                <div>RECYCLED</div>
                <div>TREATED</div>
                <div>OFF-SITE</div>
              </div>
              {releases
                .slice()
                .sort((a, b) => b.year - a.year || a.chemical.localeCompare(b.chemical))
                .map((r, i) => (
                  <div
                    key={`${r.chem_id}-${r.year}-${i}`}
                    style={{ display: "grid", gridTemplateColumns: "62px 2fr 1fr 1fr 1fr 1fr 1fr 1.2fr", gap: "10px", padding: "13px 20px", borderTop: "1px solid #EEF0E7", fontSize: "13.5px", background: r.is_hazardous ? "#FCF6F4" : "transparent" }}
                  >
                    <div style={{ fontWeight: 700, color: colors.darkGreen }}>{r.year}</div>
                    <div style={{ color: colors.bodyText }}>
                      {r.chemical}
                      {r.is_hazardous && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: colors.dangerBg, color: colors.dangerText, padding: "2px 8px", borderRadius: "99px", fontSize: "10.5px", fontWeight: 700, marginLeft: "8px" }}>
                          ⚠ PBT
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#4A574D" }}>{r.air_release.toLocaleString()}</div>
                    <div style={{ color: "#4A574D" }}>{r.water_release.toLocaleString()}</div>
                    <div style={{ color: "#4A574D" }}>{r.land_release.toLocaleString()}</div>
                    <div style={{ color: "#8A9488" }}>{r.recycled.toLocaleString()}</div>
                    <div style={{ color: "#8A9488" }}>{r.treated.toLocaleString()}</div>
                    <div style={{ color: "#8A9488" }}>{r.transferred_offsite.toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {complianceError && (
        <p style={{ color: colors.dangerText, marginTop: "18px" }}>Error loading compliance data: {complianceError}</p>
      )}

      {compliance && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", padding: "26px 28px", marginTop: "18px" }}>
          <h3 style={{ fontFamily: fonts.heading, fontSize: "21px", fontWeight: 700, color: colors.darkGreen }}>Regulatory compliance</h3>
          {rcraLine && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: colors.warningBg, borderRadius: "14px", padding: "11px 16px", marginTop: "14px", fontSize: "13.5px", color: "#7C6220" }}>
              <b style={{ color: colors.warningText }}>Hazardous Waste ·</b> {rcraLine}
            </div>
          )}
          {programs.length === 0 ? (
            <p style={{ marginTop: "14px", color: colors.mutedText }}>No compliance program data found for this facility.</p>
          ) : (
            <div style={{ marginTop: "18px", border: "1px solid #EEF0E7", borderRadius: "18px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.3fr .8fr .8fr 1fr", gap: "12px", padding: "13px 20px", background: "#F5F8F1", fontSize: "11.5px", fontWeight: 700, color: colors.mutedText }}>
                <div>PROGRAM</div>
                <div>STATUS</div>
                <div>INSPECTIONS</div>
                <div>ACTIONS</div>
                <div>PENALTIES</div>
              </div>
              {programs.map((p) => (
                <div key={p.statute} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.3fr .8fr .8fr 1fr", gap: "12px", padding: "15px 20px", borderTop: "1px solid #EEF0E7", alignItems: "center", fontSize: "14px" }}>
                  <div style={{ fontWeight: 600, color: colors.darkGreen }}>{p.statute}</div>
                  <div>{p.status ?? "—"}</div>
                  <div style={{ color: "#4A574D" }}>{p.inspection_count ?? "—"}</div>
                  <div style={{ color: "#4A574D" }}>{p.formal_actions_count ?? "—"}</div>
                  <div style={{ fontWeight: 600, color: colors.darkGreen }}>{p.total_penalties ?? "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {releases.length === 0 && !compliance?.programs.length && (
        <div style={{ background: colors.cardBackground, border: "1px dashed #CBD4C2", borderRadius: "24px", padding: "40px", marginTop: "18px", textAlign: "center", color: colors.mutedText }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "18px", color: colors.darkGreen }}>No TRI release data reported</div>
          <div style={{ fontSize: "14px", marginTop: "8px" }}>
            This facility is regulated under other EPA programs but has not filed Toxics Release Inventory reports.
          </div>
        </div>
      )}
    </div>
  );
}

export default FacilityDetailPageNew;
```

- [ ] **Step 2: Wire the theme-conditional route in `App.tsx`**

This branch's `App.tsx` has four routes (`/`, `/facility/:id`,
`/hazard-watch`, `/site-search`) — no `/emissions-center` route (that page
lives only on the separate, not-yet-merged `feature/emissions-center`
branch; do not add it here). Replace `frontend/src/App.tsx` in full,
changing only the `/facility/:id` route to be theme-conditional:

```tsx
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <FacilityDetailPageNew /> : <FacilityDetailPage />;
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
          <Route path="/site-search" element={<SiteSearchPage />} />
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

With both dev servers running, navigate to any facility detail page (e.g. via Search → pick a facility):
- With the toggle on **Classic**: confirm the page looks and behaves exactly as it did before this branch existed (Bootstrap-styled, `FacilityCard`/`ComplianceSummary`/`ReleaseTable`/`ReleaseChart` components) — this is the critical revertibility check.
- Flip the toggle to **New Design**: confirm the same facility now renders with the dark-green gradient hero, KPI cards, the restyled release chart with chemical pill selector, the full release records table, and the regulatory compliance section — using the same real data as Classic mode (same facility name, same release numbers).
- Confirm the hero badge color/label is sensible (e.g. a facility with a "Significant Violation" program shows red; a facility with only "No Violation Identified" programs shows the neutral/clean badge).
- Confirm a facility with no RCRA generator status shows no "Hazardous Waste" line (not a broken/empty one).
- Flip back to Classic, confirm the page reverts cleanly with no leftover New Design styling (e.g. no stray font-family bleeding into Classic's Bootstrap layout).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/newDesign/FacilityDetailPageNew.tsx frontend/src/App.tsx
git commit -m "Add New Design Facility Detail page, wired behind the theme toggle"
```
