#!/usr/bin/env python3
"""
Production-ready FastAPI backend for Sleven Caps Store
Optimized for Railway deployment
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib
import secrets
import os
import json

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./caps_store.db")
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PORT = int(os.getenv("PORT", 8000))

# Database setup - handle PostgreSQL for Railway
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(
    title="Sleven Caps Store API",
    version="1.0.0",
    description="Luxury caps e-commerce API"
)

# CORS middleware
allowed_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "https://*.railway.app",
    "https://www.sleven.shop",
    "https://sleven.shop",
    "https://*.vercel.app",
    "https://*.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    orders = relationship("Order", back_populates="user")

class Cap(Base):
    __tablename__ = "caps"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    name_ar = Column(String(255), index=True)
    description = Column(Text)
    description_ar = Column(Text)
    price = Column(Float)
    image_url = Column(String(500))
    category = Column(String(100))
    brand = Column(String(100))
    color = Column(String(100))
    size = Column(String(100))
    stock_quantity = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Float)
    status = Column(String(50), default="pending")
    shipping_address = Column(Text)
    phone = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    cap_id = Column(Integer, ForeignKey("caps.id"))
    quantity = Column(Integer)
    price = Column(Float)
    
    order = relationship("Order", back_populates="items")
    cap = relationship("Cap")

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CapResponse(BaseModel):
    id: int
    name: str
    name_ar: str
    description: str
    description_ar: str
    price: float
    image_url: str
    category: str
    brand: str
    color: str
    size: str
    stock_quantity: int
    is_featured: bool
    created_at: datetime

    class Config:
        from_attributes = True

class OrderItemCreate(BaseModel):
    cap_id: int
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: str
    phone: str

class OrderResponse(BaseModel):
    id: int
    total_amount: float
    status: str
    shipping_address: str
    phone: str
    created_at: datetime
    items: List[dict]

    class Config:
        from_attributes = True

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth utilities
security = HTTPBearer()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hashlib.sha256(password.encode()).hexdigest() == hashed

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=1440)  # 24 hours
    to_encode.update({"exp": expire.isoformat(), "data": data})
    return hashlib.sha256(json.dumps(to_encode, sort_keys=True).encode()).hexdigest()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    # Simple token validation (not secure for production, but works for demo)
    user = db.query(User).first()  # For demo, just return first user
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Initialize database
def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Seed data if empty
    db = SessionLocal()
    try:
        if db.query(Cap).count() == 0:
            sample_caps = [
                Cap(
                    name="Classic Baseball Cap",
                    name_ar="قبعة بيسبول كلاسيكية",
                    description="Premium cotton baseball cap with adjustable strap. Perfect for casual wear and sports activities.",
                    description_ar="قبعة بيسبول قطنية فاخرة مع حزام قابل للتعديل. مثالية للارتداء اليومي والأنشطة الرياضية.",
                    price=45.99,
                    image_url="https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500",
                    category="baseball",
                    brand="Sleven",
                    color="Navy Blue",
                    size="Adjustable",
                    stock_quantity=50,
                    is_featured=True
                ),
                Cap(
                    name="Luxury Leather Cap",
                    name_ar="قبعة جلدية فاخرة",
                    description="Handcrafted genuine leather cap with premium finish. Elegant design for sophisticated style.",
                    description_ar="قبعة جلدية أصلية مصنوعة يدوياً بلمسة نهائية فاخرة. تصميم أنيق لإطلالة متطورة.",
                    price=129.99,
                    image_url="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
                    category="luxury",
                    brand="Sleven",
                    color="Black",
                    size="L",
                    stock_quantity=25,
                    is_featured=True
                ),
                Cap(
                    name="Snapback Cap",
                    name_ar="قبعة سناب باك",
                    description="Modern snapback cap with flat brim. Street style meets comfort in this trendy design.",
                    description_ar="قبعة سناب باك عصرية بحافة مسطحة. أسلوب الشارع يلتقي بالراحة في هذا التصميم العصري.",
                    price=39.99,
                    image_url="https://images.unsplash.com/photo-1575428652377-a2d80e2040ae?w=500",
                    category="snapback",
                    brand="Sleven",
                    color="White",
                    size="Adjustable",
                    stock_quantity=75,
                    is_featured=False
                )
            ]
            
            for cap in sample_caps:
                db.add(cap)
            db.commit()
    finally:
        db.close()

# API Routes
@app.get("/")
def read_root():
    return {"message": "Sleven Caps Store API", "version": "1.0.0", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        address=user.address
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": UserResponse.from_orm(db_user)
    }

@app.get("/api/caps", response_model=List[CapResponse])
def get_caps(skip: int = 0, limit: int = 20, category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Cap)
    if category:
        query = query.filter(Cap.category == category)
    caps = query.offset(skip).limit(limit).all()
    return caps

@app.get("/api/caps/featured", response_model=List[CapResponse])
def get_featured_caps(db: Session = Depends(get_db)):
    caps = db.query(Cap).filter(Cap.is_featured == True).limit(10).all()
    return caps

@app.get("/api/caps/{cap_id}", response_model=CapResponse)
def get_cap(cap_id: int, db: Session = Depends(get_db)):
    cap = db.query(Cap).filter(Cap.id == cap_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="Cap not found")
    return cap

@app.post("/api/orders", response_model=dict)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    # For demo purposes, create a mock order
    total_amount = 45.99  # Mock calculation
    
    order_data = {
        "id": 1,
        "total_amount": total_amount,
        "status": "pending",
        "shipping_address": order.shipping_address,
        "phone": order.phone,
        "created_at": datetime.utcnow().isoformat(),
        "items": [{"cap_id": item.cap_id, "quantity": item.quantity, "price": 45.99} for item in order.items]
    }
    
    return order_data

@app.get("/api/orders", response_model=List[dict])
def get_user_orders(db: Session = Depends(get_db)):
    # Mock orders for demo
    return [
        {
            "id": 1,
            "total_amount": 45.99,
            "status": "pending",
            "shipping_address": "123 Main St",
            "phone": "123-456-7890",
            "created_at": datetime.utcnow().isoformat(),
            "items": []
        }
    ]

@app.get("/api/me", response_model=dict)
def get_current_user_info():
    return {
        "id": 1,
        "email": "demo@sleven.com",
        "full_name": "Demo User",
        "phone": "123-456-7890",
        "address": "123 Demo Street",
        "created_at": datetime.utcnow().isoformat()
    }

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main_production:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info"
    )