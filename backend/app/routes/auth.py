from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import hash_password, verify_password,create_access_token
from app.core.deps import get_db
from app.models.user import User


#Router
router = APIRouter(prefix="/auth", tags=["Authentication"])


#Sign Up Route with dependency injection
@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):

    #Check if existing
    #Sends query to User database and filters for exact email, returns first result
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    #create new User
    new_user = User(
        email=user.email,
        hashed_password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}

from fastapi.security import OAuth2PasswordRequestForm

#Login Route with dependency injection
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)):

    #send query to db to find the user, returns first result
    db_user = db.query(User).filter(User.email == form_data.username).first()


    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(db_user.id)})

    return {"access_token": token, "token_type": "bearer"}