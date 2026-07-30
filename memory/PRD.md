# BizFlow Lite - Product Requirements Document

## Overview
BizFlow Lite is a modern Android business management app built with Expo React Native and FastAPI. It provides a clean and professional POS-style interface for managing products, sales, and inventory with Malaysian Ringgit (MYR) currency support.

## Tech Stack
- **Frontend:** Expo Router (React Native), TypeScript, react-native-reanimated
- **Backend:** FastAPI (Python), MongoDB
- **Authentication:** JWT tokens with bcrypt password hashing
- **Storage:** MongoDB for data, expo-secure-store for auth tokens

## Features Implemented

### 1. Authentication
- **Splash Screen** with animated BizFlow Lite "B" logo
- **Login Screen** with email/password validation
- **Register Screen** with company name, email, password
- 14-day free trial with automatic date tracking and expiration
- JWT-based authentication

### 2. Dashboard
- Welcome greeting with company name and 👋 emoji
- 4 metric cards:
  - Today's Sales (featured card in blue)
  - Products count
  - Stock Value (RM)
  - Total Stock
  - Low Stock alert
- Quick Actions grid: Add Product, New Sale, Reports
- Latest Sales list with time-ago formatting
- Load Sample Data button for demo purposes
- Smooth entrance animations using react-native-reanimated

### 3. Products Management
- Full CRUD operations (Create, Read, Update, Delete)
- Search products by name or SKU
- Fields: Name, SKU, Category, Selling Price, Stock Quantity
- User-managed custom categories
- Low stock visual indicators (warning color)
- Bottom sheet modal for add/edit forms

### 4. Sales
- Create new sales with product selection
- Product search with stock display
- Quantity input with stock validation
- Payment methods: Cash and QR
- Real-time total calculation
- Sales history with time-based formatting
- Stock auto-decrement on sale

### 5. Reports
- Daily Sales bar chart (last 7 days)
- Monthly Sales bar chart (last 6 months)
- Top Selling Products ranking
- Summary statistics
- Total sales aggregations

### 6. Settings
- Company Profile with editable company name
- Low Stock Alert threshold (configurable, default 10)
- Currency display (MYR)
- 14-Day Free Trial status with progress bar
- Upgrade CTA
- Logout functionality

### 7. Bottom Navigation
- Dashboard, Products, Sales, Reports, Settings
- Modern tab bar with active state highlighting

## Design System
- **Primary Color:** #2563EB (Blue)
- **Background:** #F8FAFC (Light Gray)
- **Cards:** White with rounded corners (16-20px)
- **Shadows:** Subtle elevation for depth
- **Typography:** System fonts with clear hierarchy
- **Icons:** Material Icons from @expo/vector-icons

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET/POST/PUT/DELETE /api/categories` - Category CRUD
- `GET/POST/PUT/DELETE /api/products` - Product CRUD
- `GET/POST /api/sales` - Sales management
- `GET /api/dashboard` - Dashboard metrics with latest sales
- `GET /api/reports/*` - Sales reports
- `PUT /api/settings` - Update user settings
- `POST /api/seed-data` - Load sample data

## Testing
- All 21 backend API endpoints tested and passing
- Frontend UI verified via screenshots
- Test credentials in `/app/memory/test_credentials.md`

## Sample Data
When users click "Load Sample Data", the app creates:
- 3 categories (Electronics, Clothing, Food & Beverages)
- 7 sample products across categories
- 15 sample sales with mixed payment methods

## Future Enhancements
- Company logo upload (base64 storage)
- Multiple user accounts per company
- Barcode scanning for products
- Receipt printing/sharing
- Data export (CSV/PDF)
- Tax calculation
- Discount management
