import os
import logging
from datetime import datetime
from typing import List, Dict, Any
import asyncio

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not API_KEY:
    logger.error("GEMINI_API_KEY is not set in .env!")

_client = genai.Client(api_key=API_KEY)

MODEL = "gemini-1.5-flash"   # Free-tier model with generous quota
MAX_RETRIES = 3
BASE_RETRY_DELAY = 2  # seconds

# ── Function declarations (new SDK format) ────────────────────────────────────
FUNCTION_DECLARATIONS = [
    types.FunctionDeclaration(
        name="create_task",
        description="Create a new study task and optionally link it to a goal. Use this when the user asks you to plan something, schedule a study session, or break a goal into steps.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "title":     types.Schema(type=types.Type.STRING, description="Short description of the task"),
                "date":      types.Schema(type=types.Type.STRING, description="ISO date e.g. 2026-03-29"),
                "time_slot": types.Schema(type=types.Type.STRING, description="Time range e.g. 14:00-15:30"),
                "goal_id":   types.Schema(type=types.Type.STRING, description="MongoDB ID of the goal, or empty string"),
            },
            required=["title"],
        ),
    ),
    types.FunctionDeclaration(
        name="update_task",
        description="Mark a task as done or rename it.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "task_id": types.Schema(type=types.Type.STRING, description="MongoDB _id of the task"),
                "done":    types.Schema(type=types.Type.BOOLEAN, description="True to mark as done"),
                "title":   types.Schema(type=types.Type.STRING, description="New title, if renaming"),
            },
            required=["task_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="delete_task",
        description="Delete a task permanently.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "task_id": types.Schema(type=types.Type.STRING, description="MongoDB _id of the task to delete"),
            },
            required=["task_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="update_goal_progress",
        description="Update the progress percentage of a goal.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "goal_id":      types.Schema(type=types.Type.STRING, description="MongoDB _id of the goal"),
                "progress_pct": types.Schema(type=types.Type.NUMBER, description="New progress 0-100"),
            },
            required=["goal_id", "progress_pct"],
        ),
    ),
    types.FunctionDeclaration(
        name="schedule_weekly_plan",
        description="Creates multiple tasks for the week in one go. Base this on the user's free slots from their timetable.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "tasks": types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "title": types.Schema(type=types.Type.STRING, description="Task title"),
                            "date": types.Schema(type=types.Type.STRING, description="ISO date YYYY-MM-DD"),
                            "time_slot": types.Schema(type=types.Type.STRING, description="Time slot, e.g. 14:00-15:30"),
                            "goal_id": types.Schema(type=types.Type.STRING, description="Optional Goal ID")
                        },
                        required=["title", "date", "time_slot"]
                    )
                )
            },
            required=["tasks"],
        ),
    ),
]

TOOLS = [types.Tool(function_declarations=FUNCTION_DECLARATIONS)]


# ── Context builder ────────────────────────────────────────────────────────────
async def build_context(user) -> str:
    from models import Schedule, Grade, Goal, Task

    schedules = await Schedule.find({"owner_id": user.registration_number}).to_list()
    grades = await Grade.find({"owner_id": user.registration_number}).to_list()
    goals = await Goal.find({"owner_id": user.registration_number}).to_list()
    tasks = await Task.find({"owner_id": user.registration_number, "done": False}).to_list()

    current_sem = user.current_semester or "Unknown"
    lines = [
        f"## Student: {user.name} ({user.registration_number})",
        f"## Branch: {user.branch}",
        f"## Current Semester: {current_sem}",
        f"## Overall CGPA: {user.cgpa}",
        f"## Average Attendance this semester: {user.attendance:.1f}%",
        "",
        f"### Current Semester Subjects ({current_sem})",
        "Format: Course Code | Course Name | Type | Slot | Venue | Faculty | Attendance",
    ]

    seen_codes = set()
    current_sched = [s for s in schedules if s.semester == current_sem]
    for s in current_sched:
        code = s.course_code or s.title.split(' - ')[0]
        if code in seen_codes:
            continue
        seen_codes.add(code)
        name = s.course_name or s.title
        att_str = f"{s.attended_classes}/{s.total_classes} ({s.attendance_percentage}%)" if s.total_classes else "No data yet"
        faculty = s.faculty_name or "N/A"
        lines.append(f"- {code} | {name} | {s.type} | Slot: {s.time} | {s.loc} | {faculty} | {att_str}")
    
    if not current_sched:
        lines.append("  (No timetable data — user needs to sync VTOP first)")
    lines.append("")

    # All semesters timetable (for context on past attendance)
    other_sems = set(s.semester for s in schedules if s.semester != current_sem)
    if other_sems:
        lines.append(f"### Past Semester Records")
        lines.append(f"User has data for: {', '.join(sorted(other_sems))}")
        lines.append("")

    lines.append("### Grade History (All Semesters)")
    if grades:
        for g in grades:
            lines.append(f"- {g.course_code} | {g.course_title} | {g.grade} | {g.credits} credits | {g.exam_month}")
    else:
        lines.append("  (No grade history yet — user needs to sync VTOP)")
    lines.append("")

    lines.append("### Goals")
    for g in goals:
        deadline = f" | Deadline: {g.deadline}" if g.deadline else ""
        lines.append(f"- [{g.priority.upper()}] \"{g.title}\" | Progress: {g.progress:.0f}%{deadline}")
        lines.append(f"  goal_id: {str(g.id)}")
    if not goals:
        lines.append("  (No goals set yet)")
    lines.append("")

    lines.append("### Pending AI Tasks")
    for t in tasks:
        lines.append(f"- [{t.date} {t.time_slot}] {t.title} | task_id: {str(t.id)}")
    if not tasks:
        lines.append("  (No pending tasks)")

    return "\n".join(lines)



# ── Function executor ──────────────────────────────────────────────────────────
async def execute_function(name: str, args: dict, user) -> str:
    from models import Task, Goal
    logger.info(f"Executing function: {name}({args})")

    if name == "create_task":
        task = Task(
            owner_id=user.registration_number,
            goal_id=args.get("goal_id", ""),
            title=args["title"],
            date=args.get("date", datetime.now().strftime("%Y-%m-%d")),
            time_slot=args.get("time_slot", ""),
            done=False,
            created_by="ai",
        )
        await task.insert()
        return f"Created task '{task.title}' on {task.date} {task.time_slot}"

    elif name == "update_task":
        from beanie import PydanticObjectId
        try:
            task = await Task.get(PydanticObjectId(args["task_id"]))
            if task and task.owner_id == user.registration_number:
                if "done" in args: task.done = args["done"]
                if "title" in args: task.title = args["title"]
                await task.save()
                return f"Task '{task.title}' {'done ✓' if task.done else 'updated'}"
        except Exception as e:
            return f"Could not update task: {e}"

    elif name == "delete_task":
        from beanie import PydanticObjectId
        try:
            task = await Task.get(PydanticObjectId(args["task_id"]))
            if task and task.owner_id == user.registration_number:
                await task.delete()
                return f"Deleted task '{task.title}'"
        except Exception as e:
            return f"Could not delete task: {e}"

    elif name == "update_goal_progress":
        from beanie import PydanticObjectId
        try:
            goal = await Goal.get(PydanticObjectId(args["goal_id"]))
            if goal and goal.owner_id == user.registration_number:
                goal.progress = float(args["progress_pct"])
                await goal.save()
                return f"Updated goal '{goal.title}' to {goal.progress:.0f}%"
        except Exception as e:
            return f"Could not update goal: {e}"

    elif name == "schedule_weekly_plan":
        from models import Task
        created_tasks = []
        try:
            for t_data in args.get("tasks", []):
                task = Task(
                    owner_id=user.registration_number,
                    goal_id=t_data.get("goal_id", ""),
                    title=t_data["title"],
                    date=t_data["date"],
                    time_slot=t_data["time_slot"],
                    done=False,
                    created_by="ai"
                )
                await task.insert()
                created_tasks.append(f"{task.date} {task.time_slot}: {task.title}")
            return f"Scheduled {len(created_tasks)} tasks successfully:\n" + "\n".join(created_tasks)
        except Exception as e:
            return f"Could not schedule weekly plan: {e}"

    return f"Unknown function: {name}"


# ── Main agent entrypoint ──────────────────────────────────────────────────────
async def run_agent(user, user_message: str, history: List[Dict]) -> Dict[str, Any]:
    if not API_KEY:
        return {"reply": "❌ Gemini API key is not configured. Please set GEMINI_API_KEY in vitamin-backend/.env", "actions": []}

    try:
        context = await build_context(user)
    except Exception as e:
        logger.error(f"Failed to build context: {e}", exc_info=True)
        context = f"## Student: {user.name} ({user.registration_number})\n(Could not load full academic data)"

    logger.info(f"=== COCO AGENT for {user.registration_number} ===")
    logger.info(f"User message: '{user_message}'")
    logger.info(f"Context size: {len(context)} chars | History: {len(history)} msgs")

    system_prompt = f"""You are Coco, a warm and encouraging AI Study Buddy for {user.name}, a VIT Bhopal student.
You have FULL access to their academic data below — attendance, grades, timetable, goals.
ALWAYS reference specific numbers and course names from the context when answering.
Keep answers concise and actionable. Today is {datetime.now().strftime("%A, %d %B %Y")}.

## Student Academic Context
{context}

IMPORTANT: If the user asks about attendance, grades, or schedule — answer specifically using the data above.
Do NOT say you don't have access to the data. The data IS in the context above."""

    contents: List[types.Content] = []
    for msg in history[-10:]:  # limit history to last 10 to avoid token limits
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=str(msg.get("content", "")))]))
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=TOOLS,
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(
                mode=types.FunctionCallingConfigMode.AUTO
            )
        ),
        temperature=0.7,
    )

    actions = []
    response = None
    MAX_ROUNDS = 5

    try:
        for round_num in range(MAX_ROUNDS):
            for attempt in range(MAX_RETRIES):
                try:
                    response = await asyncio.to_thread(
                        _client.models.generate_content,
                        model=MODEL,
                        contents=contents,
                        config=config,
                    )
                    break
                except Exception as e:
                    err_str = str(e)
                    if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < MAX_RETRIES - 1:
                        wait = BASE_RETRY_DELAY * (2 ** attempt)
                        logger.warning(f"Rate-limited, retrying in {wait}s...")
                        await asyncio.sleep(wait)
                        continue
                    raise

            if response is None:
                break

            candidate = response.candidates[0]
            fn_calls = [p for p in candidate.content.parts if hasattr(p, 'function_call') and p.function_call and p.function_call.name]

            if not fn_calls:
                break  # Final text answer

            contents.append(candidate.content)
            fn_response_parts = []
            for fc in fn_calls:
                fn_name = fc.function_call.name
                fn_args = dict(fc.function_call.args)
                logger.info(f"  FUNCTION_CALL: {fn_name}({fn_args})")
                fn_result = await execute_function(fn_name, fn_args, user)
                actions.append(fn_result)
                fn_response_parts.append(types.Part(
                    function_response=types.FunctionResponse(name=fn_name, response={"result": fn_result})
                ))
            contents.append(types.Content(role="user", parts=fn_response_parts))

    except Exception as e:
        logger.error(f"Gemini API error: {e}", exc_info=True)
        err_str = str(e)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            return {"reply": "⚠️ Coco is getting too many requests right now. Please try again in a minute!", "actions": []}
        if "API_KEY" in err_str or "401" in err_str:
            return {"reply": "❌ Invalid Gemini API key. Please update GEMINI_API_KEY in your .env file.", "actions": []}
        return {"reply": f"❌ Coco encountered an error: {str(e)[:200]}", "actions": []}

    # Extract reply text
    reply_text = ""
    try:
        if response:
            for p in response.candidates[0].content.parts:
                if hasattr(p, "text") and p.text:
                    reply_text += p.text
    except Exception as e:
        logger.error(f"Error extracting reply text: {e}")

    if not reply_text.strip():
        reply_text = "✅ Done! " + " | ".join(actions) if actions else "I processed your request but had no text to return."

    logger.info(f"=== COCO REPLY ({len(reply_text)} chars): {reply_text[:200]}")
    return {"reply": reply_text.strip(), "actions": actions}
