from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from database import engine, Base, get_db
import models
import schemas
import crud
import auth

# Automatically generate SQLite database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Typeform Clone API", description="Backend for form builder and respondent flow.")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================
@app.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT token with the user's ID encoded in the "sub" field
    access_token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    """Utility endpoint for the frontend to verify who is currently logged in."""
    return current_user

# ==========================================
# FORM ENDPOINTS
# ==========================================
@app.get("/forms/", response_model=List[schemas.FormResponse])
def read_forms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PROTECTED: Get only the forms owned by the logged-in user."""
    return crud.get_forms(db, owner_id=current_user.id, skip=skip, limit=limit)

@app.post("/forms/", response_model=schemas.FormResponse)
def create_form(form: schemas.FormCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PROTECTED: Create a form assigned to the logged-in user."""
    return crud.create_form(db=db, form=form, owner_id=current_user.id)

@app.get("/forms/{form_id}", response_model=schemas.FormResponse)
def read_form(form_id: str, db: Session = Depends(get_db)):
    """PUBLIC: Anyone with the link can view the form schema to fill it out."""
    db_form = crud.get_form(db, form_id=form_id)
    if db_form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form

@app.put("/forms/{form_id}", response_model=schemas.FormResponse)
def update_form(form_id: str, form: schemas.FormUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PROTECTED: Ensure user owns the form before updating."""
    db_form = crud.update_form(db=db, form_id=form_id, form_update=form, owner_id=current_user.id)
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found or not authorized")
    return db_form

@app.delete("/forms/{form_id}")
def delete_form(form_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PROTECTED: Ensure user owns the form before deleting."""
    success = crud.delete_form(db=db, form_id=form_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Form not found or not authorized")
    return {"message": "Form deleted successfully"}

# ==========================================
# QUESTION ENDPOINTS (Protected by checking Form Ownership)
# ==========================================
def verify_form_ownership(db: Session, form_id: str, user_id: str):
    form = db.query(models.Form).filter(models.Form.id == form_id, models.Form.owner_id == user_id).first()
    if not form:
        raise HTTPException(status_code=403, detail="Not authorized to modify this form")

@app.post("/forms/{form_id}/questions/", response_model=schemas.QuestionResponse)
def create_question(form_id: str, question: schemas.QuestionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    verify_form_ownership(db, form_id, current_user.id)
    return crud.create_question(db=db, form_id=form_id, question=question)

@app.put("/questions/{question_id}", response_model=schemas.QuestionResponse)
def update_question(question_id: str, question: schemas.QuestionUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    verify_form_ownership(db, db_question.form_id, current_user.id)
    
    return crud.update_question(db=db, question_id=question_id, question_update=question)

@app.delete("/questions/{question_id}")
def delete_question(question_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    verify_form_ownership(db, db_question.form_id, current_user.id)
    
    crud.delete_question(db=db, question_id=question_id)
    return {"message": "Question deleted successfully"}

@app.put("/forms/{form_id}/questions/reorder")
def reorder_questions(form_id: str, ordered_ids: List[str], db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    verify_form_ownership(db, form_id, current_user.id)
    success = crud.reorder_questions(db=db, form_id=form_id, ordered_ids=ordered_ids)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reorder questions")
    return {"message": "Questions reordered successfully"}

# ==========================================
# RESPONSES & RESULTS ENDPOINTS
# ==========================================
@app.post("/forms/{form_id}/responses/", response_model=schemas.ResponseDetail, status_code=status.HTTP_201_CREATED)
def submit_response(form_id: str, response: schemas.ResponseCreate, db: Session = Depends(get_db)):
    """PUBLIC: Endpoint for the public Respondent flow to submit their answers."""
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # ENFORCE PUBLISHED STATUS: Draft forms/previews cannot accept public responses
    if form.status != "published":
        raise HTTPException(status_code=403, detail="This form is currently closed or not accepting responses.")

    valid_questions = {q.id: q for q in form.questions}
    submitted_answers = {ans.question_id: ans.value for ans in response.answers}

    for ans in response.answers:
        if ans.question_id not in valid_questions:
            raise HTTPException(status_code=400, detail=f"Invalid question ID: {ans.question_id}")

    for q_id, question in valid_questions.items():
        if question.required:
            val = submitted_answers.get(q_id)
            if val is None or str(val).strip() == "":
                raise HTTPException(
                    status_code=422, 
                    detail=f"Server Validation Failed: Question '{question.title}' is required."
                )

    try:
        new_response = models.Response(form_id=form_id)
        db.add(new_response)
        db.flush() 

        for ans in response.answers:
            new_answer = models.Answer(
                response_id=new_response.id,
                question_id=ans.question_id,
                value=ans.value
            )
            db.add(new_answer)

        db.commit()
        db.refresh(new_response)
        return new_response

    except Exception as e:
        db.rollback()
        print(f"Submission Error: {e}")
        raise HTTPException(status_code=500, detail="Database transaction failed during submission.")

@app.get("/forms/{form_id}/responses/", response_model=List[schemas.ResponseDetail])
def get_form_responses(form_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PROTECTED: Only the form owner can view the collected responses."""
    verify_form_ownership(db, form_id, current_user.id)
    return crud.get_responses_for_form(db=db, form_id=form_id)