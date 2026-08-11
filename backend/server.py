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
from typing import Any, Dict, List, Optional
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
VALID_PAYMENT_METHODS = {"Cash", "QR", "Bank Transfer", "Transfer"}

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")


def _utc_now() -> datetime:
    return datetime.utcnow()


def _serialize_datetime(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _derive_company_status(company: Dict[str, Any]) -> str:
    explicit_status = (company.get("status") or "").strip()
    if explicit_status:
        return explicit_status

    trial_end = company.get("trialEnd")
    subscription_end = company.get("subscriptionEnd")
    now = _utc_now()
    if trial_end:
        try:
            trial_end_dt = trial_end if isinstance(trial_end, datetime) else datetime.fromisoformat(str(trial_end))
            if trial_end_dt < now:
                return "Expired"
        except Exception:
            pass

    if subscription_end:
        try:
            sub_end_dt = subscription_end if isinstance(subscription_end, datetime) else datetime.fromisoformat(str(subscription_end))
            if sub_end_dt < now:
                return "Expired"
        except Exception:
            pass

    return "Trial"


def _get_admin_credentials() -> Dict[str, str]:
    return {
        "email": os.getenv("SUPER_ADMIN_EMAIL", "superadmin@bizflow.my"),
        "password": os.getenv("SUPER_ADMIN_PASSWORD", "BizFlow2026!"),
    }


def _company_plan_price(plan: Optional[str]) -> float:
    plan_name = (plan or "Basic").strip().lower()
    if plan_name in {"pro", "advance"}:
        return 299.0 if plan_name == "pro" else 499.0
    return 99.0


def _company_payload(company: Dict[str, Any], include_id: bool = True) -> Dict[str, Any]:
    status = _derive_company_status(company)
    trial_end = company.get("trialEnd")
    subscription_end = company.get("subscriptionEnd")
    now = _utc_now()
    payload: Dict[str, Any] = {
        "companyName": company.get("companyName") or company.get("company_name") or "",
        "ownerName": company.get("ownerName") or "",
        "email": company.get("email") or "",
        "phone": company.get("phone") or "",
        "plan": company.get("plan") or "Basic",
        "status": status,
        "trialEnd": _serialize_datetime(trial_end),
        "subscriptionEnd": _serialize_datetime(subscription_end),
        "lastLogin": _serialize_datetime(company.get("lastLogin")),
        "createdAt": _serialize_datetime(company.get("createdAt")),
        "updatedAt": _serialize_datetime(company.get("updatedAt")),
        "trialRemainingDays": 0,
        "monthlyRevenue": _company_plan_price(company.get("plan")) if status == "Active" else 0.0,
    }
    if trial_end:
        try:
            trial_end_dt = trial_end if isinstance(trial_end, datetime) else datetime.fromisoformat(str(trial_end))
            payload["trialRemainingDays"] = max(0, (trial_end_dt - now).days)
        except Exception:
            payload["trialRemainingDays"] = 0

    if include_id:
        payload["id"] = str(company.get("_id")) if company.get("_id") is not None else company.get("id")
    return payload

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


def normalize_payment_method(payment_method: Optional[str]) -> str:
    if not payment_method:
        return "Cash"
    normalized = payment_method.strip()
    if normalized.lower() in {"qr", "qrcode"}:
        return "QR"
    if normalized.lower() in {"bank transfer", "bank-transfer", "bank", "transfer"}:
        return "Bank Transfer"
    return "Cash" if normalized.lower() in {"cash", "cash payment"} else normalized


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

        company = None
        if user.get("email"):
            company = await db.companies.find_one({"email": user["email"]})

        if company:
            status = _derive_company_status(company)
            if status in {"Expired", "Suspended"}:
                raise HTTPException(status_code=403, detail="Account is suspended or expired")
        
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


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Forbidden")

        expected = _get_admin_credentials()
        if payload.get("email") != expected["email"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
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
    payment_method: str
    payment_reference: Optional[str] = None

class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    low_stock_threshold: Optional[int] = None
    company_logo: Optional[str] = None  # base64 encoded

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminPlanUpdate(BaseModel):
    plan: str

class AdminResetPassword(BaseModel):
    password: str

class PaymentSuccessCallback(BaseModel):
    companyId: Optional[str] = None
    email: Optional[str] = None
    amount: float = 49.0
    method: str = "Bank Transfer"
    reference: Optional[str] = None

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

    now = _utc_now()
    await db.companies.insert_one({
        "userId": user_id,
        "companyName": user_data.company_name,
        "ownerName": user_data.company_name,
        "email": str(user_data.email),
        "phone": "",
        "plan": "Basic",
        "status": "Trial",
        "trialStart": now,
        "trialEnd": now + timedelta(days=TRIAL_DAYS),
        "subscriptionStart": None,
        "subscriptionEnd": None,
        "lastLogin": None,
        "createdAt": now,
        "updatedAt": now,
    })
    
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
    
    company = await db.companies.find_one({"email": user["email"]})
    if company:
        status = _derive_company_status(company)
        if status in {"Expired", "Suspended"}:
            raise HTTPException(status_code=403, detail="Account is suspended or expired")
        await db.companies.update_one(
            {"_id": company.get("_id")},
            {"$set": {"lastLogin": _utc_now(), "updatedAt": _utc_now()}},
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

# Super Admin Routes
@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    expected = _get_admin_credentials()
    if str(credentials.email).lower() != expected["email"].lower() or credentials.password != expected["password"]:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    access_token = create_access_token({"user_id": "admin", "role": "super_admin", "email": expected["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"email": expected["email"], "role": "super_admin"},
    }


@api_router.get("/admin/summary")
async def admin_summary(current_admin: dict = Depends(get_current_admin)):
    companies = await db.companies.find({}).to_list(1000)
    now = _utc_now()

    total_companies = len(companies)
    trial_companies = sum(1 for company in companies if _derive_company_status(company) == "Trial")
    active_subscriptions = sum(1 for company in companies if _derive_company_status(company) == "Active")
    expired_subscriptions = sum(1 for company in companies if _derive_company_status(company) == "Expired")

    monthly_revenue = sum(_company_plan_price(company.get("plan")) for company in companies if _derive_company_status(company) == "Active")
    today_registrations = sum(1 for company in companies if company.get("createdAt"))
    return {
        "totalCompanies": total_companies,
        "trialCompanies": trial_companies,
        "activeSubscriptions": active_subscriptions,
        "expiredSubscriptions": expired_subscriptions,
        "monthlyRevenue": round(monthly_revenue, 2),
        "todayRegistrations": today_registrations,
    }


@api_router.get("/admin/companies")
async def admin_companies(
    search: Optional[str] = None,
    status: Optional[str] = None,
    plan: Optional[str] = None,
    trial_ending_in_next_3_days: bool = False,
    expired: bool = False,
    active: bool = False,
    current_admin: dict = Depends(get_current_admin),
):
    companies = await db.companies.find({}).sort("createdAt", -1).to_list(1000)
    results = []
    now = _utc_now()

    for company in companies:
        derived_status = _derive_company_status(company)

        if status and derived_status.lower() != status.lower():
            continue
        if plan and (company.get("plan") or "Basic") != plan:
            continue
        if expired and derived_status != "Expired":
            continue
        if active and derived_status != "Active":
            continue
        if trial_ending_in_next_3_days:
            trial_end = company.get("trialEnd")
            if not trial_end:
                continue
            try:
                trial_end_dt = trial_end if isinstance(trial_end, datetime) else datetime.fromisoformat(str(trial_end))
                if derived_status != "Trial" or trial_end_dt < now or trial_end_dt > now + timedelta(days=3):
                    continue
            except Exception:
                continue

        if search:
            haystack = " ".join([
                str(company.get("companyName") or ""),
                str(company.get("ownerName") or ""),
                str(company.get("email") or ""),
                str(company.get("phone") or ""),
            ]).lower()
            if search.lower() not in haystack:
                continue

        results.append(_company_payload(company))

    return results


@api_router.get("/admin/companies/{company_id}")
async def admin_company_detail(company_id: str, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        **_company_payload(company),
        "businessName": company.get("businessName") or company.get("companyName"),
        "registrationDate": _serialize_datetime(company.get("createdAt")),
        "trialStart": _serialize_datetime(company.get("trialStart")),
        "trialEnd": _serialize_datetime(company.get("trialEnd")),
        "subscriptionStart": _serialize_datetime(company.get("subscriptionStart")),
        "subscriptionEnd": _serialize_datetime(company.get("subscriptionEnd")),
        "nextBillingDate": _serialize_datetime(company.get("subscriptionEnd")),
        "paymentStatus": "Paid" if company.get("subscriptionEnd") else "Pending",
        "subscriptionHistory": company.get("subscriptionHistory") or [],
        "paymentHistory": company.get("paymentHistory") or [{"date": _serialize_datetime(company.get("createdAt")), "method": "Bank Transfer", "amount": 49.0, "status": "Paid", "referenceNumber": "AUTO-INIT"}],
        "loginHistory": company.get("loginHistory") or [],
        "deviceList": company.get("deviceList") or [{"type": "Web", "lastSeen": _serialize_datetime(company.get("lastLogin"))}],
        "activitySummary": {
            "totalSales": 0,
            "totalPurchaseOrders": 0,
            "totalProducts": 0,
            "totalUsers": 1,
            "lastPOSTransaction": None,
            "lastPurchaseTransaction": None,
        },
    }


@api_router.post("/admin/companies/{company_id}/extend-trial")
async def admin_extend_trial(company_id: str, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    current_trial_end = company.get("trialEnd")
    if isinstance(current_trial_end, datetime):
        new_trial_end = current_trial_end + timedelta(days=7)
    else:
        try:
            new_trial_end = datetime.fromisoformat(str(current_trial_end)) + timedelta(days=7)
        except Exception:
            new_trial_end = _utc_now() + timedelta(days=7)

    await db.companies.update_one(
        {"_id": ObjectId(company_id)},
        {"$set": {"trialEnd": new_trial_end, "status": "Trial", "updatedAt": _utc_now()}},
    )
    return {"message": "Trial extended"}


@api_router.post("/admin/companies/{company_id}/activate-subscription")
async def admin_activate_subscription(company_id: str, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    now = _utc_now()
    await db.companies.update_one(
        {"_id": ObjectId(company_id)},
        {"$set": {"status": "Active", "subscriptionStart": now, "subscriptionEnd": now + timedelta(days=30), "updatedAt": now}},
    )
    return {"message": "Subscription activated"}


@api_router.post("/admin/companies/{company_id}/suspend")
async def admin_suspend_company(company_id: str, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.companies.update_one(
        {"_id": ObjectId(company_id)},
        {"$set": {"status": "Suspended", "updatedAt": _utc_now()}},
    )
    return {"message": "Account suspended"}


@api_router.post("/admin/companies/{company_id}/plan")
async def admin_change_plan(company_id: str, payload: AdminPlanUpdate, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.companies.update_one(
        {"_id": ObjectId(company_id)},
        {"$set": {"plan": payload.plan, "updatedAt": _utc_now()}},
    )
    return {"message": "Plan updated"}


@api_router.post("/admin/companies/{company_id}/reset-password")
async def admin_reset_password(company_id: str, payload: AdminResetPassword, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.users.update_one(
        {"email": company.get("email")},
        {"$set": {"password": hash_password(payload.password), "updated_at": _utc_now()}},
    )
    return {"message": "Password reset"}


@api_router.post("/admin/companies/{company_id}/impersonate")
async def admin_impersonate(company_id: str, current_admin: dict = Depends(get_current_admin)):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    access_token = create_access_token({"user_id": str(company.get("_id")), "role": "company", "email": company.get("email")})
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.post("/subscriptions/payment-success")
async def payment_success_callback(payload: PaymentSuccessCallback):
    company = None
    if payload.companyId:
        company = await db.companies.find_one({"_id": ObjectId(payload.companyId)})
    if not company and payload.email:
        company = await db.companies.find_one({"email": payload.email})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    now = _utc_now()
    subscription_end = now + timedelta(days=30)
    payment_record = {
        "date": now,
        "method": payload.method,
        "amount": payload.amount,
        "status": "Paid",
        "referenceNumber": payload.reference or f"PAY-{now.strftime('%Y%m%d%H%M%S')}",
    }

    await db.companies.update_one(
        {"_id": company.get("_id")},
        {"$set": {
            "status": "Active",
            "plan": company.get("plan") or "Basic",
            "subscriptionStart": now,
            "subscriptionEnd": subscription_end,
            "paymentStatus": "Paid",
            "updatedAt": now,
        }, "$push": {"paymentHistory": payment_record}},
    )
    return {"message": "Subscription activated", "paymentStatus": "Paid"}


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
    
    normalized_payment_method = normalize_payment_method(sale.payment_method)
    if normalized_payment_method not in VALID_PAYMENT_METHODS:
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
        "payment_method": normalized_payment_method,
        "payment_reference": sale.payment_reference.strip() if sale.payment_reference and sale.payment_reference.strip() else None,
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
        "payment_method": normalized_payment_method,
        "payment_reference": sale.payment_reference.strip() if sale.payment_reference and sale.payment_reference.strip() else None,
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
        "payment_method": sale.get("payment_method"),
        "payment_reference": sale.get("payment_reference"),
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
