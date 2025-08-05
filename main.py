from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
import bcrypt
import os
from uuid import uuid4

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./caps_store.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(title="Sleven Caps Store API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    phone = Column(String)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    orders = relationship("Order", back_populates="user")

class Cap(Base):
    __tablename__ = "caps"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    name_ar = Column(String, index=True)
    description = Column(Text)
    description_ar = Column(Text)
    price = Column(Float)
    image_url = Column(String)
    category = Column(String)
    brand = Column(String)
    color = Column(String)
    size = Column(String)
    stock_quantity = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Float)
    status = Column(String, default="pending")  # pending, confirmed, shipped, delivered, cancelled
    shipping_address = Column(Text)
    phone = Column(String)
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

# Create tables
Base.metadata.create_all(bind=engine)

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

class CapCreate(BaseModel):
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
    stock_quantity: int = 0
    is_featured: bool = False

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

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth utilities
security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# API Routes
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
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.from_orm(db_user)}

@app.get("/api/caps", response_model=List[CapResponse])
def get_caps(skip: int = 0, limit: int = 20, category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Cap)
    if category:
        query = query.filter(Cap.category == category)
    caps = query.offset(skip).limit(limit).all()
    return caps

@app.get("/api/caps/{cap_id}", response_model=CapResponse)
def get_cap(cap_id: int, db: Session = Depends(get_db)):
    cap = db.query(Cap).filter(Cap.id == cap_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="Cap not found")
    return cap

@app.get("/api/caps/featured", response_model=List[CapResponse])
def get_featured_caps(db: Session = Depends(get_db)):
    caps = db.query(Cap).filter(Cap.is_featured == True).limit(10).all()
    return caps

@app.post("/api/orders", response_model=OrderResponse)
def create_order(order: OrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
    
    db_order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        shipping_address=order.shipping_address,
        phone=order.phone
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
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
    return orders

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)