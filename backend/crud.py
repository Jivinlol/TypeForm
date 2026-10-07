from sqlalchemy.orm import Session
from typing import List, Dict
import models
import schemas
import auth

# ==========================================
# USER CRUD (NEW)
# ==========================================
def get_user_by_email(db: Session, email: str):
    """Retrieve a user by their email address."""
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Create a new user with a securely hashed password."""
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ==========================================
# FORM CRUD (EXTENDED FOR USERS)
# ==========================================
def get_forms(db: Session, owner_id: str, skip: int = 0, limit: int = 100):
    """Retrieve all forms belonging specifically to the logged-in user."""
    return db.query(models.Form).filter(models.Form.owner_id == owner_id).offset(skip).limit(limit).all()

def get_form(db: Session, form_id: str):
    """Retrieve a single form by its ID. Publicly accessible for respondents."""
    return db.query(models.Form).filter(models.Form.id == form_id).first()

def create_form(db: Session, form: schemas.FormCreate, owner_id: str):
    """Create a new form record assigned to the current user."""
    db_form = models.Form(**form.model_dump(), owner_id=owner_id)
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form

def update_form(db: Session, form_id: str, form_update: schemas.FormUpdate, owner_id: str):
    """Update form metadata (title, status, etc.) ensuring user ownership."""
    db_form = db.query(models.Form).filter(models.Form.id == form_id, models.Form.owner_id == owner_id).first()
    if db_form:
        update_data = form_update.model_dump(exclude_unset=True) # Only update provided fields
        for key, value in update_data.items():
            setattr(db_form, key, value)
        db.commit()
        db.refresh(db_form)
    return db_form

def delete_form(db: Session, form_id: str, owner_id: str):
    """Delete a form ensuring user ownership."""
    db_form = db.query(models.Form).filter(models.Form.id == form_id, models.Form.owner_id == owner_id).first()
    if db_form:
        db.delete(db_form)
        db.commit()
    return db_form

# ==========================================
# QUESTION CRUD
# ==========================================
def create_question(db: Session, form_id: str, question: schemas.QuestionCreate):
    db_question = models.Question(**question.model_dump(), form_id=form_id)
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def update_question(db: Session, question_id: str, question_update: schemas.QuestionUpdate):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        update_data = question_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_question, key, value)
        db.commit()
        db.refresh(db_question)
    return db_question

def delete_question(db: Session, question_id: str):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        db.delete(db_question)
        db.commit()
    return db_question

def reorder_questions(db: Session, form_id: str, ordered_ids: List[str]):
    """
    Handles drag-and-drop reordering. 
    Uses a transaction to ensure either ALL questions update, or NONE do.
    """
    try:
        for index, q_id in enumerate(ordered_ids):
            db.query(models.Question).filter(
                models.Question.id == q_id, 
                models.Question.form_id == form_id
            ).update({"order_index": index})
        db.commit()
        return True
    except Exception as e:
        db.rollback() # Revert changes on failure
        raise e

# ==========================================
# RESPONSES & RESULTS CRUD
# ==========================================
def create_response(db: Session, form_id: str, response_data: schemas.ResponseCreate):
    """
    Saves a user's form submission. 
    Creates the Response parent record and all Answer child records in one transaction.
    """
    try:
        # 1. Create the Response parent
        db_response = models.Response(form_id=form_id)
        db.add(db_response)
        db.flush() # Flushes to generate the response ID without fully committing

        # 2. Create the Answers
        for answer in response_data.answers:
            db_answer = models.Answer(
                response_id=db_response.id,
                question_id=answer.question_id,
                value=answer.value
            )
            db.add(db_answer)
        
        db.commit() # Commit all at once
        db.refresh(db_response)
        return db_response
    except Exception as e:
        db.rollback()
        raise e

def get_responses_for_form(db: Session, form_id: str):
    """Fetch all responses and their answers for the Results dashboard."""
    return db.query(models.Response).filter(models.Response.form_id == form_id).all()