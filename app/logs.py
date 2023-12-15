import logging
from logging.handlers import RotatingFileHandler

file_handler = RotatingFileHandler(
    "/var/log/chatapp.log", maxBytes=10240, backupCount=10
)

file_handler.setFormatter(
    logging.Formatter(
        "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)

file_handler.setLevel(logging.INFO)

app_logger = logging.getLogger("chatapp")
app_logger.addHandler(file_handler)

app_logger.setLevel(logging.INFO)
