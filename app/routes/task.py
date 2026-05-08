from flask import request, jsonify, session
from app.models import Task
from app import db, socketio


def register_task_routes(app):

    def get_current_user_id():
        return session.get("user_id")

    # ─────────────────────────────────────────────
    # CREATE TASK
    # ─────────────────────────────────────────────
    @app.route("/tasks", methods=["POST"])
    def create_task():

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        data = request.get_json() or {}

        title = (data.get("title") or "").strip()

        if not title:
            return jsonify({"message": "Title is required"}), 400

        priority_raw = (data.get("priority") or "Medium").strip()
        priority = priority_raw.capitalize()

        new_task = Task(
            title=title,
            description=(data.get("description") or "").strip(),
            priority=priority,
            status="Pending",
            user_id=user_id
        )

        db.session.add(new_task)
        db.session.commit()

        task_data = {
            "id": new_task.id,
            "title": new_task.title,
            "description": new_task.description,
            "priority": new_task.priority,
            "status": new_task.status,
            "created_date": str(new_task.created_date),
            "user_id": new_task.user_id
        }

        # Real-time event
        socketio.emit("new_task", task_data)

        return jsonify(task_data), 201

    # ─────────────────────────────────────────────
    # GET TASKS
    # ─────────────────────────────────────────────
    @app.route("/tasks", methods=["GET"])
    def get_tasks():

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        tasks = (
            Task.query
            .filter_by(user_id=user_id)
            .order_by(Task.created_date.desc())
            .all()
        )

        task_list = []

        for task in tasks:
            task_list.append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "status": task.status,
                "created_date": str(task.created_date),
                "user_id": task.user_id
            })

        return jsonify(task_list), 200

    # ─────────────────────────────────────────────
    # UPDATE TASK
    # ─────────────────────────────────────────────
    @app.route("/tasks/<int:id>", methods=["PUT"])
    def update_task(id):

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        task = Task.query.filter_by(
            id=id,
            user_id=user_id
        ).first()

        if not task:
            return jsonify({"message": "Task not found"}), 404

        data = request.get_json() or {}

        if "title" in data:
            task.title = (
                (data["title"] or "").strip()
                or task.title
            )

        if "description" in data:
            task.description = (
                data["description"] or ""
            ).strip()

        if "priority" in data:
            task.priority = (
                data["priority"] or task.priority
            ).capitalize()

        if "status" in data:
            task.status = (
                data["status"] or task.status
            ).capitalize()

        db.session.commit()

        task_data = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "priority": task.priority,
            "status": task.status,
            "created_date": str(task.created_date),
            "user_id": task.user_id
        }

        socketio.emit("task_updated", task_data)

        return jsonify(task_data), 200

    # ─────────────────────────────────────────────
    # DELETE TASK
    # ─────────────────────────────────────────────
    @app.route("/tasks/<int:id>", methods=["DELETE"])
    def delete_task(id):

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        task = Task.query.filter_by(
            id=id,
            user_id=user_id
        ).first()

        if not task:
            return jsonify({"message": "Task not found"}), 404

        deleted_task_data = {
            "id": task.id,
            "title": task.title
        }

        db.session.delete(task)
        db.session.commit()

        socketio.emit("task_deleted", deleted_task_data)

        return jsonify({
            "message": "Task deleted successfully",
            "task": deleted_task_data
        }), 200