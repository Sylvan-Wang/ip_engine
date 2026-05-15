from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from config import settings
from api.auth import router as auth_router
from api.profile import router as profile_router
from api.topics import router as topics_router
from api.contents import router as contents_router
from api.materials import router as materials_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="IP引擎 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(profile_router, prefix=API_PREFIX)
app.include_router(topics_router, prefix=API_PREFIX)
app.include_router(contents_router, prefix=API_PREFIX)
app.include_router(materials_router, prefix=API_PREFIX)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "IP引擎"}
