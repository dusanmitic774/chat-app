from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask import session
from flask_login import login_user, logout_user

from app.database import db
from app.models import User
from flask import jsonify

auth = Blueprint("auth", __name__)


@auth.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("main.index"))


@auth.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        user = User.query.filter_by(username=username).first()

        if user:
            return jsonify(message="Username already exists"), 409

        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        flash("Signup successful!")

        return redirect(url_for("main.index"))

    return render_template("signup.html")


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify(message="Invalid login details"), 401

        login_user(user)
        session.permanent = True
        flash("Login successful!")

        return redirect(url_for("main.index"))

    return render_template("login.html")
