import json
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx


def _parse_json(resp: httpx.Response):
    # Some EPA/Census endpoints emit raw control characters (e.g. embedded
    # newlines) inside string fields, which the strict JSON parser httpx's
    # Response.json() uses rejects. strict=False tolerates them.
    return json.loads(resp.text, strict=False)

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
    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.get(url)
        return r.json()


"""
MD endpoint
gives back MD facilities with the built query url
"""
@app.get("/api/state/{state_abbr}")
async def get_facilities_by_state(state_abbr: str):
    url = f"https://data.epa.gov/dmapservice/tri.tri_facility/state_abbr/equals/{state_abbr}/1:20/json"
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
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
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
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
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
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
Also separately queries RCRA's own dedicated hazardous-waste search
(matched by facility name + state, since RCRA's search doesn't support a
direct registry-ID filter) for generator status -- Small/Large Quantity
Generator or TSDF -- a field DFR's cross-program summary doesn't reliably
carry, confirmed by comparing the two directly against a known SQG facility.
"""
@app.get("/api/facility/{facility_id}/compliance")
async def get_facility_compliance(facility_id: str):
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        facility_url = (
            f"https://data.epa.gov/dmapservice/tri.tri_facility"
            f"/tri_facility_id/equals/{facility_id}/1:1/json"
        )
        facility_resp = await client.get(facility_url)
        facility_data = facility_resp.json()

        if not facility_data:
            return {"industry": None, "programs": [], "rcra_generator_status": None}

        facility_name = facility_data[0].get("facility_name")
        facility_state = facility_data[0].get("state_abbr")
        registry_id = facility_data[0].get("epa_registry_id")

        dfr_data = {}
        if registry_id:
            dfr_url = (
                f"https://echodata.epa.gov/echo/dfr_rest_services.get_dfr"
                f"?output=JSON&p_id={registry_id}"
            )
            dfr_resp = await client.get(dfr_url)
            dfr_data = dfr_resp.json().get("Results", {})

        rcra_generator_status = None
        if facility_name and facility_state:
            rcra_search_resp = await client.get(
                "https://echodata.epa.gov/echo/rcra_rest_services.get_facilities",
                params={"output": "JSON", "p_fn": facility_name, "p_st": facility_state},
            )
            rcra_query_id = rcra_search_resp.json().get("Results", {}).get("QueryID")

            if rcra_query_id:
                rcra_results_resp = await client.get(
                    "https://echodata.epa.gov/echo/rcra_rest_services.get_qid",
                    params={"output": "JSON", "qid": rcra_query_id, "pagelength": 5},
                )
                rcra_rows = rcra_results_resp.json().get("Results", {}).get("Facilities") or []
                if rcra_rows:
                    match = rcra_rows[0]
                    rcra_generator_status = {
                        "generator_status": match.get("RCRAUniverse"),
                        "active_status": match.get("RCRAStatus"),
                        "compliance_status": match.get("RCRAComplStatus"),
                    }

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
    # Drop rows where every field is empty -- a statute name with zero actual
    # data behind it (e.g. EPCRA showing up with no status/counts at all) is
    # noise, not a real "no violations" signal.
    programs = [
        program
        for program in programs
        if any(
            program[field] is not None
            for field in ("status", "inspection_count", "formal_actions_count", "total_penalties")
        )
    ]

    return {
        "industry": dfr_data.get("Industries"),
        "programs": programs,
        "rcra_generator_status": rcra_generator_status,
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
    facilities_by_id = {}

    def add_facility(registry_id, name, city, state_abbr, program, compliance_status, is_concern):
        if not registry_id:
            return
        entry = facilities_by_id.setdefault(
            registry_id,
            {
                "registry_id": registry_id,
                "name": name,
                "city": city,
                "state": state_abbr,
                "programs": [],
                "compliance_status": compliance_status,
                "significant_violation": False,
            },
        )
        if program not in entry["programs"]:
            entry["programs"].append(program)
        if is_concern:
            entry["significant_violation"] = True
        if compliance_status and not entry["compliance_status"]:
            entry["compliance_status"] = compliance_status

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        latitude = None
        longitude = None

        if address:
            geocode_resp = await client.get(
                "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
                params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
            )
            matches = _parse_json(geocode_resp).get("result", {}).get("addressMatches") or []

            if not matches:
                return {"latitude": None, "longitude": None, "facilities": []}

            coordinates = matches[0]["coordinates"]
            latitude = coordinates["y"]
            longitude = coordinates["x"]

            echo_params = {
                "output": "JSON",
                "p_lat": latitude,
                "p_long": longitude,
                "p_radius": radius,
            }
            # FRS API caps search_radius at 25 miles.
            superfund_params = {
                "latitude83": latitude,
                "longitude83": longitude,
                "search_radius": min(radius, 25),
                "pgm_sys_acrnm": "SEMS",
                "output": "JSON",
            }
            brownfields_params = {
                "geometry": f"{longitude},{latitude}",
                "geometryType": "esriGeometryPoint",
                "inSR": 4326,
                "distance": radius,
                "units": "esriSRUnit_StatuteMile",
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "*",
                "f": "json",
            }
        elif state:
            echo_params = {"output": "JSON", "p_st": state}
            superfund_params = {"state_abbr": state, "pgm_sys_acrnm": "SEMS", "output": "JSON"}
            brownfields_params = {"where": f"STATE_CODE='{state}'", "outFields": "*", "f": "json"}
        else:
            return {"latitude": None, "longitude": None, "facilities": []}

        search_resp = await client.get(
            "https://echodata.epa.gov/echo/echo_rest_services.get_facilities",
            params=echo_params,
        )
        query_id = _parse_json(search_resp).get("Results", {}).get("QueryID")

        echo_rows = []
        if query_id:
            results_resp = await client.get(
                "https://echodata.epa.gov/echo/echo_rest_services.get_qid",
                params={"output": "JSON", "qid": query_id, "pagelength": 100},
            )
            echo_rows = _parse_json(results_resp).get("Results", {}).get("Facilities") or []

        superfund_resp = await client.get(
            "https://ofmpub.epa.gov/frs_public2/frs_rest_services.get_facilities",
            params=superfund_params,
        )
        try:
            superfund_results = _parse_json(superfund_resp).get("Results", {})
        except json.JSONDecodeError:
            # FRS returns malformed JSON for some error responses (e.g. a
            # trailing comma) -- treat an unparseable response as "no data"
            # rather than failing the whole combined search.
            superfund_results = {}
        superfund_rows = superfund_results.get("FRSFacility") or []
        if superfund_results.get("Error"):
            superfund_rows = []

        brownfields_resp = await client.get(
            "https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_INTERESTS/MapServer/0/query",
            params=brownfields_params,
        )
        brownfields_rows = _parse_json(brownfields_resp).get("features") or []

    for row in echo_rows:
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

        registry_id = row.get("RegistryID")
        if not registry_id:
            continue
        facilities_by_id[registry_id] = {
            "registry_id": registry_id,
            "name": row.get("FacName"),
            "city": row.get("FacCity"),
            "state": row.get("FacState"),
            "programs": programs,
            "compliance_status": row.get("FacComplianceStatus"),
            # FacSNCFlg = EPA's own "Significant Noncompliance" designation --
            # the worst violation tier, distinct from a minor/technical one.
            "significant_violation": row.get("FacSNCFlg") == "Y",
        }

    for row in superfund_rows:
        # Being an EPA Superfund site is itself a serious environmental
        # concern -- not a "compliance status" in the same sense as ECHO's
        # programs, but treated as significant so it surfaces near the top.
        add_facility(
            registry_id=row.get("RegistryId"),
            name=row.get("FacilityName"),
            city=row.get("CityName"),
            state_abbr=row.get("StateAbbr"),
            program="SUPERFUND",
            compliance_status="EPA Superfund Site",
            is_concern=True,
        )

    for row in brownfields_rows:
        attrs = row.get("attributes", {})
        add_facility(
            registry_id=attrs.get("REGISTRY_ID"),
            name=attrs.get("PRIMARY_NAME"),
            city=attrs.get("CITY_NAME"),
            state_abbr=attrs.get("STATE_CODE"),
            program="BROWNFIELD",
            compliance_status="Brownfields Property",
            is_concern=False,
        )

    facilities = list(facilities_by_id.values())

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