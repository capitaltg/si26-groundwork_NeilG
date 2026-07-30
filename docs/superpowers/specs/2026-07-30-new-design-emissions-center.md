# New Design — Emissions Center

## Problem

Emissions Center (the GHG emitters leaderboard, just merged to `main`) is
Classic-only. It's not part of the original 4-page mockup port, so there's
no design reference to draw from — this spec covers a straightforward
reskin matching the established `theme.ts`/route-wrapper conventions from
the other 4 New Design pages, not a new mockup translation.

## Scope decision (confirmed with user)

**Same functionality, same data, restyled only.** No bubble map, no new
data, no functional additions — explicitly confirmed with the user
("same thing same function but in the new design"). A bubble-map
enhancement was previously spec'd (`2026-07-23-emissions-map-design.md`)
but is out of scope here; this port does not implement it.

## Source material and current state (verified before writing this spec)

- Classic's `EmissionsCenterPage.tsx` (unmodified, read in full): state
  input, "Search top emitters" button, loading/error/empty states, a
  `<table>` with columns Facility/City/Year/Total CO2e (metric tons).
- `useGhgEmitters(stateAbbr)` (unmodified, reused as-is): returns
  `{ emitters: GhgEmitter[], loading, error }`.
  `GhgEmitter { facility_id: number, facility_name: string, city: string,
  state: string, year: number, total_co2e: number, latitude: number | null,
  longitude: number | null }` — confirmed exact shape via
  `frontend/src/types.ts`. No data gap — every field Classic's table shows
  is directly present, same as Hazard Watch's port (unlike Facilities,
  which had to omit fields the browse endpoint doesn't return).
- `App.tsx` currently has four theme-conditional route wrappers
  (`FacilityDetailRoute`, `SiteSearchRoute`, `SearchRoute`,
  `HazardWatchRoute`) and one plain Classic-only route
  (`/emissions-center` → `EmissionsCenterPage`, no wrapper yet).

## Approach

New page `newDesign/EmissionsCenterPageNew.tsx`, consuming the exact same
`useGhgEmitters` hook as Classic — zero new data-fetching. Wired into
`App.tsx` via a new `EmissionsCenterRoute` wrapper, following the identical
pattern already used for the other four pages.

## Page details

- State input + "Search top emitters" button (same label as Classic).
- Results: a card list of ranked emitters (mirroring the visual pattern
  already established for Hazard Watch's ranked-row list — rank number,
  facility name, and the relevant metric — but showing exactly Classic's
  four fields: facility name, city, year, total CO2e in metric tons) — no
  new fields, no map, no additional visual elements beyond what a
  restyled version of Classic's table needs.
- Loading/error/empty states: identical conditions to Classic (`loading`,
  `error`, `emitters.length === 0`).

## Error handling

Identical conditions to Classic — no new error states, since this reuses
the same hook and the same three-state gate.

## Out of scope

- Any change to `EmissionsCenterPage.tsx` or `useGhgEmitters.ts` — both
  read-only references, zero modifications.
- The bubble map enhancement (separately spec'd, not part of this port).

## Testing

No frontend test harness exists in this repo (established convention) —
verification is `npm run build` (type-check) plus manual/reasoned
verification. No browser automation tool is available in this session.
