# New Design — Site Search (page 2 of 4)

## Problem

The New Design toggle currently only affects Facility Detail. Site Search
is next in the agreed one-page-at-a-time sequence. It's the most complex
remaining page — it has a live map, two search modes, and (as of this
branch's base) an "Export Report" print feature that didn't exist when the
original design mockup was made.

## Scope decisions (confirmed with user)

- **Site Search ported next** (not Facilities or Hazard Watch) — it
  includes the map the user specifically asked about, and Classic already
  has a working, real Leaflet map (`SiteSearchMap.tsx`) to draw the pattern
  from, same as Facility Detail reused its hooks.
- **"Export Report" is out of scope for this port.** New Design's Site
  Search page will not include an Export Report button. Classic's page and
  its print behavior are completely unaffected either way — this isn't a
  removal, just a deferral, consistent with how Emissions Center is also
  deferred.
- **Shared utilities extraction.** The final whole-branch review of the
  Facility Detail port flagged that `GENERATOR_STATUS_LABELS` had to be
  duplicated (not reused) between Classic and New Design, because the
  Classic file couldn't be modified to export it. Before repeating that
  copy-paste pattern a second time, this port extracts a small shared
  `newDesign/badge.ts` module for badge *styling* (colors), which both
  Facility Detail and Site Search's New Design pages will use — this
  applies to `FacilityDetailPageNew.tsx` too (an in-branch refactor of
  already-shipped New Design code, not a Classic file).

## Source material and current state (verified before writing this spec)

- Mockup's "sites" view (from `Groundwork.dc.html`, read in full during the
  first design cycle): mode tabs (address/state), a search form, a results
  header (facility count + flagged count), then a map with a legend
  **beside** a scrollable card list of matched facilities — not a table
  below the map.
- Classic's current `SiteSearchPage.tsx` (this branch, post-merge of the
  map and report-export features): mode-free single form (address OR
  state fields shown together, not tabbed), map **above** a `<table>`,
  Export Report button, print-only report block. Confirmed via direct read
  of the current file on this branch.
- Classic's `ComplianceBadge` (inline in `SiteSearchPage.tsx`) already
  implements the exact 3-tier logic the mockup's legend calls for:
  `significant_violation` → red "Significant Violation"; a non-null status
  other than `"No Violation Identified"` → amber (showing that status);
  otherwise → green "No Violation Identified". This is simpler than
  Facility Detail's badge derivation was, because `SiteSearchFacility`
  already carries `compliance_status`/`significant_violation` directly per
  facility — no need to derive from a list of per-program statuses.
- Classic's `SiteSearchMap.tsx` (component, not to be modified) only does
  **2-tier** marker coloring (`significant_violation ? red : green` — no
  amber case), which doesn't match the mockup's 3-color legend. This is a
  pre-existing inconsistency in Classic itself (the table shows 3 tiers,
  the map shows 2) — not something to fix in Classic, but something New
  Design's own map should not blindly copy, since the mockup explicitly
  wants 3 tiers.
- `useSiteSearch()` hook (unmodified, reused as-is): returns `{ facilities,
  latitude, longitude, loading, error, searched, lastSearch, search }`.
  `search({ address, state, radius, limit })` triggers the fetch.

## Approach

New page `newDesign/SiteSearchPageNew.tsx`, consuming the exact same
`useSiteSearch()` hook as Classic — zero new endpoints, zero duplicated
data-fetching. Layout follows the mockup: mode tabs, form, results header,
then a map + scrollable card list side by side (a real layout change from
Classic's stacked map-then-table, matching the mockup's design).

New map component `newDesign/SiteSearchMapNew.tsx` — a new file, not a
modification of `SiteSearchMap.tsx`. Same Leaflet/`fitBounds` pattern
already proven in the Classic component (memoized bounds, `CircleMarker`
only, never the image-based `Marker`), but with 3-tier marker coloring
driven by the same tier logic Site Search's own card list uses (see
below), plus a legend overlay matching the mockup.

## Shared badge styling module

New file `newDesign/badge.ts` exporting:

```typescript
export type BadgeTier = "critical" | "warning" | "clean" | "unknown";

export function badgeStyle(tier: BadgeTier): { bg: string; color: string; dot: string } {
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

This centralizes color *styling* only — each page keeps its own
domain-specific logic for deciding which tier applies (Facility Detail
loops over `compliance.programs`; Site Search reads two fields already
present directly on `SiteSearchFacility`), since the two input shapes
genuinely differ and forcing one shared derivation function over both
would be an awkward abstraction. `FacilityDetailPageNew.tsx`'s existing
inline badge color literals (added in the prior port) are refactored to
call `badgeStyle()` instead of repeating hex codes — this is an in-branch
cleanup of already-shipped New Design code on this same unmerged branch,
not a Classic file change.

Site Search's own tier derivation (new, small, page-local function):

```typescript
function tierFor(facility: SiteSearchFacility): BadgeTier {
  if (facility.significant_violation) return "critical";
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") return "warning";
  return "clean";
}
```

This is the same logic as Classic's `ComplianceBadge`, just returning a
tier instead of directly returning JSX — used by both the card list and
the new map's marker coloring, so the two stay visually consistent with
each other (unlike Classic, where the table and map disagree on tier
count).

## Layout details

- Mode tabs: "Near an address" / "Across a state" — switching tabs shows
  the address+radius fields or the state field, matching the mockup.
  Submitting the form calls the same `search()` function Classic uses,
  with the same parameter shape.
- Results header: facility count and flagged count (`significant_violation
  === true` count), matching the mockup's styling.
- Map + card list: side by side (map left, cards right, matching the
  mockup's `1.15fr 1fr` grid proportions), each card showing facility
  name, city/state, program badges (reusing `PROGRAM_LABELS` from
  `frontend/src/constants/programLabels.ts` — already shared, no
  duplication needed), and the tier-derived badge.
- No results / loading / error states: same conditions as Classic
  (`loading`, `error`, `searched && facilities.length === 0`), restyled to
  match the New Design card/typography treatment.

## Error handling

Identical conditions to Classic — no new error states, since this reuses
the same hook and the same three-state gate (`loading`/`error`/empty).

## Out of scope (this spec)

- Export Report button/print behavior — deferred, per user decision.
- Any change to `SiteSearchPage.tsx`, `SiteSearchMap.tsx`,
  `useSiteSearch.ts`, or `constants/programLabels.ts` — all read-only
  references, zero modifications.
- Facilities (browse) and Hazard Watch pages — separate follow-up specs,
  per the agreed one-page-at-a-time sequencing.

## Testing

No frontend test harness exists in this repo (established convention) —
verification is `npm run build` (type-check) plus manual/reasoned
verification. No browser automation tool is available in this session —
the user will need to do the real toggle/map check afterward, consistent
with every prior UI feature this session.
