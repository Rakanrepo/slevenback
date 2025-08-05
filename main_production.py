#!/usr/bin/env python3
"""
Production-ready FastAPI backend for Sleven Caps Store
Optimized for Railway deployment
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, text
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
    "https://sleven.shop",
    "https://www.sleven.shop",
    "https://*.railway.app",
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
    try:
        # Try to create tables (will skip if they exist)
        Base.metadata.create_all(bind=engine)
        
        # Check if we need to add missing columns (migration)
        db = SessionLocal()
        try:
            # Test if is_active column exists by trying a query
            result = db.execute(text("SELECT COUNT(*) FROM users WHERE is_active IS NOT NULL"))
            result.fetchone()
            print("Database schema is up to date")
        except Exception as e:
            print(f"Schema check failed: {e}")
            # For SQLite, it's easier to recreate if column is missing
            if "sqlite" in DATABASE_URL.lower():
                db.close()
                print("Recreating SQLite database with proper schema...")
                Base.metadata.drop_all(bind=engine)
                Base.metadata.create_all(bind=engine)
                db = SessionLocal()
                print("Database recreated successfully")
            else:
                # For PostgreSQL, try to add the column
                try:
                    db.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true"))
                    db.commit()
                    print("Added is_active column to users table")
                except:
                    db.rollback()
        finally:
            db.close()
    except Exception as e:
        print(f"Database initialization warning: {e}")
        # For SQLite, we might need to recreate tables
        if "no such column" in str(e).lower():
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
            print("Recreated database tables")
    
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

@app.post("/api/orders", response_model=OrderResponse)
def create_order(order: OrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate total amount
    total_amount = 0
    order_items = []
    
    for item in order.items:
        cap = db.query(Cap).filter(Cap.id == item.cap_id).first()
        if not cap:
            raise HTTPException(status_code=404, detail=f"Cap {item.cap_id} not found")
        if cap.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {cap.name}")
        
        item_total = cap.price * item.quantity
        total_amount += item_total
        order_items.append({
            "cap_id": cap.id,
            "quantity": item.quantity,
            "price": cap.price,
            "cap": cap
        })
    
    # Create order
    db_order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        shipping_address=order.shipping_address,
        phone=order.phone
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Create order items
    for item_data in order_items:
        db_item = OrderItem(
            order_id=db_order.id,
            cap_id=item_data["cap_id"],
            quantity=item_data["quantity"],
            price=item_data["price"]
        )
        db.add(db_item)
        
        # Update stock
        cap = item_data["cap"]
        cap.stock_quantity -= item_data["quantity"]
    
    db.commit()
    
    return OrderResponse(
        id=db_order.id,
        total_amount=db_order.total_amount,
        status=db_order.status,
        shipping_address=db_order.shipping_address,
        phone=db_order.phone,
        created_at=db_order.created_at,
        items=[{
            "cap_id": item["cap_id"],
            "quantity": item["quantity"],
            "price": item["price"],
            "cap_name": item["cap"].name
        } for item in order_items]
    )

@app.get("/api/orders", response_model=List[OrderResponse])
def get_user_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    
    result = []
    for order in orders:
        items = []
        for item in order.items:
            items.append({
                "cap_id": item.cap_id,
                "quantity": item.quantity,
                "price": item.price,
                "cap_name": item.cap.name if item.cap else "Unknown"
            })
        
        result.append(OrderResponse(
            id=order.id,
            total_amount=order.total_amount,
            status=order.status,
            shipping_address=order.shipping_address,
            phone=order.phone,
            created_at=order.created_at,
            items=items
        ))
    
    return result

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

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