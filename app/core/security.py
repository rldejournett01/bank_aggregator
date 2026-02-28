# from passlib.context import CryptContext
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt

#Passing hashing

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

#JWT settings  (TODO: move these settings to env vars)

SECRET_KEY = "MySecretKey810!"
ALGORITHM = "HS256"
ACESS_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(bytes(password, encoding="utf-8"),
                         bcrypt.gensalt(),
                         )

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(bytes(plain_password, encoding="utf-8"),
                         hashed_password,
                          )

def create_acess_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACESS_TOKEN_EXPIRE_MINUTES) 
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

'''
Passwords are never reversible 
JWT contains expiration
One function. One Responsibility.
'''

