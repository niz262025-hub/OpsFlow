#!/usr/bin/env python3
"""
BizFlow Lite Backend API Test Suite
Tests all backend endpoints with proper authentication
"""

import requests
import json
from datetime import datetime

# API Configuration
BASE_URL = "https://sales-dashboard-685.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "admin@bizflow.com"
TEST_PASSWORD = "admin123"

# Global variables
auth_token = None
test_category_id = None
test_product_id = None
test_sale_id = None

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"{'='*60}")

def print_result(success, message, response=None):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if response and not success:
        print(f"Response: {response.text if hasattr(response, 'text') else response}")

def test_auth_login():
    """Test POST /api/auth/login with valid credentials"""
    global auth_token
    print_test_header("Authentication - Login")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                auth_token = data["access_token"]
                user = data["user"]
                print_result(True, f"Login successful for {user['email']}")
                print(f"   Trial days remaining: {user.get('trial_days_remaining', 'N/A')}")
                return True
            else:
                print_result(False, "Missing access_token or user in response", response)
                return False
        else:
            print_result(False, f"Login failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during login: {str(e)}")
        return False

def test_auth_register():
    """Test POST /api/auth/register with new user"""
    print_test_header("Authentication - Register New User")
    
    try:
        # Use timestamp to create unique email
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_email = f"testuser{timestamp}@bizflow.com"
        
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": new_email,
                "password": "testpass123",
                "company_name": "Test Company"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                user = data["user"]
                trial_days = user.get("trial_days_remaining", 0)
                if trial_days == 14:
                    print_result(True, f"Registration successful with 14 trial days for {new_email}")
                    return True
                else:
                    print_result(False, f"Trial days is {trial_days}, expected 14")
                    return False
            else:
                print_result(False, "Missing access_token or user in response", response)
                return False
        else:
            print_result(False, f"Registration failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during registration: {str(e)}")
        return False

def test_auth_me():
    """Test GET /api/auth/me with valid token"""
    print_test_header("Authentication - Get Current User")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "email" in data and "trial_days_remaining" in data:
                print_result(True, f"User info retrieved: {data['email']}")
                print(f"   Trial days remaining: {data['trial_days_remaining']}")
                print(f"   Company: {data.get('company_name', 'N/A')}")
                return True
            else:
                print_result(False, "Missing required fields in response", response)
                return False
        else:
            print_result(False, f"Get user failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get user: {str(e)}")
        return False

def test_categories_get():
    """Test GET /api/categories"""
    print_test_header("Categories - Get All")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/categories", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Retrieved {len(data)} categories")
                for cat in data[:3]:  # Show first 3
                    print(f"   - {cat.get('name', 'N/A')} (ID: {cat.get('id', 'N/A')})")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Get categories failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get categories: {str(e)}")
        return False

def test_categories_create():
    """Test POST /api/categories to create new category"""
    global test_category_id
    print_test_header("Categories - Create New")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        category_name = f"Test Category {timestamp}"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/categories",
            headers=headers,
            json={"name": category_name}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "name" in data:
                test_category_id = data["id"]
                print_result(True, f"Category created: {data['name']} (ID: {data['id']})")
                return True
            else:
                print_result(False, "Missing id or name in response", response)
                return False
        else:
            print_result(False, f"Create category failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during create category: {str(e)}")
        return False

def test_categories_update():
    """Test PUT /api/categories/{id} to update category"""
    print_test_header("Categories - Update")
    
    if not auth_token or not test_category_id:
        print_result(False, "No auth token or category ID available")
        return False
    
    try:
        updated_name = f"Updated Category {datetime.now().strftime('%H%M%S')}"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.put(
            f"{BASE_URL}/categories/{test_category_id}",
            headers=headers,
            json={"name": updated_name}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("name") == updated_name:
                print_result(True, f"Category updated to: {updated_name}")
                return True
            else:
                print_result(False, "Category name not updated correctly", response)
                return False
        else:
            print_result(False, f"Update category failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during update category: {str(e)}")
        return False

def test_categories_delete_with_products():
    """Test DELETE /api/categories/{id} should fail if products exist"""
    print_test_header("Categories - Delete (with products check)")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        # First get a category that might have products
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/categories", headers=headers)
        
        if response.status_code != 200:
            print_result(False, "Could not fetch categories for delete test")
            return False
        
        categories = response.json()
        if not categories:
            print_result(False, "No categories available for delete test")
            return False
        
        # Try to delete the first category (might have products)
        cat_id = categories[0]["id"]
        response = requests.delete(
            f"{BASE_URL}/categories/{cat_id}",
            headers=headers
        )
        
        # We expect either 400 (has products) or 200 (no products)
        if response.status_code == 400:
            print_result(True, "Delete correctly prevented for category with products")
            return True
        elif response.status_code == 200:
            print_result(True, "Category deleted (had no products)")
            return True
        else:
            print_result(False, f"Unexpected status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during delete category: {str(e)}")
        return False

def test_products_get():
    """Test GET /api/products"""
    print_test_header("Products - Get All")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/products", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Retrieved {len(data)} products")
                for prod in data[:3]:  # Show first 3
                    print(f"   - {prod.get('name', 'N/A')} (SKU: {prod.get('sku', 'N/A')}, Stock: {prod.get('stock_quantity', 0)})")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Get products failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get products: {str(e)}")
        return False

def test_products_search():
    """Test GET /api/products?search=Mouse"""
    print_test_header("Products - Search")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/products?search=Mouse", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Search returned {len(data)} products")
                for prod in data:
                    print(f"   - {prod.get('name', 'N/A')}")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Search products failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during search products: {str(e)}")
        return False

def test_products_create():
    """Test POST /api/products to create new product"""
    global test_product_id
    print_test_header("Products - Create New")
    
    if not auth_token or not test_category_id:
        print_result(False, "No auth token or category ID available")
        return False
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/products",
            headers=headers,
            json={
                "name": f"Test Product {timestamp}",
                "sku": f"TEST{timestamp}",
                "category_id": test_category_id,
                "selling_price": 99.99,
                "stock_quantity": 100
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data:
                test_product_id = data["id"]
                print_result(True, f"Product created: {data['name']} (Stock: {data['stock_quantity']})")
                return True
            else:
                print_result(False, "Missing id in response", response)
                return False
        else:
            print_result(False, f"Create product failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during create product: {str(e)}")
        return False

def test_products_update():
    """Test PUT /api/products/{id} to update product"""
    print_test_header("Products - Update")
    
    if not auth_token or not test_product_id:
        print_result(False, "No auth token or product ID available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.put(
            f"{BASE_URL}/products/{test_product_id}",
            headers=headers,
            json={"selling_price": 149.99, "stock_quantity": 150}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("selling_price") == 149.99 and data.get("stock_quantity") == 150:
                print_result(True, f"Product updated: Price={data['selling_price']}, Stock={data['stock_quantity']}")
                return True
            else:
                print_result(False, "Product not updated correctly", response)
                return False
        else:
            print_result(False, f"Update product failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during update product: {str(e)}")
        return False

def test_products_delete():
    """Test DELETE /api/products/{id}"""
    print_test_header("Products - Delete")
    
    if not auth_token or not test_product_id:
        print_result(False, "No auth token or product ID available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(
            f"{BASE_URL}/products/{test_product_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            print_result(True, "Product deleted successfully")
            return True
        else:
            print_result(False, f"Delete product failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during delete product: {str(e)}")
        return False

def test_sales_create():
    """Test POST /api/sales to create sale and verify stock decreases"""
    global test_sale_id
    print_test_header("Sales - Create Sale")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        # First get a product with stock
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/products", headers=headers)
        
        if response.status_code != 200:
            print_result(False, "Could not fetch products for sale test")
            return False
        
        products = response.json()
        if not products:
            print_result(False, "No products available for sale test")
            return False
        
        # Find a product with stock
        product = None
        for p in products:
            if p.get("stock_quantity", 0) > 0:
                product = p
                break
        
        if not product:
            print_result(False, "No products with stock available")
            return False
        
        product_id = product["id"]
        initial_stock = product["stock_quantity"]
        sale_quantity = min(2, initial_stock)
        
        # Create sale
        response = requests.post(
            f"{BASE_URL}/sales",
            headers=headers,
            json={
                "product_id": product_id,
                "quantity": sale_quantity,
                "payment_method": "Cash"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_sale_id = data.get("id")
            
            # Verify stock decreased
            response = requests.get(f"{BASE_URL}/products", headers=headers)
            if response.status_code == 200:
                updated_products = response.json()
                updated_product = next((p for p in updated_products if p["id"] == product_id), None)
                
                if updated_product:
                    new_stock = updated_product["stock_quantity"]
                    expected_stock = initial_stock - sale_quantity
                    
                    if new_stock == expected_stock:
                        print_result(True, f"Sale created and stock decreased from {initial_stock} to {new_stock}")
                        return True
                    else:
                        print_result(False, f"Stock not decreased correctly. Expected {expected_stock}, got {new_stock}")
                        return False
                else:
                    print_result(False, "Could not find product after sale")
                    return False
            else:
                print_result(False, "Could not verify stock after sale")
                return False
        else:
            print_result(False, f"Create sale failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during create sale: {str(e)}")
        return False

def test_sales_insufficient_stock():
    """Test POST /api/sales with insufficient stock"""
    print_test_header("Sales - Insufficient Stock Error")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        # Get a product
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/products", headers=headers)
        
        if response.status_code != 200 or not response.json():
            print_result(False, "Could not fetch products for insufficient stock test")
            return False
        
        product = response.json()[0]
        product_id = product["id"]
        
        # Try to sell more than available
        response = requests.post(
            f"{BASE_URL}/sales",
            headers=headers,
            json={
                "product_id": product_id,
                "quantity": 999999,
                "payment_method": "Cash"
            }
        )
        
        if response.status_code == 400:
            print_result(True, "Insufficient stock error correctly returned")
            return True
        else:
            print_result(False, f"Expected 400 status, got {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during insufficient stock test: {str(e)}")
        return False

def test_sales_get():
    """Test GET /api/sales to list all sales"""
    print_test_header("Sales - Get All")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/sales", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Retrieved {len(data)} sales")
                for sale in data[:3]:  # Show first 3
                    print(f"   - {sale.get('product_name', 'N/A')} x{sale.get('quantity', 0)} = MYR {sale.get('total_price', 0)}")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Get sales failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get sales: {str(e)}")
        return False

def test_sales_payment_methods():
    """Test sales with different payment methods"""
    print_test_header("Sales - Payment Methods (Cash & QR)")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        # Get a product
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/products", headers=headers)
        
        if response.status_code != 200 or not response.json():
            print_result(False, "Could not fetch products for payment method test")
            return False
        
        products = [p for p in response.json() if p.get("stock_quantity", 0) >= 2]
        if not products:
            print_result(False, "No products with sufficient stock for payment method test")
            return False
        
        product_id = products[0]["id"]
        
        # Test Cash payment
        response_cash = requests.post(
            f"{BASE_URL}/sales",
            headers=headers,
            json={
                "product_id": product_id,
                "quantity": 1,
                "payment_method": "Cash"
            }
        )
        
        # Test QR payment
        response_qr = requests.post(
            f"{BASE_URL}/sales",
            headers=headers,
            json={
                "product_id": product_id,
                "quantity": 1,
                "payment_method": "QR"
            }
        )
        
        if response_cash.status_code == 200 and response_qr.status_code == 200:
            print_result(True, "Both Cash and QR payment methods work correctly")
            return True
        else:
            print_result(False, f"Payment methods failed: Cash={response_cash.status_code}, QR={response_qr.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Exception during payment methods test: {str(e)}")
        return False

def test_dashboard():
    """Test GET /api/dashboard"""
    print_test_header("Dashboard - Get Metrics")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/dashboard", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["today_sales", "total_products", "total_stock", "low_stock"]
            
            if all(field in data for field in required_fields):
                print_result(True, "Dashboard metrics retrieved")
                print(f"   Today's Sales: MYR {data['today_sales']}")
                print(f"   Total Products: {data['total_products']}")
                print(f"   Total Stock: {data['total_stock']}")
                print(f"   Low Stock Items: {data['low_stock']}")
                return True
            else:
                print_result(False, "Missing required fields in dashboard response", response)
                return False
        else:
            print_result(False, f"Get dashboard failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get dashboard: {str(e)}")
        return False

def test_reports_daily_sales():
    """Test GET /api/reports/daily-sales?days=7"""
    print_test_header("Reports - Daily Sales")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/reports/daily-sales?days=7", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Daily sales report retrieved ({len(data)} days)")
                for day in data[:3]:  # Show first 3
                    print(f"   - {day.get('date', 'N/A')}: MYR {day.get('total', 0)}")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Get daily sales failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get daily sales: {str(e)}")
        return False

def test_reports_monthly_sales():
    """Test GET /api/reports/monthly-sales?months=6"""
    print_test_header("Reports - Monthly Sales")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/reports/monthly-sales?months=6", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Monthly sales report retrieved ({len(data)} months)")
                for month in data[:3]:  # Show first 3
                    print(f"   - {month.get('month', 'N/A')}: MYR {month.get('total', 0)}")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Get monthly sales failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get monthly sales: {str(e)}")
        return False

def test_reports_top_products():
    """Test GET /api/reports/top-products?limit=5"""
    print_test_header("Reports - Top Products")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/reports/top-products?limit=5", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Top products report retrieved ({len(data)} products)")
                for prod in data[:5]:  # Show all
                    print(f"   - {prod.get('product_name', 'N/A')}: {prod.get('quantity', 0)} sold, MYR {prod.get('revenue', 0)} revenue")
                return True
            else:
                print_result(False, "Response is not a list", response)
                return False
        else:
            print_result(False, f"Get top products failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during get top products: {str(e)}")
        return False

def test_settings_update():
    """Test PUT /api/settings to update company name and low stock threshold"""
    print_test_header("Settings - Update")
    
    if not auth_token:
        print_result(False, "No auth token available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.put(
            f"{BASE_URL}/settings",
            headers=headers,
            json={
                "company_name": "Updated BizFlow Company",
                "low_stock_threshold": 15
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("company_name") == "Updated BizFlow Company" and data.get("low_stock_threshold") == 15:
                print_result(True, f"Settings updated: {data['company_name']}, threshold={data['low_stock_threshold']}")
                return True
            else:
                print_result(False, "Settings not updated correctly", response)
                return False
        else:
            print_result(False, f"Update settings failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Exception during update settings: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*60)
    print("BIZFLOW LITE BACKEND API TEST SUITE")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("="*60)
    
    results = {}
    
    # Authentication Tests
    results["Login"] = test_auth_login()
    results["Register"] = test_auth_register()
    results["Get Current User"] = test_auth_me()
    
    # Categories Tests
    results["Get Categories"] = test_categories_get()
    results["Create Category"] = test_categories_create()
    results["Update Category"] = test_categories_update()
    results["Delete Category (with products check)"] = test_categories_delete_with_products()
    
    # Products Tests
    results["Get Products"] = test_products_get()
    results["Search Products"] = test_products_search()
    results["Create Product"] = test_products_create()
    results["Update Product"] = test_products_update()
    results["Delete Product"] = test_products_delete()
    
    # Sales Tests
    results["Create Sale (verify stock decrease)"] = test_sales_create()
    results["Insufficient Stock Error"] = test_sales_insufficient_stock()
    results["Get Sales"] = test_sales_get()
    results["Payment Methods (Cash & QR)"] = test_sales_payment_methods()
    
    # Dashboard Tests
    results["Dashboard Metrics"] = test_dashboard()
    
    # Reports Tests
    results["Daily Sales Report"] = test_reports_daily_sales()
    results["Monthly Sales Report"] = test_reports_monthly_sales()
    results["Top Products Report"] = test_reports_top_products()
    
    # Settings Tests
    results["Update Settings"] = test_settings_update()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)
    total = len(results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    print("\n" + "="*60)
    print("DETAILED RESULTS")
    print("="*60)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*60)
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
