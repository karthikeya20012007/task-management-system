from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from config import Config
from flask import render_template, redirect, url_for, session

db = SQLAlchemy()
socketio = SocketIO()


def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    socketio.init_app(app)

    from app.models import User, Task

    from app.routes.auth import register_auth_routes
    from app.routes.task import register_task_routes
    from app.routes.analytics import register_analytics_routes
    register_auth_routes(app)
    register_task_routes(app)
    register_analytics_routes(app)

    @app.route("/")
    def home():
        user_id = session.get("user_id")
        if not user_id:
            return redirect(url_for("login_page"))

        user = User.query.get(user_id)
        if not user:
            session.clear()
            return redirect(url_for("login_page"))

        # Only show tasks belonging to this user
        tasks = Task.query.filter_by(user_id=user_id).order_by(Task.created_date.desc()).all()

        total_tasks = len(tasks)
        # Status stored as Title Case: "Completed", "Pending"
        completed_tasks = len([t for t in tasks if t.status == "Completed"])
        pending_tasks = len([t for t in tasks if t.status == "Pending"])
        completion_percentage = (
            round((completed_tasks / total_tasks) * 100, 1)
            if total_tasks > 0 else 0
        )

        analytics = {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_percentage": completion_percentage
        }

        return render_template(
            "index.html",
            tasks=tasks,
            analytics=analytics,
            current_user=user
        )

    return app