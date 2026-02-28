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

    password_bytes = password.encode('utf-8') #Converted string -> bytes
    salt = bcrypt.gensalt() #already bytes
    hash_bytes = bcrypt.hashpw(password_bytes, salt)

    return hash_bytes.decode('utf-8') #Decodes the bytes to be a string, returns string as promised
                         

def verify_password(plain_password: str, hashed_password: str) -> bool:

    plain_bytes = plain_password.encode('utf-8') #Converted string -> bytes
    hashed_bytes = hashed_password.encode('utf-8') #converted string -> bytes

    #DEBUG:
    # print(f"Hash string: {hashed_password}")
    # print(f"Hash bytes: {hashed_bytes}")
    # print(f"Length: {len(hashed_bytes)}")
    # print(f"Starts with: {hashed_bytes[:4]}")

    return bcrypt.checkpw(plain_bytes, hashed_bytes) #return True/False as promised

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

