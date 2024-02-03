# Milky Way
This is **Milky Way**! A minimalistic chat app for friends who want to limit their social media usage.

You can visit Milky Way [here](http://milkyway.in.rs/chat).

## :rocket: Running the Project Locally

### Prerequisites
- [Docker and Docker Compose](https://docs.docker.com/) installed on your system.
- Python 3.10, if you want to run the app outside of Docker.

### Steps to Run Locally
1. **Clone the Repository**:
```
git clone git@github.com:dusanmitic774/chat-app-flask.git
cd chat-app-flask
```

2. **Create a .env File**:
- Create a `.env` file in the root directory of the project.
- Add the necessary environment variables. Example:
  ```
  FLASK_ENV=development
  DATABASE_URL=postgresql://postgres:password@db:5432/postgres
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=password
  POSTGRES_DB=chat_app

  SECRET_KEY=secretkey

  FLASK_ENV=<development or production>

  ENCRYPTION_KEY=
  ```

3. **Build and Run with Docker Compose**:
```
docker compose up --build
```

- This will start the necessary services (app, database) in containers.

4. **Accessing the App**:
- The app will be accessible at `http://localhost`.

### Running migrations
- First you need to initialize the database with the following command:
```
docker exec -it chat-app flask db init
```

- Then to make migrations run the following commands
```
docker exec -it chat-app flask db migrate
docker exec -it chat-app flask db upgrade
```

## :rocket: Deploying with Ansible

### Prerequisites
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html) installed on your local machine.
- Access to a server where you want to deploy the app.
- SSH keys set up for the server.

### Deployment Steps
1. **Set up the Inventory File**:
 - Modify the `ansible/inventory` file to include your server's IP and user details.

2. **Running the Playbook**:
```
ansible-playbook -i ansible/inventory ansible/playbooks/deploy.yml --ask-become-pass
```

- Enter any required passwords or passphrases when prompted.

3. **.env File on the Server**:
- After the initial deployment, manually create a `.env` file in the `/home/ansible_chat_app/chat-app-flask` directory on the server with the necessary environment variables for production.

4. **Accessing the Deployed App**:
- The app will be accessible at your server's IP or domain, depending on your setup.

---

### Note
- The project requires a `.env` file both for local development and production deployment. This file is not tracked by git for security reasons and must be created manually as described above.
