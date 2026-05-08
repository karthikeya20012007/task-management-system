# Smart Task Management System

A modern full-stack Task Management System built using Flask, PostgreSQL, Socket.IO, and Bootstrap.

This project supports:
- User Authentication
- Task CRUD Operations
- Real-Time Task Updates
- Analytics Dashboard
- Responsive SaaS-style UI

---

# Features

## Authentication
- User Registration
- User Login
- User Logout
- Session-based Authentication

## Task Management
- Create Tasks
- View Tasks
- Update Tasks
- Delete Tasks
- Mark Tasks as Completed

## Real-Time Features
- WebSocket Integration using Flask-SocketIO
- Live Task Notifications
- Real-Time Dashboard Updates

## Analytics
- Total Tasks
- Completed Tasks
- Pending Tasks
- Completion Percentage

## Frontend
- Responsive UI
- Modern Dashboard Design
- Bootstrap 5
- Toast Notifications
- Modal-based Actions
- Mobile Friendly

---

# Tech Stack

## Backend
- Flask
- Flask-SQLAlchemy
- Flask-SocketIO
- PostgreSQL

## Frontend
- HTML
- CSS
- Bootstrap 5
- JavaScript
- Socket.IO

## Data Analysis
- Pandas
- NumPy

---

# Project Structure

```bash
task-management-system/
│
├── app/
│   ├── routes/
│   ├── static/
│   │   ├── style.css
│   │   └── app.js
│   │
│   ├── templates/
│   │   ├── index.html
│   │   ├── login.html
│   │   └── register.html
│   │
│   ├── models.py
│   └── __init__.py
│
├── venv/
├── .env
├── requirements.txt
├── run.py
└── README.md
```

---

# Installation

## 1. Clone Repository

```bash
git clone https://github.com/karthikeya20012007/task-management-system.git
```

## 2. Navigate Into Project

```bash
cd task-management-system
```

## 3. Create Virtual Environment

```bash
python -m venv venv
```

## 4. Activate Virtual Environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / Mac

```bash
source venv/bin/activate
```

---

# Install Dependencies

```bash
pip install -r requirements.txt
```

---

# PostgreSQL Setup

Create a PostgreSQL database named:

```text
task_manager
```

---

# Environment Variables

Create a `.env` file in the root directory.

Example:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost/task_manager
SECRET_KEY=your_secret_key
```

---

# Run Project

```bash
python run.py
```

Application will start at:

```text
http://127.0.0.1:5000
```

---

# API Endpoints

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | /register | Register User |
| POST | /login | Login User |
| GET | /logout | Logout User |

---

## Tasks

| Method | Endpoint | Description |
|---|---|---|
| GET | /tasks | Get All Tasks |
| POST | /tasks | Create Task |
| PUT | /tasks/<id> | Update Task |
| DELETE | /tasks/<id> | Delete Task |

---

## Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | /analytics | Task Analytics |

---

# WebSocket Event

| Event |
|---|
| new_task |

---

# Screenshots

Add project screenshots here.

---

# Future Improvements

- JWT Authentication
- Task Categories
- Due Dates
- Drag and Drop Kanban Board
- Email Notifications
- Deployment on AWS

---

# Author

Karthikeya

---

# License

This project is for educational and internship assignment purposes.