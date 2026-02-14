# FoodZippy Backend

Production-ready Node.js backend for FoodZippy vendor registration system.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (Mongoose ODM)
- **Cloudinary** - Image storage
- **JWT** - Admin authentication
- **Multer** - File upload handling

## Features

- ✅ Vendor registration with image upload
- ✅ Admin authentication (JWT-based)
- ✅ Full vendor CRUD operations
- ✅ Monthly vendor analytics
- ✅ Fast, optimized API responses
- ✅ Indexed database fields
- ✅ Clean error handling

## Project Structure

```
backend/
├── server.js                   # Entry point
├── config/
│   ├── db.js                   # MongoDB connection
│   └── cloudinary.js           # Cloudinary config
├── models/
│   └── Vendor.js               # Vendor schema
├── controllers/
│   ├── vendor.controller.js    # Vendor registration logic
│   └── admin.controller.js     # Admin operations
├── routes/
│   ├── vendor.routes.js        # Public vendor routes
│   └── admin.routes.js         # Protected admin routes
├── middleware/
│   ├── upload.js               # Multer file upload
│   └── adminAuth.js            # JWT authentication
├── .env                        # Environment variables
└── package.json                # Dependencies
```

## Installation

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Update the `.env` file with your credentials:
   ```env
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb://localhost:27017/foodzippy
   
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRES_IN=7d
   
   ADMIN_EMAIL=admin@foodzippy.com
   ADMIN_PASSWORD=Admin@123
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Public Endpoints

#### Register Vendor
```http
POST /api/vendors/register
Content-Type: multipart/form-data

Body (form-data):
- restaurantImage (file)
- restaurantName
- approxDeliveryTime
- approxPriceForTwo
- certificateCode
- mobileNumber
- shortDescription
- services (JSON array)
- isPureVeg (boolean)
- isPopular (boolean)
- deliveryChargeType
- fixedCharge
- dynamicCharge
- storeCharge
- deliveryRadius
- minimumOrderPrice
- commissionRate
- bankName
- bankCode
- recipientName
- accountNumber
- paypalId
- upiId
- searchLocation
- fullAddress
- pincode
- landmark
- latitude
- longitude
- city
- state
- mapType
- loginEmail
- loginPassword
- categories (JSON array)
```

### Admin Endpoints

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@foodzippy.com",
  "password": "Admin@123"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "admin": {
    "email": "admin@foodzippy.com",
    "role": "admin"
  }
}
```

#### Get All Vendors
```http
GET /api/admin/vendors?page=1&limit=10&status=pending&city=Mumbai&search=keyword
Authorization: Bearer <token>

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- status: Filter by status (pending/approved/rejected)
- city: Filter by city
- search: Search by name, email, or mobile
```

#### Get Single Vendor
```http
GET /api/admin/vendors/:id
Authorization: Bearer <token>
```

#### Update Vendor
```http
PATCH /api/admin/vendors/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "restaurantStatus": "approved",
  "isPopular": true
}
```

#### Get Vendor Analytics
```http
GET /api/admin/vendors/analytics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "monthlyRequests": [
      { "year": 2025, "month": 1, "count": 15 },
      { "year": 2025, "month": 2, "count": 23 }
    ],
    "summary": {
      "total": 150,
      "pending": 45,
      "approved": 85,
      "rejected": 20
    }
  }
}
```

### Health Check
```http
GET /health

Response:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

## Database Schema

The Vendor model includes all fields from the frontend with:
- Automatic timestamps (createdAt, updatedAt)
- Indexed fields: restaurantName, restaurantStatus, mobileNumber, loginEmail, city
- Unique constraint on loginEmail
- Default restaurantStatus: "pending"

## Security Features

- JWT-based admin authentication
- Password stored in environment variables
- Token expiration (7 days default)
- File type validation (images only)
- File size limit (5MB)
- CORS enabled

## Performance Optimizations

- MongoDB indexes on frequently queried fields
- Lean queries for read operations
- Memory-based file uploads (no disk writes)
- Aggregation pipeline for analytics
- Pagination support

## Error Handling

All endpoints include proper error handling:
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient privileges)
- 404: Not Found
- 500: Internal Server Error

## Notes

- Vendor authentication is NOT implemented (per requirements)
- Admin cannot change password (single admin setup)
- All vendor registrations default to "pending" status
- Images are stored in Cloudinary folder: `foodzippy/vendors`
- Field names match frontend exactly (no modifications)

## Development

Run with auto-reload:
```bash
npm run dev
```

Requires Node.js 18+ for native `--watch` flag support.

## Production Deployment

1. Set NODE_ENV to "production"
2. Use strong JWT_SECRET
3. Configure MongoDB replica set for high availability
4. Enable Cloudinary auto-optimization
5. Set up proper CORS origins
6. Use process manager (PM2 recommended)

## License

ISC
