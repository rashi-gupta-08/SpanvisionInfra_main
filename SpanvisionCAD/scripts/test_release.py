"""Release naming and disabled publishing checks."""

from datetime import datetime, timezone
import unittest

import release


class ReleaseTests(unittest.TestCase):
    def test_calendar_versions(self):
        self.assertEqual(release.versions("v2026.35"), {
            "version": "2026.35", "cargo": "2026.35.0", "msi": "26.35.0", "tag": "v2026.35",
        })
        self.assertEqual(release.versions("2026.09")["cargo"], "2026.9.0")
        self.assertEqual(release.display_version("2026.9.0"), "2026.09")
        self.assertEqual(datetime(2027, 1, 3, tzinfo=timezone.utc).strftime("v%G.%V"), "v2026.53")
        for value in ("2026.00", "2026.54", "2027.53", "2026.9", "bad"):
            with self.assertRaises(ValueError):
                release.versions(value)

    def test_publishing_requires_spanvision_destinations(self):
        with self.assertRaisesRegex(ValueError, "Spanvision repository and release URLs"):
            release.prepare(True)

    def test_native_artifact_names(self):
        import inspect
        source = inspect.getsource(release.verify_native)
        self.assertIn('f"SpanvisionCAD-{tag}-{suffix}"', source)
        self.assertNotIn('f"OpenCADStudio-{tag}-{suffix}"', source)


if __name__ == "__main__":
    unittest.main()
