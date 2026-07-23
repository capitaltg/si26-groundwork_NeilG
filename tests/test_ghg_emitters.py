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
        if "sort/year:desc/1:1/json" in url:
            if "/state/equals/EMPTY/" in url:
                return FakeResponse("[]")
            return FakeResponse('[{"year": 2023}]')
        if "/year/equals/2023/" in url:
            return FakeResponse(
                "["
                '{"facility_id": 1, "facility_name": "Plant A", "city": "Town", '
                '"state": "MD", "year": 2023, "co2e_emission": 100.0, '
                '"latitude": 38.9, "longitude": -76.9, "gas_code": "CO2"},'
                '{"facility_id": 1, "facility_name": "Plant A", "city": "Town", '
                '"state": "MD", "year": 2023, "co2e_emission": 50.0, '
                '"latitude": 38.9, "longitude": -76.9, "gas_code": "CH4"},'
                '{"facility_id": 2, "facility_name": "Plant B", "city": "Town2", '
                '"state": "MD", "year": 2023, "co2e_emission": 30.0, '
                '"latitude": 39.0, "longitude": -77.0, "gas_code": "CO2"}'
                "]"
            )
        raise AssertionError(f"Unexpected URL: {url}")


class GhgEmittersTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self._real_client = main.httpx.AsyncClient
        main.httpx.AsyncClient = FakeClient

    def tearDown(self):
        main.httpx.AsyncClient = self._real_client

    async def test_sums_multiple_gas_types_per_facility(self):
        result = await main.get_ghg_emitters("MD")
        by_id = {facility["facility_id"]: facility for facility in result}
        self.assertEqual(by_id[1]["total_co2e"], 150.0)

    async def test_sorts_facilities_by_total_descending(self):
        result = await main.get_ghg_emitters("MD")
        self.assertEqual([facility["facility_id"] for facility in result], [1, 2])

    async def test_empty_state_returns_empty_list(self):
        result = await main.get_ghg_emitters("EMPTY")
        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
