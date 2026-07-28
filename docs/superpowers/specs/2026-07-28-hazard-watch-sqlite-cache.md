# Hazard Watch SQLite Cache

## Problem

`GET /api/state/{state_abbr}/hazard-watch` (`main.py:150-185`) queries EPA's
Envirofacts service live on every request — a 3-way join across
`tri.tri_facility`, `tri.tri_reporting_form`, and `tri.tri_form_totals`,
capped at 1000 rows, filtered to `PBT_CHEMICAL_IDS`. This query is
inherently slow (measured 7-14 seconds live, across MD/CA/VA/TX, no
consistent correlation with state size) and occasionally exceeds the
endpoint's 30-second httpx timeout, producing an unhandled 500 error (a
real production incident this session: `httpx.ReadTimeout` for
`state_abbr=CA` and `state_abbr=VA`).

Root cause confirmed via direct reproduction: EPA's live query response
time is genuinely variable and sometimes exceeds any reasonable per-request
timeout — not caused by our request pattern (a rapid-fire test of 8
consecutive MD requests followed by a CA request showed no throttling or
slowdown correlation).

## Scope decision (confirmed with user)

Rather than tolerating a longer wait (raising the timeout) or adding a
"taking longer than usual" UI indicator, **replace the live EPA call
entirely with a local SQLite cache**, populated by a separate sync script
run periodically (roughly annually, matching TRI's actual reporting
cadence — EPA finalizes each year's data on its own yearly cycle, so
there's nothing new to sync more often than that). This is a strictly
better fix than raising the timeout: it removes the live-EPA dependency
from this endpoint's request path entirely, rather than just tolerating
slowness.

**No functionality change; this endpoint only.** The endpoint's response
shape stays byte-identical to today — same fields, same filtering, same
sort order — so neither Classic's `HazardWatchPage.tsx` nor New Design's
`HazardWatchPageNew.tsx` (both consuming this same endpoint via
`useHazardWatch.ts`) need any changes at all. This work is scoped
exclusively to `get_hazard_watch` — it does NOT affect TRI Facility Search
(`GET /api/state/{state_abbr}`, a simple single-table query with no
timeout history) or Site Search (`GET /api/site-search`, which queries an
entirely different set of EPA services — ECHO, FRS, ArcGIS — unrelated to
TRI's data model). Those endpoints are explicitly out of scope.

## Architecture

**New file `sync_hazard_watch.py`** (project root, run manually, not part
of the FastAPI app): loops through all 50 states + DC, calls the exact same
EPA query `get_hazard_watch` already constructs (per state), applies the
exact same PBT-chemical filtering and `total_release` computation already
in that endpoint, and writes the results into a new local SQLite database.
Tolerates per-state failures: if one state's EPA query fails or times out,
the script logs it and continues to the next state, rather than aborting
the whole run — this must be safely re-runnable to retry just the states
that failed (re-syncing a state replaces that state's existing rows, it
doesn't append duplicates).

**New SQLite file** `hazard_watch_cache.db` (project root, alongside
`main.py`) — a single table:

```sql
CREATE TABLE IF NOT EXISTS hazard_watch (
    state_abbr TEXT NOT NULL,
    facility_id TEXT,
    facility_name TEXT,
    chemical TEXT,
    chem_id TEXT,
    year INTEGER,
    total_release REAL
);
CREATE INDEX IF NOT EXISTS idx_hazard_watch_state ON hazard_watch(state_abbr);
```

Directly mirrors the exact shape `get_hazard_watch` already returns to the
frontend (`facility_id`, `facility_name`, `chemical`, `chem_id`, `year`,
`total_release`) — no translation layer needed between cache and API
response.

**Backend change** (`main.py`, `get_hazard_watch`): replace the live
`httpx.AsyncClient` call entirely with a synchronous `sqlite3` query:
`SELECT facility_id, facility_name, chemical, chem_id, year, total_release
FROM hazard_watch WHERE state_abbr = ? ORDER BY total_release DESC`. Since
this is a local file read (sub-millisecond), running it synchronously
inside the async endpoint function is fine — no `aiosqlite` or thread-pool
wrapping needed for a query this cheap. Uses Python's built-in `sqlite3`
module — no new pip dependency (`requirements.txt` confirmed to not
already include it, and it doesn't need to, since it's stdlib).

**Bootstrapping:** the sync script is run once as part of this
implementation work, and the resulting `hazard_watch_cache.db` file is
committed to the repository — so the feature works immediately for anyone
who checks out this branch, with no manual sync step required before first
use. Re-running `sync_hazard_watch.py` later refreshes the data (e.g. once
a year, or whenever the user knows EPA has published new TRI data).

## Error handling

- If a query for a given `state_abbr` returns zero rows (e.g. a state with
  no PBT-flagged releases, or a state that failed during the sync and was
  never populated), the endpoint returns an empty list — identical to
  today's existing "no results" behavior, no new error state needed on the
  frontend.
- The sync script logs (prints) per-state success/failure as it runs, so a
  partial/interrupted sync run is diagnosable and safely resumable by
  re-running it (it will just re-fetch and overwrite all 51 states again;
  a future enhancement could support resuming only failed states, but
  that's not needed for this scope — a full re-run takes several minutes
  and is not run often).

## Testing

Backend logic (the SQLite query itself) is pure, testable Python — add a
small `unittest` test (matching the existing `tests/test_site_search.py`
and `tests/test_ghg_emitters.py` convention) that creates a temporary
SQLite database with known rows, points `get_hazard_watch` at it, and
confirms the returned shape and sort order are correct. This test does NOT
depend on live EPA access (unlike the endpoint's current behavior), which
is itself a meaningful reliability improvement to the test suite.

The `sync_hazard_watch.py` script itself is a one-off operational tool run
against live EPA data — not unit-tested in the traditional sense, but
verified by actually running it once during implementation and confirming
the resulting database has sensible row counts across a sample of states.

## Out of scope

- Any change to TRI Facility Search or Site Search — different endpoints,
  different EPA data sources, no timeout history.
- Automated/scheduled syncing (e.g. a cron job) — the sync is run manually,
  matching TRI's genuinely infrequent (annual) update cadence.
- Any frontend change — the endpoint's response contract is unchanged.
