from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from werkzeug.security import generate_password_hash

from app.database import db
from app.models import User

profile_blueprint = Blueprint("profile", __name__)


@profile_blueprint.route("/update-profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.json
    user = User.query.get(current_user.id)

    if not data:
        return jsonify({"message": "You have sent invalid details"})

    if "username" in data and data["username"] != user.username:
        user.username = data["username"]

    if "email" in data and data["email"] != user.email:
        user.email = data["email"]

    if "password" in data and data["password"]:
        user.password_hash = generate_password_hash(data["password"])

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"})
