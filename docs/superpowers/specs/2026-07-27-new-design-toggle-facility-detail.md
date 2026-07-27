# New Design Toggle — Infrastructure + Facility Detail

## Problem

The user commissioned an alternate visual design for Groundwork through
claude.ai/design ("Capital Technology Group" account, project "Groundwater
software frontend" — likely a typo for "Groundwork", project ID
`16fcec1e-6d08-4b2e-bc2a-13396751f1f2`). That project contains a full
interactive prototype (`Groundwork.dc.html`, Claude's "DC" design-component
format) covering four of our five pages — Site Search, Facility browse,
Hazard Watch, Facility Detail — built against mock data, in a distinct
visual language (cream/dark-green palette, Bricolage Grotesque + Hanken
Grotesk fonts, heavy rounding, soft shadows).

The user wants to be able to try this new design out against the app's
*real* data and functionality, while being able to instantly revert to the
current ("Classic") design if the new one can't do something needed. This
must be true both as a development safety net (git) and as a live,
in-the-running-app toggle (not a rebuild/redeploy).

## Scope decisions (confirmed with user)

- **One global toggle**, not per-page — the whole app renders in either
  Classic or New Design consistently, never mixed mid-navigation.
- **Emissions Center and the Report Export feature are not covered** by the
  new design (both were built after the prototype was made) — they always
  render in Classic style regardless of the toggle, until/unless a New
  Design version is designed for them later. This is an explicit, accepted
  gap, not an oversight.
- **Sequencing:** build the toggle infrastructure once, proven out against
  a single page first, then port the remaining three covered pages
  (Site Search, Facility browse, Hazard Watch) as separate follow-up
  spec/plan cycles. This document covers only the first: toggle
  infrastructure + Facility Detail.
- **Facility Detail is the first page ported** — the richest/most
  self-contained of the four (no map involved, unlike Site Search), making
  it the best stress test for the toggle mechanism before applying the
  pattern elsewhere.

## Two distinct "revert" mechanisms

1. **Git branch** (`feature/new-design-toggle`) — all of this work happens
   on a new branch, same convention as every other feature built this
   session. `main` (today's Classic-only app) is untouched until the user
   explicitly merges. If the new design doesn't work out, the branch is
   simply never merged (or deleted) — no loss.
2. **Runtime toggle** — once built (on this branch, and later on `main`
   after merge), a live switch in the nav bar flips the whole app between
   Classic and New Design instantly, with no rebuild — this is the actual
   feature being designed below, and the mechanism the user will use to
   evaluate the new design day-to-day.

## Source material referenced

- `Groundwork.dc.html` from claude.ai/design project
  `16fcec1e-6d08-4b2e-bc2a-13396751f1f2` — fetched and read in full during
  design. Contains complete interactive logic (a `class Component extends
  DCLogic` with real state, event handlers, badge/status derivation, a live
  Leaflet map, chart bar generation with year-over-year spike highlighting)
  built against hardcoded mock arrays (`FAC`, `D`, `HAZ`) rather than a real
  API — this file is a **design and behavior reference**, not code to be
  executed or ported verbatim. Its custom `<x-dc>`/`sc-if`/`sc-for` markup
  and `support.js` runtime are claude.ai/design's own live-preview
  machinery, not meant for production use in this codebase.
- Mockup nav maps to our real routes as: prototype "sites" view → our
  `/site-search`; prototype "facilities" view → our `/` (Search); prototype
  "hazard" view → our `/hazard-watch`; prototype "detail" view → our
  `/facility/:id`.

## Toggle infrastructure architecture

- New file `frontend/src/newDesign/DesignThemeContext.tsx`: a React context
  holding `theme: 'classic' | 'new'` and a `setTheme` function. Default
  value `'classic'` (the current app, unchanged, is what everyone sees
  until they opt in). Reads/writes `localStorage` under a single key so the
  choice survives a page refresh.
- Provider wraps the app in `frontend/src/main.tsx`, alongside the existing
  `BrowserRouter`.
- `frontend/src/components/NavBar.tsx` gains a toggle control (a labeled
  switch, e.g. "Classic / New Design") that calls `setTheme`.
- `frontend/src/App.tsx`'s `/facility/:id` route reads the theme context
  and renders either the existing `FacilityDetailPage` (unchanged, zero
  modifications) or a new `FacilityDetailPageNew`, based on the current
  theme. All other routes (including `/emissions-center` and `/site-search`
  for now) always render their existing, single Classic page component,
  regardless of theme — until/unless later spec cycles port them too.

## Facility Detail (New Design) — data mapping and adaptations

`FacilityDetailPageNew.tsx` consumes the **same existing hooks** as the
Classic page — `useFacilityReleases(facilityId)` and
`useFacilityCompliance(facilityId)` — no new endpoints, no duplicated
data-fetching logic. Only presentation differs.

Confirmed field mappings (verified against `frontend/src/types.ts` and the
hooks' actual return shapes):

- Hero identity: `facility.name`, `.address`, `.city`, `.state`, `.zip`,
  `.county`, `.parent_company`, `.latitude`, `.longitude` from
  `useFacilityReleases`. `industry` comes from `useFacilityCompliance`
  (`compliance.industry`), **not** from the facility record — the mockup's
  mock data conflated these onto one object, but in the real app they come
  from two different endpoints/hooks.
- Release history: `Release[]` fields (`chemical`, `chem_id`, `year`,
  `air_release`, `water_release`, `land_release`, `recycled`, `treated`,
  `transferred_offsite`, `is_hazardous`) map 1:1 to the mockup's release
  record fields — no adaptation needed.
- Compliance programs: `ComplianceProgram[]` fields (`statute`, `status`,
  `inspection_count`, `formal_actions_count`, `total_penalties`) map 1:1 to
  the mockup's `programs` array — no adaptation needed.

Two adaptations required (real data doesn't carry the exact shape the mock
data assumed):

1. **Hero status badge.** The mockup reads a single
   `f.compliance_status`/`f.significant_violation` pair directly off its
   mock facility object — a shape that exists for Site Search's aggregated
   facilities (`SiteSearchFacility`), but **not** for a single Facility
   Detail lookup, which only has a *list* of per-program statuses
   (`compliance.programs`), no single overall flag. Derive it instead:
   worst status wins — if any program's `status === "Significant
   Violation"`, badge = red "Significant Violation"; else if any program
   has a status other than `"No Violation Identified"`, badge = amber,
   showing that status; else badge = green "No Violation Identified".
2. **RCRA generator line.** The mockup shows one combined string (e.g.
   "Large Quantity Generator (LQG) — Active — Violation"). Real data has
   three separate fields on `compliance.rcra_generator_status`
   (`generator_status`, `active_status`, `compliance_status`). Compose them
   into one line using the *same* `GENERATOR_STATUS_LABELS` mapping already
   defined in `frontend/src/components/ComplianceSummary.tsx` (reuse this
   constant, do not redefine it), in the format:
   `${GENERATOR_STATUS_LABELS[generator_status] ?? generator_status} — ${active_status ?? "Unknown status"} — ${compliance_status ?? "No compliance data"}`.

KPI cards (Air / Water / Land / PBT chemical count) are new to our app but
require no new data — computed client-side from the latest reporting
year's releases (sum `air_release`/`water_release`/`land_release` across
that year's rows; count distinct `chemical` values where `is_hazardous` is
true across all years).

Release chart's year-over-year spike highlighting (>50% jump from the
previous year) reuses the exact same threshold already implemented in
`frontend/src/components/ReleaseChart.tsx` — same logic, restyled to match
the new design's bar/gradient/tag treatment.

## Visual tokens (extracted from the prototype, for reuse across all future
New Design pages, not just this one)

New file `frontend/src/newDesign/theme.ts` exporting named constants so
later pages (Site Search, Facilities, Hazard Watch) reuse the same values
rather than each hardcoding hex codes independently:

- Background: `#F4F3EC`; card background `#FFFFFF`; card border `#E4E7DC`.
- Primary dark green `#16382B`; mid green `#1E7A46`; success green
  `#2FB673`; accent lime `#C6F24E`.
- Danger red `#C4443A` (bg `#F7D9D3`, text `#9B2F24`); warning amber
  `#D99B2B` (bg `#FBEBC9`, text `#8A6414`); info/neutral (Brownfields-style)
  bg `#E7EAE0`, text `#5E6B60`.
- Headings font: "Bricolage Grotesque" (weights 500–800); body font:
  "Hanken Grotesk" (weights 400–700) — both loaded from Google Fonts.

Fonts are loaded via a `<link>` tag injected only when the New Design theme
is active (not unconditionally in `index.html`), so Classic-mode users pay
no extra font-loading cost. The `DesignThemeContext` provider handles this
injection/removal as the theme changes.

## Error handling

No new error states — `FacilityDetailPageNew` handles loading/error/missing
states identically to the existing `FacilityDetailPage` (same hooks, same
conditions), just restyled.

## Testing

No frontend test harness exists in this repo (established convention from
prior features) — verify via `npm run build` (type-check) plus manual
browser verification: toggle between Classic and New Design on a real
facility, confirm both render correctly and the toggle persists across a
refresh. No browser automation tool is available in this session, so the
user will need to do the real visual check afterward, consistent with
every prior UI feature this session.

## Out of scope (this spec)

- Porting Site Search, Facilities (browse), or Hazard Watch to New Design
  — separate follow-up spec/plan cycles, per the agreed one-page-at-a-time
  sequencing.
- Any New Design version of Emissions Center or Report Export — explicitly
  deferred indefinitely per the user's decision; those pages stay
  Classic-only regardless of the toggle.
- Any change to the existing Classic `FacilityDetailPage` or its
  components — zero modifications, it continues to render exactly as
  today when the toggle is set to Classic.
