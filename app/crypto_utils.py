from cryptography.fernet import Fernet

key = Fernet.generate_key()
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
