import pytest
from app import create_app, db
from app.models import User
import os

os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"


@pytest.fixture
def test_app():
    app = create_app("testing")
    app_context = app.app_context()
    app_context.push()
    db.create_all()

    yield app

    db.session.remove()
    db.drop_all()
    app_context.pop()


@pytest.fixture
def client(test_app):
    return test_app.test_client()


def test_signup(client):
    # Test successful signup
    response = client.post(
        "/signup", data={"username": "newuser", "password": "password"}
    )
    assert response.status_code == 302
    assert User.query.filter_by(username="newuser").first() is not None

    # Test signup with existing user
    response = client.post(
        "/signup", data={"username": "newuser", "password": "password"}
    )
    assert response.status_code == 409


def test_login(client):
    user = User(username="testuser")
    user.set_password("testpassword")
    db.session.add(user)
    db.session.commit()

    # Test valid login
    response = client.post(
        "/login", data={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 302

    # Test invalid login
    response = client.post(
        "/login", data={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_logout(client):
    # Create and login a user
    user = User(username="logoutuser")
    user.set_password("password")
    db.session.add(user)
    db.session.commit()
    client.post("/login", data={"username": "logoutuser", "password": "password"})

    # Test logout
    response = client.get("/logout")
    assert response.status_code == 302
