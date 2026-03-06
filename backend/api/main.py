"""FastAPI app for comment analysis API and mayor chat."""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import analysis, chat, comments

app = FastAPI(title="Montgomery Comment Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(comments.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
