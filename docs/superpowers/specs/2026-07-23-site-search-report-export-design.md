# Site Search Report Export

## Problem

Site Search shows results on screen, but there's no way to produce something
a Phase 1 Environmental Site Assessment preparer can actually hand to a
client or attach as an exhibit. Real commercial "radius search report"
products (e.g. EDR) are scoped exactly this way: subject property, a map,
the list of regulated facilities found, and a list of sources reviewed — no
professional interpretation baked in, since that's the human assessor's job.

## Scope

Add a print-formatted report to the existing Site Search page: subject
property/search parameters, date generated, the map (already on the page),
the facility table (already on the page), a "Sources Reviewed" list, and a
disclaimer. Triggered by an "Export Report" button that calls
`window.print()`. No PDF library, no new route, no backend changes — this
is a frontend-only, print-CSS-driven feature.

Per-facility compliance/violation detail (inspections, penalties — the data
shown on the Facility Detail page) is explicitly **out of scope** for this
version. Including it would mean fetching Facility Detail-level data for
every result in a search, which is slower and needs its own design pass
(e.g. only for flagged facilities). This version only includes the summary
data Site Search already has (name, programs, compliance status).

## Approach

**Print CSS on the existing page, not a separate route.** A separate
`/site-search/report` route would need the current search results passed
via React Router state, which breaks on refresh or a bookmarked link (there's
no saved-search/case-file backend yet — see the deferred "saved searches"
idea from brainstorming). Reusing the current page avoids that whole class
of fragility: what's on screen (once print rules apply) *is* the report,
so there's nothing to go stale.

## Data flow

**The "submitted search" gap:** the report must describe the search that
was actually run, not whatever is currently sitting in the form's live
input state. Today, `SiteSearchPage.tsx` only has `address`/`state`/`radius`
as local form state (`SiteSearchPage.tsx:24-26`) — nothing tracks what was
actually submitted with the last `search()` call. If a user edits the
address field after searching but before printing, without re-submitting,
the current code has no way to tell the two apart.

Fix: `useSiteSearch` (`frontend/src/hooks/useSiteSearch.ts`) gains a
`lastSearch` field — an object `{ address: string; state: string; radius:
number } | null`, set at the top of `search()` (before the fetch) to the
params it was called with, alongside the existing `facilities`/
`latitude`/`longitude`/etc. state. `SiteSearchPage.tsx` reads `lastSearch`
(not the raw `address`/`state`/`radius` form state) when rendering the
print-only subject line.

## Print content (new `.print-only` block in `SiteSearchPage.tsx`)

Rendered once, near the top of the page's returned JSX, hidden on screen
and shown only under `@media print`:

- Title: "Environmental Site Search Report"
- Subject line:
  - If `lastSearch.address` is set: `Address: <address>, Radius: <radius>
    miles`
  - Else (state-only search): `State-wide search: <state>`
- Date generated: `new Date().toLocaleDateString()`, computed at render
  time (this is normal React runtime code, not a workflow script — no
  restriction on `new Date()` here)
- Sources Reviewed (static list, address mode includes the geocoder, state
  mode doesn't):
  - EPA ECHO (Enforcement and Compliance History Online)
  - EPA FRS (Facility Registry Service — Superfund/SEMS)
  - EPA Brownfields (ArcGIS FRS_INTERESTS layer)
  - US Census Geocoder (address mode only)
- Disclaimer: this report is a summary generated from public EPA/Census
  data available at the time of generation. It is not a professional
  environmental opinion and does not replace a qualified assessor's review.

## UI changes

- "Export Report" button rendered inside the same conditional block as the
  existing table/map (`{!loading && !error && facilities.length > 0 && (...)}`
  in `SiteSearchPage.tsx`) — not rendered at all when there are zero
  results, matching how the table and map already behave. Wrapped in
  `.no-print` so it never appears in the printed output itself. Calls
  `window.print()` directly; no confirmation dialog or intermediate state.

## Print CSS

`frontend/src/index.css` currently exists but is **not imported anywhere**
in the app (checked: only `bootstrap/dist/css/bootstrap.css` is imported in
`main.tsx`). Revive it: add `import './index.css'` to `main.tsx`, and add:

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

`.leaflet-container` is Leaflet's own root class, applied automatically to
the map's DOM node — no change needed in `SiteSearchMap.tsx` to target it.
`.navbar` is Bootstrap's class, already applied to the site's nav bar in
`NavBar.tsx` — hiding it here means this print stylesheet also benefits any
future page that adds its own print treatment, without extra plumbing.

## Error handling

- Zero results: Export button is not rendered (same condition as the
  existing table/map render gate, `facilities.length > 0`) — nothing new
  to handle.
- State-only search: subject line uses the state-only wording above;
  nothing else about the report changes (the map and table already handle
  a missing address point today).

## Out of scope

- Per-facility compliance/violation detail (deferred, see Scope above).
- A separate/bookmarkable report route (deferred — would need a saved
  search/case-file backend to avoid the staleness problem noted above).
- PDF library / server-generated PDF file (deferred — browser print-to-PDF
  covers this version's needs with no new dependency).

## Testing

No backend changes in this feature at all. No frontend test harness exists
in this repo (established in the map feature's spec/plan). Verification is
`npm run build` (type-check) plus manual browser verification: open Site
Search, run a search, open the browser's print preview (Cmd+P / Ctrl+P),
and confirm the form/nav/button are hidden, the print-only block appears
with correct subject/date/sources text, and the map and table render
without being cut awkwardly across a page break.
