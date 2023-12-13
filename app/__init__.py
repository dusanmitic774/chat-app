from app.main import main as main_blueprint
import os

from dotenv import load_dotenv
from flask import Flask
from flask_login import LoginManager

from app.database import db
from app.models import User

from app.database import db


def create_app():
    app = Flask(__name__, template_folder="../templates")

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["TEMPLATES_AUTO_RELOAD"] = True

    from .auth import auth as auth_blueprint

    app.register_blueprint(auth_blueprint)
    app.register_blueprint(main_blueprint)

    login_manager = LoginManager()
    login_manager.login_view = "auth.login"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    db.init_app(app)

    return app


app = create_app()


with app.app_context():
    db.create_all()

load_dotenv()
