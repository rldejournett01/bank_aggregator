from fastapi import APIRouter, HTTPException
from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import hash_password, verify_password,create_acess_token


#Router
router = APIRouter(prefix="/auth", tags=["Authentication"])

#TEMP storage (will be moved to DB)
fake_users_db = {}

#Sign Up Route
@router.post("/signup")
def signup(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    
    fake_users_db[user.email] = {
        "email": user.email,
        "hash_password": hash_password(user.password)
    }

    return {"message": "User created successfully"}

#Login Route
@router.post("/login", response_model=Token)
def login(user: UserLogin):
    db_user = fake_users_db.get(user.email)

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user.password, db_user["hash_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_acess_token({"sub": user.email})

    return {"access_token": token, "token_type": "bearer"}