from flask import Blueprint, jsonify, redirect, render_template, request, url_for
from flask_login import current_user
from flask_socketio import emit, join_room
from sqlalchemy import and_, or_

from app import socketio
from app.database import db
from app.logs import app_logger
from app.models import Friendship, Message, User

chat_bp = Blueprint("chat", __name__)


@socketio.on("connect", namespace="/chat")
def on_connect():
    if current_user.is_authenticated:
        join_room(str(current_user.id))


@chat_bp.route("/chat")
def chat():
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login"))

    friends = (
        User.query.join(
            Friendship,
            or_(Friendship.receiver_id == User.id, Friendship.requester_id == User.id),
        )
        .filter(
            User.id != current_user.id,
            or_(
                Friendship.receiver_id == current_user.id,
                Friendship.requester_id == current_user.id,
            ),
            Friendship.status == "accepted",
        )
        .all()
    )

    return render_template("chat.html", user=current_user, friends=friends)


@socketio.on("send_message", namespace="/chat")
def handle_send_message_event(data):
    if current_user.is_authenticated and str(current_user.id) == str(data["sender_id"]):
        app_logger.info("I have gotten the request to send a messege")
        if data["sender_id"] == data["recipient_id"]:
            app_logger.info("Cannot send messages to oneself.")
            return False

        # Check if sender and recipient are friends
        try:
            friendship = Friendship.query.filter(
                and_(
                    or_(
                        and_(
                            Friendship.requester_id == data["sender_id"],
                            Friendship.receiver_id == data["recipient_id"],
                        ),
                        and_(
                            Friendship.requester_id == data["recipient_id"],
                            Friendship.receiver_id == data["sender_id"],
                        ),
                    ),
                    Friendship.status == "accepted",
                )
            ).first()
        except Exception as e:
            app_logger.info(f"Error querying Friendship: {e}")
            return False

        try:
            new_message = Message(
                sender_id=data["sender_id"],
                recipient_id=data["recipient_id"],
                content=data["message"],
            )
            db.session.add(new_message)
            db.session.commit()

            app_logger.info(
                f"{data['sender_id']} has sent a message to {data['recipient_id']}: {data['message']}"
            )
            emit("receive_message", data, room=str(data["recipient_id"]))
            return True
        except Exception as e:
            app_logger.error(f"Error saving message: {e}")
            return False

    app_logger.info("Unauthorized message sending!")
    return False


@chat_bp.route("/get-messages")
def get_messages():
    recipient_id = request.args.get("recipient_id")
    if not current_user.is_authenticated or not recipient_id:
        return jsonify({"error": "Unauthorized"}), 401

    messages = (
        Message.query.filter(
            (
                (Message.sender_id == current_user.id)
                & (Message.recipient_id == recipient_id)
            )
            | (
                (Message.sender_id == recipient_id)
                & (Message.recipient_id == current_user.id)
            )
        )
        .order_by(Message.timestamp)
        .all()
    )

    messages_data = [
        {
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
        }
        for msg in messages
    ]

    return jsonify({"messages": messages_data})
