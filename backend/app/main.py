import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.requests import Request
from starlette.responses import JSONResponse

from . import models  # noqa: F401  (registers models on Base.metadata)
from .config import get_settings
from .database import Base, engine
from .routers import customers, dashboard, orders, products

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("inventory")

settings = get_settings()

app = FastAPI(
    title="Inventory & Order Management API",
    description="Backend for the Inventory & Order Management System.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _wait_for_db_and_create_tables(retries: int = 10, delay: float = 3.0) -> None:
    # Postgres often isn't accepting connections yet when the API container
    # starts, so retry a few times before giving up.
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            logger.info("Database ready and tables ensured.")
            return
        except OperationalError as exc:
            logger.warning("Database not ready (attempt %s/%s): %s", attempt, retries, exc)
            time.sleep(delay)
    raise RuntimeError("Could not connect to the database after several attempts.")


@app.on_event("startup")
def on_startup() -> None:
    _wait_for_db_and_create_tables()


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    # Last line of defense if a constraint violation slips past the app-level
    # checks (e.g. a race) - turn it into a 409 rather than a 500.
    return JSONResponse(
        status_code=409,
        content={"detail": "A database constraint was violated (duplicate or invalid value)."},
    )


@app.get("/", tags=["Health"])
def root():
    return {"service": "Inventory & Order Management API", "status": "ok"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
