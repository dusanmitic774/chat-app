from datetime import timezone

from flask import (
    Blueprint,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
    current_app,
)
from flask_login import current_user
from flask_socketio import emit, join_room
from sqlalchemy import case, and_, or_

from app import socketio
from app.database import db
from app.logs import app_logger
from app.models import Friendship, Message, User

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/get-friend-statuses")
def get_friend_statuses():
    if not current_user.is_authenticated:
        return jsonify({"error": "Unauthorized"}), 401

    friends_ids = get_friends_ids(current_user.id)
    pipeline = current_app.redis.pipeline()
    for friend_id in friends_ids:
        pipeline.get(f"user_online_{friend_id}")
    statuses = pipeline.execute()
    friends_status = {
        friend_id: status == "online"
        for friend_id, status in zip(friends_ids, statuses)
    }

    return jsonify(friends_status=friends_status)


@socketio.on("connect", namespace="/chat")
def on_connect():
    if current_user.is_authenticated:
        current_app.redis.set(f"user_online_{current_user.id}", "online", ex=600)
        update_friends_about_status(current_user.id, True)
        join_room(str(current_user.id))


@socketio.on("disconnect", namespace="/chat")
def on_disconnect():
    if current_user.is_authenticated:
        current_app.redis.delete(f"user_online_{current_user.id}")
        update_friends_about_status(current_user.id, False)


@chat_bp.route("/update-online-status")
def update_online_status():
    if current_user.is_authenticated:
        current_app.redis.set(f"user_online_{current_user.id}", "online", ex=600)
        update_friends_about_status(current_user.id, True)
        return jsonify({"success": True})
    return jsonify({"error": "Unauthorized"}), 401


def update_friends_about_status(user_id, status):
    friends_ids = get_friends_ids(user_id)
    for friend_id in friends_ids:
        emit(
            "friend_online_status",
            {"friend_id": user_id, "is_online": status},
            room=str(friend_id),
            namespace="/chat",
        )


def get_friends_ids(user_id):
    friends = Friendship.query.filter(
        db.or_(Friendship.requester_id == user_id, Friendship.receiver_id == user_id),
        Friendship.status == "accepted",
    ).all()

    friend_ids = []
    for friendship in friends:
        if friendship.requester_id == user_id:
            friend_ids.append(friendship.receiver_id)
        else:
            friend_ids.append(friendship.requester_id)

    return friend_ids


@socketio.on("typing", namespace="/chat")
def on_typing(data):
    emit("user_typing", data, room=str(data["recipient_id"]))


def fetch_sorted_friends(current_user_id):
    # Subquery to get the last message's timestamp
    last_messages_subquery = (
        db.session.query(
            case(
                (Message.sender_id == current_user_id, Message.recipient_id),
                (Message.recipient_id == current_user_id, Message.sender_id),
                else_=None,
            ).label("friend_id"),
            db.func.max(Message.timestamp).label("max_timestamp"),
        )
        .filter(
            db.or_(
                Message.sender_id == current_user_id,
                Message.recipient_id == current_user_id,
            )
        )
        .group_by("friend_id")
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
            last_messages_subquery.c.friend_id == User.id,
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
            "unread_count": current_app.redis.get(
                f"unread_{current_user_id}_{friend.id}"
            )
            or 0,
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

            # Increment unread message count in Redis
            redis_key = f"unread_{data['recipient_id']}_{data['sender_id']}"
            unread_count = current_app.redis.incr(redis_key)
            data["unread_count"] = unread_count

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


@chat_bp.route("/reset-unread/<int:friend_id>")
def reset_unread_count(friend_id):
    if not current_user.is_authenticated:
        return jsonify({"error": "Unauthorized"}), 401

    redis_key = f"unread_{current_user.id}_{friend_id}"
    current_app.redis.set(redis_key, 0)

    return jsonify({"success": True})


@chat_bp.route("/get-messages")
def get_messages():
    recipient_id = request.args.get("recipient_id")
    offset = request.args.get("offset", default=0, type=int)
    limit = 20
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
        .order_by(Message.timestamp.desc())
        .offset(offset)
        .limit(limit)
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
        for msg in reversed(messages)
    ]

    return jsonify({"messages": messages_data})
