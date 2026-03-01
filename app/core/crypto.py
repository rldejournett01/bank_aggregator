from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet() -> Fernet:
    # Fernet expects bytes
    return Fernet(settings.FERNET_KEY.encode())


def encrypt_text(plain: str) -> str:
    f = _get_fernet()
    return f.encrypt(plain.encode()).decode()


def decrypt_text(cipher: str) -> str:
    f = _get_fernet()
    return f.decrypt(cipher.encode()).decode()