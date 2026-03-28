from pydantic import BaseModel

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    username: str  # This will be used as email
    password: str