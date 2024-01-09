from datetime import timezone

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


@socketio.on("typing", namespace="/chat")
def on_typing(data):
    emit("user_typing", data, room=str(data["recipient_id"]))


def fetch_sorted_friends(current_user_id):
    # Subquery to get the last message's timestamp
    last_messages_subquery = (
        db.session.query(
            Message.sender_id.label("sender_id"),
            Message.recipient_id.label("recipient_id"),
            db.func.max(Message.timestamp).label("max_timestamp"),
        )
        .filter(Message.sender_id == current_user_id)
        .group_by(Message.sender_id, Message.recipient_id)
        .subquery()
    )

    # Main query to fetch friends
    friends_query = (
        User.query.join(
            Friendship,
            or_(Friendship.receiver_id == User.id, Friendship.requester_id == User.id),
        )
        .outerjoin(
            last_messages_subquery,
            or_(
                last_messages_subquery.c.recipient_id == User.id,
                last_messages_subquery.c.sender_id == User.id,
            ),
        )
        .filter(
            User.id != current_user_id,
            or_(
                Friendship.receiver_id == current_user_id,
                Friendship.requester_id == current_user_id,
            ),
            Friendship.status == "accepted",
        )
        .order_by(last_messages_subquery.c.max_timestamp.desc(), User.username)
        .all()
    )

    return [
        {
            "id": friend.id,
            "username": friend.username,
            "profile_picture": friend.profile_picture or "default_profile_pic.png",
        }
        for friend in friends_query
    ]


@chat_bp.route("/chat")
def chat():
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login"))

    friends_data = fetch_sorted_friends(current_user.id)

    return render_template("chat.html", user=current_user, friends=friends_data)


@chat_bp.route("/get-latest-friends")
def get_latest_friends():
    if not current_user.is_authenticated:
        return jsonify({"error": "Unauthorized"}), 401

    friends_data = fetch_sorted_friends(current_user.id)

    return jsonify(friends=friends_data)


@socketio.on("send_message", namespace="/chat")
def handle_send_message_event(data):
    if current_user.is_authenticated and str(current_user.id) == str(data["sender_id"]):
        app_logger.info("I have gotten the request to send a messege")
        if data["sender_id"] == data["recipient_id"]:
            app_logger.info("Cannot send messages to oneself.")
            return False

        # Check if sender and recipient are friends
        friendship = Friendship.query.filter(
            and_(
                Friendship.status == "accepted",
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
            )
        ).first()

        if not friendship:
            app_logger.info("The users are not friends, cannot send message.")
            return False

        try:
            new_message = Message(
                sender_id=data["sender_id"],
                recipient_id=data["recipient_id"],
                content=data["message"],
            )
            db.session.add(new_message)
            db.session.commit()

            sender = User.query.get(data["sender_id"])
            if sender:
                data["sender_username"] = sender.username
            else:
                app_logger.error("Sender not found")
                return False

            data["timestamp"] = new_message.timestamp.replace(
                tzinfo=timezone.utc
            ).isoformat()
            data["sender_profile_picture"] = (
                sender.profile_picture or "default_profile_pic.png"
            )

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
            "sender_username": msg.sender.username,
            "sender_profile_picture": msg.sender.profile_picture
            if msg.sender.profile_picture
            else "default_profile_pic.png",
            "recipient_id": msg.recipient_id,
            "content": msg.content,
            "timestamp": msg.timestamp.replace(tzinfo=timezone.utc).isoformat(),
        }
        for msg in messages
    ]

    return jsonify({"messages": messages_data})
