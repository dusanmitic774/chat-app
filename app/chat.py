from flask import Blueprint, redirect, render_template, url_for
from flask_login import current_user
from flask_socketio import emit, join_room

from app import socketio
from app.database import db
from app.logs import app_logger
from app.models import Message, User

chat_bp = Blueprint("chat", __name__)


@socketio.on("connect", namespace="/chat")
def on_connect():
    if current_user.is_authenticated:
        join_room(str(current_user.id))
        app_logger.info(f"User {current_user.id} has connected and joined their room.")


@chat_bp.route("/chat")
def chat():
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login"))

    users = User.query.filter(User.id != current_user.id).all()

    return render_template("chat.html", user=current_user, users=users)


@socketio.on("send_message", namespace="/chat")
def handle_send_message_event(data):
    if current_user.is_authenticated and str(current_user.id) == str(data["sender_id"]):
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
    else:
        app_logger.info("Unauthorized messege sending!")
