import os
import sqlite3
import tempfile
import unittest

import main


class HazardWatchCacheTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self._real_db_path = main.HAZARD_WATCH_DB_PATH
        fd, self._temp_db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        main.HAZARD_WATCH_DB_PATH = self._temp_db_path

        conn = sqlite3.connect(self._temp_db_path)
        conn.execute(
            """
            CREATE TABLE hazard_watch (
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
        conn.executemany(
            """
            INSERT INTO hazard_watch
                (state_abbr, facility_id, facility_name, chemical, chem_id, year, total_release)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("MD", "F1", "Facility One", "Lead", "0007439921", 2023, 500.0),
                ("MD", "F2", "Facility Two", "Mercury", "0007439976", 2022, 1500.0),
                ("VA", "F3", "Facility Three", "Lead", "0007439921", 2023, 999.0),
            ],
        )
        conn.commit()
        conn.close()

    def tearDown(self):
        main.HAZARD_WATCH_DB_PATH = self._real_db_path
        os.remove(self._temp_db_path)

    async def test_returns_only_matching_state_sorted_by_release_desc(self):
        result = await main.get_hazard_watch("MD")
        self.assertEqual([row["facility_id"] for row in result], ["F2", "F1"])
        self.assertEqual(result[0]["total_release"], 1500.0)
        self.assertEqual(result[0]["facility_name"], "Facility Two")
        self.assertEqual(result[0]["chemical"], "Mercury")

    async def test_state_with_no_rows_returns_empty_list(self):
        result = await main.get_hazard_watch("ZZ")
        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
