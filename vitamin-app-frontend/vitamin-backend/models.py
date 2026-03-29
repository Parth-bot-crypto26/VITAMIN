from beanie import Document
from pydantic import Field
from typing import Optional

class User(Document):
    registration_number: str
    name: str
    branch: str
    cgpa: float = 0.0
    attendance: float = 0.0
    current_semester: str = ""
    hashed_password: str

    class Settings:
        name = "users"
        indexes = [
            "registration_number"
        ]

class Goal(Document):
    title: str
    category: str
    progress: float = 0.0
    streak: int = 0
    owner_id: str

    class Settings:
        name = "goals"

class Schedule(Document):
    time: str
    title: str
    loc: str
    type: str # Theory, Lab, Chill
    status: str # Done, Live, Upcoming
    semester: str
    owner_id: str

    class Settings:
        name = "schedules"
