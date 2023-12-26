from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask import session
from flask_login import login_user, logout_user
from sqlalchemy import or_

from app.database import db
from app.models import User

auth = Blueprint("auth", __name__)


@auth.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("main.index"))


@auth.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")

        user = User.query.filter(
            or_(User.username == username, User.email == email)
        ).first()

        if user:
            flash("User already exists", "error")
            return redirect(url_for("auth.signup"))

        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        flash("Signup successful!")
        return redirect(url_for("main.index"))

    return render_template("signup.html")


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        login = request.form.get("login")  # Can be either username or email
        password = request.form.get("password")

        user = User.query.filter(
            or_(User.username == login, User.email == login)
        ).first()

        if not user or not user.check_password(password):
            flash("Invalid login details", "error")
            return redirect(url_for("auth.login"))

        login_user(user)
        session.permanent = True
        flash("Login successful!")

        return redirect(url_for("main.index"))

    return render_template("login.html")
