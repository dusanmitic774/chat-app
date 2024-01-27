import re

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask import session
from flask_login import login_user, logout_user
from sqlalchemy import or_

from app.database import db
from app.models import User

auth = Blueprint("auth", __name__)


def is_password_strong(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search("[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search("[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search("[0-9]", password):
        return False, "Password must contain at least one number."
    if not re.search('[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character."
    return True, "Password is strong."


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

        is_strong, message = is_password_strong(password)
        if not is_strong:
            flash(message, "error")
            return redirect(url_for("auth.signup", show="signup"))

        user = User.query.filter(
            or_(User.username == username, User.email == email)
        ).first()

        if user:
            flash("User already exists", "error")
            return redirect(url_for("auth.signup", show="signup"))

        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for("chat.chat"))

    return render_template("auth.html")


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

        return redirect(url_for("chat.chat"))

    return render_template("auth.html")
