from flask import request, jsonify, render_template, redirect, url_for, flash, session
from app.models import User
from app import db


def register_auth_routes(app):

    @app.route("/login", methods=["GET"])
    def login_page():
        if session.get("user_id"):
            return redirect(url_for("home"))
        return render_template("login.html")

    @app.route("/login", methods=["POST"])
    def login():
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        user = User.query.filter_by(email=email).first()
        if not user or user.password != password:
            flash("Invalid email or password.", "error")
            return redirect(url_for("login_page"))

        session["user_id"] = user.id
        session["username"] = user.username
        return redirect(url_for("home"))

    @app.route("/register", methods=["GET"])
    def register_page():
        if session.get("user_id"):
            return redirect(url_for("home"))
        return render_template("register.html")

    @app.route("/register", methods=["POST"])
    def register():
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        if not username or not email or not password:
            flash("All fields are required.", "error")
            return redirect(url_for("register_page"))

        if len(password) < 6:
            flash("Password must be at least 6 characters.", "error")
            return redirect(url_for("register_page"))

        existing = User.query.filter_by(email=email).first()
        if existing:
            flash("An account with this email already exists.", "error")
            return redirect(url_for("register_page"))

        new_user = User(username=username, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        session["user_id"] = new_user.id
        session["username"] = new_user.username
        flash("Account created! Welcome to TaskFlow.", "success")
        return redirect(url_for("home"))

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login_page"))

    # JSON API endpoints for programmatic access
    @app.route("/api/login", methods=["POST"])
    def api_login():
        data = request.get_json() or {}
        email = data.get("email", "")
        password = data.get("password", "")
        user = User.query.filter_by(email=email).first()
        if not user or user.password != password:
            return jsonify({"message": "Invalid credentials"}), 401
        session["user_id"] = user.id
        session["username"] = user.username
        return jsonify({"message": "Login successful", "user": {"id": user.id, "username": user.username}}), 200

    @app.route("/api/register", methods=["POST"])
    def api_register():
        data = request.get_json() or {}
        username = data.get("username", "")
        email = data.get("email", "")
        password = data.get("password", "")
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "User already exists"}), 400
        new_user = User(username=username, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User registered successfully"}), 201