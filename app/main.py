from fastapi import FastAPI

app = FastAPI(title="Persoanl Bank Aggregator")

@app.get("/")
def root():
    return {"message": "API is running"}