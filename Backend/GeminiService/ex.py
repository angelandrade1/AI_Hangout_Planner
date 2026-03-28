from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="models/gemini-2.5-pro",
    contents="Based this what is the best hangout location and give me the time "
)

print(response.text)




Copy

from google import genai
 
# --- Hangout Preferences (extracted from the form) ---
preferred_time = "03/28/2026, 12:30 PM"
desired_vibe = "Scary"
your_location = "Downtown, 123 Main St"  # fill in actual location
custom_suggestions = ""  # fill in if any
 
# --- Build the prompt from the form data ---
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
 
# --- Call Gemini API ---
client = genai.Client(api_key="#####")
 
response = client.models.generate_content(
    model="models/gemini-2.5-pro",
    contents=prompt
)
 
print(response.text)