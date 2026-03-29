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
        indexes = ["registration_number"]

class Goal(Document):
    title: str
    category: str
    progress: float = 0.0
    streak: int = 0
    owner_id: str
    priority: str = "medium"
    deadline: str = ""
    notes: str = ""
    subtasks: list = []

    class Settings:
        name = "goals"

class Schedule(Document):
    time: str
    title: str
    loc: str
    type: str
    status: str
    semester: str
    owner_id: str
    class_id: str = ""
    attended_classes: int = 0
    total_classes: int = 0
    attendance_percentage: int = 0
    faculty_name: str = ""
    school: str = ""
    course_code: str = ""
    course_name: str = ""

    class Settings:
        name = "schedules"

class Grade(Document):
    owner_id: str
    course_code: str
    course_title: str
    course_type: str
    credits: float
    grade: str
    exam_month: str
    result_declared: str
    # Semester GPA data
    semester_name: str = ""   # e.g. "Winter 2024-25"
    semester_gpa: float = 0.0 # GPA for that semester

    class Settings:
        name = "grades"

class Task(Document):
    owner_id: str
    goal_id: str = ""
    title: str
    date: str = ""
    time_slot: str = ""
    done: bool = False
    created_by: str = "ai"

    class Settings:
        name = "tasks"

class UserMessage(Document):
    sender_id: str
    receiver_id: str
    content: str
    timestamp: str
    # Attachment support
    attachment_name: str = ""
    attachment_type: str = ""   # "image" | "document" | "audio" | ""
    attachment_data: str = ""   # base64-encoded or URL

    class Settings:
        name = "user_messages"

class Connection(Document):
    """Friend/study-buddy connection between two users"""
    requester_id: str
    receiver_id: str
    status: str = "pending"     # "pending" | "accepted" | "rejected"
    shared_goals: list = []     # goal keywords that matched
    created_at: str = ""
    updated_at: str = ""

    class Settings:
        name = "connections"

class AcademicEvent(Document):
    """Academic calendar event scrapped from VTOP"""
    owner_id: str
    date: str                   # "YYYY-MM-DD"
    event_type: str             # "holiday" | "exam" | "working_saturday" | "fest" | "general"
    description: str
    semester: str = ""

    class Settings:
        name = "academic_events"

class Community(Document):
    name: str
    description: str = ""
    goal_tags: list = []
    creator_id: str
    members: list = []
    pending_invites: list = []
    created_at: str = ""

    class Settings:
        name = "communities"

class CommunityMessage(Document):
    community_id: str
    sender_id: str
    sender_name: str = ""
    content: str
    attachment_name: str = ""
    attachment_type: str = ""
    attachment_data: str = ""
    timestamp: str

    class Settings:
        name = "community_messages"
