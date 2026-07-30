# Emissions Center Bubble Map

## Problem

The just-shipped Emissions Center page is a plain table — functional, but doesn't convey scale or geography. GHG emissions data has both (magnitude varies enormously between facilities, and every row has real coordinates), so a bubble map is a natural upgrade over a flat leaderboard.

## Verified

Every row from `GET /api/state/{state_abbr}/ghg-emitters` includes `latitude`/`longitude` (confirmed via a live query against `ghg.rlps_ghg_emitter_gas` for Maryland/2023: 0 of 145 rows missing coordinates) — unlike ECHO facility data used in Site Search, there is no coordinate gap to design around here.

## Approach

New component `EmissionsMap.tsx`, directly modeled on the existing, already-reviewed `SiteSearchMap.tsx` pattern: React-Leaflet + OpenStreetMap tiles, `CircleMarker` (SVG-based, not the image-based `Marker` — avoids the same Vite/Leaflet icon-404 issue already solved once in this codebase), and a memoized `fitBounds` effect so the map view always frames every plotted facility regardless of how spread out they are across a state.

This case is simpler than `SiteSearchMap`'s: there is never a single "searched address" center point or radius circle to draw — every render is "many facilities, no anchor point" — so `EmissionsMap` only needs the multi-pin branch of `SiteSearchMap`'s bounds logic (`L.latLngBounds(...)` over all pin coordinates), not the address-radius or single-pin-fallback branches.

## Bubble sizing and color

- Circle radius scaled relative to the largest `total_co2e` in the current result set (not a fixed global scale) — so a state with only small emitters still shows visible size variation, rather than every bubble looking identical because they're all tiny compared to some other state's giant emitter.
- A minimum radius floor (e.g. 4px) so the smallest emitters remain visible as dots rather than disappearing entirely.
- Single consistent fill/stroke color (not the red/green violation scheme from `SiteSearchMap`) — there is no compliance/violation concept in GHGRP data, only magnitude, so using a violation-style color scheme here would misleadingly imply a judgment the data doesn't make. Size alone carries the meaning.

## Popup content

Facility name, city, year, total CO2e (matching the table's own columns) — so clicking a bubble identifies the same row a user would find in the table below it.

## Page layout

`EmissionsCenterPage.tsx`: render `<EmissionsMap emitters={emitters} />` between the intro text and the existing table, gated on the same `!loading && !error && emitters.length > 0` condition the table already uses — map and table appear/disappear together, matching the Site Search page's established pattern.

## Error handling

- Zero emitters (state has no GHGRP data): map is not rendered, same as the table's existing "no results" case — no empty/broken map box.
- This is a purely additive frontend component — no backend changes, no new API calls (the map consumes the same `emitters` array already fetched for the table).

## Out of scope

- Any color-coding by additional dimensions (e.g. gas type breakdown) — size-only for this version.
- Linking a bubble's popup to Facility Detail — same ID-namespace mismatch documented in the Emissions Center leaderboard's own spec applies here; GHGRP's `facility_id` still isn't cross-referenceable with `tri_facility_id`/registry ID.

## Testing

No frontend test harness exists in this repo (established convention). Verify via `npm run build` plus manual/reasoned verification of the bounds/sizing logic — no browser automation tool available this session, so a real browser check is left to the user afterward, same as the prior map feature.
