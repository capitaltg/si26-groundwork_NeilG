"""
Populates hazard_watch_cache.db with PBT-flagged TRI releases for every
US state + DC, sourced from EPA's live Envirofacts API. Run this manually
(python3 sync_hazard_watch.py) whenever EPA publishes new TRI data --
roughly annually. Safe to re-run: each state's rows are replaced, not
duplicated. Tolerates individual state failures (logs and continues) so
one bad EPA response doesn't abort the whole sync -- just re-run the
script afterward to retry whichever states failed.
"""
import os
import sqlite3
import time

import httpx

from main import PBT_CHEMICAL_IDS

DB_PATH = os.path.join(os.path.dirname(__file__), "hazard_watch_cache.db")

STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI",
    "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
    "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
    "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
    "WV", "WI", "WY",
]


def _fetch_state(state_abbr):
    url = (
        f"https://data.epa.gov/dmapservice/tri.tri_facility"
        f"/state_abbr/equals/{state_abbr}"
        f"/join/tri.tri_reporting_form"
        f"/tri.tri_facility.tri_facility_id/equals/tri.tri_reporting_form.tri_facility_id"
        f"/join/tri.tri_form_totals"
        f"/tri.tri_reporting_form.doc_ctrl_num/equals/tri.tri_form_totals.doc_ctrl_num"
        f"/sort/tri.tri_reporting_form.reporting_year:desc"
        f"/1:1000/json"
    )
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        r = client.get(url)
        return r.json()


def _init_db(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS hazard_watch (
            state_abbr TEXT NOT NULL,
            facility_id TEXT,
            facility_name TEXT,
            chemical TEXT,
            chem_id TEXT,
            year INTEGER,
            total_release REAL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_hazard_watch_state ON hazard_watch(state_abbr)"
    )
    conn.commit()


def sync_state(conn, state_abbr):
    rows = _fetch_state(state_abbr)
    flagged = [
        (
            state_abbr,
            row.get("tri_facility_id"),
            row.get("facility_name"),
            row.get("cas_chem_name"),
            row.get("tri_chem_id"),
            row.get("reporting_year"),
            (row.get("total_air_release") or 0)
            + (row.get("total_water_release") or 0)
            + (row.get("total_land_release") or 0),
        )
        for row in rows
        if row.get("tri_chem_id") in PBT_CHEMICAL_IDS
    ]
    conn.execute("DELETE FROM hazard_watch WHERE state_abbr = ?", (state_abbr,))
    conn.executemany(
        """
        INSERT INTO hazard_watch
            (state_abbr, facility_id, facility_name, chemical, chem_id, year, total_release)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        flagged,
    )
    conn.commit()
    return len(flagged)


def main():
    conn = sqlite3.connect(DB_PATH)
    _init_db(conn)

    succeeded = []
    failed = []
    for state_abbr in STATES:
        try:
            count = sync_state(conn, state_abbr)
            succeeded.append(state_abbr)
            print(f"{state_abbr}: {count} flagged rows")
        except Exception as exc:
            failed.append(state_abbr)
            print(f"{state_abbr}: FAILED ({exc})")
        time.sleep(0.5)

    conn.close()
    print(f"\nDone. {len(succeeded)} succeeded, {len(failed)} failed.")
    if failed:
        print(f"Failed states (re-run this script to retry): {', '.join(failed)}")


if __name__ == "__main__":
    main()
