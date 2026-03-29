from pydantic import BaseModel, Field
from typing import List, Optional
from beanie import PydanticObjectId

# --- Schedule Schemas ---
class ScheduleBase(BaseModel):
    time: str
    title: str
    loc: str
    type: str # Theory, Lab, Chill
    status: str # Done, Live, Upcoming
    semester: str

class ScheduleCreate(ScheduleBase):
    pass

class Schedule(ScheduleBase):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    owner_id: str

    class Config:
        from_attributes = True
        populate_by_name = True

# --- Goal Schemas ---
class GoalBase(BaseModel):
    title: str
    category: str
    progress: float = 0.0
    streak: int = 0

class GoalCreate(GoalBase):
    pass

class Goal(GoalBase):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    owner_id: str

    class Config:
        from_attributes = True
        populate_by_name = True

# --- User Auth & Profile Schemas ---
class UserBase(BaseModel):
    registration_number: str
    name: str
    branch: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    registration_number: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfile(UserBase):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    cgpa: float
    attendance: float
    current_semester: str = ""
    goals: List[Goal] = []
    schedule: List[Schedule] = []

    class Config:
        from_attributes = True
        populate_by_name = True
