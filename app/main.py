from flask import Blueprint, redirect, render_template, url_for
from flask_login import current_user

main = Blueprint("main", __name__)


@main.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("chat.chat"))
    return render_template("auth.html")
