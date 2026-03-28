from fastapi import HTTPException
from fast.generativeai import genai
from fastapi import FastAPI, Form
from typing import Optional
from fastapi.responses import JSONResponse

app = FastAPI()

import re

def parse_gemini_response(raw_text: str) -> dict:
    sections = re.split(r"\n\d+\.\s+", raw_text.strip())
    sections = [s.strip() for s in sections if s.strip()]

    return {
        "location": sections[0] if len(sections) > 0 else "",
        "activity": sections[1] if len(sections) > 1 else "",
        "reasoning": sections[2] if len(sections) > 2 else ""
    }

@app.post("/preferences")
async def submit(
    preferred_time: str = Form(...), 
    desired_vibe: str = Form(...), 
    your_location: str = Form(...), 
    custom_suggestions: Optional[str] = Form(None)
):


    prompt = f"""
    You are a hangout planner AI. Based on the following preferences, suggest the best hangout location and activity.
    
    Preferred Time: {preferred_time}
    Desired Vibe: {desired_vibe}
    Location: {your_location}
    Custom Suggestions: {custom_suggestions if custom_suggestions else "None"}
    
    Please recommend:
    1. The best hangout location that matches the vibe
    2. A specific activity to do there
    3. Why it fits the preferred time and vibe
    """
    try:
        client = genai.Client(api_key="###")
        
        response = client.models.generate_content(
            model="models/gemini-2.5-pro",
            contents=prompt
        )
        parsed = parse_gemini_response(response.text)
        return JSONResponse(content=parsed)
    except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))