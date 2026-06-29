from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import prices, forecast, advice, explain

app = FastAPI(
    title="MarketMind AI",
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

@app.get("/")
def root():
    return {"status": "ok", "app": "MarketMind AI"}
