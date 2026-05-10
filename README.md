# 🎓 VITamin: A Personalized EdTech Companion
### An Integrated Academic & Campus Life Platform for VIT Students

---

## Overview

VITamin is a purpose-built mobile/web platform designed exclusively for students of Vellore Institute of Technology (VIT). It bridges the gap between institutional systems like VTOP and day-to-day student productivity by providing intelligent automation, personalized scheduling, peer matching, and campus engagement — all in one unified companion app.

Unlike generic tools like Google Calendar or Notion, VITamin understands VIT's specific ecosystem: attendance policies, VTOP's data structure, slot-based timetables, and campus culture. It is built as an **EPICS (Engineering Projects in Community Service)** project with direct, measurable community impact.

---

## Features

- **🔗 VTOP Integration**: Automated timetable and attendance sync via web scraping (BeautifulSoup + Selenium) — no manual data entry
- **📅 Smart Daily Planner**: Graph-coloring-based conflict-free schedule generation with task prioritization using greedy heuristics
- **🎯 Goal Tracking**: Create, track, and visualize academic and personal goals (DSA prep, fitness, courses) with gamification and reminders
- **📣 Campus Event Hub**: Aggregated events from VIT clubs, official pages, and social media — with RSVP tracking and personalized recommendations
- **🤝 ML-Driven People Matching**: AI-powered peer matching using Gemini API to connect students with shared academic goals and interests
- **💬 Real-Time Chat**: WebSocket-based one-on-one and group messaging for study collaboration
- **🔔 Smart Notifications**: Attendance alerts, class reminders, goal nudges, and event updates
- **📴 Offline-First**: SQLite-based local storage with background sync — works in low-connectivity campus areas

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native, Redux Toolkit, NativeWind (Tailwind) |
| Web Frontend | React, PWA |
| API Gateway | FastAPI (Python) |
| Auth Service | Python, FastAPI, JWT, SQLAlchemy |
| VTOP Scraper | Python, BeautifulSoup, Selenium |
| Scheduler | Python, C++ (Greedy + Graph Coloring) |
| Goal Tracker | Python, Django 4.2, Django REST Framework |
| Event Service | Python, Django, Celery |
| ML Matching | Python, FastAPI, Gemini API |
| Chat Service | Python, FastAPI, WebSockets |
| Notification Service | Python, FastAPI, FCM |
| Database (Primary) | MongoDB Atlas, PostgreSQL |
| Cache | Redis |
| Offline Storage | SQLite (react-native-sqlite-storage) |
| Deployment | Docker, AWS EC2 / GCP Cloud Run |

---

## Project Structure

```
VITAMIN/
│
├── vitamin-app-frontend/        # React Native mobile app + React web app
│   ├── src/
│   │   ├── screens/             # Dashboard, Planner, Goals, Events, Chat, Profile
│   │   ├── components/          # Reusable UI components
│   │   ├── navigation/          # React Navigation stack + tab navigators
│   │   ├── store/               # Redux Toolkit state management
│   │   └── services/            # API client, WebSocket, SQLite handlers
│   └── package.json
│
├── vitamin-backend/             # Python microservices backend
│   ├── auth/
│   │   ├── auth.py              # Registration, login, JWT token generation
│   │   ├── models.py            # User schema (SQLAlchemy)
│   │   └── schemas.py           # Pydantic validation schemas
│   ├── vtop/
│   │   ├── vtop_scraper.py      # Timetable + attendance HTML scraper
│   │   └── schedules.py         # Timetable sync + storage
│   ├── scheduler/
│   │   └── scheduler.py         # Greedy graph-coloring schedule generator (C++)
│   ├── goals/
│   │   └── goals.py             # Goal CRUD, progress tracking, reminders
│   ├── events/
│   │   └── events.py            # Event aggregation, RSVP, categorization
│   ├── ml_matching/
│   │   └── matching.py          # Gemini API-based peer matching + suggestions
│   ├── chat/
│   │   └── chat.py              # WebSocket chat, message history (MongoDB)
│   ├── notifications/
│   │   └── notifications.py     # FCM push + in-app notification triggers
│   ├── database.py              # MongoDB + PostgreSQL connection setup
│   ├── models.py                # SQLAlchemy ORM models
│   ├── schemas.py               # Global Pydantic schemas
│   └── main.py                  # FastAPI app entry point + router registration
│
├── vtop_parsed_data.json        # Sample parsed VTOP data for development/testing
├── timetable_response.html      # Raw VTOP HTML responses (for scraper testing)
├── attendance_response.html
├── choose_attendance.html
├── choose_attendance_response.html
├── choose_attendance_semester.html
├── choose_timetable_response.html
├── grade_history_response.html
├── debug_tt_dump.html
├── .gitignore
└── README.md
```

---

## System Architecture

```
Client Layer (React Native / React Web / PWA)
              ↓
  API Gateway — FastAPI (Auth, Rate Limiting, Routing)
              ↓
 ┌────────────────────────────────────────────┐
 │         Application Layer (Microservices)  │
 │                                            │
 │  Auth      VTOP      Scheduler   Events   │
 │  Service   Scraper   (C++/Py)    Service  │
 │                                            │
 │  Goal      ML        Chat        Notify   │
 │  Tracker   Matching  Service     Service  │
 └────────────────────────────────────────────┘
              ↓
     RabbitMQ / AWS SQS (Message Queue)
              ↓
 ┌──────────────────────────────┐
 │         Data Layer           │
 │  MongoDB  │ PostgreSQL │ Redis│
 └──────────────────────────────┘
              ↓
   Docker + Kubernetes (AWS/GCP)
```

---

## API Routes

| Route Pattern | Target Service | Description |
|---|---|---|
| `/api/auth/*` | Auth Service | Login, signup, JWT token refresh |
| `/api/vtop/*` | VTOP Service | Timetable fetch, attendance sync |
| `/api/schedule/*` | Scheduler Service | Daily schedule generation & optimization |
| `/api/events/*` | Event Service | Campus events, RSVP, filtering |
| `/api/goals/*` | Goal Service | Goal tracking and progress updates |
| `/api/ai/*` | ML Service | Peer matching, AI suggestions, chat |
| `/api/chat/*` | Chat Service | Messaging, chat history |
| `/api/notify/*` | Notification Service | Push notification management |

---

## How It Works

```
User opens app
      ↓
Check local JWT token
      ↓
  Valid? → Fetch user profile → Show dashboard
      ↓
  Invalid? → Login screen (VTOP credentials)
      ↓
Auth Service → Generate JWT → Store locally (SQLite + server)
      ↓
VTOP Scraper → Parse timetable HTML → Cache in Redis (24hr TTL) + PostgreSQL
      ↓
Scheduler Service → Graph coloring + greedy heuristics → Generate today's plan
      ↓
ML Matching Service (background) → Gemini API → Find study buddies
      ↓
Notification Service → 10-min reminder before next class
```

---

## Database Schema

| Collection | Key Fields |
|---|---|
| `users` | registration_number, email, password (hashed), attendance, current_semester |
| `schedules` | id, owner_id, time, title, loc, type, status, semester |
| `goals` | id, owner_id, title, description, deadline, progress |
| `chat_messages` | id, sender_id, receiver_id, message, timestamp |
| `notifications` | id, user_id, message, type, timestamp |

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (or local MongoDB)
- PostgreSQL
- Redis (local or cloud)
- Expo CLI (for React Native)

---

### 1. Clone the repository

```bash
git clone https://github.com/Parth-bot-crypto26/VITAMIN.git
cd VITAMIN
```

---

### 2. Backend Setup

```bash
cd vitamin-backend
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate.bat       # Windows

pip install -r requirements.txt
```

Create a `.env` file in `vitamin-backend/`:

```env
MONGO_URI=your_mongodb_atlas_uri
POSTGRES_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=redis://localhost:6379
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

API docs will be available at `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd vitamin-app-frontend
npm install
```

Configure the API base URL in `src/services/api.js`:

```js
export const BASE_URL = "http://localhost:8000/api";
```

Start the app:

```bash
npx expo start
```

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go for physical device

---

## Development Timeline

| Phase | Duration | Key Deliverables |
|---|---|---|
| Phase 1: Foundation | Months 1–3 | VTOP scraping, auth, timetable display, offline mode |
| Phase 2: Core Features | Months 4–6 | Goal tracking, event hub, push notifications, web app |
| Phase 3: Intelligence | Months 7–9 | ML matching, real-time chat, advanced scheduling, analytics |
| Phase 4: Scale & Polish | Months 10–12 | User testing (100+ students), production deployment, optimization |

---

## Team

| Name | Reg. No. | Role |
|---|---|---|
| Anshika Debroy | 23BMR10019 | Testing & Progress Report Lead |
| Parth Deshpande | 23BAI10120 | Frontend Developer |
| Ansh Lachhwani | 23BET10008 | Backend Developer |
| Vatsal Jain | 23BET10016 | ML & Recommendation System Developer |
| Vaibhavi Singh | 23BCE10875 | Database & System Architect |
| Aalya Bagga | 23BCE11647 | Project Manager & Integration Lead |

---

## Research Foundation

VITamin is academically grounded in the following works:

- **Graph Coloring for Scheduling** — Ramasamy et al. (2019), IJRTE
- **Collaborative Filtering** — Resnick et al., GroupLens (1994)
- **K-Means Clustering** — MacQueen (1967)
- **Social Learning Theory** — Bandura (1977)
- **Zone of Proximal Development** — Vygotsky (1978)
- **ERP Systems in Education** — Al-Mashari (2003)
- **Student Wellbeing & Academic Performance** — El Ansari & Stock (2010)

---

## Acknowledgements

Built as Team EPICS23-010 under the **Engineering Projects in Community Service (EPICS)** program at **VIT Bhopal University**, Bhopal, Madhya Pradesh — March 2026.

Special thanks to the VIT student community whose feedback shaped every feature of this platform.

---

*VITamin — Built by students, for students.*
