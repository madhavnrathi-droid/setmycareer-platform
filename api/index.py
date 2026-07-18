# Vercel Python serverless entry — exposes the FastAPI ASGI app.
#
# The static SPA (app/static) is served by Vercel's CDN; vercel.json rewrites
# /api/* to this function, which handles every API route. @vercel/python detects
# the module-level `app` ASGI object and serves it.
import pathlib
import sys

# make the project root importable so `app.main` resolves inside the function
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402,F401
