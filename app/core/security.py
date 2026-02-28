# from passlib.context import CryptContext
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt



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



from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.user import User
from jose import JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
):
        credentials_exception = HTTPException(
             status_code=status.HTTP_401_UNAUTHORIZED,
             detail="Could not validate credentials",
             headers={"WWW-Authenticate": "Bearer"},
        )

        try:
             payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
             user_id: str = payload.get("sub")
             if user_id is None:
                  raise credentials_exception
        except JWTError:
             raise credentials_exception
        
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
             raise credentials_exception
        return user