import pytest
from app import create_app, db
from app.models import User
import os

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
