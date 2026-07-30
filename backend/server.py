from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "bizflow-secret-key-change-in-production")
ALGORITHM = "HS256"
TRIAL_DAYS = 14

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Check trial expiration
        trial_start = user.get("trial_start_date")
        if trial_start:
            days_elapsed = (datetime.utcnow() - trial_start).days
            if days_elapsed > TRIAL_DAYS:
                user["trial_expired"] = True
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"trial_expired": True}}
                )
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    company_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str

class ProductCreate(BaseModel):
    name: str
    sku: str
    barcode: Optional[str] = None
    category_id: str
    selling_price: float
    cost_price: float = 0.0
    stock_quantity: int
    low_stock_alert: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[str] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    low_stock_alert: Optional[int] = None

class SaleCreate(BaseModel):
    product_id: str
    quantity: int
    payment_method: str  # "Cash" or "QR"

class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    low_stock_threshold: Optional[int] = None
    company_logo: Optional[str] = None  # base64 encoded

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    new_user = {
        "email": user_data.email,
        "password": hashed_password,
        "company_name": user_data.company_name,
        "trial_start_date": datetime.utcnow(),
        "trial_expired": False,
        "low_stock_threshold": 10,
        "currency": "MYR",
        "company_logo": None,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    
    # Create default categories for new user
    default_categories = [
        {"name": "General", "user_id": user_id, "created_at": datetime.utcnow()}
    ]
    await db.categories.insert_many(default_categories)
    
    # Create token
    access_token = create_access_token({"user_id": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "company_name": user_data.company_name,
            "trial_days_remaining": TRIAL_DAYS
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    
    # Calculate trial days remaining
    trial_start = user.get("trial_start_date")
    days_elapsed = 0
    if trial_start:
        days_elapsed = (datetime.utcnow() - trial_start).days
    
    trial_days_remaining = max(0, TRIAL_DAYS - days_elapsed)
    trial_expired = days_elapsed > TRIAL_DAYS
    
    # Update trial status if expired
    if trial_expired and not user.get("trial_expired"):
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"trial_expired": True}}
        )
    
    access_token = create_access_token({"user_id": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user["email"],
            "company_name": user.get("company_name", ""),
            "trial_days_remaining": trial_days_remaining,
            "trial_expired": trial_expired
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    trial_start = current_user.get("trial_start_date")
    days_elapsed = 0
    if trial_start:
        days_elapsed = (datetime.utcnow() - trial_start).days
    
    trial_days_remaining = max(0, TRIAL_DAYS - days_elapsed)
    trial_expired = days_elapsed > TRIAL_DAYS
    
    return {
        "id": user_id,
        "email": current_user["email"],
        "company_name": current_user.get("company_name", ""),
        "trial_days_remaining": trial_days_remaining,
        "trial_expired": trial_expired,
        "low_stock_threshold": current_user.get("low_stock_threshold", 10),
        "currency": current_user.get("currency", "MYR"),
        "company_logo": current_user.get("company_logo")
    }

# Category Routes
@api_router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    categories = await db.categories.find({"user_id": user_id}).to_list(1000)
    return [{"id": str(cat["_id"]), "name": cat["name"]} for cat in categories]

@api_router.post("/categories")
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Check if category already exists
    existing = await db.categories.find_one({"user_id": user_id, "name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_category = {
        "name": category.name,
        "user_id": user_id,
        "created_at": datetime.utcnow()
    }
    result = await db.categories.insert_one(new_category)
    return {"id": str(result.inserted_id), "name": category.name}

@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, category: CategoryUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await db.categories.update_one(
        {"_id": ObjectId(category_id), "user_id": user_id},
        {"$set": {"name": category.name}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"id": category_id, "name": category.name}

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Check if any products use this category
    products_count = await db.products.count_documents({"category_id": category_id, "user_id": user_id})
    if products_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category with existing products")
    
    result = await db.categories.delete_one({"_id": ObjectId(category_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Product Routes
@api_router.get("/products")
async def get_products(search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query).to_list(1000)
    global_threshold = current_user.get("low_stock_threshold", 10)
    
    result = []
    for prod in products:
        category = await db.categories.find_one({"_id": ObjectId(prod["category_id"])})
        result.append({
            "id": str(prod["_id"]),
            "name": prod["name"],
            "sku": prod["sku"],
            "barcode": prod.get("barcode", ""),
            "category_id": prod["category_id"],
            "category_name": category["name"] if category else "Unknown",
            "selling_price": prod["selling_price"],
            "cost_price": prod.get("cost_price", 0.0),
            "stock_quantity": prod["stock_quantity"],
            "low_stock_alert": prod.get("low_stock_alert") if prod.get("low_stock_alert") is not None else global_threshold
        })
    
    return result

@api_router.post("/products")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Check if SKU already exists
    existing = await db.products.find_one({"user_id": user_id, "sku": product.sku})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    new_product = {
        "name": product.name,
        "sku": product.sku,
        "barcode": product.barcode or "",
        "category_id": product.category_id,
        "selling_price": product.selling_price,
        "cost_price": product.cost_price,
        "stock_quantity": product.stock_quantity,
        "low_stock_alert": product.low_stock_alert,
        "user_id": user_id,
        "created_at": datetime.utcnow()
    }
    
    result = await db.products.insert_one(new_product)
    category = await db.categories.find_one({"_id": ObjectId(product.category_id)})
    global_threshold = current_user.get("low_stock_threshold", 10)
    
    return {
        "id": str(result.inserted_id),
        "name": product.name,
        "sku": product.sku,
        "barcode": product.barcode or "",
        "category_id": product.category_id,
        "category_name": category["name"] if category else "Unknown",
        "selling_price": product.selling_price,
        "cost_price": product.cost_price,
        "stock_quantity": product.stock_quantity,
        "low_stock_alert": product.low_stock_alert if product.low_stock_alert is not None else global_threshold
    }

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.products.update_one(
        {"_id": ObjectId(product_id), "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_product = await db.products.find_one({"_id": ObjectId(product_id)})
    category = await db.categories.find_one({"_id": ObjectId(updated_product["category_id"])})
    global_threshold = current_user.get("low_stock_threshold", 10)
    
    return {
        "id": str(updated_product["_id"]),
        "name": updated_product["name"],
        "sku": updated_product["sku"],
        "barcode": updated_product.get("barcode", ""),
        "category_id": updated_product["category_id"],
        "category_name": category["name"] if category else "Unknown",
        "selling_price": updated_product["selling_price"],
        "cost_price": updated_product.get("cost_price", 0.0),
        "stock_quantity": updated_product["stock_quantity"],
        "low_stock_alert": updated_product.get("low_stock_alert") if updated_product.get("low_stock_alert") is not None else global_threshold
    }

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await db.products.delete_one({"_id": ObjectId(product_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# Sales Routes
@api_router.post("/sales")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    """
    Atomically create a sale:
    1. Deduct stock ONLY if sufficient (atomic conditional update)
    2. If deduction fails -> raise Insufficient Stock
    3. Insert sale + inventory movement records
    4. Best-effort rollback of stock if bookkeeping inserts fail
    """
    user_id = str(current_user["_id"])
    
    # Validate quantity
    if sale.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
    
    # Validate payment method
    if sale.payment_method not in ["Cash", "QR"]:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    # Validate product_id format
    try:
        product_oid = ObjectId(sale.product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    # Atomic conditional stock deduction:
    # Only decrement if product exists AND stock >= quantity
    # This is atomic at the document level, preventing race conditions.
    updated_product = await db.products.find_one_and_update(
        {
            "_id": product_oid,
            "user_id": user_id,
            "stock_quantity": {"$gte": sale.quantity}
        },
        {"$inc": {"stock_quantity": -sale.quantity}},
        return_document=True  # return the UPDATED document
    )
    
    if updated_product is None:
        # Check whether product exists at all — for accurate error messaging
        product_exists = await db.products.find_one(
            {"_id": product_oid, "user_id": user_id},
            {"stock_quantity": 1, "name": 1}
        )
        if not product_exists:
            raise HTTPException(status_code=404, detail="Product not found")
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product_exists['stock_quantity']}, Requested: {sale.quantity}"
        )
    
    now = datetime.utcnow()
    unit_price = updated_product["selling_price"]
    total_price = unit_price * sale.quantity
    
    # Build sale + movement records
    sale_doc = {
        "product_id": sale.product_id,
        "product_name": updated_product["name"],
        "quantity": sale.quantity,
        "unit_price": unit_price,
        "selling_price": unit_price,  # explicit alias for clarity
        "total_price": total_price,
        "total_amount": total_price,  # explicit alias for clarity
        "payment_method": sale.payment_method,
        "user_id": user_id,
        "created_at": now,
        "date": now,
    }
    
    try:
        sale_result = await db.sales.insert_one(sale_doc)
        sale_id = str(sale_result.inserted_id)
        
        movement_doc = {
            "product_id": sale.product_id,
            "product_name": updated_product["name"],
            "quantity": sale.quantity,
            "type": "SALE",
            "reference_id": sale_id,
            "stock_after": updated_product["stock_quantity"],
            "user_id": user_id,
            "created_at": now,
            "date": now,
        }
        await db.inventory_movements.insert_one(movement_doc)
    except Exception as e:
        # Best-effort compensation: give stock back so nothing is lost silently
        await db.products.update_one(
            {"_id": product_oid, "user_id": user_id},
            {"$inc": {"stock_quantity": sale.quantity}}
        )
        raise HTTPException(status_code=500, detail=f"Failed to record sale: {str(e)}")
    
    return {
        "id": sale_id,
        "product_id": sale.product_id,
        "product_name": updated_product["name"],
        "quantity": sale.quantity,
        "unit_price": unit_price,
        "selling_price": unit_price,
        "total_price": total_price,
        "total_amount": total_price,
        "payment_method": sale.payment_method,
        "stock_after": updated_product["stock_quantity"],
        "created_at": now.isoformat(),
    }

@api_router.get("/sales")
async def get_sales(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    sales = await db.sales.find({"user_id": user_id}).sort("created_at", -1).to_list(1000)
    
    return [{
        "id": str(sale["_id"]),
        "product_id": sale.get("product_id"),
        "product_name": sale["product_name"],
        "quantity": sale["quantity"],
        "unit_price": sale["unit_price"],
        "selling_price": sale.get("selling_price", sale["unit_price"]),
        "total_price": sale["total_price"],
        "total_amount": sale.get("total_amount", sale["total_price"]),
        "payment_method": sale["payment_method"],
        "created_at": sale["created_at"].isoformat()
    } for sale in sales]

# Inventory Movements Routes
@api_router.get("/inventory-movements")
async def get_inventory_movements(
    product_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    if product_id:
        query["product_id"] = product_id
    
    movements = await db.inventory_movements.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [{
        "id": str(m["_id"]),
        "product_id": m["product_id"],
        "product_name": m.get("product_name", ""),
        "quantity": m["quantity"],
        "type": m["type"],
        "reference_id": m.get("reference_id"),
        "stock_after": m.get("stock_after"),
        "date": m["created_at"].isoformat(),
        "created_at": m["created_at"].isoformat(),
    } for m in movements]

# Low Stock Products
@api_router.get("/products/low-stock")
async def get_low_stock_products(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    global_threshold = current_user.get("low_stock_threshold", 10)
    
    products = await db.products.find({"user_id": user_id}).to_list(1000)
    
    low_stock = []
    for prod in products:
        threshold = prod.get("low_stock_alert")
        if threshold is None:
            threshold = global_threshold
        if prod["stock_quantity"] <= threshold:
            category = await db.categories.find_one({"_id": ObjectId(prod["category_id"])})
            low_stock.append({
                "id": str(prod["_id"]),
                "name": prod["name"],
                "sku": prod["sku"],
                "category_name": category["name"] if category else "Unknown",
                "stock_quantity": prod["stock_quantity"],
                "low_stock_alert": threshold,
                "selling_price": prod["selling_price"],
            })
    
    # Sort by lowest stock first
    low_stock.sort(key=lambda p: p["stock_quantity"])
    return low_stock

# Dashboard Routes
@api_router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    low_stock_threshold = current_user.get("low_stock_threshold", 10)
    
    # Today's sales
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sales = await db.sales.find({
        "user_id": user_id,
        "created_at": {"$gte": today_start}
    }).to_list(1000)
    
    today_total = sum(sale["total_price"] for sale in today_sales)
    
    # Total products
    total_products = await db.products.count_documents({"user_id": user_id})
    
    # Total stock and stock value
    products = await db.products.find({"user_id": user_id}).to_list(1000)
    total_stock = sum(prod["stock_quantity"] for prod in products)
    stock_value = sum(prod["selling_price"] * prod["stock_quantity"] for prod in products)
    
    # Low stock detection - respect per-product threshold, else global
    low_stock_products = []
    for prod in products:
        threshold = prod.get("low_stock_alert")
        if threshold is None:
            threshold = low_stock_threshold
        if prod["stock_quantity"] <= threshold:
            low_stock_products.append({
                "id": str(prod["_id"]),
                "name": prod["name"],
                "sku": prod["sku"],
                "stock_quantity": prod["stock_quantity"],
                "low_stock_alert": threshold,
            })
    
    # Sort by lowest stock first
    low_stock_products.sort(key=lambda p: p["stock_quantity"])
    low_stock_count = len(low_stock_products)
    
    # Latest sales (last 5)
    latest_sales = await db.sales.find({"user_id": user_id}).sort("created_at", -1).limit(5).to_list(5)
    
    latest_sales_data = [{
        "id": str(sale["_id"]),
        "product_name": sale["product_name"],
        "quantity": sale["quantity"],
        "total_price": sale["total_price"],
        "payment_method": sale["payment_method"],
        "created_at": sale["created_at"].isoformat()
    } for sale in latest_sales]
    
    return {
        "today_sales": today_total,
        "total_products": total_products,
        "total_stock": total_stock,
        "stock_value": stock_value,
        "low_stock": low_stock_count,
        "low_stock_products": low_stock_products,
        "latest_sales": latest_sales_data
    }

# Reports Routes
@api_router.get("/reports/daily-sales")
async def get_daily_sales(days: int = 7, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    start_date = datetime.utcnow() - timedelta(days=days)
    
    sales = await db.sales.find({
        "user_id": user_id,
        "created_at": {"$gte": start_date}
    }).to_list(1000)
    
    # Group by date
    daily_data = {}
    for sale in sales:
        date_key = sale["created_at"].strftime("%Y-%m-%d")
        if date_key not in daily_data:
            daily_data[date_key] = 0
        daily_data[date_key] += sale["total_price"]
    
    return [{"date": date, "total": total} for date, total in sorted(daily_data.items())]

@api_router.get("/reports/monthly-sales")
async def get_monthly_sales(months: int = 6, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    start_date = datetime.utcnow() - timedelta(days=months * 30)
    
    sales = await db.sales.find({
        "user_id": user_id,
        "created_at": {"$gte": start_date}
    }).to_list(1000)
    
    # Group by month
    monthly_data = {}
    for sale in sales:
        month_key = sale["created_at"].strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = 0
        monthly_data[month_key] += sale["total_price"]
    
    return [{"month": month, "total": total} for month, total in sorted(monthly_data.items())]

@api_router.get("/reports/top-products")
async def get_top_products(limit: int = 10, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Aggregate sales by product
    sales = await db.sales.find({"user_id": user_id}).to_list(10000)
    
    product_sales = {}
    for sale in sales:
        prod_id = sale["product_id"]
        if prod_id not in product_sales:
            product_sales[prod_id] = {
                "product_name": sale["product_name"],
                "quantity": 0,
                "revenue": 0
            }
        product_sales[prod_id]["quantity"] += sale["quantity"]
        product_sales[prod_id]["revenue"] += sale["total_price"]
    
    # Sort by revenue
    sorted_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:limit]
    
    return sorted_products

# Settings Routes
@api_router.put("/settings")
async def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    update_data = {k: v for k, v in settings.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return {
        "company_name": updated_user.get("company_name", ""),
        "low_stock_threshold": updated_user.get("low_stock_threshold", 10),
        "company_logo": updated_user.get("company_logo")
    }

# Seed data endpoint (for demo)
@api_router.post("/seed-data")
async def seed_data(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Check if already has data
    existing_products = await db.products.count_documents({"user_id": user_id})
    if existing_products > 0:
        return {"message": "Data already exists"}
    
    # Create sample categories
    categories = [
        {"name": "Electronics", "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "Clothing", "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "Food & Beverages", "user_id": user_id, "created_at": datetime.utcnow()},
    ]
    cat_result = await db.categories.insert_many(categories)
    cat_ids = [str(id) for id in cat_result.inserted_ids]
    
    # Create sample products
    products = [
        {"name": "Wireless Mouse", "sku": "ELEC001", "barcode": "8801234567001", "category_id": cat_ids[0], "selling_price": 45.00, "cost_price": 25.00, "stock_quantity": 25, "low_stock_alert": 5, "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "USB Cable", "sku": "ELEC002", "barcode": "8801234567002", "category_id": cat_ids[0], "selling_price": 15.00, "cost_price": 6.00, "stock_quantity": 50, "low_stock_alert": 10, "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "Laptop Stand", "sku": "ELEC003", "barcode": "8801234567003", "category_id": cat_ids[0], "selling_price": 89.00, "cost_price": 45.00, "stock_quantity": 8, "low_stock_alert": 5, "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "T-Shirt (Blue)", "sku": "CLO001", "barcode": "8801234567004", "category_id": cat_ids[1], "selling_price": 35.00, "cost_price": 18.00, "stock_quantity": 30, "low_stock_alert": 8, "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "Jeans", "sku": "CLO002", "barcode": "8801234567005", "category_id": cat_ids[1], "selling_price": 120.00, "cost_price": 60.00, "stock_quantity": 15, "low_stock_alert": 5, "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "Coffee Beans 500g", "sku": "FOOD001", "barcode": "8801234567006", "category_id": cat_ids[2], "selling_price": 28.00, "cost_price": 14.00, "stock_quantity": 40, "low_stock_alert": 10, "user_id": user_id, "created_at": datetime.utcnow()},
        {"name": "Green Tea Box", "sku": "FOOD002", "barcode": "8801234567007", "category_id": cat_ids[2], "selling_price": 22.00, "cost_price": 10.00, "stock_quantity": 5, "low_stock_alert": 5, "user_id": user_id, "created_at": datetime.utcnow()},
    ]
    await db.products.insert_many(products)
    
    # Create sample sales
    product_list = await db.products.find({"user_id": user_id}).to_list(100)
    sales = []
    for i in range(15):
        prod = product_list[i % len(product_list)]
        qty = (i % 3) + 1
        sales.append({
            "product_id": str(prod["_id"]),
            "product_name": prod["name"],
            "quantity": qty,
            "unit_price": prod["selling_price"],
            "total_price": prod["selling_price"] * qty,
            "payment_method": "Cash" if i % 2 == 0 else "QR",
            "user_id": user_id,
            "created_at": datetime.utcnow() - timedelta(days=(i % 7), hours=(i % 12))
        })
    
    await db.sales.insert_many(sales)
    
    return {"message": "Sample data created successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
