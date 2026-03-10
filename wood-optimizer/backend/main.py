from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models, database, api

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Wood Optimizer API")

# Setup CORS to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Wood Optimizer API working"}
