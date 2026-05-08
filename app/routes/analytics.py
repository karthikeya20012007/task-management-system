from flask import jsonify
from app.models import Task
import pandas as pd
import numpy as np


def register_analytics_routes(app):

    @app.route("/analytics", methods=["GET"])
    def analytics():

        from flask import session

        user_id = session.get("user_id")

        tasks = Task.query.filter_by(user_id=user_id).all()
        task_data = []

        for task in tasks:
            task_data.append({
                "title": task.title,
                "status": task.status
            })

        df = pd.DataFrame(task_data)

        total_tasks = len(df)

        completed_tasks = len(
            df[df["status"] == "Completed"]
        ) if total_tasks > 0 else 0

        pending_tasks = len(
            df[df["status"] == "Pending"]
        ) if total_tasks > 0 else 0

        completion_percentage = np.round(
            (completed_tasks / total_tasks) * 100,
            2
        ) if total_tasks > 0 else 0

        return jsonify({
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_percentage": float(completion_percentage)
        })