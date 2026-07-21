from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

# EPA-designated PBT (Persistent Bioaccumulative Toxic) chemicals, by tri_chem_id.
# Pulled from EPA's own tri.tri_chem_info reference table (pbt_ind = 1) —
# a short, stable list that changes rarely, so it's hardcoded rather than
# queried on every request.
PBT_CHEMICAL_IDS = {
    "0040487421",  # Pendimethalin
    "0001336363",  # Polychlorinated biphenyls
    "N590",        # Polycyclic aromatic compounds
    "0000309002",  # Aldrin
    "0000057749",  # Chlordane
    "0008001352",  # Toxaphene
    "0001582098",  # Trifluralin
    "0007439921",  # Lead
    "0007439976",  # Mercury
    "N420",        # Lead compounds
    "N458",        # Mercury compounds
    "0000465736",  # Isodrin
    "0000072435",  # Methoxychlor
    "0000076448",  # Heptachlor
    "0000118741",  # Hexachlorobenzene
    "0000191242",  # Benzo[g,h,i]perylene
    "0029082744",  # Octachlorostyrene
    "0000608935",  # Pentachlorobenzene
    "0000079947",  # Tetrabromobisphenol A
    "N150",        # Dioxin and dioxin-like compounds
    "N270",        # Hexabromocyclododecane
    "0001222055",  # 1,3,4,6,7,8-Hexahydro-4,6,6,7,8,8-hexamethylcyclopenta[g]-2-benzopyran
}

# Initialize the FastAPI app instance
app = FastAPI()

# talk to the frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



"""
First endpoint 
grabs the name parameter and sticks it into a the api request to 
the EPA's TRI Facility API.
"""
@app.get("/api/facility/{name}")
async def get_facility(name: str):
    url = f"https://data.epa.gov/dmapservice/tri.tri_facility/facility_name/contains/{name}/1:10/json"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        return r.json()


"""
MD endpoint
gives back MD facilities with the built query url
"""
@app.get("/api/state/{state_abbr}")
async def get_facilities_by_state(state_abbr: str):
    url = f"https://data.epa.gov/dmapservice/tri.tri_facility/state_abbr/equals/{state_abbr}/1:20/json"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        return r.json()


"""
Releases endpoint
facility info + chemical/year/release amounts (air/water/land), newest year first
tri_reporting_form joined to tri_form_totals (release qtys) joined to tri_facility (name/address)
"""
@app.get("/api/facility/{facility_id}/releases")
async def get_facility_releases(facility_id: str):
    url = (
        f"https://data.epa.gov/dmapservice/tri.tri_reporting_form"
        f"/tri_facility_id/equals/{facility_id}"
        f"/join/tri.tri_form_totals"
        f"/tri.tri_reporting_form.doc_ctrl_num/equals/tri.tri_form_totals.doc_ctrl_num"
        f"/join/tri.tri_facility"
        f"/tri.tri_reporting_form.tri_facility_id/equals/tri.tri_facility.tri_facility_id"
        f"/sort/tri.tri_reporting_form.reporting_year:desc"
        f"/1:50/json"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        data = r.json()

    first = data[0] if data else {}

    return {
        "facility": {
            "id": first.get("tri_facility_id"),
            "name": first.get("facility_name"),
            "address": first.get("street_address"),
            "city": first.get("city_name"),
            "county": first.get("county_name"),
            "state": first.get("state_abbr"),
            "zip": first.get("zip_code"),
            "parent_company": first.get("parent_co_name"),
            "latitude": first.get("pref_latitude"),
            "longitude": first.get("pref_longitude"),
        },
        "releases": [
            {
                "chemical": row.get("cas_chem_name"),
                "chem_id": row.get("tri_chem_id"),
                "year": row.get("reporting_year"),
                "air_release": row.get("total_air_release"),
                "water_release": row.get("total_water_release"),
                "land_release": row.get("total_land_release"),
                "recycled": row.get("total_recycling_transfer"),
                "treated": row.get("total_treatment_transfer"),
                "transferred_offsite": row.get("total_transfer"),
                "is_hazardous": row.get("tri_chem_id") in PBT_CHEMICAL_IDS,
            }
            for row in data
        ],
    }


"""
Hazard Watch endpoint
Every release in a state involving an EPA-designated PBT chemical, worst
offenders first. Same 3-way join as the per-facility releases endpoint
(tri_facility -> tri_reporting_form -> tri_form_totals), just scoped by
state instead of one facility, then filtered down to PBT_CHEMICAL_IDS and
sorted by total release volume.
Capped to the most recent 1000 raw rows (sorted by reporting year) so a
state's entire multi-decade history isn't pulled on every request.
"""
@app.get("/api/state/{state_abbr}/hazard-watch")
async def get_hazard_watch(state_abbr: str):
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
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        data = r.json()

    flagged = [
        {
            "facility_id": row.get("tri_facility_id"),
            "facility_name": row.get("facility_name"),
            "chemical": row.get("cas_chem_name"),
            "chem_id": row.get("tri_chem_id"),
            "year": row.get("reporting_year"),
            "total_release": (
                (row.get("total_air_release") or 0)
                + (row.get("total_water_release") or 0)
                + (row.get("total_land_release") or 0)
            ),
        }
        for row in data
        if row.get("tri_chem_id") in PBT_CHEMICAL_IDS
    ]

    flagged.sort(key=lambda row: row["total_release"], reverse=True)

    return flagged


"""
Compliance endpoint
Cross-references EPA's ECHO system (Enforcement and Compliance History Online)
for a facility's regulatory standing across environmental programs (Clean Air
Act, Clean Water Act, RCRA, etc.) -- a different picture than TRI's
self-reported release data, which says nothing about violations or
enforcement history.
Looks up the facility's EPA registry ID from tri_facility, then queries
ECHO's Detailed Facility Report (DFR) service for that ID. Only a small,
clean slice of DFR's large response is used: industry classification plus
a per-program compliance summary (status, inspections, formal actions,
penalties) -- not the quarterly compliance tables, demographics, or map data
DFR also returns.
"""
@app.get("/api/facility/{facility_id}/compliance")
async def get_facility_compliance(facility_id: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        facility_url = (
            f"https://data.epa.gov/dmapservice/tri.tri_facility"
            f"/tri_facility_id/equals/{facility_id}/1:1/json"
        )
        facility_resp = await client.get(facility_url)
        facility_data = facility_resp.json()

        registry_id = facility_data[0].get("epa_registry_id") if facility_data else None
        if not registry_id:
            return {"industry": None, "programs": []}

        dfr_url = (
            f"https://echodata.epa.gov/echo/dfr_rest_services.get_dfr"
            f"?output=JSON&p_id={registry_id}"
        )
        dfr_resp = await client.get(dfr_url)
        dfr_data = dfr_resp.json().get("Results", {})

    enforcement_by_statute = {
        summary["Statute"]: summary
        for summary in dfr_data.get("EnforcementComplianceSummaries", {}).get("Summaries") or []
    }
    inspection_by_statute = {
        source["Statute"]: source
        for source in dfr_data.get("InspectionEnforcementSummary", {}).get("Source") or []
    }

    programs = [
        {
            "statute": statute,
            "status": enforcement_by_statute.get(statute, {}).get("CurrentStatus"),
            "inspection_count": inspection_by_statute.get(statute, {}).get("InspectionCount"),
            "formal_actions_count": inspection_by_statute.get(statute, {}).get("FormalEnfActCount"),
            "total_penalties": inspection_by_statute.get(statute, {}).get("TotalPenalties"),
        }
        for statute in set(enforcement_by_statute) | set(inspection_by_statute)
    ]

    return {
        "industry": dfr_data.get("Industries"),
        "programs": programs,
    }


"""
Site Search endpoint
Two modes:
  - address given: geocodes it via the US Census Bureau's free geocoder, then
    searches EPA's ECHO system for every regulated facility within `radius`
    miles of that point.
  - state given (no address): searches ECHO directly by state, no geocoding
    needed -- useful for a broad "anywhere in this state" search rather than
    a specific property.
Either way, results span every environmental program (TRI, RCRA, CAA, CWA,
SDWA) -- not just TRI reporters. This is the "what's regulated near this
property" workflow used in real Phase 1 Environmental Site Assessments
(ASTM radius search).
Note: ECHO's facility search results include latitude but not longitude, so
exact per-facility distance isn't shown -- the radius search itself already
guarantees every result falls within the requested radius.
"""
@app.get("/api/site-search")
async def site_search(
    address: Optional[str] = None,
    state: Optional[str] = None,
    radius: float = 1.0,
    limit: int = 100,
):
    async with httpx.AsyncClient(timeout=30.0) as client:
        latitude = None
        longitude = None

        if address:
            geocode_resp = await client.get(
                "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
                params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
            )
            matches = geocode_resp.json().get("result", {}).get("addressMatches") or []

            if not matches:
                return {"latitude": None, "longitude": None, "facilities": []}

            coordinates = matches[0]["coordinates"]
            latitude = coordinates["y"]
            longitude = coordinates["x"]

            search_params = {
                "output": "JSON",
                "p_lat": latitude,
                "p_long": longitude,
                "p_radius": radius,
            }
        elif state:
            search_params = {"output": "JSON", "p_st": state}
        else:
            return {"latitude": None, "longitude": None, "facilities": []}

        search_resp = await client.get(
            "https://echodata.epa.gov/echo/echo_rest_services.get_facilities",
            params=search_params,
        )
        query_id = search_resp.json().get("Results", {}).get("QueryID")

        if not query_id:
            return {"latitude": latitude, "longitude": longitude, "facilities": []}

        results_resp = await client.get(
            "https://echodata.epa.gov/echo/echo_rest_services.get_qid",
            params={"output": "JSON", "qid": query_id, "pagelength": 100},
        )
        rows = results_resp.json().get("Results", {}).get("Facilities") or []

    facilities = []
    for row in rows:
        programs = []
        if row.get("TRIFlag") == "Y":
            programs.append("TRI")
        if row.get("AIRFlag") == "Y":
            programs.append("CAA")
        if row.get("CWAComplianceStatus") is not None:
            programs.append("CWA")
        if row.get("RCRAComplianceStatus") is not None:
            programs.append("RCRA")
        if row.get("SDWAComplianceStatus") is not None:
            programs.append("SDWA")

        facilities.append(
            {
                "registry_id": row.get("RegistryID"),
                "name": row.get("FacName"),
                "city": row.get("FacCity"),
                "state": row.get("FacState"),
                "programs": programs,
                "compliance_status": row.get("FacComplianceStatus"),
                # FacSNCFlg = EPA's own "Significant Noncompliance" designation --
                # the worst violation tier, distinct from a minor/technical one.
                "significant_violation": row.get("FacSNCFlg") == "Y",
            }
        )

    # ECHO's own pagelength param doesn't actually cap result size (confirmed:
    # it still returns thousands of rows regardless of the value sent), so the
    # cap has to be enforced here. Significant violations are sorted first so
    # the worst compliance issues surface at the top instead of getting
    # buried in an arbitrarily-ordered list.
    facilities.sort(key=lambda f: f["significant_violation"], reverse=True)
    facilities = facilities[:limit]

    return {
        "latitude": latitude,
        "longitude": longitude,
        "facilities": facilities,
    }