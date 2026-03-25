# PART 1 – Project Planning

## 1) Project Description

**Project Name:** Capybara Comfort Shop

Capybara Comfort Shop is a SaaS-style mini e-commerce web application for capybara-themed products (such as plush toys, blind boxes, and stickers). The project uses React for the client, Node.js + Prisma for the API, and token-cookie authentication with role-based access control. The intended scope includes public product browsing, user registration/login, cart and checkout workflows, order history, and admin management pages for products and orders.

The project includes full CRUD operations: users and admins can **Create** resources (accounts, cart items, orders, products), all visitors can **Read** product listings/details while authenticated users can read private data like cart/orders, users/admins can **Update** cart quantities/order status/product data based on role, and users/admins can **Delete** items (own cart items for users, catalog moderation for admins). This scope is achievable within the course timeline and aligns with Part 1 requirements.

---

## 2) Database Diagram

Minimum three tables are required. This design uses seven tables to support realistic e-commerce workflows.

```mermaid
erDiagram
    USER ||--o{ ORDER : places
  USER ||--|| CART : owns
  CART ||--o{ CART_ITEM : contains
    USER ||--o{ REVIEW : writes
    ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ CART_ITEM : included_in
    PRODUCT ||--o{ ORDER_ITEM : included_in
    PRODUCT ||--o{ REVIEW : receives

    USER {
      int id PK
      string name
      string email UNIQUE
      string passwordHash
      string role
      datetime createdAt
      datetime updatedAt
    }

    PRODUCT {
      int id PK
      string title
      string description
      decimal price
      int stock
      string category
      string imageUrl
      boolean isActive
      datetime createdAt
      datetime updatedAt
    }

    ORDER {
      int id PK
      int userId FK
      string status
      decimal totalAmount
      string shippingAddress
      datetime createdAt
      datetime updatedAt
    }

    CART {
      int id PK
      int userId FK UNIQUE
      datetime createdAt
      datetime updatedAt
    }

    CART_ITEM {
      int id PK
      int cartId FK
      int productId FK
      int quantity
      datetime createdAt
      datetime updatedAt
    }

    ORDER_ITEM {
      int id PK
      int orderId FK
      int productId FK
      int quantity
      decimal unitPrice
      datetime createdAt
    }

    REVIEW {
      int id PK
      int userId FK
      int productId FK
      int rating
      string comment
      datetime createdAt
      datetime updatedAt
    }
```

---

## 3) User Roles Definition

### Role A: `admin`
- Manage all products (create/read/update/delete)
- View and manage all orders
- Update order status (e.g., paid, shipped, cancelled)
- Manage users (view user list, suspend/reactivate if needed)
- Moderate any review (delete inappropriate content)

### Role B: `user`
- Register, login, logout
- Browse products and product detail pages
- Search/filter/sort products
- Create orders from cart
- View own order history and order details
- Create/update/delete own reviews only
- Cannot manage other users, all products, or other users’ orders

---

## 4) Pages and Endpoints

## 4.1 Planned Pages

1. **Home** (`/`) – public landing page, featured products, login/register links
2. **Register** (`/register`) – public
3. **Login** (`/login`) – public
4. **Products List** (`/products`) – public, supports pagination/filter/search
5. **Product Detail** (`/products/:id`) – public
6. **Cart** (`/cart`) – authenticated users
7. **Checkout** (`/checkout`) – authenticated users
8. **My Orders** (`/orders`) – authenticated users (own orders)
9. **Order Detail** (`/orders/:id`) – authenticated users (own order), admin can view any
10. **Admin Products** (`/admin/products`) – admin only
11. **Admin Orders** (`/admin/orders`) – admin only
12. **Profile** (`/profile`) – authenticated users

## 4.2 Planned API Endpoints

### Auth
- `POST /api/register` (Public)
- `POST /api/login` (Public)
- `POST /api/logout` (Authenticated)
- `GET /api/me` (Authenticated)

### Products
- `GET /api/products?limit=&offset=&search=&category=&minPrice=&maxPrice=` (Public)
- `GET /api/products/:id` (Public)
- `POST /api/products` (Admin)
- `PUT /api/products/:id` (Admin)
- `DELETE /api/products/:id` (Admin)

### Cart
- `GET /api/cart` (Authenticated User/Admin)
- `POST /api/cart/items` (Authenticated User/Admin)
- `PUT /api/cart/items/:itemId` (Authenticated User/Admin, own cart)
- `DELETE /api/cart/items/:itemId` (Authenticated User/Admin, own cart)

### Orders
- `POST /api/orders` (Authenticated User/Admin)
- `GET /api/orders` (Authenticated User/Admin; user sees own, admin sees all)
- `GET /api/orders/:id` (Authenticated User/Admin; user own only, admin any)
- `PUT /api/orders/:id/status` (Admin)

### Reviews
- `GET /api/products/:id/reviews` (Public)
- `POST /api/products/:id/reviews` (Authenticated User/Admin)
- `PUT /api/reviews/:id` (Authenticated User/Admin; own review or admin)
- `DELETE /api/reviews/:id` (Authenticated User/Admin; own review or admin)

### Utility (Part 2 baseline)
- `GET /api/ping` (Public)

## 4.3 Page → Endpoint Usage + Role Requirements

| Page | Endpoints Used | Auth Required | Role Restriction |
|---|---|---|---|
| Home | `GET /api/products` (featured subset) | No | None |
| Register | `POST /api/register` | No | None |
| Login | `POST /api/login` | No | None |
| Products List | `GET /api/products` | No | None |
| Product Detail | `GET /api/products/:id`, `GET /api/products/:id/reviews` | No | None |
| Cart | `GET /api/cart`, `POST/PUT/DELETE /api/cart/items` | Yes | Owner only |
| Checkout | `POST /api/orders` | Yes | Owner only |
| My Orders | `GET /api/orders` | Yes | User sees own only |
| Order Detail | `GET /api/orders/:id` | Yes | User own only / admin any |
| Admin Products | `POST/PUT/DELETE /api/products` | Yes | Admin only |
| Admin Orders | `GET /api/orders`, `PUT /api/orders/:id/status` | Yes | Admin only |
| Profile | `GET /api/me` | Yes | User/Admin |

## 4.4 Endpoint Auth/Role Matrix

| Endpoint | Method | Authentication Required | Role Required |
|---|---|---|---|
| `/api/register` | POST | No | Public |
| `/api/login` | POST | No | Public |
| `/api/logout` | POST | Yes | User/Admin |
| `/api/me` | GET | Yes | User/Admin |
| `/api/ping` | GET | No | Public |
| `/api/products` | GET | No | Public |
| `/api/products/:id` | GET | No | Public |
| `/api/products` | POST | Yes | Admin |
| `/api/products/:id` | PUT | Yes | Admin |
| `/api/products/:id` | DELETE | Yes | Admin |
| `/api/cart` | GET | Yes | User/Admin (owner scope) |
| `/api/cart/items` | POST | Yes | User/Admin (owner scope) |
| `/api/cart/items/:itemId` | PUT | Yes | User/Admin (owner scope) |
| `/api/cart/items/:itemId` | DELETE | Yes | User/Admin (owner scope) |
| `/api/orders` | POST | Yes | User/Admin |
| `/api/orders` | GET | Yes | User/Admin (admin sees all; user sees own) |
| `/api/orders/:id` | GET | Yes | User/Admin (admin any; user own only) |
| `/api/orders/:id/status` | PUT | Yes | Admin |
| `/api/products/:id/reviews` | GET | No | Public |
| `/api/products/:id/reviews` | POST | Yes | User/Admin |
| `/api/reviews/:id` | PUT | Yes | User/Admin (owner or admin) |
| `/api/reviews/:id` | DELETE | Yes | User/Admin (owner or admin) |

---

## 5) UX States Planning (Loading / Error / Empty)

### Home (fetches featured products)
- **Loading:** skeleton cards for featured section
- **Error:** “Failed to load featured products” + `Retry` button
- **Empty:** “No featured products yet”

### Products List
- **Loading:** product grid skeleton + disabled pagination controls
- **Error:** inline alert “Cannot load products right now” + `Retry`
- **Empty:** “No products found” + suggestion to clear filters/search

### Product Detail (includes reviews)
- **Loading:** detail skeleton and review placeholders
- **Error:** message for product/review load failure + `Retry`
- **Empty:** for reviews only: “No reviews yet. Be the first to review.”

### Cart
- **Loading:** spinner while cart data is fetched
- **Error:** “Unable to load your cart” + `Retry`
- **Empty:** “Your cart is empty” + button “Continue shopping”

### My Orders
- **Loading:** table/list skeleton for orders
- **Error:** “Failed to load your orders” + `Retry`
- **Empty:** “You have no orders yet” + button “Start shopping”

### Admin Products
- **Loading:** admin table skeleton
- **Error:** “Unable to load products for admin panel” + `Retry`
- **Empty:** “No products in catalog. Create the first product.”

### Admin Orders
- **Loading:** admin orders table skeleton
- **Error:** “Unable to load orders” + `Retry`
- **Empty:** “No orders found yet.”

---

## Notes for Part 2 Implementation Alignment

- Authentication will use **token cookies** with `requireAuth` middleware.
- Role checks will use `requireRole('admin')` for admin-only endpoints.
- Product list endpoint will support **pagination (`limit`, `offset`)** from the beginning.
- Validation examples:
  - Register: email format, password strength, unique email
  - Product create/update: required fields, positive price, non-negative stock
  - Order create: non-empty cart, valid quantities, stock availability
