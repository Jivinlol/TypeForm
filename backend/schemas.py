from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# ==========================================
# USER & AUTH SCHEMAS
# ==========================================
class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

# ==========================================
# QUESTION SCHEMAS
# ==========================================
class QuestionBase(BaseModel):
    """Base schema holding common attributes for Questions."""
    type: str = Field(..., description="Type of question (e.g., short_text, multiple_choice)")
    title: str = Field(..., min_length=1, description="Question text")
    description: Optional[str] = None
    required: bool = False
    order_index: int
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class QuestionCreate(QuestionBase):
    """Schema used when creating a new question (inherits Base)."""
    pass

class QuestionUpdate(BaseModel):
    """Schema for updating a question. All fields are optional."""
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    order_index: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None

class QuestionResponse(QuestionBase):
    """Schema for returning a question from the API. Includes the DB-generated ID."""
    id: str
    form_id: str

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# FORM SCHEMAS
# ==========================================
class FormBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: str = Field(default="draft") # draft or published

class FormCreate(FormBase):
    pass

class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class FormResponse(FormBase):
    id: str
    owner_id: Optional[str] = None  # CRITICAL: Added so the frontend knows who owns this form
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionResponse] = [] # Nested relationship

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# ANSWER & RESPONSE SCHEMAS
# ==========================================
class AnswerBase(BaseModel):
    question_id: str
    value: Any # Can be string, int, boolean, or list depending on question type

class AnswerCreate(AnswerBase):
    pass

class AnswerResponse(AnswerBase):
    id: str
    
    model_config = ConfigDict(from_attributes=True)

class ResponseCreate(BaseModel):
    """Schema representing the payload sent when a user submits a form."""
    answers: List[AnswerCreate]

class ResponseDetail(BaseModel):
    id: str
    form_id: str
    submitted_at: datetime
    answers: List[AnswerResponse] = []

    model_config = ConfigDict(from_attributes=True)