from flask import Blueprint, render_template

friends_bp = Blueprint("friends", __name__)


@friends_bp.route("/friends")
def friends():
    # Display friend requests and friends list
    return render_template("friends.html")
