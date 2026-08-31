# SHINEX Marketplace API Documentation

## Base URL
- **Production**: `https://shinex-marketplace.onrender.com/api`
- **Development**: `http://localhost:5000/api`

## Authentication
- **Header**: `Authorization: Bearer <your_jwt_token>`

---

## RESPONSE FORMAT

### Success
{
  "success": true,
  "data": { ... }
}

### Error
{
  "success": false,
  "message": "Error description"
}

---

## 1. AUTH ENDPOINTS

### POST /auth/register
**Auth:** No

**Request:**
{
  "full_name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "08012345678",
  "password": "securepassword123"
}

**Response:**
{
  "success": true,
  "message": "Account created successfully!",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "phone": "08012345678",
      "avatar_url": null,
      "is_admin": false
    },
    "token": "jwt_token_here"
  }
}

---

### POST /auth/login
**Auth:** No

**Request:**
{
  "email": "john@example.com",
  "password": "securepassword123"
}

**Response:**
{
  "success": true,
  "message": "Login successful!",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "phone": "08012345678",
      "avatar_url": null,
      "bio": null,
      "location": null,
      "whatsapp": null,
      "shop_name": null,
      "shop_description": null,
      "is_admin": false
    },
    "token": "jwt_token_here"
  }
}

---

### GET /auth/me
**Auth:** Yes

**Response:**
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "phone": "08012345678",
      "avatar_url": null,
      "bio": "I sell quality phones",
      "location": "Lagos, Nigeria",
      "whatsapp": "08012345678",
      "shop_name": "JD Tech Store",
      "shop_description": "Quality smartphones",
      "is_admin": false,
      "is_suspended": false
    }
  }
}

---

### POST /auth/logout
**Auth:** Yes

**Response:**
{
  "success": true,
  "message": "Logged out successfully"
}

---

### POST /auth/forgot-password
**Auth:** No

**Request:**
{
  "email": "john@example.com"
}

**Response:**
{
  "success": true,
  "message": "If an account exists with this email, you will receive password reset instructions."
}

---

### POST /auth/reset-password
**Auth:** No

**Request:**
{
  "token": "reset_token_here",
  "new_password": "newpassword123"
}

**Response:**
{
  "success": true,
  "message": "Password reset successfully"
}

---

## 2. USER ENDPOINTS

### GET /users/me
**Auth:** Yes

**Response:**
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "phone": "08012345678",
      "bio": "I sell quality phones",
      "location": "Lagos, Nigeria",
      "whatsapp": "08012345678",
      "avatar_url": "https://cloudinary.com/avatar.jpg",
      "shop_name": "JD Tech Store",
      "shop_description": "Quality smartphones",
      "is_admin": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}

---

### GET /users/:username
**Auth:** No

**Response:**
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "full_name": "John Doe",
      "avatar_url": "https://cloudinary.com/avatar.jpg",
      "bio": "I sell quality phones",
      "location": "Lagos, Nigeria",
      "whatsapp": "08012345678",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "shop": {
      "shop_name": "JD Tech Store",
      "shop_description": "Quality smartphones",
      "product_count": 15,
      "username": "johndoe",
      "profile_picture": "https://cloudinary.com/avatar.jpg",
      "bio": "I sell quality phones",
      "location": "Lagos, Nigeria",
      "whatsapp": "08012345678"
    }
  }
}

---

### GET /users/:username/shop
**Auth:** No

**Query:** `?page=1&limit=20`

**Response:**
{
  "success": true,
  "data": {
    "shop": {
      "shop_name": "JD Tech Store",
      "shop_description": "Quality smartphones",
      "username": "johndoe",
      "full_name": "John Doe",
      "avatar_url": "https://cloudinary.com/avatar.jpg",
      "bio": "I sell quality phones",
      "location": "Lagos, Nigeria",
      "whatsapp": "08012345678",
      "product_count": 15
    },
    "products": [
      {
        "id": "uuid",
        "name": "iPhone 13",
        "description": "Good condition",
        "price": 450000,
        "category_id": "uuid",
        "condition": "used",
        "location": "Lagos",
        "is_sold": false,
        "is_active": true,
        "views_count": 50,
        "created_at": "2024-01-01T00:00:00Z",
        "primary_image": "https://cloudinary.com/product.jpg"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}

---

### PUT /users/me
**Auth:** Yes

**Request:**
{
  "full_name": "John Doe Updated",
  "bio": "Updated bio",
  "location": "Abuja, Nigeria",
  "whatsapp": "08098765432",
  "shop_name": "JD Updated Store",
  "shop_description": "Updated shop description"
}

**Response:**
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "full_name": "John Doe Updated",
      "bio": "Updated bio",
      "location": "Abuja, Nigeria",
      "whatsapp": "08098765432",
      "shop_name": "JD Updated Store",
      "shop_description": "Updated shop description"
    }
  }
}

---

### POST /users/me/avatar
**Auth:** Yes

**Request:** multipart/form-data with field `image`

**Response:**
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "avatar_url": "https://cloudinary.com/avatar.jpg",
      "avatar_public_id": "shinex_avatars/avatar_123"
    }
  }
}

---

## 3. PRODUCT ENDPOINTS

### POST /products
**Auth:** Yes

**Request:** multipart/form-data
- `name` (required)
- `price` (required)
- `category_id` (required)
- `description`
- `condition` (new/used/refurbished)
- `location`
- `images` (max 5)

**Response:**
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "id": "uuid",
      "user_id": "uuid",
      "name": "iPhone 13",
      "description": "Clean used phone",
      "price": 450000,
      "condition": "used",
      "location": "Lagos",
      "category_id": "uuid",
      "is_sold": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "images": [
        {
          "id": "uuid",
          "image_url": "https://cloudinary.com/image1.jpg",
          "is_primary": true
        }
      ]
    }
  }
}

---

### GET /products
**Auth:** No

**Query:** `?search=phone&category=uuid&page=1&limit=20&sort=newest&min_price=1000&max_price=50000`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 13",
      "description": "Clean used phone",
      "price": 450000,
      "condition": "used",
      "location": "Lagos",
      "is_sold": false,
      "is_active": true,
      "views_count": 50,
      "created_at": "2024-01-01T00:00:00Z",
      "primary_image": "https://cloudinary.com/product.jpg",
      "seller": {
        "id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "avatar_url": "https://cloudinary.com/avatar.jpg",
        "shop_name": "JD Tech Store",
        "whatsapp": "08012345678",
        "location": "Lagos"
      },
      "category": {
        "id": "uuid",
        "name": "Electronics",
        "slug": "electronics"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}

---

### GET /products/:id
**Auth:** No

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "iPhone 13",
    "description": "Clean used phone",
    "price": 450000,
    "condition": "used",
    "location": "Lagos",
    "is_sold": false,
    "is_active": true,
    "views_count": 51,
    "created_at": "2024-01-01T00:00:00Z",
    "primary_image": "https://cloudinary.com/product.jpg",
    "seller": {
      "id": "uuid",
      "username": "johndoe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "08012345678",
      "bio": "I sell quality phones",
      "location": "Lagos",
      "whatsapp": "08012345678",
      "avatar_url": "https://cloudinary.com/avatar.jpg",
      "shop_name": "JD Tech Store",
      "shop_description": "Quality smartphones"
    },
    "category": {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics"
    },
    "images": [
      {
        "id": "uuid",
        "image_url": "https://cloudinary.com/image1.jpg",
        "is_primary": true
      }
    ]
  }
}

---

### PUT /products/:id
**Auth:** Yes (owner or admin)

**Request:** multipart/form-data
- `name`
- `price`
- `category_id`
- `description`
- `condition`
- `location`
- `images` (replaces all)

**Response:**
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {
      "id": "uuid",
      "name": "iPhone 13 Updated",
      "price": 400000
    }
  }
}

---

### DELETE /products/:id
**Auth:** Yes (owner or admin)

**Response:**
{
  "success": true,
  "message": "Product deleted successfully"
}

---

### PATCH /products/:id/sold
**Auth:** Yes (owner or admin)

**Request:**
{
  "is_sold": true
}

**Response:**
{
  "success": true,
  "message": "Product marked as sold",
  "data": {
    "id": "uuid",
    "is_sold": true
  }
}

---

### GET /products/categories/all
**Auth:** No

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Phones, laptops, accessories",
      "icon": "📱",
      "is_active": true
    }
  ]
}

---

## 4. FAVORITE ENDPOINTS

### POST /favorites/product/:productId
**Auth:** Yes

**Response:**
{
  "success": true,
  "message": "Product added to favorites",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "product_id": "uuid"
  }
}

---

### DELETE /favorites/product/:productId
**Auth:** Yes

**Response:**
{
  "success": true,
  "message": "Product removed from favorites"
}

---

### POST /favorites/seller/:sellerId
**Auth:** Yes

**Response:**
{
  "success": true,
  "message": "Seller added to favorites",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "seller_id": "uuid"
  }
}

---

### DELETE /favorites/seller/:sellerId
**Auth:** Yes

**Response:**
{
  "success": true,
  "message": "Seller removed from favorites"
}

---

### GET /favorites/products
**Auth:** Yes

**Query:** `?page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "name": "iPhone 13",
        "price": 450000,
        "primary_image": "https://cloudinary.com/product.jpg",
        "seller": {
          "username": "johndoe",
          "shop_name": "JD Tech Store"
        }
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}

---

### GET /favorites/sellers
**Auth:** Yes

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "seller": {
        "id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "avatar_url": "https://cloudinary.com/avatar.jpg",
        "shop_name": "JD Tech Store",
        "bio": "I sell quality phones"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}

---

### GET /favorites/product/:productId/check
**Auth:** Yes

**Response:**
{
  "success": true,
  "data": {
    "is_favorited": true
  }
}

---

### GET /favorites/seller/:sellerId/check
**Auth:** Yes

**Response:**
{
  "success": true,
  "data": {
    "is_favorited": true
  }
}

---

## 5. ADVERTISEMENT ENDPOINTS

### GET /advertisements/pricing
**Auth:** No

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "duration_days": 1,
      "price": 200,
      "is_active": true
    },
    {
      "id": "uuid",
      "duration_days": 3,
      "price": 500,
      "is_active": true
    },
    {
      "id": "uuid",
      "duration_days": 7,
      "price": 1000,
      "is_active": true
    }
  ]
}

---

### POST /advertisements
**Auth:** Yes

**Request:** multipart/form-data
- `title` (required)
- `description`
- `duration_id` (required)
- `image` (required)

**Response:**
{
  "success": true,
  "message": "Advertisement created. Please proceed to payment.",
  "data": {
    "advertisement": {
      "id": "uuid",
      "user_id": "uuid",
      "title": "My Ad",
      "description": "Ad description",
      "image_url": "https://cloudinary.com/ad.jpg",
      "duration_days": 7,
      "amount": 1000,
      "payment_status": "pending",
      "approval_status": "pending"
    },
    "payment_url": null
  }
}

---

### POST /advertisements/:id/pay
**Auth:** Yes (owner)

**Response:**
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://paystack.com/pay/abc123",
    "reference": "SHINEX-abc123-def456",
    "payment_id": "uuid"
  }
}

---

### GET /advertisements/payment/callback
**Auth:** No

**Query:** `?reference=SHINEX-abc123&trxref=abc123`

**Redirects to:** `FRONTEND_URL/advertise?payment=success&reference=xxx`

---

### GET /advertisements/:id/payment
**Auth:** Yes (owner)

**Response:**
{
  "success": true,
  "data": {
    "advertisement": {
      "payment_status": "paid",
      "approval_status": "pending",
      "starts_at": null,
      "expires_at": null
    },
    "payment": {
      "id": "uuid",
      "amount": 1000,
      "status": "success",
      "paystack_reference": "SHINEX-abc123",
      "paid_at": "2024-01-01T12:00:00Z"
    }
  }
}

---

### GET /advertisements/my
**Auth:** Yes

**Query:** `?page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Ad",
      "payment_status": "paid",
      "approval_status": "approved",
      "amount": 1000,
      "duration_days": 7,
      "expires_at": "2024-01-08T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}

---

### POST /advertisements/webhook/paystack
**Auth:** No

**Response:**
{
  "message": "Webhook processed successfully"
}

---

## 6. REPORT ENDPOINTS

### POST /reports
**Auth:** Yes

**Request:**
{
  "target_product_id": "uuid",
  "reason": "Spam",
  "description": "This product is spam"
}

**Response:**
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}

---

### GET /reports/my
**Auth:** Yes

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reason": "Spam",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z",
      "target_product": {
        "id": "uuid",
        "name": "iPhone 13"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}

---

## 7. CONTACT ENDPOINTS

### POST /contact
**Auth:** No

**Request:**
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "subject": "Question",
  "message": "I have a question..."
}

**Response:**
{
  "success": true,
  "message": "Your message has been sent successfully!",
  "data": {
    "id": "uuid",
    "status": "new",
    "created_at": "2024-01-01T00:00:00Z"
  }
}

---

### GET /contact/info
**Auth:** No

**Response:**
{
  "success": true,
  "data": {
    "email": "shinexlearning@gmail.com",
    "phone": "+234 706 757 4479",
    "whatsapp": "+234 802 505 2852",
    "address": null
  }
}

---

## 8. ADMIN ENDPOINTS

### GET /admin/users
**Auth:** Admin only

**Query:** `?search=johndoe&status=active&page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "johndoe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "08012345678",
      "is_admin": false,
      "is_suspended": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}

---

### GET /admin/users/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "08012345678",
    "is_admin": false,
    "is_suspended": false,
    "created_at": "2024-01-01T00:00:00Z",
    "stats": {
      "products": 15,
      "advertisements": 3,
      "reports": 2
    }
  }
}

---

### PATCH /admin/users/:id/suspend
**Auth:** Admin only

**Request:**
{
  "reason": "Violation of terms"
}

**Response:**
{
  "success": true,
  "message": "User suspended successfully",
  "data": {
    "id": "uuid",
    "is_suspended": true
  }
}

---

### PATCH /admin/users/:id/unsuspend
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "User unsuspended successfully"
}

---

### DELETE /admin/users/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "User deleted successfully"
}

---

### GET /admin/products
**Auth:** Admin only

**Query:** `?search=phone&page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 13",
      "price": 450000,
      "user": {
        "id": "uuid",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "category": {
        "id": "uuid",
        "name": "Electronics"
      },
      "is_active": true,
      "is_sold": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}

---

### GET /admin/products/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "iPhone 13",
    "description": "Clean used phone",
    "price": 450000,
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "category": {
      "id": "uuid",
      "name": "Electronics"
    },
    "images": [
      {
        "id": "uuid",
        "image_url": "https://cloudinary.com/image1.jpg",
        "is_primary": true
      }
    ],
    "created_at": "2024-01-01T00:00:00Z"
  }
}

---

### DELETE /admin/products/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Product deleted successfully"
}

---

### GET /admin/categories
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Phones, laptops",
      "icon": "📱",
      "is_active": true
    }
  ]
}

---

### POST /admin/categories
**Auth:** Admin only

**Request:**
{
  "name": "Gaming",
  "description": "Gaming consoles",
  "icon": "🎮"
}

**Response:**
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "uuid",
    "name": "Gaming",
    "slug": "gaming",
    "description": "Gaming consoles",
    "icon": "🎮",
    "is_active": true
  }
}

---

### PUT /admin/categories/:id
**Auth:** Admin only

**Request:**
{
  "name": "Gaming Updated",
  "description": "Updated description",
  "icon": "🎮",
  "is_active": true
}

**Response:**
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": "uuid",
    "name": "Gaming Updated",
    "slug": "gaming-updated",
    "description": "Updated description",
    "icon": "🎮",
    "is_active": true
  }
}

---

### DELETE /admin/categories/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Category deleted successfully"
}

---

### GET /admin/advertisements
**Auth:** Admin only

**Query:** `?status=pending&approval=pending&page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Ad",
      "user": {
        "id": "uuid",
        "username": "johndoe"
      },
      "duration": {
        "duration_days": 7,
        "price": 1000
      },
      "payment_status": "paid",
      "approval_status": "pending",
      "amount": 1000,
      "duration_days": 7,
      "expires_at": "2024-01-08T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}

---

### GET /admin/advertisements/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Ad",
    "description": "Ad description",
    "image_url": "https://cloudinary.com/ad.jpg",
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "duration": {
      "id": "uuid",
      "duration_days": 7,
      "price": 1000
    },
    "payment": {
      "id": "uuid",
      "amount": 1000,
      "status": "success",
      "paystack_reference": "SHINEX-abc123"
    },
    "payment_status": "paid",
    "approval_status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}

---

### PATCH /admin/advertisements/:id/approve
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Advertisement approved successfully",
  "data": {
    "id": "uuid",
    "approval_status": "approved",
    "starts_at": "2024-01-01T00:00:00Z",
    "expires_at": "2024-01-08T00:00:00Z"
  }
}

---

### PATCH /admin/advertisements/:id/reject
**Auth:** Admin only

**Request:**
{
  "reason": "Inappropriate content"
}

**Response:**
{
  "success": true,
  "message": "Advertisement rejected",
  "data": {
    "id": "uuid",
    "approval_status": "rejected",
    "rejection_reason": "Inappropriate content"
  }
}

---

### PATCH /admin/advertisements/:id/pause
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Advertisement paused",
  "data": {
    "id": "uuid",
    "approval_status": "paused"
  }
}

---

### DELETE /admin/advertisements/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Advertisement deleted successfully"
}

---

### GET /admin/durations
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "duration_days": 1,
      "price": 200,
      "is_active": true
    },
    {
      "id": "uuid",
      "duration_days": 7,
      "price": 1000,
      "is_active": true
    }
  ]
}

---

### POST /admin/durations
**Auth:** Admin only

**Request:**
{
  "duration_days": 120,
  "price": 8500,
  "is_active": true
}

**Response:**
{
  "success": true,
  "message": "Duration created successfully",
  "data": {
    "id": "uuid",
    "duration_days": 120,
    "price": 8500,
    "is_active": true
  }
}

---

### PUT /admin/durations/:id
**Auth:** Admin only

**Request:**
{
  "duration_days": 120,
  "price": 9000,
  "is_active": true
}

**Response:**
{
  "success": true,
  "message": "Duration updated successfully",
  "data": {
    "id": "uuid",
    "duration_days": 120,
    "price": 9000,
    "is_active": true
  }
}

---

### DELETE /admin/durations/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Duration deleted successfully"
}

---

### GET /admin/payments
**Auth:** Admin only

**Query:** `?status=success&search=SHINEX&page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "paystack_reference": "SHINEX-abc123",
      "amount": 1000,
      "status": "success",
      "user": {
        "id": "uuid",
        "username": "johndoe"
      },
      "advertisement": {
        "id": "uuid",
        "title": "My Ad"
      },
      "paid_at": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

---

### GET /admin/payments/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "paystack_reference": "SHINEX-abc123",
    "amount": 1000,
    "status": "success",
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "advertisement": {
      "id": "uuid",
      "title": "My Ad",
      "duration_days": 7
    },
    "paid_at": "2024-01-01T12:00:00Z",
    "created_at": "2024-01-01T12:00:00Z"
  }
}

---

### GET /admin/payments/stats
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "total_revenue": 150000,
    "total_transactions": 45,
    "status_breakdown": [
      { "status": "success", "count": 40 },
      { "status": "pending", "count": 3 },
      { "status": "failed", "count": 2 }
    ]
  }
}

---

### GET /admin/reports
**Auth:** Admin only

**Query:** `?status=pending&page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reason": "Spam",
      "status": "pending",
      "reporter": {
        "id": "uuid",
        "username": "johndoe"
      },
      "target_product": {
        "id": "uuid",
        "name": "iPhone 13"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}

---

### GET /admin/reports/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "reason": "Spam",
    "description": "User is posting spam",
    "status": "pending",
    "reporter": {
      "id": "uuid",
      "username": "johndoe"
    },
    "target_product": {
      "id": "uuid",
      "name": "iPhone 13",
      "price": 450000
    },
    "created_at": "2024-01-01T00:00:00Z"
  }
}

---

### PATCH /admin/reports/:id/resolve
**Auth:** Admin only

**Request:**
{
  "admin_notes": "Action taken: Removed product"
}

**Response:**
{
  "success": true,
  "message": "Report resolved successfully",
  "data": {
    "id": "uuid",
    "status": "resolved",
    "resolved_by": "uuid",
    "resolved_at": "2024-01-01T12:00:00Z"
  }
}

---

### PATCH /admin/reports/:id/dismiss
**Auth:** Admin only

**Request:**
{
  "admin_notes": "No action needed"
}

**Response:**
{
  "success": true,
  "message": "Report dismissed",
  "data": {
    "id": "uuid",
    "status": "dismissed"
  }
}

---

### GET /admin/contact
**Auth:** Admin only

**Query:** `?status=new&page=1&limit=20`

**Response:**
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "08012345678",
      "subject": "Question",
      "message": "I have a question...",
      "status": "new",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}

---

### GET /admin/contact/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "08012345678",
    "subject": "Question",
    "message": "I have a question about selling products...",
    "status": "read",
    "created_at": "2024-01-01T00:00:00Z"
  }
}

---

### PATCH /admin/contact/:id/status
**Auth:** Admin only

**Request:**
{
  "status": "replied"
}

**Response:**
{
  "success": true,
  "message": "Message status updated",
  "data": {
    "id": "uuid",
    "status": "replied",
    "replied_at": "2024-01-01T12:00:00Z"
  }
}

---

### DELETE /admin/contact/:id
**Auth:** Admin only

**Response:**
{
  "success": true,
  "message": "Message deleted successfully"
}

---

## 9. HEALTH CHECK

### GET /health
**Auth:** No

**Response:**
{
  "success": true,
  "message": "SHINEX Marketplace API is running"
}

---

## ERROR CODES

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Login required |
| 403 | Forbidden - Not enough permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate resource |
| 500 | Server Error |

---

## ENVIRONMENT VARIABLES

NODE_ENV=production
PORT=5000

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

PAYSTACK_SECRET_KEY=your_paystack_secret
PAYSTACK_PUBLIC_KEY=your_paystack_public

JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:3000

---

## SUPPORT

- **Email**: shinexlearning@gmail.com
- **Phone**: +234 706 757 4479
- **WhatsApp**: +234 802 505 2852

---

**END OF DOCUMENTATION**
