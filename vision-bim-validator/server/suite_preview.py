"""Expose suite availability while retaining the application and validation API."""

import json
import os
from pathlib import Path

from starlette.responses import JSONResponse
from starlette.routing import Route

from server.main import app

_started_stamp = json.loads(os.environ["SPANVISION_BIM_STAMP"])
_stamp_path = Path(__file__).resolve().parent.parent / "viewer/dist/suite-build.json"


async def suite_status(request):
    try:
        current = json.loads(_stamp_path.read_text(encoding="utf-8"))
        available = all(
            current.get(key) == _started_stamp.get(key)
            for key in ("brandDigest", "sourceFingerprint")
        )
    except (OSError, ValueError):
        available = False
    return JSONResponse({
        **_started_stamp,
        "available": available,
        "message": "Ready to open" if available else "Rebuild and restart the BIM preview.",
    }, headers={"Cache-Control": "no-store"})


# The imported app ends with its SPA catch-all; status must precede that route.
app.router.routes.insert(0, Route("/__bim/status", suite_status, methods=["GET"]))
