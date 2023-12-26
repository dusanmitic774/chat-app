from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import or_

from app.database import db
from app.logs import app_logger
from app.models import Friendship, User

friendship_blueprint = Blueprint("friendship", __name__)


@friendship_blueprint.route("/send-friend-request", methods=["POST"])
@login_required
def send_friend_request():
    json_data = request.json
    if not json_data:
        return jsonify({"error": "Invalid JSON data"}), 400

    identifier = json_data.get("identifier")

    receiver = User.query.filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not receiver:
        app_logger.info(f"User {identifier} not found.")
        return jsonify({"error": "User not found"}), 404

    if receiver == current_user:
        return jsonify({"error": "Cannot send friend request to oneself"}), 400

    existing_request = Friendship.query.filter_by(
        requester_id=current_user.id, receiver_id=receiver.id
    ).first()

    if existing_request:
        return jsonify({"error": "Friend request already sent"}), 400

    friend_request = Friendship(
        requester_id=current_user.id, receiver_id=receiver.id, status="pending"
    )
    db.session.add(friend_request)
    db.session.commit()

    return jsonify({"message": "Friend request sent"}), 200


@friendship_blueprint.route("/accept-friend-request/<int:request_id>", methods=["POST"])
@login_required
def accept_friend_request(request_id):
    friend_request = Friendship.query.get(request_id)
    if not friend_request or friend_request.receiver_id != current_user.id:
        return jsonify({"error": "Invalid request"}), 400

    friend_request.status = "accepted"
    db.session.commit()

    return jsonify({"message": "Friend request accepted"}), 200


@friendship_blueprint.route(
    "/decline-friend-request/<int:request_id>", methods=["POST"]
)
@login_required
def decline_friend_request(request_id):
    friend_request = Friendship.query.get(request_id)
    if not friend_request or friend_request.receiver_id != current_user.id:
        return jsonify({"error": "Invalid request"}), 400

    db.session.delete(friend_request)
    db.session.commit()

    return jsonify({"message": "Friend request declined"}), 200


@friendship_blueprint.route("/remove-friend/<int:friend_id>", methods=["POST"])
@login_required
def remove_friend(friend_id):
    app_logger.info(f"Removing friend with id: {friend_id}")

    # Fetch the friendship where either the current user is the requester or receiver
    friendship = Friendship.query.filter(
        or_(
            (Friendship.requester_id == current_user.id)
            & (Friendship.receiver_id == friend_id),
            (Friendship.requester_id == friend_id)
            & (Friendship.receiver_id == current_user.id),
        ),
        Friendship.status == "accepted",
    ).first()

    if not friendship:
        app_logger.info("Friendship not found or already removed")
        return jsonify({"error": "Friendship not found"}), 404

    db.session.delete(friendship)
    db.session.commit()

    app_logger.info("Friend successfully removed")
    return jsonify({"message": "Friend removed"}), 200
