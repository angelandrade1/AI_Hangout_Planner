from datetime import datetime
import os
from typing import Any
from uuid import UUID

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

app = FastAPI(title="Hangout Planner API")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class LocationPayload(BaseModel):
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateChatRequest(BaseModel):
    chat_name: str = "New Chat"
    user_id: UUID | None = None
    creator_user_id: UUID | None = None
    member_user_ids: list[UUID] = Field(default_factory=list)


class ChatMemberRequest(BaseModel):
    chat_id: UUID
    user_id: UUID


class CreateHangoutRequest(BaseModel):
    chat_id: UUID
    vibe: str | None = None
    event_time: datetime | None = None
    location: LocationPayload | None = None


class PreferenceRequest(BaseModel):
    user_id: UUID
    chat_id: UUID
    vibe: str | None = None
    suggestions: str | None = None
    available_times: dict[str, Any] | list[Any] | None = None
    location: LocationPayload | None = None


class MessageCreateRequest(BaseModel):
    chat_id: UUID
    user_id: UUID
    content: str


def raise_http_error(message: str, exc: Exception, status_code: int = 500) -> None:
    raise HTTPException(status_code=status_code, detail=f"{message}: {str(exc)}") from exc


def extract_row(response: Any, error_message: str) -> dict[str, Any]:
    if not response.data or not isinstance(response.data, list) or not isinstance(response.data[0], dict):
        raise HTTPException(status_code=400, detail=error_message)
    return response.data[0]


def create_location(location: LocationPayload | None) -> str | None:
    if location is None:
        return None

    payload = location.model_dump()
    if not any(payload.values()):
        return None

    try:
        response = supabase.table("locations").insert(payload).execute()
    except Exception as exc:
        raise_http_error("Failed to create location", exc)

    location_row = extract_row(response, "Failed to create location.")
    if "location_id" not in location_row:
        raise HTTPException(status_code=400, detail="Failed to create location.")

    return str(location_row["location_id"])


def ensure_chat_exists(chat_id: UUID) -> None:
    response = supabase.table("chats").select("chat_id").eq("chat_id", str(chat_id)).limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Chat not found.")


def ensure_user_exists(user_id: UUID) -> None:
    response = supabase.table("users").select("user_id").eq("user_id", str(user_id)).limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found.")


def ensure_user_in_chat(user_id: UUID, chat_id: UUID) -> None:
    response = (
        supabase.table("users_to_chats")
        .select("user_id")
        .eq("chat_id", str(chat_id))
        .eq("user_id", str(user_id))
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=403, detail="User is not a member of this chat.")


def resolve_chat_creator(request: CreateChatRequest) -> UUID:
    creator_user_id = request.user_id or request.creator_user_id
    if creator_user_id is None:
        raise HTTPException(status_code=422, detail="create_chat requires user_id.")
    return creator_user_id


@app.post("/signup")
async def signup(request: SignupRequest):
    try:
        existing_user_response = (
            supabase.table("users")
            .select("user_id, email")
            .eq("email", request.email)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to check for existing user", exc, status_code=400)

    if existing_user_response.data:
        raise HTTPException(status_code=400, detail="A user profile with that email already exists.")

    try:
        profile_insert = (
            supabase.table("users")
            .insert(
                {
                    "first_name": request.first_name,
                    "last_name": request.last_name,
                    "username": request.username,
                    "email": request.email,
                }
            )
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to insert user profile", exc, status_code=400)

    if not profile_insert.data:
        raise HTTPException(status_code=400, detail="Failed to insert user profile.")

    created_user = extract_row(profile_insert, "Failed to insert user profile.")
    return {"message": "Signup successful", "user_id": created_user["user_id"]}


@app.post("/login")
async def login(request: LoginRequest):
    try:
        result = supabase.auth.sign_in_with_password(
            {
                "email": request.email,
                "password": request.password,
            }
        )
    except Exception as exc:
        raise_http_error("Login failed", exc, status_code=401)

    user = result.user
    session = result.session
    if not user or not session:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "message": "Login successful",
        "user_id": user.id,
        "access_token": session.access_token,
    }


@app.post("/logout")
async def logout():
    try:
        supabase.auth.sign_out()
        return {"message": "Logout successful"}
    except Exception as exc:
        raise_http_error("Logout failed", exc, status_code=400)


@app.get("/chats")
def get_chats(user_id: UUID):
    ensure_user_exists(user_id)

    try:
        response = (
            supabase.table("users_to_chats")
            .select("chat_id, chats(chat_id, chat_name, created_at)")
            .eq("user_id", str(user_id))
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to fetch chats", exc)

    chats = [row["chats"] for row in response.data if isinstance(row, dict) and "chats" in row]
    return {"user_id": user_id, "chats": chats}


@app.get("/open-chat")
def open_chat(chat_id: UUID):
    ensure_chat_exists(chat_id)

    try:
        messages_response = (
            supabase.table("messages")
            .select("message_id, content, created_at, user_id, chat_id")
            .eq("chat_id", str(chat_id))
            .order("created_at")
            .execute()
        )
        members_response = (
            supabase.table("users_to_chats")
            .select("user_id, users(user_id, username, first_name, last_name, email)")
            .eq("chat_id", str(chat_id))
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to open chat", exc)

    members = [row["users"] for row in members_response.data if isinstance(row, dict) and "users" in row]
    return {"chat_id": chat_id, "members": members, "messages": messages_response.data}


@app.post("/messages")
def create_message(request: MessageCreateRequest):
    ensure_chat_exists(request.chat_id)
    ensure_user_exists(request.user_id)
    ensure_user_in_chat(request.user_id, request.chat_id)

    try:
        response = (
            supabase.table("messages")
            .insert(
                {
                    "chat_id": str(request.chat_id),
                    "user_id": str(request.user_id),
                    "content": request.content,
                }
            )
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to create message", exc)

    return {"message": "Message sent", "data": extract_row(response, "Failed to create message.")}


@app.post("/create-chat")
def create_chat(request: CreateChatRequest):
    creator_user_id = resolve_chat_creator(request)
    ensure_user_exists(creator_user_id)
    for member_id in request.member_user_ids:
        ensure_user_exists(member_id)

    member_ids = {str(creator_user_id), *(str(member_id) for member_id in request.member_user_ids)}

    try:
        chat_response = (
            supabase.table("chats")
            .insert({"chat_name": request.chat_name})
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to create chat", exc)

    chat = extract_row(chat_response, "Failed to create chat.")
    if "chat_id" not in chat:
        raise HTTPException(status_code=400, detail="Failed to create chat.")

    memberships = [{"chat_id": chat["chat_id"], "user_id": user_id} for user_id in member_ids]

    try:
        membership_response = supabase.table("users_to_chats").insert(memberships).execute()
    except Exception as exc:
        raise_http_error("Failed to add chat members", exc)

    return {
        "message": "Chat created",
        "chat": chat,
        "members_added": membership_response.data or memberships,
    }


@app.post("/invite")
def invite_user(request: ChatMemberRequest):
    ensure_chat_exists(request.chat_id)
    ensure_user_exists(request.user_id)
    try:
        ensure_user_in_chat(request.user_id, request.chat_id)
        return {"message": "User is already in the chat", "membership": None}
    except HTTPException as exc:
        if exc.status_code != 403:
            raise

    try:
        response = (
            supabase.table("users_to_chats")
            .insert({"chat_id": str(request.chat_id), "user_id": str(request.user_id)})
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to invite user", exc, status_code=400)

    return {"message": "User added to chat", "membership": extract_row(response, "Failed to invite user.")}


@app.delete("/remove-user")
def remove_user(request: ChatMemberRequest):
    ensure_chat_exists(request.chat_id)
    ensure_user_exists(request.user_id)
    ensure_user_in_chat(request.user_id, request.chat_id)

    try:
        response = (
            supabase.table("users_to_chats")
            .delete()
            .eq("chat_id", str(request.chat_id))
            .eq("user_id", str(request.user_id))
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to remove user", exc)

    return {"message": "User removed from chat", "removed": response.data or []}


@app.get("/hangout")
def initialize_hangout(chat_id: UUID):
    ensure_chat_exists(chat_id)

    try:
        response = (
            supabase.table("hangouts")
            .select("hangout_id, vibe, event_time, created_at, chat_id, location_id, locations(*)")
            .eq("chat_id", str(chat_id))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to fetch hangout", exc)

    hangout = response.data[0] if response.data else None
    return {"chat_id": chat_id, "hangout": hangout}


@app.post("/create-hangout")
def create_hangout(request: CreateHangoutRequest):
    ensure_chat_exists(request.chat_id)
    location_id = create_location(request.location)

    payload = {
        "chat_id": str(request.chat_id),
        "vibe": request.vibe,
        "event_time": request.event_time.isoformat() if request.event_time else None,
        "location_id": location_id,
    }

    try:
        response = supabase.table("hangouts").insert(payload).execute()
    except Exception as exc:
        raise_http_error("Failed to create hangout", exc)

    return {"message": "Hangout created", "hangout": extract_row(response, "Failed to create hangout.")}


@app.post("/preferences")
def post_preferences(request: PreferenceRequest):
    ensure_chat_exists(request.chat_id)
    ensure_user_exists(request.user_id)
    ensure_user_in_chat(request.user_id, request.chat_id)
    location_id = create_location(request.location)

    payload = {
        "user_id": str(request.user_id),
        "chat_id": str(request.chat_id),
        "vibe": request.vibe,
        "suggestions": request.suggestions,
        "available_times": request.available_times,
        "location_id": location_id,
    }

    try:
        response = (
            supabase.table("hangout_preferences")
            .upsert(payload, on_conflict="user_id,chat_id")
            .execute()
        )
    except Exception as exc:
        raise_http_error("Failed to save preferences", exc)

    return {"message": "Preferences saved", "preferences": extract_row(response, "Failed to save preferences.")}


if __name__ == "__main__":
    uvicorn.run(app)
