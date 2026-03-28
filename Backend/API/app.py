from fastapi import FastAPI, HTTPException 
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import uvicorn

load_dotenv()

app = FastAPI(title="Hangout Planner API")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") 
if not SUPABASE_URL or not SUPABASE_KEY:
    raise HTTPException(detail="Missing environment variables.", status_code=500)

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

@app.get("/")
def home():
    return {"message" : "Hello World"}

if __name__ == "__main__":
    uvicorn.run(app)