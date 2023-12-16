from flask import Blueprint, app, render_template
from flask_login import current_user

from .models import User

main = Blueprint("main", __name__)


@main.route("/")
def index():
    users = User.query.all()
    return render_template("index.html", users=users, current_user=current_user)
