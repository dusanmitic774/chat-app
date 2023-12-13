from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import login_user, logout_user

from .database import db
from .models import User

auth = Blueprint("auth", __name__)


@auth.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("auth.login"))


@auth.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()

        if user:
            flash("Username already exists")
            return redirect(url_for("auth.signup"))

        new_user = User(username=username)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for("auth.login"))

    return render_template("signup.html")


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            flash("Please check your login details and try again.")
            return redirect(url_for("auth.login"))

        login_user(user)

        return redirect(url_for("auth.login"))

    return render_template("login.html")
