import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base

# Utility function to generate unique URL-safe IDs
# (Must be defined at the top so classes below can use it)
def generate_uuid():
    return uuid.uuid4().hex

# ==========================================
# USER MODEL (NEW)
# ==========================================
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # A user can have many forms. If user is deleted, their forms are deleted.
    forms = relationship("Form", back_populates="owner", cascade="all, delete-orphan")

# ==========================================
# EXISTING MODELS (EXTENDED SAFELY)
# ==========================================
class Form(Base):
    """
    Represents a Form created by a user.
    """
    __tablename__ = "forms"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    
    # NEW: Link to the User who created it. 
    # (Set to nullable=True so your existing test forms don't break the database)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    title = Column(String, nullable=False, default="My New Form")
    description = Column(Text, nullable=True)
    status = Column(String, default="draft")  
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # NEW: Relationship back to the User
    owner = relationship("User", back_populates="forms")

    # EXISTING: These remain completely untouched so your builder/results keep working
    questions = relationship("Question", back_populates="form", cascade="all, delete-orphan", order_by="Question.order_index")
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    """
    Represents a single Question inside a form.
    """
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    form_id = Column(String, ForeignKey("forms.id"), nullable=False)
    type = Column(String, nullable=False) 
    title = Column(String, nullable=False, default="New Question")
    description = Column(Text, nullable=True)
    required = Column(Boolean, default=False)
    order_index = Column(Integer, nullable=False) 
    
    settings = Column(JSON, nullable=True, default={}) 

    form = relationship("Form", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class Response(Base):
    """
    Represents a single submission session by a respondent.
    """
    __tablename__ = "responses"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    form_id = Column(String, ForeignKey("forms.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    """
    Represents the individual answer to a specific question within a response.
    """
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    response_id = Column(String, ForeignKey("responses.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    value = Column(JSON, nullable=True) 

    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")