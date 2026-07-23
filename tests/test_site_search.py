import unittest

import main


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url, params=None):
        if "echo_rest_services.get_facilities" in url:
            return FakeResponse('{"Results": {"QueryID": 1}}')
        if "echo_rest_services.get_qid" in url:
            return FakeResponse(
                '{"Results": {"Facilities": [{"RegistryID": "echo-1", '
                '"FacName": "Echo Facility", "FacCity": "Town", "FacState": "MD"}]}}'
            )
        if "frs_rest_services.get_facilities" in url:
            return FakeResponse(
                '{"Results": {"FRSFacility": [{"RegistryId": "sf-1", '
                '"FacilityName": "Superfund Site", "CityName": "Town", '
                '"StateAbbr": "MD", "Latitude83": "38.9", "Longitude83": "-76.9"}]}}'
            )
        if "FRS_INTERESTS" in url:
            return FakeResponse(
                '{"features": [{"attributes": {"REGISTRY_ID": "bf-1", '
                '"PRIMARY_NAME": "Brownfield Site", "CITY_NAME": "Town", '
                '"STATE_CODE": "MD", "LATITUDE83": 38.8, "LONGITUDE83": -76.8}}]}'
            )
        raise AssertionError(f"Unexpected URL: {url}")


class SiteSearchCoordinatesTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self._real_client = main.httpx.AsyncClient
        main.httpx.AsyncClient = FakeClient

    def tearDown(self):
        main.httpx.AsyncClient = self._real_client

    async def test_superfund_facility_includes_coordinates(self):
        result = await main.site_search(state="MD", radius=1, limit=50)
        facilities = {f["registry_id"]: f for f in result["facilities"]}
        superfund = facilities["sf-1"]
        self.assertEqual(superfund["latitude"], 38.9)
        self.assertEqual(superfund["longitude"], -76.9)

    async def test_brownfields_facility_includes_coordinates(self):
        result = await main.site_search(state="MD", radius=1, limit=50)
        facilities = {f["registry_id"]: f for f in result["facilities"]}
        brownfield = facilities["bf-1"]
        self.assertEqual(brownfield["latitude"], 38.8)
        self.assertEqual(brownfield["longitude"], -76.8)

    async def test_echo_facility_has_null_coordinates(self):
        result = await main.site_search(state="MD", radius=1, limit=50)
        facilities = {f["registry_id"]: f for f in result["facilities"]}
        echo = facilities["echo-1"]
        self.assertIsNone(echo["latitude"])
        self.assertIsNone(echo["longitude"])


if __name__ == "__main__":
    unittest.main()
