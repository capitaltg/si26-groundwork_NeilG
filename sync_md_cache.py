"""
One-time (re-runnable) script to pre-warm md_demo_cache.db with every live
API response Groundwork's endpoints would otherwise fetch for Maryland, so
demo day doesn't depend on EPA/USFWS APIs being fast or even reachable.

The read-only endpoints in main.py check this cache first and fall back to
their normal live calls on a miss -- an empty or partial cache never breaks
anything, it just means that specific request stays live instead of being
instant. This script calls the exact same functions those endpoints use
(imported directly, not over HTTP) so the cached shape is guaranteed
identical to what a live request would have produced.

Run: python3 sync_md_cache.py
"""
import asyncio
import sys
import time

import main

STATE = "MD"
CONCURRENCY = 8


async def run():
    semaphore = asyncio.Semaphore(CONCURRENCY)
    started = time.monotonic()

    async def bound(coro):
        async with semaphore:
            return await coro

    print(f"[1/5] Fetching TRI facility list for {STATE}...")
    tri_full = await main.get_facilities_by_state(STATE, limit=750)
    tri_default = await main.get_facilities_by_state(STATE, limit=100)
    main._cache_set(f"state:{STATE}:750", tri_full)
    main._cache_set(f"state:{STATE}:100", tri_default)
    facility_ids = [f["tri_facility_id"] for f in tri_full if f.get("tri_facility_id")]
    print(f"      {len(facility_ids)} facilities")

    print(f"[2/5] Fetching releases + compliance for all {len(facility_ids)} facilities...")
    done = 0

    failed = []

    async def sync_facility(fid):
        nonlocal done
        try:
            releases, compliance = await asyncio.gather(
                main.get_facility_releases(fid),
                main.get_facility_compliance(fid),
            )
            main._cache_set(f"releases:{fid}", releases)
            main._cache_set(f"compliance:{fid}", compliance)
        except Exception as e:
            # One facility failing shouldn't abort a 600-facility batch --
            # log it and keep going, leaving that facility to fall back to
            # a live call at request time like normal.
            failed.append(fid)
            print(f"      WARN: {fid} failed ({e!r}), skipping")
        done += 1
        if done % 25 == 0 or done == len(facility_ids):
            elapsed = time.monotonic() - started
            print(f"      {done}/{len(facility_ids)} ({elapsed:.0f}s elapsed)")

    await asyncio.gather(*(bound(sync_facility(fid)) for fid in facility_ids))
    if failed:
        print(f"      {len(failed)} facilities failed and were skipped: {failed}")

    print(f"[3/5] Fetching GHG leaderboard for {STATE}...")
    ghg_emitters = await main.get_ghg_emitters(STATE)
    main._cache_set(f"ghg-emitters:{STATE}", ghg_emitters)
    print(f"      {len(ghg_emitters)} emitters")

    print(f"[4/5] Fetching GHG history for all {len(ghg_emitters)} emitters...")

    async def sync_emitter(facility_id):
        try:
            history = await main.get_ghg_emitter_history(facility_id)
            main._cache_set(f"ghg-history:{facility_id}", history)
        except Exception as e:
            print(f"      WARN: ghg emitter {facility_id} failed ({e!r}), skipping")

    await asyncio.gather(*(bound(sync_emitter(e["facility_id"])) for e in ghg_emitters))
    print(f"      done: {len(ghg_emitters)}")

    print(f"[5/5] Fetching state-wide Site Search for {STATE}...")
    for radius, limit in [(1, 100), (1, 300)]:
        result = await main.site_search(state=STATE, radius=radius, limit=limit)
        # Must match site_search()'s own cache_key formatting exactly (it
        # casts to float(radius)/int(limit) before formatting) -- this key is
        # constructed independently here on the write side, so it silently
        # drifted from the read side once that normalization was added there.
        main._cache_set(f"site-search:state:{STATE}:{float(radius)}:{int(limit)}", result)
        print(f"      radius={radius} limit={limit}: {len(result['facilities'])} facilities, {len(result['water_bodies'])} water bodies")

    elapsed = time.monotonic() - started
    print(f"\nDone in {elapsed:.0f}s.")


if __name__ == "__main__":
    asyncio.run(run())
    sys.exit(0)
