from fastapi import FastAPI
from app.routes import auth

app = FastAPI(title="Persoanl Bank Aggregator")

app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "API is running"}