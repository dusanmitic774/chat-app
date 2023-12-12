FROM python:3.10-slim

WORKDIR /usr/src/app

COPY . .

RUN apt-get update && apt-get install -y postgresql-client

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["flask", "run"]
