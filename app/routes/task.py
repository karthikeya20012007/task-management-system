from flask import request, jsonify, session
from app.models import Task
from app import db, socketio


def register_task_routes(app):

    def get_current_user_id():
        return session.get("user_id")

    @app.route("/tasks", methods=["POST"])
    def create_task():
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"message": "Title is required"}), 400

        # Normalize casing for priority/status
        priority_raw = (data.get("priority") or "Medium").strip()
        priority = priority_raw.capitalize()  # "High", "Medium", "Low"
        status = "Pending"

        new_task = Task(
            title=title,
            description=(data.get("description") or "").strip(),
            priority=priority,
            status=status,
            user_id=user_id
        )
        db.session.add(new_task)
        db.session.commit()

        socketio.emit("new_task", {
            "message": f'"{title}" was added',
            "task_id": new_task.id
        })

        return jsonify({
            "message": "Task created successfully",
            "task": {
                "id": new_task.id,
                "title": new_task.title,
                "priority": new_task.priority,
                "status": new_task.status
            }
        }), 201

    @app.route("/tasks", methods=["GET"])
    def get_tasks():
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        tasks = Task.query.filter_by(user_id=user_id).order_by(Task.created_date.desc()).all()
        task_list = [{
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "created_date": str(t.created_date),
            "user_id": t.user_id
        } for t in tasks]
        return jsonify(task_list), 200

    @app.route("/tasks/<int:id>", methods=["PUT"])
    def update_task(id):
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        task = Task.query.filter_by(id=id, user_id=user_id).first()
        if not task:
            return jsonify({"message": "Task not found"}), 404

        data = request.get_json() or {}
        if "title" in data:
            task.title = (data["title"] or "").strip() or task.title
        if "description" in data:
            task.description = (data["description"] or "").strip()
        if "priority" in data:
            task.priority = (data["priority"] or task.priority).capitalize()
        if "status" in data:
            raw = (data["status"] or task.status).strip()
            # Accept "completed"/"Completed" → store "Completed"
            task.status = raw.capitalize()

        db.session.commit()

        socketio.emit("task_updated", {
            "message": f'"{task.title}" was updated',
            "task_id": task.id,
            "status": task.status
        })

        return jsonify({"message": "Task updated successfully"}), 200

    @app.route("/tasks/<int:id>", methods=["DELETE"])
    def delete_task(id):
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401

        task = Task.query.filter_by(id=id, user_id=user_id).first()
        if not task:
            return jsonify({"message": "Task not found"}), 404

        title = task.title
        db.session.delete(task)
        db.session.commit()

        socketio.emit("task_deleted", {
            "message": f'"{title}" was deleted',
            "task_id": id
        })

        return jsonify({"message": "Task deleted successfully"}), 200