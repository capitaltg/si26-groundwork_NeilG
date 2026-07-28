# New Design — Facilities + Hazard Watch (pages 3 and 4 of 4)

## Problem

Two pages remain from the original mockup's 4-page scope: Facilities
(browse, Classic's `/` route / `SearchPage.tsx`) and Hazard Watch
(`/hazard-watch` / `HazardWatchPage.tsx`). Both are considerably simpler
than Site Search (single state input, no map, no multi-mode form), so this
spec covers both together as one combined pass, per user decision.

## Scope decisions (confirmed with user)

- **Facilities page cards omit program/compliance badges.** The mockup's
  "facilities" view cards show program badges and a compliance status dot
  per facility, matching Site Search's card styling. But Classic's actual
  browse endpoint (`GET /api/state/{state_abbr}`, via `useFacilitySearch`)
  only returns `{ tri_facility_id, facility_name, city_name, state_abbr }`
  — no programs, no compliance data at all. Fetching that per facility
  would mean one extra API call per card (an N+1 problem) — a real
  functional addition beyond what Classic does today, not a restyle. User
  confirmed: simplify New Design's cards to match what this data source
  actually has (name + city/state only), rather than fetch additional data
  to match the mockup's fuller card visual.
- **Combined pass.** Both pages ship in one spec/plan/implementation cycle
  rather than the one-at-a-time cadence used for Facility Detail and Site
  Search, since neither has the complexity that justified separating those
  two (no map, no mode-tabs, no results-limit selector).

## Source material and current state (verified before writing this spec)

**Facilities / browse page:**
- Mockup's "facilities" view: state input + "showing N facilities" count,
  a card grid (`repeat(auto-fill, minmax(310px, 1fr))`), each card showing
  facility name, city/state, program badges, and a compliance dot/badge —
  the badges/dot are NOT reproducible with this endpoint's real data (see
  scope decision above).
- Classic's `SearchPage.tsx` (unmodified, read in full): state input,
  "Search facilities" button, loading/error/empty states, a
  `list-group` of `<Link to={/facility/:id}>` items showing
  `facility_name — city_name, state_abbr`.
- `useFacilitySearch(stateAbbr)` (unmodified, reused as-is): returns
  `{ facilities: FacilitySearchResult[], loading, error }`.
  `FacilitySearchResult { tri_facility_id, facility_name, city_name,
  state_abbr }` — confirmed exact shape via `frontend/src/types.ts`.

**Hazard Watch page:**
- Mockup's "hazard" view: an eyebrow tag ("⚠ Persistent Bioaccumulative
  Toxics"), title + intro copy, then a card containing ranked rows — rank
  number, facility name (clickable) with the chemical shown as a small
  pill beneath it, reporting year, and a horizontal bar scaled to that
  row's `total_release` relative to the largest value in the current
  result set.
- Classic's `HazardWatchPage.tsx` (unmodified, read in full): state input,
  "Search hazardous releases" button, loading/error/empty states, a
  `<table>` with columns Facility (linked)/Chemical/Year/Total Release.
- `useHazardWatch(stateAbbr)` (unmodified, reused as-is): returns
  `{ rows: HazardWatchRow[], loading, error }`.
  `HazardWatchRow { facility_id, facility_name, chemical, chem_id, year,
  total_release }` — confirmed exact shape via `frontend/src/types.ts`.
  This shape already covers everything the mockup's design needs — no gap
  here, unlike Facilities. Rank (array index + 1) and the bar's relative
  width are both computed client-side from data already fetched, the same
  pattern already used for Facility Detail's KPI cards and Site Search's
  results header — not a new data requirement.

## Approach

Two new page components, `newDesign/SearchPageNew.tsx` and
`newDesign/HazardWatchPageNew.tsx`, each consuming the exact same
unmodified hook as its Classic counterpart. Both follow the established
`newDesign/theme.ts` token conventions. Wired into `App.tsx` via two new
route wrapper components (`SearchRoute`, `HazardWatchRoute`), following the
exact same pattern already used for `FacilityDetailRoute`/`SiteSearchRoute`
— read `App.tsx`'s current state before implementing to match its exact
existing structure.

## Facilities page details

- Title "TRI Facilities" + intro copy from the mockup ("Browse Toxics
  Release Inventory reporters by state. Select a facility for its full
  release history and compliance record.") — Classic's own title ("TRI
  Facility Explorer") is unaffected, this is New Design's copy only.
  State input + "showing N facilities" count (`facilities.length`,
  computed client-side, no new data).
  Card grid: each card shows `facility_name` and `city_name, state_abbr`,
  clicking navigates to `/facility/{tri_facility_id}` (same behavior as
  Classic's `<Link>`). No program badges, no compliance dot — per the
  scope decision above.
- Loading/error/empty states: identical conditions to Classic
  (`loading`, `error`, `facilities.length === 0`).

## Hazard Watch page details

- Eyebrow tag + title "Hazard Watch" + intro copy from the mockup
  (substituting the searched state into the copy, matching the mockup's
  `{{ stateAbbr }}` interpolation).
  State input + "Search hazardous releases" button (same label as
  Classic).
  Ranked row list: rank (index + 1), facility name (link to
  `/facility/{facility_id}`) with `chemical` shown as a small pill beneath
  it, `year`, and a horizontal bar whose width is
  `total_release / maxReleaseInResults * 100%` — mirroring the same
  "scale relative to the current result set's max" pattern already used
  in `SiteSearchMapNew`'s bubble sizing logic (conceptually, not shared
  code — this is a different data shape).
- Loading/error/empty states: identical conditions to Classic (`loading`,
  `error`, `rows.length === 0`).

## Error handling

Identical conditions to Classic for both pages — no new error states,
since both reuse the same hooks and the same three-state gate.

## Out of scope

- Any change to `SearchPage.tsx`, `HazardWatchPage.tsx`,
  `useFacilitySearch.ts`, `useHazardWatch.ts`, or any other Classic file —
  all read-only references, zero modifications.
- Fetching compliance/program data for Facilities cards (see scope
  decision above).

## Testing

No frontend test harness exists in this repo (established convention) —
verification is `npm run build` (type-check) plus manual/reasoned
verification. No browser automation tool is available in this session —
the user will do the real toggle check afterward, consistent with every
prior UI feature this session.
