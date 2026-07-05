from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
import logging
import threading
import pandas as pd

load_dotenv()

from routers import prices, forecast, advice, explain, basket, chat
from services.data_service import refresh_data
from services.model_service import load_models

logger = logging.getLogger("uvicorn")

app = FastAPI(
    title="KiBazarKorbo",
    description="Bangladesh grocery price intelligence API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

app.include_router(prices.router,   prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(advice.router,   prefix="/api")
app.include_router(explain.router,  prefix="/api")
app.include_router(basket.router,   prefix="/api")
app.include_router(chat.router, prefix="/api")

scheduler = BackgroundScheduler(timezone="Asia/Dhaka")

def scheduled_refresh():
    try:
        result = refresh_data()
        logger.info(f"[scheduler] live price refresh: {result}")
    except Exception as e:
        logger.error(f"[scheduler] live price refresh failed: {e}")

@app.on_event("startup")
def start_scheduler():
    # Pull today's prices once immediately when the server boots...
    scheduled_refresh()
    # ...then keep refreshing on a fixed schedule throughout the day.
    scheduler.add_job(scheduled_refresh, "cron", hour="9,13,17,21", minute=0, id="refresh_live_prices")
    scheduler.start()
    _warmup_shap()


def _warmup_shap():
    """Builds one SHAP TreeExplainer at boot instead of on the user's
    first forecast/basket request. `shap` pulls in numba/llvmlite, and on
    a fresh install (especially on Windows, where the first import can
    also get caught by antivirus scanning the new .pyd binaries) that
    first import + JIT warmup can take 10-30+ seconds. Paying that cost
    here means the user's first click doesn't time out."""
    try:
        import time
        from ml.explain_utils import top_factors
        models = load_models()
        for product, horizons in models.items():
            if not horizons:
                continue
            h = next(iter(horizons))
            model = horizons[h]
            n_features = model.n_features_in_
            dummy_row = pd.DataFrame([[0.0] * n_features], columns=model.feature_names_in_)
            t0 = time.time()
            top_factors(model, dummy_row)
            logger.info(f"[startup] SHAP warmup done in {time.time() - t0:.2f}s")
            break
    except Exception as e:
        logger.warning(f"[startup] SHAP warmup skipped: {e}")

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown(wait=False)

@app.get("/")
def root():
    return {"status": "ok", "app": "MarketMind AI"}