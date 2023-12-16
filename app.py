import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    if os.getenv("FLASK_ENV") == "development":
        app.debug = True
    else:
        app.debug = False

    from app import socketio

    socketio.run(app, debug=debug)
