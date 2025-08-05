from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Base, Cap

SQLALCHEMY_DATABASE_URL = "sqlite:///./caps_store.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_caps():
    db = SessionLocal()
    
    # Check if caps already exist
    if db.query(Cap).count() > 0:
        print("Caps already exist, skipping seed")
        return
    
    caps_data = [
        {
            "name": "Classic Baseball Cap",
            "name_ar": "قبعة بيسبول كلاسيكية",
            "description": "Premium cotton baseball cap with adjustable strap. Perfect for casual wear and sports activities.",
            "description_ar": "قبعة بيسبول قطنية فاخرة مع حزام قابل للتعديل. مثالية للارتداء اليومي والأنشطة الرياضية.",
            "price": 45.99,
            "image_url": "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500",
            "category": "baseball",
            "brand": "Sleven",
            "color": "Navy Blue",
            "size": "Adjustable",
            "stock_quantity": 50,
            "is_featured": True
        },
        {
            "name": "Luxury Leather Cap",
            "name_ar": "قبعة جلدية فاخرة",
            "description": "Handcrafted genuine leather cap with premium finish. Elegant design for sophisticated style.",
            "description_ar": "قبعة جلدية أصلية مصنوعة يدوياً بلمسة نهائية فاخرة. تصميم أنيق لإطلالة متطورة.",
            "price": 129.99,
            "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
            "category": "luxury",
            "brand": "Sleven",
            "color": "Black",
            "size": "L",
            "stock_quantity": 25,
            "is_featured": True
        },
        {
            "name": "Snapback Cap",
            "name_ar": "قبعة سناب باك",
            "description": "Modern snapback cap with flat brim. Street style meets comfort in this trendy design.",
            "description_ar": "قبعة سناب باك عصرية بحافة مسطحة. أسلوب الشارع يلتقي بالراحة في هذا التصميم العصري.",
            "price": 39.99,
            "image_url": "https://images.unsplash.com/photo-1575428652377-a2d80e2040ae?w=500",
            "category": "snapback",
            "brand": "Sleven",
            "color": "White",
            "size": "Adjustable",
            "stock_quantity": 75,
            "is_featured": False
        },
        {
            "name": "Trucker Hat",
            "name_ar": "قبعة ترابر",
            "description": "Mesh back trucker hat with foam front panel. Breathable and comfortable for outdoor activities.",
            "description_ar": "قبعة ترابر بظهر شبكي ولوحة أمامية إسفنجية. قابلة للتنفس ومريحة للأنشطة الخارجية.",
            "price": 32.99,
            "image_url": "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=500",
            "category": "trucker",
            "brand": "Sleven",
            "color": "Red",
            "size": "Adjustable",
            "stock_quantity": 60,
            "is_featured": False
        },
        {
            "name": "Beanie Cap",
            "name_ar": "قبعة بيني",
            "description": "Soft knitted beanie perfect for cold weather. Warm, comfortable, and stylish.",
            "description_ar": "قبعة بيني محبوكة ناعمة مثالية للطقس البارد. دافئة ومريحة وأنيقة.",
            "price": 24.99,
            "image_url": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=500",
            "category": "beanie",
            "brand": "Sleven",
            "color": "Gray",
            "size": "One Size",
            "stock_quantity": 100,
            "is_featured": True
        },
        {
            "name": "Bucket Hat",
            "name_ar": "قبعة باكت",
            "description": "Classic bucket hat with wide brim for sun protection. Perfect for summer adventures.",
            "description_ar": "قبعة باكت كلاسيكية بحافة عريضة للحماية من الشمس. مثالية لمغامرات الصيف.",
            "price": 35.99,
            "image_url": "https://images.unsplash.com/photo-1567393528677-d6adae7d4a0a?w=500",
            "category": "bucket",
            "brand": "Sleven",
            "color": "Khaki",
            "size": "M",
            "stock_quantity": 40,
            "is_featured": False
        }
    ]
    
    for cap_data in caps_data:
        cap = Cap(**cap_data)
        db.add(cap)
    
    db.commit()
    print(f"Added {len(caps_data)} caps to the database")
    db.close()

if __name__ == "__main__":
    seed_caps()