import os

from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("ENCRYPTION_KEY")

if key is None:
    raise ValueError("No encryption key found in .env file")

key = key.encode("utf-8")
cipher_suite = Fernet(key)


def encrypt_message(message):
    if isinstance(message, str):
        message = message.encode()
    encrypted_message = cipher_suite.encrypt(message)
    return encrypted_message.decode()


def decrypt_message(encrypted_message):
    if isinstance(encrypted_message, str):
        encrypted_message = encrypted_message.encode()
    decrypted_message = cipher_suite.decrypt(encrypted_message)
    return decrypted_message.decode()
