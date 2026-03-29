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

@router.get("/users", response_model=list[schemas.UserBase])
async def get_all_users(current_user: models.User = Depends(get_current_user)):
    logger.info(f"User {current_user.registration_number} requesting all users list.")
    users = await models.User.find_all().to_list()
    # Exclude the current user from the list
    return [
        schemas.UserBase(
            registration_number=u.registration_number,
            name=u.name,
            branch=u.branch
        ) for u in users if u.registration_number != current_user.registration_number
    ]

@router.get("/me")
async def get_me(current_user: models.User = Depends(get_current_user)):
    logger.info(f"Fetching profile for user: {current_user.registration_number}")
    goals = await models.Goal.find({"owner_id": current_user.registration_number}).to_list()
    grades = await models.Grade.find({"owner_id": current_user.registration_number}).to_list()

    return {
        "_id": str(current_user.id),
        "registration_number": current_user.registration_number,
        "name": current_user.name,
        "branch": current_user.branch,
        "cgpa": current_user.cgpa,
        "attendance": current_user.attendance,
        "current_semester": current_user.current_semester or "",
        "goals": [
            {
                "_id": str(g.id),
                "id": str(g.id),
                "title": g.title,
                "category": g.category,
                "progress": g.progress,
                "streak": g.streak,
                "deadline": g.deadline,
                "priority": g.priority,
            } for g in goals
        ],
        "grades": [
            {
                "_id": str(g.id),
                "course_code": g.course_code,
                "course_title": g.course_title,
                "course_type": g.course_type,
                "credits": g.credits,
                "grade": g.grade,
                "exam_month": g.exam_month,
                "result_declared": g.result_declared,
            } for g in grades
        ],
    }
