from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import or_

from app.database import db
from app.extensions import socketio
from app.logs import app_logger
from app.models import Friendship, User

friendship_blueprint = Blueprint("friendship", __name__)


@friendship_blueprint.route("/send-friend-request", methods=["POST"])
@login_required
def send_friend_request():
    json_data = request.json
    if not json_data:
        return jsonify({"error": True, "message": "Invalid JSON data"}), 400

    identifier = json_data.get("identifier")

    receiver = User.query.filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not receiver:
        app_logger.info(f"User {identifier} not found.")
        return (
            jsonify({"error": True, "message": f"User '{identifier}' not found."}),
            404,
        )

    if receiver == current_user:
        app_logger.info("Sending messege to self")
        return (
            jsonify(
                {"error": True, "message": "Cannot send friend request to oneself"}
            ),
            400,
        )

    existing_request = Friendship.query.filter_by(
        requester_id=current_user.id, receiver_id=receiver.id
    ).first()

    if existing_request:
        app_logger.info("Already friends")
        return jsonify({"error": True, "message": "Friend request already sent"}), 400

    friend_request = Friendship(
        requester_id=current_user.id, receiver_id=receiver.id, status="pending"
    )
    app_logger.info(f"Friend request: {friend_request}")
    db.session.add(friend_request)
    db.session.commit()

    socketio.emit(
        "new_friend_request",
        {
            "requester_id": current_user.id,
            "requester_username": current_user.username,
            "friend_request_id": friend_request.id
        },
        room=str(receiver.id),
        namespace="/chat",
    )

    app_logger.info("After the emit")
    app_logger.info(f"Receiver id: {receiver.id}")
    return jsonify({"error": False, "message": "Friend request sent successfully"}), 200


@friendship_blueprint.route("/accept-friend-request/<int:request_id>", methods=["POST"])
@login_required
def accept_friend_request(request_id):
    friend_request = Friendship.query.get(request_id)
    if not friend_request or friend_request.receiver_id != current_user.id:
        return jsonify({"error": "Invalid request"}), 400

    friend_request.status = "accepted"
    db.session.commit()

    socketio.emit(
        "friend_request_accepted",
        {"receiver_id": current_user.id, "receiver_username": current_user.username},
        room=str(friend_request.requester_id),
        namespace="/chat"
    )

    return jsonify({"error": False, "message": "Friend request accepted"}), 200


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

    return jsonify({"error": False, "message": "Friend request declined"}), 200


@friendship_blueprint.route("/remove-friend/<int:friend_id>", methods=["POST"])
@login_required
def remove_friend(friend_id):
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
        return jsonify({"error": True, "message": "Friendship not found"}), 404

    db.session.delete(friendship)
    db.session.commit()

    return jsonify({"error": False, "message": "Friend removed"}), 200
