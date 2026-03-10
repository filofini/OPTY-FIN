from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import crud, database, schemas_enums

SECRET_KEY = "my_super_secret_wood_optimizer_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role_str: str = payload.get("role")
        if username is None or role_str is None:
            raise credentials_exception
        token_data = {"username": username, "role": schemas_enums.RoleEnum(role_str)}
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username=token_data["username"])
    if user is None:
        raise credentials_exception
    return user

def require_office_role(current_user = Depends(get_current_user)):
    if current_user.role != schemas_enums.RoleEnum.OFFICE:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def require_production_role(current_user = Depends(get_current_user)):
    if current_user.role not in [schemas_enums.RoleEnum.PRODUCTION, schemas_enums.RoleEnum.OFFICE]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
