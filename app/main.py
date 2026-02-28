from fastapi import FastAPI
from app.routes import auth

app = FastAPI(title="Personal Bank Aggregator")

app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "API is running"}