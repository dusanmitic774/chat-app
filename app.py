import os

from app import app

if __name__ == "__main__":
    if os.getenv("FLASK_ENV") == "development":
        app.debug = True
    else:
        app.debug = False
    app.run()
