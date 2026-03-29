from fastapi import APIRouter, Depends, HTTPException, status
import models, schemas, auth_utils
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from auth_utils import SECRET_KEY, ALGORITHM
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        registration_number: str = payload.get("sub")
        if registration_number is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await models.User.find_one({"registration_number": registration_number})
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=schemas.Token)
async def register(user: schemas.UserCreate):
    reg_number = user.registration_number.upper()
    logger.info(f"Attempting to register user: {reg_number}")
    db_user = await models.User.find_one({"registration_number": reg_number})
    if db_user:
        logger.warning(f"Registration failed: Registration number {reg_number} already registered")
        raise HTTPException(status_code=400, detail="Registration number already registered")
    
    hashed_password = auth_utils.get_password_hash(user.password)
    
    new_user = models.User(
        registration_number=reg_number,
        name=user.name,
        branch=user.branch,
        hashed_password=hashed_password
    )
    await new_user.insert()
    logger.info(f"User {reg_number} registered successfully.")

    access_token = auth_utils.create_access_token(
        data={"sub": new_user.registration_number}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
async def login(user: schemas.UserLogin):
    reg_number = user.registration_number.upper()
    logger.info(f"Login attempt for user: {reg_number}")
    db_user = await models.User.find_one({"registration_number": reg_number})
    if not db_user:
        logger.warning(f"Login failed: Invalid registration number {reg_number}")
        raise HTTPException(status_code=400, detail="Invalid registration number")
    
    if not auth_utils.verify_password(user.password, db_user.hashed_password):
        logger.warning(f"Login failed: Invalid password for {reg_number}")
        raise HTTPException(status_code=400, detail="Invalid password")
    
    logger.info(f"User {reg_number} logged in successfully.")
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.registration_number}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserProfile)
async def get_me(current_user: models.User = Depends(get_current_user)):
    logger.info(f"Fetching profile for user: {current_user.registration_number}")
    goals = await models.Goal.find({"owner_id": current_user.registration_number}).to_list()
    schedules = await models.Schedule.find({"owner_id": current_user.registration_number}).to_list()
    
    return schemas.UserProfile(
        _id=current_user.id,
        registration_number=current_user.registration_number,
        name=current_user.name,
        branch=current_user.branch,
        cgpa=current_user.cgpa,
        attendance=current_user.attendance,
        goals=goals,
        schedule=schedules
    )
