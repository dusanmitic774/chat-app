import os
import time

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

from app.auth import is_password_strong
from app.database import db
from app.models import User

profile_blueprint = Blueprint("profile", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}


@profile_blueprint.route("/update-profile", methods=["POST"])
@login_required
def update_profile():
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("password")

    user = User.query.get(current_user.id)

    if username and username != user.username:
        user.username = username

    if email and email != user.email:
        user.email = email

    if password:
        is_strong, message = is_password_strong(password)
        if not is_strong:
            return jsonify({"error": message}), 400
        user.password_hash = generate_password_hash(password)

    if "profilePicture" in request.files:
        file = request.files["profilePicture"]
        if file and allowed_file(file.filename) and file.filename:
            filename = secure_filename(
                f"user_{current_user.id}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}"
            )
            file_path = os.path.join("static/uploads", filename)

            file.save(file_path)

            if current_user.profile_picture:
                old_file_path = os.path.join(
                    "static/uploads", current_user.profile_picture
                )
                if os.path.isfile(old_file_path):
                    os.remove(old_file_path)

            user.profile_picture = filename

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"})


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
