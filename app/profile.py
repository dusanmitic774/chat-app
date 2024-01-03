import os

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

from app.database import db
from app.models import User

profile_blueprint = Blueprint("profile", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}


@profile_blueprint.route("/update-profile", methods=["POST"])
@login_required
def update_profile():
    # Process the text fields
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("password")

    user = User.query.get(current_user.id)

    if username and username != user.username:
        user.username = username

    if email and email != user.email:
        user.email = email

    if password:
        user.password_hash = generate_password_hash(password)

    # Process the file upload
    if "profilePicture" in request.files:
        file = request.files["profilePicture"]
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join("static/uploads", filename)
            file.save(file_path)
            user.profile_picture = file_path

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"})


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
