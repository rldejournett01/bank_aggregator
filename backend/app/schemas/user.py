from datetime import date

from pydantic import BaseModel, EmailStr, field_validator

MIN_SIGNUP_AGE_YEARS = 18


def _age_on(as_of: date, born: date) -> int:
    years = as_of.year - born.year
    had_birthday = (as_of.month, as_of.day) >= (born.month, born.day)
    return years if had_birthday else years - 1


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    date_of_birth: date

    @field_validator("first_name", "last_name")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field cannot be blank")
        return v

    @field_validator("password")
    @classmethod
    def _min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _min_age(cls, v: date) -> date:
        today = date.today()
        if v > today:
            raise ValueError("Date of birth cannot be in the future")
        if _age_on(today, v) < MIN_SIGNUP_AGE_YEARS:
            raise ValueError(f"You must be at least {MIN_SIGNUP_AGE_YEARS} years old to sign up")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str
