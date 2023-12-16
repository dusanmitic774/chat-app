from dotenv import load_dotenv
from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate

from app.config import Config, TestingConfig
from app.database import db
from app.main import main as main_blueprint
from app.models import User


def create_app(config_name="default"):
    app = Flask(__name__, template_folder="../templates")

    if config_name == "testing":
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(Config)

    from .auth import auth as auth_blueprint

    app.register_blueprint(auth_blueprint)
    app.register_blueprint(main_blueprint)

    login_manager = LoginManager()
    login_manager.login_view = "auth.login"
    login_manager.init_app(app)

    # We need this function because it's being called
    # every time flask tries to access current_user
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    db.init_app(app)

    return app


app = create_app()
migrate = Migrate(app, db)


with app.app_context():
    db.create_all()

load_dotenv()
