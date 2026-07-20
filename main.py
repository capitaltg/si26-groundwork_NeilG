from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

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
            }
            for row in data
        ],
    }